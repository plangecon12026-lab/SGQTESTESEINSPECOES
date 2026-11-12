import type { Metadata } from "next";
import ReportApp from "../report-app";
import PlatformShell from "../platform-shell";
import { requireFieldPage } from "../management-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Novo Relatório | Engenharia & Qualidade",
  description: "Emissão de relatório de inspeção de engenharia e qualidade.",
};

export default async function NewReportPage() {
  const user = await requireFieldPage("/novo-relatorio");
  return <PlatformShell current="engineering" owner={user?.owner}><ReportApp /></PlatformShell>;
}
