// Aplica supabase/migrations/*.sql em ordem, uma única vez cada.
import { readFileSync, readdirSync } from 'node:fs';
import { connect } from './db.mjs';
const sql = connect();
await sql`create table if not exists sgq_schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql`select name from sgq_schema_migrations`).map(r => r.name));
for (const name of readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort()) {
  if (done.has(name)) continue;
  await sql.begin(async tx => {
    await tx.unsafe(readFileSync('supabase/migrations/' + name, 'utf8'));
    await tx`insert into sgq_schema_migrations (name) values (${name})`;
  });
  console.log('aplicada:', name);
}
await sql`select sgq_create_contract_tables('fabrica')`;
const now = new Date().toISOString();
await sql`insert into contracts (id,name,created_at) values ('s11d','Implantação S11D',${now}),('fabrica','Fábrica',${now}) on conflict do nothing`;
console.log('Banco atualizado.');
await sql.end();
