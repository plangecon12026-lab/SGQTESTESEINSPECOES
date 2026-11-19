// Define (ou redefine) a senha do responsável pelo SGQ.
// Uso: OWNER_EMAIL=... node scripts/set-owner-password.mjs "senha com 8+ caracteres (letras, números ou símbolos)"
import { connect } from './db.mjs';
const email = (process.env.OWNER_EMAIL || 'smaiavitorvinicius@gmail.com').trim().toLowerCase();
const password = process.argv[2] || '';
if (password.length < 8 || password.length > 128) { console.error('Informe uma senha de 8 a 128 caracteres.'); process.exit(1); }
const ITERATIONS = 100_000;
const encode = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function derived(input, salt) {
  const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256));
}
const salt = crypto.getRandomValues(new Uint8Array(16));
const hash = `v2:${ITERATIONS}:${encode(salt)}:${encode(await derived(await derived(new TextEncoder().encode(password), salt), salt))}`;
const sql = connect();
await sql`insert into management_users (email,name,password_hash,role,created_at) values (${email},'Responsável SGQ',${hash},'owner',${new Date().toISOString()})
  on conflict (email) do update set password_hash=excluded.password_hash, role='owner'`;
await sql`delete from management_sessions where email=${email}`;
await sql`delete from management_login_attempts where email=${email}`;
console.log('Senha do responsável definida para', email);
await sql.end();
