import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { generateTorqueExcel } from '../app/torque-excel.ts';

const template = new Uint8Array(await fs.readFile(new URL('../public/torque-template.xlsx',import.meta.url)));
const templateZip = await JSZip.loadAsync(template);
const logo = await templateZip.file('xl/media/image.png').async('uint8array');
const fixture = () => ({common:{date:'2026-09-28',client:'Vale',contract:'55000114929',pep:'LS 2026-19 · PEP C018199 · Eliminação de andaimes',drawing:'DE-123',drawingRevision:'2',equipment:'PN-2032KS-31',area:'Linha de vida',inspector:'Inspetor de teste',service:'Conferência de torque'},groups:{bolts:[{quantity:'14',diameter:'Parafuso 5/8',class:'B7',connection:'Base & lança',specified:'183,5',applied:'183,5'}],instruments:[{name:'Torquímetro',serial:'TORQ-04',certificate:'C123/26',validity:'2027-04-01'}]},result:'Aprovado com ressalvas',notes:'Verificar acabamento.',signatures:{},photos:[]});
const contents = (xml,address) => xml.match(new RegExp(`<x:c\\b[^>]*r="${address}"[^>]*>([\\s\\S]*?)</x:c>`))?.[1];

test('exports values into the supplied mask, retaining layout, revision and inspection result', async()=>{
  const data=fixture();
  const bytes=await generateTorqueExcel(template,data,'RTP-0042/2026',3,[]);
  const zip=await JSZip.loadAsync(bytes), sheet=await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(contents(sheet,'L2'),/RTP-0042\/2026 · Rev. 3/);
  assert.match(contents(sheet,'L3'),/28\/09\/2026/);
  assert.match(contents(sheet,'I6'),/LS 2026-19 \/ PEP C018199/);
  assert.match(contents(sheet,'E8'),/Eliminação de andaimes/);
  assert.match(contents(sheet,'N13'),/<x:v>183.5<\/x:v>/);
  assert.match(contents(sheet,'P13'),/<x:v>183.5<\/x:v>/);
  assert.match(contents(sheet,'H13'),/Base &amp; lança/);
  assert.match(contents(sheet,'M27'),/\[X\] APROVADO COM RESSALVAS/);
  assert.match(contents(sheet,'M26'),/\[ \] APROVADO/);
  assert.match(contents(sheet,'A27'),/Torquímetro · Série: TORQ-04/);
  assert.match(contents(sheet,'I27'),/01\/04\/2027/);
  assert.match(sheet,/fitToWidth="1" fitToHeight="1"/);
  assert.match(await zip.file('xl/workbook.xml').async('string'),/\$A\$1:\$Q\$67/);
  assert.equal(Object.keys(zip.files).filter(p=>/xl\/media\/[^/]+$/.test(p)).length,1);
  assert.doesNotMatch(await zip.file('xl/sharedStrings.xml').async('string'),/RTP-15|LINHA DE VIDA PN|C326271/);
});

test('continues all measurements, instruments, photos and notes without dropping overflow', async()=>{
  const data=fixture();
  data.groups.bolts=Array.from({length:25},(_,i)=>({...data.groups.bolts[0],quantity:String(i+1),applied:String(i)}));
  data.groups.instruments=Array.from({length:5},(_,i)=>({...data.groups.instruments[0],name:`Instrumento ${i+1}`}));
  data.photos=Array.from({length:5},(_,i)=>({url:`test:${i}`,caption:`Evidência ${i+1}`}));
  data.notes='Observação longa '.repeat(24)+'FINAL';
  const bytes=await generateTorqueExcel(template,data,'RTP-TESTE',0,data.photos.map(p=>({bytes:logo,width:120,height:41,extension:'png',caption:p.caption})));
  const zip=await JSZip.loadAsync(bytes), last=await zip.file('xl/worksheets/sheet3.xml').async('string');
  assert.match(contents(last,'A13'),/<x:v>25<\/x:v>/);
  assert.match(contents(last,'N13'),/<x:v>24<\/x:v>/);
  assert.match(contents(last,'A27'),/Instrumento 5/);
  assert.match(contents(last,'A55'),/Evidência 5/);
  assert.equal(Object.keys(zip.files).filter(p=>/xl\/media\/photo\d+\.png$/.test(p)).length,5);
  const pages=await Promise.all(Object.keys(zip.files).filter(p=>/xl\/worksheets\/sheet\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')));
  assert.match(pages.join(''),/FINAL/);
  assert.match(pages[0],/<x:v>0<\/x:v>/);
});

test('rejects missing photos and writes user text as literal text',async()=>{
  const data=fixture();data.notes='=HYPERLINK("test")';data.common.client='Outro';data.common.clientOther='Cliente A';
  const zip=await JSZip.loadAsync(await generateTorqueExcel(template,data,'RTP-TESTE',0,[]));
  const sheet=await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(contents(sheet,'A6'),/Cliente A/);
  assert.match(contents(sheet,'A33'),/=HYPERLINK\(&quot;test&quot;\)/);
  assert.doesNotMatch(sheet,/<x:f[ >]/);
  data.photos=[{url:'missing',caption:''}];
  await assert.rejects(generateTorqueExcel(template,data,'RTP-TESTE',0,[]),/fotos/);
});
