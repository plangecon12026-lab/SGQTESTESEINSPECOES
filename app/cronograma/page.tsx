import type { Metadata } from 'next';
import PlatformShell from '../platform-shell';
import InspectionSchedule from '../inspection-schedule';
import { requireManagementPage } from '../management-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cronograma de inspeções e testes | SGQ', description: 'Planejamento e acompanhamento de inspeções e ensaios por projeto.' };
export default async function Page() { const user = await requireManagementPage('/cronograma'); return <PlatformShell current="schedule" owner={user.owner}><InspectionSchedule /></PlatformShell>; }
