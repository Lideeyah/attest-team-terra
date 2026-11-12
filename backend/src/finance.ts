import type {Service} from './service.js';
import type {Store} from './store.js';
import type {IncomeReceipt,AutomationPolicy,IncomeAllocation,AllocationItem,FundsEvent} from './contracts.js';
import {ensure,row,now,id,hash,canonical,cents,money,bankMoney,Fault,nameMatch} from './core.js';
import {record,text} from './validation.js';
import {estimateCharges} from './providers.js';
import {currentPeriod,reportingCadence,periodDeadline} from './period.js';
import type {BalanceResult} from './bank.js';

/** Largest remainder allocation preserves every kobo; ties use stable recipient IDs. */
export function apportion(total:bigint,weights:{id:string;weight:bigint}[]){
 const sum=weights.reduce((n,w)=>n+w.weight,0n);ensure(total>=0n&&sum>0n&&weights.every(w=>w.weight>=0n),'ALLOCATION_INPUT_REQUIRED',422);
 const parts=weights.map(w=>({...w,amount:total*w.weight/sum,remainder:total*w.weight%sum}));
 let remaining=total-parts.reduce((n,w)=>n+w.amount,0n);
 for(const part of [...parts].sort((a,b)=>a.remainder===b.remainder?a.id.localeCompare(b.id):a.remainder>b.remainder?-1:1)){if(!remaining)break;part.amount++;remaining--;}
 return new Map(parts.map(p=>[p.id,p.amount]));
}
export class Finance {
 constructor(public s:Service,public db:Store=s.db){}
 async policy(projectId:string){return (await this.db.list('automation_policies',{projectId})).sort((a,b)=>a.revision-b.revision).at(-1)??null;}
 async event(projectId:string,type:string,amount:string,reference:string,lines:FundsEvent['lines']){
  const eventId=hash('funds:'+type+':'+reference);if(await this.db.get('funds_events',eventId))return;
  ensure(lines.reduce((n,l)=>n+cents(l.debit)-cents(l.credit),0n)===0n,'RECONCILIATION_MISMATCH',409);
  return this.db.lock('funds-chain:'+projectId,async tx=>{
   if(await tx.get('funds_events',eventId))return;
   const previous=(await tx.list('funds_events',{projectId})).at(-1);
   const body={id:eventId,projectId,type,amount,reference,lines,createdAt:now(),previousHash:previous?.hash??null};const digest=hash(canonical(body));
   await tx.put('funds_events',{...body,hash:digest,signature:this.s.signer.sign(digest),publicKey:this.s.signer.publicKey});
   await tx.put('jobs',row({id:'funds-anchor:'+eventId,type:'funds-anchor',data:{projectId,eventId},state:'pending',attempts:0,nextAt:now()}));
  });
 }
 async savePolicy(projectId:string,input:unknown,actor:string){
  const b=record(input);return this.db.lock('policy:'+projectId,async tx=>{
   const current=await new Finance(this.s,tx).policy(projectId);ensure(Number(b.revision??0)===(current?.revision??0),'REVISION_CONFLICT',409);
   const commitment=await tx.get('commitments',text(b.commitmentId));ensure(commitment?.projectId===projectId&&commitment.accepted,'COMMITMENT_APPROVAL_REQUIRED',422);
   const householdBps=Number(b.householdBps),fundBps=Number(b.fundBps??0);ensure(Number.isInteger(householdBps)&&Number.isInteger(fundBps)&&householdBps>0&&fundBps>=0&&householdBps+fundBps<=10000,'INVALID_REQUEST');
   ensure(householdBps+fundBps===Math.round(commitment.percentage*100)&&b.basis===commitment.basis,'COMMITMENT_RULE_MISMATCH',422);
   if(commitment.structuredReview)ensure(householdBps===commitment.householdBps&&fundBps===commitment.fundBps&&b.method===commitment.allocationMethod,'COMMITMENT_RULE_MISMATCH',422);
   ensure(['equal','weighted'].includes(text(b.method))&&['draft','active','paused'].includes(text(b.state)),'INVALID_REQUEST');
   const weights:Record<string,string>={};for(const [key,value]of Object.entries(record(b.weights??{}))){ensure(typeof value==='string'&&/^\d{1,16}$/.test(value),'INVALID_REQUEST');weights[key]=value;}
   let fund:AutomationPolicy['fund'];if(fundBps){const f=record(b.fund);ensure(/^\d{10}$/.test(text(f.accountNumber))&&/^\d{6}$/.test(text(f.bankCode)),'INVALID_REQUEST');const enquiry=await this.s.providers.forStore(tx).bank.call<{account_name:string}>('POST',`/transfers/${f.bankCode==='000014'?'intra':'interbank'}/name-enquiry`,{account_number:f.accountNumber,destination_bank_code:f.bankCode});ensure(nameMatch(text(f.name),enquiry.account_name)==='match','NAME_MISMATCH',422);fund={name:text(f.name),accountNumber:text(f.accountNumber),bankCode:text(f.bankCode),verifiedName:enquiry.account_name};}
   if(b.state==='active'){const project=await tx.get('projects',projectId);ensure(project?.sourceAccount,'FUNDING_NOT_RECEIVED',422);const members=(await tx.list('participants',{projectId})).filter(p=>p.status!=='removed');ensure(members.length,'ROSTER_EMPTY',422);ensure(members.some(p=>p.status==='active'&&p.flags.length===0&&p.verification.match&&!p.verification.watchlisted),'PREFLIGHT_EXCLUSIONS_REQUIRED',422);const balance=await this.s.providers.forStore(tx).bank.call<BalanceResult>('GET',`/accounts/${project.sourceAccount}/balance`);ensure(balance.currency==='NGN','CURRENCY_NOT_SUPPORTED',422);}
   const reason=text(b.reason);ensure(reason.trim().length>=5,'INVALID_REQUEST');
   const release=b.release==='milestone'?'milestone':'immediate';if(commitment.cadence==='staged'){ensure(release==='milestone','COMMITMENT_RULE_MISMATCH',422);if(b.state==='active')ensure(typeof b.milestoneEvidence==='string'&&b.milestoneEvidence.trim().length>=10,'ALLOCATION_INPUT_REQUIRED',422);}const backlogIds=Array.isArray(b.backlogIds)?b.backlogIds.map(text):[];ensure(backlogIds.length<=100,'INVALID_REQUEST');for(const rid of backlogIds)ensure((await tx.get('incoming_receipts',rid))?.projectId===projectId,'FORBIDDEN',403);
   const policy=await tx.put('automation_policies',row({projectId,revision:(current?.revision??0)+1,state:b.state,commitmentId:commitment.id,householdBps,fundBps,basis:b.basis,method:b.method,weights,fund,reason,effectiveAt:current?.effectiveAt??now(),activatedAt:current?.activatedAt??(b.state==='active'?now():undefined),backlogIds,release,milestoneEvidence:typeof b.milestoneEvidence==='string'?b.milestoneEvidence:undefined,actor}));
   await tx.put('audit',row({projectId,principal:actor,action:'automation.'+policy.state,detail:{policyId:policy.id,reason,revision:policy.revision,backlogIds}}));
   return policy;
  });
 }
 async receive(eventId:string,payload:Record<string,unknown>){
  const accountNumber=text(payload.account_number??payload.source_account),businessId=text(payload.session_id??payload.transaction_id??eventId),amount=bankMoney(payload.amount);ensure(cents(amount)>0n,'INVALID_REQUEST');
  const matches=(await this.db.list('projects')).filter(p=>(p.receivingAccount??p.sourceAccount)===accountNumber||p.carbonPayoutAccount===accountNumber);const project=matches.length===1?matches[0]:undefined;
  const receiptId=hash('income:'+accountNumber+':'+businessId);
  return this.db.lock('income:'+receiptId,async tx=>{
   const existing=await tx.get('incoming_receipts',receiptId);if(existing){ensure(existing.amount===amount,'RECONCILIATION_MISMATCH',409);return existing;}
   ensure(payload.currency===undefined||payload.currency==='NGN','CURRENCY_NOT_SUPPORTED',422);
   const receipt=await tx.put('incoming_receipts',row({id:receiptId,projectId:project?.id??null,accountNumber,businessId,amount,currency:'NGN',state:'received',kind:'income',receivedAt:typeof payload.received_at==='string'?payload.received_at:now(),grossAmount:payload.gross_amount===undefined?undefined:bankMoney(payload.gross_amount),netAmount:payload.net_amount===undefined?undefined:bankMoney(payload.net_amount),basisEvidence:typeof payload.basis_evidence==='string'?payload.basis_evidence:undefined,identityConfirmed:!!(payload.session_id??payload.transaction_id),eventId,reason:project?undefined:'This payment needs a project before it can be distributed.'}));
   if(project)await new Finance(this.s,tx).event(project.id,'income.received',amount,receiptId,[{account:'bank_cash',debit:amount,credit:'0.00'},{account:'unallocated_income',debit:'0.00',credit:amount}]);if(project?.sourceAccount===accountNumber)await tx.put('notifications',row({id:'funding:'+hash(accountNumber+':'+businessId),projectId:project.id,type:'funding',amount,bankReference:businessId}));
   return receipt;
  });
 }
 async observeCarbonPayout(reference:string){
  for(const source of await this.db.list('tokens',{type:'carbon-retirement',payoutReference:reference})){
   const result=await this.s.providers.bank.call<import('./bank.js').TransferResult>('GET','/transfers/'+encodeURIComponent(reference));await this.db.put('tokens',{...source,lastCheckedAt:now(),payoutState:result.status});
   if(['successful','settled'].includes(result.status)){const amount=bankMoney(result.amount??source.payoutAmount),receipt=await this.receive('carbon:'+reference,{account_number:source.payoutAccount,session_id:result.session_id??result.transaction_id??reference,amount,currency:'NGN',gross_amount:source.grossAmount,net_amount:undefined,basis_evidence:'Registry gross sale and owner payout verified from the bank retirement and transfer records.'});await this.db.put('tokens',{...source,incomeReceiptId:receipt.id,payoutState:result.status,lastCheckedAt:now()});}
   else if(result.status==='reversed'&&typeof source.incomeReceiptId==='string'){const receipt=await this.db.get('incoming_receipts',source.incomeReceiptId);if(receipt&&receipt.state!=='reversed'){await this.db.put('incoming_receipts',{...receipt,state:'reversed',reason:'The incoming owner payout was reversed. Operations must reconcile any onward payments.'});if(receipt.projectId){const policy=await this.policy(receipt.projectId);if(policy)await this.db.put('automation_policies',row({...policy,id:id(),createdAt:now(),revision:policy.revision+1,state:'paused',reason:'Incoming owner payout reversed; reconcile before resuming.',actor:'bank-worker'}));await this.s.audit('bank-worker','income.reversed',receipt.projectId,{receiptId:receipt.id,reference});}}}
  }
 }
 async reviewReceipt(receiptId:string,input:unknown,actor:string){const b=record(input);return this.db.lock('income:'+receiptId,async tx=>{
  const receipt=await tx.get('incoming_receipts',receiptId);ensure(receipt&&!receipt.allocationId,'INVALID_REQUEST',409);const reason=text(b.reason);ensure(reason.trim().length>=5,'INVALID_REQUEST');
  const gross=b.grossAmount===undefined?receipt.amount:money(cents(b.grossAmount));const net=b.netAmount===undefined?undefined:money(cents(b.netAmount));if(net)ensure(cents(net)<=cents(gross)&&cents(net)<=cents(receipt.amount),'INVALID_REQUEST');
  const next={...receipt,grossAmount:gross,netAmount:net,basisEvidence:reason,state:'received'};await tx.put('incoming_receipts',next);await tx.put('audit',row({projectId:receipt.projectId,principal:actor,action:'income.basis_reviewed',detail:{receiptId,reason,gross,net}}));return next;
 });}
 async allocate(receiptId:string){
  const initial=await this.db.get('incoming_receipts',receiptId);if(!initial?.projectId||initial.allocationId||initial.state==='reversed')return;
  return this.db.lock('account-allocation:'+initial.projectId,async tx=>{
   const f=new Finance(this.s,tx),receipt=await tx.get('incoming_receipts',receiptId);if(!receipt||receipt.allocationId)return;
   const project=await tx.get('projects',initial.projectId!);ensure(project,'NOT_FOUND',404);const policy=await f.policy(project.id);
   const hold=async(reason:string)=>{await tx.put('incoming_receipts',{...receipt,state:'held',reason});};
   if(receipt.identityConfirmed===false)return hold('The bank transaction identity needs confirmation.');
   if(!policy||policy.state!=='active')return hold('Automatic payments are not active for this project.');
   if(Date.parse(receipt.createdAt)<Date.parse(policy.activatedAt??policy.effectiveAt)&&!policy.backlogIds.includes(receipt.id))return hold('This earlier payment needs explicit approval in the resume policy.');
   if(policy.release==='milestone'&&!policy.milestoneEvidence)return hold('The agreed milestone needs release evidence.');
   if(policy.basis==='net'&&!receipt.netAmount)return hold('Review eligible net revenue and supporting deductions.');
   if(!project.sourceAccount)return hold('A verified payout account needs to be linked.');
   if(project.sourceAccount!==receipt.accountNumber)return hold('These proceeds are in a receiving-only or external account. A supported transfer into the verified payout account is required.');
   const participants=(await tx.list('participants',{projectId:project.id})).filter(p=>p.status!=='removed');if(!participants.length)return hold('Add community members before allocating this income.');
   const weights=participants.map(p=>({id:p.id,weight:policy.method==='equal'?1n:BigInt(policy.weights[p.id]??'0')}));if(weights.some(w=>w.weight<=0n))return hold('Each member needs a verified allocation weight.');
   const basis=policy.basis==='net'?receipt.netAmount!:receipt.grossAmount??receipt.amount;const total=cents(basis);const household=total*BigInt(policy.householdBps)/10000n,fund=total*BigInt(policy.fundBps)/10000n;
   if(household+fund>cents(receipt.amount))return hold('The community obligation exceeds available proceeds. Review the funding shortfall.');
   const shares=apportion(household,weights);const items:AllocationItem[]=participants.map(p=>({participantId:p.id,name:p.resolvedAccountName??p.name,accountNumber:p.accountNumber,bankCode:p.bankCode,amount:money(shares.get(p.id)!),kind:'household',holdReasons:[...p.flags,...(p.status!=='active'?['Account needs review']:[]),...(!p.verification.match?['Identity needs verification']:[]),...(p.verification.watchlisted?['Restriction review required']:[])]}));
   if(fund&&policy.fund)items.push({participantId:'fund:'+project.id,name:policy.fund.verifiedName,accountNumber:policy.fund.accountNumber,bankCode:policy.fund.bankCode,amount:money(fund),kind:'fund',holdReasons:[]});
   const tariff=await this.s.providers.forStore(tx).bank.call('GET','/tariff');const fees=items.filter(i=>!i.holdReasons.length&&cents(i.amount)>0n).reduce((n,i)=>n+estimateCharges(tariff,i.amount,i.bankCode),0n);const excluded=policy.basis==='net'&&cents(receipt.amount)>total?cents(receipt.amount)-total:0n;const operator=cents(receipt.amount)-household-fund-excluded;
   const allocationId=hash('allocation:'+receipt.id);const commitment=await tx.get('commitments',policy.commitmentId);ensure(commitment,'NOT_FOUND',404);const period=currentPeriod(reportingCadence(commitment),new Date(receipt.receivedAt));const manualRuns=(await tx.list('runs',{projectId:project.id,period})).filter(r=>!r.allocationId);for(const run of manualRuns)if((await tx.list('transfers',{runId:run.id})).length)return hold('This reporting period already contains manually managed payments. Reconcile them before enabling automatic distributions for this income.');
   const allocation=await tx.put('allocations',row({id:allocationId,projectId:project.id,receiptId:receipt.id,policyId:policy.id,commitmentId:policy.commitmentId,period,basisAmount:basis,householdObligation:money(household),fundObligation:money(fund),operatorAllocation:money(operator),deductionReserve:money(excluded),estimatedCharges:money(fees),items,state:fees>operator?'held':'ready',reason:fees>operator?'The operator share does not cover payment charges.':undefined}));
   await tx.put('incoming_receipts',{...receipt,state:'allocated',allocationId,reason:undefined});
   await f.event(project.id,'income.allocated',money(household+fund),allocationId,[{account:'unallocated_income',debit:receipt.amount,credit:'0.00'},{account:'household_payable',debit:'0.00',credit:money(household)},{account:'fund_payable',debit:'0.00',credit:money(fund)},{account:'operator_share',debit:'0.00',credit:money(operator)},{account:'deductions_reserve',debit:'0.00',credit:money(excluded)}]);
   const published=(await tx.list('attestations',{projectId:project.id,period})).at(-1);if(published)await tx.put('jobs',row({id:'income-correction:'+allocation.id,type:'correction',data:{projectId:project.id,runId:published.runId,reason:'income_recognised_after_period_close'},state:'pending',attempts:0,nextAt:now()}));
   return allocation;
  });
 }
 async dispatch(allocationId:string){
  const a=await this.db.get('allocations',allocationId);if(!a)return;const project=await this.s.required('projects',a.projectId);
  const policy=await this.policy(a.projectId);if(policy?.state!=='active')return;
  if(a.state==='held'&&!a.runId)return;
  await this.db.lock('account-dispatch:'+project.sourceAccount,async tx=>{
   const allocation=await tx.get('allocations',allocationId);if(!allocation||allocation.runId)return;
   const balance=await this.s.providers.forStore(tx).bank.call<BalanceResult>('GET',`/accounts/${project.sourceAccount}/balance`);ensure(balance.currency==='NGN','CURRENCY_NOT_SUPPORTED',422);
   const candidates=allocation.items.filter(i=>!i.holdReasons.length&&cents(i.amount)>0n);if(!candidates.length)return;
   const required=candidates.reduce((n,i)=>n+cents(i.amount),0n)+cents(allocation.estimatedCharges);
   // All other unsent entitlements remain protected, even when they are held.
   const sharedProjects=new Set((await tx.list('projects')).filter(p=>p.sourceAccount===project.sourceAccount).map(p=>p.id));let other=allocation.items.filter(i=>i.holdReasons.length).reduce((n,i)=>n+cents(i.amount),0n);for(const x of await tx.list('allocations'))if(sharedProjects.has(x.projectId)&&x.id!==allocationId){const settled=x.runId?(await tx.list('transfers',{runId:x.runId})).filter(t=>t.state==='settled').reduce((n,t)=>n+cents(t.amount),0n):0n;const owed=cents(x.householdObligation)+cents(x.fundObligation);other+=owed>settled?owed-settled:0n;}
   for(const x of await tx.list('allocations'))if(sharedProjects.has(x.projectId)&&typeof x.deductionReserve==='string')other+=cents(x.deductionReserve);for(const r of await tx.list('incoming_receipts'))if(r.projectId&&sharedProjects.has(r.projectId)&&r.accountNumber===project.sourceAccount&&!r.allocationId&&r.state!=='reversed')other+=cents(r.amount);
   ensure(cents(bankMoney(balance.available_balance))>=required+other,'FUNDING_INSUFFICIENT',422);
   const runId=hash('auto-run:'+allocationId),rosterId=hash('auto-roster:'+allocationId);await tx.put('rosters',row({id:rosterId,projectId:a.projectId,period:a.period,participantIds:allocation.items.filter(i=>i.kind==='household').map(i=>i.participantId)}));
   const commitment=await tx.get('commitments',a.commitmentId);ensure(commitment,'NOT_FOUND',404);
   const run=await tx.put('runs',row({id:runId,projectId:a.projectId,period:a.period,closesAt:typeof commitment.clearedDeadlineDays==='number'&&commitment.clearedDeadlineDays>0?new Date(Date.parse((await tx.get('incoming_receipts',a.receiptId))!.receivedAt)+commitment.clearedDeadlineDays*86400000).toISOString():periodDeadline(a.period,reportingCadence(commitment)),reportClosesAt:periodDeadline(a.period,reportingCadence(commitment)),rosterId,commitmentId:a.commitmentId,declaredGross:a.basisAmount,declaredNet:a.basisAmount,fundingAmount:money(required),sourceAccount:project.sourceAccount,state:'funded',batchReference:'AUTO-'+runId,allocationId,eligibleIds:candidates.map(i=>i.participantId),arithmetic:{required:money(cents(a.householdObligation)+cents(a.fundObligation)),perHousehold:'0.00',estimatedCharges:a.estimatedCharges,chargesCovered:true}}));
   await tx.put('allocations',{...allocation,state:'processing',runId:run.id});await tx.put('jobs',row({id:'execute:'+run.id,type:'execute',data:{runId:run.id},state:'pending',attempts:0,nextAt:now()}));
  });
 }
 async sync(){
  for(const receipt of await this.db.list('incoming_receipts'))if(receipt.projectId&&!receipt.allocationId&&receipt.state!=='reversed')try{await this.allocate(receipt.id);}catch(error){if(!(error instanceof Fault))throw error;await this.db.put('incoming_receipts',{...receipt,state:'held',reason:error.code==='ALLOCATION_INPUT_REQUIRED'?'Verified allocation inputs are missing.':'This income needs a review before allocation.'});}
  for(const allocation of await this.db.list('allocations'))if(!allocation.runId&&allocation.state==='ready')try{await this.dispatch(allocation.id);}catch(e){await this.db.put('allocations',{...allocation,reason:e instanceof Fault?(e.code==='ACCOUNT_NOT_FOUND'?'The receiving account cannot fund payouts in this sandbox. Link a supported, funded payout account.':e.code==='FUNDING_INSUFFICIENT'?'The payout account does not cover reserved obligations and charges.':'The bank could not confirm payout readiness. Try checking again.'):'Payout readiness could not be checked.'});}
  for(const a of await this.db.list('allocations'))if(a.runId){const transfers=await this.db.list('transfers',{runId:a.runId}),settled=transfers.filter(t=>t.state==='settled').reduce((n,t)=>n+cents(t.amount),0n),total=cents(a.householdObligation)+cents(a.fundObligation);const state=settled===total?'paid':transfers.some(t=>['queued','in_flight','settling'].includes(t.state))?'processing':settled>0n?'partly_paid':'needs_attention';if(state!==a.state)await this.db.put('allocations',{...a,state});}
  for(const t of await this.db.list('transfers'))if(t.entitlementAmount&&['settled','reversed'].includes(t.state)){
   if(t.state==='settled')await this.event(t.projectId,'payment.settled',t.amount,t.id+':'+t.reference,[{account:t.recipientKind==='fund'?'fund_payable':'household_payable',debit:t.amount,credit:'0.00'},{account:'operator_fees',debit:money(cents(t.fee)+cents(t.vat)+cents(t.stampDuty)),credit:'0.00'},{account:'bank_cash',debit:'0.00',credit:t.totalDebit}]);
   else if(t.settledAt)await this.event(t.projectId,'payment.reversed_pending_reconciliation',t.amount,t.id+':'+t.reference,[{account:'reversal_receivable',debit:t.amount,credit:'0.00'},{account:t.recipientKind==='fund'?'fund_payable':'household_payable',debit:'0.00',credit:t.amount}]);
  }
 }
 async wallet(projectId:string){
  const p=await this.s.required('projects',projectId),receipts=await this.db.list('incoming_receipts',{projectId}),allocations=await this.db.list('allocations',{projectId}),transfers=(await this.db.list('transfers',{projectId})).filter(t=>t.entitlementAmount);let bankAvailable:string|null=null,bankLedger:string|null=null,balanceMessage:string|undefined;
  if(p.sourceAccount)try{const b=await this.s.providers.bank.call<BalanceResult&{ledger_balance?:string|number}>('GET',`/accounts/${p.sourceAccount}/balance`);ensure(b.currency==='NGN','CURRENCY_NOT_SUPPORTED',422);bankAvailable=bankMoney(b.available_balance);bankLedger=b.ledger_balance!==undefined?bankMoney(b.ledger_balance):null;}catch{balanceMessage='The bank balance is unavailable. No zero balance has been assumed.';}
  const paid=transfers.filter(t=>t.state==='settled').reduce((n,t)=>n+cents(t.amount),0n),processing=transfers.filter(t=>['in_flight','settling','queued'].includes(t.state)).reduce((n,t)=>n+cents(t.amount),0n),obligation=allocations.reduce((n,a)=>n+cents(a.householdObligation)+cents(a.fundObligation),0n);
  const held=allocations.reduce((n,a)=>n+a.items.filter(i=>i.holdReasons.length).reduce((v,i)=>v+cents(i.amount),0n),0n);const outstanding=obligation>paid?obligation-paid:0n;
  const bankPending=transfers.filter(t=>['in_flight','settling'].includes(t.state)).reduce((n,t)=>n+cents(t.amount),0n);const unallocated=receipts.filter(r=>!r.allocationId&&r.state!=='reversed').reduce((n,r)=>n+cents(r.amount),0n);const unsent=outstanding>bankPending?outstanding-bankPending:0n;const deductions=allocations.reduce((n,a)=>n+(typeof a.deductionReserve==='string'?cents(a.deductionReserve):0n),0n);const reserve=unsent+unallocated+deductions;
  const available=bankAvailable===null?null:money(cents(bankAvailable)>reserve?cents(bankAvailable)-reserve:0n);
  return {projectId,currency:'NGN' as const,asOf:now(),environment:process.env.BANK_PROVIDER==='live'?'sandbox' as const:'demonstration' as const,accountNumber:p.sourceAccount??null,receivingAccount:typeof p.receivingAccount==='string'?p.receivingAccount:null,bankAvailable,bankLedger,available,reserved:money(outstanding+unallocated+deductions),received:money(receipts.filter(r=>r.kind==='income'&&r.state!=='reversed').reduce((n,r)=>n+cents(r.amount),0n)),obligation:money(obligation),operatorAllocation:money(allocations.reduce((n,a)=>n+cents(a.operatorAllocation),0n)),paid:money(paid),processing:money(processing),held:money(held),outstanding:money(outstanding),charges:money(transfers.filter(t=>t.state==='settled').reduce((n,t)=>n+cents(t.fee)+cents(t.vat)+cents(t.stampDuty),0n)),automationState:(await this.policy(projectId))?.state??'needs_setup',balanceState:bankAvailable===null?'unavailable' as const:'current' as const,balanceMessage,receipts,allocations};
 }
}
