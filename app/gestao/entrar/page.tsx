import {currentContract} from '../../../db/contract-context';
import { managementIdentity } from '../../management-auth';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';

export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  if (await managementIdentity()) redirect('/cronograma?contrato='+await currentContract());
  return <main className="management-access"><div className="management-card"><a href="/" className="management-mark">SGQ ✓</a><span className="schedule-eyebrow">GESTÃO · ACESSO RESTRITO</span><h1>Entre na área Gestão</h1><p>Use o e-mail e a senha que o responsável pelo SGQ cadastrou para você.</p><LoginForm /><div className="management-actions"><a href="/">Voltar ao SGQ</a></div></div></main>;
}
