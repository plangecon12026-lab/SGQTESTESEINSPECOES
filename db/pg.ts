import postgres from 'postgres';

// Conexão única por instância (Vercel Functions reaproveitam o processo entre requisições).
// Use a URL do pooler do Supabase (modo transação, porta 6543): prepared statements desligados.
declare global { var __sgqSql: postgres.Sql | undefined; }

export function sql(): postgres.Sql {
  if (!globalThis.__sgqSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada.');
    globalThis.__sgqSql = postgres(url, {
      prepare: false,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require',
      // Contagens e somas voltam como número, como no D1/SQLite.
      types: { bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
               numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) } },
      onnotice: () => {},
    });
  }
  return globalThis.__sgqSql;
}
