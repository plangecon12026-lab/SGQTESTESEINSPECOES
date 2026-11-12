import { fieldApiGuard } from '../../../management-auth';
import {currentContract,contractFileKey} from '../../../../db/contract-context';
import {env} from '../../../../db/platform';
export async function POST(request:Request){const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;try{
 const type=request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()||'';
 if(!['image/jpeg','image/png','image/webp'].includes(type))return Response.json({error:'Use JPG, PNG ou WebP de até 8 MB.'},{status:400});
 const declared=Number(request.headers.get('content-length')||0);
 if(declared>8*1024*1024)return Response.json({error:'A foto excede 8 MB.'},{status:413});
 const bytes=await request.arrayBuffer();
 if(!bytes.byteLength||bytes.byteLength>8*1024*1024)return Response.json({error:'Use uma foto de até 8 MB.'},{status:400});
 const key='sgq-photos/'+crypto.randomUUID();await env.BUCKET.put(await contractFileKey(key),bytes,{httpMetadata:{contentType:type}});
 return Response.json({url:'/api/sgq/photo?key='+key+'&contrato='+await currentContract()});
}catch{return Response.json({error:'Não foi possível enviar a foto.'},{status:500});}}
export async function GET(request:Request){const fieldDenied=await fieldApiGuard();if(fieldDenied)return fieldDenied;const key=new URL(request.url).searchParams.get('key')??'';if(!/^sgq-photos\/[a-f0-9-]{36}$/.test(key))return new Response('Não encontrado',{status:404});try{const obj=await env.BUCKET.get(await contractFileKey(key));if(!obj)return new Response('Não encontrado',{status:404});return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType??'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=3600'}});}catch{return new Response('Indisponível',{status:503});}}
