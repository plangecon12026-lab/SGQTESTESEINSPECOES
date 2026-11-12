import { fieldApiGuard } from '../../management-auth';
import {kindsForContract} from '../../factory-weld-model';
import {currentContract} from '../../../db/contract-context';
import { sgqDb } from '../../../db/sgq';
import { kinds, validateData, type FormData } from '../../sgq-model';
import { parseManualSequence } from '../../manual-sequence';
export async function GET(request:Request){const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
 try{const db=sgqDb(),url=new URL(request.url),id=url.searchParams.get('id');
 if(id){const row=await db.prepare('SELECT * FROM sgq_records WHERE id=?').bind(id).first();if(!row)return Response.json({error:'Relatório não encontrado.'},{status:404});const revisions=await db.prepare('SELECT revision, data, created_at FROM sgq_revisions WHERE record_id=? ORDER BY revision DESC').bind(id).all();return Response.json({record:row,revisions:revisions.results});}
 const rows=await db.prepare('SELECT id,number,kind,date,equipment,inspector,result,data,revision,created_at,updated_at FROM sgq_records ORDER BY created_at DESC').all();return Response.json({records:rows.results});
 }catch(e){console.error(e);return Response.json({error:'Não foi possível carregar o histórico. Tente novamente.'},{status:500});}
}
export async function POST(request:Request){const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;
 try{const body=await request.json() as {id:string;kind:string;data:FormData;revision?:number};
 const kind=kindsForContract(await currentContract()).find(k=>k.id===body.kind);if(!kind||!body.id||!/^[-a-zA-Z0-9]{10,80}$/.test(body.id))return Response.json({error:'Identificação inválida.'},{status:400});
 const error=validateData(kind,body.data);if(error)return Response.json({error},{status:400});
 if(JSON.stringify(body.data).length>500000)return Response.json({error:'Relatório muito grande.'},{status:413});
 const db=sgqDb(),d=body.data,now=new Date().toISOString(),year=Number(d.common.date.slice(0,4));if(!Number.isInteger(year)||year<2000||year>2100||!/^\d{4}-\d{2}-\d{2}$/.test(d.common.date))return Response.json({error:'Confira a data da inspeção.'},{status:400});
 if(kind.id==='visual_solda'||kind.id==='liquido_penetrante'){
  const rows=d.groups[kind.id==='visual_solda'?'weldJoints':'lpJoints']||[];
  const stamps=await db.prepare("SELECT stamp FROM welders WHERE stamp<>''").all<{stamp:string}>();
  const known=new Set(stamps.results.map((row:{stamp:string})=>row.stamp));
  for(const row of rows)for(const field of ['rootStamp','fillStamp','finishStamp'])if(row[field]&&!known.has(row[field]))return Response.json({error:'Há um sinete que não consta no cadastro de soldadores. Atualize a seleção e tente novamente.'},{status:400});
 }
 const serialized=JSON.stringify(d);
 if(body.revision!==undefined){
 const old=await db.prepare('SELECT * FROM sgq_records WHERE id=?').bind(body.id).first<{kind:string;revision:number}>();if(!old)return Response.json({error:'Relatório não encontrado.'},{status:404});if(old.kind!==kind.id||old.revision!==body.revision)return Response.json({error:'Este relatório foi atualizado em outra tela. Reabra antes de editar.'},{status:409});
 const batch=await db.batch([
 db.prepare('INSERT INTO sgq_revisions (id,record_id,revision,data,created_at) SELECT ?::text,id,revision+1,?::text,?::text FROM sgq_records WHERE id=? AND revision=?').bind(crypto.randomUUID(),serialized,now,body.id,body.revision),
 db.prepare('UPDATE sgq_records SET equipment=?,inspector=?,date=?,result=?,data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING *').bind(d.common.equipment,d.common.inspector,d.common.date,d.result,serialized,now,body.id,body.revision)]);
 if(!batch[1].results.length)return Response.json({error:'O relatório mudou. Reabra para continuar.'},{status:409});return Response.json({record:batch[1].results[0]});
 }
 const key=kind.id+'-'+year;
 const existing=await db.prepare('SELECT * FROM sgq_records WHERE id=?').bind(body.id).first();
 if(existing)return Response.json({record:existing});
 const manual=parseManualSequence(d.common.manualSequence);
 if(manual!==null){const taken=await db.prepare('SELECT id FROM sgq_records WHERE kind=? AND year=? AND sequence=?').bind(kind.id,year,manual).first();if(taken)return Response.json({error:'Este número já está em uso neste tipo de relatório e ano. Escolha outro.'},{status:409});}
 try{await db.batch([
 db.prepare('INSERT INTO sgq_counters (key,value) VALUES (?,0) ON CONFLICT(key) DO NOTHING').bind(key),
 db.prepare('SELECT value FROM sgq_counters WHERE key=? FOR UPDATE').bind(key),
 db.prepare(`UPDATE sgq_counters SET value=CASE WHEN ?::int IS NOT NULL THEN ?::int ELSE (
  SELECT MIN(candidate) FROM (
   SELECT value+1 AS candidate FROM sgq_counters WHERE key=?
   UNION ALL SELECT sequence+1 FROM sgq_records WHERE kind=? AND year=?::int AND sequence >= (SELECT value FROM sgq_counters WHERE key=?)
  ) AS candidates WHERE candidate NOT IN (SELECT sequence FROM sgq_records WHERE kind=? AND year=?::int)
 ) END WHERE key=?`).bind(manual,manual,key,kind.id,year,key,kind.id,year,key),
 db.prepare("INSERT INTO sgq_records (id,number,kind,year,sequence,equipment,inspector,date,result,data,revision,created_at,updated_at) SELECT ?,?::text || '-' || printf('%03d',value) || '-' || ?::text,?,?::int,value,?,?,?,?,?,0,?,? FROM sgq_counters WHERE key=? AND NOT EXISTS (SELECT 1 FROM sgq_records WHERE id=?)").bind(body.id,kind.prefix,String(year).slice(-2),kind.id,year,d.common.equipment,d.common.inspector,d.common.date,d.result,serialized,now,now,key,body.id),
 db.prepare('INSERT OR IGNORE INTO sgq_revisions (id,record_id,revision,data,created_at) SELECT ?::text,id,0,data,created_at FROM sgq_records WHERE id=?').bind(body.id+'-0',body.id)
 ]);}catch(e){console.error(e);return Response.json({error:'Não foi possível reservar este número. Verifique se ele já está em uso e tente novamente.'},{status:409});}
 return Response.json({record:await db.prepare('SELECT * FROM sgq_records WHERE id=?').bind(body.id).first()},{status:201});
 }catch(e){console.error(e);return Response.json({error:'Não foi possível salvar. Seus campos foram mantidos; tente novamente.'},{status:500});}
}
