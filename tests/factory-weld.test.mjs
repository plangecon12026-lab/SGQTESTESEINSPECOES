import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {build} from 'esbuild';
await build({stdin:{contents:'export {generateFactoryVisualExcel} from "./app/factory-weld-excel.ts"; export {kindsForContract} from "./app/factory-weld-model.ts";export {validateData} from "./app/sgq-model.ts";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'tests/factory-test-bundle.mjs'});
const {generateFactoryVisualExcel,kindsForContract,validateData}=await import('./factory-test-bundle.mjs');
await fs.unlink('tests/factory-test-bundle.mjs');
const template=new Uint8Array(await fs.readFile('public/fabrica-visual-solda-template.xlsx'));
const original=await JSZip.loadAsync(template);
const fixture=()=>({common:{date:'2026-11-11',inspector:'Inspetor teste',client:'Vale',contract:'CT-TESTE',workOrder:'OS-TESTE',equipment:'Estrutura',service:'Inspeção de soldas',drawing:'DE-TESTE',tag:'TAG-TESTE'},groups:{weldSetup:[{standard:'AWS',procedure:'PR-TESTE'}],instruments:[{name:'Calibre',serial:'TAG-C',certificate:'CERT',validity:'12/2027'}],weldJoints:Array.from({length:14},(_,i)=>({item:String(i+1),joint:'J-'+i,tag:'Marca & teste',rootStamp:'S1',verdict:'AR',observation:'2'}))},result:'Aprovado com ressalvas',notes:'=Não é fórmula <teste>',signatures:{Qualidade:'Responsável Q'},photos:[]});
test('Factory mask maps final row and clears sample values while retaining logo and merges',async()=>{
 const blob=await generateFactoryVisualExcel(template,fixture(),'RVS-999-26',2);const zip=await JSZip.loadAsync(await blob.arrayBuffer());const xml=await zip.file('xl/worksheets/sheet1.xml').async('string');if(process.env.RENDER_CHECK)await fs.writeFile(process.env.RENDER_CHECK,new Uint8Array(await blob.arrayBuffer()));
 for(const value of ['CT-TESTE','OS-TESTE','TAG-TESTE','RVS-999-26','11/11/2026','J-13','Marca &amp; teste','Revisão: 2','=Não é fórmula &lt;teste&gt;'])assert.ok(xml.includes(value),value);
 assert.match(xml,/<c r="B32"[^>]*>[\s\S]*?<t[^>]*>14<\/t>/);
 assert.doesNotMatch(xml,/5500115885|SUPORTES DOS CAVALETES|5015|04-5204/);
 assert.equal(zip.file('xl/sharedStrings.xml'),null);
 assert.equal(xml.match(/<mergeCells[\s\S]*?<\/mergeCells>/)[0],(await original.file('xl/worksheets/sheet1.xml').async('string')).match(/<mergeCells[\s\S]*?<\/mergeCells>/)[0]);
 assert.deepEqual(await zip.file('xl/media/image1.jpeg').async('uint8array'),await original.file('xl/media/image1.jpeg').async('uint8array'));

});
test('overflow fails explicitly and contract-specific form stays isolated',async()=>{
 const d=fixture();d.groups.weldJoints.push(d.groups.weldJoints[0]);await assert.rejects(()=>generateFactoryVisualExcel(template,d,'TEST',0),/14 itens/);
 const factory=kindsForContract('fabrica').find(k=>k.id==='visual_solda');assert.match(validateData(factory,d),/14 juntas/);
 assert.equal(kindsForContract('s11d').find(k=>k.id==='visual_solda').template,undefined);
 assert.equal(kindsForContract('s11d').find(k=>k.id==='liquido_penetrante').template,undefined);
 d.groups.weldJoints.pop();assert.equal(validateData(factory,d),null);d.photos=[{url:'test',caption:''}];await assert.rejects(()=>generateFactoryVisualExcel(template,d,'TEST',0),/fotos/);
});
