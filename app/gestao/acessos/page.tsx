import PlatformShell from '../../platform-shell';
import AccessManager from './access-manager';
import { requireManagementPage } from '../../management-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default async function AccessPage() {
  const identity = await requireManagementPage('/gestao/acessos');
  if (!identity.owner) redirect('/gestao/sem-acesso');
  return <PlatformShell current="access" owner><AccessManager /></PlatformShell>;
}
