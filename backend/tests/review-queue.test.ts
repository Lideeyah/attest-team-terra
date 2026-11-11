import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {MockBank,Providers} from '../src/providers.js';
import {createApp} from '../src/app.js';
import {issueSession} from '../src/auth.js';
import {row,id,now} from '../src/core.js';

process.env.IDENTITY_PEPPER='review-queue-test-pepper-at-least-32-characters';
process.env.EXTRACTION_PROVIDER='mock';
process.env.REGISTRY_PROVIDER='mock';
const owner={id:'owner',role:'developer_admin' as const,organisationId:'one'};

async function setup(){
  const db=new MemoryStore(),bank=new MockBank(),providers=new Providers(db,bank),service=new Service(db,providers);
  const project=await service.createProject(owner,'SYNTHETIC');
  await db.put('projects',{...project,boundary:{type:'Polygon',coordinates:[[[7,5],[8,5],[8,6],[7,6],[7,5]]]}});
  await db.put('participants',row({id:'participant',projectId:project.id,name:'Ada Okoro',resolvedAccountName:'Ada Okafor',phone:'+2348000000001',accountNumber:'8000000001',bankCode:'000014',flags:[],kycLevel:2,status:'active'}));
  await db.put('disputes',row({id:'dispute',projectId:project.id,body:'The amount received was short.',category:'wrong_amount',status:'open',transferId:null,participantId:null}));
  const calls={name:0,triage:0};
  const adjudicate=providers.adjudicate.bind(providers),triage=providers.triage.bind(providers);
  providers.adjudicate=async(...args)=>{calls.name++;return adjudicate(...args);};
  providers.triage=async(...args)=>{calls.triage++;return triage(...args);};
  return {db,bank,service,project,calls};
}

test('enrolment, name-check and dispute producers include their project in review jobs',async()=>{
  const {db,bank,service,project}=await setup();
  bank.setAccountName('8000000001','Ada Okafor');bank.setAccountName('8000000002','Ada Okafor');
  const captured=await service.enrol(owner,{clientId:id(),projectId:project.id,consent:true,name:'Ada Okoro',firstName:'Ada',lastName:'Okoro',dateOfBirth:'1990-01-01',phone:'+2348000000002',identityType:'bvn',identity:'22200000001',capturedAt:now(),point:[7.5,5.5],accountNumber:'8000000002',bankCode:'000014'});
  assert.equal(captured.nameMatch,'uncertain');
  const enrolmentReview=(await db.list('jobs',{type:'name-review'})).find(job=>job.data.participantId===captured.id);
  assert.equal(enrolmentReview?.data.projectId,project.id);

  await db.put('users',row({...owner,email:'owner@example.test',verified:true,passwordHash:'unused'}));
  const app=await createApp(db,service);
  try{
    const response=await app.inject({method:'POST',url:'/api/participants/participant/name-check',headers:{authorization:'Bearer '+await issueSession(db,owner.id),'idempotency-key':id()},payload:{}});
    assert.equal(response.statusCode,200,response.body);assert.equal(response.json().data.match,'uncertain');
    const refreshed=(await db.list('jobs',{type:'name-review'})).find(job=>job.data.participantId==='participant');
    assert.equal(refreshed?.data.projectId,project.id);
  }finally{await app.close();}

  const dispute=await service.dispute({projectId:project.id,category:'not_received',body:'This synthetic household reports a missing payment.'});
  const review=(await db.list('jobs',{type:'triage'})).find(job=>job.data.disputeId===dispute.id);
  assert.equal(review?.data.projectId,project.id);
});

test('legacy review jobs recover their project and are not blocked by another project payments',async()=>{
  const {db,service,project,calls}=await setup();
  const other=await service.createProject(owner,'ANOTHER-SYNTHETIC');
  await db.put('runs',row({projectId:other.id,period:'2026',state:'executing',declaredGross:'100.00',fundingAmount:'60.00'}));
  const name=await service.enqueue('name-review',{participantId:'participant'});
  const triage=await service.enqueue('triage',{disputeId:'dispute'});
  await service.processQueuedJobs();
  assert.equal((await db.get('jobs',name.id))?.state,'done');
  assert.equal((await db.get('jobs',triage.id))?.state,'done');
  assert.deepEqual(calls,{name:1,triage:1});
  assert((await db.get('participants','participant'))?.nameAdjudication);
  const dispute=await db.get('disputes','dispute');assert(dispute?.triageSuggestion);assert.equal(dispute.status,'open');assert.equal(dispute.resolvedAt,undefined);
  assert.equal((await db.get('participants','participant'))?.projectId,project.id);
});

test('active own-project payments defer both legacy and current review jobs until retry',async()=>{
  const {db,service,project,calls}=await setup();
  const run=await db.put('runs',row({projectId:project.id,period:'2026',state:'executing',declaredGross:'100.00',fundingAmount:'60.00'}));
  const jobs=[];
  for(const current of [false,true]){
    jobs.push(await service.enqueue('name-review',{participantId:'participant',...(current?{projectId:project.id}:{})}));
    jobs.push(await service.enqueue('triage',{disputeId:'dispute',...(current?{projectId:project.id}:{})}));
  }
  await service.processQueuedJobs();assert.deepEqual(calls,{name:0,triage:0});
  for(const original of jobs){const job=await db.get('jobs',original.id);assert.equal(job?.state,'pending');assert.equal(job?.lastError,'RATE_LIMITED');assert.equal(job?.attempts,1);}
  await db.put('runs',{...run,state:'complete'});
  for(const original of jobs)await db.put('jobs',{...(await service.required('jobs',original.id)),nextAt:now()});
  await service.processQueuedJobs();
  for(const original of jobs)assert.equal((await db.get('jobs',original.id))?.state,'done');
  assert.deepEqual(calls,{name:2,triage:2});
});

test('review jobs cannot claim a different project to bypass active payment protection',async()=>{
  const {db,service,project,calls}=await setup();
  const other=await service.createProject(owner,'ANOTHER-SYNTHETIC');
  await db.put('runs',row({projectId:project.id,period:'2026',state:'executing',declaredGross:'100.00',fundingAmount:'60.00'}));
  const jobs=[await service.enqueue('name-review',{participantId:'participant',projectId:other.id}),await service.enqueue('triage',{disputeId:'dispute',projectId:other.id})];
  await service.processQueuedJobs();
  assert.deepEqual(calls,{name:0,triage:0});
  for(const original of jobs){const job=await db.get('jobs',original.id);assert.equal(job?.state,'failed');assert.equal(job?.lastError,'FORBIDDEN');}
});

test('known failed legacy reviews recover once under concurrent workers while unrelated failures remain failed',async()=>{
  const {db,service,project,calls}=await setup();
  const recovered=[await service.enqueue('name-review',{participantId:'participant'}),await service.enqueue('triage',{disputeId:'dispute'})];
  const untouched=[await service.enqueue('name-review',{participantId:'missing-subject'}),await service.enqueue('triage',{disputeId:'dispute',projectId:project.id}),await service.enqueue('signals',{projectId:project.id})];
  for(const job of [...recovered,...untouched])await db.put('jobs',{...job,state:'failed',lastError:'INVALID_REQUEST',attempts:1});
  await Promise.all([service.processQueuedJobs(),service.processQueuedJobs()]);
  for(const original of recovered){const job=await db.get('jobs',original.id);assert.equal(job?.state,'done');assert.equal(job?.data.projectId,project.id);assert.equal(job?.recoveryReason,'missing_review_project');assert.equal(job?.attempts,1);}
  for(const original of untouched)assert.equal((await db.get('jobs',original.id))?.state,'failed');
  assert.deepEqual(calls,{name:1,triage:1});
  await service.processQueuedJobs();assert.deepEqual(calls,{name:1,triage:1});
});
