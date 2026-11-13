import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.js';
import { createApp } from '../src/app.js';
import { Service } from '../src/service.js';
import { issueSession, passwordHash } from '../src/auth.js';
import { row, id, hash } from '../src/core.js';
process.env.IDENTITY_PEPPER='test-pepper-at-least-thirty-two-characters-long';
async function setup(){
  const db=new MemoryStore();const s=new Service(db);const project=await db.put('projects',row({name:'Synthetic Project',registryId:'SYNTHETIC',country:'NG',organisationId:'org-a',status:'live'}));
  const participant=await db.put('participants',row({projectId:project.id,identityHash:'private-hash',name:'Synthetic',phone:'+2348000000001',identityLastFour:'0001',point:[7.11,5.11],flags:[]}));
  const tokens:Record<string,string>={};for(const role of ['developer_admin','developer_operator','agent','verifier','bank_ops','platform_admin']){await db.put('users',row({id:role,email:role+'@example.test',passwordHash:passwordHash('test-password-12345'),role,organisationId:'org-a',projectId:project.id,verified:true}));tokens[role]=await issueSession(db,role);}
  await db.put('users',row({id:'other',email:'other@example.test',role:'developer_admin',organisationId:'org-b',verified:true}));tokens.other=await issueSession(db,'other');
  const app=await createApp(db,s);return {db,s,app,project,participant,tokens};
}
test('health is public and consoles are gated',async()=>{const{app,project}=await setup();try{assert.equal((await app.inject('/healthz')).statusCode,200);assert.equal((await app.inject('/api/projects/'+project.id+'/participants')).statusCode,401);assert.equal((await app.inject('/dev/states')).statusCode,404);}finally{await app.close();}});
test('bank console HTML requires an operations role',async()=>{const{app,tokens}=await setup();try{assert.equal((await app.inject('/ops')).statusCode,302);assert.equal((await app.inject({url:'/ops',headers:{authorization:'Bearer '+tokens.verifier}})).statusCode,403);const html=await app.inject({url:'/ops',headers:{authorization:'Bearer '+tokens.bank_ops}});assert.equal(html.statusCode,200);assert.match(String(html.headers['content-type']),/text\/html/);assert.match(html.body,/Review the evidence/);}finally{await app.close();}});
test('role matrix and cross-organisation isolation',async()=>{const{app,project,participant,tokens}=await setup();try{
  for(const role of ['developer_admin','developer_operator'])assert.equal((await app.inject({url:`/api/projects/${project.id}/participants`,headers:{authorization:'Bearer '+tokens[role]}})).statusCode,200);
  for(const role of ['agent','verifier','bank_ops','platform_admin','other'])assert.equal((await app.inject({url:`/api/projects/${project.id}/participants`,headers:{authorization:'Bearer '+tokens[role]}})).statusCode,403);
  for(const role of ['verifier','bank_ops','other'])assert.equal((await app.inject({method:'PATCH',url:'/api/participants/'+participant.id,headers:{authorization:'Bearer '+tokens[role],'idempotency-key':id()},payload:{phone:'+2348000000002',reason:'correction'}})).statusCode,403);
  for(const role of ['bank_ops','platform_admin'])assert.equal((await app.inject({url:'/api/ops/signals',headers:{authorization:'Bearer '+tokens[role]}})).statusCode,200);
  for(const role of ['developer_admin','developer_operator','agent','verifier'])assert.equal((await app.inject({url:'/api/ops/signals',headers:{authorization:'Bearer '+tokens[role]}})).statusCode,403);
}finally{await app.close();}});
test('public and verifier output excludes household PII',async()=>{const{app,project,tokens}=await setup();try{for(const url of ['/api/public/register','/api/public/projects/'+project.id,'/api/public/projects/'+project.id+'/geography','/api/verifier/projects/'+project.id]){const response=await app.inject({url,headers:{authorization:'Bearer '+tokens.verifier}});assert.equal(response.statusCode,200,response.body);for(const secret of ['2348000000001','private-hash','identityLastFour','point','Synthetic Household'])assert(!response.body.includes(secret));}}finally{await app.close();}});
test('signup cannot grant privileged roles',async()=>{const{app}=await setup();try{for(const role of ['bank_ops','platform_admin','verifier','agent'])assert.equal((await app.inject({method:'POST',url:'/api/auth/signup',headers:{'idempotency-key':id()},payload:{email:role+'2@example.test',password:'test-password-12345',organisation:'Test',role}})).statusCode,403);}finally{await app.close();}});

test('MVP accounts sign in without email confirmation; passwords and suspension still apply',async()=>{
 const{app,db}=await setup();try{
  const payload={email:'new-operator@example.test',password:'test-password-12345',organisation:'Community operator'};
  const created=await app.inject({method:'POST',url:'/api/auth/signup',headers:{'idempotency-key':id()},payload});
  assert.equal(created.statusCode,200,created.body);assert.equal(created.json().data.verificationRequired,false);
  const user=await db.get('users',hash(payload.email));assert(user);assert.equal(user.verified,false);
  assert.equal((await db.list('jobs',{type:'auth-email'})).length,0);
  const signin=await app.inject({method:'POST',url:'/api/auth/signin',headers:{'idempotency-key':id()},payload});
  assert.equal(signin.statusCode,200,signin.body);
  const token=signin.json().data.token;assert.equal((await app.inject({url:'/api/auth/session',headers:{authorization:'Bearer '+token}})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/api/auth/signin',headers:{'idempotency-key':id()},payload:{...payload,password:'incorrect-password'}})).statusCode,401);
  await db.put('users',{...user,suspended:true});assert.equal((await app.inject({url:'/api/auth/session',headers:{authorization:'Bearer '+token}})).statusCode,401);
 }finally{await app.close();}
});
test('mutation idempotency replays same result and rejects changed body',async()=>{const{app,participant,tokens}=await setup();try{const key=id();const headers={authorization:'Bearer '+tokens.developer_admin,'idempotency-key':key};const input={method:'PATCH' as const,url:'/api/participants/'+participant.id,headers,payload:{phone:'+2348000000002',reason:'correct number'}};const first=await app.inject(input);assert.equal(first.statusCode,200,first.body);const second=await app.inject(input);assert.deepEqual(second.json(),first.json());assert.equal(second.headers['idempotent-replayed'],'true');assert.equal((await app.inject({...input,payload:{phone:'+2348000000003',reason:'different'}})).statusCode,409);}finally{await app.close();}});
test('developer cannot self-certify dispute resolution or delete a participant',async()=>{const{app,db,project,participant,tokens}=await setup();try{const d=await db.put('disputes',row({projectId:project.id,status:'open'}));assert.equal((await app.inject({method:'POST',url:'/api/disputes/'+d.id+'/respond',headers:{authorization:'Bearer '+tokens.developer_admin,'idempotency-key':id()},payload:{body:'Paid',status:'resolved'}})).statusCode,403);assert.equal((await app.inject({method:'DELETE',url:'/api/participants/'+participant.id,headers:{authorization:'Bearer '+tokens.developer_admin,'idempotency-key':id()}})).json().error.code,'PARTICIPANT_DELETE_NOT_PERMITTED');}finally{await app.close();}});
