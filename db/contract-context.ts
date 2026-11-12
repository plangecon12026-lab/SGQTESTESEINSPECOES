import { AsyncLocalStorage } from 'node:async_hooks';
import { CompatDatabase } from './d1-compat';
import { scopeSQL, contractPrefix, CONTRACT_ID } from './contract-sql.mjs';

// O contrato vem do parâmetro ?contrato= da URL. O proxy (proxy.ts) valida o formato e
// repassa no cabeçalho interno x-sgq-contrato; aqui confirmamos que ele existe no cadastro.
export const CONTRACT_HEADER = 'x-sgq-contrato';
export const contractContext = new AsyncLocalStorage<string>();

const known = new Map<string, number>();
async function assertKnown(id: string) {
  if (id === 's11d') return;
  const cached = known.get(id);
  if (cached && cached > Date.now()) return;
  const row = await globalDb.prepare('SELECT id FROM contracts WHERE id=?').bind(id).first();
  if (!row) throw new ContractError('Contrato não encontrado.');
  known.set(id, Date.now() + 5 * 60_000);
}
export class ContractError extends Error {}

export async function currentContract(): Promise<string> {
  const stored = contractContext.getStore();
  if (stored) return stored;
  try {
    const { headers } = await import('next/headers');
    const id = (await headers()).get(CONTRACT_HEADER) || 's11d';
    return CONTRACT_ID.test(id) ? id : 's11d';
  } catch { return 's11d'; }
}

/** Banco global (cadastro de contratos, usuários, sessões). */
export const globalDb = new CompatDatabase();

/** Banco do contrato da requisição atual: tabelas de negócio são reescritas para o prefixo do contrato. */
export function contractDb() {
  return new CompatDatabase(async query => {
    const id = await currentContract();
    await assertKnown(id);
    return scopeSQL(query, id);
  });
}
export async function contractFileKey(key: string) { const id = await currentContract(); return id === 's11d' ? key : `contracts/${id}/${key}`; }
export { contractPrefix };
