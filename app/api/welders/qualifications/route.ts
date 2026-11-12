import { sgqDb } from '../../../../db/sgq';
import { managementApiGuard, validOrigin } from '../../../management-auth';

type Input = { id?: string; welderId?: string; process?: string; expiryDate?: string; rsq?: string; notes?: string; updatedAt?: string };
const fail = (error: string, status = 400) => Response.json({ error }, { status });
function validate(value: Input) {
  if (!value.welderId || !value.process?.trim() || value.process.length > 80 || (value.rsq||'').length > 80 || (value.notes||'').length > 1000 || (value.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.expiryDate))) return 'Informe o processo e confira data de vencimento, RSQ e observações.';
  return null;
}
export async function POST(request: Request) {
  const denied=await managementApiGuard(); if(denied)return denied;
  if(!validOrigin(request))return fail('Requisição inválida.',403);
  const value=await request.json().catch(()=>({})) as Input;
  const error=validate(value);if(error)return fail(error);
  const db=sgqDb();if(!await db.prepare('SELECT id FROM welders WHERE id=?').bind(value.welderId).first())return fail('Soldador não encontrado.',404);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  await db.prepare('INSERT INTO welder_qualifications (id,welder_id,process,expiry_date,rsq,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,value.welderId,value.process!.trim().toUpperCase(),value.expiryDate||'',(value.rsq||'').trim(),(value.notes||'').trim(),now,now).run();
  return Response.json({id},{status:201});
}
export async function PATCH(request: Request) {
  const denied=await managementApiGuard(); if(denied)return denied;
  if(!validOrigin(request))return fail('Requisição inválida.',403);
  const value=await request.json().catch(()=>({})) as Input;
  const error=validate(value);if(error)return fail(error);
  if(!value.id||!value.updatedAt)return fail('Atualize a página antes de editar.');
  const row=await sgqDb().prepare('UPDATE welder_qualifications SET process=?,expiry_date=?,rsq=?,notes=?,updated_at=? WHERE id=? AND welder_id=? AND updated_at=? RETURNING id').bind(value.process!.trim().toUpperCase(),value.expiryDate||'',(value.rsq||'').trim(),(value.notes||'').trim(),new Date().toISOString(),value.id,value.welderId,value.updatedAt).first();
  if(!row)return fail('Essa qualificação mudou em outra tela. Atualize e tente novamente.',409);
  return Response.json({ok:true});
}
export async function DELETE(request: Request) {
  const denied=await managementApiGuard(); if(denied)return denied;
  if(!validOrigin(request))return fail('Requisição inválida.',403);
  const value=await request.json().catch(()=>({})) as {id?:string;updatedAt?:string};
  if(!value.id||!value.updatedAt)return fail('Atualize a página antes de remover.');
  const result=await sgqDb().prepare('DELETE FROM welder_qualifications WHERE id=? AND updated_at=?').bind(value.id,value.updatedAt).run();
  if(!result.meta.changes)return fail('Essa qualificação mudou em outra tela. Atualize e tente novamente.',409);
  return Response.json({ok:true});
}
