import { contractDb, contractFileKey } from '../../../db/contract-context';
import { env } from '../../../db/platform';
import { managementApiGuard } from '../../management-auth';


const allowedStatuses = ["Pendente de emissão", "Emitida", "Em tratativa", "Aguardando verificação", "Encerrada"];

export async function GET() {
  const denied = await managementApiGuard(); if (denied) return denied;
  const [reportRows, existingRows] = await Promise.all([
    contractDb().prepare("SELECT id, metadata_json FROM reports WHERE status = 'completed'").all<{ id: string; metadata_json: string }>(),
    contractDb().prepare("SELECT report_id, situation_id FROM occurrence_tracking").all<{ report_id: string; situation_id: string }>(),
  ]);
  const existing = new Set(existingRows.results.map((row) => `${row.report_id}:${row.situation_id}`));
  const inserts: ReturnType<ReturnType<typeof contractDb>["prepare"]>[] = [];
  const now = new Date().toISOString();
  for (const report of reportRows.results) {
    let metadata: { situacoes?: Array<{ id?: string; titulo?: string; tipoRegistro?: string }> } = {};
    try { metadata = JSON.parse(report.metadata_json || "{}"); } catch { metadata = {}; }
    for (const situation of metadata.situacoes ?? []) {
      if (!situation.id || !situation.tipoRegistro || !["SIT", "RNC", "NAP"].includes(situation.tipoRegistro) || existing.has(`${report.id}:${situation.id}`)) continue;
      inserts.push(contractDb().prepare(`
        INSERT INTO occurrence_tracking (id, report_id, situation_id, classification, title, vale_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '', 'Pendente de emissão', ?, ?)
        ON CONFLICT (report_id, situation_id) DO NOTHING
      `).bind(crypto.randomUUID(), report.id, situation.id, situation.tipoRegistro, situation.titulo || "Situação sem título", now, now));
    }
  }
  if (inserts.length) await contractDb().batch(inserts);

  const result = await contractDb().prepare(`
    SELECT o.id, o.report_id, o.situation_id, o.classification, o.title,
           o.vale_number, o.response_text, o.status, o.created_at, o.updated_at, o.closed_at,
           r.report_number, r.project_name, r.issuer_name, r.metadata_json
    FROM occurrence_tracking o
    INNER JOIN reports r ON r.id = o.report_id
    ORDER BY CASE WHEN o.status = 'Encerrada' THEN 1 ELSE 0 END, o.updated_at DESC
    LIMIT 1000
  `).all();
  const occurrences = result.results.map((row) => {
    let metadata: { situacoes?: Array<Record<string, unknown>> } = {};
    try { metadata = JSON.parse(String(row.metadata_json || "{}")); } catch { metadata = {}; }
    const situation = metadata.situacoes?.find((item) => item.id === row.situation_id) ?? {};
    const { metadata_json: _metadataJson, ...occurrence } = row;
    return {
      ...occurrence,
      numero_se: String(situation.numeroSe ?? ""),
      numero_projeto: String(situation.numeroProjeto ?? ""),
      revisao_projeto: String(situation.revisaoProjeto ?? ""),
      titulo_projeto: String(situation.tituloProjeto ?? ""),
      criticidade: String(situation.criticidade ?? ""),
      descricao_tecnica: String(situation.descricaoTecnica ?? ""),
      impacto: String(situation.impacto ?? ""),
      recomendacao: String(situation.recomendacao ?? ""),
      gerou_retrabalho: String(situation.gerouRetrabalho ?? ""),
      descricao_retrabalho: String(situation.descricaoRetrabalho ?? ""),
      horas_retrabalho: String(situation.horasRetrabalho ?? ""),
    };
  });
  return Response.json({ occurrences });
}

export async function PATCH(request: Request) {
  const denied = await managementApiGuard(); if (denied) return denied;
  const body = await request.json() as { id?: string; valeNumber?: string; responseText?: string; status?: string };
  if (!body.id || !body.status || !allowedStatuses.includes(body.status)) {
    return Response.json({ error: "Dados de acompanhamento inválidos." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const valeNumber = String(body.valeNumber ?? "").trim().toUpperCase();
  const responseText = String(body.responseText ?? "").trim();
  await contractDb().prepare(`
    UPDATE occurrence_tracking
    SET vale_number = ?, response_text = ?, status = ?, updated_at = ?, closed_at = ?
    WHERE id = ?
  `).bind(valeNumber, responseText, body.status, now, body.status === "Encerrada" ? now : null, body.id).run();
  return Response.json({ ok: true, updatedAt: now });
}
