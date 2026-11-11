import { GatewayBudgetError, MAX_BULK_ITEMS, type BulkResult, type BulkRequest, type TransferResult, normalizeTransfer, bankFailureMessage } from './bank.js';
import { Fault, ensure, hash, now, row } from './core.js';
import type {Run, Transfer} from './models.js';
import type {Store} from './store.js';
import type {Service} from './service.js';

export async function prepareBatches(db:Store,run:Run,transfers:Transfer[],prefix:string){
 const references:string[]=[];
 for(let offset=0;offset<transfers.length;offset+=MAX_BULK_ITEMS){
  const group=transfers.slice(offset,offset+MAX_BULK_ITEMS),reference=prefix+'-B'+(Math.floor(offset/MAX_BULK_ITEMS)+1);
  const items=[];
  for(const t of group){const p=await db.get('participants',t.participantId);ensure(p,'NOT_FOUND',404);items.push({destination_bank_code:t.bankCode,destination_account:t.accountNumber,amount:t.amount,narration:'Community benefit share',reference:t.reference,expected_name:p.resolvedAccountName??p.name});}
  const request:BulkRequest={source_account:run.sourceAccount!,batch_reference:reference,auto_name_enquiry:true,expected_names_check:'loose',items};
  await db.put('transfer_batches',row({id:hash(reference),projectId:run.projectId,runId:run.id,reference,key:hash(reference),request,transferIds:group.map(t=>t.id),state:'pending'}));
  references.push(reference);
 }
 return references;
}

export async function applyBankResult(s:Service,t:Transfer,input:TransferResult){
 let result=normalizeTransfer(input);
 // Bulk acceptance and webhook payloads may omit settlement evidence. Never infer it.
 if(['successful','settled'].includes(result.status)&&t.state!=='settled'&&
  [result.amount,result.fee,result.vat,result.stamp_duty,result.total_debit,result.settled_at,result.session_id].some(v=>v===undefined||v===null)){
  result=normalizeTransfer(await s.providers.bank.call('GET','/transfers/'+encodeURIComponent(t.reference)));
 }
 await s.applyTransfer(t.id,result);
}

export async function submitPendingBatches(s:Service,runId:string){
 for(const pending of await s.db.list('transfer_batches',{runId,state:'pending'})){
  const batch=await s.db.lock('batch:'+pending.id,async tx=>{
   const current=await tx.get('transfer_batches',pending.id);if(!current||current.state!=='pending'||Date.parse(current.nextAt??'1970-01-01')>Date.now())return;
   const run=await tx.get('runs',runId);ensure(run,'NOT_FOUND',404);
   if(Date.parse(run.closesAt)<=Date.now()){
    for(const transferId of current.transferIds){const t=await tx.get('transfers',transferId);if(t?.state==='queued')await tx.put('transfers',{...t,state:'failed',failureClass:'PERIOD_CLOSED',submissionRejected:true});}
    await tx.put('transfer_batches',{...current,state:'rejected',lastError:'PERIOD_CLOSED'});return;
   }
   await tx.put('transfer_batches',{...current,state:'submitting'});
   for(const transferId of current.transferIds){const t=await tx.get('transfers',transferId);ensure(t,'NOT_FOUND',404);await tx.put('transfers',{...t,state:'in_flight',submittedAt:now()});await s.emit(runId,'transfer.in_flight',t.id,tx);}
   return current;
  });
  if(!batch)continue;
  let result:BulkResult;
  try{result=await s.providers.bank.call<BulkResult>('POST','/transfers/bulk',batch.request,batch.key);}
  catch(error){
   // A locally exhausted budget or explicit 429 has not accepted the payment.
   const deferred=error instanceof GatewayBudgetError||error instanceof Fault&&error.status===429;
   const rejected=error instanceof Fault&&error.status>=400&&error.status<500&&![408,409,429].includes(error.status);
   await s.db.put('transfer_batches',{...batch,state:deferred?'pending':rejected?'rejected':'unknown',nextAt:deferred?new Date((Math.floor(Date.now()/60000)+1)*60000).toISOString():undefined,lastError:error instanceof Fault?error.code:'TIMEOUT'});
   if(deferred||rejected)for(const transferId of batch.transferIds){const t=await s.required('transfers',transferId);await s.db.put('transfers',{...t,state:deferred?'queued':'failed',failureClass:rejected?(error as Fault).code:null,failureMessage:rejected?bankFailureMessage(error instanceof Error?error.message:null):null,submissionRejected:rejected});}
   await s.audit('worker',deferred?'batch.deferred':'batch.requery_required',batch.projectId,{runId,batchReference:batch.reference,code:error instanceof Fault?error.code:'TIMEOUT'});
   if(deferred)break;continue;
  }
  await s.db.put('transfer_batches',{...batch,state:'accepted'});
  const transfers=await s.db.list('transfers',{runId});
  for(const item of result.items??[]){const t=transfers.find(t=>t.reference===item.reference);if(!t||!batch.transferIds.includes(t.id))continue;
   try{await applyBankResult(s,t,item);}catch(error){await s.audit('worker','batch.evidence_pending',batch.projectId,{runId,transferId:t.id,code:error instanceof Fault?error.code:'INVALID_BANK_RESPONSE'});}
  }
 }
}
