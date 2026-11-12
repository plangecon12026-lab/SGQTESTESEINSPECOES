import JSZip from 'jszip';
import type { FormData } from './sgq-model';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
export type ExcelPhoto = { bytes: Uint8Array; width: number; height: number; extension: 'jpeg' | 'png'; caption: string };
const escape = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : value || '';
const numeric = (value: string) => value?.trim() && Number.isFinite(Number(value.replace(',', '.'))) ? Number(value.replace(',', '.')) : value || '';

// Use inline strings, never formulas, for text entered in the report.
function cell(xml: string, address: string, value: string | number) {
  const pattern = new RegExp(`<x:c\\b([^>]*\\br="${address}"[^>]*?)(?:\\s*/>|>([\\s\\S]*?)</x:c>)`);
  if (!pattern.test(xml)) throw new Error(`A máscara de torque não contém o campo ${address}.`);
  return xml.replace(pattern, (_match, attributes: string) => {
    const attrs = attributes.replace(/\s+t="[^"]*"/g, '').replace(/\s*\/$/, '');
    return typeof value === 'number'
      ? `<x:c${attrs}><x:v>${value}</x:v></x:c>`
      : `<x:c${attrs} t="inlineStr"><x:is><x:t xml:space="preserve">${escape(value)}</x:t></x:is></x:c>`;
  });
}

function lines(text: string, limit = 120): string[] {
  const output: string[] = [];
  for (const paragraph of text.replace(/\r/g, '').split('\n')) {
    let rest = paragraph.trim();
    if (!rest) { output.push(''); continue; }
    while (rest.length > limit) {
      const space = rest.lastIndexOf(' ', limit);
      const end = space > limit / 2 ? space : limit;
      output.push(rest.slice(0, end));
      rest = rest.slice(end).trimStart();
    }
    output.push(rest);
  }
  return output;
}

function rowHeight(xml: string, row: number, height: number) {
  return xml.replace(new RegExp(`<x:row\\b([^>]*\\br="${row}"[^>]*)>`), (_match, attributes: string) =>
    `<x:row${attributes.replace(/\s+(?:ht|customHeight)="[^"]*"/g, '')} ht="${height}" customHeight="1">`);
}

function projectFields(value: string) {
  const parts = value.split(' · ');
  if (parts.length > 1) return {
    code: parts.filter(p => /^(PEP|LS)\s/i.test(p)).join(' / '),
    name: parts.filter(p => !/^(PEP|LS)\s/i.test(p)).join(' · '),
  };
  const match = value.match(/^([CG]\d[\w.]*)\s*[-–]\s*(.+)$/);
  return match ? {code:match[1],name:match[2]} : {code:value,name:''};
}

function picture(id: number, relationship: string, col: number, row: number, width: number, height: number, offsetX = 8, offsetY = 8) {
  const emu = (pixels: number) => Math.round(pixels * 9525);
  return `<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${emu(offsetX)}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${emu(offsetY)}</xdr:rowOff></xdr:from><xdr:ext cx="${emu(width)}" cy="${emu(height)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Foto ${id}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relationship}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(width)}" cy="${emu(height)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
}

export async function generateTorqueExcel(template: Uint8Array, data: FormData, number: string, revision: number, photos: ExcelPhoto[]) {
  if (photos.length !== data.photos.length) throw new Error('Confira as fotos antes de baixar o Excel.');
  const zip = await JSZip.loadAsync(template);
  const base = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  const logo = await zip.file('xl/media/image.png')!.async('uint8array');
  const bolts = data.groups.bolts || [];
  const instruments = data.groups.instruments || [];
  const common = data.common;
  const project = projectFields(common.pep === 'Outro' ? common.pepOther || '' : common.pep || '');
  const noteLines = lines([
    `Responsável pela inspeção: ${common.inspector || ''}`,
    `Natureza do serviço: ${common.service || ''}`,
    data.notes || 'Sem observações adicionais.',
    ...photos.flatMap((p, i) => p.caption.length > 170 ? [`Foto ${i + 1}: ${p.caption}`] : []),
  ].join('\n'));
  const pageCount = Math.max(1, Math.ceil(bolts.length / 12), Math.ceil(instruments.length / 2), Math.ceil(photos.length / 2), Math.ceil(noteLines.length / 3));
  // The mask has a fixed print area. Continue on another copy instead of truncating rows or photos.
  const widths = Array(17).fill(8.89 * 7 + 5);
  for (const match of base.matchAll(/<x:col\b[^>]*min="(\d+)"[^>]*max="(\d+)"[^>]*width="([\d.]+)"/g)) {
    for (let i = Number(match[1]) - 1; i < Math.min(17, Number(match[2])); i++) widths[i] = Number(match[3]) * 7 + 5;
  }
  const leftWidth = widths.slice(0, 8).reduce((a,b)=>a+b,0);
  const rightWidth = widths.slice(8).reduce((a,b)=>a+b,0);
  const sheets: string[] = [], workbookRels: string[] = [], printAreas: string[] = [], overrides: string[] = [];
  for (const key of Object.keys(zip.files)) if (/^xl\/(worksheets|drawings|media)\//.test(key)) zip.remove(key);
  zip.file('xl/media/logo.png', logo);

  for (let page = 0; page < pageCount; page++) {
    const index = page + 1;
    const name = pageCount === 1 ? 'Torque' : `Torque ${index}`;
    let sheet = base;
    const values: Record<string,string|number> = {
      L2:`${number} · Rev. ${revision}`, L3:`DATA\n${date(common.date)}`, O3:`PÁG. ${index}/${pageCount}`,
      A6:common.client === 'Outro' ? common.clientOther || '' : common.client || '', E6:common.contract || '', I6:project.code,
      A8:[common.drawing, common.drawingRevision && `Rev. ${common.drawingRevision}`].filter(Boolean).join(' · '), E8:project.name, I8:common.equipment || '',
      A9:`ÁREA DE APLICAÇÃO:\n${common.area || ''}`,
      M26:`[${data.result === 'Aprovado' ? 'X' : ' '}] APROVADO`,
      M27:`[${data.result === 'Aprovado com ressalvas' ? 'X' : ' '}] APROVADO COM RESSALVAS`,
      M28:`[${data.result === 'Reprovado' ? 'X' : ' '}] REPROVADO`,
      A31:noteLines[page * 3] || '', A32:noteLines[page * 3 + 1] || '', A33:noteLines[page * 3 + 2] || '',
      A60:data.signatures?.Engenharia || '', E60:data.signatures?.Qualidade || '', J60:data.signatures?.['Fiscalização / cliente'] || '',
      A67:'DATA:', E67:'DATA:', J67:'DATA:',
    };
    for (let row = 0; row < 12; row++) {
      const item = bolts[page * 12 + row];
      const r = row + 13;
      for (const column of ['A','B','C','G','H','N','P']) values[`${column}${r}`] = '';
      if (item) Object.assign(values, { [`A${r}`]:page * 12 + row + 1, [`B${r}`]:numeric(item.quantity), [`C${r}`]:item.diameter || '', [`G${r}`]:item.class || '', [`H${r}`]:item.connection || '', [`N${r}`]:numeric(item.applied), [`P${r}`]:numeric(item.specified) });
    }
    for (let row = 0; row < 2; row++) {
      const instrument = instruments[page * 2 + row];
      const r = row + 27;
      values[`A${r}`] = instrument ? [instrument.name,instrument.serial && `Série: ${instrument.serial}`].filter(Boolean).join(' · ') : '';
      values[`G${r}`] = instrument?.certificate || '';
      values[`I${r}`] = date(instrument?.validity || '');
    }
    for (const [address,value] of Object.entries(values)) sheet = cell(sheet,address,value);
    const requiredHeight = (pairs: [string,number][], minimum: number) => Math.max(minimum,...pairs.map(([address,width])=>Math.ceil(String(values[address] ?? '').length / width) * 13 + 3));
    sheet = rowHeight(sheet,6,requiredHeight([['A6',38],['E6',40],['I6',44]],22));
    sheet = rowHeight(sheet,8,requiredHeight([['A8',38],['E8',40],['I8',44]],24));
    sheet = rowHeight(sheet,9,requiredHeight([['A9',120]],30));
    for(let r=13;r<=24;r++) sheet = rowHeight(sheet,r,requiredHeight([[`C${r}`,35],[`G${r}`,14],[`H${r}`,32]],24));
    for(let r=27;r<=28;r++) sheet = rowHeight(sheet,r,requiredHeight([[`A${r}`,55],[`G${r}`,24]],24));
    for(let r=31;r<=33;r++) sheet = rowHeight(sheet,r,18);
    // Restore A4 print settings, which are not retained by the template importer.
    sheet = sheet.replace(/<x:sheetViews>/, '<x:sheetPr><x:pageSetUpPr fitToPage="1"/></x:sheetPr><x:sheetViews>');
    sheet = sheet.replace(/<x:pageMargins\b[^>]*\/>/, '<x:printOptions horizontalCentered="1"/><x:pageMargins left="0.45" right="0.45" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><x:pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>');
    sheet = sheet.replace(/<x:drawing\b[^>]*\/>/, `<x:drawing xmlns:r="${REL}" r:id="drawing"/>`);
    let anchors = picture(page * 3 + 1, `logo${index}`, 0, 0, 120, 41, 22, 18);
    const drawingRels = [`<Relationship Id="logo${index}" Type="${REL}/image" Target="../media/logo.png"/>`];
    for (let slot = 0; slot < 2; slot++) {
      const photoIndex = page * 2 + slot;
      const photo = photos[photoIndex];
      if (!photo) continue;
      const boxWidth = (slot ? rightWidth : leftWidth) - 20;
      const scale = Math.min(boxWidth / photo.width, 330 / photo.height);
      const width = photo.width * scale, height = photo.height * scale;
      const id = `photo${photoIndex + 1}`;
      let col = slot ? 8 : 0;
      let offsetX = 10 + (boxWidth - width)/2;
      while (col < 16 && offsetX >= widths[col]) { offsetX -= widths[col]; col++; }
      const offsetY = 8 + (330 - height)/2;
      const row = 34 + Math.floor(offsetY / 17.6);
      anchors += picture(page * 3 + slot + 2, id, col, row, width, height, offsetX, offsetY % 17.6);
      const path = `photo${photoIndex + 1}.${photo.extension}`;
      zip.file(`xl/media/${path}`, photo.bytes);
      drawingRels.push(`<Relationship Id="${id}" Type="${REL}/image" Target="../media/${path}"/>`);
      const caption = `Foto ${photoIndex + 1}${photo.caption ? ': ' + (photo.caption.length > 170 ? 'Legenda completa nas observações.' : photo.caption) : ''}`;
      sheet = cell(sheet, slot ? 'I55' : 'A55', caption);
    }
    const merges = ['A55:H58','I55:Q58'];
    sheet = sheet.replace(/<x:mergeCells count="(\d+)">/, (_, n) => `<x:mergeCells count="${Number(n) + merges.length}">`).replace('</x:mergeCells>', merges.map(ref=>`<x:mergeCell ref="${ref}"/>`).join('')+'</x:mergeCells>');
    zip.file(`xl/worksheets/sheet${index}.xml`, sheet);
    zip.file(`xl/worksheets/_rels/sheet${index}.xml.rels`, XML+`<Relationships xmlns="${PACKAGE_REL}"><Relationship Id="drawing" Type="${REL}/drawing" Target="../drawings/drawing${index}.xml"/></Relationships>`);
    zip.file(`xl/drawings/drawing${index}.xml`, XML+`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}">${anchors}</xdr:wsDr>`);
    zip.file(`xl/drawings/_rels/drawing${index}.xml.rels`, XML+`<Relationships xmlns="${PACKAGE_REL}">${drawingRels.join('')}</Relationships>`);
    sheets.push(`<x:sheet name="${name}" sheetId="${index}" r:id="sheet${index}"/>`);
    workbookRels.push(`<Relationship Id="sheet${index}" Type="${REL}/worksheet" Target="worksheets/sheet${index}.xml"/>`);
    printAreas.push(`<x:definedName name="_xlnm.Print_Area" localSheetId="${page}">'${name}'!$A$1:$Q$67</x:definedName>`);
    overrides.push(`<Override PartName="/xl/worksheets/sheet${index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`, `<Override PartName="/xl/drawings/drawing${index}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
  }
  zip.file('xl/workbook.xml', XML+`<x:workbook xmlns:x="${NS}" xmlns:r="${REL}"><x:sheets>${sheets.join('')}</x:sheets><x:definedNames>${printAreas.join('')}</x:definedNames></x:workbook>`);
  const rels = (await zip.file('xl/_rels/workbook.xml.rels')!.async('string')).replace(/<Relationship\b[^>]*Type="[^"]*\/worksheet"[^>]*\/>/g, '').replace('</Relationships>', workbookRels.join('')+'</Relationships>');
  zip.file('xl/_rels/workbook.xml.rels', rels);
  const types = (await zip.file('[Content_Types].xml')!.async('string')).replace(/<Override\b[^>]*PartName="\/xl\/(?:worksheets|drawings)\/[^>]*\/>/g, '').replace('</Types>', `<Default Extension="jpeg" ContentType="image/jpeg"/>${overrides.join('')}</Types>`);
  zip.file('[Content_Types].xml',types);
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}

async function loadPhoto(photo: FormData['photos'][number]): Promise<ExcelPhoto> {
  const image = await new Promise<HTMLImageElement>((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>reject(new Error('Não foi possível carregar uma foto. Confira sua conexão e tente baixar o Excel novamente.'));
    img.src = photo.url;
  });
  const scale = Math.min(1,1600 / Math.max(image.width,image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(image.width*scale));
  canvas.height = Math.max(1,Math.round(image.height*scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar as fotos para o Excel.');
  context.fillStyle = 'white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Não foi possível preparar uma foto.')),'image/jpeg',0.9));
  return {bytes:new Uint8Array(await blob.arrayBuffer()),width:canvas.width,height:canvas.height,extension:'jpeg',caption:photo.caption};
}

export async function downloadTorqueExcel(data: FormData, number: string, revision: number) {
  const response = await fetch('/torque-template.xlsx');
  if (!response.ok) throw new Error('Não foi possível carregar a máscara de Excel. Tente novamente.');
  const photos: ExcelPhoto[] = [];
  for (const photo of data.photos) photos.push(await loadPhoto(photo));
  const bytes = await generateTorqueExcel(new Uint8Array(await response.arrayBuffer()),data,number,revision,photos);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const link = document.createElement('a');link.href=url;link.download=`${number.replace(/[<>:"/\\|?*]/g,'-')}-rev-${revision}.xlsx`;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
