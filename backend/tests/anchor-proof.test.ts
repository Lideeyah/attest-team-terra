import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {Providers,MockBank} from '../src/providers.js';
import {MemoryStore} from '../src/store.js';
import {Fault} from '../src/core.js';

const anchor={status:'anchored',provider:'hedera-testnet',topicId:'0.0.123',sequence:'7'};
const hash='a'.repeat(64);
const message=(value=hash)=>new Response(JSON.stringify({message:Buffer.from(value).toString('base64'),consensus_timestamp:'123.456'}));
async function advance<T>(t:TestContext,promise:Promise<T>){
  let settled=false;promise.then(()=>{settled=true;},()=>{settled=true;});
  for(let i=0;i<60&&!settled;i++){await new Promise<void>(resolve=>setImmediate(resolve));t.mock.timers.tick(1000);}
  return promise;
}
const unreachable=(error:unknown)=>error instanceof Fault&&error.code==='ANCHOR_UNREACHABLE';

test('proof waits for mirror indexing and transient failures without resubmitting an anchor',async t=>{
  t.mock.timers.enable({apis:['setTimeout','Date']});
  const original=globalThis.fetch;const providers=new Providers(new MemoryStore(),new MockBank());
  let calls=0;
  globalThis.fetch=async(input,options)=>{
    assert.equal(String(input),'https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.123/messages/7');
    assert(!options?.method||options.method==='GET');calls++;
    if(calls===1)return new Response(null,{status:404});
    if(calls===2)throw new TypeError('temporary connection failure');
    if(calls===3)return new Response(null,{status:503});
    return message();
  };
  try{assert.deepEqual(await advance(t,providers.anchorProof(anchor,hash)),{status:'anchored',verified:true,consensusTimestamp:'123.456'});assert.equal(calls,4);}
  finally{globalThis.fetch=original;}
});

test('proof stops waiting when the mirror remains unavailable',async t=>{
  t.mock.timers.enable({apis:['setTimeout','Date']});
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(null,{status:404});};
  try{const result=assert.rejects(new Providers(new MemoryStore(),new MockBank()).anchorProof(anchor,hash),unreachable);await advance(t,result);assert(calls>1&&calls<=6);}
  finally{globalThis.fetch=original;}
});

test('proof rejects a different hash and permanent HTTP errors immediately',async()=>{
  const original=globalThis.fetch;const providers=new Providers(new MemoryStore(),new MockBank());
  let calls=0;
  try{
    globalThis.fetch=async()=>{calls++;return message('b'.repeat(64));};
    await assert.rejects(providers.anchorProof(anchor,hash),(error:unknown)=>error instanceof Fault&&error.code==='PROOF_INVALID');assert.equal(calls,1);
    globalThis.fetch=async()=>{calls++;return new Response(null,{status:403});};
    await assert.rejects(providers.anchorProof(anchor,hash),unreachable);assert.equal(calls,2);
  }finally{globalThis.fetch=original;}
});
