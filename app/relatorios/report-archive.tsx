"use client";
import {contractFetch} from '../contract-client';


import { useEffect, useMemo, useState } from "react";

type SavedReport = {
  id: string;
  report_number: string;
  issuer_name: string;
  issuer_role: string;
  title: string;
  project_name: string;
  created_at: string;
  docx_key: string | null;
  pdf_key: string | null;
};

type Occurrence = {
  id: string;
  report_id: string;
  classification: "SIT" | "RNC" | "NAP";
  title: string;
  vale_number: string;
  response_text: string;
  status: string;
  report_number: string;
  project_name: string;
  issuer_name: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  numero_se: string;
  numero_projeto: string;
  revisao_projeto: string;
  titulo_projeto: string;
  criticidade: string;
  descricao_tecnica: string;
  impacto: string;
  recomendacao: string;
  gerou_retrabalho: string;
  descricao_retrabalho: string;
  horas_retrabalho: string;
};

const trackingStatuses = ["Pendente de emissão", "Emitida", "Em tratativa", "Aguardando verificação", "Encerrada"];

export default function ReportArchive() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [issuerFilter, setIssuerFilter] = useState("");
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [occurrenceDrafts, setOccurrenceDrafts] = useState<Record<string, { valeNumber: string; responseText: string; status: string }>>({});
  const [trackingFilter, setTrackingFilter] = useState("Todos");
  const [savingOccurrence, setSavingOccurrence] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      const [response, occurrencesResponse] = await Promise.all([contractFetch("/api/reports", { cache: "no-store" }), contractFetch("/api/occurrences", { cache: "no-store" })]);
      if (!response.ok || !occurrencesResponse.ok) throw new Error("Não foi possível carregar os relatórios.");
      const payload = await response.json() as { reports: SavedReport[] };
      const occurrencePayload = await occurrencesResponse.json() as { occurrences: Occurrence[] };
      setReports(payload.reports ?? []);
      setOccurrences(occurrencePayload.occurrences ?? []);
      setOccurrenceDrafts(Object.fromEntries((occurrencePayload.occurrences ?? []).map((item) => [item.id, { valeNumber: item.vale_number, responseText: item.response_text || "", status: item.status }])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os relatórios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadReports(); }, []);

  const analytics = useMemo(() => {
    const projectMap = new Map<string, number>();
    const issuerMap = new Map<string, number>();
    const now = new Date();
    let currentMonth = 0;
    reports.forEach((report) => {
      const project = report.project_name || "Projeto não informado";
      projectMap.set(project, (projectMap.get(project) ?? 0) + 1);
      issuerMap.set(report.issuer_name, (issuerMap.get(report.issuer_name) ?? 0) + 1);
      const created = new Date(report.created_at);
      if (created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) currentMonth += 1;
    });
    const byProject = [...projectMap.entries()].sort((a, b) => b[1] - a[1]);
    const byIssuer = [...issuerMap.entries()].sort((a, b) => b[1] - a[1]);
    return { currentMonth, byProject, byIssuer, projects: projectMap.size, issuers: issuerMap.size };
  }, [reports]);

  const filteredReports = useMemo(() => reports.filter((report) =>
    (!projectFilter || (report.project_name || "Projeto não informado") === projectFilter) &&
    (!issuerFilter || report.issuer_name === issuerFilter)
  ), [reports, projectFilter, issuerFilter]);

  const filteredOccurrences = useMemo(() => occurrences.filter((occurrence) => trackingFilter === "Todos" || occurrence.classification === trackingFilter || occurrence.status === trackingFilter), [occurrences, trackingFilter]);
  const openOccurrences = occurrences.filter((occurrence) => occurrence.status !== "Encerrada").length;
  const closedOccurrences = occurrences.filter((occurrence) => occurrence.status === "Encerrada").length;

  const saveOccurrence = async (occurrence: Occurrence) => {
    const draft = occurrenceDrafts[occurrence.id] ?? { valeNumber: occurrence.vale_number, responseText: occurrence.response_text || "", status: occurrence.status };
    setSavingOccurrence(occurrence.id);
    try {
      const response = await contractFetch("/api/occurrences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: occurrence.id, valeNumber: draft.valeNumber, responseText: draft.responseText, status: draft.status }) });
      if (!response.ok) throw new Error("Não foi possível salvar o acompanhamento.");
      setOccurrences((current) => current.map((item) => item.id === occurrence.id ? { ...item, vale_number: draft.valeNumber.toUpperCase(), response_text: draft.responseText.trim(), status: draft.status } : item));
    } finally {
      setSavingOccurrence("");
    }
  };

  return <main className="app-shell theme-dark">
    <header className="topbar">
      <div className="brand-mark" aria-hidden="true">RI</div>
      <div className="brand-copy"><strong>Relatório de Inspeção</strong><span>Engenharia & Qualidade</span></div>
      <nav className="main-tabs" aria-label="Áreas do sistema"><a href="/">SGQ</a><a href="/inspecoes">Indicadores</a><a href="/novo-relatorio">Novo relatório</a><a className="active" href="/relatorios">Banco de Relatórios</a></nav>
      <div className="privacy-note"><span className="status-dot" /> Arquivo técnico protegido</div>
    </header>
    <section className="archive-page">
      <div className="archive-page-header">
        <div><span>GESTÃO DE DADOS</span><h1>Banco de Relatórios</h1><p>Indicadores, estratificações e histórico das inspeções emitidas.</p></div>
        <div className="archive-page-actions"><button type="button" className="secondary-button" onClick={() => void loadReports()}>Atualizar lista</button><a className="primary-button" href="/novo-relatorio">+ Novo relatório</a></div>
      </div>
      <div className="kpi-grid">
        <article><span>Relatórios emitidos</span><strong>{reports.length}</strong><small>Total armazenado</small></article>
        <article><span>Emissões no mês</span><strong>{analytics.currentMonth}</strong><small>Mês atual</small></article>
        <article><span>Projetos</span><strong>{analytics.projects}</strong><small>Projetos distintos</small></article>
        <article><span>Profissionais</span><strong>{analytics.issuers}</strong><small>Emissores ativos</small></article>
      </div>
      <div className="stratification-grid">
        <section className="stratification-card"><div className="card-title"><div><span>ESTRATIFICAÇÃO</span><h2>Relatórios por projeto</h2></div><strong>{analytics.projects}</strong></div><div className="bar-list">
          {analytics.byProject.slice(0, 8).map(([name, count]) => <button type="button" key={name} className={projectFilter === name ? "bar-row selected" : "bar-row"} onClick={() => setProjectFilter(projectFilter === name ? "" : name)}><span className="bar-label">{name}</span><span className="bar-track"><i style={{ width: `${reports.length ? Math.max(8, (count / reports.length) * 100) : 0}%` }} /></span><b>{count}</b></button>)}
          {analytics.byProject.length === 0 && <p className="archive-empty">Sem dados para estratificar.</p>}
        </div></section>
        <section className="stratification-card"><div className="card-title"><div><span>ESTRATIFICAÇÃO</span><h2>Relatórios por profissional</h2></div><strong>{analytics.issuers}</strong></div><div className="bar-list">
          {analytics.byIssuer.slice(0, 8).map(([name, count]) => <button type="button" key={name} className={issuerFilter === name ? "bar-row selected" : "bar-row"} onClick={() => setIssuerFilter(issuerFilter === name ? "" : name)}><span className="bar-label">{name}</span><span className="bar-track"><i style={{ width: `${reports.length ? Math.max(8, (count / reports.length) * 100) : 0}%` }} /></span><b>{count}</b></button>)}
          {analytics.byIssuer.length === 0 && <p className="archive-empty">Sem dados para estratificar.</p>}
        </div></section>
      </div>
      <section className="tracking-panel" id="controle-classificacoes">
        <div className="tracking-header"><div><span>ACOMPANHAMENTO VALE</span><h2>Controle de SIT, RNC e NAP</h2><p>Registre a numeração, o status e a resposta recebida para consulta da Engenharia.</p></div><div className="tracking-summary"><div><strong>{openOccurrences}</strong><span>Em aberto</span></div><div><strong>{closedOccurrences}</strong><span>Encerradas</span></div></div></div>
        <div className="tracking-toolbar">
          {["Todos", "SIT", "RNC", "NAP", "Pendente de emissão", "Emitida", "Em tratativa", "Aguardando verificação", "Encerrada"].map((filter) => <button type="button" key={filter} className={trackingFilter === filter ? "active" : ""} onClick={() => setTrackingFilter(filter)}>{filter}</button>)}
        </div>
        <div className="tracking-list">
          {filteredOccurrences.length === 0 ? <p className="archive-empty">Nenhuma classificação disponível para acompanhamento.</p> : filteredOccurrences.map((occurrence) => {
            const draft = occurrenceDrafts[occurrence.id] ?? { valeNumber: occurrence.vale_number, responseText: occurrence.response_text || "", status: occurrence.status };
            return <details className="tracking-row tracking-accordion" key={occurrence.id}>
              <summary className="tracking-accordion-summary">
                <span className={`classification-badge badge-${occurrence.classification.toLowerCase()}`}>{occurrence.classification}</span>
                <div className="tracking-description"><span>TÍTULO DA SITUAÇÃO</span><strong>{occurrence.title || "Situação sem título"}</strong><small>{occurrence.report_number} · {occurrence.project_name || "Projeto não informado"}</small></div>
                <span className="tracking-status-pill">{draft.status}</span>
                <span className="tracking-toggle"><b>Abrir situação</b><i aria-hidden="true">⌄</i></span>
              </summary>
              <div className="tracking-accordion-content">
                <div className="tracking-controls">
                  <label><span>Número no sistema Vale</span><input placeholder={`Número da ${occurrence.classification}`} value={draft.valeNumber} onChange={(event) => setOccurrenceDrafts((current) => ({ ...current, [occurrence.id]: { ...draft, valeNumber: event.target.value } }))} /></label>
                  <label><span>Status</span><select value={draft.status} onChange={(event) => setOccurrenceDrafts((current) => ({ ...current, [occurrence.id]: { ...draft, status: event.target.value } }))}>{trackingStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <button type="button" className="tracking-save" disabled={savingOccurrence === occurrence.id} onClick={() => void saveOccurrence(occurrence)}>{savingOccurrence === occurrence.id ? "Salvando…" : "Salvar"}</button>
                  <label className="tracking-response"><span>Resposta da {occurrence.classification}</span><textarea placeholder={`Digite aqui a resposta recebida para a ${occurrence.classification} e deixe disponível para consulta da Engenharia.`} value={draft.responseText} onChange={(event) => setOccurrenceDrafts((current) => ({ ...current, [occurrence.id]: { ...draft, responseText: event.target.value } }))} /></label>
                </div>
                <section className="occurrence-details" aria-label={`Dados técnicos da situação ${occurrence.title}`}>
                <div className="occurrence-details-title"><span>DADOS DA ETAPA 06</span><strong>Referência e informações técnicas</strong></div>
                <dl className="occurrence-title-data"><div><dt>Título da situação</dt><dd>{occurrence.title || "Não informado"}</dd></div></dl>
                <dl className="occurrence-project-data">
                  <div><dt>Número da SE</dt><dd>{occurrence.numero_se || "Não informado"}</dd></div>
                  <div><dt>Número do projeto</dt><dd>{occurrence.numero_projeto || "Não informado"}</dd></div>
                  <div><dt>Revisão</dt><dd>{occurrence.revisao_projeto || "Não informada"}</dd></div>
                  <div><dt>Título do projeto</dt><dd>{occurrence.titulo_projeto || "Não informado"}</dd></div>
                </dl>
                <dl className="occurrence-technical-data">
                  <div><dt>Criticidade</dt><dd>{occurrence.criticidade || "Não informada"}</dd></div>
                  <div><dt>Descrição técnica</dt><dd>{occurrence.descricao_tecnica || "Não informada"}</dd></div>
                  <div><dt>Impacto</dt><dd>{occurrence.impacto || "Não informado"}</dd></div>
                  <div><dt>Recomendação</dt><dd>{occurrence.recomendacao || "Não informada"}</dd></div>
                  <div><dt>Gerou retrabalho?</dt><dd>{occurrence.gerou_retrabalho || "Não informado"}</dd></div>
                  {occurrence.gerou_retrabalho === "Sim" && <div><dt>Dados do retrabalho</dt><dd>{occurrence.descricao_retrabalho || "Sem descrição"}{occurrence.horas_retrabalho ? ` · ${occurrence.horas_retrabalho} h` : ""}</dd></div>}
                </dl>
                </section>
                <div className="occurrence-timeline" aria-label={`Andamento: ${draft.status}`}>
                  {trackingStatuses.map((status, index) => { const currentIndex = trackingStatuses.indexOf(draft.status); return <div key={status} className={index < currentIndex ? "complete" : index === currentIndex ? "current" : ""}><i /><span>{status}</span></div>; })}
                </div>
              </div>
            </details>;
          })}
        </div>
      </section>
      <div className="report-archive standalone">
        <div className="archive-heading"><div><strong>Relatórios armazenados</strong><span>{projectFilter || issuerFilter ? "Resultado da estratificação selecionada" : "Últimas 100 emissões"}</span></div><div className="archive-filter-actions">{(projectFilter || issuerFilter) && <button type="button" onClick={() => { setProjectFilter(""); setIssuerFilter(""); }}>Limpar filtros</button>}<span className="archive-count">{filteredReports.length} registro{filteredReports.length === 1 ? "" : "s"}</span></div></div>
        {loading ? <p className="archive-empty">Carregando histórico…</p> : error ? <p className="archive-empty">{error}</p> : filteredReports.length === 0 ? <p className="archive-empty">Nenhum relatório encontrado.</p> : <div className="archive-list">
          {filteredReports.map((report) => <article key={report.id} className="archive-item">
            <div><strong>{report.report_number}</strong><span>{report.issuer_name} · {report.issuer_role}</span><small>{report.title || report.project_name || "Sem título"}</small></div>
            <div className="archive-actions">{report.docx_key && <a href={`/api/reports?id=${report.id}&format=docx`}>Baixar DOCX</a>}{report.pdf_key && <a href={`/api/reports?id=${report.id}&format=pdf`}>Baixar PDF</a>}</div>
          </article>)}
        </div>}
      </div>
    </section>
  </main>;
}
