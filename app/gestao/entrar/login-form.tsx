'use client';
import {contractURL,contractFetch} from '../../contract-client';

import { useState, type FormEvent } from 'react';

export default function LoginForm() {
  const [email,setEmail] = useState(''), [password,setPassword] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await contractFetch('/api/management-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'Não foi possível entrar.');
      const requested = new URLSearchParams(location.search).get('voltar') || '/cronograma';
      location.assign(requested==='contratos'?'/':contractURL(['/','/novo-relatorio','/soldadores','/cronograma','/inspecoes','/relatorios','/gestao/acessos'].includes(requested)?requested:'/cronograma'));
    } catch(e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.'); setBusy(false); }
  }
  return <form onSubmit={e=>void submit(e)} className="management-login-form"><label>E-mail autorizado<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@empresa.com" /></label><label>Senha<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>{error&&<p className="management-error" role="alert">{error}</p>}<button disabled={busy} className="schedule-primary">{busy?'Entrando…':'Entrar na Gestão'}</button></form>;
}
