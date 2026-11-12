import { sgqDb } from '../../../db/sgq';
import { OWNER_EMAIL, hashPassword, managementIdentity, normalizeManagementEmail, ownerApiGuard, validOrigin, verifyPassword } from '../../management-auth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const denied = await ownerApiGuard(); if (denied) return denied;
  const rows = await sgqDb().prepare("SELECT email,name,created_at FROM management_users WHERE role='member' ORDER BY name,email").all();
  return Response.json({ users: rows.results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const denied = await ownerApiGuard(); if (denied) return denied;
  if (!validOrigin(request)) return Response.json({ error: 'Requisição inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { email?: unknown; name?: unknown; password?: unknown };
  const email = typeof body.email === 'string' ? normalizeManagementEmail(body.email) : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (email === OWNER_EMAIL || email.length > 254 || !emailPattern.test(email) || name.length > 100 || password.length < 12 || password.length > 128) return Response.json({ error: 'Informe e-mail válido e senha entre 12 e 128 caracteres.' }, { status: 400 });
  const db = sgqDb(), hash = await hashPassword(password);
  await db.batch([
    db.prepare("INSERT INTO management_users (email,name,password_hash,role,created_at) VALUES (?,?,?,'member',?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash WHERE role='member'").bind(email,name,hash,new Date().toISOString()),
    db.prepare('DELETE FROM management_sessions WHERE email=?').bind(email),
    db.prepare('DELETE FROM management_login_attempts WHERE email=?').bind(email),
  ]);
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  const denied = await ownerApiGuard(); if (denied) return denied;
  if (!validOrigin(request)) return Response.json({ error: 'Requisição inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { email?: unknown };
  const email = typeof body.email === 'string' ? normalizeManagementEmail(body.email) : '';
  if (!emailPattern.test(email) || email === OWNER_EMAIL) return Response.json({ error: 'E-mail inválido.' }, { status: 400 });
  const db = sgqDb(); await db.batch([
    db.prepare("DELETE FROM management_users WHERE email=? AND role='member'").bind(email),
    db.prepare('DELETE FROM management_sessions WHERE email=?').bind(email),
  ]);
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  const identity = await managementIdentity();
  if (!identity) return Response.json({ error: 'Entre para alterar sua senha.' }, { status: 401 });
  if (!validOrigin(request)) return Response.json({ error: 'Requisição inválida.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { currentPassword?: unknown; newPassword?: unknown };
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (next.length < 12 || next.length > 128) return Response.json({ error: 'A nova senha deve ter de 12 a 128 caracteres.' }, { status: 400 });
  const db = sgqDb();
  const row = await db.prepare('SELECT password_hash FROM management_users WHERE email=?').bind(identity.email).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current,row.password_hash))) return Response.json({ error: 'Senha atual incorreta.' }, { status: 400 });
  await db.prepare('UPDATE management_users SET password_hash=? WHERE email=?').bind(await hashPassword(next),identity.email).run();
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
