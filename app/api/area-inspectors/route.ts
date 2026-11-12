import { sgqDb } from '../../../db/sgq';
import { ownerApiGuard, validOrigin , fieldApiGuard } from '../../management-auth';

const headers = { 'Cache-Control': 'no-store' };

export async function GET() {const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
  try {
    const rows = await sgqDb().prepare('SELECT id,name,previous_names,active,weekly_target,created_at FROM area_inspectors ORDER BY active DESC,name COLLATE NOCASE').all();
    return Response.json({ inspectors: rows.results }, { headers });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Não foi possível carregar os inspetores.' }, { status: 500, headers });
  }
}

export async function POST(request: Request) {
  const denied = await ownerApiGuard(); if (denied) return denied;
  if (!validOrigin(request)) return Response.json({ error: 'Requisição inválida.' }, { status: 403, headers });
  const body = await request.json().catch(() => ({})) as { name?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 3 || name.length > 100) return Response.json({ error: 'Informe o nome completo (3 a 100 caracteres).' }, { status: 400, headers });
  const db = sgqDb();
  const existing = await db.prepare('SELECT id FROM area_inspectors WHERE lower(name)=lower(?)').bind(name).first();
  if (existing) return Response.json({ error: 'Este inspetor já está cadastrado.' }, { status: 409, headers });
  const now = new Date().toISOString(), id = crypto.randomUUID();
  await db.prepare('INSERT INTO area_inspectors (id,name,active,weekly_target,created_at,updated_at) VALUES (?,?,1,1,?,?)').bind(id,name,now,now).run();
  return Response.json({ inspector: { id,name,active:1,weekly_target:1,created_at:now } }, { status: 201, headers });
}

export async function PATCH(request: Request) {
  const denied = await ownerApiGuard(); if (denied) return denied;
  if (!validOrigin(request)) return Response.json({ error: 'Requisição inválida.' }, { status: 403, headers });
  const body = await request.json().catch(() => ({})) as { id?: unknown; active?: unknown; name?: unknown };
  if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.id) || (typeof body.active !== 'boolean' && typeof body.name !== 'string')) return Response.json({ error: 'Dados inválidos.' }, { status: 400, headers });
  const db=sgqDb(),current=await db.prepare('SELECT name,active,previous_names FROM area_inspectors WHERE id=?').bind(body.id).first<{name:string;active:number;previous_names:string}>();
  if (!current) return Response.json({ error: 'Inspetor não encontrado.' }, { status: 404, headers });
  const name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):current.name;
  if (name.length<3||name.length>100) return Response.json({ error: 'Informe o nome completo (3 a 100 caracteres).' }, { status: 400, headers });
  if (name.toLocaleLowerCase('pt-BR')!==current.name.toLocaleLowerCase('pt-BR')) {
    const duplicate=await db.prepare('SELECT id FROM area_inspectors WHERE lower(name)=lower(?) AND id<>?').bind(name,body.id).first();
    if (duplicate) return Response.json({ error: 'Este nome já está cadastrado.' }, { status: 409, headers });
  }
  let aliases:string[]=[];try{const prior=JSON.parse(current.previous_names);if(Array.isArray(prior))aliases=prior.filter((item):item is string=>typeof item==='string')}catch{}
  if (name!==current.name&&!aliases.includes(current.name))aliases.push(current.name);
  const result = await db.prepare('UPDATE area_inspectors SET name=?,previous_names=?,active=?,updated_at=? WHERE id=?').bind(name,JSON.stringify(aliases),typeof body.active==='boolean'?(body.active?1:0):current.active,new Date().toISOString(),body.id).run();
  if (!result.meta.changes) return Response.json({ error: 'Inspetor não encontrado.' }, { status: 404, headers });
  return Response.json({ ok:true }, { headers });
}
