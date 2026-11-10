import {ensure,hash,row,canonical,bankMoney} from './core.js';
import {record,text} from './validation.js';
import type {Service} from './service.js';
import type {Flow} from './models.js';
import type {ListResult} from './bank.js';

export async function onwardPage(s:Service,participantId:string,page:number){
 const participant=await s.required('participants',participantId);
 const response=await s.providers.bank.call<ListResult<Record<string,unknown>>>('GET',`/transactions?account=${encodeURIComponent(participant.accountNumber)}&page=${page}&per_page=20&type=transfer`);
 ensure(response&&Array.isArray(response.items),'INVALID_BANK_RESPONSE',502);
 const receipts=(await s.db.list('transfers',{participantId,state:'settled'})).filter(t=>t.settledAt);
 const flows:Flow[]=[];
 for(const summary of response.items){
  if(summary.direction!=='debit'||summary.type!=='transfer'||summary.status!=='successful')continue;
  const reference=text(summary.reference),cacheId='onward-transaction:'+hash(participantId+':'+reference),cached=await s.db.get('tokens',cacheId);
  if(cached?.flows){flows.push(...cached.flows);continue;}
  const detail=record(await s.providers.bank.call('GET','/transactions/'+encodeURIComponent(reference)));
  const counterparty=record(detail.counterparty??{}),history=Array.isArray(detail.status_history)?detail.status_history.map(record):[];
  const sentAt=typeof detail.completed_at==='string'?detail.completed_at:history.find(h=>h.status==='successful')?.at;
  ensure(typeof sentAt==='string'&&Number.isFinite(Date.parse(sentAt)),'INVALID_BANK_RESPONSE',502);
  const received=receipts.filter(t=>Date.parse(t.settledAt!)<=Date.parse(sentAt)).sort((a,b)=>Date.parse(b.settledAt!)-Date.parse(a.settledAt!))[0];
  const found:Flow[]=received&&typeof counterparty.account_number==='string'?[{participantId,to:counterparty.account_number,receivedAt:received.settledAt!,sentAt,amount:bankMoney(detail.amount)}]:[];
  await s.db.put('tokens',row({id:cacheId,projectId:participant.projectId,type:'onward-transaction',flows:found,sourceHash:hash(canonical({reference,status:detail.status}))}));flows.push(...found);
 }
 return {items:flows,meta:response.meta};
}
