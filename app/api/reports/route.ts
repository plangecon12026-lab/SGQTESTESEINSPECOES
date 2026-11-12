import { fieldApiGuard } from '../../management-auth';
import { contractDb, contractFileKey } from '../../../db/contract-context';
import { env } from '../../../db/platform';
import { parseManualSequence } from '../../manual-sequence';


type ReservePayload = {
  issuerKey: string;
  issuerName: string;
  issuerRole: string;
  year: number;
  manualSequence?: string;
  metadata: Record<string, unknown>;
};

export async function GET(request: Request) {const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const format = url.searchParams.get("format");

  if (id && (format === "docx" || format === "pdf")) {
    const column = format === "docx" ? "docx_key" : "pdf_key";
    const row = await contractDb().prepare(`SELECT report_number, ${column} AS file_key FROM reports WHERE id = ? AND status = 'completed'`).bind(id).first<{ report_number: string; file_key: string | null }>();
    if (!row?.file_key) return new Response("Arquivo não encontrado.", { status: 404 });
    const object = await env.BUCKET.get(row.file_key);
    if (!object) return new Response("Arquivo não encontrado.", { status: 404 });
    const extension = format === "docx" ? "docx" : "pdf";
    const contentType = format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";
    return new Response(object.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${row.report_number}.${extension}"`,
      },
    });
  }

  const result = await contractDb().prepare(`
    SELECT id, report_number, issuer_name, issuer_role, title, project_name,
           ls_description, created_at, completed_at, docx_key, pdf_key, metadata_json
    FROM reports
    WHERE status = 'completed'
    ORDER BY created_at DESC
    LIMIT 500
  `).all();
  return Response.json({ reports: result.results });
}

export async function POST(request: Request) {const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
  const body = await request.json() as ReservePayload;
  if (!body.issuerKey || !body.issuerName || !body.issuerRole || !body.year || !body.metadata) {
    return Response.json({ error: "Dados do emissor incompletos." }, { status: 400 });
  }
  if (!Number.isInteger(body.year) || body.year < 2000 || body.year > 2100 || !/^[A-Z0-9]{1,12}$/.test(body.issuerKey)) {
    return Response.json({ error: "Emissor ou ano inválido." }, { status: 400 });
  }
  let manual: number | null;
  try { manual = parseManualSequence(body.manualSequence); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
  if (manual !== null) {
    const taken = await contractDb().prepare('SELECT id FROM reports WHERE issuer_key=? AND year=? AND sequence=?').bind(body.issuerKey, body.year, manual).first();
    if (taken) return Response.json({ error: 'Este número já está em uso para este emissor e ano. Escolha outro.' }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const yearShort = String(body.year).slice(-2);
  const metadata = body.metadata as { cabecalho?: Record<string, string> };
  const header = metadata.cabecalho ?? {};
  const now = new Date().toISOString();

  let results;
  try { results = await contractDb().batch([
    contractDb().prepare('INSERT INTO report_counters (issuer_key,year,last_number) VALUES (?,?,0) ON CONFLICT(issuer_key,year) DO NOTHING').bind(body.issuerKey,body.year),
    contractDb().prepare('SELECT last_number FROM report_counters WHERE issuer_key=? AND year=?::int FOR UPDATE').bind(body.issuerKey,body.year),
    contractDb().prepare(`UPDATE report_counters SET last_number=CASE WHEN ?::int IS NOT NULL THEN ?::int ELSE (
      SELECT MIN(candidate) FROM (
        SELECT last_number+1 AS candidate FROM report_counters WHERE issuer_key=? AND year=?
        UNION ALL SELECT sequence+1 FROM reports WHERE issuer_key=? AND year=? AND sequence >= (SELECT last_number FROM report_counters WHERE issuer_key=? AND year=?)
      ) AS candidates WHERE candidate NOT IN (SELECT sequence FROM reports WHERE issuer_key=? AND year=?)
    ) END WHERE issuer_key=? AND year=?`).bind(manual,manual,body.issuerKey,body.year,body.issuerKey,body.year,body.issuerKey,body.year,body.issuerKey,body.year,body.issuerKey,body.year),
    contractDb().prepare(`INSERT INTO reports (
      id, report_number, sequence, year, issuer_key, issuer_name, issuer_role,
      title, project_name, ls_description, metadata_json, status, created_at
    ) SELECT ?::text, 'RI-' || issuer_key || '-' || printf('%03d',last_number) || '-' || ?::text, last_number, year, issuer_key, ?::text, ?::text, ?::text, ?::text, ?::text, ?::text, 'reserved', ?::text FROM report_counters WHERE issuer_key=? AND year=? RETURNING report_number`).bind(
    id, yearShort, body.issuerName,
    body.issuerRole, header.tituloSuperior ?? "", header.nomeProjeto ?? "",
    header.pepLs ?? "", JSON.stringify(body.metadata), now, body.issuerKey, body.year,
  )]); } catch (error) {
    console.error(error);
    return Response.json({ error: 'Não foi possível reservar este número. Verifique se ele já está em uso e tente novamente.' }, { status: 409 });
  }
  const reportNumber = (results[3].results[0] as { report_number: string } | undefined)?.report_number;
  if (!reportNumber) return Response.json({ error: 'Não foi possível reservar a numeração.' }, { status: 500 });

  return Response.json({ id, reportNumber });
}

export async function PUT(request: Request) {const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const metadataJson = String(form.get("metadata") ?? "{}");
  const docx = form.get("docx");
  const pdf = form.get("pdf");
  if (!id || !(docx instanceof File)) return Response.json({ error: "Relatório ou DOCX ausente." }, { status: 400 });

  const report = await contractDb().prepare("SELECT report_number FROM reports WHERE id = ?").bind(id).first<{ report_number: string }>();
  if (!report) return Response.json({ error: "Relatório não encontrado." }, { status: 404 });

  const docxKey = await contractFileKey(`reports/${id}/${report.report_number}.docx`);
  await env.BUCKET.put(docxKey, docx.stream(), { httpMetadata: { contentType: docx.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } });
  let pdfKey: string | null = null;
  if (pdf instanceof File) {
    pdfKey = await contractFileKey(`reports/${id}/${report.report_number}.pdf`);
    await env.BUCKET.put(pdfKey, pdf.stream(), { httpMetadata: { contentType: pdf.type || "application/pdf" } });
  }

  await contractDb().prepare(`
    UPDATE reports SET metadata_json = ?, docx_key = ?, pdf_key = ?, status = 'completed', completed_at = ?
    WHERE id = ?
  `).bind(metadataJson, docxKey, pdfKey, new Date().toISOString(), id).run();

  let metadata: { situacoes?: Array<{ id?: string; titulo?: string; tipoRegistro?: string }> } = {};
  try { metadata = JSON.parse(metadataJson); } catch { metadata = {}; }
  const now = new Date().toISOString();
  const occurrences = (metadata.situacoes ?? []).filter((situation) => situation.id && situation.tipoRegistro && ["SIT", "RNC", "NAP"].includes(situation.tipoRegistro));
  if (occurrences.length) {
    await contractDb().batch(occurrences.map((situation) => contractDb().prepare(`
      INSERT INTO occurrence_tracking (id, report_id, situation_id, classification, title, vale_number, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '', 'Pendente de emissão', ?, ?)
      ON CONFLICT (report_id, situation_id) DO NOTHING
    `).bind(crypto.randomUUID(), id, situation.id, situation.tipoRegistro, situation.titulo || "Situação sem título", now, now)));
  }

  return Response.json({ ok: true });
}
