import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHmac } from 'node:crypto';
import { MemoryStore } from '../src/store.js';
import { Service } from '../src/service.js';
import { createApp } from '../src/app.js';
import { row, now, hash, canonical, id } from '../src/core.js';
import { issueSession } from '../src/auth.js';
process.env.IDENTITY_PEPPER='test-pepper-at-least-thirty-two-characters-long';
test('invite can be redeemed once and agent login works',async()=>{
 const db=new MemoryStore();const app=await createApp(db);
 const inviteCode=id(),email='agent@example.test';await db.put('invites',row({id:hash(inviteCode),email,projectId:'project',organisationId:'org',expiresAt:new Date(Date.now()+60000).toISOString(),used:false,revoked:false}));
 const {publicKey}=generateKeyPairSync('ed25519');const deviceKey=publicKey.export({type:'spki',format:'pem'}).toString();
 try{const request={method:'POST' as const,url:'/api/invites/'+inviteCode+'/redeem',payload:{identity:{email,password:'test-password-12345'},deviceKey}};
 const results=await Promise.all([app.inject({...request,headers:{'idempotency-key':id()}}),app.inject({...request,headers:{'idempotency-key':id()}})]);assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,410]);
 const agent=await db.get('agents',hash(email));assert.equal(agent?.status,'pending_verification');await db.put('agents',{...agent!,status:'active',verification:{match:true}});
 const login=await app.inject({method:'POST',url:'/api/auth/signin',headers:{'idempotency-key':id()},payload:{email,password:'test-password-12345'}});assert.equal(login.statusCode,200,login.body);assert(login.json().data.token);
 }finally{await app.close();}
});
test('device-signed enrolment rejects a changed capture payload',async()=>{
 const db=new MemoryStore(),s=new Service(db);const admin={id:'admin',organisationId:'org',role:'developer_admin' as const};const project=await s.createProject(admin,'SYNTHETIC');
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');await db.put('agents',row({id:'agent',projectId:project.id,status:'active',deviceKey:publicKey.export({type:'spki',format:'pem'}).toString()}));
 const input={clientId:id(),projectId:project.id,name:'Synthetic Household',firstName:'Synthetic',lastName:'Household',phone:'+2348000000001',identityType:'bvn',identity:'22200000001',dateOfBirth:'1990-01-01',consent:true,capturedAt:now(),point:[7.5,5.5]};
 const signature=sign(null,Buffer.from(canonical({clientId:input.clientId,projectId:input.projectId,capturedAt:input.capturedAt,point:input.point})),privateKey).toString('base64');const agent={id:'agent',organisationId:'org',projectId:project.id,role:'agent' as const};
 await assert.rejects(s.enrol(agent,{...input,point:[7.6,5.6],signature}),{code:'DEVICE_UNBOUND'});const p=await s.enrol(agent,{...input,signature});assert.equal(p.agentId,'agent');
});
test('receipt confirmation is separate from settlement and resolves disputes only with evidence',async()=>{
 const db=new MemoryStore(),s=new Service(db);const project=await db.put('projects',row({name:'Synthetic',organisationId:'org'}));const t=await db.put('transfers',row({runId:'run',participantId:'participant',projectId:project.id,reference:'ATT-TEST',state:'settled',amount:'100.00'}));
 const receipt=row({projectId:project.id,participantId:'participant',transferId:t.id});const d=await s.dispute({category:'not_received'},receipt);assert.equal(d.status,'open');assert.equal((await db.list('confirmations')).length,0);
 await s.confirm(receipt);assert.equal((await db.list('confirmations')).length,1);assert.equal((await s.required('disputes',d.id)).resolutionBasis,'participant_confirmation');assert.equal((await s.required('transfers',t.id)).state,'settled');await assert.rejects(s.confirm(receipt),{code:'ALREADY_CONFIRMED'});
});
test('signed webhook is durably queued once, tampered webhook is rejected',async()=>{
 const db=new MemoryStore(),app=await createApp(db);process.env.FORGE_WEBHOOK_SECRET='synthetic-hook-secret';
 const payload=JSON.stringify({event_id:'synthetic-event',type:'webhook.test',data:{}}),timestamp=String(Math.floor(Date.now()/1000));const signature=createHmac('sha256',process.env.FORGE_WEBHOOK_SECRET).update(timestamp+'.'+payload).digest('hex');
 try{const headers={'content-type':'application/json','x-forge-timestamp':timestamp,'x-forge-signature':signature};for(let i=0;i<2;i++)assert.equal((await app.inject({method:'POST',url:'/hooks/forge',headers,payload})).statusCode,200);assert.equal((await db.list('events')).length,1);assert.equal((await db.list('jobs')).length,1);assert.equal((await app.inject({method:'POST',url:'/hooks/forge',headers,payload:payload+' '})).statusCode,403);}finally{await app.close();}
});
