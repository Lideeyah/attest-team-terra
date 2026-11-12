import {Fault,ensure,cents,money,hash,canonical,id,now,row,bankMoney,nameMatch} from './core.js';
import {record,text,optionalText} from './validation.js';
import type {Store} from './store.js';
import {normalizeTariff,charges,type Tariff} from './tariff.js';
import {MockCarbon} from './mock-carbon.js';
export interface BankOptions{testOutcome?:'successful'|'failed'|'pending'|'timeout'|'reversed';}
export interface Bank{call<T=unknown>(method:string,path:string,body?:unknown,key?:string,options?:BankOptions):Promise<T>;}
export const MAX_BULK_ITEMS=200;
export interface BulkItem{destination_bank_code:string;destination_account:string;amount:string;narration?:string;reference:string;name_enquiry_ref?:string;expected_name?:string;}
export interface BulkRequest{source_account:string;batch_reference:string;auto_name_enquiry:boolean;expected_names_check?:'strict'|'loose';items:BulkItem[];}
export interface TransferResult extends Partial<BulkItem>{status:string;error_code?:string|null;message?:string;session_id?:string;transaction_id?:string;completed_at?:string;settled_at?:string|null;fee?:string|number;vat?:string|number;stamp_duty?:string|number;total_debit?:string|number;account_name?:string;}
export function bankFailureMessage(value:unknown):string|null{return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\d{7,}/g,'[redacted]').slice(0,500):null;}
export interface BulkResult{batch_reference:string;items:TransferResult[];status?:string;total_items?:number;accepted?:number;rejected?:number;total_amount?:string|number;total_fees?:string|number;}
export interface IdentityResult{match:boolean;confidence?:number;fields?:Record<string,string>;watchlisted:boolean;}
export interface NameResult{account_name?:string;kyc_level?:number;bvn_masked?:string;name_enquiry_ref:string;account_number:string;expires_at:string;}
export interface WalletResult{wallet_id:string;tier:number;balance:string|number;}
export interface BalanceResult{available_balance:string|number;currency:string;}
export interface WebhookRegistration{id:string;webhook_secret:string;}
export interface ForgeEvent{event_id:string;type?:string;event?:string;data:Record<string,unknown>;}
export interface Delivery{event_id:string;status:string;payload?:ForgeEvent;}
export interface ListResult<T>{items:T[];meta?:{total_pages?:number};}
// The gateway requires UUID keys. Preserve deterministic replay across processes.
export function bankKey(key:string){const h=hash(key);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-${((parseInt(h[16],16)&3)|8).toString(16)}${h.slice(17,20)}-${h.slice(20,32)}`;}
export class GatewayBudgetError extends Fault{constructor(){super('RATE_LIMITED',429);}}
export async function gatewaySlot(store:Store){await store.lock('gateway-budget',async tx=>{const minute=Math.floor(Date.now()/60000),r=await tx.get('tokens','gateway-budget');const count=(r?.minute===minute?r.count:0)??0;if(count>=55)throw new GatewayBudgetError();await tx.put('tokens',{id:'gateway-budget',createdAt:now(),minute,count:count+1});});}
export function normalizeTransfer(value:unknown):TransferResult{const r=record(value);return {...r,status:text(r.status),session_id:optionalText(r.session_id)??optionalText(r.transaction_id),settled_at:optionalText(r.settled_at)??optionalText(r.completed_at)} as TransferResult;}
export function bankPayload(value:unknown,field=''):unknown{
 if(['amount','price_per_credit'].includes(field)&&typeof value==='string'){ensure(cents(value)<=BigInt(Number.MAX_SAFE_INTEGER),'INVALID_REQUEST');return Number(value);}
 if(Array.isArray(value))return value.map(v=>bankPayload(v));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,bankPayload(v,key)]));
 return value;
}
export class LiveBank implements Bank{
 constructor(private store:Store){}
 async call<T=unknown>(method:string,path:string,body?:unknown,key:string=id(),options:BankOptions={}):Promise<T>{
  path=path.replace(/^\/transfers\/intrabank(?=\/|$)/,'/transfers/intra');
  await gatewaySlot(this.store);let response:Response;
  try{response=await fetch((process.env.BANK_URL??'http://bank-api.ingress-apisix.svc.cluster.local/v1')+path,{method,signal:AbortSignal.timeout(29000),headers:{'x-api-key':process.env.GATEWAY_KEY??'','Content-Type':'application/json','Idempotency-Key':bankKey(key),...(options.testOutcome&&process.env.NODE_ENV!=='production'?{'x-test-outcome':options.testOutcome}:{})},body:body===undefined?undefined:JSON.stringify(bankPayload(body))});}catch(error){if(error instanceof Fault)throw error;throw new Fault('TIMEOUT',504);}
  const result=record(await response.json());await this.store.put('audit',row({principal:'bank-adapter',action:'bank.response',detail:{request_id:optionalText(result.request_id)??null,method,path:path.split('?')[0].replace(/\d{10,}/g,'[redacted]'),httpStatus:response.status}}));
  if(!response.ok){const error=record(result.error??{});throw new Fault(optionalText(error.code)??'BANK_UNAVAILABLE',response.status);}
  let data:unknown=result.data;
  if(path==='/tariff')data=normalizeTariff(data);
  else if(path.startsWith('/transfers/bulk')){const batch=record(data);ensure(Array.isArray(batch.items),'INVALID_BANK_RESPONSE',502);data={...batch,items:batch.items.map(normalizeTransfer)};}
  else if(/^\/transfers\/[^/]+$/.test(path)&&data&&typeof data==='object'&&'status'in data)data=normalizeTransfer(data);
  else if(result.meta&&Array.isArray(data))data={items:data,meta:result.meta};
  return data as T;
 }
}
type MockTransfer = BulkItem & Omit<TransferResult,keyof BulkItem> & {created:number;ending:string;source_account:string;forced?:BankOptions['testOutcome'];total_debit:string;}
function items(value:unknown):BulkItem[]{ensure(Array.isArray(value)&&value.length>0&&value.length<=MAX_BULK_ITEMS,'INVALID_REQUEST');return (value as unknown[]).map(input=>{const r=record(input);return {destination_bank_code:text(r.destination_bank_code),destination_account:text(r.destination_account),amount:bankMoney(r.amount),reference:text(r.reference),narration:optionalText(r.narration),name_enquiry_ref:optionalText(r.name_enquiry_ref),expected_name:optionalText(r.expected_name)};});}
export class MockBank implements Bank{
 private results=new Map<string,MockTransfer>();private replays=new Map<string,{digest:string;data:unknown}>();private batches=new Map<string,string[]>();
 private enquiries=new Map<string,{account:string;bank:string;rail:string;expires:number;used:boolean}>();private balances=new Map<string,bigint>();private accountStates=new Map<string,'active'|'dormant'|'frozen'|'pnd'>();private deliveries=new Map<string,Delivery>();
 private names=new Map<string,string>();private flows=new Map<string,Record<string,unknown>[]>();private offset=0;
 private carbon=new MockCarbon(this,()=>this.time());
 bulkCalls=0;constructor(private clock=()=>Date.now()){}
 setAccountState(account:string,state:'active'|'dormant'|'frozen'|'pnd'){this.accountStates.set(account,state);}
 setAccountName(account:string,name:string){this.names.set(account,name);}
 setAccountFlows(account:string,flows:Record<string,unknown>[]){this.flows.set(account,flows);}
 advanceTime(milliseconds:number){ensure(Number.isSafeInteger(milliseconds)&&milliseconds>=0,'INVALID_REQUEST');this.offset+=milliseconds;}
 private time(){return this.clock()+this.offset;}
 snapshot(){return {version:1,results:[...this.results],replays:[...this.replays],batches:[...this.batches],enquiries:[...this.enquiries],balances:[...this.balances].map(([k,v])=>[k,v.toString()]),accountStates:[...this.accountStates],deliveries:[...this.deliveries],names:[...this.names],flows:[...this.flows],bulkCalls:this.bulkCalls,offset:this.offset,carbon:this.carbon.snapshot()};}
 restore(input:unknown){const r=record(input);ensure(r.version===1,'INVALID_REQUEST');const data=input as ReturnType<MockBank['snapshot']>;for(const key of ['results','replays','batches','enquiries','balances','accountStates','deliveries','names','flows'])ensure(Array.isArray(r[key]),'INVALID_REQUEST');this.results=new Map(data.results);this.replays=new Map(data.replays);this.batches=new Map(data.batches);this.enquiries=new Map(data.enquiries);this.balances=new Map(data.balances.map(([k,v])=>[k,BigInt(v)]));this.accountStates=new Map(data.accountStates);this.deliveries=new Map(data.deliveries);this.names=new Map(data.names);this.flows=new Map(data.flows);this.bulkCalls=data.bulkCalls;this.offset=data.offset;this.carbon.restore(data.carbon??[]);}
 async call<T=unknown>(method:string,path:string,input:unknown={},key:string=id(),options:BankOptions={}):Promise<T>{
  path=path.replace(/^\/transfers\/intrabank(?=\/|$)/,'/transfers/intra');
  const body=record(input??{}),digest=hash(canonical({method,path,body}));const replay=this.replays.get(key);if(method!=='GET'&&replay){ensure(replay.digest===digest,'DUPLICATE_REQUEST',409);return structuredClone(replay.data) as T;}
  let data:unknown;
  if(path==='/tariff')data={currency:'NGN',source:'mock-event-schedule',intrabank:{fee:'0.00',vat:'0.00',stamp_duty:'0.00'},bands:[{max:'5000.00',fee:'10.00'},{max:'50000.00',fee:'25.00'},{max:'999999999999.00',fee:'50.00'}],vatBps:750,stampDuty:'0.00',stampThreshold:'10000.00'};
  else if(path.includes('/name-enquiry')){
   const account=text(body.account_number),bank=optionalText(body.destination_bank_code)??'000014';ensure(this.accountStates.get(account)!=='dormant','ACCOUNT_DORMANT',422);ensure(this.accountStates.get(account)!=='frozen','BENEFICIARY_FROZEN',422);ensure(account!=='0000000001','ACCOUNT_NOT_FOUND',404);ensure(account!=='0000000002','TIMEOUT',504);ensure(bank!=='999999','BANK_UNAVAILABLE',503);
   const reference=id();this.enquiries.set(reference,{account,bank,rail:path.includes('/intra/')?'intra':'interbank',expires:this.time()+600000,used:false});data={account_number:account,account_name:this.names.get(account)??optionalText(body.mock_name)??'SYNTHETIC HOUSEHOLD',kyc_level:2,bvn_masked:'***********',name_enquiry_ref:reference,expires_at:new Date(this.time()+600000).toISOString()};
  }else if(['/transfers/intra','/transfers/interbank'].includes(path)){
   const enquiry=this.enquiries.get(text(body.name_enquiry_ref));ensure(enquiry&&!enquiry.used&&enquiry.expires>this.time(),'NAME_ENQUIRY_EXPIRED',409);ensure(enquiry.account===body.destination_account&&enquiry.bank===(body.destination_bank_code??'000014')&&enquiry.rail===path.split('/').at(-1),'NAME_ENQUIRY_MISMATCH',409);
   data=(await this.call<BulkResult>('POST','/transfers/bulk',{source_account:body.source_account,batch_reference:'single:'+body.reference,auto_name_enquiry:true,items:[body]},hash(key+':single'),options)).items[0];
  }else if(path.startsWith('/identity/'))data={bvn:body.bvn,nin:body.nin,match:!['22299999999','70099999999'].includes(String(body.bvn??body.nin)),confidence:100,fields:{first_name:'match',last_name:'match',date_of_birth:'match'},watchlisted:false};
  else if(path==='/merchants/onboard'&&method==='POST'){ensure(body.business_name&&body.rc_number&&body.tin,'INVALID_REQUEST');data={merchant_id:'mer_'+hash(key).slice(0,16),status:String(body.rc_number).endsWith('999')?'rejected':'under_review',checks:{cac:String(body.rc_number).endsWith('999')?'failed':'passed',tin:'passed',directors_bvn:'passed',settlement_account_name:'matched'}};}
  else if(path==='/wallets'&&method==='POST'){ensure(body.bvn&&body.owner_name&&body.phone&&body.reference,'INVALID_REQUEST');data={wallet_id:'wal_'+hash(key).slice(0,16),owner_name:body.owner_name,balance:'0.00',tier:2,max_balance:'500000.00'};}
  else if(path==='/virtual-accounts'&&method==='POST'){ensure(body.bvn&&body.customer_name&&body.customer_phone&&body.reference,'INVALID_REQUEST');const account='9'+hash(key).slice(0,9).split('').map(c=>parseInt(c,16)%10).join('');this.names.set(account,text(body.customer_name));data={account_number:account,account_name:body.customer_name,bank_name:'Xtradot Bank',nip_code:'000014',type:body.type,status:'active'};}
  else if(path==='/transfers/bulk'){
   const source=text(body.source_account),batchReference=text(body.batch_reference),entries=items(body.items);ensure(!['pnd','frozen'].includes(this.accountStates.get(source)??''),'ACCOUNT_RESTRICTED',403);
   ensure(body.expected_names_check===undefined||['strict','loose'].includes(String(body.expected_names_check)),'INVALID_REQUEST');
   for(const item of entries){ensure(item.name_enquiry_ref||body.auto_name_enquiry===true,'INVALID_REQUEST');ensure(!this.results.has(item.reference),'DUPLICATE_REQUEST',409);
    if(item.name_enquiry_ref){const enquiry=this.enquiries.get(item.name_enquiry_ref);ensure(enquiry&&!enquiry.used,'DUPLICATE_REQUEST',409);ensure(enquiry.expires>this.time(),'NAME_ENQUIRY_EXPIRED',409);ensure(enquiry.account===item.destination_account&&enquiry.bank===item.destination_bank_code,'NAME_ENQUIRY_MISMATCH',409);}
   }
   ensure(!this.batches.has(batchReference),'DUPLICATE_REQUEST',409);this.bulkCalls++;this.batches.set(batchReference,entries.map(i=>i.reference));const tariff=normalizeTariff(await this.call('GET','/tariff'));
   const results=entries.map(item=>{
    if(item.name_enquiry_ref)this.enquiries.get(item.name_enquiry_ref)!.used=true;
    const ending=item.amount.slice(-2);let status=item.destination_bank_code==='000014'?'successful':'pending',error_code:string|null=null;
    if(this.accountStates.get(item.destination_account)==='frozen'){status='failed';error_code='BENEFICIARY_FROZEN';}else if(this.accountStates.get(item.destination_account)==='dormant'){status='failed';error_code='ACCOUNT_DORMANT';}else if(item.reference.startsWith('DUP-')){status='failed';error_code='DUPLICATE_REQUEST';}else if(item.destination_account==='0000000001'){status='failed';error_code='ACCOUNT_NOT_FOUND';}else if(item.destination_bank_code==='999999'){status='failed';error_code='BANK_UNAVAILABLE';}else if(ending==='01'){status='failed';error_code='INSUFFICIENT_FUNDS';}else if(['02','03','05'].includes(ending)||item.destination_account==='0000000002')status='pending';
    if(item.expected_name&&this.names.has(item.destination_account)){const expected=item.expected_name.toUpperCase().trim(),resolved=this.names.get(item.destination_account)!.toUpperCase().trim();if(body.expected_names_check==='strict'?expected!==resolved:nameMatch(expected,resolved)!=='match'){status='failed';error_code='NAME_MISMATCH';}}
    if(options.testOutcome){status=options.testOutcome==='timeout'?'pending':options.testOutcome;error_code=status==='failed'?'BANK_UNAVAILABLE':null;}
    const charge=charges(tariff,item.amount,item.destination_bank_code),total=cents(item.amount)+cents(charge.fee)+cents(charge.vat)+cents(charge.stamp_duty);
    const result:MockTransfer={...item,status,error_code,session_id:id(),settled_at:status==='successful'?new Date(this.time()).toISOString():null,...charge,total_debit:money(total),created:this.time(),ending,source_account:source,forced:options.testOutcome};
    if(status!=='failed'&&status!=='reversed')this.balances.set(source,(this.balances.get(source)??10000000000n)-total);
    this.results.set(item.reference,result);const event_id=hash(item.reference+':'+status);this.deliveries.set(event_id,{event_id,status:ending==='05'?'pending':'delivered',payload:{event_id,type:'transfer.'+status,data:{...result}}});return result;
   });data={batch_reference:batchReference,status:results.every(r=>['successful','failed','reversed'].includes(r.status))?'completed':'processing',total_items:results.length,accepted:results.filter(r=>r.status!=='failed').length,rejected:results.filter(r=>r.status==='failed').length,total_amount:money(results.filter(r=>r.status!=='failed').reduce((sum,r)=>sum+cents(r.amount),0n)),items:results};this.replays.set(key,{digest,data:structuredClone(data)});if(options.testOutcome==='timeout'||entries.some(i=>i.amount.endsWith('.02')||i.destination_account==='0000000002'))throw new Fault('TIMEOUT',504);
  }else if(path.startsWith('/transfers/bulk/')){const references=this.batches.get(decodeURIComponent(path.split('/').at(-1)!));ensure(references,'NOT_FOUND',404);data={items:await Promise.all(references.map(reference=>this.call<TransferResult>('GET','/transfers/'+reference)))};}
  else if(path.startsWith('/transfers/')){
   const result=this.results.get(decodeURIComponent(path.split('/').at(-1)!));ensure(result,'NOT_FOUND',404);const age=this.time()-result.created,previous=result.status;
   if(!result.forced){if(result.status==='pending'&&!['02','03','05'].includes(result.ending)&&age>=5000)result.status='successful';if(result.ending==='02'&&age>=30000)result.status='reversed';if(result.ending==='03'&&age>=120000||result.ending==='05'&&age>=5000)result.status='successful';if(result.ending==='04'&&age>=60000)result.status='reversed';}
   if(result.status==='successful'&&previous!=='successful')result.settled_at=new Date(this.time()).toISOString();if(result.status==='reversed'&&previous!=='reversed')this.balances.set(result.source_account,(this.balances.get(result.source_account)??0n)+cents(result.total_debit));data=result;
  }else if(/^\/(?:mock|admin)\/accounts\/\d{10}\/status$/.test(path)&&method==='POST'){ensure(['active','frozen','dormant','pnd'].includes(text(body.status)),'INVALID_REQUEST');this.setAccountState(path.split('/')[3],text(body.status) as 'active'|'frozen'|'dormant'|'pnd');data={status:body.status};
  }else if(/^\/mock\/accounts\/\d{10}\/flows/.test(path)){data={items:this.flows.get(path.split('/')[3])??[],meta:{total_pages:1}};
  }else if(path.includes('balance'))data={available_balance:money(this.balances.get(path.split('/')[2])??10000000000n),currency:'NGN'};
  else if(/^\/admin\/accounts\/[^/]+\/fund$/.test(path)){const account=path.split('/')[3],amount=bankMoney(body.amount);this.balances.set(account,(this.balances.get(account)??10000000000n)+cents(amount));data={account_number:account,amount};}
  else if(path==='/webhooks'&&method==='POST')data={id:id(),webhook_secret:hash(key),...body};
  else if(path.startsWith('/webhooks/deliveries/')&&path.endsWith('/replay')){const delivery=this.deliveries.get(path.split('/')[3]);ensure(delivery,'NOT_FOUND',404);delivery.status='delivered';data={accepted:true,payload:delivery.payload};}
  else if(path.startsWith('/webhooks/deliveries'))data=[...this.deliveries.values()];
  else if(path.startsWith('/carbon/')||path.startsWith('/payments/'))data=await this.carbon.call(method,path,body,key);
  else if(path.includes('/settlements')||path.includes('/reconciliation'))data=[];
  else throw new Fault('NOT_FOUND',404);
  if(method!=='GET')this.replays.set(key,{digest,data:structuredClone(data)});return structuredClone(data) as T;
 }
}
