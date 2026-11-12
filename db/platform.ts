import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { globalDb } from './contract-context';

// Substitui os bindings do Cloudflare: env.DB (D1) e env.BUCKET (R2 → Supabase Storage).
type PutOptions = { httpMetadata?: { contentType?: string } };
type StoredObject = { body: ReadableStream | ArrayBuffer; httpMetadata: { contentType?: string } };

let client: SupabaseClient | undefined;
function storage() {
  if (!client) {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas.');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client.storage.from(process.env.SUPABASE_BUCKET || 'sgq-arquivos');
}

// Desenvolvimento local sem Supabase: STORAGE_LOCAL_DIR=.storage guarda os arquivos em disco.
const localDir = process.env.STORAGE_LOCAL_DIR;
async function localPath(key: string) {
  const path = await import('node:path');
  const full = path.resolve(localDir!, key);
  if (!full.startsWith(path.resolve(localDir!) + path.sep)) throw new Error('Caminho inválido.');
  return full;
}
const localBucket = {
  async put(key: string, value: BodyInit, options?: PutOptions) {
    const fs = await import('node:fs/promises'), path = await import('node:path'), file = await localPath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(await new Response(value).arrayBuffer()));
    await fs.writeFile(file + '.type', options?.httpMetadata?.contentType || '');
  },
  async get(key: string): Promise<StoredObject | null> {
    const fs = await import('node:fs/promises'), file = await localPath(key);
    try { const bytes = await fs.readFile(file); const type = await fs.readFile(file + '.type', 'utf8').catch(() => '');
      return { body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, httpMetadata: { contentType: type || undefined } }; }
    catch { return null; }
  },
};

const supabaseBucket = {
  async put(key: string, value: BodyInit, options?: PutOptions) {
    const bytes = await new Response(value).arrayBuffer();
    const { error } = await storage().upload(key, bytes, { contentType: options?.httpMetadata?.contentType, upsert: true });
    if (error) throw error;
  },
  async get(key: string): Promise<StoredObject | null> {
    const { data, error } = await storage().download(key);
    if (error || !data) {
      const status = (error as { status?: number; statusCode?: string } | null);
      if (!error || status?.status === 400 || status?.status === 404 || status?.statusCode === '404' || /not.?found/i.test(error.message)) return null;
      throw error;
    }
    return { body: await data.arrayBuffer(), httpMetadata: { contentType: data.type || undefined } };
  },
};

export const env = { DB: globalDb, BUCKET: localDir ? localBucket : supabaseBucket };
