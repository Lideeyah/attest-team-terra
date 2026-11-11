import {Fault,ensure,hash,cents,money,bankMoney} from './core.js';
import {record,text} from './validation.js';
import type {Bank,BulkResult} from './bank.js';

export class MockCarbon{
 private records=new Map<string,Record<string,unknown>>();
 constructor(private bank:Bank,private clock:()=>number){}
 snapshot(){return [...this.records];}
 restore(records:[string,Record<string,unknown>][]=[]){this.records=new Map(records);}
 private read(id:string){const r=this.records.get(id);ensure(r,'NOT_FOUND',404);return r;}
 async call(method:string,path:string,value:unknown,key:string):Promise<unknown>{
  const b=record(value),stamp=new Date(this.clock()).toISOString();
  if(path==='/carbon/projects'&&method==='POST'){
   const owner=record(b.owner);text(b.name);text(b.type);record(b.location);text(owner.payout_account);text(owner.bank_code);
   const enquiry=await this.bank.call<{account_name:string}>('POST','/transfers/'+(owner.bank_code==='000014'?'intra':'interbank')+'/name-enquiry',{account_number:owner.payout_account,destination_bank_code:owner.bank_code},hash(key+':owner'));
   const project_id='prj_'+hash(key).slice(0,12),r={...b,project_id,status:'registered',payout_account_name:enquiry.account_name,created_at:stamp};this.records.set(project_id,r);return r;
  }
  if(/^\/carbon\/projects\/[^/]+$/.test(path)&&method==='GET')return this.read(path.split('/')[3]);
  if(/^\/carbon\/projects\/[^/]+\/mrv$/.test(path)&&method==='POST'){
   const project_id=path.split('/')[3];this.read(project_id);record(b.period);const metric=text(b.metric);
   const factor=metric==='energy_generated_kwh'?0.00053:metric==='trees_planted'?0.022:metric==='stoves_distributed'?1.8:0;ensure(factor&&typeof b.value==='number'&&b.value>0,'INVALID_REQUEST');
   const submission_id='mrv_'+hash(key).slice(0,12),r={...b,project_id,submission_id,status:'under_review',estimated_tco2e:Math.round(b.value*factor*100)/100,auto_verify_at:new Date(this.clock()+60000).toISOString()};this.records.set(submission_id,r);return r;
  }
  if(/^\/carbon\/mrv\/[^/]+(?:\/review)?$/.test(path)){
   const r=this.read(path.split('/')[3]);
   if(method==='POST'){ensure(['verified','rejected'].includes(text(b.decision)),'INVALID_REQUEST');r.status=b.decision;}
   else if(r.status==='under_review'&&Date.parse(String(r.auto_verify_at))<=this.clock())r.status='verified';
   if(r.status==='verified'){r.verified_tco2e=r.estimated_tco2e;r.credits_issued=Math.floor(Number(r.estimated_tco2e));r.credit_batch_id='crb_'+String(r.submission_id).slice(4);}
   return r;
  }
  if(path==='/payments/checkout'&&method==='POST'){
   ensure(b.merchant_id==='mer_900','NOT_FOUND',404);const reference=text(b.reference);const r={reference,amount:bankMoney(b.amount),status:'pending',merchant_id:b.merchant_id,amount_paid:'0.00'};this.records.set(reference,r);return r;
  }
  if(/^\/payments\/[^/]+\/simulate-transfer$/.test(path)&&method==='POST'){const r=this.read(path.split('/')[2]);r.amount_paid=bankMoney(b.amount??r.amount);r.status=cents(r.amount_paid)>=cents(r.amount)?'successful':'partial';return r;}
  if(/^\/payments\/[^/]+\/verify$/.test(path)&&method==='GET')return this.read(path.split('/')[2]);
  if(path==='/carbon/credits/retire'&&method==='POST'){
   const mrv=[...this.records.values()].find(r=>r.credit_batch_id===b.credit_batch_id);ensure(mrv?.status==='verified','INVALID_REQUEST');const p=this.read(text(mrv.project_id)),owner=record(p.owner),payment=this.read(text(b.payment_reference));
   const quantity=Number(b.quantity);ensure(Number.isInteger(quantity)&&quantity>0,'INVALID_REQUEST');
   const sold=[...this.records.values()].filter(r=>r.credit_batch_id===b.credit_batch_id&&r.status==='retired').reduce((n,r)=>n+Number(r.quantity),0);ensure(sold+quantity<=Number(mrv.credits_issued),'INSUFFICIENT_FUNDS',402);
   const total=cents(bankMoney(b.price_per_credit))*BigInt(quantity);ensure(payment.status==='successful'&&payment.merchant_id==='mer_900'&&!payment.used&&cents(payment.amount_paid)>=total,'INVALID_REQUEST');
   const fee=total*2n/100n,reference='CARBON-'+hash(key).slice(0,20),retirement_id='ret_'+hash(key).slice(0,12);
   const payout=await this.bank.call<BulkResult>('POST','/transfers/bulk',{source_account:'0123456793',batch_reference:reference,auto_name_enquiry:true,items:[{reference,destination_account:owner.payout_account,destination_bank_code:owner.bank_code,amount:money(total-fee),narration:'Synthetic registry proceeds'}]},hash(key+':payout'));
   const r={retirement_id,project_id:mrv.project_id,credit_batch_id:b.credit_batch_id,quantity,total_amount:money(total),registry_fee:money(fee),status:'retired',credits_remaining_in_batch:Number(mrv.credits_issued)-sold-quantity,payout:payout.items[0],certificate_url:'/v1/carbon/certificates/'+retirement_id};this.records.set(retirement_id,r);payment.used=true;return r;
  }
  if(/^\/carbon\/certificates\/[^/]+$/.test(path)&&method==='GET'){const r=this.read(path.split('/')[3]);return {...r,synthetic:true};}
  throw new Fault('NOT_FOUND',404);
 }
}
