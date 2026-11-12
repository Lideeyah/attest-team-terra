import {ensure,hash,row,now} from './core.js';
import {record,text} from './validation.js';
import type {Service} from './service.js';
import type {Principal} from './core.js';

export async function registerCarbon(s:Service,p:Principal,projectId:string,value:unknown){
 const project=await s.project(p,projectId,true),input=record(value),owner=record(input.owner),location=record(input.location);
 for(const key of ['name','contact_name','phone','payout_account','bank_code'])text(owner[key]);
 for(const key of ['state','lga'])text(location[key]);ensure(typeof location.lat==='number'&&Math.abs(location.lat)<=90&&typeof location.lng==='number'&&Math.abs(location.lng)<=180,'INVALID_REQUEST');
 const request={name:project.name,type:text(input.type),location,owner,methodology:project.methodology};
 const result=record(await s.providers.bank.call('POST','/carbon/projects',request,hash(project.id+':register')));
 const carbonId=text(result.project_id);await s.db.put('projects',{...project,carbonId,carbonPayoutAccount:owner.payout_account,carbonPayoutBankCode:owner.bank_code});return result;
}
export async function submitMrv(s:Service,p:Principal,projectId:string,value:unknown,key:string){
 const project=await s.project(p,projectId,true);ensure(project.carbonId,'REGISTRY_NOT_FOUND',404);const input=record(value),period=record(input.period);
 ensure(typeof period.from==='string'&&typeof period.to==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(period.from)&&/^\d{4}-\d{2}-\d{2}$/.test(period.to)&&Date.parse(period.to)>=Date.parse(period.from),'INVALID_REQUEST');
 text(input.metric);ensure(typeof input.value==='number'&&Number.isFinite(input.value)&&input.value>0,'INVALID_REQUEST');
 const url=new URL(text(input.evidence_url));ensure(url.protocol==='https:','INVALID_REQUEST');
 if(input.sensor_ids!==undefined)ensure(Array.isArray(input.sensor_ids)&&input.sensor_ids.length<=1000&&input.sensor_ids.every(v=>typeof v==='string'),'INVALID_REQUEST');
 const result=record(await s.providers.bank.call('POST',`/carbon/projects/${encodeURIComponent(project.carbonId)}/mrv`,input,key));
 const submissionId=text(result.submission_id);await s.db.put('tokens',row({id:'mrv:'+submissionId,type:'carbon-mrv',projectId,submissionId}));return result;
}
export async function listMrv(s:Service,p:Principal,projectId:string){
 await s.project(p,projectId);const records=await s.db.list('tokens',{projectId,type:'carbon-mrv'});ensure(records.length<=100,'INVALID_REQUEST');
 return Promise.all(records.map(r=>s.providers.bank.call('GET','/carbon/mrv/'+encodeURIComponent(String(r.submissionId)))));
}
export async function retireCredits(s:Service,p:Principal,projectId:string,value:unknown,key:string){
 const project=await s.project(p,projectId,true);ensure(project.carbonId,'REGISTRY_NOT_FOUND',404);const input=record(value),buyer=record(input.buyer);
 text(input.credit_batch_id);text(input.payment_reference);text(input.retirement_reason);text(buyer.name);text(buyer.email);
 ensure(Number.isInteger(input.quantity)&&Number(input.quantity)>0&&input.currency==='NGN','INVALID_REQUEST');
 const owned=await s.db.list('tokens',{projectId,type:'carbon-mrv'});let verified=false;
 for(const mrv of owned){const status=record(await s.providers.bank.call('GET','/carbon/mrv/'+encodeURIComponent(String(mrv.submissionId))));if(status.credit_batch_id===input.credit_batch_id&&status.status==='verified')verified=true;}
 ensure(verified,'FORBIDDEN',403);
 const result=record(await s.providers.bank.call('POST','/carbon/credits/retire',input,key));const retirementId=text(result.retirement_id);
 const payout=record(result.payout??{});await s.db.put('tokens',row({id:'retirement:'+retirementId,type:'carbon-retirement',projectId,retirementId,payoutReference:payout.reference,payoutAccount:payout.destination_account,grossAmount:result.total_amount,registryFee:result.registry_fee,payoutAmount:payout.amount,payoutState:payout.status}));
 await s.processJob(row({type:'forge-event',data:{event_id:'verified-before-retirement:'+retirementId,type:'carbon.mrv.verified',data:{project_id:project.carbonId}}}));
  await s.processJob(row({type:'forge-event',data:{event_id:'retirement:'+retirementId,type:'carbon.credits.retired',data:{...result,project_id:project.carbonId}}}));return result;
}
export async function certificates(s:Service,p:Principal,projectId:string){
 const project=await s.project(p,projectId);const records=await s.db.list('tokens',{projectId,type:'carbon-retirement'});
 const ids=new Set(records.map(r=>String(r.retirementId)));if(project.retirement?.retirement_id)ids.add(project.retirement.retirement_id);
 ensure(ids.size<=100,'INVALID_REQUEST');return Promise.all([...ids].map(id=>s.providers.bank.call('GET','/carbon/certificates/'+encodeURIComponent(id))));
}
