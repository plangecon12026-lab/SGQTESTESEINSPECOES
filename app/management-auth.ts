import {currentContract} from '../db/contract-context';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sgqDb } from '../db/sgq';

export const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'smaiavitorvinicius@gmail.com').trim().toLowerCase();
/** Tela de campo aberta sem login (comportamento do sistema original). Padrão: exige login. */
export const FIELD_PUBLIC = process.env.SGQ_CAMPO_PUBLICO === 'true';
export const COOKIE_NAME = 'sgq_gestao';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
const ITERATIONS = 100_000;
export const normalizeManagementEmail = (value: string) => value.trim().toLowerCase();

function encode(bytes: Uint8Array): string {
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function derived(input: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', input as BufferSource, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const first = await derived(new TextEncoder().encode(password), salt, ITERATIONS);
  const second = await derived(first, salt, ITERATIONS);
  return `v2:${ITERATIONS}:${encode(salt)}:${encode(second)}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'v2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations !== ITERATIONS) return false;
  try {
    const salt = decode(parts[2]), expected = decode(parts[3]);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const first = await derived(new TextEncoder().encode(password), salt, iterations);
    const actual = await derived(first, salt, iterations);
    let difference = 0; for (let i = 0; i < 32; i++) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch { return false; }
}
export async function hashToken(token: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  return encode(digest);
}
export function newSessionToken(): string { return encode(crypto.getRandomValues(new Uint8Array(32))); }
export function sessionCookie(token: string, maxAge = SESSION_SECONDS): string {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
export function validOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !!origin && origin === new URL(request.url).origin && request.headers.get('Content-Type')?.startsWith('application/json') === true;
}

export async function managementIdentity() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || token.length > 100) return null;
  const row = await sgqDb().prepare(`SELECT u.email,u.name,u.role FROM management_sessions s
    JOIN management_users u ON u.email=s.email WHERE s.token_hash=? AND s.expires_at>? AND u.password_hash<>''`).bind(await hashToken(token), new Date().toISOString()).first<{ email: string; name: string; role: string }>();
  if (!row) return null;
  return { email: row.email, displayName: row.name || row.email, owner: row.email === OWNER_EMAIL && row.role === 'owner' };
}

export async function requireManagementPage(path: string) {
  const identity = await managementIdentity();
  if (!identity) redirect(`/gestao/entrar?voltar=${encodeURIComponent(path)}&contrato=${await currentContract()}`);
  return identity;
}

export async function managementApiGuard(): Promise<Response | null> {
  if (await managementIdentity()) return null;
  return Response.json({ error: 'Entre com seu e-mail e senha para acessar a Gestão.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}

export async function ownerApiGuard(): Promise<Response | null> {
  if ((await managementIdentity())?.owner) return null;
  return Response.json({ error: 'Somente o responsável pelo SGQ pode liberar acessos.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}

/** Páginas de campo: exigem login, salvo se SGQ_CAMPO_PUBLICO=true. */
export async function requireFieldPage(path: string) {
  if (FIELD_PUBLIC) return await managementIdentity();
  return await requireManagementPage(path);
}

/** APIs de campo: exigem login, salvo se SGQ_CAMPO_PUBLICO=true. */
export async function fieldApiGuard(): Promise<Response | null> {
  if (FIELD_PUBLIC) return null;
  return managementApiGuard();
}
