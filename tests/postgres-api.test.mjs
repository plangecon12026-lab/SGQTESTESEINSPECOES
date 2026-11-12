// Testes de integração contra um Postgres real (TEST_DATABASE_URL), com as rotas reais.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync as read, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import postgres from 'postgres';

const url = process.env.TEST_DATABASE_URL;
if (!url) { test('integração Postgres', { skip: 'defina TEST_DATABASE_URL' }, () => {}); }
else {
const admin = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
await admin.unsafe('drop schema public cascade; create schema public;');
for (const role of ['anon', 'authenticated']) await admin.unsafe(`do $$ begin create role ${role} nologin; exception when duplicate_object then null; end $$;`);
for (const f of readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort()) await admin.unsafe(read('supabase/migrations/' + f, 'utf8'));

const temp = await mkdtemp(path.join(tmpdir(), 'sgq-pg-test-'));
process.env.DATABASE_URL = url;
process.env.STORAGE_LOCAL_DIR = path.join(temp, 'storage');
const result = await build({
  stdin: { contents: `export * as contracts from './app/api/contracts/route';export * as sgq from './app/api/sgq/route';export * as reports from './app/api/reports/route';export * as photo from './app/api/sgq/photo/route';export * as plan from './app/api/inspection-plan/route';export * as progress from './app/api/inspection-plan/progress/route';export {contractContext} from './db/contract-context';export * as model from './app/sgq-model';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, external: ['postgres', '@supabase/supabase-js', 'next/*'],
  plugins: [{ name: 'auth-stub', setup(b) {
    b.onResolve({ filter: /management-auth$/ }, () => ({ path: 'auth', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: `export async function managementIdentity(){return {owner:true}};export async function ownerApiGuard(){return null};export async function managementApiGuard(){return null};export async function fieldApiGuard(){return null};export function validOrigin(){return true};` }));
  } }],
});
const bundle = path.join(process.cwd(), '.test-bundle.mjs');
await writeFile(bundle, result.outputFiles[0].text);
const api = await import(bundle);
const scoped = (id, fn) => api.contractContext.run(id, fn);
const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const reserve = () => new Request('https://sgq.test/api/reports', json({ issuerKey: 'VM', issuerName: 'Vitor', issuerRole: 'Engenheiro', year: 2026, metadata: { cabecalho: { tituloSuperior: 'Teste' } } }));
const fill = f => f.options ? f.options[0] : f.type === 'number' ? '10' : f.type === 'date' ? '2026-11-11' : 'X';
const torque = (id, extra = {}) => { const kind = api.model.kinds.find(k => k.id === 'torque');
  const common = Object.fromEntries((kind.commonFields ?? api.model.commonFields).map(f => [f.key, fill(f)]));
  const groups = Object.fromEntries(kind.groups.map(g => [g.key, (g.rows ?? [0]).map(() => Object.fromEntries(g.fields.map(f => [f.key, fill(f)])))]));
  return { id, kind: 'torque', data: { common: { ...common, date: '2026-11-11', manualSequence: '', ...extra }, groups, photos: [], signatures: {}, notes: '', result: api.model.results('torque')[0] } }; };

test('cadastro cria S11D e Fábrica de forma idempotente', async () => {
  const r = await api.contracts.GET(); assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).contracts.map(c => c.id).sort(), ['fabrica', 's11d']);
  await api.contracts.GET();
  assert.equal((await admin`select count(*)::int n from contracts`)[0].n, 2);
});

test('numeração de engenharia separada por contrato; arquivos e escrita não cruzam contratos', async () => {
  const s = await scoped('s11d', () => api.reports.POST(reserve())), f = await scoped('fabrica', () => api.reports.POST(reserve()));
  assert.equal(s.status, 200, await s.clone().text()); assert.equal(f.status, 200);
  const legacy = await s.json(), factory = await f.json();
  assert.equal(legacy.reportNumber, 'RI-VM-001-26'); assert.equal(factory.reportNumber, 'RI-VM-001-26');
  const form = new FormData(); form.append('id', legacy.id); form.append('docx', new File(['doc'], 'test.docx'));
  const denied = await scoped('fabrica', () => api.reports.PUT(new Request('https://sgq.test/api/reports', { method: 'PUT', body: form })));
  assert.equal(denied.status, 404);
  const ok = await scoped('s11d', () => api.reports.PUT(new Request('https://sgq.test/api/reports', { method: 'PUT', body: form })));
  assert.equal(ok.status, 200);
  assert.equal((await (await scoped('fabrica', () => api.reports.GET(new Request('https://sgq.test/api/reports')))).json()).reports.length, 0);
  assert.equal((await (await scoped('s11d', () => api.reports.GET(new Request('https://sgq.test/api/reports')))).json()).reports.length, 1);
  assert.equal((await scoped('fabrica', () => api.reports.GET(new Request('https://sgq.test/api/reports?id=' + legacy.id + '&format=docx')))).status, 404);
  const file = await scoped('s11d', () => api.reports.GET(new Request('https://sgq.test/api/reports?id=' + legacy.id + '&format=docx')));
  assert.equal(file.status, 200); assert.equal(await file.text(), 'doc');
});

test('reservas simultâneas de engenharia não duplicam número', async () => {
  const results = await Promise.all(Array.from({ length: 12 }, () => scoped('s11d', () => api.reports.POST(reserve()))));
  const numbers = [];
  for (const r of results) { assert.equal(r.status, 200, await r.clone().text()); numbers.push((await r.json()).reportNumber); }
  assert.equal(new Set(numbers).size, 12);
});

test('relatórios de campo: numeração automática e manual, concorrência e revisão', async () => {
  const saves = await Promise.all(Array.from({ length: 10 }, (_, i) => scoped('s11d', () => api.sgq.POST(new Request('https://sgq.test/api/sgq', json(torque('torque-concurrent-' + String(i).padStart(3, '0'))))))));
  const numbers = [];
  for (const r of saves) { const b = await r.json(); assert.equal(r.status, 201, JSON.stringify(b)); numbers.push(b.record.number); }
  assert.equal(new Set(numbers).size, 10);
  const again = await scoped('s11d', () => api.sgq.POST(new Request('https://sgq.test/api/sgq', json(torque('torque-concurrent-000')))));
  assert.equal(again.status, 200);
  const manual = await scoped('s11d', () => api.sgq.POST(new Request('https://sgq.test/api/sgq', json(torque('torque-manual-0050', { manualSequence: '50' })))));
  const mb = await manual.json(); assert.equal(manual.status, 201, JSON.stringify(mb)); assert.match(mb.record.number, /-050-26$/);
  const dup = await scoped('s11d', () => api.sgq.POST(new Request('https://sgq.test/api/sgq', json(torque('torque-manual-0051', { manualSequence: '50' })))));
  assert.equal(dup.status, 409);
  const rev = await scoped('s11d', () => api.sgq.POST(new Request('https://sgq.test/api/sgq', json({ ...torque('torque-manual-0050', { equipment: 'EQ-2' }), revision: 0 }))));
  const rb = await rev.json(); assert.equal(rev.status, 200, JSON.stringify(rb)); assert.equal(rb.record.revision, 1);
  const stale = await scoped('s11d', () => api.sgq.POST(new Request('https://sgq.test/api/sgq', json({ ...torque('torque-manual-0050'), revision: 0 }))));
  assert.equal(stale.status, 409);
  const loaded = await (await scoped('s11d', () => api.sgq.GET(new Request('https://sgq.test/api/sgq?id=torque-manual-0050')))).json();
  assert.equal(loaded.revisions.length, 2);
  assert.equal((await scoped('fabrica', () => api.sgq.GET(new Request('https://sgq.test/api/sgq?id=torque-manual-0050')))).status, 404);
});

test('dimensional só existe na Fábrica e não vaza para o S11D', async () => {
  const data = { common: { date: '2026-11-11', inspector: 'Teste', contract: 'CT', workOrder: 'OS', area: 'Fábrica', equipment: 'EQ' }, groups: { dimSetup: [{ procedure: 'PR', criteria: 'Projeto' }], instruments: [{ name: 'Trena', serial: 'T', certificate: 'C', validity: '12/2027' }], pieces: [{ description: 'Peça', mark: 'M', quantity: '1' }], dimensions: [{ drawing: 'DE', mark: 'M', specified: '100', measured: '100', tolerance: '1', description: 'Largura', verdict: 'A' }] }, photos: [], signatures: {}, notes: '', result: 'Aprovado' };
  const req = () => new Request('https://sgq.test/api/sgq', json({ id: 'test-dimensional-2026', kind: 'dimensional', data }));
  assert.equal((await scoped('s11d', () => api.sgq.POST(req()))).status, 400);
  const saved = await scoped('fabrica', () => api.sgq.POST(req())); const body = await saved.json();
  assert.equal(saved.status, 201, JSON.stringify(body)); assert.match(body.record.number, /RID/);
  assert.equal((await scoped('s11d', () => api.sgq.GET(new Request('https://sgq.test/api/sgq?id=test-dimensional-2026')))).status, 404);
});

test('fotos ficam separadas por contrato', async () => {
  const up = await scoped('fabrica', () => api.photo.POST(new Request('https://sgq.test/api/sgq/photo', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Uint8Array([1, 2, 3]) })));
  assert.equal(up.status, 200); const { url: photoUrl } = await up.json(); assert.match(photoUrl, /contrato=fabrica/);
  const req = new Request('https://sgq.test' + photoUrl);
  assert.equal((await scoped('s11d', () => api.photo.GET(req))).status, 404);
  const ok = await scoped('fabrica', () => api.photo.GET(req)); assert.equal(ok.status, 200);
  assert.deepEqual([...new Uint8Array(await ok.arrayBuffer())], [1, 2, 3]);
});

test('cronograma: cria, avança e detecta edição concorrente', async () => {
  const created = await scoped('fabrica', () => api.plan.POST(new Request('https://sgq.test/api/inspection-plan', json({ projectKey: 'P1', projectName: 'Projeto', activity: 'Montagem', test: 'Torque', status: 'Não iniciado', priority: 'Média' }))));
  const { plan } = await created.json(); assert.equal(created.status, 201);
  const adv = await scoped('fabrica', () => api.progress.POST(new Request('https://sgq.test/x', json({ id: plan.id, progress: 40, note: 'Metade feita', updatedAt: plan.updated_at }))));
  const ab = await adv.json(); assert.equal(adv.status, 200, JSON.stringify(ab)); assert.equal(ab.plan.status, 'Em andamento');
  const stale = await scoped('fabrica', () => api.progress.POST(new Request('https://sgq.test/x', json({ id: plan.id, progress: 50, note: 'Repetido', updatedAt: plan.updated_at }))));
  assert.equal(stale.status, 409);
  assert.equal((await admin`select count(*)::int n from ct_fabrica__inspection_plan_updates`)[0].n, 1);
  assert.equal((await admin`select count(*)::int n from inspection_plans`)[0].n, 0);
});

test.after(async () => { await admin.end(); await rm(temp, { recursive: true, force: true }); await rm(bundle, { force: true }); setTimeout(() => process.exit(0), 50); });
}
