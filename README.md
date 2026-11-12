# SGQ | Testes e Inspeções — Plangecon

Sistema de testes, inspeções e relatórios do SGQ, separado por contrato (S11D, Fábrica e outros).
Versão migrada do ambiente Cloudflare (D1/R2) para **Vercel + Supabase**, preservando o código, as telas,
as regras e as máscaras Excel/Word originais (versão 74, commit `0998ace`).

## Arquitetura

| Original (Cloudflare) | Agora |
| --- | --- |
| vinext + Worker | Next.js 16 na Vercel |
| D1 (SQLite) | Postgres do Supabase (`db/d1-compat.ts` mantém a mesma interface `prepare/bind/first/all/run/batch`) |
| R2 | Supabase Storage, bucket privado `sgq-arquivos` (`db/platform.ts`) |
| `worker/index.ts` (validação do contrato) | `proxy.ts` |
| Login vinculado ao ChatGPT | Login próprio por e-mail e senha (já existente na Gestão) |

**Isolamento entre contratos:** o S11D usa as tabelas originais; cada outro contrato tem cópias vazias com prefixo
`ct_<id>__` (criadas pela função SQL `sgq_create_contract_tables`). Toda consulta de negócio passa por
`contractDb()`, que reescreve os nomes das tabelas para o contrato da URL (`?contrato=`), validado no servidor.
Arquivos ficam em `contracts/<id>/...` no Storage. Numeração é reservada em transação com bloqueio da linha do contador.

**Segurança no Supabase:** RLS ligado em todas as tabelas e sem políticas — a API pública do Supabase não lê nada.
Só o servidor acessa o banco (conexão direta) e o Storage (chave `service_role`).

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (porta 6543), com a senha do banco |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` (secreta) |
| `SUPABASE_BUCKET` | `sgq-arquivos` |
| `OWNER_EMAIL` | e-mail do responsável pelo SGQ (libera acessos e cria contratos) |
| `SGQ_CAMPO_PUBLICO` | `false` (padrão: tudo exige login). `true` deixa a tela de campo aberta, como no original |

## Primeira instalação

```bash
npm install
cp .env.example .env.local     # preencha os valores
npm run db:migrate             # cria tabelas, contratos S11D e Fábrica e cadastro inicial de soldadores
npm run db:owner -- "SenhaDoResponsavel123"   # senha do OWNER_EMAIL (mín. 12 caracteres)
npm run dev
```

O bucket `sgq-arquivos` precisa existir no Supabase Storage (privado).
Depois de entrar como responsável, cadastre os demais usuários em **Gestão → Usuários e acessos**.

## Testes

```bash
npm test                                            # máscaras Excel e isolamento de SQL
TEST_DATABASE_URL=postgresql://... npm test         # + integração com Postgres (APAGA o schema public do banco de teste)
```

Os testes de integração cobrem: cadastro de contratos, isolamento de registros/arquivos entre contratos, numeração
simultânea sem duplicar (engenharia e campo), numeração manual, revisões com detecção de edição concorrente,
modelos exclusivos da Fábrica e o cronograma.

## Observações

- `app/api/project-options` ainda consulta a lista de PEP/LS do site antigo (`gestao-projetos-ls...chatgpt.site`), só no S11D.
  Se esse site sair do ar, a lista fica vazia e o campo continua aceitando digitação.
- Os dados de produção do sistema antigo (relatórios, fotos, usuários) não vieram no pacote e não foram migrados.
