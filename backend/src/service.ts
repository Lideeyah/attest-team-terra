import {sendParticipantNotice} from './notifications.js';
import {openPayload} from './private-payload.js';
import {Finance} from './finance.js';
import {unsupportedCommitmentTerms} from './commitment-review.js';
import { EventEmitter } from 'node:events';
import { verify as verifySignature } from 'node:crypto';
import { randomBytes } from 'node:crypto';
import { latLngToCell } from 'h3-js';
import { Fault, ensure, row, now, hash, canonical, cents, money, bankMoney, id, identityHash, nameMatch, maskPhone, merkle, Signer, verifyAttestationRecord, type Row, type Principal } from './core.js';
import type {BulkResult,TransferResult,BalanceResult,NameResult,IdentityResult,WalletResult,ListResult,Delivery,ForgeEvent} from './bank.js';
import { Providers, estimateCharges } from './providers.js';
import type {Run,Project,Attestation,Receipt,Job,Transfer,Flow,Commitment,Participant,Agent,Signal,CarbonEventData,JobData} from './models.js';
import type {Table} from './store.js';
import type { Store } from './store.js';
import { translation } from './messaging.js';
import {jobText,jobPage,jobPages,optionalText,enrolmentInput,runInput,disputeInput,record} from './validation.js';
import { periodDeadline,currentPeriod,reportingCadence } from './period.js';
import { capabilityPath } from './bank-capabilities.js';
import {prepareBatches,submitPendingBatches,applyBankResult} from './batches.js';
import {onwardPage} from './onward.js';
import {demonstrationDisclosure,publicReferenceStatistics} from './provenance.js';
import {MockBank,bankFailureMessage} from './bank.js';

export class Service {
  events = new EventEmitter(); signer = new Signer();
  constructor(public db: Store, public providers = new Providers(db)) {}
  async required<T extends Table>(table: T, id: string) { const r=await this.db.get(table,id); ensure(r,'NOT_FOUND',404); return r; }
  async audit(principal: string, action: string, projectId?: string, detail: unknown = {}) { await this.db.put('audit',row({principal,action,projectId,detail})); }
  async project(p: Principal, projectId: string, write = false) {
    const project=await this.db.scoped('projects',projectId,p);ensure(project,'FORBIDDEN',403);
    const dev=['developer_admin','developer_operator'].includes(p.role) && p.organisationId===project.organisationId;
    const agent=p.role==='agent'&&p.projectId===projectId;
    ensure(write ? dev : dev || agent || p.role==='platform_admin' || p.role==='bank_ops','FORBIDDEN',403);
    return project;
  }
  async scoped<T extends Table>(p: Principal, table: T, entityId: string, write=false) {
    const entity=await this.db.scoped(table,entityId,p);ensure(entity,'FORBIDDEN',403);await this.project(p,entity.projectId!,write);
    if(p.role==='agent') ensure(entity.agentId===p.id,'FORBIDDEN',403);
    return entity;
  }
  async createProject(p: Principal, registryId: string, boundaryId?:string) {
    ensure(p.role==='developer_admin','FORBIDDEN',403);
    const record=await this.providers.registry(registryId);
    const upload=boundaryId?await this.db.get('tokens',boundaryId):undefined;
    if(boundaryId)ensure(upload?.type==='boundary-upload'&&upload.organisationId===p.organisationId&&upload.geometry,'FORBIDDEN',403);
    const project=await this.db.put('projects',row({...record,...(upload?{boundary:upload.geometry,boundaryStatus:'available',boundarySource:{sha256:upload.sha256,name:upload.name,uploadedBy:upload.ownerId}}:{}),organisationId:p.organisationId,status:'onboarding',isDemonstration:this.providers.bank instanceof MockBank}));
    await this.audit(p.id,'project.created',project.id); return project;
  }
  async enqueue(type: string, data: JobData, jobId:string=id()) { const existing=await this.db.get('jobs',jobId); if(existing) return existing; return this.db.put('jobs',row({id:jobId,type,data,state:'pending',attempts:0,nextAt:now()})); }
  async authEmail(user:Row,type:'verify'|'reset'){
    const token=randomBytes(32).toString('hex');const tokenId=hash(token);
    await this.db.put('tokens',row({id:tokenId,userId:user.id,type,expiresAt:new Date(Date.now()+3600_000).toISOString(),used:false}));
    await this.enqueue('auth-email',{userId:user.id,type,token},'auth-email:'+tokenId);
  }
  async enrol(p: Principal, rawInput: unknown): Promise<Participant> {
    const input=enrolmentInput(rawInput);
    const project=await this.project(p,input.projectId);
    ensure(['agent','developer_admin','developer_operator'].includes(p.role),'FORBIDDEN',403);
    ensure(input.consent===true,'CONSENT_MISSING');
    ensure(project.boundary||(await this.db.list('location_datasets',{projectId:project.id})).length,'BOUNDARY_NOT_AVAILABLE',409);
    ensure(typeof input.clientId==='string'&&/^[a-f0-9-]{36}$/i.test(input.clientId),'INVALID_REQUEST');
    ensure(typeof input.name==='string'&&input.name.length>2&&input.name.length<200&&typeof input.phone==='string'&&/^\+\d{8,15}$/.test(input.phone),'INVALID_REQUEST');
    for(const [evidenceId,kind]of [[input.photographId,'photograph'],[input.consentEvidenceId,'consent']] as const)if(evidenceId){const evidence=await this.required('evidence',evidenceId);ensure(evidence.projectId===project.id&&evidence.kind===kind&&evidence.ownerId===p.id,'FORBIDDEN',403);}
    const language=input.language??'en';translation(language);
    ensure(['bvn','nin'].includes(input.identityType)&&/^\d{11}$/.test(input.identity??''),'INVALID_REQUEST');
    ensure(Number.isFinite(Date.parse(input.capturedAt))&&Date.parse(input.capturedAt)<=Date.now()+60_000,'INVALID_REQUEST');
    if(input.point) ensure(Array.isArray(input.point)&&input.point.length===2&&input.point.every(Number.isFinite)&&Math.abs(input.point[0])<=180&&Math.abs(input.point[1])<=90,'INVALID_REQUEST');
    if(p.role==='agent') {
      const agent=await this.required('agents',p.id); ensure(agent.status==='active'&&agent.deviceKey,'DEVICE_UNBOUND',403);
      const payload=canonical({clientId:input.clientId,projectId:input.projectId,capturedAt:input.capturedAt,point:input.point??null});
      let valid=false; try { valid=verifySignature(null,Buffer.from(payload),agent.deviceKey,Buffer.from(input.signature??'','base64')); } catch {}
      ensure(valid,'DEVICE_UNBOUND',403);
    }
    const digest=identityHash(input.identity);
    return this.db.lock('identity:'+digest,async tx=>{
      const bank=this.providers.forStore(tx).bank;
      const existing=await tx.get('participants',input.clientId);
      if(existing) { ensure(existing.projectId===project.id && existing.identityHash===digest,'DUPLICATE_REQUEST',409); return existing; }
      ensure(!(await tx.list('participants',{identityHash:digest})).length,'IDENTITY_DUPLICATE',409);
      const flags: string[]=[];
      let verification:IdentityResult;
      try { verification=await bank.call<IdentityResult>('POST',`/identity/${input.identityType}/verify`,{[input.identityType]:input.identity,first_name:input.firstName,last_name:input.lastName,date_of_birth:input.dateOfBirth},hash(input.clientId+':verify')); }
      catch { throw new Fault('IDENTITY_UNREACHABLE',503); }
      // Bank responses can echo the original BVN/NIN. Persist only the decision fields.
      verification={match:verification.match===true,confidence:verification.confidence,fields:verification.fields,watchlisted:verification.watchlisted===true};
      if(!verification.match) flags.push('BVN_MISMATCH');
      if(!input.point) flags.push('GPS_UNAVAILABLE');
      else if(project.boundary&&!await tx.inside(project.id,input.point)) { ensure(input.boundaryReason,'BOUNDARY_OUTSIDE'); flags.push('BOUNDARY_OUTSIDE'); }
      ensure(input.accountNumber||input.identityType==='bvn','WALLET_ACCOUNT_REQUIRED',422);
      let wallet:{account_number:string;kyc_level?:number;wallet_id?:string};
      if(input.accountNumber)wallet={account_number:input.accountNumber};
      else{
        const created=await bank.call<WalletResult>('POST','/wallets',{owner_name:input.name,bvn:input.identity,phone:input.phone,reference:input.clientId},hash(input.clientId+':wallet'));
        ensure(typeof created.wallet_id==='string'&&Number.isInteger(created.tier),'INVALID_BANK_RESPONSE',502);
        const account=await bank.call<{account_number:string}>('POST','/virtual-accounts',{customer_name:input.name,customer_phone:input.phone,customer_email:input.clientId+'@example.test',bvn:input.identity,type:'dedicated',reference:'VA-'+input.clientId},hash(input.clientId+':virtual-account'));
        ensure(typeof account.account_number==='string'&&/^\d{10}$/.test(account.account_number),'INVALID_BANK_RESPONSE',502);wallet={account_number:account.account_number,kyc_level:created.tier,wallet_id:created.wallet_id};
      }
      const bankCode=input.bankCode??'000014';
      let enquiry:Partial<NameResult>={};
      try {
        enquiry=await bank.call<NameResult>('POST',`/transfers/${bankCode==='000014'?'intra':'interbank'}/name-enquiry`,{account_number:wallet.account_number,destination_bank_code:bankCode,...(process.env.BANK_PROVIDER!=='live'?{mock_name:input.name}:{})},hash(input.clientId+':enquiry'));
      } catch(e) { flags.push(e instanceof Fault?e.code:'BANK_UNAVAILABLE'); }
      const match=enquiry.account_name ? nameMatch(input.name,enquiry.account_name) : 'uncertain';
      if(match!=='match') flags.push('NAME_MISMATCH');
      if(input.identityType==='bvn'&&typeof enquiry.bvn_masked==='string'){
        const masked=enquiry.bvn_masked;
        if(masked.length!==input.identity.length||[...masked].some((c,i)=>/\d/.test(c)&&input.identity[i]!==c))flags.push('ACCOUNT_IDENTITY_MISMATCH');
      }
      const participant=await tx.put('participants',row({id:input.clientId,projectId:project.id,organisationId:project.organisationId,agentId:p.id,name:input.name,phone:input.phone,identityHash:digest,identityLastFour:input.identity.slice(-4),identityType:input.identityType,verification,point:input.point??null,capturedAt:input.capturedAt,receivedAt:now(),syncDelayMs:Date.now()-Date.parse(input.capturedAt),consent:true,accountNumber:wallet.account_number,walletId:wallet.wallet_id,bankCode,kycLevel:enquiry.kyc_level??wallet.kyc_level??1,resolvedAccountName:enquiry.account_name??null,nameMatch:match,maskedBvn:enquiry.bvn_masked??null,flags,status:'active',noticeAttempted:false,noticeStatus:'pending'}));
      await tx.put('participants',{...participant,language,photographId:input.photographId??null,consentEvidenceId:input.consentEvidenceId??null});
      await tx.put('jobs',row({id:'enrol-notice:'+participant.id,type:'enrol-notice',data:{participantId:participant.id},state:'pending',attempts:0,nextAt:now()}));
      if(match==='uncertain'&&enquiry.account_name)await tx.put('jobs',row({id:'name-review:'+participant.id,type:'name-review',data:{projectId:project.id,participantId:participant.id},state:'pending',attempts:0,nextAt:now()}));
      await tx.put('audit',row({principal:p.id,action:'participant.enrolled',projectId:project.id,detail:{participantId:participant.id,flags}}));
      return participant;
    });
  }
  async commitmentWarnings(commitment:Commitment):Promise<string[]> {
    if(Array.isArray(commitment.reviewWarnings))return commitment.reviewWarnings.filter((warning:unknown):warning is string=>typeof warning==='string');
    let source=commitment;
    for(let depth=0;depth<24;depth++){
      if(source.id.startsWith('extraction:')){const job=await this.db.get('jobs',source.id.slice('extraction:'.length));return job?.data.pages?unsupportedCommitmentTerms(job.data.pages):[];}
      if(!source.supersedes)break;const previous=await this.db.get('commitments',source.supersedes);if(!previous)break;source=previous;
    }
    return [];
  }
  async createRun(p: Principal, projectId: string, rawInput: unknown) {
    const input=runInput(rawInput);
    const project=await this.project(p,projectId,true); const committed=(await this.db.list('commitments',{projectId,accepted:true})).at(-1); ensure(committed,'EXTRACTION_LOW_CONFIDENCE',422);
    ensure(!(await this.commitmentWarnings(committed)).length,'COMMITMENT_TERMS_UNSUPPORTED',422);
    cents(input.declaredGross); cents(input.fundingAmount);if(committed.basis==='net'){cents(input.declaredNet);ensure(cents(input.declaredNet)<=cents(input.declaredGross),'INVALID_REQUEST');}
    ensure(typeof input.period==='string'&&input.period.length<80,'INVALID_REQUEST');
    reportingCadence(committed);
    let closesAt:string;try{closesAt=periodDeadline(input.period,reportingCadence(committed));}catch(error){ensure(process.env.NODE_ENV!=='production'&&Number.isFinite(Date.parse(input.closesAt??'')),'INVALID_REQUEST');closesAt=new Date(input.closesAt!).toISOString();}
    ensure(Date.parse(closesAt)>Date.now(),'PERIOD_CLOSED',409);
    if(project.sourceAccount)ensure(!input.sourceAccount||input.sourceAccount===project.sourceAccount,'FORBIDDEN',403);
    if(process.env.NODE_ENV==='production')ensure(project.sourceAccount,'FUNDING_NOT_RECEIVED',422);
    return this.db.lock('period:'+projectId+':'+input.period,async tx=>{
      ensure(!(await tx.list('attestations',{projectId,period:input.period})).length,'PERIOD_CLOSED',409);
      ensure(!(await tx.list('runs',{projectId,period:input.period})).length,'DUPLICATE_REQUEST',409);
      const participants=await tx.list('participants',{projectId}); ensure(participants.length,'ROSTER_EMPTY',422);
      // All enrolled households remain in the snapshot, including removed/unpaid ones.
      const selected=input.rosterId?await tx.get('rosters',input.rosterId):null;
      if(input.rosterId)ensure(selected?.projectId===projectId&&selected.period===input.period,'FORBIDDEN',403);
      if(selected)for(const participantId of selected.participantIds)ensure((await tx.get('participants',participantId))?.projectId===projectId,'FORBIDDEN',403);
      const roster=selected??await tx.put('rosters',row({projectId,period:input.period,participantIds:participants.map(p=>p.id)}));
      return tx.put('runs',row({projectId,period:input.period,closesAt,rosterId:roster.id,commitmentId:committed.id,declaredGross:input.declaredGross,declaredNet:input.declaredNet??null,fundingAmount:input.fundingAmount,sourceAccount:project.sourceAccount??input.sourceAccount??null,state:'draft',batchReference:'ATT-'+id()}));
    });
  }
  async arithmetic(run: Run) {
    const commitment=await this.required('commitments',run.commitmentId);
    const base=commitment.basis==='net'?run.declaredNet:run.declaredGross;
    const pct=BigInt(Math.round(commitment.percentage*100)); const required=cents(base)*pct/10000n;
    const roster=await this.required('rosters',run.rosterId); const n=BigInt(roster.participantIds.length);
    const tariff=await this.providers.bank.call('GET','/tariff');
    const budget=cents(run.fundingAmount)<required?cents(run.fundingAmount):required;
    const recipients=await Promise.all(roster.participantIds.map((participantId:string)=>this.required('participants',participantId)));
    const estimate=(amount:bigint)=>recipients.reduce((total,p)=>total+estimateCharges(tariff,money(amount),p.bankCode),0n);
    let amount=n?budget/n:0n;const requiredCharges=estimate(n?required/n:0n);
    if(cents(run.fundingAmount)<required){let low=0n,high=amount;while(low<high){const middle=(low+high+1n)/2n;if(middle*n+estimate(middle)<=budget)low=middle;else high=middle-1n;}amount=low;}
    const estimatedCharges=estimate(amount),planned=amount*n;
    return {commitmentPct:commitment.percentage,basis:commitment.basis,declaredGross:run.declaredGross,declaredNet:run.declaredNet??null,required:money(required),estimatedCharges:money(estimatedCharges),totalNeeded:money(required+requiredCharges),funded:run.fundingAmount,shortfall:money(required>planned?required-planned:0n),perHousehold:money(amount),chargesCovered:cents(run.fundingAmount)>=planned+estimatedCharges};
  }
  async preflight(run: Run, acknowledged: {participantId:string;reason:string}[] = []) {
    ensure(!['executing','complete','cancelled'].includes(run.state),'INVALID_REQUEST',409);
    const a=await this.arithmetic(run); ensure(a.chargesCovered,'FUNDING_EXCLUDES_CHARGES',422);
    ensure(cents(a.perHousehold)>0n,'FUNDING_INSUFFICIENT',422);
    ensure(run.sourceAccount,'FUNDING_NOT_RECEIVED',422);
    const balance=await this.providers.bank.call<BalanceResult>('GET',`/accounts/${encodeURIComponent(run.sourceAccount)}/balance`);
    ensure(cents(bankMoney(balance.available_balance))>=cents(run.fundingAmount),'FUNDING_INSUFFICIENT',422);
    const roster=await this.required('rosters',run.rosterId); const exclusions: {participantId:string;reasons:string[]}[]=[]; const seen=new Set<string>();
    for(const participantId of roster.participantIds) {
      const p=await this.required('participants',participantId); const reasons=[...p.flags];
      if(p.status!=='active') reasons.push('ACCOUNT_RESTRICTED');
      if(!p.noticeAttempted || p.noticeStatus!=='sent') reasons.push('ENROLMENT_NOTICE_PENDING');
      if(seen.has(p.bankCode+':'+p.accountNumber)) reasons.push('DUPLICATE_REQUEST'); seen.add(p.bankCode+':'+p.accountNumber);
      const limit=BigInt(({1:5000000,2:10000000,3:500000000,4:1000000000} as Record<number,number>)[p.kycLevel]??0);
      if(cents(a.perHousehold)>limit) reasons.push('LIMIT_EXCEEDED');
      const dailyLimit=BigInt(({1:30000000,2:50000000,3:2500000000,4:10000000000} as Record<number,number>)[p.kycLevel]??0);
      const today=new Date(Date.now()+3600000).toISOString().slice(0,10);
      const alreadySent=(await this.db.list('transfers',{participantId:p.id})).filter(t=>['in_flight','settling','settled'].includes(t.state)&&Number.isFinite(Date.parse(t.submittedAt??''))&&new Date(Date.parse(t.submittedAt)+3600000).toISOString().startsWith(today)).reduce((total,t)=>total+cents(t.amount),0n);
      if(alreadySent+cents(a.perHousehold)>dailyLimit&&!reasons.includes('LIMIT_EXCEEDED'))reasons.push('LIMIT_EXCEEDED');
      if(reasons.length) exclusions.push({participantId,reasons});
    }
    const accepted=exclusions.every(e=>acknowledged.some(a=>a.participantId===e.participantId && typeof a.reason==='string'&&a.reason.trim().length>0));
    const eligible=roster.participantIds.filter((pid:string)=>!exclusions.some(e=>e.participantId===pid));
    const updated={...run,state:accepted&&eligible.length?'funded':'preflight_failed',exclusions,acknowledged,eligibleIds:eligible,arithmetic:a};
    await this.db.put('runs',updated); return {passed:updated.state==='funded',exclusions,arithmetic:a};
  }
  async execute(runId: string) {
    await this.db.lock('run:'+runId,async tx=>{
      const run=await tx.get('runs',runId);ensure(run,'NOT_FOUND',404);
      if(['executing','complete','partially_complete'].includes(run.state))return;
      ensure(run.state==='funded'&&run.eligibleIds&&run.arithmetic,'PREFLIGHT_EXCLUSIONS_REQUIRED',422);
      ensure(Date.parse(run.closesAt)>Date.now(),'PERIOD_CLOSED',409);
      const transfers:Transfer[]=[];
      const allocation=typeof run.allocationId==='string'?await tx.get('allocations',run.allocationId):null;
      if(allocation)ensure((await new Finance(this,tx).policy(run.projectId))?.state==='active','AUTOMATION_PAUSED',409);
      for(const pid of run.eligibleIds){
        if(allocation){const item=allocation.items.find(i=>i.participantId===pid);ensure(item&&!item.holdReasons.length,'PREFLIGHT_EXCLUSIONS_REQUIRED',422);if(item.kind==='household'){const member=await tx.get('participants',pid);ensure(member?.status==='active'&&member.flags.length===0&&member.verification.match,'PREFLIGHT_EXCLUSIONS_REQUIRED',422);}
          transfers.push(await tx.put('transfers',row({id:hash(run.id+':'+pid),projectId:run.projectId,runId,participantId:pid,reference:'ATT-'+hash(run.id+':'+pid),amount:item.amount,entitlementAmount:item.amount,recipientKind:item.kind,expectedName:item.name,accountNumber:item.accountNumber,bankCode:item.bankCode,state:'queued',fee:'0.00',vat:'0.00',stampDuty:'0.00',totalDebit:'0.00',submittedAt:now()})));continue;}
        const p=await tx.get('participants',pid);ensure(p?.noticeAttempted&&p.noticeStatus==='sent','ENROLMENT_NOTICE_PENDING',422);
        ensure(p.status==='active'&&p.flags.length===0,'PREFLIGHT_EXCLUSIONS_REQUIRED',422);
        const t=await tx.put('transfers',row({id:hash(run.id+':'+pid),projectId:run.projectId,runId,participantId:pid,reference:'ATT-'+hash(run.id+':'+pid),amount:run.arithmetic.perHousehold,accountNumber:p.accountNumber,bankCode:p.bankCode,state:'queued',fee:'0.00',vat:'0.00',stampDuty:'0.00',totalDebit:'0.00',submittedAt:now()}));transfers.push(t);
        await this.emit(runId,'transfer.queued',t.id,tx);
      }
      const references=await prepareBatches(tx,run,transfers,run.batchReference);
      await tx.put('runs',{...run,state:'executing',claimedAt:now(),batchReferences:references});
    });
    await submitPendingBatches(this,runId);
    await this.enqueue('requery',{runId},'requery:'+runId);return this.required('runs',runId);
  }
  async emit(runId: string, type: string, transferId?: string,store:Store=this.db) { const event=row({runId,type,transferId:transferId??null});await store.put('events',event);this.events.emit(runId,{id:event.id,type,transferId}); }
  async retry(runId:string,failureClass:string){
    ensure(['INSUFFICIENT_FUNDS','BANK_UNAVAILABLE','ACCOUNT_RESTRICTED','LIMIT_EXCEEDED'].includes(failureClass),'INVALID_REQUEST');
    await this.db.lock('run:'+runId,async tx=>{
      const run=await tx.get('runs',runId);ensure(run,'NOT_FOUND',404);ensure(Date.parse(run.closesAt)>Date.now(),'PERIOD_CLOSED',409);
      const failed=await tx.list('transfers',{runId,state:'failed',failureClass});if(!failed.length)return;
      const retryNumber=(run.retryNumber??0)+1;ensure(retryNumber<=10,'LIMIT_EXCEEDED',422);
      for(const t of failed){if(t.submissionRejected)continue;const status=await this.providers.forStore(tx).bank.call<TransferResult>('GET','/transfers/'+encodeURIComponent(t.reference));ensure(['failed','rejected'].includes(status.status),'PREFLIGHT_EXCLUSIONS_REQUIRED',409);}
      const transfers:Transfer[]=[];
      for(const t of failed){const p=await tx.get('participants',t.participantId);ensure(p?.status==='active'&&p.noticeStatus==='sent'&&p.flags.length===0,'PREFLIGHT_EXCLUSIONS_REQUIRED',422);transfers.push(await tx.put('transfers',{...t,attempts:[...(t.attempts??[]),{reference:t.reference,state:t.state,failureClass:t.failureClass,failureMessage:t.failureMessage}],failureMessage:null,reference:'ATT-'+hash(t.id+':retry:'+retryNumber),state:'queued',submissionRejected:false,submittedAt:now()}));}
      const references=await prepareBatches(tx,run,transfers,run.batchReference+'-R'+retryNumber);
      await tx.put('runs',{...run,retryNumber,state:'executing',batchReferences:[...(run.batchReferences??[run.batchReference]),...references]});
    });
    await submitPendingBatches(this,runId);return this.required('runs',runId);
  }
  async applyTransfer(transferId: string, value: unknown) {
    const parsed=record(value);ensure(typeof parsed.status==='string','INVALID_BANK_RESPONSE',502);const response=parsed as unknown as TransferResult;
    await this.db.lock('transfer:'+transferId,async tx=>{
      const t=await tx.get('transfers',transferId); ensure(t,'NOT_FOUND',404);
      const state=({successful:'settled',settled:'settled',pending:'settling',failed:'failed',rejected:'failed',reversed:'reversed'} as Record<string,string>)[response.status]; ensure(state,'INVALID_REQUEST');
      if(t.state==='reversed' || t.state==='settled'&&state!=='reversed' || t.state==='failed'&&state!=='reversed') return;
      const changed=state!==t.state;
      if(state==='settled'){
        ensure(response.fee!==undefined&&response.vat!==undefined&&response.stamp_duty!==undefined&&response.total_debit!==undefined&&response.amount!==undefined,'INVALID_BANK_RESPONSE',502);
        ensure(bankMoney(response.amount)===t.amount,'RECONCILIATION_MISMATCH',409);
      }
      const fee=bankMoney(response.fee??t.fee),vat=bankMoney(response.vat??t.vat),stampDuty=bankMoney(response.stamp_duty??t.stampDuty),totalDebit=bankMoney(response.total_debit??t.totalDebit);
      if(state==='settled'){
        ensure(typeof(response.session_id??t.sessionId)==='string','INVALID_BANK_RESPONSE',502);
        ensure(cents(totalDebit)===cents(t.amount)+cents(fee)+cents(vat)+cents(stampDuty),'RECONCILIATION_MISMATCH',409);
        ensure(typeof response.settled_at==='string'&&Number.isFinite(Date.parse(response.settled_at)),'INVALID_BANK_RESPONSE',502);
      }
      await tx.put('transfers',{...t,state,fee,vat,stampDuty,totalDebit,sessionId:response.session_id??t.sessionId,failureClass:response.error_code??null,failureMessage:state==='failed'?bankFailureMessage(response.message):null,settledAt:state==='settled'?new Date(response.settled_at!).toISOString():t.settledAt,reversedAt:state==='reversed'?now():t.reversedAt});
      if(changed) {
        await this.emit(t.runId,'transfer.'+state,t.id,tx);
        if(state==='settled'&&t.recipientKind!=='fund') {
          await tx.put('jobs',row({id:'payment-notice:'+t.id,type:'payment-notice',data:{transferId:t.id},state:'pending',attempts:0,nextAt:now()}));
          if((await tx.list('attestations',{runId:t.runId})).length)await tx.put('jobs',row({id:'late-settlement:'+t.id,type:'correction',data:{runId:t.runId,reason:'late_settlement'},state:'pending',attempts:0,nextAt:now()}));
        }
        if(state==='reversed') {
          await tx.put('jobs',row({id:'correction:'+t.id,type:'correction',data:{projectId:t.projectId,runId:t.runId,reason:'transfer_reversed'},state:'pending',attempts:0,nextAt:now()}));
          for(const d of await tx.list('disputes',{transferId:t.id})) await tx.put('disputes',{...d,status:'substantiated',resolutionBasis:'reversal',resolvedAt:now()});
        }
      }
    });
  }
  async requery(runId: string, transferId?: string) {
    const run=await this.required('runs',runId),transfers=await this.db.list('transfers',{runId});
    if(!transferId){
      for(const reference of run.batchReferences??[run.batchReference]){
        const intent=await this.db.get('transfer_batches',hash(reference));if(intent&&['pending','rejected'].includes(intent.state))continue;
        try{
          const batch=await this.providers.bank.call<BulkResult>('GET','/transfers/bulk/'+encodeURIComponent(reference));
          for(const item of batch.items??[]){const t=transfers.find(t=>t.reference===item.reference);if(!t||['failed','reversed'].includes(t.state))continue;try{await applyBankResult(this,t,item);}catch(error){if(!(error instanceof Fault))throw error;}}
        }catch(error){if(!(error instanceof Fault))throw error;if(error.code==='RATE_LIMITED')break;await this.audit('worker','batch.query_pending',run.projectId,{runId,batchReference:reference,code:error.code});}
      }
    }else{
      const t=transfers.find(t=>t.id===transferId);ensure(t,'NOT_FOUND',404);
      if(!['queued','failed','reversed'].includes(t.state))try{await applyBankResult(this,t,await this.providers.bank.call<TransferResult>('GET','/transfers/'+encodeURIComponent(t.reference)));}catch(error){if(!(error instanceof Fault))throw error;}
    }
    return this.db.lock('run:'+runId,async tx=>{const current=await tx.get('runs',runId);ensure(current,'NOT_FOUND',404);const final=await tx.list('transfers',{runId});const complete=final.length>0&&final.every(t=>['settled','failed','reversed'].includes(t.state));if(!['draft','funded','cancelled','preflight_failed'].includes(current.state)){await tx.put('runs',{...current,state:complete?'complete':'partially_complete'});if(complete&&current.state!=='complete')await this.emit(runId,'run.complete',undefined,tx);}return final;});
  }
  async close(runId: string, reason?: string) {
    const run=await this.required('runs',runId); ensure(Date.parse(typeof run.reportClosesAt==='string'?run.reportClosesAt:run.closesAt)<=Date.now(),'PERIOD_NOT_DUE',409);
    return this.db.lock('chain:'+run.projectId,async tx=>{
      const existing=await tx.list('attestations',{projectId:run.projectId});
      if(!reason && existing.some(a=>a.period===run.period)) return existing.find(a=>a.period===run.period)!;
      const previous=existing.at(-1); const supersedes=reason?existing.filter(a=>a.period===run.period).at(-1)?.id:null;
      if(reason&&!supersedes) return null;
      const periodRuns=run.allocationId?(await tx.list('runs',{projectId:run.projectId,period:run.period})).filter(r=>r.allocationId):[run];
      const transfers=(await tx.list('transfers',{projectId:run.projectId})).filter(t=>periodRuns.some(r=>r.id===t.runId)); const settled=transfers.filter(t=>t.state==='settled'&&t.recipientKind!=='fund').sort((a,b)=>a.id.localeCompare(b.id));
      const confirmations=await tx.list('confirmations',{projectId:run.projectId});
      const leaves=settled.map(t=>({participantId:hash(t.participantId),amount:t.amount,settledAt:t.settledAt,bankReferenceHash:hash(t.sessionId??t.reference),confirmed:confirmations.some(c=>c.transferId===t.id)}));
      const roster=await tx.get('rosters',run.rosterId); ensure(roster,'NOT_FOUND',404);
      const commitment=await tx.get('commitments',run.commitmentId); ensure(commitment,'NOT_FOUND',404);
    const committed=run.allocationId?(await tx.list('allocations',{projectId:run.projectId,period:run.period})).reduce((n,a)=>n+cents(a.householdObligation),0n):cents(commitment.basis==='net'?run.declaredNet:run.declaredGross)*BigInt(Math.round(commitment.percentage*100))/10000n;
      const moved=settled.reduce((s,t)=>s+cents(t.amount),0n); const charges=settled.reduce((s,t)=>s+cents(t.fee)+cents(t.vat)+cents(t.stampDuty),0n);
      const disputes=(await tx.list('disputes',{projectId:run.projectId})).filter(d=>!d.runId||d.runId===runId);
      const signals=await tx.list('signals',{projectId:run.projectId}); const signalCounts: Record<string,number>={}; for(const s of signals) signalCounts[s.class]=(signalCounts[s.class]??0)+1;
      const substantiatedCaseCount=(await tx.list('cases',{projectId:run.projectId,status:'substantiated'})).length;
      const document={projectId:run.projectId,period:run.period,enrolledCount:run.allocationId?new Set((await tx.list('rosters',{projectId:run.projectId,period:run.period})).flatMap(r=>r.participantIds)).size:roster.participantIds.length,paidCount:new Set(settled.map(t=>t.participantId)).size,amountCommitted:money(committed),amountMovedToHouseholds:money(moved),chargesBorne:money(charges),shortfall:money(committed>moved?committed-moved:0n),confirmationCount:leaves.filter(l=>l.confirmed).length,disputesOpen:disputes.filter(d=>!d.resolvedAt).length,disputesSubstantiated:disputes.filter(d=>d.status==='substantiated').length,signalCounts,merkleRoot:merkle(leaves).root,previousHash:previous?.hash??null,supersedes:supersedes??null,reason:reason??null,closedAt:now()};
      const provenanceDocument:Attestation['document']={...document,substantiatedCaseCount,bankEvidence:process.env.BANK_PROVIDER==='live'?'sandbox':'mock'};
      if(reason) {
        const comparable=(d:Attestation['document'])=>{const {previousHash,supersedes,closedAt,bankEvidence,...rest}=d;return canonical(rest);};
        const replay=existing.find(a=>a.runId===runId&&comparable(a.document)===comparable(provenanceDocument));if(replay)return replay;
      }
      const h=hash(canonical(provenanceDocument));
      const attestation=await tx.put('attestations',row({projectId:run.projectId,period:run.period,runId,document:provenanceDocument,hash:h,signature:this.signer.sign(h),publicKey:this.signer.publicKey,leaves,transferIds:settled.map(t=>t.id)}));
      await tx.put('jobs',row({id:'anchor:'+attestation.id,type:'anchor',data:{attestationId:attestation.id},state:'pending',attempts:0,nextAt:now()}));
      return attestation;
    });
  }
  async disclosure(attestation: Attestation, transferId: string) {
    const index=attestation.transferIds.indexOf(transferId); ensure(index>=0,'LEAF_NOT_IN_ROOT',404);
    return {leaf:attestation.leaves[index],proof:merkle(attestation.leaves).proof(index),root:attestation.document.merkleRoot,attestationId:attestation.id,attestationHash:attestation.hash,signature:attestation.signature,publicKey:attestation.publicKey};
  }
  async publicProject(projectId: string) {
    const p=await this.required('projects',projectId); const participants=await this.db.list('participants',{projectId});
    const attestations=await this.db.list('attestations',{projectId}); const disputes=await this.db.list('disputes',{projectId});
    const commitment=(await this.db.list('commitments',{projectId,accepted:true})).at(-1);
    return {...demonstrationDisclosure(p.isDemonstration===true||this.providers.bank instanceof MockBank||attestations.some(a=>['mock','sandbox'].includes(a.document.bankEvidence))),referenceStatistics:publicReferenceStatistics(p.referenceStatistics),id:p.id,name:p.name,registry:p.registry,operator:p.operator,methodology:p.methodology,registryId:p.registryId,country:p.country,status:p.status,organisationId:p.organisationId,enrolled:participants.length,commitment:commitment?{percentage:commitment.percentage,basis:commitment.basis,cadence:commitment.cadence,reportingCadence:reportingCadence(commitment),paymentSchedule:commitment.paymentSchedule??null,sourceLocator:commitment.sourceLocator??null,sourceAlignment:commitment.sourceAlignment??null,specifiedSourceLocator:commitment.specifiedSourceLocator??null,sourceQuote:commitment.source_quote,page:commitment.page}:null,attestations:await Promise.all(attestations.map(a=>this.attestationView(a))),openDisputes:disputes.filter(d=>!d.resolvedAt).length,signalCount:(await this.db.list('signals',{projectId})).length};
  }
  publicAttestation(a: Attestation) { return {...demonstrationDisclosure(['mock','sandbox'].includes(a.document.bankEvidence)),id:a.id,createdAt:a.createdAt,document:a.document,hash:a.hash,signature:a.signature,publicKey:a.publicKey}; }
  async attestationView(a:Attestation){
    const records=await this.db.list('attestations',{projectId:a.projectId}),index=records.findIndex(r=>r.id===a.id),previous=index>0?records[index-1]:null;
    return {...this.publicAttestation(a),anchor:await this.db.get('anchors',a.id)??{status:'pending'},chainPosition:index+1,supersededBy:records.find(r=>r.document.supersedes===a.id)?.id??null,chainBreak:a.document.previousHash!==(previous?.hash??null)};
  }
  async geography(projectId: string) {
    await this.required('projects',projectId); const cells=new Map<string,number>();
    for(const p of await this.db.list('participants',{projectId})) if(p.point) {const cell=latLngToCell(p.point[1],p.point[0],4);cells.set(cell,(cells.get(cell)??0)+1);}
    return [...cells].filter(([,n])=>n>=5).map(([cell,count])=>({cell,count}));
  }
  async chain(projectId: string) {
    const records=await this.db.list('attestations',{projectId});let previous: string|null=null;
    const discontinuities: {attestationId:string;code:string}[]=[];
    for(const a of records){if(a.document.previousHash!==previous)discontinuities.push({attestationId:a.id,code:'CHAIN_DISCONTINUITY'});if(!verifyAttestationRecord(a))discontinuities.push({attestationId:a.id,code:'PROOF_INVALID'});previous=a.hash;}
    return {projectId,valid:discontinuities.length===0,records:records.length,discontinuities};
  }
  async evaluateAlerts(projectId:string){
    const rules=(await this.db.list('alerts',{projectId})).filter(a=>a.kind!=='event'&&a.condition);
    if(!rules.length)return;
    const attestations=await this.db.list('attestations',{projectId}),latest=attestations.at(-1);const open=(await this.db.list('disputes',{projectId})).filter(d=>!d.resolvedAt);
    for(const rule of rules){
      let triggered=false,evidence:Record<string,string|number>={};
      if(rule.condition==='coverage_below'&&latest){const d=latest.document;const committed=cents(d.amountCommitted);const coverage=committed?Number(cents(d.amountMovedToHouseholds)*10000n/committed)/100:0;triggered=coverage<(rule.threshold??0);evidence={attestationHash:latest.hash,coverage};}
      if(rule.condition==='dispute_raised'&&open.length){triggered=true;evidence={count:open.length,eventDigest:hash(canonical(open.map(d=>d.id).sort()))};}
      if(rule.condition==='correction_issued'&&latest?.document.supersedes){triggered=true;evidence={attestationHash:latest.hash};}
      if(rule.condition==='period_closed_late'&&latest){const run=await this.db.get('runs',latest.runId);triggered=!!run&&Date.parse(latest.document.closedAt)>Date.parse(run.closesAt);evidence={attestationHash:latest.hash};}
      if(!triggered)continue;
      const eventId=hash('alert:'+rule.id+canonical(evidence));if(await this.db.get('alerts',eventId))continue;
      await this.db.put('alerts',row({id:eventId,kind:'event',ruleId:rule.id,userId:rule.userId,projectId,condition:rule.condition,evidence}));
      await this.enqueue('verifier-alert',{userId:rule.userId,projectId,condition:rule.condition,evidence},'alert-email:'+eventId);
    }
  }
  async receipt(token: string) { const r=await this.db.get('receipts',hash(token)); ensure(r&&!r.revoked&&Date.parse(r.expiresAt)>Date.now(),'TOKEN_EXPIRED',410); return r; }
  async confirm(receipt:Pick<Receipt,'projectId'|'participantId'|'transferId'>) {
    return this.db.lock('confirmation:'+receipt.transferId,async tx=>{
      ensure(!(await tx.list('confirmations',{transferId:receipt.transferId})).length,'ALREADY_CONFIRMED',409);
      const t=await tx.get('transfers',receipt.transferId); ensure(t?.state==='settled','INVALID_REQUEST',409);
      const c=await tx.put('confirmations',row({projectId:receipt.projectId,transferId:receipt.transferId,participantId:receipt.participantId}));
      for(const d of await tx.list('disputes',{transferId:receipt.transferId})) if(!d.resolvedAt) await tx.put('disputes',{...d,status:'unsubstantiated',resolutionBasis:'participant_confirmation',resolvedAt:now()});
      return c;
    });
  }
  async dispute(rawInput: unknown, receipt?:Row&Pick<Receipt,'projectId'|'participantId'|'transferId'>) {
    const input=disputeInput(rawInput);const projectId=receipt?.projectId??input.projectId;ensure(projectId,'INVALID_REQUEST'); await this.required('projects',projectId);
    if(input.voiceNoteId){ensure(receipt,'FORBIDDEN',403);const evidence=await this.required('evidence',input.voiceNoteId);ensure(evidence.projectId===projectId&&evidence.kind==='voice_note'&&evidence.ownerId===('receipt:'+receipt.id),'FORBIDDEN',403);}
    ensure(['not_received','someone_else_collected','wrong_amount'].includes(input.category),'INVALID_REQUEST');
    if(receipt) ensure(!(await this.db.list('disputes',{transferId:receipt.transferId})).some(d=>!d.resolvedAt),'DISPUTE_ALREADY_OPEN',409);
    const dispute=await this.db.put('disputes',row({projectId,transferId:receipt?.transferId??null,participantId:receipt?.participantId??null,category:input.category,body:typeof input.body==='string'?input.body.slice(0,4000):'',voiceNoteId:input.voiceNoteId??null,requiresListening:!!input.voiceNoteId,status:'open'}));
    if(dispute.body)await this.enqueue('triage',{projectId:dispute.projectId,disputeId:dispute.id},'triage:'+dispute.id);return dispute;
  }
  async detect(projectId: string, flows: Flow[] = []) {
    const participants=await this.db.list('participants',{projectId}); const found: Signal[]=[];
    const add=async (kind:string,ids:string[],detail:Signal['detail'])=>{
      const signalId=hash(projectId+kind+canonical([...ids].sort()));
      if(await this.db.get('signals',signalId)) return;
      const signal=await this.db.put('signals',row({id:signalId,projectId,class:kind,severity:'review',participantIds:ids,detail})); found.push(signal);
      await this.db.put('cases',row({projectId,signalId:signal.id,status:'open',actions:[]}));
    };
    const group=async(key:(p:Participant)=>string|undefined,kind:string,threshold:number)=>{const groups=new Map<string,string[]>();for(const p of participants){const k=key(p);if(k)groups.set(k,[...(groups.get(k)??[]),p.id]);}for(const [k,ids]of groups)if(ids.length>=threshold)await add(kind,ids,{bucket:k,count:ids.length});};
    await group(p=>p.point?`${p.point[0].toFixed(4)},${p.point[1].toFixed(4)}`:undefined,'geo_clustering',10);
    // Device reuse is only across distinct bound agents, not normal captures by one agent.
    const agents=await this.db.list('agents',{projectId}); const byDevice=new Map<string,Agent[]>(); for(const a of agents)if(a.deviceKey)byDevice.set(a.deviceKey,[...(byDevice.get(a.deviceKey)??[]),a]);
    for(const agents of byDevice.values())if(agents.length>1)await add('device_reuse',participants.filter(p=>agents.some(a=>a.id===p.agentId)).map(p=>p.id),{agents:agents.map(a=>a.id)});
    await group(p=>p.nameMatch!=='match'?p.agentId:undefined,'name_mismatch',5);
    await group(p=>p.agentId+':'+p.capturedAt.slice(0,16),'velocity_anomaly',20);
    const targets=new Map<string,Set<string>>(); for(const f of flows)if(Date.parse(f.sentAt)-Date.parse(f.receivedAt)<=48*3600_000&&Date.parse(f.sentAt)>=Date.parse(f.receivedAt)){if(!targets.has(f.to))targets.set(f.to,new Set());targets.get(f.to)!.add(f.participantId);if((f.dormantDays??0)>=30)await add('dormancy_sweep',[f.participantId],{to:f.to});}
    for(const [to,ids]of targets)if(ids.size>=10)await add('onward_concentration',[...ids],{to,count:ids.size,edges:flows.filter(f=>f.to===to&&ids.has(f.participantId)).map(f=>({from:f.participantId,to:f.to,amount:f.amount??null,occurredAt:f.sentAt})),sampled:true});
    return found;
  }
  private async requireIdleProject(projectId:string,jobProjectId?:string){
    // Legacy review jobs lack projectId; the subject record is authoritative.
    ensure(jobProjectId===undefined||jobProjectId===projectId,'FORBIDDEN',403);
    ensure(!(await this.db.list('runs',{projectId})).some(r=>['executing','partially_complete'].includes(r.state)),'RATE_LIMITED',429);
  }
  async processJob(job:Pick<Job,'id'|'createdAt'|'type'|'data'>) {
    const {type,data}=job;
    if(type==='funds-anchor'){const event=await this.required('funds_events',jobText(data,'eventId'));const result=await this.providers.anchor(event.hash);await this.db.put('anchors',row({id:'funds:'+event.id,projectId:event.projectId,...result}));return;}
    if(type==='participant-import'){
      const job=await this.required('import_jobs',jobText(data,'importId'));const rows=Array.isArray(job.rows)?job.rows:[];for(let index=0;index<rows.length;index++){const entry=record(rows[index]);if(entry.state!=='pending')continue;try{const captured=await this.enrol({id:jobText(data,'actorId'),role:'developer_admin',organisationId:jobText(data,'organisationId')},{...record(openPayload(entry.payload,jobText(data,'projectId'))),projectId:jobText(data,'projectId')});rows[index]={row:entry.row,state:'accepted',participantId:captured.id};}catch(error){if(error instanceof Fault&&[429,503,504].includes(error.status))throw error;rows[index]={row:entry.row,state:'rejected',message:error instanceof Fault?error.code:'This record could not be imported.'};}await this.db.put('import_jobs',{...job,state:'processing',rows,accepted:rows.filter(value=>record(value).state==='accepted').length,rejected:rows.filter(value=>record(value).state==='rejected').length});}await this.db.put('import_jobs',{...job,state:'done',rows,accepted:rows.filter(value=>record(value).state==='accepted').length,rejected:rows.filter(value=>record(value).state==='rejected').length});return;
    }
    if(type==='auth-email'){
      const token=await this.required('tokens',hash(jobText(data,'token')));if(token.used||Date.parse(token.expiresAt??'')<=Date.now())return;
      const user=await this.required('users',jobText(data,'userId'));await this.providers.email(user.email,data.type==='verify'?'Verify your Attest account':'Reset your Attest password',`Use this one-time ${data.type} token within one hour: ${jobText(data,'token')}`);
      return;
    }
    if(type==='verifier-alert'){const user=await this.required('users',jobText(data,'userId'));await this.providers.email(user.email,'Attest project alert',`Project ${jobText(data,'projectId')}: ${data.condition}. Evidence: ${canonical(data.evidence)}`);return;}
    if(type==='sms-reply'){const p=await this.required('participants',jobText(data,'participantId'));await this.providers.sms(p.phone,jobText(data,'message'),job.id);return;}
    if(type==='account-control'){
      const participant=await this.required('participants',jobText(data,'participantId'));ensure(participant.bankCode==='000014','ACCOUNT_RESTRICTED',422);
      const path=capabilityPath(process.env.BANK_ACCOUNT_CONTROL_PATH??'/admin/accounts/{account}/status',participant.accountNumber);await this.providers.bank.call('POST',path,{status:data.action==='freeze'?'frozen':'active',reason:data.reason,case_reference:jobText(data,'caseId')},hash(job.id));
      await this.audit('bank-worker','account.'+data.action,participant.projectId,{participantId:participant.id,caseId:jobText(data,'caseId')});return;
    }
    if(type==='onward-sync'){
      const participants=await this.db.list('participants',{projectId:jobText(data,'projectId')});for(const p of participants)await this.enqueue('onward-account',{projectId:jobText(data,'projectId'),participantId:p.id,page:1},'onward:'+job.id+':'+p.id+':1');return;
    }
    if(type==='onward-account'){
      ensure(!(await this.db.list('runs',{projectId:jobText(data,'projectId')})).some(r=>['executing','partially_complete'].includes(r.state)),'RATE_LIMITED',429);
      const p=await this.required('participants',jobText(data,'participantId'));const path=process.env.BANK_FLOW_PATH?capabilityPath(process.env.BANK_FLOW_PATH,p.accountNumber).replaceAll('{page}',String(jobPage(data))):null;
      const response=path?await this.providers.bank.call<ListResult<Flow>|Flow[]>('GET',path):await onwardPage(this,p.id,jobPage(data));const records=Array.isArray(response)?response:response.items;ensure(Array.isArray(records)&&records.length<=1000,'INVALID_BANK_RESPONSE',502);
      await this.db.put('tokens',row({id:'onward-flows:'+p.id+':'+jobPage(data),projectId:jobText(data,'projectId'),type:'onward-flows',flows:records.map(f=>({...f,participantId:p.id}))}));
      const pages=Number(Array.isArray(response)?1:response.meta?.total_pages??1);ensure(Number.isInteger(pages)&&pages>=1&&pages<=100,'INVALID_BANK_RESPONSE',502);
      if(jobPage(data)<pages)await this.enqueue('onward-account',{...data,page:jobPage(data)+1},job.id.replace(/:\d+$/,':'+(jobPage(data)+1)));
      const flows=(await this.db.list('tokens',{projectId:jobText(data,'projectId'),type:'onward-flows'})).flatMap(r=>r.flows??[]);await this.detect(jobText(data,'projectId'),flows);return;
    }
    if(type==='execute') await this.execute(jobText(data,'runId'));
    else if(type==='retry') await this.retry(jobText(data,'runId'),jobText(data,'failureClass'));
    else if(type==='requery') await this.requery(jobText(data,'runId'));
    else if(type==='correction') await this.close(jobText(data,'runId'),data.reason);
    else if(type==='signals') await this.detect(jobText(data,'projectId'),data.flows??[]);
    else if(type==='registry-sync'){
      const project=await this.required('projects',jobText(data,'projectId'));
      try{const reference=await this.providers.registry(project.registryId);await this.db.put('projects',{...project,...reference,boundary:reference.boundary??project.boundary,boundaryStatus:reference.boundary||project.boundary?'available':'upload_required',registrySyncedAt:now(),registrySyncStatus:'current'});await this.db.put('registry_history',row({projectId:project.id,registryId:project.registryId,status:'success',sourceHash:hash(canonical(reference)),principal:'worker'}));}
      catch(error){await this.db.put('registry_history',row({projectId:project.id,registryId:project.registryId,status:'failed',code:error instanceof Fault?error.code:'REGISTRY_UNREACHABLE',principal:'worker'}));throw error;}
    }
    else if(type==='reconciliation'){const result=await this.reconciliation(jobText(data,'projectId'));await this.db.put('notifications',row({...result,type:'reconciliation'}));if(result.status==='mismatch')await this.audit('worker','reconciliation.mismatch',jobText(data,'projectId'),result);}
    else if(type==='recover-webhooks')await this.recoverWebhooks();
    else if(type==='name-review'||type==='triage'){
      if(type==='name-review'){
        const p=await this.required('participants',jobText(data,'participantId'));await this.requireIdleProject(p.projectId,data.projectId);
        const proposal=await this.providers.adjudicate(p.name,p.resolvedAccountName??'');
        await this.db.put('participants',{...p,nameAdjudication:proposal});
      }else{const d=await this.required('disputes',jobText(data,'disputeId'));await this.requireIdleProject(d.projectId,data.projectId);const proposal=await this.providers.triage(d.body);await this.db.put('disputes',{...d,triageSuggestion:proposal});}
    }
    else if(type==='extraction') {
      if(await this.db.get('commitments','extraction:'+job.id))return;ensure(!(await this.db.list('runs',{projectId:jobText(data,'projectId')})).some(r=>['executing','partially_complete'].includes(r.state)),'RATE_LIMITED',429);
      try{const result=await this.providers.extract(jobPages(data));await this.db.put('commitments',row({id:'extraction:'+job.id,projectId:jobText(data,'projectId'),...result,accepted:false,original:true,reviewStatus:result.confidence<0.8?'pending':'developer_review'}));}
      catch(error){if(!(error instanceof Fault)||!['EXTRACTION_LOW_CONFIDENCE','PDD_NO_COMMITMENT','PDD_UNREADABLE'].includes(error.code))throw error;const proposal=await this.db.get('tokens','proposal:extract:v2:'+hash(canonical(jobPages(data))));await this.db.put('commitments',row({id:'extraction:'+job.id,projectId:jobText(data,'projectId'),original:true,accepted:false,reviewStatus:'pending',errorCode:error.code,proposal:proposal?.proposal??null}));}
    }
    else if(type==='anchor') {const a=await this.required('attestations',jobText(data,'attestationId'));const result=await this.providers.anchor(a.hash);await this.db.put('anchors',row({id:a.id,projectId:a.projectId,attestationId:a.id,...result}));}
    else if(type==='enrol-notice'||type==='payment-notice') {
      const transfer=type==='payment-notice'?await this.required('transfers',jobText(data,'transferId')):null;
      const p=await this.required('participants',transfer?.participantId??jobText(data,'participantId'));const project=await this.required('projects',p.projectId!);
      if(type==='enrol-notice') await this.db.put('participants',{...p,noticeAttempted:true});
      const text=translation(p.language??'en');let message=text.notice(project.name,p.accountNumber.slice(-4));
      if(transfer){const token=id()+id();await this.db.put('receipts',row({id:hash(token),projectId:p.projectId,participantId:p.id,transferId:transfer.id,expiresAt:new Date(Date.now()+30*86400_000).toISOString()}));message=text.paid(project.name,transfer.amount,transfer.settledAt??now(),`${process.env.PUBLIC_URL??'http://localhost:8080'}/receipt/${token}`);}
      const sent=await sendParticipantNotice(this,p,message,job.id,type);
      await this.db.put('notifications',row({...sent,id:job.id,providerMessageId:sent.id,projectId:p.projectId,participantId:p.id,type}));
      if(type==='enrol-notice') await this.db.put('participants',{...p,noticeAttempted:true,noticeStatus:'sent'});
    }
    else if(type==='forge-event') {
      const event={...data,type:data.type??(data as JobData&{event?:string}).event}, payload=event.data??{};
      if(event.type==='transfer.bulk.completed'){
        const runs=(await this.db.list('runs')).filter(r=>(r.batchReferences??[r.batchReference]).includes(String(payload.batch_reference)));for(const run of runs)await this.requery(run.id);
      }else if(event.type?.startsWith('transfer.')) {
        if(typeof payload.reference==='string')await new Finance(this).observeCarbonPayout(payload.reference);
        const transfers=await this.db.list('transfers',{reference:payload.reference});
        for(const t of transfers)await applyBankResult(this,t,{...payload,status:event.type.split('.').at(-1)!});
      } else if(event.type==='carbon.mrv.verified'||event.type==='carbon.mrv.rejected') {
        const projects=await this.db.list('projects',{carbonId:payload.project_id});for(const p of projects){const project:Project={...p,mrvVerified:event.type.endsWith('verified'),mrvStatus:event.type.endsWith('verified')?'verified':'rejected'};await this.db.put('projects',project);if(project.mrvVerified&&project.retirement)await this.openCarbonPeriod(project,project.retirement);}
      } else if(event.type==='carbon.credits.retired') {
        const projects=await this.db.list('projects',{carbonId:payload.project_id});for(const p of projects){const retirement:CarbonEventData={id:optionalText(payload.retirement_id)??optionalText(payload.id),retirement_id:optionalText(payload.retirement_id),credit_batch_id:optionalText(payload.credit_batch_id),period:optionalText(payload.period),certificate_id:optionalText(payload.certificate_id)??optionalText(payload.retirement_id),eventId:event.event_id};await this.db.put('projects',{...p,retirement});if(p.mrvVerified)await this.openCarbonPeriod(p,retirement);}
      }else if(event.type==='virtual_account.credited'||event.type==='settlement.completed'){
        const projects=(await this.db.list('projects')).filter(p=>p.sourceAccount&&(p.sourceAccount===payload.account_number||p.sourceAccount===payload.source_account));
        if(event.type==='virtual_account.credited')await new Finance(this).receive(String(event.event_id),payload);
        for(const p of projects){if(event.type==='virtual_account.credited'){const amount=bankMoney(payload.amount);await this.db.put('notifications',row({id:'funding:'+hash(String(payload.account_number??payload.source_account)+':'+String(payload.session_id??payload.transaction_id??event.event_id)),projectId:p.id,type:'funding',amount,bankReference:payload.reference??event.event_id}));}await this.enqueue('reconciliation',{projectId:p.id},'reconciliation:'+event.event_id+':'+p.id);}
      }
    }
  }
  async openCarbonPeriod(project:Project,retirement:CarbonEventData){
    const rosterId=hash(project.id+':retirement:'+String(retirement.id??retirement.eventId));
    await this.db.lock('carbon-period:'+rosterId,async tx=>{if(await tx.get('rosters',rosterId))return;const commitment=(await tx.list('commitments',{projectId:project.id,accepted:true})).at(-1);ensure(commitment,'EXTRACTION_LOW_CONFIDENCE',422);const period=String(retirement.period??currentPeriod(reportingCadence(commitment)));periodDeadline(period,reportingCadence(commitment));const participants=await tx.list('participants',{projectId:project.id});await tx.put('rosters',row({id:rosterId,projectId:project.id,period,participantIds:participants.map(p=>p.id),openedBy:'carbon.credits.retired',certificateId:retirement.certificate_id??null}));const latest=await tx.get('projects',project.id);await tx.put('projects',{...latest!,openPeriod:period,periodOpenedAt:now(),openRosterId:rosterId});});
  }
  async reconciliation(projectId:string){
    const project=await this.required('projects',projectId);ensure(project.sourceAccount,'FUNDING_NOT_RECEIVED',422);
    const balance=await this.providers.bank.call<BalanceResult>('GET',`/accounts/${project.sourceAccount}/balance`);const transfers=await this.db.list('transfers',{projectId});
    const credits=(await this.db.list('notifications',{projectId,type:'funding'})).reduce((total,r)=>total+cents(r.amount??'0.00'),0n);
    const debits=transfers.filter(t=>t.state==='settled').reduce((total,t)=>total+cents(t.totalDebit),0n);
    const pending=transfers.filter(t=>['queued','in_flight','settling'].includes(t.state)).length;const available=bankMoney(balance.available_balance);
    const expected=project.openingBalance?cents(project.openingBalance)+credits-debits:null;const difference=expected===null?null:expected-cents(available);
    const charges=transfers.filter(t=>t.state==='settled').reduce((total,t)=>total+cents(t.fee)+cents(t.vat)+cents(t.stampDuty),0n);
    return {projectId,openingBalance:project.openingBalance??null,inbound:money(credits),outbound:money(debits),charges:money(charges),bankBalance:available,expectedBalance:expected===null?null:money(expected),difference:difference===null?null:money(difference),pendingTransfers:pending,status:pending||expected===null?'pending':difference===0n?'matched':'mismatch'};
  }
  async recoverWebhooks(){
    const result=await this.providers.bank.call<ListResult<Delivery>|Delivery[]>('GET','/webhooks/deliveries');const deliveries=Array.isArray(result)?result:result.items;
    ensure(Array.isArray(deliveries),'INVALID_BANK_RESPONSE',502);let replayed=0;
    for(const delivery of deliveries){if(!['pending','failed','withheld'].includes(delivery.status)||replayed>=10)continue;ensure(typeof delivery.event_id==='string','INVALID_BANK_RESPONSE',502);const response=await this.providers.bank.call<{accepted:boolean;payload?:ForgeEvent}>('POST',`/webhooks/deliveries/${encodeURIComponent(delivery.event_id)}/replay`,{},hash('replay:'+delivery.event_id));if(process.env.BANK_PROVIDER!=='live'&&response.payload)await this.enqueue('forge-event',response.payload,'replayed:'+delivery.event_id);replayed++;}
    return {replayed};
  }
  private async recoverLegacyReviewJob(candidate:Job):Promise<Job>{
    const recoverable=(job:Job)=>job.state==='failed'&&job.lastError==='INVALID_REQUEST'&&job.data.projectId===undefined&&['name-review','triage'].includes(job.type);
    if(!recoverable(candidate))return candidate;
    return this.db.lock('job:'+candidate.id,async tx=>{
      const current=await tx.get('jobs',candidate.id);
      if(!current)return candidate;
      if(!recoverable(current))return current;
      const reference=current.type==='name-review'?current.data.participantId:current.data.disputeId;
      if(typeof reference!=='string')return current;
      const subject=current.type==='name-review'?await tx.get('participants',reference):await tx.get('disputes',reference);
      if(!subject)return current;
      // Recover only the known missing-project failure, once, under the claim lock.
      return tx.put('jobs',{...current,data:{...current.data,projectId:subject.projectId},state:'pending',lastError:undefined,nextAt:now(),recoveryReason:'missing_review_project',recoveredAt:now()});
    });
  }
  async processQueuedJobs(options:{type?:Job['type'];limit?:number}={}) {
    // DB-backed jobs survive Redis loss; serialized claims avoid concurrent remote execution.
    let processedJobs=0;for(const candidate of await this.db.list('jobs',options.type?{type:options.type}:{})) {
      const pending=await this.recoverLegacyReviewJob(candidate);
      if(['done','failed'].includes(pending.state)||Date.parse(pending.nextAt)>Date.now())continue;
      if(processedJobs++>=(options.limit??50))break;
      const claimed=await this.db.lock('job:'+pending.id,async tx=>{
        const job=await tx.get('jobs',pending.id);if(!job||['done','failed'].includes(job.state)||Date.parse(job.nextAt)>Date.now())return;
        const claim:Job={...job,state:'running',nextAt:new Date(Date.now()+180_000).toISOString()};await tx.put('jobs',claim);return claim;
      });
      if(!claimed)continue;
      try{await this.processJob(claimed);await this.db.put('jobs',{...claimed,data:claimed.type==='auth-email'?{...claimed.data,token:undefined}:claimed.data,state:'done',completedAt:now()});}
      catch(e){const permanent=e instanceof Fault&&['INVALID_REQUEST','FORBIDDEN','PERIOD_CLOSED','NOT_FOUND','LIMIT_EXCEEDED','ACCOUNT_RESTRICTED','PREFLIGHT_EXCLUSIONS_REQUIRED'].includes(e.code);await this.db.put('jobs',{...claimed,state:permanent?'failed':'pending',attempts:claimed.attempts+1,lastError:e instanceof Fault?e.code:'JOB_FAILED',nextAt:new Date(Date.now()+Math.min(3600_000,2**Math.min(claimed.attempts,10)*5000)).toISOString()});}
    }
  }
  async tick() {
    await new Finance(this).sync();
    if(process.env.WEBHOOK_RECOVERY_ENABLED==='true')await this.enqueue('recover-webhooks',{},'recover-webhooks:'+Math.floor(Date.now()/60000));
    await this.processQueuedJobs();
    for(const run of await this.db.list('runs')) {
      // Include settled transfers for late reversal detection.
      if(['executing','partially_complete','complete'].includes(run.state)){await submitPendingBatches(this,run.id);await this.requery(run.id);}
      if(run.state!=='cancelled'&&Date.parse(typeof run.reportClosesAt==='string'?run.reportClosesAt:run.closesAt)<=Date.now()) await this.close(run.id);
    }
    for(const project of await this.db.list('projects')) {
      if(process.env.REGISTRY_PROVIDER&&process.env.REGISTRY_PROVIDER!=='mock')await this.enqueue('registry-sync',{projectId:project.id},'registry-sync:'+project.id+':'+now().slice(0,10));
      await this.detect(project.id);
      await this.evaluateAlerts(project.id);
      const check=await this.chain(project.id);
      if(!check.valid){const auditId=hash('chain:'+canonical(check));if(!await this.db.get('audit',auditId))await this.db.put('audit',row({id:auditId,projectId:project.id,principal:'worker',action:'chain.discontinuity',detail:check}));}
    }
    const confirmations=await this.db.list('confirmations');
    for(const t of await this.db.list('transfers'))if(t.state==='settled'&&Date.parse(t.settledAt??'')<Date.now()-7*86400_000&&!confirmations.some(c=>c.transferId===t.id)){
      const signalId='unconfirmed:'+t.id;if(!await this.db.get('signals',signalId))await this.db.put('signals',row({id:signalId,projectId:t.projectId,class:'unconfirmed_receipt',severity:'review',participantIds:[t.participantId],detail:{transferId:t.id}}));
    }
  }
}
