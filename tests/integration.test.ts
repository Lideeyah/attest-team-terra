import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {AttestClient,ApiError,parseMoney,type ParticipantSummary} from '@attest/contracts';
import {openEmbedded} from '../scripts/embedded-db.js';
import {PgStore,MemoryStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {Providers} from '../src/providers.js';
import {MockBank,bankKey} from '../src/bank.js';
import {createApp} from '../src/app.js';
import {passwordHash,issueSession} from '../src/auth.js';
import {row,id,hash,now,Signer} from '../src/core.js';
import {seedFixtures} from '../scripts/fixtures.js';
import {devCodes} from '../src/dev-tools.js';
process.env.IDENTITY_PEPPER='synthetic-integration-pepper-at-least-thirty-two-characters';
const admin={id:'admin',organisationId:'org',role:'developer_admin' as const};

test('PostGIS-backed API completes a run, scopes SQL reads, pages filtered rows and retains one completion event',{timeout:120000},async()=>{
 const {db:engine,pool}=await openEmbedded();const db=new PgStore(pool),bank=new MockBank(),s=new Service(db,new Providers(db,bank));const app=await createApp(db,s);
 try{
  await db.put('users',row({...admin,email:'admin@example.test',passwordHash:passwordHash('Synthetic-password-2026'),verified:true}));const token=await issueSession(db,admin.id);const headers={authorization:'Bearer '+token,'idempotency-key':id()};
  const project=await s.createProject(admin,'SYNTHETIC-INTEGRATION');await db.put('commitments',row({projectId:project.id,percentage:60,basis:'gross',cadence:'quarterly',accepted:true}));
  for(let n=1;n<=3;n++)await s.enrol(admin,{clientId:id(),projectId:project.id,consent:true,name:'Synthetic Household '+n,phone:'+234800000000'+n,identityType:'bvn',identity:'2220000000'+n,firstName:'Synthetic',lastName:'Household',dateOfBirth:'1990-01-01',capturedAt:now(),point:[7.2+n/10,5.5]});
  assert.equal(await db.scoped('projects',project.id,{...admin,organisationId:'other'}),undefined);
  const p=(await db.list('participants'))[0];assert.equal(await db.scoped('participants',p.id,{id:'another-agent',projectId:project.id,organisationId:'org',role:'agent'}),undefined);
  const filtered=await app.inject({url:`/api/projects/${project.id}/participants?q=Household&page=2&per_page=2&sort=name&order=desc`,headers});assert.equal(filtered.statusCode,200,filtered.body);assert.equal(filtered.json().data.length,1);assert.equal(filtered.json().meta.total,3);assert(!filtered.body.includes('+234800000000'));
  const literal=await db.page('participants',{page:1,perPage:1,search:{field:'name',value:'%'}});assert.equal(literal.total,0);
  await s.tick();const created=await app.inject({method:'POST',url:`/api/projects/${project.id}/runs`,headers:{...headers,'idempotency-key':id()},payload:{period:'integration-open',declaredGross:'100.00',fundingAmount:'60.00',sourceAccount:'0123456790',closesAt:new Date(Date.now()+86400000).toISOString()}});assert.equal(created.statusCode,200,created.body);const runId=created.json().data.id as string;
  const preflight=await app.inject({method:'POST',url:`/api/runs/${runId}/preflight`,headers:{...headers,'idempotency-key':id()},payload:{}});assert.equal(preflight.json().data.passed,true,preflight.body);
  await s.execute(runId);await Promise.all([s.requery(runId),s.requery(runId)]);assert.equal((await db.list('events',{runId,type:'run.complete'})).length,1);assert.equal(bank.bulkCalls,1);
  await db.put('runs',{...await s.required('runs',runId),closesAt:new Date(Date.now()-1).toISOString()});const a=await s.close(runId);assert.equal(a?.document.paidCount,3);assert.equal(a?.document.amountMovedToHouseholds,'60.00');assert((await s.chain(project.id)).valid);
 }finally{await app.close();await engine.close();}
});

test('shared contracts package is consumed by a typed client against the actual API',async()=>{
 const db=new MemoryStore(),s=new Service(db),app=await createApp(db,s);const original=globalThis.fetch;
 try{const project=await s.createProject(admin,'SYNTHETIC');await db.put('users',row({...admin,verified:true}));const token=await issueSession(db,admin.id);await db.put('participants',row({projectId:project.id,name:'Synthetic',phone:'+2348000000001',identityHash:'hash',flags:[]}));
  globalThis.fetch=async(input,options)=>{const response=await app.inject({method:(options?.method??'GET') as 'GET'|'POST',url:String(input),headers:options?.headers as Record<string,string>,payload:options?.body?String(options.body):undefined});return new Response(response.body,{status:response.statusCode,headers:{'Content-Type':'application/json'}});};
  const client=new AttestClient('',token);const result=await client.request<ParticipantSummary[]>(`/api/projects/${project.id}/participants`);assert.equal(result.status,'success');if(result.status==='success')assert.equal(result.data[0].name,'Synthetic');assert.equal(parseMoney('100.00'),'100.00');await assert.rejects(new AttestClient().request('/api/ops/cases'),ApiError);
 }finally{globalThis.fetch=original;await app.close();}
});

test('stable PKCS8 signing keys and persisted mock state survive reconstruction',async()=>{
 const previous=process.env.SIGNING_KEY_BASE64;try{process.env.SIGNING_KEY_BASE64=generateKeyPairSync('ed25519').privateKey.export({format:'der',type:'pkcs8'}).toString('base64');const a=new Signer(),b=new Signer();assert.equal(a.publicKey,b.publicKey);assert(b.verify('synthetic',a.sign('synthetic')));}finally{if(previous)process.env.SIGNING_KEY_BASE64=previous;else delete process.env.SIGNING_KEY_BASE64;}
 const first=new MockBank();await first.call('POST','/transfers/bulk',{source_account:'0123456790',batch_reference:'persisted',auto_name_enquiry:true,items:[{reference:'persisted-reference',destination_bank_code:'000014',destination_account:'8000000001',amount:'10.00'}]},'stable-key');const second=new MockBank();second.restore(JSON.parse(JSON.stringify(first.snapshot())));assert.equal((await second.call<{status:string}>('GET','/transfers/persisted-reference')).status,'successful');assert.equal(second.bulkCalls,1);assert.match(bankKey('stable-key'),/^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test('synthetic fixtures compute three closed records, retain clean controls and seed concentration',async()=>{
 const db=new MemoryStore(),s=new Service(db);const result=await seedFixtures(db,s,admin,{demo:20,clean:10,concentration:40});assert(result);assert.equal((await db.list('projects')).length,3);assert.equal((await db.list('attestations')).length,3);
 const clean=(await db.list('projects',{registryId:'SYNTHETIC-CLEAN'}))[0];assert.equal((await db.list('signals',{projectId:clean.id})).length,0);const concentration=(await db.list('projects',{registryId:'SYNTHETIC-CONCENTRATION'}))[0];assert.equal((await db.list('signals',{projectId:concentration.id,class:'onward_concentration'})).length,3);
 for(const a of await db.list('attestations')){assert.equal(a.document.enrolledCount,20);assert(a.document.paidCount<20);assert((await s.chain(a.projectId!)).valid);}await seedFixtures(db,s,admin,{demo:20,clean:10,concentration:40});assert.equal((await db.list('projects')).length,3);
});

test('developer trigger exposes every specified error only when explicitly enabled',async()=>{
 process.env.ENABLE_DEV_TOOLS='1';const db=new MemoryStore(),s=new Service(db);await db.put('users',row({...admin,verified:true}));const token=await issueSession(db,admin.id);const app=await createApp(db,s);delete process.env.ENABLE_DEV_TOOLS;
 try{for(const code of devCodes){const response=await app.inject({method:'POST',url:'/api/dev/trigger',headers:{authorization:'Bearer '+token},payload:{code}});assert.equal(response.json().error.code,code);}}finally{await app.close();}
});

test('unknown transfer outcomes cannot enter retry even with concurrent worker commands',async()=>{
 const db=new MemoryStore(),bank=new MockBank(),s=new Service(db,new Providers(db,bank));const p=await s.createProject(admin,'SYNTHETIC');await db.put('commitments',row({projectId:p.id,percentage:100,basis:'gross',cadence:'quarterly',accepted:true}));await db.put('participants',row({id:id(),projectId:p.id,identityHash:hash('unknown'),flags:[],status:'active',accountNumber:'8000000001',bankCode:'000014',kycLevel:2,noticeAttempted:true,noticeStatus:'sent'}));const run=await s.createRun(admin,p.id,{period:'unknown-outcome',declaredGross:'10.02',fundingAmount:'10.02',sourceAccount:'0123456790',closesAt:new Date(Date.now()+86400000).toISOString()});await s.preflight(run);await s.execute(run.id);await Promise.all([s.retry(run.id,'BANK_UNAVAILABLE'),s.retry(run.id,'INSUFFICIENT_FUNDS')]);assert.equal(bank.bulkCalls,1);assert.equal((await db.list('transfers')).length,1);assert.equal((await db.list('transfers'))[0].state,'in_flight');
});
