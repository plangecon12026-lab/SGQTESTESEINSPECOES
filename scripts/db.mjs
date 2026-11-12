import postgres from 'postgres';
export function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('Defina DATABASE_URL (veja .env.example).'); process.exit(1); }
  return postgres(url, { prepare: false, max: 1, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require', onnotice: () => {} });
}
