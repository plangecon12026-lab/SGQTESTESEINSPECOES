import JSZip from 'jszip';
import {contractFetch} from './contract-client';
import {fill} from './weld-excel';
import type {FormData} from './sgq-model';
const date=(s:string='')=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('/'):s;
export async function generateFactoryVisualExcel(template:Uint8Array,d:FormData,number:string,revision:number){
 const items=d.groups.weldJoints||[],instruments=d.groups.instruments||[],c=d.common,s=d.groups.weldSetup?.[0]||{};
 if(items.length>14||instruments.length>2||d.photos.length)throw Error('A máscara da Fábrica comporta 14 itens, 2 instrumentos e não possui área para fotos.');
 const zip=await JSZip.loadAsync(template);
 const file=zip.file('xl/worksheets/sheet1.xml');if(!file)throw Error('Máscara da Fábrica inválida.');
 let xml=await file.async('string');
 const values:Record<string,string>={O2:'Rel. Nº: '+number,O3:'DATA: '+date(c.date),O4:'Pg.: 1/1',D5:c.contract||'',H5:c.client==='Outro'?c.clientOther||'':c.client||'',L5:'Nº O.S: '+(c.workOrder||''),B6:'EQUIPAMENTO: '+(c.equipment||''),H6:c.service||'',D7:(c.drawing||'')+(c.drawingRevision?' · Rev. '+c.drawingRevision:''),G7:'TAG: '+(c.tag||''),D9:s.standard||'',H9:(s.procedure||'')+(s.procedureRevision?' · Rev. '+s.procedureRevision:''),J9:'EPS: '+(s.eps||''),D10:s.baseMetal||'',F10:'METAL DE ADIÇÃO: '+(s.fillerMetal||''),I10:'CERT. CONSUMÍVEL: '+(s.consumable||''),D11:s.surface||'',H11:s.illumination||'',K11:s.method||'',B33:'Revisão: '+revision+' · Resultado: '+(d.result||'Não informado')+'\nObservações: '+(d.notes||'Sem observações.'),B42:c.inspector||'',F42:d.signatures['Qualidade']||'',J42:d.signatures['Fiscalização / cliente']||''};
 for(let i=0;i<2;i++){const row=instruments[i]||{},r=i+14;for(const [col,key] of Object.entries({B:'name',F:'serial',H:'certificate',M:'validity'}))values[col+r]=key==='validity'?date(row[key]):row[key]||'';}
 for(let i=0;i<14;i++){const row=items[i]||{},r=i+19;for(const [col,key] of Object.entries({B:'item',C:'joint',D:'tag',E:'jointType',F:'rootStamp',G:'finishStamp',H:'discontinuity',J:'length',K:'verdict',O:'observation'}))values[col+r]=row[key]||'';}
 xml=fill(xml,values);
 // Inline all remaining static strings, removing unused example data from the package.
 const shared=zip.file('xl/sharedStrings.xml');
 if(shared){const strings=[...(await shared.async('string')).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>m[1]);xml=xml.replace(/<c\b([^>]*\bt="s"[^>]*)>\s*<v>(\d+)<\/v>\s*<\/c>/g,(_,attrs,index)=>'<c'+attrs.replace(/\s+t="s"/,'')+' t="inlineStr"><is>'+strings[Number(index)]+'</is></c>');zip.remove('xl/sharedStrings.xml');for(const path of ['xl/_rels/workbook.xml.rels','[Content_Types].xml']){const part=zip.file(path);if(part)zip.file(path,(await part.async('string')).replace(/<(?:Relationship|Override)\b[^>]*sharedStrings[^>]*\/>/g,''));}}
 // Keep the supplied widths, merges, borders and logo; wrap populated cells.
 const styles=zip.file('xl/styles.xml');
 if(styles){let styleXml=await styles.async('string');const block=styleXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)!;const xfs=[...block[1].matchAll(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)].map(m=>m[0]);const added:string[]=[],cache=new Map<number,number>();
 for(const address of Object.keys(values)){const pattern=new RegExp('(<c\\b[^>]*\\br="'+address+'"[^>]*\\bs=")(\\d+)(")');xml=xml.replace(pattern,(_,a,id,b)=>{const old=Number(id);if(!cache.has(old)){let xf=xfs[old];const alignment=/<alignment\b([^>]*?)\/>/;if(alignment.test(xf))xf=xf.replace(alignment,(_,attrs)=>'<alignment'+attrs.replace(/\s+wrapText="[^"]*"/g,'')+' wrapText="1"/>');else if(xf.endsWith('/>'))xf=xf.slice(0,-2)+'><alignment wrapText="1"/></xf>';else xf=xf.replace('</xf>','<alignment wrapText="1"/></xf>');cache.set(old,xfs.length+added.length);added.push(xf);}return a+cache.get(old)+b;});}
 styleXml=styleXml.replace(block[0],'<cellXfs count="'+(xfs.length+added.length)+'">'+xfs.join('')+added.join('')+'</cellXfs>');zip.file('xl/styles.xml',styleXml);}
 const drawing=zip.file('xl/drawings/drawing1.xml');if(drawing)zip.file('xl/drawings/drawing1.xml',(await drawing.async('string')).replace(/<xdr:twoCellAnchor>[\s\S]*?<\/xdr:twoCellAnchor>/g,part=>part.includes('<xdr:cxnSp')?'':part));

 const widths:Record<string,number>={B6:35,H6:57,D7:30,G7:36,O2:19,O3:19,D5:28,H5:22,L5:28,D9:28,H9:22,J9:40,D10:28,F10:34,I10:45,D11:28,H11:22,K11:35};
 const rowHeight=(row:number,height:number)=>{xml=xml.replace(new RegExp('<row\\b([^>]*\\br="'+row+'"[^>]*)>'),(_,a)=>'<row'+a.replace(/\s+(?:ht|customHeight)="[^"]*"/g,'')+' ht="'+height+'" customHeight="1">');};
 for(const r of [2,3,5,6,7,9,10,11]){const lines=Math.max(1,...Object.entries(widths).filter(([a])=>Number(a.match(/\d+/)![0])===r).map(([a,w])=>Math.ceil(values[a].length/w)));rowHeight(r,Math.max(r===6||r===7||r===10?27:20,lines*14));}
 for(let i=0;i<14;i++){const r=i+19;const widths={B:4,C:10,D:13,E:8,F:8,G:8,H:16,J:12,K:20,O:15};const lines=Math.max(1,...Object.entries(widths).map(([col,w])=>Math.ceil((values[col+r]||'').length/w)));rowHeight(r,Math.max(i===0?70.5:25.5,lines*14));}
 rowHeight(33,Math.max(24.75,Math.ceil(values.B33.length/110)*14));
 xml=xml.replace(/<pageSetup\b([^>]*)\/>/,(_,a)=>'<pageSetup'+a.replace(/\s+(?:scale|fitToWidth|fitToHeight)="[^"]*"/g,'')+' fitToWidth="1" fitToHeight="1"/>');
 xml=xml.replace(/<pageSetUpPr\b([^>]*)\/>/,(_,a)=>'<pageSetUpPr'+a.replace(/\s+fitToPage="[^"]*"/g,'')+' fitToPage="1"/>');
 zip.file('xl/worksheets/sheet1.xml',xml);
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
export async function downloadFactoryVisualExcel(d:FormData,number:string,revision:number){
 const response=await contractFetch('/fabrica-visual-solda-template.xlsx');if(!response.ok)throw Error('A máscara da Fábrica está indisponível.');
 const blob=await generateFactoryVisualExcel(new Uint8Array(await response.arrayBuffer()),d,number,revision);
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=number.replace(/[<>:"/\\|?*]/g,'-')+'-rev-'+revision+'-fabrica.xlsx';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
