import type { Metadata } from "next";
import EngineeringDashboard from "../engineering-dashboard";
import PlatformShell from "../platform-shell";
import { requireManagementPage } from '../management-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Dashboard | Relatório de Inspeção",
  description: "Indicadores dos relatórios de inspeção de engenharia e qualidade.",
};

export default async function Home() {
  const user = await requireManagementPage('/inspecoes');
  return <PlatformShell current="indicators" owner={user.owner}><EngineeringDashboard /></PlatformShell>;
}
