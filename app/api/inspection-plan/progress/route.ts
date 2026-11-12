import { sgqDb } from '../../../../db/sgq';
import { managementApiGuard } from '../../../management-auth';

export async function GET(request:Request){
  const denied = await managementApiGuard(); if (denied) return denied;
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return Response.json({error:'Programação não informada.'},{status:400});
  try{const rows=await sgqDb().prepare('SELECT progress,note,created_at FROM inspection_plan_updates WHERE plan_id=? ORDER BY created_at DESC LIMIT 100').bind(id).all();return Response.json({updates:rows.results},{headers:{'Cache-Control':'no-store'}})}
  catch(error){console.error(error);return Response.json({error:'Não foi possível carregar os avanços.'},{status:500})}
}

export async function POST(request:Request){
  const denied = await managementApiGuard(); if (denied) return denied;
  const value=await request.json() as {id?:string;progress?:number;note?:string;nextStep?:string;updatedAt?:string};
  if(!value.id||!value.updatedAt||!Number.isInteger(value.progress)||value.progress!<0||value.progress!>100||typeof value.note!=='string'||value.note.trim().length<3||value.note.length>1000||(value.nextStep??'').length>500)return Response.json({error:'Informe o avanço de 0 a 100% e descreva o que foi realizado.'},{status:400});
  try{const db=sgqDb(),now=new Date().toISOString(),id=crypto.randomUUID();const result=await db.batch([
    db.prepare(`UPDATE inspection_plans SET progress=?,status=CASE WHEN status='Cancelado' THEN status WHEN ?::int=100 THEN 'Concluído' WHEN ?::int>0 THEN 'Em andamento' ELSE 'Não iniciado' END,next_step=?,updated_at=? WHERE id=? AND updated_at=? RETURNING *`).bind(value.progress,value.progress,value.progress,(value.nextStep??'').trim(),now,value.id,value.updatedAt),
    db.prepare('INSERT INTO inspection_plan_updates (id,plan_id,progress,note,created_at) SELECT ?::text,?::text,?::int,?::text,?::text WHERE EXISTS (SELECT 1 FROM inspection_plans WHERE id=? AND updated_at=?)').bind(id,value.id,value.progress,value.note.trim(),now,value.id,now)
  ]);
  const plan=result[0].results[0];if(!plan)return Response.json({error:'A programação mudou em outra tela. Atualize antes de registrar o avanço.'},{status:409});return Response.json({plan});
  }catch(error){console.error(error);return Response.json({error:'Não foi possível registrar o avanço.'},{status:500})}
}
