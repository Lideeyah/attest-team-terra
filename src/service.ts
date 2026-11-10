import { EventEmitter } from 'node:events';
import { verify as verifySignature } from 'node:crypto';
import { randomBytes } from 'node:crypto';
import { latLngToCell } from 'h3-js';
import { Fault, ensure, row, now, hash, canonical, cents, money, bankMoney, id, identityHash, nameMatch, maskPhone, merkle, Signer, verifyAttestationRecord, type Row, type Principal } from './core.js';
import { Providers, estimateCharges } from './providers.js';
import type { Store } from './store.js';

export class Service {
  events = new EventEmitter(); signer = new Signer();
  constructor(public db: Store, public providers = new Providers(db)) {}
  async required(table: Parameters<Store['get']>[0], id: string) { const r=await this.db.get(table,id); ensure(r,'NOT_FOUND',404); return r; }
  async audit(principal: string, action: string, projectId?: string, detail: any = {}) { await this.db.put('audit',row({principal,action,projectId,detail})); }
  async project(p: Principal, projectId: string, write = false) {
    const project=await this.required('projects',projectId);
    const dev=['developer_admin','developer_operator'].includes(p.role) && p.organisationId===project.organisationId;
    const agent=p.role==='agent'&&p.projectId===projectId;
    ensure(write ? dev : dev || agent || p.role==='platform_admin' || p.role==='bank_ops','FORBIDDEN',403);
    return project;
  }
  async scoped(p: Principal, table: Parameters<Store['get']>[0], entityId: string, write=false) {
    const entity=await this.required(table,entityId); await this.project(p,entity.projectId!,write);
    if(p.role==='agent') ensure(entity.agentId===p.id,'FORBIDDEN',403);
    return entity;
  }
  async createProject(p: Principal, registryId: string) {
    ensure(p.role==='developer_admin','FORBIDDEN',403);
    const record=await this.providers.registry(registryId);
    const project=await this.db.put('projects',row({...record,organisationId:p.organisationId,status:'onboarding'}));
    await this.audit(p.id,'project.created',project.id); return project;
  }
  async enqueue(type: string, data: any, jobId:string=id()) { const existing=await this.db.get('jobs',jobId); if(existing) return existing; return this.db.put('jobs',row({id:jobId,type,data,state:'pending',attempts:0,nextAt:now()})); }
  async authEmail(user:Row,type:'verify'|'reset'){
    const token=randomBytes(32).toString('hex');const tokenId=hash(token);
    await this.db.put('tokens',row({id:tokenId,userId:user.id,type,expiresAt:new Date(Date.now()+3600_000).toISOString(),used:false}));
    await this.enqueue('auth-email',{userId:user.id,type,token},'auth-email:'+tokenId);
  }
  async enrol(p: Principal, input: any): Promise<Row> {
    const project=await this.project(p,input.projectId);
    ensure(['agent','developer_admin','developer_operator'].includes(p.role),'FORBIDDEN',403);
    ensure(input.consent===true,'CONSENT_MISSING');
    ensure(typeof input.clientId==='string'&&/^[a-f0-9-]{36}$/i.test(input.clientId),'INVALID_REQUEST');
    ensure(typeof input.name==='string'&&input.name.length>2&&input.name.length<200&&typeof input.phone==='string'&&/^\+\d{8,15}$/.test(input.phone),'INVALID_REQUEST');
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
      const existing=await tx.get('participants',input.clientId);
      if(existing) { ensure(existing.projectId===project.id && existing.identityHash===digest,'DUPLICATE_REQUEST',409); return existing; }
      ensure(!(await tx.list('participants',{identityHash:digest})).length,'IDENTITY_DUPLICATE',409);
      const flags: string[]=[];
      let verification: any;
      try { verification=await this.providers.bank.call('POST',`/identity/${input.identityType}/verify`,{[input.identityType]:input.identity,first_name:input.firstName,last_name:input.lastName,date_of_birth:input.dateOfBirth},hash(input.clientId+':verify')); }
      catch { throw new Fault('IDENTITY_UNREACHABLE',503); }
      // Bank responses can echo the original BVN/NIN. Persist only the decision fields.
      verification={match:verification.match===true,confidence:verification.confidence,fields:verification.fields,watchlisted:verification.watchlisted===true};
      if(!verification.match) flags.push('BVN_MISMATCH');
      if(!input.point) flags.push('GPS_UNAVAILABLE');
      else if(!await tx.inside(project.id,input.point)) { ensure(input.boundaryReason,'BOUNDARY_OUTSIDE'); flags.push('BOUNDARY_OUTSIDE'); }
      const wallet=input.accountNumber ? {account_number:input.accountNumber} : await this.providers.bank.call('POST','/wallets',{owner_name:input.name,[input.identityType]:input.identity,phone:input.phone,reference:input.clientId},hash(input.clientId+':wallet'));
      const bankCode=input.bankCode??'000014';
      let enquiry: any={};
      try {
        enquiry=await this.providers.bank.call('POST',`/transfers/${bankCode==='000014'?'intrabank':'interbank'}/name-enquiry`,{account_number:wallet.account_number,destination_bank_code:bankCode,...(process.env.BANK_PROVIDER!=='live'?{mock_name:input.name}:{})},hash(input.clientId+':enquiry'));
      } catch(e) { flags.push(e instanceof Fault?e.code:'BANK_UNAVAILABLE'); }
      const match=enquiry.account_name ? nameMatch(input.name,enquiry.account_name) : 'uncertain';
      if(match!=='match') flags.push('NAME_MISMATCH');
      if(input.identityType==='bvn'&&typeof enquiry.bvn_masked==='string'){
        const masked=enquiry.bvn_masked;
        if(masked.length!==input.identity.length||[...masked].some((c,i)=>/\d/.test(c)&&input.identity[i]!==c))flags.push('ACCOUNT_IDENTITY_MISMATCH');
      }
      const participant=await tx.put('participants',row({id:input.clientId,projectId:project.id,organisationId:project.organisationId,agentId:p.id,name:input.name,phone:input.phone,identityHash:digest,identityLastFour:input.identity.slice(-4),identityType:input.identityType,verification,point:input.point??null,capturedAt:input.capturedAt,receivedAt:now(),syncDelayMs:Date.now()-Date.parse(input.capturedAt),consent:true,accountNumber:wallet.account_number,bankCode,kycLevel:enquiry.kyc_level??wallet.kyc_level??1,resolvedAccountName:enquiry.account_name??null,nameMatch:match,maskedBvn:enquiry.bvn_masked??null,flags,status:'active',noticeAttempted:false,noticeStatus:'pending'}));
      await tx.put('jobs',row({id:'enrol-notice:'+participant.id,type:'enrol-notice',data:{participantId:participant.id},state:'pending',attempts:0,nextAt:now()}));
      if(match==='uncertain'&&enquiry.account_name)await tx.put('jobs',row({id:'name-review:'+participant.id,type:'name-review',data:{participantId:participant.id},state:'pending',attempts:0,nextAt:now()}));
      await tx.put('audit',row({principal:p.id,action:'participant.enrolled',projectId:project.id,detail:{participantId:participant.id,flags}}));
      return participant;
    });
  }
  async createRun(p: Principal, projectId: string, input: any) {
    await this.project(p,projectId,true); const committed=(await this.db.list('commitments',{projectId,accepted:true})).at(-1); ensure(committed,'EXTRACTION_LOW_CONFIDENCE',422);
    cents(input.declaredGross); cents(input.fundingAmount);
    ensure(typeof input.period==='string'&&input.period.length<80&&Number.isFinite(Date.parse(input.closesAt))&&Date.parse(input.closesAt)>Date.now(),'INVALID_REQUEST');
    return this.db.lock('period:'+projectId+':'+input.period,async tx=>{
      ensure(!(await tx.list('attestations',{projectId,period:input.period})).length,'PERIOD_CLOSED',409);
      ensure(!(await tx.list('runs',{projectId,period:input.period})).length,'DUPLICATE_REQUEST',409);
      const participants=await tx.list('participants',{projectId}); ensure(participants.length,'ROSTER_EMPTY',422);
      // All enrolled households remain in the snapshot, including removed/unpaid ones.
      const roster=await tx.put('rosters',row({projectId,period:input.period,participantIds:participants.map(p=>p.id)}));
      return tx.put('runs',row({projectId,period:input.period,closesAt:new Date(input.closesAt).toISOString(),rosterId:roster.id,commitmentId:committed.id,declaredGross:input.declaredGross,fundingAmount:input.fundingAmount,sourceAccount:input.sourceAccount??null,state:'draft',batchReference:'ATT-'+id()}));
    });
  }
  async arithmetic(run: Row) {
    const commitment=await this.required('commitments',run.commitmentId); ensure(commitment.basis==='gross','COMMITMENT_BASIS_REVIEW_REQUIRED',422);
    const pct=BigInt(Math.round(commitment.percentage*100)); const required=cents(run.declaredGross)*pct/10000n;
    const roster=await this.required('rosters',run.rosterId); const n=BigInt(roster.participantIds.length);
    const tariff=await this.providers.bank.call('GET','/tariff');
    const budget=cents(run.fundingAmount)<required?cents(run.fundingAmount):required;
    const amount=n?budget/n:0n;
    let charges=0n;
    for(const participantId of roster.participantIds) { const participant=await this.required('participants',participantId); charges+=estimateCharges(tariff,money(amount),participant.bankCode); }
    return {commitmentPct:commitment.percentage,declaredGross:run.declaredGross,required:money(required),estimatedCharges:money(charges),totalNeeded:money(required+charges),funded:run.fundingAmount,shortfall:money(required>budget?required-budget:0n),perHousehold:money(amount),chargesCovered:cents(run.fundingAmount)>=budget+charges};
  }
  async preflight(run: Row, acknowledged: any[] = []) {
    ensure(!['executing','complete','cancelled'].includes(run.state),'INVALID_REQUEST',409);
    const a=await this.arithmetic(run); ensure(a.chargesCovered,'FUNDING_EXCLUDES_CHARGES',422);
    ensure(run.sourceAccount,'FUNDING_NOT_RECEIVED',422);
    const balance=await this.providers.bank.call('GET',`/accounts/${encodeURIComponent(run.sourceAccount)}/balance`);
    ensure(cents(bankMoney(balance.available_balance))>=cents(run.fundingAmount),'FUNDING_INSUFFICIENT',422);
    const roster=await this.required('rosters',run.rosterId); const exclusions: any[]=[]; const seen=new Set<string>();
    for(const participantId of roster.participantIds) {
      const p=await this.required('participants',participantId); const reasons=[...p.flags];
      if(p.status!=='active') reasons.push('ACCOUNT_RESTRICTED');
      if(!p.noticeAttempted || p.noticeStatus!=='sent') reasons.push('ENROLMENT_NOTICE_PENDING');
      if(seen.has(p.bankCode+':'+p.accountNumber)) reasons.push('DUPLICATE_REQUEST'); seen.add(p.bankCode+':'+p.accountNumber);
      const limit=BigInt(({1:5000000,2:10000000,3:500000000} as any)[p.kycLevel]??0);
      if(cents(a.perHousehold)>limit) reasons.push('LIMIT_EXCEEDED');
      const dailyLimit=BigInt(({1:30000000,2:50000000,3:2500000000} as any)[p.kycLevel]??0);
      const today=now().slice(0,10);
      const alreadySent=(await this.db.list('transfers',{participantId:p.id})).filter(t=>['in_flight','settling','settled'].includes(t.state)&&t.submittedAt?.startsWith(today)).reduce((total,t)=>total+cents(t.amount),0n);
      if(alreadySent+cents(a.perHousehold)>dailyLimit&&!reasons.includes('LIMIT_EXCEEDED'))reasons.push('LIMIT_EXCEEDED');
      if(reasons.length) exclusions.push({participantId,reasons});
    }
    const accepted=exclusions.every(e=>acknowledged.some(a=>a.participantId===e.participantId && typeof a.reason==='string'&&a.reason.trim().length>0));
    const eligible=roster.participantIds.filter((pid:string)=>!exclusions.some(e=>e.participantId===pid));
    const updated={...run,state:accepted&&eligible.length?'funded':'preflight_failed',exclusions,acknowledged,eligibleIds:eligible,arithmetic:a};
    await this.db.put('runs',updated); return {passed:updated.state==='funded',exclusions,arithmetic:a};
  }
  async execute(runId: string) {
    // Persist the claim and transfer intents BEFORE any remote call. A crashed/unknown batch is only requeried.
    const claim=await this.db.lock('run:'+runId,async tx=>{
      const run=await tx.get('runs',runId); ensure(run,'NOT_FOUND',404);
      if(['executing','complete','partially_complete'].includes(run.state)) return null;
      ensure(run.state==='funded','PREFLIGHT_EXCLUSIONS_REQUIRED',422);
      ensure(Date.parse(run.closesAt)>Date.now(),'PERIOD_CLOSED',409);
      const transfers=[];
      for(const pid of run.eligibleIds) {
        const p=await tx.get('participants',pid); ensure(p?.noticeAttempted && p.noticeStatus==='sent','ENROLMENT_NOTICE_PENDING',422);
        ensure(p.status==='active'&&p.flags.length===0,'PREFLIGHT_EXCLUSIONS_REQUIRED',422);
        transfers.push(await tx.put('transfers',row({id:hash(run.id+':'+pid),projectId:run.projectId,runId,participantId:pid,reference:'ATT-'+hash(run.id+':'+pid),amount:run.arithmetic.perHousehold,accountNumber:p.accountNumber,bankCode:p.bankCode,state:'in_flight',fee:'0.00',vat:'0.00',stampDuty:'0.00',totalDebit:'0.00',submittedAt:now()})));
      }
      const updated:Row={...run,state:'executing',claimedAt:now()}; await tx.put('runs',updated); return {run:updated,transfers};
    });
    if(!claim) return this.required('runs',runId);
    for(const t of claim.transfers) this.emit(runId,'transfer.in_flight',t.id);
    try {
      const result=await this.providers.bank.call('POST','/transfers/bulk',{source_account:claim.run.sourceAccount,batch_reference:claim.run.batchReference,auto_name_enquiry:true,items:claim.transfers.map(t=>({destination_bank_code:t.bankCode,destination_account:t.accountNumber,amount:t.amount,narration:'Community benefit share',reference:t.reference}))},hash(claim.run.id+':bulk'));
      for(const item of result.items??[]) { const t=claim.transfers.find(t=>t.reference===item.reference); if(t) await this.applyTransfer(t.id,item); }
    } catch(e) {
      // Every transport/server error is an unknown outcome. NEVER clear the durable claim.
      await this.audit('worker','batch.requery_required',claim.run.projectId,{runId,code:e instanceof Fault?e.code:'BANK_UNAVAILABLE'});
    }
    await this.enqueue('requery',{runId},'requery:'+runId); return this.required('runs',runId);
  }
  emit(runId: string, type: string, transferId?: string) { this.events.emit(runId,{type,transferId}); }
  async applyTransfer(transferId: string, response: any) {
    await this.db.lock('transfer:'+transferId,async tx=>{
      const t=await tx.get('transfers',transferId); ensure(t,'NOT_FOUND',404);
      const state=({successful:'settled',settled:'settled',pending:'settling',failed:'failed',reversed:'reversed'} as any)[response.status]; ensure(state,'INVALID_REQUEST');
      if(t.state==='reversed' || t.state==='settled'&&state!=='reversed' || t.state==='failed') return;
      const changed=state!==t.state;
      if(state==='settled'&&!t.sessionId){
        ensure(response.fee!==undefined&&response.vat!==undefined&&response.stamp_duty!==undefined&&response.total_debit!==undefined&&response.amount!==undefined,'INVALID_BANK_RESPONSE',502);
        ensure(bankMoney(response.amount)===t.amount,'RECONCILIATION_MISMATCH',409);
      }
      const fee=bankMoney(response.fee??t.fee),vat=bankMoney(response.vat??t.vat),stampDuty=bankMoney(response.stamp_duty??t.stampDuty),totalDebit=bankMoney(response.total_debit??t.totalDebit);
      if(state==='settled'){
        ensure(typeof(response.session_id??t.sessionId)==='string','INVALID_BANK_RESPONSE',502);
        ensure(cents(totalDebit)===cents(t.amount)+cents(fee)+cents(vat)+cents(stampDuty),'RECONCILIATION_MISMATCH',409);
        if(response.settled_at)ensure(Number.isFinite(Date.parse(response.settled_at)),'INVALID_BANK_RESPONSE',502);
      }
      await tx.put('transfers',{...t,state,fee,vat,stampDuty,totalDebit,sessionId:response.session_id??t.sessionId,failureClass:response.error_code??null,settledAt:state==='settled'?(response.settled_at??now()):t.settledAt,reversedAt:state==='reversed'?now():t.reversedAt});
      if(changed) {
        this.emit(t.runId,'transfer.'+state,t.id);
        if(state==='settled') await tx.put('jobs',row({id:'payment-notice:'+t.id,type:'payment-notice',data:{transferId:t.id},state:'pending',attempts:0,nextAt:now()}));
        if(state==='reversed') {
          await tx.put('jobs',row({id:'correction:'+t.id,type:'correction',data:{projectId:t.projectId,runId:t.runId,reason:'transfer_reversed'},state:'pending',attempts:0,nextAt:now()}));
          for(const d of await tx.list('disputes',{transferId:t.id})) await tx.put('disputes',{...d,status:'substantiated',resolutionBasis:'reversal',resolvedAt:now()});
        }
      }
    });
  }
  async requery(runId: string, transferId?: string) {
    const run=await this.required('runs',runId);
    const transfers=await this.db.list('transfers',{runId});
    if(!transferId) {
      try {
        const batch=await this.providers.bank.call('GET',`/transfers/bulk/${encodeURIComponent(run.batchReference)}`);
        for(const item of batch.items??[]) {const t=transfers.find(t=>t.reference===item.reference);if(t)await this.applyTransfer(t.id,item);}
      } catch(e) { if(!(e instanceof Fault))throw e; return transfers; }
    }
    for(const t of transfers) {
      if(!transferId || t.id!==transferId || ['failed','reversed'].includes(t.state)) continue;
      try { await this.applyTransfer(t.id,await this.providers.bank.call('GET',`/transfers/${encodeURIComponent(t.reference)}`)); } catch(e) { if(!(e instanceof Fault)) throw e; }
    }
    const final=await this.db.list('transfers',{runId}); const complete=final.length>0&&final.every(t=>['settled','failed','reversed'].includes(t.state));
    await this.db.put('runs',{...run,state:complete?'complete':'partially_complete'}); if(complete) this.emit(runId,'run.complete');
    return final;
  }
  async close(runId: string, reason?: string) {
    const run=await this.required('runs',runId); ensure(Date.parse(run.closesAt)<=Date.now(),'PERIOD_NOT_DUE',409);
    return this.db.lock('chain:'+run.projectId,async tx=>{
      const existing=await tx.list('attestations',{projectId:run.projectId});
      if(!reason && existing.some(a=>a.period===run.period)) return existing.find(a=>a.period===run.period)!;
      const previous=existing.at(-1); const supersedes=reason?existing.filter(a=>a.period===run.period).at(-1)?.id:null;
      if(reason&&!supersedes) return null;
      const transfers=await tx.list('transfers',{runId}); const settled=transfers.filter(t=>t.state==='settled').sort((a,b)=>a.id.localeCompare(b.id));
      const confirmations=await tx.list('confirmations',{projectId:run.projectId});
      const leaves=settled.map(t=>({participantId:hash(t.participantId),amount:t.amount,settledAt:t.settledAt,bankReferenceHash:hash(t.sessionId??t.reference),confirmed:confirmations.some(c=>c.transferId===t.id)}));
      const roster=await tx.get('rosters',run.rosterId); ensure(roster,'NOT_FOUND',404);
      const commitment=await tx.get('commitments',run.commitmentId); ensure(commitment,'NOT_FOUND',404);
      const committed=cents(run.declaredGross)*BigInt(Math.round(commitment.percentage*100))/10000n;
      const moved=settled.reduce((s,t)=>s+cents(t.amount),0n); const charges=settled.reduce((s,t)=>s+cents(t.fee)+cents(t.vat)+cents(t.stampDuty),0n);
      const disputes=(await tx.list('disputes',{projectId:run.projectId})).filter(d=>!d.runId||d.runId===runId);
      const signals=await tx.list('signals',{projectId:run.projectId}); const signalCounts: Record<string,number>={}; for(const s of signals) signalCounts[s.class]=(signalCounts[s.class]??0)+1;
      const substantiatedCaseCount=(await tx.list('cases',{projectId:run.projectId,status:'substantiated'})).length;
      const document={projectId:run.projectId,period:run.period,enrolledCount:roster.participantIds.length,paidCount:new Set(settled.map(t=>t.participantId)).size,amountCommitted:money(committed),amountMovedToHouseholds:money(moved),chargesBorne:money(charges),shortfall:money(committed>moved?committed-moved:0n),confirmationCount:leaves.filter(l=>l.confirmed).length,disputesOpen:disputes.filter(d=>!d.resolvedAt).length,disputesSubstantiated:disputes.filter(d=>d.status==='substantiated').length,signalCounts,merkleRoot:merkle(leaves).root,previousHash:previous?.hash??null,supersedes:supersedes??null,reason:reason??null,closedAt:now()};
      const provenanceDocument={...document,substantiatedCaseCount,bankEvidence:process.env.BANK_PROVIDER==='live'?'sandbox':'mock'};
      if(reason) {
        const comparable=(d:any)=>{const {previousHash,supersedes,closedAt,bankEvidence,...rest}=d;return canonical(rest);};
        const replay=existing.find(a=>a.runId===runId&&comparable(a.document)===comparable(provenanceDocument));if(replay)return replay;
      }
      const h=hash(canonical(provenanceDocument));
      const attestation=await tx.put('attestations',row({projectId:run.projectId,period:run.period,runId,document:provenanceDocument,hash:h,signature:this.signer.sign(h),publicKey:this.signer.publicKey,leaves,transferIds:settled.map(t=>t.id)}));
      await tx.put('jobs',row({id:'anchor:'+attestation.id,type:'anchor',data:{attestationId:attestation.id},state:'pending',attempts:0,nextAt:now()}));
      return attestation;
    });
  }
  async disclosure(attestation: Row, transferId: string) {
    const index=attestation.transferIds.indexOf(transferId); ensure(index>=0,'LEAF_NOT_IN_ROOT',404);
    return {leaf:attestation.leaves[index],proof:merkle(attestation.leaves).proof(index),root:attestation.document.merkleRoot,attestationId:attestation.id,attestationHash:attestation.hash,signature:attestation.signature,publicKey:attestation.publicKey};
  }
  async publicProject(projectId: string) {
    const p=await this.required('projects',projectId); const participants=await this.db.list('participants',{projectId});
    const attestations=await this.db.list('attestations',{projectId}); const disputes=await this.db.list('disputes',{projectId});
    const commitment=(await this.db.list('commitments',{projectId,accepted:true})).at(-1);
    return {id:p.id,name:p.name,registryId:p.registryId,country:p.country,status:p.status,organisationId:p.organisationId,enrolled:participants.length,commitment:commitment?{percentage:commitment.percentage,basis:commitment.basis,sourceQuote:commitment.source_quote,page:commitment.page}:null,attestations:attestations.map(a=>this.publicAttestation(a)),openDisputes:disputes.filter(d=>!d.resolvedAt).length,signalCount:(await this.db.list('signals',{projectId})).length};
  }
  publicAttestation(a: Row) { return {id:a.id,createdAt:a.createdAt,document:a.document,hash:a.hash,signature:a.signature,publicKey:a.publicKey}; }
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
      let triggered=false,evidence:any;
      if(rule.condition==='coverage_below'&&latest){const d=latest.document;const coverage=d.enrolledCount?100*d.paidCount/d.enrolledCount:0;triggered=coverage<rule.threshold;evidence={attestationHash:latest.hash,coverage};}
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
  async confirm(receipt: Row) {
    return this.db.lock('confirmation:'+receipt.transferId,async tx=>{
      ensure(!(await tx.list('confirmations',{transferId:receipt.transferId})).length,'ALREADY_CONFIRMED',409);
      const t=await tx.get('transfers',receipt.transferId); ensure(t?.state==='settled','INVALID_REQUEST',409);
      const c=await tx.put('confirmations',row({projectId:receipt.projectId,transferId:receipt.transferId,participantId:receipt.participantId}));
      for(const d of await tx.list('disputes',{transferId:receipt.transferId})) if(!d.resolvedAt) await tx.put('disputes',{...d,status:'unsubstantiated',resolutionBasis:'participant_confirmation',resolvedAt:now()});
      return c;
    });
  }
  async dispute(input: any, receipt?: Row) {
    const projectId=receipt?.projectId??input.projectId; await this.required('projects',projectId);
    ensure(['not_received','someone_else_collected','wrong_amount'].includes(input.category),'INVALID_REQUEST');
    if(receipt) ensure(!(await this.db.list('disputes',{transferId:receipt.transferId})).some(d=>!d.resolvedAt),'DISPUTE_ALREADY_OPEN',409);
    const dispute=await this.db.put('disputes',row({projectId,transferId:receipt?.transferId??null,participantId:receipt?.participantId??null,category:input.category,body:typeof input.body==='string'?input.body.slice(0,4000):'',status:'open'}));
    if(dispute.body)await this.enqueue('triage',{disputeId:dispute.id},'triage:'+dispute.id);return dispute;
  }
  async detect(projectId: string, flows: any[] = []) {
    const participants=await this.db.list('participants',{projectId}); const found: Row[]=[];
    const add=async (kind:string,ids:string[],detail:any)=>{
      const signalId=hash(projectId+kind+canonical([...ids].sort()));
      if(await this.db.get('signals',signalId)) return;
      const signal=await this.db.put('signals',row({id:signalId,projectId,class:kind,severity:'review',participantIds:ids,detail})); found.push(signal);
      await this.db.put('cases',row({projectId,signalId:signal.id,status:'open',actions:[]}));
    };
    const group=async(key:(p:Row)=>string|undefined,kind:string,threshold:number)=>{const groups=new Map<string,string[]>();for(const p of participants){const k=key(p);if(k)groups.set(k,[...(groups.get(k)??[]),p.id]);}for(const [k,ids]of groups)if(ids.length>=threshold)await add(kind,ids,{bucket:k,count:ids.length});};
    await group(p=>p.point?`${p.point[0].toFixed(4)},${p.point[1].toFixed(4)}`:undefined,'geo_clustering',10);
    // Device reuse is only across distinct bound agents, not normal captures by one agent.
    const agents=await this.db.list('agents',{projectId}); const byDevice=new Map<string,Row[]>(); for(const a of agents)if(a.deviceKey)byDevice.set(a.deviceKey,[...(byDevice.get(a.deviceKey)??[]),a]);
    for(const agents of byDevice.values())if(agents.length>1)await add('device_reuse',participants.filter(p=>agents.some(a=>a.id===p.agentId)).map(p=>p.id),{agents:agents.map(a=>a.id)});
    await group(p=>p.nameMatch!=='match'?p.agentId:undefined,'name_mismatch',5);
    await group(p=>p.agentId+':'+p.capturedAt.slice(0,16),'velocity_anomaly',20);
    const targets=new Map<string,Set<string>>(); for(const f of flows)if(Date.parse(f.sentAt)-Date.parse(f.receivedAt)<=48*3600_000&&Date.parse(f.sentAt)>=Date.parse(f.receivedAt)){if(!targets.has(f.to))targets.set(f.to,new Set());targets.get(f.to)!.add(f.participantId);if(f.dormantDays>=30)await add('dormancy_sweep',[f.participantId],{to:f.to});}
    for(const [to,ids]of targets)if(ids.size>=10)await add('onward_concentration',[...ids],{to,count:ids.size});
    return found;
  }
  async processJob(job: Row) {
    const {type,data}=job;
    if(type==='auth-email'){
      const token=await this.required('tokens',hash(data.token));if(token.used||Date.parse(token.expiresAt)<=Date.now())return;
      const user=await this.required('users',data.userId);await this.providers.email(user.email,data.type==='verify'?'Verify your Attest account':'Reset your Attest password',`Use this one-time ${data.type} token within one hour: ${data.token}`);
      return;
    }
    if(type==='verifier-alert'){const user=await this.required('users',data.userId);await this.providers.email(user.email,'Attest project alert',`Project ${data.projectId}: ${data.condition}. Evidence: ${canonical(data.evidence)}`);return;}
    if(type==='execute') await this.execute(data.runId);
    else if(type==='requery') await this.requery(data.runId);
    else if(type==='correction') await this.close(data.runId,data.reason);
    else if(type==='signals') await this.detect(data.projectId,data.flows??[]);
    else if(type==='name-review'||type==='triage'){
      ensure(!(await this.db.list('runs')).some(r=>['executing','partially_complete'].includes(r.state)),'RATE_LIMITED',429);
      if(type==='name-review'){
        const p=await this.required('participants',data.participantId);const proposal=await this.providers.adjudicate(p.name,p.resolvedAccountName);
        await this.db.put('participants',{...p,nameAdjudication:proposal});
      }else{const d=await this.required('disputes',data.disputeId);const proposal=await this.providers.triage(d.body);await this.db.put('disputes',{...d,triageSuggestion:proposal});}
    }
    else if(type==='extraction') {ensure(!(await this.db.list('runs')).some(r=>['executing','partially_complete'].includes(r.state)),'RATE_LIMITED',429);const result=await this.providers.extract(data.pages);await this.db.put('commitments',row({id:'extraction:'+job.id,projectId:data.projectId,...result,accepted:false,original:true}));}
    else if(type==='anchor') {const a=await this.required('attestations',data.attestationId);const result=await this.providers.anchor(a.hash);await this.db.put('anchors',row({id:a.id,projectId:a.projectId,attestationId:a.id,...result}));}
    else if(type==='enrol-notice'||type==='payment-notice') {
      const transfer=type==='payment-notice'?await this.required('transfers',data.transferId):null;
      const p=await this.required('participants',transfer?.participantId??data.participantId);const project=await this.required('projects',p.projectId!);
      if(type==='enrol-notice') await this.db.put('participants',{...p,noticeAttempted:true});
      let message=`You are enrolled in ${project.name}, entitled to a share of its earnings. Account ends ${p.accountNumber.slice(-4)}. Reply CHECK to check.`;
      if(transfer){const token=id()+id();await this.db.put('receipts',row({id:hash(token),projectId:p.projectId,participantId:p.id,transferId:transfer.id,expiresAt:new Date(Date.now()+30*86400_000).toISOString()}));message=`NGN ${transfer.amount} paid on ${transfer.settledAt} for ${project.name}. Confirm or report: ${process.env.PUBLIC_URL??'http://localhost:8080'}/receipt/${token}`;}
      const sent=await this.providers.sms(p.phone,message,job.id);
      await this.db.put('notifications',row({...sent,id:job.id,providerMessageId:sent.id,projectId:p.projectId,participantId:p.id,type}));
      if(type==='enrol-notice') await this.db.put('participants',{...p,noticeAttempted:true,noticeStatus:'sent'});
    }
    else if(type==='forge-event') {
      const event=data, payload=event.data??{};
      if(event.type?.startsWith('transfer.')) {
        const transfers=await this.db.list('transfers',{reference:payload.reference});
        for(const t of transfers) await this.applyTransfer(t.id,{...payload,status:event.type.split('.').at(-1)});
      } else if(event.type==='carbon.mrv.verified') {
        const projects=await this.db.list('projects',{carbonId:payload.project_id});for(const p of projects)await this.db.put('projects',{...p,mrvVerified:true});
      } else if(event.type==='carbon.credits.retired') {
        const projects=await this.db.list('projects',{carbonId:payload.project_id});for(const p of projects)if(p.mrvVerified){const period=String(payload.period??now().slice(0,7));const participants=await this.db.list('participants',{projectId:p.id});await this.db.put('rosters',row({id:hash(p.id+':retirement:'+String(payload.id??event.event_id)),projectId:p.id,period,participantIds:participants.map(p=>p.id),openedBy:'carbon.credits.retired',certificateId:payload.certificate_id??null}));await this.db.put('projects',{...p,retirement:payload,periodOpenedAt:now(),openPeriod:period});}
      }
    }
  }
  async tick() {
    // DB-backed jobs survive Redis loss; serialized claims avoid concurrent remote execution.
    for(const pending of await this.db.list('jobs')) {
      if(pending.state==='done'||Date.parse(pending.nextAt)>Date.now())continue;
      const claimed=await this.db.lock('job:'+pending.id,async tx=>{
        const job=await tx.get('jobs',pending.id);if(!job||job.state==='done'||Date.parse(job.nextAt)>Date.now())return;
        const claim:Row={...job,state:'running',nextAt:new Date(Date.now()+180_000).toISOString()};await tx.put('jobs',claim);return claim;
      });
      if(!claimed)continue;
      try{await this.processJob(claimed);await this.db.put('jobs',{...claimed,data:claimed.type==='auth-email'?{...claimed.data,token:undefined}:claimed.data,state:'done',completedAt:now()});}
      catch(e){await this.db.put('jobs',{...claimed,state:'pending',attempts:claimed.attempts+1,lastError:e instanceof Fault?e.code:'JOB_FAILED',nextAt:new Date(Date.now()+Math.min(3600_000,2**Math.min(claimed.attempts,10)*5000)).toISOString()});}
    }
    for(const run of await this.db.list('runs')) {
      if(Date.parse(run.closesAt)<=Date.now()) await this.close(run.id);
      // Include settled transfers for late reversal detection.
      if(['executing','partially_complete','complete'].includes(run.state)) await this.requery(run.id);
    }
    for(const project of await this.db.list('projects')) {
      await this.detect(project.id);
      await this.evaluateAlerts(project.id);
      const check=await this.chain(project.id);
      if(!check.valid){const auditId=hash('chain:'+canonical(check));if(!await this.db.get('audit',auditId))await this.db.put('audit',row({id:auditId,projectId:project.id,principal:'worker',action:'chain.discontinuity',detail:check}));}
    }
    const confirmations=await this.db.list('confirmations');
    for(const t of await this.db.list('transfers'))if(t.state==='settled'&&Date.parse(t.settledAt)<Date.now()-7*86400_000&&!confirmations.some(c=>c.transferId===t.id)){
      const signalId='unconfirmed:'+t.id;if(!await this.db.get('signals',signalId))await this.db.put('signals',row({id:signalId,projectId:t.projectId,class:'unconfirmed_receipt',severity:'review',participantIds:[t.participantId],detail:{transferId:t.id}}));
    }
  }
}
