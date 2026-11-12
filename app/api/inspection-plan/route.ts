import { sgqDb } from '../../../db/sgq';
import { managementApiGuard } from '../../management-auth';


const statuses = ['Não iniciado', 'Em andamento', 'Concluído', 'Atrasado', 'Cancelado'] as const;
const priorities = ['Baixa', 'Média', 'Alta', 'Crítica'] as const;
type PlanInput = { id?: string; projectKey: string; projectName: string; pep?: string; ls?: string; activity: string; test: string; area?: string; startDate?: string; endDate?: string; status: string; priority: string; owner?: string; nextStep?: string; notes?: string; updatedAt?: string };

function validate(value: PlanInput): string | null {
  if (!value || !value.projectKey?.trim() || !value.projectName?.trim() || !value.activity?.trim() || !value.test?.trim()) return 'Selecione um projeto e informe a atividade e o ensaio.';
  if (!statuses.includes(value.status as typeof statuses[number]) || !priorities.includes(value.priority as typeof priorities[number])) return 'Confira o status e a prioridade.';
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if ((value.startDate || value.endDate) && (!date.test(value.startDate ?? '') || !date.test(value.endDate ?? '') || value.endDate! < value.startDate!)) return 'Informe início e término válidos, nessa ordem.';
  if (Object.entries(value).some(([key, field]) => key !== 'id' && key !== 'updatedAt' && typeof field === 'string' && field.length > (key === 'notes' ? 2000 : 500))) return 'Um dos campos está muito longo.';
  return null;
}

export async function GET() {
  const denied = await managementApiGuard(); if (denied) return denied;
  try {
    const rows = await sgqDb().prepare('SELECT * FROM inspection_plans ORDER BY CASE WHEN start_date = \'\' THEN 1 ELSE 0 END, start_date, created_at DESC').all();
    return Response.json({ plans: rows.results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error(error); return Response.json({ error: 'Não foi possível carregar o cronograma.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const denied = await managementApiGuard(); if (denied) return denied;
  try {
    const value = await request.json() as PlanInput;
    const error = validate(value); if (error) return Response.json({ error }, { status: 400 });
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await sgqDb().prepare(`INSERT INTO inspection_plans
      (id,project_key,project_name,pep,ls,activity,test,area,start_date,end_date,status,progress,priority,owner,next_step,notes,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,value.projectKey.trim(),value.projectName.trim(),(value.pep??'').trim(),(value.ls??'').trim(),value.activity.trim(),value.test.trim(),(value.area??'').trim(),value.startDate??'',value.endDate??'',value.status,value.status==='Concluído'?100:0,value.priority,(value.owner??'').trim(),(value.nextStep??'').trim(),(value.notes??'').trim(),now,now).run();
    return Response.json({ plan: await sgqDb().prepare('SELECT * FROM inspection_plans WHERE id=?').bind(id).first() }, { status: 201 });
  } catch (error) { console.error(error); return Response.json({ error: 'Não foi possível salvar a programação.' }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const denied = await managementApiGuard(); if (denied) return denied;
  try {
    const value = await request.json() as PlanInput;
    const error = validate(value); if (error) return Response.json({ error }, { status: 400 });
    if (!value.id || !value.updatedAt) return Response.json({ error: 'Reabra a programação antes de editar.' }, { status: 400 });
    const now = new Date().toISOString();
    const result = await sgqDb().prepare(`UPDATE inspection_plans SET project_key=?,project_name=?,pep=?,ls=?,activity=?,test=?,area=?,start_date=?,end_date=?,status=?,progress=CASE WHEN ?::text='Concluído' THEN 100 WHEN ?::text='Não iniciado' THEN 0 ELSE progress END,priority=?,owner=?,next_step=?,notes=?,updated_at=? WHERE id=? AND updated_at=? RETURNING *`).bind(value.projectKey.trim(),value.projectName.trim(),(value.pep??'').trim(),(value.ls??'').trim(),value.activity.trim(),value.test.trim(),(value.area??'').trim(),value.startDate??'',value.endDate??'',value.status,value.status,value.status,value.priority,(value.owner??'').trim(),(value.nextStep??'').trim(),(value.notes??'').trim(),now,value.id,value.updatedAt).first();
    if (!result) return Response.json({ error: 'Esta programação mudou em outra tela. Atualize a página antes de editar.' }, { status: 409 });
    return Response.json({ plan: result });
  } catch (error) { console.error(error); return Response.json({ error: 'Não foi possível atualizar a programação.' }, { status: 500 }); }
}
