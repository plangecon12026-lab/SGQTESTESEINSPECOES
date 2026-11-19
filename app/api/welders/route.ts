import { sgqDb } from '../../../db/sgq';
import { managementApiGuard, validOrigin } from '../../management-auth';

type Input = { id?: string; employeeNo?: string; name?: string; role?: string; stamp?: string; admissionDate?: string; employmentStatus?: string; departureDate?: string; notes?: string; updatedAt?: string };
const statuses = ['active','away','terminated','provisional'];
const date = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
const field = (value: unknown, max = 200) => typeof value === 'string' && value.trim().length <= max;
const response = (error: string, status = 400) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
function validate(input: Input) {
  if (!input || !field(input.name) || !input.name?.trim() || !field(input.employeeNo,30) || !field(input.role) || !field(input.stamp,40) || !field(input.notes,1000)) return 'Confira nome, matrícula, função, sinete e observações.';
  if (!statuses.includes(input.employmentStatus || '') || !date(input.admissionDate || '') || !date(input.departureDate || '')) return 'Confira a situação e as datas do soldador.';
  if (input.employmentStatus === 'terminated' && !input.departureDate) return 'Informe a data de desligamento.';
  return null;
}
export async function GET() {
  const denied = await managementApiGuard(); if (denied) return denied;
  const db = sgqDb();
  const [people, qualifications, tests, updates] = await Promise.all([
    db.prepare('SELECT * FROM welders ORDER BY CASE employment_status WHEN \'active\' THEN 0 WHEN \'away\' THEN 1 WHEN \'provisional\' THEN 2 ELSE 3 END,name').all(),
    db.prepare('SELECT * FROM welder_qualifications ORDER BY process,expiry_date').all(),
    db.prepare('SELECT * FROM welder_tests ORDER BY CASE WHEN planned_date=\'\' THEN 1 ELSE 0 END,planned_date,created_at').all(),
    db.prepare('SELECT * FROM welder_test_updates ORDER BY created_at DESC').all(),
  ]);
  return Response.json({ welders: people.results, qualifications: qualifications.results, tests: tests.results, updates: updates.results }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  const denied = await managementApiGuard(); if (denied) return denied;
  if (!validOrigin(request)) return response('Requisição inválida.',403);
  const value = await request.json().catch(() => ({})) as Input;
  const error = validate(value); if (error) return response(error);
  const db = sgqDb(), id = crypto.randomUUID(), now = new Date().toISOString();
  try {
    await db.prepare(`INSERT INTO welders (id,employee_no,name,role,stamp,admission_date,employment_status,departure_date,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id,value.employeeNo!.trim(),value.name!.trim(),value.role!.trim(),value.stamp!.trim(),value.admissionDate||'',value.employmentStatus,value.employmentStatus==='terminated'?value.departureDate||'':'',value.notes!.trim(),now,now).run();
    return Response.json({ id }, { status: 201 });
  } catch { return response('Essa matrícula já está cadastrada. Confira antes de adicionar.',409); }
}
export async function PATCH(request: Request) {
  const denied = await managementApiGuard(); if (denied) return denied;
  if (!validOrigin(request)) return response('Requisição inválida.',403);
  const value = await request.json().catch(() => ({})) as Input;
  const error = validate(value); if (error) return response(error);
  if (!value.id || !value.updatedAt) return response('Atualize a página antes de editar.');
  try {
    const row = await sgqDb().prepare(`UPDATE welders SET employee_no=?,name=?,role=?,stamp=?,admission_date=?,employment_status=?,departure_date=?,notes=?,updated_at=? WHERE id=? AND updated_at=? RETURNING id`).bind(value.employeeNo!.trim(),value.name!.trim(),value.role!.trim(),value.stamp!.trim(),value.admissionDate||'',value.employmentStatus,value.employmentStatus==='terminated'?value.departureDate||'':'',value.notes!.trim(),new Date().toISOString(),value.id,value.updatedAt).first();
    if (!row) return response('O cadastro foi alterado em outra tela. Atualize e tente novamente.',409);
    return Response.json({ ok: true });
  } catch { return response('Essa matrícula já está em uso.',409); }
}
export async function DELETE(request: Request) {
  const denied = await managementApiGuard(); if (denied) return denied;
  if (!validOrigin(request)) return response('Requisição inválida.',403);
  const value = await request.json().catch(() => ({})) as { id?: string; updatedAt?: string };
  if (!value.id || !value.updatedAt) return response('Atualize a página antes de excluir.');
  const db = sgqDb();
  const current = await db.prepare('SELECT id FROM welders WHERE id=? AND updated_at=?').bind(value.id, value.updatedAt).first();
  if (!current) return response('O cadastro foi alterado em outra tela. Atualize e tente novamente.',409);
  await db.batch([
    db.prepare('DELETE FROM welder_test_updates WHERE test_id IN (SELECT id FROM welder_tests WHERE welder_id=?)').bind(value.id),
    db.prepare('DELETE FROM welder_tests WHERE welder_id=?').bind(value.id),
    db.prepare('DELETE FROM welder_qualifications WHERE welder_id=?').bind(value.id),
    db.prepare('DELETE FROM welders WHERE id=? AND updated_at=?').bind(value.id, value.updatedAt),
  ]);
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
