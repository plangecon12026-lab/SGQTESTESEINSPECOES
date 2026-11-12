import { globalDb } from './contract-context';
import { sql } from './pg';
export type Contract = {id:string;name:string;created_at:string};
// Tabelas com prefixo são criadas pela função SQL sgq_create_contract_tables:
// copia apenas estrutura e índices; nunca registros, usuários ou contadores.
export async function createContract(id:string,name:string) {
 const existing=await globalDb.prepare('SELECT id,name,created_at FROM contracts WHERE id=?').bind(id).first<Contract>();
 if(existing)return existing;
 const now=new Date().toISOString();
 await sql().begin(async tx=>{
  await tx`select sgq_create_contract_tables(${id})`;
  await tx`insert into contracts (id,name,created_at) values (${id},${name},${now}) on conflict do nothing`;
 });
 return {id,name,created_at:now};
}
export async function ensureInitialContracts(){await createContract('s11d','Implantação S11D');await createContract('fabrica','Fábrica');}
