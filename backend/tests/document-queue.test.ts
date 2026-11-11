import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {createApp} from '../src/app.js';
import {issueSession} from '../src/auth.js';
import {row} from '../src/core.js';
process.env.IDENTITY_PEPPER='document-test-pepper-at-least-32-characters';

test('document lane bypasses bank jobs and preserves claim and replay protection',async()=>{
 const db=new MemoryStore(),s=new Service(db);const bank=await s.enqueue('requery',{runId:'slow-bank-job'});const document=await s.enqueue('extraction',{projectId:'project',pages:['The community receives 60% of gross revenue annually.']});
 let calls=0;s.processJob=async job=>{assert.equal(job.type,'extraction');calls++;await new Promise(resolve=>setTimeout(resolve,10));};
 await Promise.all([s.processQueuedJobs({type:'extraction',limit:3}),s.processQueuedJobs({type:'extraction',limit:3})]);
 assert.equal(calls,1);assert.equal((await db.get('jobs',document.id))?.state,'done');assert.equal((await db.get('jobs',bank.id))?.state,'pending');
 await s.processQueuedJobs({type:'extraction',limit:3});assert.equal(calls,1);
});
test('document status is scoped and reports pending, review-required and failed work honestly',async()=>{
 const db=new MemoryStore(),s=new Service(db),app=await createApp(db,s),owner={id:'owner',role:'developer_admin' as const,organisationId:'one'};
 const p=await s.createProject(owner,'SYNTHETIC');
 for(const user of [owner,{id:'other',role:'developer_admin',organisationId:'two'}])await db.put('users',row({...user,email:user.id+'@example.test',verified:true,passwordHash:'unused'}));
 const headers={authorization:'Bearer '+await issueSession(db,'owner')},other={authorization:'Bearer '+await issueSession(db,'other')},url=`/api/projects/${p.id}/extraction/status`;
 try{
  assert.equal((await app.inject({url,headers})).json().data.state,'not_uploaded');
  await db.put('runs',row({projectId:'another-project',period:'2026',state:'executing',declaredGross:'0.00',fundingAmount:'0.00'}));
  const job=await s.enqueue('extraction',{projectId:p.id,pages:['A document without a commitment.']});
  assert.equal((await app.inject({url,headers})).json().data.state,'pending');
  assert.equal((await app.inject({url,headers:other})).statusCode,403);
  await s.processQueuedJobs({type:'extraction',limit:3});const result=(await app.inject({url,headers})).json().data;assert.equal(result.state,'done');assert.equal(result.proposal.reviewStatus,'pending');assert.equal(result.proposal.errorCode,'PDD_NO_COMMITMENT');
  await db.put('jobs',{...(await db.get('jobs',job.id))!,state:'failed',lastError:'JOB_FAILED'});assert.equal((await app.inject({url,headers})).json().data.state,'failed');
 }finally{await app.close();}
});
