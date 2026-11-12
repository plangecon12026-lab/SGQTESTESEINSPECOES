"use client";
import {contractURL,contractFetch} from './contract-client';


import { useState, type ReactNode } from "react";
import { kinds } from "./sgq-model";

export default function PlatformShell({ children, current, owner = false }: { children: ReactNode; current: "engineering" | "archive" | "indicators" | "schedule" | "welders" | "access"; owner?: boolean }) {
  const [mobile, setMobile] = useState(false);
  async function signOut() { await contractFetch('/api/management-session',{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'}); location.assign(contractURL('/gestao/entrar')); }
  return <div className="sgq-app sgq-platform-shell">
    <aside className={`sgq-sidebar ${mobile ? "mobile-open" : ""}`}>
      <a className="sgq-brand" href="/"><div>SGQ<span>✓</span></div><p>PLANGECON<small>TESTES E INSPEÇÕES</small></p></a>
      <div className="sgq-nav-label">ÁREA DE TRABALHO</div>
      <nav>
        <a href="/"><span className="sgq-icon">▦</span>Visão geral</a>
        <a href="/?tipo=historico#historico"><span className="sgq-icon">▤</span>Histórico unificado</a>
        <div className="sgq-nav-label">TIPOS DE INSPEÇÃO</div>
        {kinds.map((kind) => <a href={`/?tipo=${kind.id}`} key={kind.id}><span className="sgq-icon">{kind.icon}</span>{kind.short}</a>)}
        <a className={current === "engineering" ? "active" : ""} href="/novo-relatorio"><span className="sgq-icon">◈</span>Inspeção de engenharia</a>
        <div className="sgq-nav-label">GESTÃO</div>
        <a className={current === "schedule" ? "active" : ""} href="/cronograma"><span className="sgq-icon">▦</span>Cronograma de testes</a>
        <a className={current === "welders" ? "active" : ""} href="/soldadores"><span className="sgq-icon">♟</span>Qualificação de soldadores</a>
        <a className={current === "indicators" ? "active" : ""} href="/inspecoes"><span className="sgq-icon">▥</span>Indicadores e ocorrências</a>
        <a className={current === "archive" ? "active" : ""} href="/relatorios"><span className="sgq-icon">▤</span>Banco técnico</a>
        {owner && <a className={current === 'access' ? 'active' : ''} href="/gestao/acessos"><span className="sgq-icon">♙</span>Usuários e acessos</a>}
        {current !== 'engineering' && <button type="button" onClick={()=>void signOut()}><span className="sgq-icon">↪</span>Sair da Gestão</button>}
      </nav>
      <div className="sgq-sidebar-bottom"><img className="plangecon-logo" src="/logo-2.png" alt="Plangecon"/><div>Sistema de Gestão da Qualidade<small>Engenharia · Campo · Controle</small></div></div>
    </aside>
    <div className="sgq-workspace">
      <header className="sgq-topbar"><button className="sgq-menu" onClick={() => setMobile(!mobile)} aria-label="Abrir menu">☰</button><span className="sgq-header-mark" aria-hidden="true">SGQ<span> / </span></span><div className="sgq-breadcrumb">SGQ <span>/</span> <b>{current === "engineering" ? "Inspeção de engenharia" : current === "archive" ? "Banco técnico" : current === "schedule" ? "Cronograma de testes" : current === "welders" ? "Qualificação de soldadores" : current === 'access' ? 'Usuários e acessos' : "Indicadores e ocorrências"}</b></div><div className="sgq-top-date">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div><div className="sgq-avatar">Q</div></header>
      <div className="sgq-legacy-content">{children}</div>
    </div>
    <nav className="sgq-mobile-nav" aria-label="Navegação principal no celular"><a href="/"><span>⌂</span>Início</a><a href="/?tipo=historico#historico"><span>▤</span>Histórico</a><a className={current === "engineering" ? "create active" : "create"} href="/#tipos"><span>＋</span>Novo</a><a className={current === "welders" ? "active" : ""} href="/soldadores"><span>♟</span>Soldadores</a><a className={current === "schedule" ? "active" : ""} href="/cronograma"><span>▦</span>Cronograma</a></nav>
  </div>;
}
