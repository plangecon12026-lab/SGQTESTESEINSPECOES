import JSZip from "jszip";
import type { ReportData, ReportPhoto } from "./report-types";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const RELS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT = "http://schemas.openxmlformats.org/package/2006/content-types";

const parser = () => new DOMParser();
const serializer = () => new XMLSerializer();

function directChildren(parent: Element, name: string) {
  return Array.from(parent.children).filter((child) => child.tagName === name);
}

function textOf(element: Element) {
  return Array.from(element.getElementsByTagName("w:t"))
    .map((node) => node.textContent ?? "")
    .join("");
}

function setText(paragraph: Element, value: string) {
  const runs = directChildren(paragraph, "w:r");
  const run = runs[0]?.cloneNode(true) as Element | undefined;
  const target = run ?? paragraph.ownerDocument!.createElementNS(W, "w:r");
  Array.from(target.children).forEach((child) => {
    if (child.tagName !== "w:rPr") target.removeChild(child);
  });
  runs.forEach((item) => paragraph.removeChild(item));
  value.split("\n").forEach((line, index) => {
    if (index) target.appendChild(paragraph.ownerDocument!.createElementNS(W, "w:br"));
    const text = paragraph.ownerDocument!.createElementNS(W, "w:t");
    text.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    text.textContent = line;
    target.appendChild(text);
  });
  paragraph.appendChild(target);
}

function ensurePPr(paragraph: Element) {
  let pPr = directChildren(paragraph, "w:pPr")[0];
  if (!pPr) {
    pPr = paragraph.ownerDocument!.createElementNS(W, "w:pPr");
    paragraph.insertBefore(pPr, paragraph.firstChild);
  }
  return pPr;
}

function setProperty(paragraph: Element, name: string, value = "1") {
  const pPr = ensurePPr(paragraph);
  let property = directChildren(pPr, name)[0];
  if (!property) {
    property = paragraph.ownerDocument!.createElementNS(W, name);
    pPr.appendChild(property);
  }
  property.setAttributeNS(W, "w:val", value);
}

function setCentered(paragraph: Element) {
  setProperty(paragraph, "w:jc", "center");
}

function findBodyParagraph(body: Element, exact: string) {
  const target = exact.trim().toLocaleLowerCase("pt-BR");
  const paragraph = directChildren(body, "w:p").find(
    (item) => textOf(item).trim().toLocaleLowerCase("pt-BR") === target,
  );
  if (!paragraph) throw new Error(`Seção não encontrada no template: ${exact}`);
  return paragraph;
}

function nextParagraph(paragraph: Element) {
  let node = paragraph.nextElementSibling;
  while (node && node.tagName !== "w:p") node = node.nextElementSibling;
  if (!node) throw new Error("Estrutura incompleta no template.");
  return node;
}

function replaceTextNodes(document: XMLDocument, oldValue: string, newValue: string) {
  Array.from(document.getElementsByTagName("w:t")).forEach((node) => {
    if (node.textContent?.includes(oldValue)) {
      node.textContent = node.textContent.replaceAll(oldValue, newValue);
    }
  });
}

function findCellContaining(document: XMLDocument, label: string) {
  return Array.from(document.getElementsByTagName("w:tc")).find((cell) =>
    textOf(cell).includes(label),
  );
}

function replaceCellValue(cell: Element | undefined, current: string, next: string) {
  if (!cell || !next) return;
  const paragraph = Array.from(cell.getElementsByTagName("w:p")).find(
    (item) => textOf(item).trim() === current,
  );
  if (paragraph) setText(paragraph, next);
}

function cloneParagraph(prototype: Element, text: string) {
  const paragraph = prototype.cloneNode(true) as Element;
  setText(paragraph, text);
  return paragraph;
}

function xmlFragment(document: XMLDocument, value: string) {
  const wrapped = parser().parseFromString(
    `<root xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">${value}</root>`,
    "application/xml",
  );
  return document.importNode(wrapped.documentElement.firstElementChild!, true);
}

async function preparePhoto(photo: ReportPhoto) {
  const bitmap = await createImageBitmap(photo.file);
  let blob: Blob = photo.file;
  let extension = photo.file.type.includes("png") ? "png" : "jpeg";
  if (photo.file.type.includes("webp")) {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Falha ao converter WEBP."))), "image/png"),
    );
    extension = "png";
  }
  const maxWidth = 5.7 * 914400;
  const maxHeight = 4.7 * 914400;
  const ratio = bitmap.width / bitmap.height;
  const width = Math.round(Math.min(maxWidth, maxHeight * ratio));
  const height = Math.round(width / ratio);
  bitmap.close();
  return { bytes: await blob.arrayBuffer(), extension, width, height };
}

function imageParagraph(
  document: XMLDocument,
  relationshipId: string,
  name: string,
  width: number,
  height: number,
  drawingId: number,
) {
  return xmlFragment(
    document,
    `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="${drawingId}" name="${name}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${drawingId}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`,
  );
}

function addRelationship(rels: XMLDocument, id: string, target: string) {
  const relationship = rels.createElementNS(RELS, "Relationship");
  relationship.setAttribute("Id", id);
  relationship.setAttribute("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image");
  relationship.setAttribute("Target", target);
  rels.documentElement.appendChild(relationship);
}

function ensureContentType(types: XMLDocument, extension: string, contentType: string) {
  const exists = Array.from(types.getElementsByTagName("Default")).some(
    (item) => item.getAttribute("Extension") === extension,
  );
  if (!exists) {
    const node = types.createElementNS(CT, "Default");
    node.setAttribute("Extension", extension);
    node.setAttribute("ContentType", contentType);
    types.documentElement.appendChild(node);
  }
}

function fillRevisionTable(document: XMLDocument, data: ReportData) {
  const table = document.getElementsByTagName("w:tbl")[0];
  const rows = directChildren(table, "w:tr");
  const capacity = rows.length - 4;
  if (data.revisoes.length > capacity) {
    throw new Error(`A tabela do modelo comporta até ${capacity} revisões.`);
  }
  for (let index = 0; index < capacity; index++) {
    const cells = directChildren(rows[index + 4], "w:tc");
    const revision = data.revisoes[index];
    const values = revision
      ? [revision.revisao, revision.te, revision.descricao, revision.por, revision.verificador, revision.aprovador, revision.autorizador, revision.data]
      : ["", "", "", "", "", "", "", ""];
    values.forEach((value, cellIndex) => {
      const paragraph = cells[cellIndex]?.getElementsByTagName("w:p")[0];
      if (paragraph) setText(paragraph, value);
    });
  }
}

function addToc(document: XMLDocument, body: Element) {
  const heading = findBodyParagraph(body, "Sumário");
  const firstSection = findBodyParagraph(body, "1. IDENTIFICAÇÃO");
  let node = heading.nextElementSibling;
  while (node && node !== firstSection) {
    const next = node.nextElementSibling;
    body.removeChild(node);
    node = next;
  }
  setProperty(firstSection, "w:pageBreakBefore");
  const toc = xmlFragment(
    document,
    `<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Sumário será atualizado ao abrir no Word.</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`,
  );
  body.insertBefore(toc, firstSection);
}

function markFieldUpdate(settings: XMLDocument) {
  let update = settings.getElementsByTagName("w:updateFields")[0];
  if (!update) {
    update = settings.createElementNS(W, "w:updateFields");
    settings.documentElement.appendChild(update);
  }
  update.setAttributeNS(W, "w:val", "true");
}

function cleanFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, "-").replace(/^[.-]+|[.-]+$/g, "");
}

export async function generateDocx(data: ReportData) {
  const template = await fetch("/template.docx").then((response) => {
    if (!response.ok) throw new Error("Não foi possível abrir o template oficial.");
    return response.arrayBuffer();
  });
  const zip = await JSZip.loadAsync(template);
  const readXml = async (path: string) => parser().parseFromString(await zip.file(path)!.async("text"), "application/xml");
  const documentXml = await readXml("word/document.xml");
  const headerXml = await readXml("word/header1.xml");
  const relsXml = await readXml("word/_rels/document.xml.rels");
  const typesXml = await readXml("[Content_Types].xml");
  const settingsXml = await readXml("word/settings.xml");

  const headerReplacements: [string, string][] = [
    ["EXTRATORES DE METAL S11D N7033-F4", data.cabecalho.tituloSuperior],
    ["INTERNO", data.cabecalho.classificacao],
    ["RI-MEC-002-26", data.cabecalho.numeroContratada],
    ["PROJETO DETALHADO", data.cabecalho.faseProjeto],
    ["COMPLEXO S11D", data.cabecalho.areaProjeto],
    ["USINA DE BENEFICIMENTO - PATIO DE REGULARIZAÇÃO", data.cabecalho.subarea],
    ["C020254 - AQUISIÇÃO DE EXTRATORES DE METAIS", data.cabecalho.nomeProjeto],
    ["PEP C020254 LS 27-2024", data.cabecalho.pepLs],
  ];
  headerReplacements.forEach(([oldValue, next]) => next && replaceTextNodes(headerXml, oldValue, next));
  replaceCellValue(findCellContaining(headerXml, "Nº VALE"), "-", data.cabecalho.numeroVale);
  replaceCellValue(findCellContaining(headerXml, "REV."), "0", data.cabecalho.revisao);
  replaceTextNodes(documentXml, "RI-MEC-002-26", data.cabecalho.numeroContratada);

  fillRevisionTable(documentXml, data);
  const body = documentXml.getElementsByTagName("w:body")[0];
  setText(nextParagraph(findBodyParagraph(body, "1. IDENTIFICAÇÃO")), `Data: ${data.identificacao.data}\nTipo de Atividade: ${data.identificacao.tipoAtividade}\nÁrea: ${data.identificacao.areaInspecao}\nDisciplina: ${data.identificacao.disciplina}`);
  setText(nextParagraph(findBodyParagraph(body, "2. OBJETIVO")), data.objetivo);
  setText(nextParagraph(findBodyParagraph(body, "3. ESCOPO DA INSPEÇÃO")), data.escopo.split("\n").map((line) => line.trim()).filter(Boolean).join("\n"));
  setText(nextParagraph(findBodyParagraph(body, "5. ANÁLISE TÉCNICA GERAL")), data.analiseTecnica);
  setText(nextParagraph(findBodyParagraph(body, "6. CONCLUSÃO")), data.conclusao);

  ["1. IDENTIFICAÇÃO", "2. OBJETIVO", "3. ESCOPO DA INSPEÇÃO", "4. REGISTRO DAS NÃO CONFORMIDADES", "5. ANÁLISE TÉCNICA GERAL", "6. CONCLUSÃO"].forEach((heading) =>
    setProperty(findBodyParagraph(body, heading), "w:outlineLvl", "0"),
  );

  const section4 = findBodyParagraph(body, "4. REGISTRO DAS NÃO CONFORMIDADES");
  const section5 = findBodyParagraph(body, "5. ANÁLISE TÉCNICA GERAL");
  const titlePrototype = nextParagraph(section4).cloneNode(true) as Element;
  const detailPrototype = nextParagraph(nextParagraph(section4)).cloneNode(true) as Element;
  let removeNode = section4.nextElementSibling;
  while (removeNode && removeNode !== section5) {
    const next = removeNode.nextElementSibling;
    body.removeChild(removeNode);
    removeNode = next;
  }

  let photoCounter = 1;
  for (let situationIndex = 0; situationIndex < data.situacoes.length; situationIndex++) {
    const situation = data.situacoes[situationIndex];
    const number = String(situationIndex + 1).padStart(2, "0");
    const title = cloneParagraph(titlePrototype, `Situação ${number} – ${situation.titulo}`);
    setProperty(title, "w:outlineLvl", "1");
    body.insertBefore(title, section5);
    body.insertBefore(
      cloneParagraph(detailPrototype, `Número da SE: ${situation.numeroSe}\nNúmero do Projeto: ${situation.numeroProjeto}\nRevisão do Projeto: ${situation.revisaoProjeto}\nTítulo do Projeto: ${situation.tituloProjeto}\nClassificação: ${situation.tipoRegistro}\nCriticidade: ${situation.criticidade}\nDescrição Técnica: ${situation.descricaoTecnica}\nImpacto: ${situation.impacto}\nRecomendação: ${situation.recomendacao}\nGerou retrabalho: ${situation.gerouRetrabalho}${situation.gerouRetrabalho === "Sim" ? `\nDescrição do retrabalho: ${situation.descricaoRetrabalho}\nHoras de retrabalho: ${situation.horasRetrabalho} h` : ""}`),
      section5,
    );
    if (situation.fotos.length) {
      const photoHeading = cloneParagraph(detailPrototype, `Registros Fotográficos – Situação ${number}`);
      const firstRun = photoHeading.getElementsByTagName("w:r")[0];
      let rPr = firstRun?.getElementsByTagName("w:rPr")[0];
      if (firstRun && !rPr) {
        rPr = documentXml.createElementNS(W, "w:rPr");
        firstRun.insertBefore(rPr, firstRun.firstChild);
      }
      rPr?.appendChild(documentXml.createElementNS(W, "w:b"));
      body.insertBefore(photoHeading, section5);
    }
    for (let imageIndex = 0; imageIndex < situation.fotos.length; imageIndex++) {
      const photo = situation.fotos[imageIndex];
      const prepared = await preparePhoto(photo);
      const id = `rIdInspectionPhoto${photoCounter}`;
      const mediaName = `situation-${situationIndex + 1}-${imageIndex + 1}.${prepared.extension}`;
      zip.file(`word/media/${mediaName}`, prepared.bytes);
      addRelationship(relsXml, id, `media/${mediaName}`);
      ensureContentType(typesXml, prepared.extension, prepared.extension === "png" ? "image/png" : "image/jpeg");
      body.insertBefore(imageParagraph(documentXml, id, mediaName, prepared.width, prepared.height, 500 + photoCounter), section5);
      const caption = cloneParagraph(detailPrototype, photo.legenda || `Foto ${imageIndex + 1}`);
      setCentered(caption);
      setProperty(caption, "w:keepNext", "0");
      const captionRun = caption.getElementsByTagName("w:r")[0];
      let captionRPr = captionRun?.getElementsByTagName("w:rPr")[0];
      if (captionRun && !captionRPr) {
        captionRPr = documentXml.createElementNS(W, "w:rPr");
        captionRun.insertBefore(captionRPr, captionRun.firstChild);
      }
      captionRPr?.appendChild(documentXml.createElementNS(W, "w:i"));
      body.insertBefore(caption, section5);
      photoCounter++;
    }
  }

  addToc(documentXml, body);
  markFieldUpdate(settingsXml);
  zip.file("word/document.xml", serializer().serializeToString(documentXml));
  zip.file("word/header1.xml", serializer().serializeToString(headerXml));
  zip.file("word/_rels/document.xml.rels", serializer().serializeToString(relsXml));
  zip.file("[Content_Types].xml", serializer().serializeToString(typesXml));
  zip.file("word/settings.xml", serializer().serializeToString(settingsXml));

  const filename = `${cleanFilename(data.cabecalho.numeroContratada)}.docx`;
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  return { blob, filename };
}
