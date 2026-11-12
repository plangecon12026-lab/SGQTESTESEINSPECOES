import {contractFetch} from './contract-client';
import JSZip from 'jszip';
import type { FormData } from './sgq-model';

type WeldKind='visual_solda'|'liquido_penetrante';
const esc=(v:unknown)=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s.split('-').reverse().join('/'):s||'';
const pick=(value:string,fallback='')=>value?.trim()||fallback;
const project=(d:FormData)=>d.common.pep==='Outro'?d.common.pepOther||'':d.common.pep||'';
const client=(d:FormData)=>d.common.client==='Outro'?d.common.clientOther||'':d.common.client||'';
const sequence=(number:string)=>number.match(/-(\d+)-\d{2}$/)?.[1]||number;
const shortDate=(value:string)=>date(value).replace(/(\d{2}\/\d{2}\/)\d{2}(\d{2})$/,'$1$2');
// The supplied masks already contain the styles, borders, logos and page setup.
// Only existing cell contents are replaced; no spreadsheet formulas are created from user text.
function setCell(xml:string,address:string,value:unknown){
  const pattern=new RegExp('<c\\b([^>]*\\br="'+address+'"[^>]*?)(?:\\s*/>|>[\\s\\S]*?</c>)');
  if(!pattern.test(xml)){
    const row=Number(address.match(/\d+/)?.[0]),letter=address.match(/^[A-Z]+/)?.[0]||'';
    const rowPattern=new RegExp('(<row\\b[^>]*\\br="'+row+'"[^>]*>)([\\s\\S]*?)(</row>)');
    if(!rowPattern.test(xml)){
      const block=xml.match(/<sheetData>([\s\S]*?)<\/sheetData>/);
      if(!block)throw new Error('A máscara não contém a área de dados.');
      const next=[...block[1].matchAll(/<row\b[^>]*\br="(\d+)"/g)].find(m=>Number(m[1])>row);
      const entry='<row r="'+row+'"></row>';
      const updated=next?block[1].slice(0,next.index)+entry+block[1].slice(next.index):block[1]+entry;
      xml=xml.replace(block[0],'<sheetData>'+updated+'</sheetData>');
    }
    const rank=(name:string)=>[...name].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
    const created='<c r="'+address+'" t="inlineStr"><is><t xml:space="preserve">'+esc(value)+'</t></is></c>';
    return xml.replace(rowPattern,(_match,start:string,body:string,end:string)=>{
      const cells=[...body.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"/g)];
      const next=cells.find(m=>rank(m[1])>rank(letter));
      return start+(next?body.slice(0,next.index)+created+body.slice(next.index):body+created)+end;
    });
  }
  return xml.replace(pattern,(_match,attrs:string)=>'<c'+attrs.replace(/\s+t="[^"]*"/g,'').replace(/\/\s*$/,'')+' t="inlineStr"><is><t xml:space="preserve">'+esc(value)+'</t></is></c>');
}
export function fill(xml:string,values:Record<string,string|number>){for(const [address,value] of Object.entries(values))xml=setCell(xml,address,value);return xml}
function visualValues(d:FormData,revision:number,page:1|2){
  const c=d.common,s=d.groups.weldSetup?.[0]||{},shift=page===1?0:46;
  const ls=project(d).match(/(?:^| · )LS ([^·]+)/i)?.[1]?.trim();
  const pep=project(d).match(/(?:^| · )PEP ([^·]+)/i)?.[1]?.trim();
  const lsPep=ls||pep?[(ls?'L.S Nº: '+ls:''),(pep?'PEP Nº: '+pep:'')].filter(Boolean).join('  '):'L.S / PEP: '+project(d);
  const v:Record<string,string|number>={
    ['I'+(4+shift)]:'REVISÃO: '+revision,
    ['A'+(5+shift)]:'CLIENTE: '+client(d),
    ['D'+(5+shift)]:'CONTRATO: '+pick(c.contract),
    ['H'+(5+shift)]:lsPep,
    ['A'+(6+shift)]:'DESENHO: '+pick(c.drawing)+(c.drawingRevision?'   Rev. '+c.drawingRevision:''),
    ['G'+(6+shift)]:'LOCAL DO ENSAIO: '+pick(c.area),
    ['A'+(8+shift)]:'PROCEDIMENTO N°: '+pick(s.procedure),
    ['E'+(8+shift)]:'REVISÃO: '+pick(s.procedureRevision),
    ['G'+(8+shift)]:'CERT. CONSUMÍVEL / LOTE: '+pick(s.consumable),
    ['A'+(9+shift)]:'NORMA DE REFERÊNCIA: '+pick(s.standard),
    ['G'+(9+shift)]:'EPS: '+pick(s.eps),
    ['A'+(10+shift)]:'METAL DE BASE: '+pick(s.baseMetal),
    ['F'+(10+shift)]:'METAL DE ADIÇÃO: '+pick(s.fillerMetal),
    ['A'+(11+shift)]:'ESTADO DA SUPERFÍCIE: '+pick(s.surface),
    ['E'+(11+shift)]:'ILUMINAÇÃO: '+pick(s.illumination),
    ['H'+(11+shift)]:'MÉTODO DE ENSAIO: '+pick(s.method),
  };
  return v;
}
function instrumentValues(d:FormData,start:number){
  const v:Record<string,string|number>={};
  for(let i=0;i<4;i++){const r=start+i,item=d.groups.instruments?.[i]||{};v['A'+r]=item.name||'';v['E'+r]=item.serial||'';v['G'+r]=item.certificate||'';v['I'+r]=date(item.validity||'')}
  return v;
}
function lpValues(d:FormData,number:string,page:1|2){
  const c=d.common,s=d.groups.lpSetup?.[0]||{};
  return {
    R1:'RELATÓRIO: '+sequence(number),R3:'DATA: '+date(c.date),R5:'FOLHA: '+page+' de 2',
    A8:'Cliente: '+client(d),J8:'Contrato: '+pick(c.contract)+'   PEP / LS: '+project(d),
    A9:'Desenho de Referência: '+pick(c.drawing)+(c.drawingRevision?'   Rev. '+c.drawingRevision:''),
    J9:'Local do Ensaio: '+pick(c.area),A10:'Norma de Referência: '+pick(s.standard),J10:'Critérios de Aceitação: '+pick(s.criteria),
    A11:'Procedimento no.:',D11:pick(s.procedure),J11:'Revisão: '+pick(s.procedureRevision),
    A12:'Metal de Base: '+pick(s.baseMetal),J12:'Método do Ensaio: '+pick(s.method),
    A13:'Estado da Superfície: '+pick(s.surface),J13:'Iluminação: '+pick(s.illumination),O13:'Temperatura: '+pick(s.temperature),
  };
}
function stripMissingPhotoAnchors(xml:string,missing:Set<string>){
  return xml.replace(/<xdr:(oneCellAnchor|twoCellAnchor)\b[\s\S]*?<\/xdr:\1>/g,part=>[...missing].some(id=>part.includes('r:embed="'+id+'"'))?'':part);
}
function stripPhotoRelations(xml:string,missing:Set<string>){
  return xml.replace(/<Relationship\b[^>]*\/>/g,part=>[...missing].some(id=>part.includes('Id="'+id+'"'))?'':part);
}
export async function generateWeldExcel(kind:WeldKind,template:Uint8Array,d:FormData,number:string,revision:number,photos:Uint8Array[]=[]){
  const max=kind==='visual_solda'?2:4,rows=d.groups[kind==='visual_solda'?'weldJoints':'lpJoints']||[];
  if(rows.length>(kind==='visual_solda'?16:23)||photos.length>max||d.photos.length>max)throw new Error('O relatório excede a capacidade da máscara Excel.');
  if(photos.length!==d.photos.length)throw new Error('Confira as fotos antes de baixar o Excel.');
  const zip=await JSZip.loadAsync(template);
  const sheet1=await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  if(kind==='visual_solda'){
    let xml=fill(sheet1,{...visualValues(d,revision,1),...visualValues(d,revision,2),...instrumentValues(d,36),...instrumentValues(d,84),
      A32:'Relatório '+number+' · Observações: '+pick(d.notes)+(d.common.service?' · Serviço: '+d.common.service:''),
      A79:'Relatório '+number+' · Observações / croqui: '+d.photos.map((p,i)=>'Foto '+(i+1)+': '+(p.caption||'Registro de campo')).join(' · '),
      A42:d.common.inspector||'',D42:d.signatures['Qualidade']||'',H42:d.signatures['Fiscalização / cliente']||'',
      A90:d.common.inspector||'',D90:d.signatures['Qualidade']||'',H90:d.signatures['Fiscalização / cliente']||''});
    for(let i=0;i<16;i++){const r=16+i,item=rows[i]||{};xml=fill(xml,{
      ['A'+r]:item.tag||'', ['B'+r]:item.joint||'', ['C'+r]:item.jointType||'', ['D'+r]:item.diameter||'',
      ['E'+r]:item.rootStamp||'', ['F'+r]:item.finishStamp||'', ['G'+r]:item.process||'', ['H'+r]:item.length||'',
      ['I'+r]:item.discontinuity||'', ['J'+r]:item.verdict||''});}
    zip.file('xl/worksheets/sheet1.xml',xml);
    const drawingName='xl/drawings/drawing1.xml',relsName='xl/drawings/_rels/drawing1.xml.rels';
    let drawing=await zip.file(drawingName)!.async('string');
    drawing=drawing.replace(/\{\{NUMBER\}\}/g,esc(sequence(number))).replace(/\{\{DATE\}\}/g,esc(shortDate(d.common.date)));
    // The lower blank slot is rId3, the upper slot is rId4 in this mask.
    const missing=new Set<string>();
    if(!photos[0])missing.add('rId4');if(!photos[1])missing.add('rId3');
    drawing=stripMissingPhotoAnchors(drawing,missing);zip.file(drawingName,drawing);
    zip.file(relsName,stripPhotoRelations(await zip.file(relsName)!.async('string'),missing));
    if(photos[0])zip.file('xl/media/image4.png',photos[0]);else zip.remove('xl/media/image4.png');
    if(photos[1])zip.file('xl/media/image3.png',photos[1]);else zip.remove('xl/media/image3.png');
  }else{
    const s=d.groups.lpSetup?.[0]||{};
    let xml=fill(sheet1,lpValues(d,number,1));
    const columns=['A','F','K','P'],labels=['Solvente','Penetrante','Removedor','Revelador'];
    for(let i=0;i<4;i++){const product=d.groups.chemicals?.[i]||{},c=columns[i];xml=fill(xml,{[c+'16']:'Fabricante: '+pick(product.manufacturer),[c+'17']:'Ref. Comercial: '+pick(product.commercial),[c+'18']:'Nº Lote: '+pick(product.batch),[c+'19']:'Data de Validade: '+date(product.expiry||'')})}
    for(let i=0;i<23;i++){const r=24+i,item=rows[i]||{};xml=fill(xml,{
      ['A'+r]:item.item||'', ['B'+r]:item.component||'', ['F'+r]:item.joint||'', ['I'+r]:item.indication||'',
      ['J'+r]:item.position||'', ['K'+r]:item.size||'', ['L'+r]:item.rootStamp||'', ['M'+r]:item.fillStamp||'',
      ['N'+r]:item.finishStamp||'', ['O'+r]:item.verdict||'', ['Q'+r]:item.observation||''});}
    const instrumentValue=(i:number)=>{const item=d.groups.instruments?.[i]||{};return item.name?('Instrumento: '+item.name+(item.certificate?' · Cert. '+item.certificate:'')+(item.validity?' · Val. '+date(item.validity):'')):''};
    for(let i=0;i<3;i++)xml=fill(xml,{['A'+(52+i)]:instrumentValue(i),['I'+(52+i)]:d.groups.instruments?.[i]?.serial||'',
      ['K'+(52+i)]:instrumentValue(i+3),['R'+(52+i)]:d.groups.instruments?.[i+3]?.serial||''});
    xml=fill(xml,{A47:'Relatório '+number+' · Observação: '+pick(d.notes),A48:d.common.service?'Serviço: '+d.common.service:'',A49:'',
      A61:'INSPETOR: '+pick(d.common.inspector),H61:'CONTROLE DA QUALIDADE: '+pick(d.signatures['Qualidade']),
      N61:'FISCALIZAÇÃO: '+pick(d.signatures['Fiscalização / cliente']),
      A62:'Data: '+date(d.common.date),H62:'Data: '+date(d.common.date),N62:'Data: '+date(d.common.date)});
    zip.file('xl/worksheets/sheet1.xml',xml);
    let page2=fill(await zip.file('xl/worksheets/sheet2.xml')!.async('string'),{...lpValues(d,number,2),
      E16:d.photos.slice(0,2).map((p,i)=>'Foto '+(i+1)+': '+(p.caption||'Registro de campo')).join(' | '),
      E37:d.photos.slice(2,4).map((p,i)=>'Foto '+(i+3)+': '+(p.caption||'Registro de campo')).join(' | '),
      A62:'INSPETOR: '+pick(d.common.inspector),H62:'CONTROLE DA QUALIDADE: '+pick(d.signatures['Qualidade']),
      N62:'FISCALIZAÇÃO: '+pick(d.signatures['Fiscalização / cliente']),
      A63:'Data: '+date(d.common.date),H63:'Data: '+date(d.common.date),N63:'Data: '+date(d.common.date)});
    zip.file('xl/worksheets/sheet2.xml',page2);
    // These legacy text boxes duplicate the corresponding worksheet cells.
    const replacements:Record<string,string>={'{{STANDARD}}':'','{{CRITERIA}}':''};
    for(const name of ['xl/drawings/drawing1.xml','xl/drawings/drawing2.xml']){
      let drawing=await zip.file(name)!.async('string');
      for(const [marker,value] of Object.entries(replacements))drawing=drawing.split(marker).join(esc(value));
      if(name.endsWith('drawing2.xml')){
        const order=['rId7','rId6','rId4','rId5'],missing=new Set(order.filter((_,i)=>!photos[i]));
        drawing=stripMissingPhotoAnchors(drawing,missing);
        const rels='xl/drawings/_rels/drawing2.xml.rels';zip.file(rels,stripPhotoRelations(await zip.file(rels)!.async('string'),missing));
        const files=['image6.jpeg','image5.jpeg','image3.jpeg','image4.jpeg'];
        files.forEach((file,i)=>photos[i]?zip.file('xl/media/'+file,photos[i]):zip.remove('xl/media/'+file));
      }
      zip.file(name,drawing);
    }
  }
  return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}

async function photoBytes(url:string,format:'image/png'|'image/jpeg'){
  const response=await contractFetch(url);if(!response.ok)throw new Error('Não foi possível carregar uma foto do relatório.');
  const blob=await response.blob(),source=URL.createObjectURL(blob);
  try{
    const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Não foi possível abrir uma foto.'));image.src=source});
    const factor=Math.min(1,1500/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*factor));canvas.height=Math.max(1,Math.round(image.height*factor));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a foto para o Excel.');
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const result=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Não foi possível converter a foto.')),format,.82));
    return new Uint8Array(await result.arrayBuffer());
  }finally{URL.revokeObjectURL(source)}
}
export async function downloadWeldExcel(kind:WeldKind,d:FormData,number:string,revision:number){
  const path=kind==='visual_solda'?'/visual-solda-template.xlsx':'/liquido-penetrante-template.xlsx';
  const response=await contractFetch(path);if(!response.ok)throw new Error('A máscara Excel está indisponível.');
  const photos=await Promise.all(d.photos.map(p=>photoBytes(p.url,kind==='visual_solda'?'image/png':'image/jpeg')));
  const blob=await generateWeldExcel(kind,new Uint8Array(await response.arrayBuffer()),d,number,revision,photos);
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=number.replace(/[<>:"/\\|?*]/g,'-')+'-rev-'+revision+'.xlsx';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
