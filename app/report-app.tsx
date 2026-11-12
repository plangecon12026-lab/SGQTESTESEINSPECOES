"use client";
import {browserContract,contractFetch} from './contract-client';


import { useEffect, useMemo, useRef, useState } from "react";
import { generateDocx } from "./generate-docx";
import { generatePdf } from "./generate-pdf";
import type { ReportData, Revision, Situation } from "./report-types";
import { lsOptions as s11dLS, projectAreas as s11dAreas, projectNames as s11dProjects, projectPhases, reportIssuers } from "./project-options";
import { deleteDraft, getDraft, putDraft, putQueue } from "./offline-store";
import { parseManualSequence } from './manual-sequence';

const steps = [
  "Dados do cabeçalho",
  "Revisões",
  "Identificação",
  "Objetivo",
  "Escopo",
  "Situações identificadas",
  "Análise técnica",
  "Conclusão",
  "Geração do relatório",
];

const emptyRevision = (): Revision => ({
  id: crypto.randomUUID(), revisao: "", te: "", descricao: "", por: "", verificador: "", aprovador: "", autorizador: "", data: "",
});

const emptySituation = (): Situation => ({
  id: crypto.randomUUID(), numeroSe: "", numeroProjeto: "", revisaoProjeto: "", tituloProjeto: "", titulo: "", tipoRegistro: "", criticidade: "", descricaoTecnica: "", impacto: "", recomendacao: "", gerouRetrabalho: "", descricaoRetrabalho: "", horasRetrabalho: "", fotos: [],
});

const initialData: ReportData = {
  cabecalho: {
    tituloSuperior: "",
    classificacao: "INTERNO",
    numeroVale: "",
    numeroContratada: "",
    manualSequence: "",
    revisao: "",
    faseProjeto: "PROJETO DETALHADO",
    areaProjeto: "ÁREA 20 - USINA DE BENEFICIAMENTO",
    subarea: "2020KS - PÁTIO DE REGULARIZAÇÃO",
    nomeProjeto: "C020254 - AQUISIÇÃO DE EXTRATORES DE METAIS",
    pepLs: "2024-27 - EXTRATOR USINA - TR2020KS 10 E 11, MONTAGEM DA ESTRUTURA E BIG MOE",
    emissor: "",
  },
  revisoes: [{ id: "revision-initial", revisao: "0", te: "C", descricao: "PARA CONHECIMENTO", por: "", verificador: "", aprovador: "", autorizador: "", data: "" }],
  identificacao: { data: "", tipoAtividade: "Inspeção Técnica de Montagem", areaInspecao: "", disciplina: "" },
  objetivo: "",
  escopo: "",
  situacoes: [{ id: "situation-initial", numeroSe: "", numeroProjeto: "", revisaoProjeto: "", tituloProjeto: "", titulo: "", tipoRegistro: "", criticidade: "", descricaoTecnica: "", impacto: "", recomendacao: "", gerouRetrabalho: "", descricaoRetrabalho: "", horasRetrabalho: "", fotos: [] }],
  analiseTecnica: "",
  conclusao: "",
};

type EngineeringDraft = {
  data: ReportData;
  activeStep: number;
  classificationOther: string;
  activityOther: string;
  classificationChoice: string;
  activityChoice: string;
  savedAt: string;
};

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}{required && <b aria-hidden="true"> *</b>}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function SearchableField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><span className="field-label">{label}</span>{children}</div>;
}

type SearchableOption = { value: string; label: string };

function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Selecione",
  searchPlaceholder = "Pesquisar na lista…",
  ariaLabel,
}: {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const filteredOptions = options.filter((option) => option.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalizedQuery));

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setQuery(""); }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); setQuery(""); }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  return (
    <div className="searchable-select" ref={rootRef}>
      <button type="button" className="searchable-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((current) => !current); setQuery(""); }}>
        <span>{selected?.label || placeholder}</span>
        <span className="searchable-select-icons" aria-hidden="true"><b>🔍</b><i>⌄</i></span>
      </button>
      {open && (
        <div className="searchable-select-popover">
          <label className="searchable-select-search">
            <span aria-hidden="true">🔍</span>
            <input ref={searchRef} type="search" aria-label={searchPlaceholder} value={query} placeholder={searchPlaceholder} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="searchable-select-options" role="listbox">
            {filteredOptions.length ? filteredOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? "selected" : ""}
                key={option.value}
                onClick={() => { onChange(option.value); setOpen(false); setQuery(""); }}
              >
                <span>{option.label}</span>{option.value === value && <b aria-hidden="true">✓</b>}
              </button>
            )) : <p>Nenhum resultado encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function ReportApp() {
  const isS11D=browserContract()==='s11d';
  const projectNames=isS11D?s11dProjects:[];
  const lsOptions=isS11D?s11dLS:[];
  const projectAreas=isS11D?s11dAreas:[{code:'GERAL',label:'Área do contrato',subareas:[{code:'GERAL',label:'Geral'}]}];

  const [activeStep, setActiveStep] = useState(0);
  const [data, setData] = useState<ReportData>(()=>isS11D?initialData:{...initialData,cabecalho:{...initialData.cabecalho,areaProjeto:"Área do contrato",subarea:"Geral",nomeProjeto:"",pepLs:""}});
  const [classificationOther, setClassificationOther] = useState("");
  const [activityOther, setActivityOther] = useState("");
  const [classificationChoice, setClassificationChoice] = useState("INTERNO");
  const [activityChoice, setActivityChoice] = useState("Inspeção Técnica de Montagem");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [downloads, setDownloads] = useState<{ docx?: { url: string; name: string }; pdf?: { url: string; name: string } }>({});
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState("");
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [syncedOffline, setSyncedOffline] = useState(false);

  useEffect(() => {
    void getDraft<EngineeringDraft>('engineering-active').then((draft) => {
      if (draft) {
        const restored = {
          ...draft.data,
          situacoes: draft.data.situacoes.map((situation) => ({ ...situation, fotos: situation.fotos.map((photo) => ({ ...photo, preview: URL.createObjectURL(photo.file) })) })),
        };
        setData(restored);
        setActiveStep(draft.activeStep);
        setClassificationOther(draft.classificationOther);
        setActivityOther(draft.activityOther);
        setClassificationChoice(draft.classificationChoice);
        setActivityChoice(draft.activityChoice);
        setDraftSaved(draft.savedAt);
        setMessage({ type: 'info', text: 'Rascunho recuperado deste aparelho.' });
      }
      setDraftReady(true);
    }).catch(() => setDraftReady(true));
  }, []);

  useEffect(() => {
    if (!draftReady || queuedOffline) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const storedData = { ...data, situacoes: data.situacoes.map((situation) => ({ ...situation, fotos: situation.fotos.map((photo) => ({ ...photo, preview: '' })) })) };
      void putDraft<EngineeringDraft>('engineering-active', { data: storedData, activeStep, classificationOther, activityOther, classificationChoice, activityChoice, savedAt }).then(() => setDraftSaved(savedAt));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, activeStep, classificationOther, activityOther, classificationChoice, activityChoice, draftReady, queuedOffline]);

  useEffect(() => {
    const completed = () => {
      if (queuedOffline) {
        setSyncedOffline(true);
        setMessage({ type: 'success', text: 'Relatório sincronizado, numerado e salvo no histórico.' });
      }
    };
    window.addEventListener('sgq-offline-synced', completed);
    return () => window.removeEventListener('sgq-offline-synced', completed);
  }, [queuedOffline]);

  const photoCount = useMemo(() => data.situacoes.reduce((sum, situation) => sum + situation.fotos.length, 0), [data.situacoes]);
  const selectedArea = useMemo(
    () => projectAreas.find((area) => area.label === data.cabecalho.areaProjeto) ?? projectAreas[0],
    [data.cabecalho.areaProjeto],
  );
  const selectedIssuer = reportIssuers.find((issuer) => issuer.key === data.cabecalho.emissor);
  const currentYearShort = String(new Date().getFullYear()).slice(-2);
  const numberPreview = selectedIssuer ? `RI-${selectedIssuer.key}-${data.cabecalho.manualSequence && /^[0-9]{1,6}$/.test(data.cabecalho.manualSequence) ? String(Number(data.cabecalho.manualSequence)).padStart(3, '0') : '###'}-${currentYearShort}` : "Selecione o emissor";


  const updateHeader = (key: keyof ReportData["cabecalho"], value: string) =>
    setData((current) => ({ ...current, cabecalho: { ...current.cabecalho, [key]: value } }));

  const updateProjectArea = (areaLabel: string) => {
    const area = projectAreas.find((item) => item.label === areaLabel) ?? projectAreas[0];
    setData((current) => ({
      ...current,
      cabecalho: {
        ...current.cabecalho,
        areaProjeto: area.label,
        subarea: area.subareas[0]?.label ?? "",
      },
    }));
  };

  const updateRevision = (id: string, key: keyof Omit<Revision, "id">, value: string) =>
    setData((current) => ({ ...current, revisoes: current.revisoes.map((item) => item.id === id ? { ...item, [key]: value } : item) }));

  const updateSituation = (id: string, key: keyof Omit<Situation, "id" | "fotos">, value: string) =>
    setData((current) => ({ ...current, situacoes: current.situacoes.map((item) => item.id === id ? { ...item, [key]: value } : item) }));

  const addPhotos = (situationId: string, files: FileList | null) => {
    if (!files) return;
    const photos = Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, legenda: "", preview: URL.createObjectURL(file) }));
    setData((current) => ({ ...current, situacoes: current.situacoes.map((item) => item.id === situationId ? { ...item, fotos: [...item.fotos, ...photos] } : item) }));
  };

  const formatDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  };

  const normalizedData = () => ({
    ...data,
    cabecalho: { ...data.cabecalho, classificacao: classificationChoice === "Outro" ? classificationOther.trim() : classificationChoice },
    revisoes: data.revisoes.map((revision) => ({ ...revision, data: formatDate(revision.data) })),
    identificacao: { ...data.identificacao, data: formatDate(data.identificacao.data), tipoAtividade: activityChoice === "Outro" ? activityOther.trim() : activityChoice },
  });

  const validate = () => {
    const report = normalizedData();
    const errors: string[] = [];
    if (!report.cabecalho.emissor.trim()) errors.push("Engenheiro, inspetor ou gestor");
    if (!report.cabecalho.revisao.trim()) errors.push("Revisão");
    if (!report.identificacao.data) errors.push("Data da inspeção");
    if (!report.identificacao.tipoAtividade.trim()) errors.push("Tipo de atividade");
    if (!report.identificacao.areaInspecao.trim()) errors.push("Área da inspeção");
    if (!report.identificacao.disciplina.trim()) errors.push("Disciplina");
    if (!report.objetivo.trim()) errors.push("Objetivo");
    if (!report.escopo.trim()) errors.push("Escopo");
    if (!report.analiseTecnica.trim()) errors.push("Análise técnica geral");
    if (!report.conclusao.trim()) errors.push("Conclusão");
    report.situacoes.forEach((situation, index) => {
      if (!situation.numeroSe.trim()) errors.push(`Número da SE da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.numeroProjeto.trim()) errors.push(`Número do Projeto da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.revisaoProjeto.trim()) errors.push(`Revisão do Projeto da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.tituloProjeto.trim()) errors.push(`Título do Projeto da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.titulo.trim()) errors.push(`Título da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.tipoRegistro.trim()) errors.push(`Classificação SIT/RNC/NAP da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.criticidade.trim()) errors.push(`Criticidade da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.descricaoTecnica.trim()) errors.push(`Descrição da Situação ${String(index + 1).padStart(2, "0")}`);
      if (!situation.gerouRetrabalho) errors.push(`Indicação de retrabalho da Situação ${String(index + 1).padStart(2, "0")}`);
      if (situation.gerouRetrabalho === "Sim" && !situation.descricaoRetrabalho.trim()) errors.push(`Descrição do retrabalho da Situação ${String(index + 1).padStart(2, "0")}`);
      if (situation.gerouRetrabalho === "Sim" && (!situation.horasRetrabalho || Number(situation.horasRetrabalho) <= 0)) errors.push(`Horas de retrabalho da Situação ${String(index + 1).padStart(2, "0")}`);
    });
    return errors;
  };

  const generate = async () => {
    const errors = validate();
    if (errors.length) {
      setMessage({ type: "error", text: `Preencha os campos obrigatórios: ${errors.join(", ")}.` });
      return;
    }
    setGenerating(true);
    setMessage({ type: "info", text: "Montando o relatório com o template oficial…" });
    Object.values(downloads).forEach((item) => item && URL.revokeObjectURL(item.url));
    setDownloads({});
    try {
      const baseReport = normalizedData();
      parseManualSequence(baseReport.cabecalho.manualSequence);
      const issuer = reportIssuers.find((item) => item.key === baseReport.cabecalho.emissor);
      if (!issuer) throw new Error("Selecione o engenheiro, inspetor ou gestor responsável.");
      if (!navigator.onLine) {
        const now = new Date().toISOString();
        const storedReport = { ...baseReport, situacoes: baseReport.situacoes.map((situation) => ({ ...situation, fotos: situation.fotos.map((photo) => ({ ...photo, preview: '' })) })) };
        await putQueue({ id: `engineering-${crypto.randomUUID()}`, type: 'engineering', createdAt: now, updatedAt: now, attempts: 0, payload: { report: storedReport, issuer, year: new Date().getFullYear() } });
        await deleteDraft('engineering-active');
        setQueuedOffline(true);
        setMessage({ type: 'success', text: 'Relatório guardado neste aparelho. A numeração escolhida ou automática, o DOCX e o PDF serão gerados quando a internet voltar.' });
        return;
      }
      const storageMetadata = {
        ...baseReport,
        situacoes: baseReport.situacoes.map((situation) => ({
          ...situation,
          fotos: situation.fotos.map((photo) => ({ id: photo.id, legenda: photo.legenda, nome: photo.file.name, tipo: photo.file.type, tamanho: photo.file.size })),
        })),
      };
      const reserveResponse = await contractFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerKey: issuer.key, issuerName: issuer.name, issuerRole: issuer.role, year: new Date().getFullYear(), manualSequence: baseReport.cabecalho.manualSequence, metadata: storageMetadata }),
      });
      const reservation = await reserveResponse.json() as { id?: string; reportNumber?: string; error?: string };
      if (!reserveResponse.ok || !reservation.id || !reservation.reportNumber) throw new Error(reservation.error || "Não foi possível gerar a numeração automática.");

      const report = { ...baseReport, cabecalho: { ...baseReport.cabecalho, numeroContratada: reservation.reportNumber } };
      setData((current) => ({ ...current, cabecalho: { ...current.cabecalho, numeroContratada: reservation.reportNumber! } }));
      const docx = await generateDocx(report);
      const docxDownload = { url: URL.createObjectURL(docx.blob), name: docx.filename };
      setDownloads({ docx: docxDownload });
      let pdfResult: Awaited<ReturnType<typeof generatePdf>> | null = null;
      try {
        pdfResult = await generatePdf(report);
        setDownloads({ docx: docxDownload, pdf: { url: URL.createObjectURL(pdfResult.blob), name: pdfResult.filename } });
      } catch {
        pdfResult = null;
      }
      const upload = new FormData();
      upload.append("id", reservation.id);
      upload.append("metadata", JSON.stringify({ ...storageMetadata, cabecalho: report.cabecalho }));
      upload.append("docx", docx.blob, docx.filename);
      if (pdfResult) upload.append("pdf", pdfResult.blob, pdfResult.filename);
      const uploadResponse = await contractFetch("/api/reports", { method: "PUT", body: upload });
      if (!uploadResponse.ok) throw new Error("Os arquivos foram gerados, mas não foi possível salvá-los no histórico.");
      await deleteDraft('engineering-active');
      setMessage({ type: "success", text: pdfResult ? `Relatório ${reservation.reportNumber} gerado e armazenado com DOCX e PDF.` : `Relatório ${reservation.reportNumber} gerado e armazenado em DOCX.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível gerar o relatório." });
    } finally {
      setGenerating(false);
    }
  };

  const goNext = () => setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  const goBack = () => setActiveStep((step) => Math.max(step - 1, 0));

  return (
    <main className="app-shell plangecon-report">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">RI</div>
        <div className="brand-copy">
          <strong>Relatório de Inspeção</strong>
          <span>Engenharia & Qualidade</span>
        </div>
        <nav className="main-tabs" aria-label="Áreas do sistema"><a href="/">SGQ</a>
          <a href="/inspecoes">Indicadores</a>
          <a className="active" href="/novo-relatorio">Novo relatório</a>
          <a href="/relatorios">Banco de Relatórios</a>
        </nav>
        <div className="privacy-note"><span className="status-dot" /> {draftSaved ? 'Rascunho protegido no aparelho' : 'Processamento local e privado'}</div>
      </header>

      <div className="workspace">
        <aside className="stepper" aria-label="Etapas do relatório">
          <div className="stepper-intro">
            <span>Progresso</span>
            <strong>{activeStep + 1} de {steps.length}</strong>
          </div>
          <nav>
            {steps.map((step, index) => (
              <button key={step} type="button" className={index === activeStep ? "step active" : index < activeStep ? "step done" : "step"} onClick={() => setActiveStep(index)}>
                <span>{index < activeStep ? "✓" : String(index + 1).padStart(2, "0")}</span>
                {step}
              </button>
            ))}
          </nav>
          <div className="template-card">
            <span>Modelo oficial</span>
            <strong>RI-MEC-002-26.docx</strong>
            <small>Cabeçalho, logotipos e estilos preservados no DOCX.</small>
          </div>
        </aside>

        <section className="form-surface">
          <div className="mobile-progress"><span style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} /></div>
          {draftSaved && !queuedOffline && <div className="offline-draft-note">✓ Preenchimento salvo automaticamente neste aparelho</div>}

          {activeStep === 0 && (
            <div className="panel">
              <SectionTitle eyebrow="Etapa 01" title="Dados do cabeçalho" description="Informações que aparecem no quadro superior de todas as páginas." />
              <div className="form-grid two">
                <Field label="Título superior do projeto"><input value={data.cabecalho.tituloSuperior} onChange={(e) => updateHeader("tituloSuperior", e.target.value)} /></Field>
                <Field label="Classificação">
                  <select value={classificationChoice} onChange={(e) => setClassificationChoice(e.target.value)}><option>INTERNO</option><option>CONFIDENCIAL</option><option>PÚBLICO</option><option>Outro</option></select>
                  {classificationChoice === "Outro" && <input className="conditional" placeholder="Informe a classificação" value={classificationOther} onChange={(e) => setClassificationOther(e.target.value)} />}
                </Field>
                <Field label="Número Vale"><input value={data.cabecalho.numeroVale} onChange={(e) => updateHeader("numeroVale", e.target.value)} /></Field>
                <Field label="Engenheiro, inspetor ou gestor" required>
                  <select value={data.cabecalho.emissor} onChange={(e) => { updateHeader("emissor", e.target.value); updateHeader("numeroContratada", ""); }}>
                    <option value="">Selecione o responsável</option>
                    {reportIssuers.map((issuer) => <option key={issuer.key} value={issuer.key}>{issuer.name} - {issuer.role}</option>)}
                  </select>
                </Field>
                <Field label="Número do relatório" hint="Reservado ao emitir o relatório."><input value={data.cabecalho.numeroContratada || numberPreview} readOnly aria-readonly="true" /></Field>
                <Field label="Número sequencial manual (opcional)" hint="Ex.: 25. O próximo relatório continuará em 26. Deixe vazio para numeração automática."><input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={data.cabecalho.manualSequence ?? ''} onChange={(e) => updateHeader('manualSequence', e.target.value)} /></Field>
                <Field label="Revisão" required><input value={data.cabecalho.revisao} onChange={(e) => updateHeader("revisao", e.target.value)} /></Field>
                <SearchableField label="Fase do projeto">
                  <SearchableSelect ariaLabel="Fase do projeto" value={data.cabecalho.faseProjeto} options={projectPhases.map((phase) => ({ value: phase, label: phase }))} onChange={(value) => updateHeader("faseProjeto", value)} searchPlaceholder="Pesquisar fase do projeto…" />
                </SearchableField>
                <SearchableField label="Área do projeto">
                  <SearchableSelect ariaLabel="Área do projeto" value={data.cabecalho.areaProjeto} options={projectAreas.map((area) => ({ value: area.label, label: area.label }))} onChange={updateProjectArea} searchPlaceholder="Pesquisar área do projeto…" />
                </SearchableField>
                <SearchableField label="Subárea">
                  <SearchableSelect ariaLabel="Subárea" value={data.cabecalho.subarea} options={selectedArea.subareas.map((subarea) => ({ value: subarea.label, label: subarea.label }))} onChange={(value) => updateHeader("subarea", value)} searchPlaceholder="Pesquisar subárea…" />
                </SearchableField>
                <SearchableField label="Nome do projeto">
                  <SearchableSelect ariaLabel="Nome do projeto" value={projectNames.includes(data.cabecalho.nomeProjeto) ? data.cabecalho.nomeProjeto : "__new__"} options={[...projectNames.map((project) => ({ value: project, label: project })), { value: "__new__", label: "+ Cadastrar novo projeto" }]} onChange={(value) => updateHeader("nomeProjeto", value === "__new__" ? "" : value)} searchPlaceholder="Pesquisar nome do projeto…" />
                  {!projectNames.includes(data.cabecalho.nomeProjeto) && <input className="conditional" placeholder="Digite o nome do novo projeto" value={data.cabecalho.nomeProjeto} onChange={(e) => updateHeader("nomeProjeto", e.target.value)} />}
                </SearchableField>
                <SearchableField label="LS / Descrição da LS">
                  <SearchableSelect ariaLabel="LS e descrição da LS" value={lsOptions.includes(data.cabecalho.pepLs) ? data.cabecalho.pepLs : "__new__"} options={[...lsOptions.map((ls) => ({ value: ls, label: ls })), { value: "__new__", label: "+ Cadastrar novo LS" }]} onChange={(value) => updateHeader("pepLs", value === "__new__" ? "" : value)} searchPlaceholder="Pesquisar LS ou descrição…" />
                  {!lsOptions.includes(data.cabecalho.pepLs) && <input className="conditional" placeholder="Digite o LS e sua descrição" value={data.cabecalho.pepLs} onChange={(e) => updateHeader("pepLs", e.target.value)} />}
                </SearchableField>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="panel">
              <SectionTitle eyebrow="Etapa 02" title="Revisões" description="Preencha as linhas da tabela de revisões existente no modelo." />
              <div className="stack">
                {data.revisoes.map((revision, index) => (
                  <article className="record-card" key={revision.id}>
                    <div className="record-header"><strong>Revisão {String(index + 1).padStart(2, "0")}</strong>{data.revisoes.length > 1 && <button type="button" className="text-button danger" onClick={() => setData((current) => ({ ...current, revisoes: current.revisoes.filter((item) => item.id !== revision.id) }))}>Remover</button>}</div>
                    <div className="form-grid four">
                      <Field label="Revisão"><input value={revision.revisao} onChange={(e) => updateRevision(revision.id, "revisao", e.target.value)} /></Field>
                      <Field label="TE"><input value={revision.te} onChange={(e) => updateRevision(revision.id, "te", e.target.value.toUpperCase())} /></Field>
                      <Field label="Descrição"><input value={revision.descricao} onChange={(e) => updateRevision(revision.id, "descricao", e.target.value)} /></Field>
                      <Field label="Por"><select value={revision.por} onChange={(e) => updateRevision(revision.id, "por", e.target.value)}><option value="">Selecione</option>{reportIssuers.map((issuer) => <option key={issuer.key} value={issuer.name}>{issuer.name} - {issuer.role}</option>)}</select></Field>
                      <Field label="Verificador"><select value={revision.verificador} onChange={(e) => updateRevision(revision.id, "verificador", e.target.value)}><option value="">Selecione</option>{reportIssuers.map((issuer) => <option key={issuer.key} value={issuer.name}>{issuer.name} - {issuer.role}</option>)}</select></Field>
                      <Field label="Aprovador"><select value={revision.aprovador} onChange={(e) => updateRevision(revision.id, "aprovador", e.target.value)}><option value="">Selecione</option>{reportIssuers.map((issuer) => <option key={issuer.key} value={issuer.name}>{issuer.name} - {issuer.role}</option>)}</select></Field>
                      <Field label="Autorizador"><select value={revision.autorizador} onChange={(e) => updateRevision(revision.id, "autorizador", e.target.value)}><option value="">Selecione</option>{reportIssuers.map((issuer) => <option key={issuer.key} value={issuer.name}>{issuer.name} - {issuer.role}</option>)}</select></Field>
                      <Field label="Data"><input type="date" value={revision.data} onChange={(e) => updateRevision(revision.id, "data", e.target.value)} /></Field>
                    </div>
                  </article>
                ))}
                <button type="button" className="secondary-button add-button" onClick={() => setData((current) => ({ ...current, revisoes: [...current.revisoes, emptyRevision()] }))}>+ Adicionar revisão</button>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="panel">
              <SectionTitle eyebrow="Etapa 03" title="Identificação da inspeção" description="Registre quando, como e onde a atividade foi realizada." />
              <div className="form-grid two">
                <Field label="Data" required><input type="date" value={data.identificacao.data} onChange={(e) => setData((current) => ({ ...current, identificacao: { ...current.identificacao, data: e.target.value } }))} /></Field>
                <Field label="Tipo de atividade" required>
                  <select value={activityChoice} onChange={(e) => setActivityChoice(e.target.value)}><option>Inspeção Técnica de Montagem</option><option>Inspeção de Qualidade</option><option>Vistoria de Campo</option><option>Outro</option></select>
                  {activityChoice === "Outro" && <input className="conditional" placeholder="Informe o tipo de atividade" value={activityOther} onChange={(e) => setActivityOther(e.target.value)} />}
                </Field>
                <Field label="Área da inspeção" required><input value={data.identificacao.areaInspecao} onChange={(e) => setData((current) => ({ ...current, identificacao: { ...current.identificacao, areaInspecao: e.target.value } }))} /></Field>
                <Field label="Disciplina" required>
                  <select value={data.identificacao.disciplina} onChange={(e) => setData((current) => ({ ...current, identificacao: { ...current.identificacao, disciplina: e.target.value } }))}>
                    <option value="">Selecione a disciplina</option><option>Elétrica</option><option>Mecânica</option><option>Civil</option><option>Automação</option><option>Qualidade</option><option>Instrumentação</option><option>Estrutural</option><option>Tubulação</option><option>Segurança do Trabalho</option><option>Multidisciplinar</option><option>Outra</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="panel">
              <SectionTitle eyebrow="Etapa 04" title="Objetivo" description="Explique de forma direta a finalidade da inspeção." />
              <Field label="Objetivo da inspeção" required><textarea rows={10} placeholder="Descreva o que deve ser verificado e por quê…" value={data.objetivo} onChange={(e) => setData((current) => ({ ...current, objetivo: e.target.value }))} /></Field>
            </div>
          )}

          {activeStep === 4 && (
            <div className="panel">
              <SectionTitle eyebrow="Etapa 05" title="Escopo da inspeção" description="Digite um item por linha. Cada linha será inserida separadamente no relatório." />
              <Field label="Itens do escopo" required hint="Exemplo: Parafusos da sobrebase"><textarea rows={12} placeholder={"Parafusos da sobrebase\nParafusos do mancal\nCondições de montagem"} value={data.escopo} onChange={(e) => setData((current) => ({ ...current, escopo: e.target.value }))} /></Field>
            </div>
          )}

          {activeStep === 5 && (
            <div className="panel wide-panel">
              <SectionTitle eyebrow="Etapa 06" title="Situações identificadas" description="Cada ocorrência mantém suas próprias informações, fotos e legendas." />
              <div className="stack situations-stack">
                {data.situacoes.map((situation, index) => (
                  <article className="situation-card" key={situation.id}>
                    <div className="situation-number"><span>{String(index + 1).padStart(2, "0")}</span><div><strong>Situação {String(index + 1).padStart(2, "0")}</strong><small>{situation.fotos.length} foto{situation.fotos.length === 1 ? "" : "s"}</small></div>{data.situacoes.length > 1 && <button type="button" className="text-button danger" onClick={() => setData((current) => ({ ...current, situacoes: current.situacoes.filter((item) => item.id !== situation.id) }))}>Remover</button>}</div>
                    <div className="form-grid two">
                      <div className="project-reference-grid">
                        <div className="project-reference-heading"><span>REFERÊNCIA DO PROJETO</span><p>Dados obrigatórios para rastreabilidade da situação.</p></div>
                        <Field label="Número da SE" required><input placeholder="Ex.: SE 2020KS-001" value={situation.numeroSe} onChange={(e) => updateSituation(situation.id, "numeroSe", e.target.value)} /></Field>
                        <Field label="Número do projeto" required><input placeholder="Ex.: 2012KS-S-84591" value={situation.numeroProjeto} onChange={(e) => updateSituation(situation.id, "numeroProjeto", e.target.value)} /></Field>
                        <Field label="Revisão" required><input placeholder="Ex.: Rev. 0" value={situation.revisaoProjeto} onChange={(e) => updateSituation(situation.id, "revisaoProjeto", e.target.value)} /></Field>
                        <Field label="Título do projeto" required><input placeholder="Título conforme documento de engenharia" value={situation.tituloProjeto} onChange={(e) => updateSituation(situation.id, "tituloProjeto", e.target.value)} /></Field>
                      </div>
                      <Field label="Título da situação" required><input value={situation.titulo} onChange={(e) => updateSituation(situation.id, "titulo", e.target.value)} /></Field>
                      <Field label="Classificação da situação" required>
                        <select value={situation.tipoRegistro} onChange={(e) => updateSituation(situation.id, "tipoRegistro", e.target.value)}><option value="">Selecione</option><option value="SIT">SIT</option><option value="RNC">RNC</option><option value="NAP">NAP</option></select>
                      </Field>
                      <Field label="Criticidade" required>
                        <select value={situation.criticidade} onChange={(e) => updateSituation(situation.id, "criticidade", e.target.value)}><option value="">Selecione</option><option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option></select>
                      </Field>
                      <Field label="Descrição técnica" required><textarea rows={4} value={situation.descricaoTecnica} onChange={(e) => updateSituation(situation.id, "descricaoTecnica", e.target.value)} /></Field>
                      <Field label="Impacto"><textarea rows={4} value={situation.impacto} onChange={(e) => updateSituation(situation.id, "impacto", e.target.value)} /></Field>
                      <Field label="Recomendação"><textarea rows={4} value={situation.recomendacao} onChange={(e) => updateSituation(situation.id, "recomendacao", e.target.value)} /></Field>
                      <Field label="Gerou retrabalho?" required>
                        <select value={situation.gerouRetrabalho} onChange={(e) => { updateSituation(situation.id, "gerouRetrabalho", e.target.value); if (e.target.value !== "Sim") { updateSituation(situation.id, "descricaoRetrabalho", ""); updateSituation(situation.id, "horasRetrabalho", ""); } }}><option value="">Selecione</option><option value="Não">Não</option><option value="Sim">Sim</option></select>
                      </Field>
                      {situation.gerouRetrabalho === "Sim" && <Field label="Descrição do retrabalho" required><textarea rows={4} placeholder="Descreva o serviço que precisou ser refeito" value={situation.descricaoRetrabalho} onChange={(e) => updateSituation(situation.id, "descricaoRetrabalho", e.target.value)} /></Field>}
                      {situation.gerouRetrabalho === "Sim" && <Field label="Horas de retrabalho" required hint="Informe o total de horas empregadas no retrabalho."><input type="number" min="0.5" step="0.5" placeholder="Ex.: 4,5 horas" value={situation.horasRetrabalho} onChange={(e) => updateSituation(situation.id, "horasRetrabalho", e.target.value)} /></Field>}
                    </div>
                    <div className="upload-zone">
                      <input id={`photos-${situation.id}`} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple onChange={(e) => { addPhotos(situation.id, e.target.files); e.currentTarget.value = ""; }} />
                      <label htmlFor={`photos-${situation.id}`}><strong>Adicionar fotos desta situação</strong><span>JPG, JPEG, PNG ou WEBP · várias fotos permitidas</span></label>
                    </div>
                    {situation.fotos.length > 0 && <div className="photo-grid">
                      {situation.fotos.map((photo, photoIndex) => (
                        <div className="photo-item" key={photo.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.preview} alt={`Foto ${photoIndex + 1} da Situação ${index + 1}`} />
                          <div><span>Foto {photoIndex + 1}</span><input aria-label={`Legenda da foto ${photoIndex + 1}`} placeholder="Legenda da foto" value={photo.legenda} onChange={(e) => setData((current) => ({ ...current, situacoes: current.situacoes.map((item) => item.id === situation.id ? { ...item, fotos: item.fotos.map((candidate) => candidate.id === photo.id ? { ...candidate, legenda: e.target.value } : candidate) } : item) }))} /><button type="button" className="text-button danger" onClick={() => setData((current) => ({ ...current, situacoes: current.situacoes.map((item) => item.id === situation.id ? { ...item, fotos: item.fotos.filter((candidate) => candidate.id !== photo.id) } : item) }))}>Excluir</button></div>
                        </div>
                      ))}
                    </div>}
                  </article>
                ))}
                <button type="button" className="primary-button add-situation" onClick={() => setData((current) => ({ ...current, situacoes: [...current.situacoes, emptySituation()] }))}>+ Adicionar situação</button>
              </div>
            </div>
          )}

          {activeStep === 6 && (
            <div className="panel">
              <SectionTitle eyebrow="Etapa 07" title="Análise técnica geral" description="Consolide os aspectos técnicos observados em todas as situações." />
              <Field label="Análise técnica geral" required><textarea rows={12} value={data.analiseTecnica} onChange={(e) => setData((current) => ({ ...current, analiseTecnica: e.target.value }))} /></Field>
            </div>
          )}

          {activeStep === 7 && (
            <div className="panel">
              <SectionTitle eyebrow="Etapa 08" title="Conclusão" description="Registre o parecer final e as condições para continuidade dos serviços." />
              <Field label="Conclusão" required><textarea rows={12} value={data.conclusao} onChange={(e) => setData((current) => ({ ...current, conclusao: e.target.value }))} /></Field>
            </div>
          )}

          {activeStep === 8 && (
            <div className="panel generation-panel">
              <SectionTitle eyebrow="Etapa 09" title="Geração do relatório" description="Revise o resumo e gere os arquivos finais." />
              <div className="summary-grid">
                <div><span>Número do relatório</span><strong>{data.cabecalho.numeroContratada || "Não informado"}</strong></div>
                <div><span>Situações</span><strong>{data.situacoes.length}</strong></div>
                <div><span>Fotos</span><strong>{photoCount}</strong></div>
                <div><span>Revisão</span><strong>{data.cabecalho.revisao || "—"}</strong></div>
              </div>
              <div className="generation-note"><strong>Sobre os arquivos</strong><p>O DOCX é produzido a partir do modelo oficial e configurado para atualizar sumário e paginação ao abrir no Word. O PDF é montado no navegador e pode apresentar pequenas diferenças de paginação.</p></div>
              {message && <div className={`message ${message.type}`} role="status">{message.text}</div>}
              <button type="button" className="generate-button" disabled={generating || queuedOffline} onClick={generate}>{generating ? "Gerando relatório…" : syncedOffline ? "Relatório sincronizado" : queuedOffline ? "Aguardando sincronização" : "Gerar ou guardar relatório"}</button>
              {(downloads.docx || downloads.pdf) && <div className="download-row">
                {downloads.docx && <a className="download-button" href={downloads.docx.url} download={downloads.docx.name}>Baixar DOCX</a>}
                {downloads.pdf && <a className="download-button secondary" href={downloads.pdf.url} download={downloads.pdf.name}>Baixar PDF</a>}
              </div>}
              <p className="security-copy">A geração acontece no navegador. Após a emissão, os dados e arquivos ficam armazenados no histórico protegido do site.</p>
            </div>
          )}

          <footer className="form-footer">
            <button type="button" className="secondary-button" onClick={goBack} disabled={activeStep === 0}>Voltar</button>
            <span>Etapa {activeStep + 1} de {steps.length}</span>
            {activeStep < steps.length - 1 ? <button type="button" className="primary-button" onClick={goNext}>Continuar</button> : <button type="button" className="primary-button" onClick={() => setActiveStep(0)}>Revisar do início</button>}
          </footer>
        </section>
      </div>

    </main>
  );
}
