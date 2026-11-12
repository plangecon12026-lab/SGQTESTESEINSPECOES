-- SGQ | Testes e Inspeções — esquema Postgres (Supabase)
-- Equivalente às migrations Drizzle/D1 0000–0011 do sistema original.
-- Tabelas de negócio do contrato S11D usam os nomes originais; demais contratos
-- recebem cópias vazias com prefixo ct_<id>__ (criadas pela função sgq_create_contract_tables).

create table if not exists report_counters (
  issuer_key text not null,
  year integer not null,
  last_number integer not null default 0
);
create unique index if not exists report_counters_issuer_year_idx on report_counters (issuer_key, year);

create table if not exists reports (
  id text primary key,
  report_number text not null unique,
  sequence integer not null,
  year integer not null,
  issuer_key text not null,
  issuer_name text not null,
  issuer_role text not null,
  title text not null default '',
  project_name text not null default '',
  ls_description text not null default '',
  metadata_json text not null,
  docx_key text,
  pdf_key text,
  status text not null default 'reserved',
  created_at text not null,
  completed_at text
);
create unique index if not exists reports_issuer_year_sequence_idx on reports (issuer_key, year, sequence);

create table if not exists occurrence_tracking (
  id text primary key,
  report_id text not null,
  situation_id text not null,
  classification text not null,
  title text not null,
  vale_number text not null default '',
  response_text text not null default '',
  status text not null default 'Pendente de emissão',
  created_at text not null,
  updated_at text not null,
  closed_at text
);
create unique index if not exists occurrence_report_situation_idx on occurrence_tracking (report_id, situation_id);

create table if not exists sgq_counters (
  key text primary key,
  value integer not null default 0
);

create table if not exists sgq_records (
  id text primary key,
  number text not null unique,
  kind text not null,
  year integer not null,
  sequence integer not null,
  equipment text not null,
  inspector text not null,
  date text not null,
  result text not null,
  data text not null,
  revision integer not null default 0,
  created_at text not null,
  updated_at text not null
);
create unique index if not exists sgq_kind_year_sequence on sgq_records (kind, year, sequence);

create table if not exists sgq_revisions (
  id text primary key,
  record_id text not null,
  revision integer not null,
  data text not null,
  created_at text not null
);
create unique index if not exists sgq_record_revision on sgq_revisions (record_id, revision);

create table if not exists area_inspectors (
  id text primary key,
  name text not null,
  previous_names text not null default '[]',
  active integer not null default 1,
  weekly_target integer not null default 1,
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_area_inspectors_active_name on area_inspectors (active, name);

create table if not exists inspection_plans (
  id text primary key,
  project_key text not null,
  project_name text not null,
  pep text not null default '',
  ls text not null default '',
  activity text not null,
  test text not null,
  area text not null default '',
  start_date text not null default '',
  end_date text not null default '',
  status text not null default 'Não iniciado',
  progress integer not null default 0,
  priority text not null default 'Média',
  owner text not null default '',
  next_step text not null default '',
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_inspection_plans_project_date on inspection_plans (project_key, start_date);

create table if not exists inspection_plan_updates (
  id text primary key,
  plan_id text not null,
  progress integer not null,
  note text not null default '',
  created_at text not null
);
create index if not exists idx_inspection_plan_updates_plan_date on inspection_plan_updates (plan_id, created_at);

create table if not exists welders (
  id text primary key,
  employee_no text not null default '',
  name text not null,
  role text not null default '',
  stamp text not null default '',
  admission_date text not null default '',
  employment_status text not null default 'active',
  departure_date text not null default '',
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);
create unique index if not exists idx_welders_employee_no on welders (employee_no) where employee_no <> '';

create table if not exists welder_qualifications (
  id text primary key,
  welder_id text not null,
  process text not null,
  expiry_date text not null default '',
  rsq text not null default '',
  notes text not null default '',
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_welder_qualifications_welder on welder_qualifications (welder_id);

create table if not exists welder_tests (
  id text primary key,
  welder_id text not null,
  process text not null,
  responsible text not null default '',
  planned_date text not null default '',
  actual_date text not null default '',
  status text not null default 'Pendente',
  progress integer not null default 0,
  observation text not null default '',
  next_step text not null default '',
  created_at text not null,
  updated_at text not null
);
create index if not exists idx_welder_tests_welder_date on welder_tests (welder_id, planned_date);

create table if not exists welder_test_updates (
  id text primary key,
  test_id text not null,
  status text not null,
  progress integer not null,
  note text not null,
  created_at text not null
);
create index if not exists idx_welder_test_updates_test on welder_test_updates (test_id, created_at);

-- Globais (não pertencem a contrato)
create table if not exists management_users (
  email text primary key,
  name text not null default '',
  password_hash text not null default '',
  role text not null default 'member',
  created_at text not null
);
create table if not exists management_sessions (
  token_hash text primary key,
  email text not null,
  expires_at text not null
);
create index if not exists idx_management_sessions_email on management_sessions (email);
create table if not exists management_login_attempts (
  email text primary key,
  count integer not null default 0,
  blocked_until text not null default ''
);
create table if not exists contracts (
  id text primary key,
  name text not null,
  created_at text not null
);

-- Cria as tabelas vazias de um contrato (estrutura, padrões e índices; nunca registros).
create or replace function sgq_create_contract_tables(contract_id text) returns void
language plpgsql set search_path = public as $$
declare
  t text;
  business text[] := array['report_counters','reports','occurrence_tracking','sgq_records','sgq_counters','sgq_revisions','area_inspectors','inspection_plans','inspection_plan_updates','welders','welder_qualifications','welder_tests','welder_test_updates'];
begin
  if contract_id !~ '^[a-z][a-z0-9_]{0,48}$' then raise exception 'Contrato inválido'; end if;
  if contract_id = 's11d' then return; end if;
  foreach t in array business loop
    execute format('create table if not exists %I (like %I including all)', 'ct_' || contract_id || '__' || t, t);
    execute format('alter table %I enable row level security', 'ct_' || contract_id || '__' || t);
  end loop;
end $$;

-- O app acessa o banco apenas pelo servidor (conexão direta). Bloqueia a API pública do Supabase.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', r.tablename);
  end loop;
end $$;
revoke execute on function sgq_create_contract_tables(text) from public, anon, authenticated;

create table if not exists sgq_schema_migrations (name text primary key, applied_at timestamptz not null default now());
alter table sgq_schema_migrations enable row level security;
