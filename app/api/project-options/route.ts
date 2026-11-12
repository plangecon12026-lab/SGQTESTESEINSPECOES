import { fieldApiGuard } from '../../management-auth';
import {currentContract} from '../../../db/contract-context';

const SOURCE_URL = 'https://gestao-projetos-ls.vitormaia27.chatgpt.site/api/sheet';

type SourceProject = {
  ls?: string;
  pep?: string;
  name?: string;
  description?: string;
  status?: string;
};

export async function GET() {const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
  if(await currentContract()!=='s11d')return Response.json({projects:[],source:'Contrato atual'},{headers:{'Cache-Control':'no-store'}});
  try {
    const response = await fetch(SOURCE_URL, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Fonte indisponível.');
    const payload = await response.json() as { overrides?: Array<{ payload?: SourceProject }> };
    const projects = (payload.overrides ?? [])
      .map(item => item.payload ?? {})
      .filter(project => project.ls || project.pep || project.name)
      .map(project => {
        const ls = String(project.ls ?? '').trim();
        const pep = String(project.pep ?? '').trim();
        const name = String(project.name ?? '').trim();
        const description = String(project.description ?? '').trim();
        const parts = [ls && `LS ${ls}`, pep && `PEP ${pep}`, name, description && description !== '#N/A' ? description : ''].filter(Boolean);
        return { value: parts.join(' · '), ls, pep, name, description, status: String(project.status ?? '').trim() };
      });
    const unique = Array.from(new Map(projects.map(project => [project.value.toLocaleLowerCase('pt-BR'), project])).values())
      .sort((a, b) => a.ls.localeCompare(b.ls, 'pt-BR', { numeric: true }) || a.name.localeCompare(b.name, 'pt-BR'));
    return Response.json({ projects: unique, source: 'Gestão de Projetos LS' }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return Response.json({ error: 'Não foi possível atualizar a lista de PEP / LS.' }, { status: 503 });
  }
}
