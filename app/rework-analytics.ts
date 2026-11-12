export type ReworkReport = {
  id: string;
  report_number: string;
  project_name: string;
  created_at: string;
  metadata_json: string;
};

export type ReworkOccurrence = {
  report_id: string;
  situation_id: string;
  status: string;
};

export type ReworkCase = {
  reportNumber: string;
  project: string;
  discipline: string;
  title: string;
  classification: string;
  criticality: string;
  hours: number | null;
  status: string;
  month: string;
};

type Metadata = {
  identificacao?: { disciplina?: string };
  situacoes?: Array<{
    id?: string;
    titulo?: string;
    tipoRegistro?: string;
    criticidade?: string;
    gerouRetrabalho?: string;
    horasRetrabalho?: string;
  }>;
};

function rankHours(cases: ReworkCase[], key: 'project' | 'discipline' | 'classification') {
  const grouped = new Map<string, { hours: number; count: number }>();
  for (const item of cases) {
    const name = item[key] || 'Não informado';
    const current = grouped.get(name) || { hours: 0, count: 0 };
    grouped.set(name, { hours: current.hours + (item.hours || 0), count: current.count + 1 });
  }
  return [...grouped].map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.hours - a.hours || b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
}

export function calculateRework(reports: ReworkReport[], occurrences: ReworkOccurrence[], period: '6m' | 'year' | 'all', now = new Date()) {
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const cutoff = period === '6m' ? firstMonth : period === 'year' ? new Date(now.getFullYear(), 0, 1) : null;
  const statuses = new Map(occurrences.map(item => [`${item.report_id}:${item.situation_id}`, item.status]));
  const cases: ReworkCase[] = [];
  const affectedReports = new Set<string>();
  let assessed = 0;
  let previousHours = 0;
  let previousCount = 0;

  for (const report of reports) {
    const created = new Date(report.created_at);
    if (Number.isNaN(created.getTime()) || (cutoff && created < cutoff && !(period === '6m' && created >= previousStart))) continue;
    let metadata: Metadata;
    try { metadata = JSON.parse(report.metadata_json || '{}') as Metadata; } catch { continue; }
    if (!Array.isArray(metadata.situacoes)) continue;
    if (period === '6m' && created >= previousStart && created < firstMonth) {
      for (const situation of metadata.situacoes) {
        if (situation.gerouRetrabalho !== 'Sim') continue;
        const value = Number(String(situation.horasRetrabalho || '').trim().replace(',', '.'));
        if (Number.isFinite(value) && value > 0) previousHours += value;
        previousCount += 1;
      }
      continue;
    }
    for (const situation of metadata.situacoes) {
      if (situation.gerouRetrabalho !== 'Sim' && situation.gerouRetrabalho !== 'Não') continue;
      assessed += 1;
      if (situation.gerouRetrabalho !== 'Sim') continue;
      affectedReports.add(report.id);
      const rawHours = String(situation.horasRetrabalho || '').trim().replace(',', '.');
      const parsed = Number(rawHours);
      const hours = rawHours && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      cases.push({
        reportNumber: report.report_number,
        project: report.project_name || 'Não informado',
        discipline: metadata.identificacao?.disciplina || 'Não informada',
        title: situation.titulo || 'Situação sem título',
        classification: situation.tipoRegistro || 'Não informada',
        criticality: situation.criticidade || 'Não informada',
        hours,
        status: statuses.get(`${report.id}:${situation.id}`) || 'Sem acompanhamento',
        month,
      });
    }
  }

  const hours = cases.reduce((sum, item) => sum + (item.hours || 0), 0);
  const knownHours = cases.filter(item => item.hours !== null).length;
  const open = cases.filter(item => item.status !== 'Encerrada');
  const openHours = open.reduce((sum, item) => sum + (item.hours || 0), 0);
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const items = cases.filter(item => item.month === key);
    return { key, label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), hours: items.reduce((sum, item) => sum + (item.hours || 0), 0), count: items.length };
  });
  return {
    cases,
    hours,
    count: cases.length,
    rate: assessed ? cases.length / assessed * 100 : null,
    assessed,
    affectedReports: affectedReports.size,
    averageHours: knownHours ? hours / knownHours : null,
    unknownHours: cases.length - knownHours,
    previousHours: period === '6m' ? previousHours : null,
    previousCount: period === '6m' ? previousCount : null,
    openHours,
    openCount: open.length,
    monthly,
    projects: rankHours(cases, 'project'),
    disciplines: rankHours(cases, 'discipline'),
    classifications: rankHours(cases, 'classification'),
    topCases: [...cases].sort((a, b) => (b.hours || 0) - (a.hours || 0)).slice(0, 8),
  };
}
