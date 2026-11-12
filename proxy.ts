import { NextResponse, type NextRequest } from 'next/server';
import { CONTRACT_HEADER, globalDb } from './db/contract-context';
import { CONTRACT_ID } from './db/contract-sql.mjs';

// Equivale ao worker/index.ts do sistema original: valida o contrato da URL e o
// repassa ao servidor num cabeçalho interno (nunca aceito do navegador).
const GLOBAL_APIS = ['/api/health', '/api/contracts', '/api/management-session', '/api/management-users'];
const known = new Map<string, number>();

async function exists(id: string) {
  if (id === 's11d') return true;
  if ((known.get(id) ?? 0) > Date.now()) return true;
  const row = await globalDb.prepare('SELECT id FROM contracts WHERE id=?').bind(id).first();
  if (row) known.set(id, Date.now() + 5 * 60_000);
  return !!row;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const requested = url.searchParams.get('contrato');
  const businessAPI = url.pathname.startsWith('/api/') && !GLOBAL_APIS.includes(url.pathname);
  if (businessAPI && !requested && !(url.pathname === '/api/sgq/photo' && request.method === 'GET'))
    return NextResponse.json({ error: 'Selecione um contrato antes de continuar.' }, { status: 400 });
  if (requested) {
    if (!CONTRACT_ID.test(requested)) return NextResponse.json({ error: 'Contrato inválido.' }, { status: 400 });
    try {
      if (!(await exists(requested))) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: 'Banco de dados indisponível. Tente novamente.' }, { status: 503 });
    }
  }
  const headers = new Headers(request.headers);
  headers.set(CONTRACT_HEADER, requested || 's11d');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons/|.*\\.(?:png|jpe?g|svg|webmanifest|xlsx|docx|js)$).*)'],
};
