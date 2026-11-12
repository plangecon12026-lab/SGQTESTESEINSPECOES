import { jsPDF } from "jspdf";
import type { ReportData, ReportPhoto } from "./report-types";

function fileDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function imageDimensions(photo: ReportPhoto) {
  const bitmap = await createImageBitmap(photo.file);
  const result = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return result;
}

function cleanFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, "-").replace(/^[.-]+|[.-]+$/g, "");
}

export async function generatePdf(data: ReportData) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 42;

  const addHeader = () => {
    pdf.setDrawColor(35, 55, 70);
    pdf.setLineWidth(0.25);
    pdf.rect(margin, 10, contentWidth, 24);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(data.cabecalho.tituloSuperior || "RELATÓRIO DE INSPEÇÃO", margin + 3, 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`${data.cabecalho.nomeProjeto || "Projeto"}`, margin + 3, 21);
    pdf.text(`Nº CONTRATADA: ${data.cabecalho.numeroContratada}`, margin + 3, 27);
    pdf.text(`REV.: ${data.cabecalho.revisao}  |  CLASSIFICAÇÃO: ${data.cabecalho.classificacao}`, margin + 3, 31);
  };

  const newPage = () => {
    pdf.addPage();
    addHeader();
    y = 42;
  };

  const ensure = (height: number) => {
    if (y + height > pageHeight - 17) newPage();
  };

  const heading = (text: string, level = 1) => {
    ensure(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(level === 1 ? 11 : 10);
    pdf.setTextColor(18, 60, 69);
    pdf.text(text, margin, y);
    pdf.setTextColor(20, 25, 28);
    y += level === 1 ? 8 : 7;
  };

  const paragraph = (text: string, boldLabel?: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(text, contentWidth);
    ensure(lines.length * 4.6 + 3);
    if (boldLabel && text.startsWith(boldLabel)) {
      pdf.setFont("helvetica", "bold");
    }
    pdf.text(lines, margin, y);
    y += lines.length * 4.6 + 3;
  };

  addHeader();
  heading("REVISÕES");
  data.revisoes.forEach((revision) =>
    paragraph(`Rev. ${revision.revisao} | ${revision.te} | ${revision.descricao} | Por: ${revision.por} | Ver.: ${revision.verificador} | Apr.: ${revision.aprovador} | Aut.: ${revision.autorizador} | ${revision.data}`),
  );
  heading("1. IDENTIFICAÇÃO");
  paragraph(`Data: ${data.identificacao.data}\nTipo de Atividade: ${data.identificacao.tipoAtividade}\nÁrea: ${data.identificacao.areaInspecao}\nDisciplina: ${data.identificacao.disciplina}`);
  heading("2. OBJETIVO");
  paragraph(data.objetivo);
  heading("3. ESCOPO DA INSPEÇÃO");
  data.escopo.split("\n").filter(Boolean).forEach((item) => paragraph(`• ${item.trim()}`));
  heading("4. REGISTRO DAS NÃO CONFORMIDADES");

  for (let index = 0; index < data.situacoes.length; index++) {
    const situation = data.situacoes[index];
    const number = String(index + 1).padStart(2, "0");
    heading(`Situação ${number} – ${situation.titulo}`, 2);
    paragraph(`Descrição Técnica: ${situation.descricaoTecnica}`);
    paragraph(`Número da SE: ${situation.numeroSe}`);
    paragraph(`Número do Projeto: ${situation.numeroProjeto}`);
    paragraph(`Revisão do Projeto: ${situation.revisaoProjeto}`);
    paragraph(`Título do Projeto: ${situation.tituloProjeto}`);
    paragraph(`Classificação: ${situation.tipoRegistro}`);
    paragraph(`Criticidade: ${situation.criticidade}`);
    paragraph(`Impacto: ${situation.impacto}`);
    paragraph(`Recomendação: ${situation.recomendacao}`);
    paragraph(`Gerou retrabalho: ${situation.gerouRetrabalho}`);
    if (situation.gerouRetrabalho === "Sim") {
      paragraph(`Descrição do retrabalho: ${situation.descricaoRetrabalho}`);
      paragraph(`Horas de retrabalho: ${situation.horasRetrabalho} h`);
    }
    if (situation.fotos.length) heading(`Registros Fotográficos – Situação ${number}`, 2);
    for (const photo of situation.fotos) {
      const dimensions = await imageDimensions(photo);
      const ratio = dimensions.width / dimensions.height;
      const maxW = 145;
      const maxH = 105;
      const width = Math.min(maxW, maxH * ratio);
      const height = width / ratio;
      ensure(height + 14);
      const dataUrl = await fileDataUrl(photo.file);
      const type = photo.file.type.includes("png") ? "PNG" : photo.file.type.includes("webp") ? "WEBP" : "JPEG";
      pdf.addImage(dataUrl, type, (pageWidth - width) / 2, y, width, height, undefined, "FAST");
      y += height + 5;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      const caption = pdf.splitTextToSize(photo.legenda || "Registro fotográfico", contentWidth);
      pdf.text(caption, pageWidth / 2, y, { align: "center" });
      y += caption.length * 4 + 5;
    }
  }
  heading("5. ANÁLISE TÉCNICA GERAL");
  paragraph(data.analiseTecnica);
  heading("6. CONCLUSÃO");
  paragraph(data.conclusao);

  const total = pdf.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(70, 78, 82);
    pdf.text(`${page}/${total}`, pageWidth - margin, pageHeight - 9, { align: "right" });
  }
  return { blob: pdf.output("blob"), filename: `${cleanFilename(data.cabecalho.numeroContratada)}.pdf` };
}
