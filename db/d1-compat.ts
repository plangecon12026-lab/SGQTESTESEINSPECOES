import type postgres from 'postgres';
import { sql } from './pg';

// Interface compatível com o subconjunto do Cloudflare D1 usado pelo SGQ original
// (prepare → bind → first/all/run, e batch transacional), executada no Postgres.

type Row = Record<string, unknown>;
export type D1Result<T = Row> = { results: T[]; success: true; meta: { changes: number } };
type Rewriter = (sql: string) => Promise<string> | string;

/** Converte a sintaxe SQLite usada no código para Postgres. Nunca altera literais. */
export function toPostgres(input: string): string {
  let index = 0;
  let out = input.replace(/'(?:''|[^'])*'|\?/g, token => token === '?' ? `$${++index}` : token);
  out = out.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b([\s\S]*)$/i, (_m, rest: string) => `INSERT INTO${rest.trimEnd().replace(/;$/, '')} ON CONFLICT DO NOTHING`);
  out = out.replace(/printf\('%03d',\s*([^)]+)\)/gi, (_m, expr: string) => `lpad((${expr})::text,3,'0')`);
  out = out.replace(/\b([A-Za-z_][A-Za-z0-9_.]*)\s+COLLATE\s+NOCASE\b/gi, 'lower($1)');
  return out;
}

export class Statement {
  constructor(readonly db: CompatDatabase, readonly query: string, readonly args: unknown[] = []) {}
  bind(...args: unknown[]) { return new Statement(this.db, this.query, args.map(v => v === undefined ? null : v)); }
  async first<T = Row>(column?: string): Promise<T | null> {
    const rows = await this.db.execute(this);
    const row = rows[0] as Row | undefined;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }
  async all<T = Row>(): Promise<D1Result<T>> {
    const rows = await this.db.execute(this);
    return { results: [...rows] as T[], success: true, meta: { changes: rows.count ?? 0 } };
  }
  async run(): Promise<D1Result> {
    const rows = await this.db.execute(this);
    return { results: [...rows] as Row[], success: true, meta: { changes: rows.count ?? 0 } };
  }
  async raw(): Promise<unknown[][]> { return (await this.db.execute(this)).map(r => Object.values(r)); }
}

export class CompatDatabase {
  constructor(private readonly rewrite: Rewriter = s => s) {}
  prepare(query: string) { return new Statement(this, query); }
  async text(statement: Statement) { return toPostgres(await this.rewrite(statement.query)); }
  async execute(statement: Statement, tx?: postgres.TransactionSql): Promise<postgres.RowList<Row[]>> {
    const text = await this.text(statement);
    return (tx ?? sql()).unsafe(text, statement.args as postgres.ParameterOrJSON<never>[]) as unknown as Promise<postgres.RowList<Row[]>>;
  }
  /** Executa todas as instruções numa única transação, como o batch do D1. */
  async batch(statements: Statement[]): Promise<D1Result[]> {
    const texts = await Promise.all(statements.map(s => this.text(s)));
    return sql().begin(async tx => {
      const results: D1Result[] = [];
      for (let i = 0; i < statements.length; i++) {
        const rows = await tx.unsafe(texts[i], statements[i].args as postgres.ParameterOrJSON<never>[]);
        results.push({ results: [...rows] as Row[], success: true, meta: { changes: rows.count ?? 0 } });
      }
      return results;
    }) as Promise<D1Result[]>;
  }
}
