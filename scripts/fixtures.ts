import {generateKeyPairSync} from 'node:crypto';
import type {Store} from '../src/store.js';
import type {Principal} from '../src/core.js';
import {row,hash,now,ensure} from '../src/core.js';
import {Service} from '../src/service.js';
import {MockBank,bankKey} from '../src/bank.js';
import {currentPeriod} from '../src/period.js';

// Synthetic identities only. Place names identify fixture locations, not a
// claimed registry boundary or real beneficiaries. Figures always use close().
export async function seedFixtures(db:Store,s:Service,principal:Principal,counts={demo:500,clean:30,concentration:400}){
 ensure(process.env.NODE_ENV!=='production'&&s.providers.bank instanceof MockBank,'FORBIDDEN',403);
 const marker='fixtures:v2:'+principal.organisationId;const existing=await db.get('tokens',marker);if(existing)return existing.result;
 const bank=s.providers.bank;const projects=[];let serial=0;
 for(const [variant,count]of Object.entries(counts)){
  const registryId='SYNTHETIC-'+variant.toUpperCase();const project=(await db.list('projects',{registryId,organisationId:principal.organisationId}))[0]??await s.createProject(principal,registryId);const sourceAccount='01234567'+String(projects.length+90);
  const projectNames:Record<string,string>={demo:'Synthetic community forest - Ogoja',clean:'Synthetic clean project - Ikom',concentration:'Synthetic concentration investigation - Kano'};
  await db.put('projects',{...project,name:projectNames[variant],sourceAccount,openingBalance:'100000000.00',provenance:'Entirely synthetic; coordinates are a test polygon, not a real project boundary.'});
  const commitment=(await db.list('commitments',{projectId:project.id,accepted:true}))[0]??await db.put('commitments',row({projectId:project.id,percentage:60,basis:'gross',cadence:'quarterly',beneficiary_definition:'synthetic enrolled households',source_quote:'Sixty percent of gross revenue is allocated to enrolled households.',page:1,confidence:1,accepted:true,original:true,provenance:'Synthetic quotation, not a real PDD extraction.'}));
  const device=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'}).toString();const agents=[];
  for(let a=0;a<3;a++){const agentId=hash(project.id+':agent:'+a);agents.push(await db.get('agents',agentId)??await db.put('agents',row({id:agentId,projectId:project.id,organisationId:principal.organisationId,name:['Synthetic Amina','Synthetic Chidi','Synthetic Bisi'][a],status:'active',role:'agent',verification:{match:true,watchlisted:false},deviceKey:a<2&&variant!=='clean'?device:generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'}).toString()})));}
  const participants=[];
  for(let n=0;n<count;n++){
   serial++;const accountNumber=variant==='demo'&&n<2?['0123987005','0123987006'][n]:'8'+String(serial).padStart(9,'0');const bankCode=variant==='demo'&&n<2?['000015','000016'][n]:'000014';
   const name=variant==='demo'&&n<2?['Arewa Solar Co-operative Society','Ogoja Community Forest Trust'][n]:`Synthetic ${['Amina','Chidi','Bisi','Musa','Ngozi'][n%5]} Household ${serial}`;
   if(variant==='demo'&&n>=2&&n<12)bank.setAccountName(accountNumber,'Synthetic Different Account Holder');
   const outside=variant==='demo'&&n>=12&&n<17;const point:[number,number]=outside?[9,9]:[7.1+(n%20)*0.03,5.1+Math.floor(n/20)*0.02];
   const p=await s.enrol(principal,{clientId:bankKey(project.id+':participant:'+n),projectId:project.id,name,firstName:'Synthetic',lastName:'Household',dateOfBirth:'1990-01-01',phone:'+234800'+String(serial).padStart(7,'0'),identityType:'bvn',identity:'222'+String(serial).padStart(8,'0'),consent:true,capturedAt:now(),point,boundaryReason:outside?'Deliberately outside the synthetic fixture polygon':undefined,accountNumber,bankCode});
   const participant=await db.put('participants',{...p,agentId:agents[n<12?0:n%3].id,community:['Ogoja','Ikom','Kano'][projects.length],localGovernment:['Ogoja','Ikom','Nassarawa'][projects.length]});participants.push(participant);
   const notice=await db.get('jobs','enrol-notice:'+p.id);ensure(notice,'NOT_FOUND',404);if(notice.state!=='done'){await s.processJob(notice);await db.put('jobs',{...notice,state:'done'});}
  }
  if(variant==='concentration'){
   const flows=participants.map((p,n)=>({participantId:p.id,to:'synthetic-collector-'+n%3,receivedAt:new Date(Date.now()-3600000).toISOString(),sentAt:now(),amount:'600.00',dormantDays:n<3?45:0}));
   for(const p of participants)bank.setAccountFlows(p.accountNumber,flows.filter(f=>f.participantId===p.id));await s.detect(project.id,flows);
  }
  if(variant==='demo'){
   for(let history=1;history<=3;history++){
    const period='synthetic-history-'+history;if((await db.list('attestations',{projectId:project.id,period})).length)continue;
    const run=(await db.list('runs',{projectId:project.id,period}))[0]??await s.createRun(principal,project.id,{period,declaredGross:'500000.00',fundingAmount:history===2?'240000.00':'300100.00',closesAt:new Date(Date.now()+86400000).toISOString()});
    const first=await s.preflight(run);if(!first.passed)await s.preflight(await s.required('runs',run.id),first.exclusions.map(e=>({participantId:e.participantId,reason:'Deliberately excluded fixture: '+e.reasons.join(', ')})));
    await s.execute(run.id);bank.advanceTime(5001);await s.requery(run.id);
    for(const t of (await db.list('transfers',{runId:run.id})).filter((_,i)=>i%2===0))if(t.state==='settled')await s.confirm(row({projectId:project.id,participantId:t.participantId,transferId:t.id}));
    await db.put('runs',{...await s.required('runs',run.id),closesAt:new Date(Date.now()-1).toISOString()});
    const a=await s.close(run.id);ensure(a,'NOT_FOUND',404);await s.processJob(row({type:'anchor',data:{attestationId:a.id}}));
   }
  }
  const open=(await db.list('runs',{projectId:project.id,period:currentPeriod(commitment.cadence)}))[0]??await s.createRun(principal,project.id,{period:currentPeriod(commitment.cadence),declaredGross:'500000.00',fundingAmount:'300100.00'});
  await s.detect(project.id);projects.push({id:project.id,variant,participants:count,openRunId:open.id});
 }
 const result={mode:'synthetic fixtures; not real registry or bank evidence',projects};await db.put('tokens',row({id:marker,result}));await s.audit(principal.id,'synthetic.fixtures_created',undefined,result);return result;
}
