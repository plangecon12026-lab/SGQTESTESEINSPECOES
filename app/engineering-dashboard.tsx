"use client";
import {contractFetch} from './contract-client';


import { useEffect, useMemo, useState } from "react";
import { calculateRework } from './rework-analytics';

type SituationMeta = { tipoRegistro?: string; criticidade?: string; gerouRetrabalho?: string; horasRetrabalho?: string };
type ReportMeta = { identificacao?: { disciplina?: string }; situacoes?: SituationMeta[] };
type ReportRow = { id: string; report_number: string; project_name: string; issuer_name: string; created_at: string; metadata_json: string };
type OccurrenceRow = { id: string; report_id: string; situation_id: string; classification: "SIT" | "RNC" | "NAP"; status: string; title: string; updated_at: string; report_number: string; project_name: string };
const hoursLabel = (hours: number) => `${hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;

export default function EngineeringDashboard() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [occurrences, setOccurrences] = useState<OccurrenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [reworkPeriod, setReworkPeriod] = useState<'6m' | 'year' | 'all'>('6m');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      contractFetch("/api/reports", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error('Não foi possível carregar os relatórios.'); return response.json(); }),
      contractFetch("/api/occurrences", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error('Não foi possível carregar as ocorrências.'); return response.json(); }),
    ]).then(([reportPayload, occurrencePayload]: [{ reports?: ReportRow[] }, { occurrences?: OccurrenceRow[] }]) => {
      setReports(reportPayload.reports ?? []);
      setOccurrences(occurrencePayload.occurrences ?? []);
    }).catch((error) => setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os indicadores.')).finally(() => setLoading(false));
  }, []);

  const visibleReports = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return reports;
    return reports.filter((report) => [report.report_number, report.project_name, report.issuer_name]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalized)));
  }, [query, reports]);

  const data = useMemo(() => {
    const types = { SIT: 0, RNC: 0, NAP: 0 };
    const criticality = { Baixa: 0, Média: 0, Alta: 0, Crítica: 0 };
    const disciplines = new Map<string, number>();
    const projects = new Map<string, number>();
    const months = new Map<string, number>();
    let situations = 0;
    let reworkSituations = 0;
    let reworkHours = 0;
    const now = new Date();
    let reportsThisMonth = 0;

    visibleReports.forEach((report) => {
      const created = new Date(report.created_at);
      if (created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) reportsThisMonth += 1;
      const monthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      months.set(monthKey, (months.get(monthKey) ?? 0) + 1);
      const project = report.project_name || "Não informado";
      projects.set(project, (projects.get(project) ?? 0) + 1);
      let metadata: ReportMeta = {};
      try { metadata = JSON.parse(report.metadata_json || "{}"); } catch { metadata = {}; }
      const discipline = metadata.identificacao?.disciplina || "Não informada";
      disciplines.set(discipline, (disciplines.get(discipline) ?? 0) + 1);
      (metadata.situacoes ?? []).forEach((situation) => {
        situations += 1;
        if (situation.tipoRegistro && situation.tipoRegistro in types) types[situation.tipoRegistro as keyof typeof types] += 1;
        if (situation.criticidade && situation.criticidade in criticality) criticality[situation.criticidade as keyof typeof criticality] += 1;
        if (situation.gerouRetrabalho === "Sim") {
          reworkSituations += 1;
          reworkHours += Number(situation.horasRetrabalho || 0);
        }
      });
    });

    const monthSeries = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), value: months.get(key) ?? 0 };
    });
    return {
      reportsThisMonth, situations, reworkSituations, reworkHours, types, criticality, monthSeries,
      projects: [...projects.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      disciplines: [...disciplines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [visibleReports]);

  const maxMonth = Math.max(1, ...data.monthSeries.map((month) => month.value));
  const totalTypes = Math.max(1, data.types.SIT + data.types.RNC + data.types.NAP);
  const lifecycle = useMemo(() => {
    const order = ["Pendente de emissão", "Emitida", "Em tratativa", "Aguardando verificação", "Encerrada"];
    const counts = Object.fromEntries(order.map((status) => [status, occurrences.filter((item) => item.status === status).length]));
    return { order, counts, open: occurrences.filter((item) => item.status !== "Encerrada").length, closed: occurrences.filter((item) => item.status === "Encerrada").length };
  }, [occurrences]);
  const rework = useMemo(() => calculateRework(visibleReports, occurrences, reworkPeriod), [visibleReports, occurrences, reworkPeriod]);

  return <main className="app-shell theme-dark dashboard-shell">
    <header className="topbar">
      <div className="brand-mark" aria-hidden="true">RI</div>
      <div className="brand-copy"><strong>Relatório de Inspeção</strong><span>Engenharia & Qualidade</span></div>
      <nav className="main-tabs" aria-label="Áreas do sistema"><a href="/">SGQ</a><a className="active" href="/inspecoes">Indicadores</a><a href="/novo-relatorio">Novo relatório</a><a href="/relatorios">Banco de Relatórios</a></nav>
      <div className="privacy-note"><span className="status-dot" /> Base sincronizada e protegida</div>
    </header>

    <div className="dashboard-page">
      <div className="dashboard-commandbar">
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar relatório, projeto ou responsável..." aria-label="Pesquisar relatórios" /></label>
        <a href="/relatorios">▤ Consultar banco</a><a className="primary" href="/novo-relatorio">＋ Novo relatório</a>
      </div>
      <section className="executive-hero">
        <div className="executive-hero-copy"><span>▧ &nbsp; ENGENHARIA 360° · COCKPIT GERENCIAL</span><h1>Visão Executiva das Inspeções</h1><p>Prioridades, riscos e decisões técnicas consolidadas a partir dos relatórios de inspeção, classificações e ocorrências registradas.</p>
          <dl><div><dt>PERÍODO GERAL</dt><dd>Todo o histórico</dd></div><div><dt>ÚLTIMA LEITURA</dt><dd>Atualização automática</dd></div><div><dt>SITUAÇÕES</dt><dd>{data.situations}</dd></div><div><dt>RETRABALHO</dt><dd>{data.reworkHours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h</dd></div></dl>
        </div>
        <div className="executive-hero-status"><span>⌁ BASE SINCRONIZADA</span><strong>{visibleReports.length}</strong><small>relatórios monitorados</small></div>
      </section>
      {loading ? <div className="dashboard-loading">Carregando indicadores…</div> : loadError ? <div className="dashboard-loading" role="alert">{loadError} Atualize a página para tentar novamente.</div> : <>
        <div className="dashboard-kpis">
          <article className="kpi-blue"><i>▤</i><div><span>Relatórios emitidos</span><strong>{visibleReports.length}</strong><small>{data.reportsThisMonth} neste mês</small></div></article>
          <article className="kpi-amber"><i>◇</i><div><span>Situações registradas</span><strong>{data.situations}</strong><small>SIT, RNC e NAP</small></div></article>
          <article className="kpi-cyan"><i>◷</i><div><span>Horas de retrabalho</span><strong>{data.reworkHours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h</strong><small>{data.reworkSituations} ocorrências</small></div></article>
          <article className="kpi-red"><i>△</i><div><span>Ocorrências críticas</span><strong>{data.criticality.Crítica}</strong><small>{data.criticality.Alta} de criticidade alta</small></div></article>
        </div>
        <section className="executive-strip">
          <div className="executive-score"><span>ÍNDICE DE ENCERRAMENTO</span><strong>{occurrences.length ? Math.round((lifecycle.closed / occurrences.length) * 100) : 0}%</strong><small>{lifecycle.closed} de {occurrences.length} classificações encerradas</small></div>
          <div className="executive-progress" aria-label="Progresso de encerramento"><i style={{ width: `${occurrences.length ? (lifecycle.closed / occurrences.length) * 100 : 0}%` }} /></div>
          <div className="executive-status"><span className="status-light status-open" /><div><strong>{lifecycle.open}</strong><small>em acompanhamento</small></div></div>
          <a href="/relatorios#controle-classificacoes">Ver acompanhamento →</a>
        </section>
        <ReworkPanel data={rework} period={reworkPeriod} onPeriodChange={setReworkPeriod} />
        <div className="dashboard-grid">
          <section id="classificacoes" className="dashboard-card type-card"><div className="dashboard-card-title"><div><span>CLASSIFICAÇÃO</span><h2>SIT, RNC e NAP</h2></div><b>{data.situations}</b></div><div className="type-distribution">
            {Object.entries(data.types).map(([type, value]) => <div key={type}><div><span>{type}</span><b>{value}</b></div><i><em style={{ width: `${(value / totalTypes) * 100}%` }} /></i></div>)}
          </div></section>
          <section className="dashboard-card"><div className="dashboard-card-title"><div><span>TENDÊNCIA</span><h2>Emissões nos últimos 6 meses</h2></div></div><div className="month-chart">
            {data.monthSeries.map((month) => <div key={month.label}><b>{month.value}</b><i style={{ height: `${Math.max(7, (month.value / maxMonth) * 100)}%` }} /><span>{month.label}</span></div>)}
          </div></section>
          <section id="criticidade" className="dashboard-card"><div className="dashboard-card-title"><div><span>CRITICIDADE</span><h2>Distribuição das situações</h2></div></div><div className="criticality-list">
            {Object.entries(data.criticality).map(([level, value]) => <div key={level} className={`criticality-${level.toLowerCase().replace("í", "i").replace("é", "e")}`}><span>{level}</span><b>{value}</b></div>)}
          </div></section>
          <section id="projetos" className="dashboard-card"><div className="dashboard-card-title"><div><span>ESTRATIFICAÇÃO</span><h2>Principais projetos</h2></div></div><div className="ranking-list">{data.projects.map(([name, value], index) => <div key={name}><span>{String(index + 1).padStart(2, "0")}</span><p>{name}</p><b>{value}</b></div>)}{data.projects.length === 0 && <small>Sem dados disponíveis.</small>}</div></section>
          <section id="disciplinas" className="dashboard-card dashboard-card-wide"><div className="dashboard-card-title"><div><span>DISCIPLINAS</span><h2>Relatórios por especialidade</h2></div></div><div className="discipline-grid">{data.disciplines.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}{data.disciplines.length === 0 && <small>Sem dados disponíveis.</small>}</div></section>
          <section className="dashboard-card dashboard-card-wide lifecycle-dashboard"><div className="dashboard-card-title"><div><span>FLUXO OPERACIONAL</span><h2>Linha do tempo das classificações</h2></div><b>{occurrences.length}</b></div><div className="lifecycle-overview">
            {lifecycle.order.map((status, index) => <div key={status} className={`lifecycle-stage stage-${index + 1}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{lifecycle.counts[status]}</strong><small>{status}</small></div></div>)}
          </div></section>
        </div>
      </>}
    </div>
  </main>;
}

function ReworkPanel({ data, period, onPeriodChange }: { data: ReturnType<typeof calculateRework>; period: '6m' | 'year' | 'all'; onPeriodChange: (value: '6m' | 'year' | 'all') => void }) {
  const [caseFilter, setCaseFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [focusProject, setFocusProject] = useState('');
  const selectedProject = data.projects.some(item => item.name === focusProject) ? focusProject : '';
  const priority = [...data.cases].filter(item => (!selectedProject || item.project === selectedProject) &&
    (caseFilter === 'all' || (caseFilter === 'open' ? item.status !== 'Encerrada' : item.status === 'Encerrada')))
    .sort((a, b) => (b.hours || 0) - (a.hours || 0)).slice(0, 10);
  const largestMonth = Math.max(1, ...data.monthly.map(item => item.hours));
  const largestProject = Math.max(1, ...data.projects.map(item => item.hours));
  const topProject = data.projects[0];
  const projectShare = data.hours && topProject ? topProject.hours / data.hours * 100 : 0;
  const closedShare = data.hours ? Math.max(0, Math.min(100, (data.hours - data.openHours) / data.hours * 100)) : 0;
  const comparison = data.previousHours === null ? '' : data.previousHours === 0
    ? 'Sem horas registradas nos 6 meses anteriores'
    : `${data.hours >= data.previousHours ? '▲' : '▼'} ${Math.abs((data.hours - data.previousHours) / data.previousHours * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ante os 6 meses anteriores`;
  return <section id="retrabalho" className="rework-panel rework-pro" aria-labelledby="rework-title">
    <div className="rework-pro-header"><div><span className="rework-kicker">CONTROLE DE PERDAS · INSPEÇÃO DE ENGENHARIA</span><h2 id="rework-title">Inteligência de retrabalho</h2><p>Das horas registradas à decisão: veja onde agir primeiro.</p></div><label>Período da análise<select value={period} onChange={event => { onPeriodChange(event.target.value as '6m' | 'year' | 'all'); setFocusProject(''); }}><option value="6m">Últimos 6 meses</option><option value="year">Ano atual</option><option value="all">Todo o histórico</option></select></label></div>
    <div className="rework-pro-lead"><div className="rework-pro-total"><span>HORAS DE RETRABALHO</span><strong>{data.hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}<small> h</small></strong><p>{data.count} {data.count === 1 ? 'situação gerou' : 'situações geraram'} retrabalho em {data.affectedReports} {data.affectedReports === 1 ? 'relatório' : 'relatórios'}.</p>{comparison && <div className="rework-pro-comparison">{comparison}</div>}</div><div className="rework-pro-exposure"><div className="rework-pro-ring" style={{ background: data.hours ? `conic-gradient(#33bc79 0 ${closedShare}%, #f0b64c ${closedShare}% 100%)` : '#40624e' }}><div><strong>{data.hours ? `${Math.round(data.openHours / data.hours * 100)}%` : '—'}</strong><small>em aberto</small></div></div><div className="rework-pro-legend"><span><i className="open" /> Em acompanhamento <b>{hoursLabel(data.openHours)}</b></span><span><i className="closed" /> Encerrado <b>{hoursLabel(data.hours - data.openHours)}</b></span></div></div></div>
    <div className="rework-pro-metrics"><article><span>Incidência</span><strong>{data.rate === null ? '—' : `${data.rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</strong><small>{data.count} de {data.assessed} situações avaliadas</small></article><article><span>Média por situação</span><strong>{data.averageHours === null ? '—' : hoursLabel(data.averageHours)}</strong><small>Casos com horas válidas</small></article><article><span>Relatórios impactados</span><strong>{data.affectedReports}</strong><small>Com ao menos uma situação</small></article><article className="rework-pro-alert"><span>Casos por acompanhar</span><strong>{data.openCount}</strong><small>{hoursLabel(data.openHours)} ainda não encerradas</small></article></div>
    {data.unknownHours > 0 && <p className="rework-data-note">Atenção: {data.unknownHours} situação(ões) marcada(s) como retrabalho sem horas válidas. Elas entram na contagem, mas ficam fora da soma e da média.</p>}
    <div className="rework-pro-story"><div><b>FOCO GERENCIAL</b><strong>{topProject && data.hours ? topProject.name : 'Sem concentração identificada'}</strong><p>{topProject && data.hours ? `${hoursLabel(topProject.hours)} neste projeto (${projectShare.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% das horas do período). Priorize a análise das situações abaixo e o plano de ação.` : 'Quando houver registros de retrabalho, o projeto com maior impacto aparecerá aqui.'}</p></div><a href="/relatorios#controle-classificacoes">Acompanhar ocorrências</a></div>
    <div className="rework-pro-charts"><section><header><div><span>EVOLUÇÃO</span><h3>Horas mês a mês</h3></div><small>Últimos 6 meses, mesmo com outro período selecionado</small></header><div className="rework-pro-bars">{data.monthly.map(item => <div key={item.key} title={`${item.count} situação(ões) · ${hoursLabel(item.hours)}`}><b>{item.hours ? item.hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}</b><i><em style={{ height: `${item.hours ? Math.max(6, item.hours / largestMonth * 100) : 0}%` }} /></i><span>{item.label}</span><small>{item.count} {item.count === 1 ? 'caso' : 'casos'}</small></div>)}</div></section><section><header><div><span>PARETO</span><h3>Onde as horas se concentram</h3></div><small>Toque no projeto para filtrar os casos</small></header>{data.projects.length ? <div className="rework-pro-projects">{data.projects.slice(0, 6).map((item, index) => <button type="button" key={item.name} className={selectedProject === item.name ? 'selected' : ''} onClick={() => setFocusProject(selectedProject === item.name ? '' : item.name)} aria-pressed={selectedProject === item.name}><span className="number">{String(index + 1).padStart(2, '0')}</span><span className="name"><b>{item.name}</b><small>{item.count} {item.count === 1 ? 'situação' : 'situações'}</small><i><em style={{ width: `${item.hours / largestProject * 100}%` }} /></i></span><strong>{hoursLabel(item.hours)}</strong></button>)}</div> : <p className="rework-empty">Sem retrabalho registrado neste período.</p>}</section></div>
    <div className="rework-pro-bottom"><div><h3>Por disciplina</h3>{data.disciplines.length ? data.disciplines.map(item => <p key={item.name}><span>{item.name}</span><b>{hoursLabel(item.hours)}</b></p>) : <small>Sem registros.</small>}</div><div><h3>Por classificação</h3>{data.classifications.length ? data.classifications.map(item => <p key={item.name}><span>{item.name}</span><b>{hoursLabel(item.hours)}</b></p>) : <small>Sem registros.</small>}</div></div>
    <div className="rework-pro-cases"><div className="rework-pro-cases-heading"><div><span>PRIORIZAÇÃO</span><h3>Situações que consumiram mais horas</h3><p>Referência do relatório, criticidade e etapa de acompanhamento.</p></div><div className="rework-pro-filters" role="group" aria-label="Filtrar situações por acompanhamento"><button type="button" aria-pressed={caseFilter === 'all'} className={caseFilter === 'all' ? 'selected' : ''} onClick={() => setCaseFilter('all')}>Todas</button><button type="button" aria-pressed={caseFilter === 'open'} className={caseFilter === 'open' ? 'selected' : ''} onClick={() => setCaseFilter('open')}>Em aberto</button><button type="button" aria-pressed={caseFilter === 'closed'} className={caseFilter === 'closed' ? 'selected' : ''} onClick={() => setCaseFilter('closed')}>Encerradas</button></div></div>{selectedProject && <button type="button" className="rework-pro-clear" onClick={() => setFocusProject('')}>Projeto: {selectedProject} × limpar filtro</button>}
      {priority.length ? <div className="rework-pro-case-list">{priority.map((item, index) => <article key={`${item.reportNumber}-${item.title}-${index}`}><span className="position">{String(index + 1).padStart(2, '0')}</span><div><b>{item.title}</b><small>{item.reportNumber} · {item.project} · {item.classification} · {item.criticality}</small></div><span className={item.status === 'Encerrada' ? 'status closed' : 'status'}>{item.status}</span><strong>{item.hours === null ? 'Sem horas' : hoursLabel(item.hours)}</strong></article>)}</div> : <p className="rework-empty">Nenhuma situação encontrada com estes filtros.</p>}</div>
    <p className="rework-method">Base: situações marcadas “Gerou retrabalho: Sim” nos relatórios de inspeção de engenharia. A incidência considera situações respondidas “Sim” ou “Não”. Datas pelo registro do relatório; a busca no topo filtra todo o painel. Horas em aberto seguem o status no banco de ocorrências.</p>
  </section>;
}
