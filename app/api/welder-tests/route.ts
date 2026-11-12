import { sgqDb } from '../../../db/sgq';
import { managementApiGuard, validOrigin } from '../../management-auth';

const statuses=['Pendente','Agendado','Em andamento','Testado','Reprovado','Não se aplica'];
type Input={id?:string;welderId?:string;process?:string;responsible?:string;plannedDate?:string;actualDate?:string;status?:string;progress?:number;observation?:string;nextStep?:string;note?:string;updatedAt?:string};
const fail=(error:string,status=400)=>Response.json({error},{status});
function validate(v:Input){
  if(!v.welderId||!v.process?.trim()||v.process.length>80||!statuses.includes(v.status||'')||!Number.isInteger(v.progress)||v.progress!<0||v.progress!>100)return 'Confira soldador, processo, situação e avanço de 0 a 100%.';
  if([v.plannedDate,v.actualDate].some(d=>d&&!/^\d{4}-\d{2}-\d{2}$/.test(d))||(v.responsible||'').length>150||(v.observation||'').length>1000||(v.nextStep||'').length>500||(v.note||'').length>1000)return 'Confira as datas e o tamanho dos campos.';
  if((v.status==='Testado'||v.status==='Reprovado')&&!v.actualDate)return 'Informe a data realizada para encerrar o teste.';
  if((v.status==='Testado'||v.status==='Reprovado')&&v.progress!==100)return 'Testes encerrados devem marcar 100%.';
  if((v.status==='Pendente'||v.status==='Agendado'||v.status==='Não se aplica')&&v.progress!==0)return 'Essa situação deve marcar 0%.';
  if(v.status==='Em andamento'&&(v.progress!<1||v.progress!>99))return 'Em andamento precisa de avanço entre 1% e 99%.';
  return null;
}
export async function POST(request:Request){
  const denied=await managementApiGuard();if(denied)return denied;
  if(!validOrigin(request))return fail('Requisição inválida.',403);
  const v=await request.json().catch(()=>({})) as Input;const error=validate(v);if(error)return fail(error);
  const db=sgqDb();if(!await db.prepare('SELECT id FROM welders WHERE id=?').bind(v.welderId).first())return fail('Soldador não encontrado.',404);
  const id=crypto.randomUUID(),now=new Date().toISOString();
  await db.prepare('INSERT INTO welder_tests (id,welder_id,process,responsible,planned_date,actual_date,status,progress,observation,next_step,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,v.welderId,v.process!.trim(),(v.responsible||'').trim(),v.plannedDate||'',v.actualDate||'',v.status,v.progress,(v.observation||'').trim(),(v.nextStep||'').trim(),now,now).run();
  return Response.json({id},{status:201});
}
export async function PATCH(request:Request){
  const denied=await managementApiGuard();if(denied)return denied;
  if(!validOrigin(request))return fail('Requisição inválida.',403);
  const v=await request.json().catch(()=>({})) as Input;const error=validate(v);if(error)return fail(error);
  if(!v.id||!v.updatedAt)return fail('Atualize a página antes de editar.');
  const db=sgqDb();const old=await db.prepare('SELECT status,progress,actual_date FROM welder_tests WHERE id=? AND welder_id=?').bind(v.id,v.welderId).first<{status:string;progress:number;actual_date:string}>();
  if(!old)return fail('Teste não encontrado.',404);
  const advancing=old.status!==v.status||old.progress!==v.progress||old.actual_date!==(v.actualDate||'');
  const now=new Date().toISOString();
  const row=await db.prepare('UPDATE welder_tests SET process=?,responsible=?,planned_date=?,actual_date=?,status=?,progress=?,observation=?,next_step=?,updated_at=? WHERE id=? AND welder_id=? AND updated_at=? RETURNING id').bind(v.process!.trim(),(v.responsible||'').trim(),v.plannedDate||'',v.actualDate||'',v.status,v.progress,(v.observation||'').trim(),(v.nextStep||'').trim(),now,v.id,v.welderId,v.updatedAt).first();
  if(!row)return fail('O teste mudou em outra tela. Atualize antes de registrar.',409);
  const note=(v.note||'').trim();
  if(advancing||note)await db.prepare('INSERT INTO welder_test_updates (id,test_id,status,progress,note,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),v.id,v.status,v.progress,note||'Atualização de situação, avanço ou data registrada no cronograma.',now).run();
  return Response.json({ok:true});
}
