import SGQApp from './sgq-app';
import { requireFieldPage } from './management-auth';
export const dynamic='force-dynamic';
export const metadata={title:'SGQ | Testes e Inspeções',description:'Registre ensaios, acompanhe resultados e consulte seus relatórios.'};
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){await requireFieldPage((await searchParams).contrato?'/':'contratos');return <SGQApp/>;}
