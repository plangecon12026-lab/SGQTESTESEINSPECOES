export const BUSINESS_TABLES = ['report_counters','reports','occurrence_tracking','sgq_records','sgq_counters','sgq_revisions','area_inspectors','inspection_plans','inspection_plan_updates','welders','welder_qualifications','welder_tests','welder_test_updates'];
export const CONTRACT_ID = /^[a-z][a-z0-9_]{0,48}$/;
export function contractPrefix(id) {
  if (id === 's11d') return '';
  if (!CONTRACT_ID.test(id)) throw Error('Contrato inválido');
  return `ct_${id}__`;
}
// Rewrite identifiers only, never SQL string literals or bound user data.
export function scopeSQL(sql, id, extraNames = []) {
  const prefix = contractPrefix(id);
  if (!prefix) return sql;
  const names = new Set([...BUSINESS_TABLES, ...extraNames]);
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|`[^`]*`|\[[^\]]*\]|\b[A-Za-z_][A-Za-z0-9_]*\b/g, token => {
    if (token[0] === "'") return token;
    const quoted = ['"','`','['].includes(token[0]);
    const name = quoted ? token.slice(1,-1) : token;
    return names.has(name) ? (quoted ? token[0]+prefix+name+token.slice(-1) : prefix+name) : token;
  });
}
