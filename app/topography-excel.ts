import JSZip from 'jszip';
import type { FormData } from './sgq-model';

const escapeXml=(value:unknown)=>String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]!));
const numeric=(v:string|undefined)=>v?.trim()&&/^[-+]?\d+(?:[.,]\d+)?$/.test(v.trim())?Number(v.replace(',','.')):null;
const excelDate=(v:string|undefined)=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?(Date.parse(v+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000:null;
const displayDate=(v:string|undefined)=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'):v||'';
const project=(d:FormData)=>d.common.pep==='Outro'?d.common.pepOther||'':d.common.pep||'';
const projectCode=(d:FormData)=>{const value=project(d),ls=value.match(/(?:^| · )LS ([^·]+)/i)?.[1]?.trim(),pep=value.match(/(?:^| · )PEP ([^·]+)/i)?.[1]?.trim();return ls||pep?[ls,pep].filter(Boolean).join(' / '):value};
type CellValue=string|number|null|{formula:string;cached:number|null};
function setCell(xml:string,address:string,value:CellValue){
 const pattern=new RegExp('<c\\b([^>]*\\br="'+address+'"[^>]*?)(?:\\s*/>|>[\\s\\S]*?</c>)');
 if(!pattern.test(xml))throw new Error('A máscara está sem a célula '+address+'.');
 const body=value===null?'':typeof value==='object'?'<f>'+escapeXml(value.formula)+'</f>'+(value.cached===null?'':'<v>'+value.cached+'</v>'):typeof value==='number'?'<v>'+value+'</v>':'<is><t xml:space="preserve">'+escapeXml(value)+'</t></is>';
 return xml.replace(pattern,(_m,attrs:string)=>'<c'+attrs.replace(/\s+t="[^"]*"/g,'').replace(/\s*\/$/,'')+(typeof value==='string'?' t="inlineStr"':'')+'>'+body+'</c>');
}
function cells(xml:string,values:Record<string,CellValue>){for(const [a,v] of Object.entries(values))xml=setCell(xml,a,v);return xml}
const measurement=(v:string|undefined):CellValue=>numeric(v)??(v?.trim()||null);
const measured=(v:string|undefined)=>numeric(v)===null?null:numeric(v);
const point=(v:string|undefined)=>v?.trim()?v.trim().replace('.',','):'—';
function difference(reference:string|undefined,reading:string|undefined,refCell:string,readCell:string):CellValue{
 const r=measured(reference),v=measured(reading);
 return {formula:`IF(OR(${refCell}="",${readCell}=""),"",${refCell}-${readCell})`,cached:r===null||v===null?null:Number((r-v).toFixed(3))};
}
export async function generateTopographyExcel(template:Uint8Array,d:FormData,number:string,revision:number){
 if((d.groups.instruments||[]).length>2)throw new Error('O modelo Excel comporta até dois instrumentos.');
 const zip=await JSZip.loadAsync(template);
 const name='xl/worksheets/sheet1.xml';let xml=await zip.file(name)!.async('string');
 const c=d.common,setup=d.groups.setup?.[0]||{},alignment=d.groups.alignment?.[0]||{};
 const short=number.replace(/-\d{2}$/,'');
 const position=setup.position||'';
 const values:Record<string,CellValue>={
  Y2:short,AA2:excelDate(c.date)??displayDate(c.date),A4:c.client==='Outro'?c.clientOther||'':c.client||'',D4:setup.site||'',R4:c.contract||'',Y4:projectCode(d),
  A6:[c.drawing,c.drawingRevision&&'REV '+c.drawingRevision].filter(Boolean).join(' '),D6:setup.project||'',R6:c.equipment||'',Y6:c.area||'',R8:c.service||'',
  C8:'VERTICAL',E8:'HORIZONTAL',L8:'INCLINADO',
  I34:d.result==='Aprovado'?'( X ) APROVADO':'(   ) APROVADO',
  T34:d.result==='Reprovado'?'( X ) REPROVADO':'(   ) REPROVADO',
  Y34:d.result==='Aprovado com ressalvas'?'( X ) APROVADO NOTA 1':'(   ) APROVADO NOTA 1',
  Y36:'≤ 0,80 mm',B38:'NOTA 1: '+[number,'Tolerância deslocamento C: 3700 mm',d.notes,alignment.reference&&'Método: '+alignment.reference].filter(Boolean).join(' · '),
  B40:d.common.inspector||'',I40:d.signatures['Fiscalização / cliente']||'',T40:d.signatures['Qualidade']||'',Y40:d.signatures['Engenharia']||'',
  B44:'DATA: '+displayDate(c.date),I44:'DATA: '+displayDate(c.date),T44:'DATA: '+displayDate(c.date),Y44:'DATA: '+displayDate(c.date),
 };
 for(let i=0;i<4;i++){
  const row=19+i,b=d.groups.before?.[i]||{},a=d.groups.after?.[i]||{};
  Object.assign(values,{
   ['C'+row]:measurement(b.reference),['D'+row]:measurement(b.left),['J'+row]:measurement(b.right),
   ['H'+row]:difference(b.reference,b.left,'C'+row,'D'+row),['N'+row]:difference(b.reference,b.right,'C'+row,'J'+row),
   ['T'+row]:measurement(a.reference),['V'+row]:measurement(a.shimLeft),['X'+row]:measurement(a.left),
   ['Y'+row]:difference(a.reference,a.left,'T'+row,'X'+row),['Z'+row]:measurement(a.shimRight),['AA'+row]:measurement(a.right),
   ['AB'+row]:difference(a.reference,a.right,'T'+row,'AA'+row),
  });
 }
 for(let i=0;i<4;i++)values['Z'+(30+i)]=measurement(d.groups.bearing?.[i]?.reading);
 values.AB30=difference(d.groups.bearing?.[0]?.reading,d.groups.bearing?.[1]?.reading,'Z30','Z31');
 values.AB32=difference(d.groups.bearing?.[2]?.reading,d.groups.bearing?.[3]?.reading,'Z32','Z33');
 for(let i=0;i<2;i++){const item=d.groups.instruments?.[i]||{},row=36+i;values['B'+row]=item.name||null;values['I'+row]=item.certificate||null;values['T'+row]=excelDate(item.validity)??null}
 xml=cells(xml,values);
 // The supplied position boxes use a black filled cell as their selection mark.
 const indicator:{[key:string]:string}={Vertical:'D8',Horizontal:'J8',Inclinado:'Q8'};
 for(const a of ['D8','J8','Q8'])xml=xml.replace(new RegExp('(<c\\b[^>]*\\br="'+a+'"[^>]*\\bs=")[^"]+"'),(_,prefix:string)=>prefix+(a===indicator[position]?'42':a==='Q8'?'54':'46')+'"');
 zip.file(name,xml);
 let drawing=await zip.file('xl/drawings/drawing1.xml')!.async('string');
 const after=d.groups.after||[];
 const labels:Record<string,string>={
  LEFT_P1:point(after[0]?.left),LEFT_P2:point(after[1]?.left),LEFT_P3:point(after[2]?.left),LEFT_P4:point(after[3]?.left),
  RIGHT_P1:point(after[0]?.right),RIGHT_P2:point(after[1]?.right),RIGHT_P3:point(after[2]?.right),RIGHT_P4:point(after[3]?.right),
  LEVEL1:point(alignment.level1),LEVEL2:point(alignment.level2),TORQUE_SUP_LEFT:point(alignment.torqueSupLeft),TORQUE_INF_LEFT:point(alignment.torqueInfLeft),
  TORQUE_SUP_RIGHT:point(alignment.torqueSupRight),TORQUE_INF_RIGHT:point(alignment.torqueInfRight),SQUARE1:point(alignment.square1),SQUARE2:point(alignment.square2),DISPLACEMENT:point(alignment.displacement),
 };
 for(const [key,value] of Object.entries(labels))drawing=drawing.replaceAll('{{'+key+'}}',escapeXml(value));
 if(drawing.includes('{{'))throw new Error('O croqui do modelo não foi preenchido por completo.');
 zip.file('xl/drawings/drawing1.xml',drawing);
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
export async function downloadTopographyExcel(d:FormData,number:string,revision:number){
 const response=await fetch('/topography-template.xlsx');if(!response.ok)throw new Error('O modelo Excel da topografia está indisponível.');
 const blob=await generateTopographyExcel(new Uint8Array(await response.arrayBuffer()),d,number,revision);
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=number.replace(/[<>:"/\\|?*]/g,'-')+'-rev-'+revision+'.xlsx';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
