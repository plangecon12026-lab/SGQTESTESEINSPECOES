import { cookies } from 'next/headers';
import { sgqDb } from '../../../db/sgq';
import { COOKIE_NAME, hashToken, newSessionToken, normalizeManagementEmail, sessionCookie, validOrigin, verifyPassword } from '../../management-auth';

const invalid = () => Response.json({ error: 'E-mail ou senha inválidos, ou acesso ainda não liberado.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (!validOrigin(request)) return Response.json({ error: 'Requisição inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { email?: unknown; password?: unknown };
  const email = typeof body.email === 'string' ? normalizeManagementEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 256) return invalid();
  const db = sgqDb(), now = new Date().toISOString();
  const attempt = await db.prepare('SELECT count,blocked_until FROM management_login_attempts WHERE email=?').bind(email).first<{ count: number; blocked_until: string }>();
  if (attempt?.blocked_until && attempt.blocked_until > now) return Response.json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }, { status: 429 });
  const user = await db.prepare('SELECT email,password_hash,role FROM management_users WHERE email=?').bind(email).first<{ email: string; password_hash: string; role: string }>();
  const stored = user?.password_hash || '';
  const correct = stored ? await verifyPassword(password, stored) : false;
  if (!correct) {
    const blockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db.prepare(`INSERT INTO management_login_attempts (email,count,blocked_until) VALUES (?,1,'')
      ON CONFLICT(email) DO UPDATE SET count=CASE WHEN management_login_attempts.blocked_until<? THEN 1 ELSE management_login_attempts.count+1 END,
      blocked_until=CASE WHEN management_login_attempts.blocked_until<? THEN '' WHEN management_login_attempts.count>=9 THEN ? ELSE management_login_attempts.blocked_until END`).bind(email,now,now,blockedUntil).run();
    return invalid();
  }
  await db.prepare('DELETE FROM management_login_attempts WHERE email=?').bind(email).run();
  const token = newSessionToken(), expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO management_sessions (token_hash,email,expires_at) VALUES (?,?,?)').bind(await hashToken(token),email,expiresAt).run();
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  if (!validOrigin(request)) return Response.json({ error: 'Requisição inválida.' }, { status: 403 });
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) await sgqDb().prepare('DELETE FROM management_sessions WHERE token_hash=?').bind(await hashToken(token)).run();
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0), 'Cache-Control': 'no-store' } });
}
