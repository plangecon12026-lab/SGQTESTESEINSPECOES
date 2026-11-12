import type { Metadata } from 'next';
import PlatformShell from '../platform-shell';
import WelderDashboard from './welder-dashboard';
import { requireManagementPage } from '../management-auth';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Farol de soldadores | SGQ',description:'Qualificações, sinetes, efetivo e cronograma de requalificação de soldadores.'};
export default async function Page(){const user=await requireManagementPage('/soldadores');return <PlatformShell current="welders" owner={user.owner}><WelderDashboard/></PlatformShell>}
