export function parseManualSequence(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Informe um número sequencial inteiro entre 1 e 999999.');
  const raw = String(value).trim();
  if (!/^[0-9]{1,6}$/.test(raw) || Number(raw) < 1) throw new Error('Informe um número sequencial inteiro entre 1 e 999999.');
  return Number(raw);
}
