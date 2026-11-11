import {canonical,ensure,hash,row} from './core.js';
import {record,text} from './validation.js';
import type {Store} from './store.js';
import type {Bank} from './bank.js';
const requiredOperations=['fund','register','submit_mrv','review_mrv','retire','register_webhook'] as const;
export const reseedOperations=[...requiredOperations,'checkout','pay_collection'] as const;
export interface ReseedStep{id:string;operation:typeof reseedOperations[number];path:string;body:unknown;}
export function reseedManifest(value:unknown):ReseedStep[]{
 ensure(Array.isArray(value)&&value.length>=6&&value.length<=30,'INVALID_REQUEST');const ids=new Set<string>();
 const steps=(value as unknown[]).map(input=>{const r=record(input);const step={id:text(r.id),operation:text(r.operation) as ReseedStep['operation'],path:text(r.path),body:r.body};ensure(/^[a-z][a-z0-9_-]{0,40}$/.test(step.id)&&!ids.has(step.id)&&reseedOperations.includes(step.operation)&&/^\/(admin\/accounts\/|carbon\/|payments\/|webhooks$)/.test(step.path)&&!step.path.includes('..')&&!step.path.includes('://')&&step.body!==undefined,'INVALID_REQUEST');ids.add(step.id);return step;});
 for(const operation of requiredOperations)ensure(steps.some(s=>s.operation===operation),'INVALID_REQUEST');return steps;
}
function resolve(value:unknown,results:Map<string,unknown>):unknown{
 if(typeof value==='string')return value.replace(/\$\{([a-z][a-z0-9_-]*)\.([a-z][a-z0-9_.]*)\}/g,(_match:string,step:string,field:string)=>{let result=results.get(step);for(const key of field.split('.'))result=record(result)[key];ensure(typeof result==='string'||typeof result==='number','INVALID_BANK_RESPONSE',502);return String(result);});
 if(Array.isArray(value))return value.map(item=>resolve(item,results));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,resolve(v,results)]));return value;
}
export async function reseedBank(db:Store,bank:Bank,steps:ReseedStep[],sessionId:string){
 const results=new Map<string,unknown>();
 for(const step of steps){const key='bank-reseed:'+sessionId+':'+step.id;const digest=hash(canonical(step));const prior=await db.get('tokens',key);if(prior){ensure(prior.digest===digest,'DUPLICATE_REQUEST',409);results.set(step.id,prior.result);continue;}
  // A fresh session rebuilds a reset sandbox. Resume the SAME session after an
  // uncertain response, preserving the gateway's UUID idempotency key.
  const result=await bank.call('POST',resolve(step.path,results) as string,resolve(step.body,results),hash(key));
  await db.put('tokens',row({id:key,type:'bank-reseed',digest,result}));results.set(step.id,result);
  if(step.operation==='register_webhook'){const response=record(result);ensure(typeof response.webhook_secret==='string','INVALID_BANK_RESPONSE',502);await db.put('tokens',row({id:'forge-webhook-secret',secret:response.webhook_secret}));}
  await db.put('audit',row({principal:'bank-reseed',action:'sandbox.precondition_rebuilt',detail:{sessionId,step:step.id,operation:step.operation}}));
 }
 return {sessionId,completed:steps.map(step=>step.id)};
}
