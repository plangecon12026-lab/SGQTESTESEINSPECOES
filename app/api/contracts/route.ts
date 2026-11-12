import {env} from '../../../db/platform';
import {createContract,ensureInitialContracts} from '../../../db/contracts';
import {managementIdentity,ownerApiGuard,validOrigin} from '../../management-auth';
export async function GET(){
 try{await ensureInitialContracts();const rows=await env.DB.prepare('SELECT id,name,created_at FROM contracts ORDER BY created_at,id').all();const identity=await managementIdentity();return Response.json({contracts:rows.results,canCreate:!!identity?.owner},{headers:{'Cache-Control':'no-store'}})}
 catch(e){console.error(e);return Response.json({error:'Não foi possível carregar os contratos. Tente novamente.'},{status:503})}
}
export async function POST(request:Request){
 const guard=await ownerApiGuard();if(guard)return guard;
 if(!validOrigin(request))return Response.json({error:'Solicitação inválida.'},{status:403});
 const body=await request.json() as {name?:string};const name=body.name?.trim();
 if(!name||name.length<2||name.length>100)return Response.json({error:'Informe um nome de 2 a 100 caracteres.'},{status:400});
 const existing=await env.DB.prepare('SELECT id FROM contracts WHERE lower(name)=lower(?)').bind(name).first();if(existing)return Response.json({error:'Já existe um contrato com esse nome.'},{status:409});
 try{const id='c'+crypto.randomUUID().replaceAll('-','');return Response.json({contract:await createContract(id,name)},{status:201})}catch(e){console.error(e);return Response.json({error:'Não foi possível criar o contrato.'},{status:500})}
}
