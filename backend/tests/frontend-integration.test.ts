import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {MemoryStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {createApp} from '../src/app.js';
import {issueSession} from '../src/auth.js';
import {canonical,id,row} from '../src/core.js';
process.env.IDENTITY_PEPPER='frontend-integration-test-pepper-32-characters';
test('private project selection and GIS are scoped and agent DTOs exclude credentials',async()=>{
  const db=new MemoryStore(),service=new Service(db),app=await createApp(db,service);
  const owner={id:'owner',role:'developer_admin' as const,organisationId:'one'};
  const p=await service.createProject(owner,'SYNTHETIC');
  await db.put('projects',{...p,boundary:{type:'Polygon',coordinates:[[[7,5],[8,5],[8,6],[7,6],[7,5]]]},boundarySource:{synthetic:true}});
  for(const [who,organisationId,role]of [['owner','one','developer_admin'],['other','two','developer_admin'],['reader','one','verifier']])await db.put('users',row({id:who,email:who+'@example.test',organisationId,role,verified:true,passwordHash:'must-never-leak'}));
  const headers={authorization:'Bearer '+await issueSession(db,'owner')},other={authorization:'Bearer '+await issueSession(db,'other')},reader={authorization:'Bearer '+await issueSession(db,'reader')};
  try{
    const collection=await app.inject({url:'/api/projects',headers});assert.equal(collection.statusCode,200);assert.equal(collection.json().data.length,1);
    assert.equal((await app.inject({url:'/api/projects',headers:other})).json().data.length,0);
    assert.equal((await app.inject({url:`/api/projects/${p.id}/map`,headers:other})).statusCode,403);
    assert.equal((await app.inject({url:`/api/projects/${p.id}/map`,headers:reader})).statusCode,403);
    const map=await app.inject({url:`/api/projects/${p.id}/map`,headers});assert.equal(map.statusCode,200);assert(map.json().data.areaHectares>0);assert.equal(map.json().data.synthetic,true);
    await db.put('agents',row({id:'agent',projectId:p.id,organisationId:'one',email:'agent@example.test',name:'Test agent',role:'agent',status:'active',deviceKey:'public key',passwordHash:'must-never-leak'}));
    const agents=await app.inject({url:`/api/projects/${p.id}/agents`,headers});assert.equal(agents.statusCode,200);assert(!agents.body.includes('must-never-leak'));assert(!agents.body.includes('public key'));
  }finally{await app.close();}
});
test('canonical Ed25519 field capture is accepted, replayed once and rejects a changed location',async()=>{
  const db=new MemoryStore(),service=new Service(db),app=await createApp(db,service),owner={id:'owner',role:'developer_admin' as const,organisationId:'one'};
  const p=await service.createProject(owner,'SYNTHETIC');await db.put('projects',{...p,boundary:{type:'Polygon',coordinates:[[[7,5],[8,5],[8,6],[7,6],[7,5]]]}});
  const keys=generateKeyPairSync('ed25519'),deviceKey=keys.publicKey.export({type:'spki',format:'pem'}).toString();
  await db.put('users',row({id:'agent',email:'agent@example.test',passwordHash:'unused',organisationId:'one',projectId:p.id,role:'agent',verified:true}));
  await db.put('agents',row({id:'agent',projectId:p.id,organisationId:'one',name:'Test agent',status:'active',deviceKey}));
  const capture={clientId:id(),projectId:p.id,capturedAt:new Date().toISOString(),point:[7.5,5.5],consent:true,name:'Synthetic Household',firstName:'Synthetic',lastName:'Household',dateOfBirth:'1990-01-01',phone:'+2348000000001',identityType:'bvn',identity:'22250000001',accountNumber:'8000000001',bankCode:'000014'};
  const signature=sign(null,Buffer.from(canonical({capturedAt:capture.capturedAt,clientId:capture.clientId,point:capture.point,projectId:capture.projectId})),keys.privateKey).toString('base64');
  const headers={authorization:'Bearer '+await issueSession(db,'agent'),'idempotency-key':id()},payload={items:[{...capture,signature}]};
  try{const accepted=await app.inject({method:'POST',url:'/api/field/enrolments',headers,payload});assert.equal(accepted.statusCode,200,accepted.body);assert.equal(accepted.json().data[0].status,'success',accepted.body);const replay=await app.inject({method:'POST',url:'/api/field/enrolments',headers,payload});assert.equal(replay.headers['idempotent-replayed'],'true');assert.equal((await db.list('participants')).length,1);
    const changed=await app.inject({method:'POST',url:'/api/field/enrolments',headers:{...headers,'idempotency-key':id()},payload:{items:[{...capture,signature,point:[7.6,5.5]}]}});assert.equal(changed.json().data[0].code,'DEVICE_UNBOUND');
  }finally{await app.close();}
});
