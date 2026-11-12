import { globalDb } from '../../../db/contract-context';
import { env } from '../../../db/platform';

export const dynamic = 'force-dynamic';

// Verificação de funcionamento: banco e armazenamento. Não expõe dados.
export async function GET() {
  const checks: Record<string, boolean> = { banco: false, arquivos: false };
  try { await globalDb.prepare('SELECT 1 AS ok').first(); checks.banco = true; } catch (e) { console.error('health banco', e); }
  try {
    const key = 'health/probe.txt', stamp = new Date().toISOString();
    await env.BUCKET.put(key, stamp, { httpMetadata: { contentType: 'text/plain' } });
    const back = await env.BUCKET.get(key);
    checks.arquivos = !!back && new TextDecoder().decode(back.body as ArrayBuffer) === stamp;
  } catch (e) { console.error('health arquivos', e); }
  const ok = checks.banco && checks.arquivos;
  return Response.json({ ok, ...checks }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
