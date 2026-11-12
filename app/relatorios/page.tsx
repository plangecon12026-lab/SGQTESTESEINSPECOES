import type { Metadata } from "next";
import ReportArchive from "./report-archive";
import PlatformShell from "../platform-shell";
import { requireManagementPage } from '../management-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Banco de Relatórios | Engenharia & Qualidade",
  description: "Histórico dos relatórios de inspeção emitidos.",
};

export default async function ReportsPage() {
  const user = await requireManagementPage('/relatorios');
  return <PlatformShell current="archive" owner={user.owner}><ReportArchive /></PlatformShell>;
}
