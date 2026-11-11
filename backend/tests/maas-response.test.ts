import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Providers,MockBank} from '../src/providers.js';
import {MemoryStore} from '../src/store.js';
import {Fault} from '../src/core.js';

test('MaaS accepts bare and singly fenced JSON objects while rejecting ambiguous or malformed output',async()=>{
  const originalFetch=globalThis.fetch;
  const providers=new Providers(new MemoryStore(),new MockBank());
  let content='';
  globalThis.fetch=async()=>new Response(JSON.stringify({model:'glm-5.2',choices:[{message:{content}}]}),{headers:{'Content-Type':'application/json'}});
  try{
    for(const response of ['{"decision":"match"}','```json\n{"decision":"match"}\n```',' \r\n```JSON\r\n{"decision":"match"}\r\n```\r\n','```\n{"decision":"match"}\n```']){
      content=response;
      assert.deepEqual(await providers.model('Synthetic test',{}),{decision:'match',model:'glm-5.2'});
    }
    for(const response of ['Here is the JSON:\n```json\n{}\n```','```json\n{}\n```\nAdditional text','```json\n{}\n```\n```json\n{}\n```','```json\n{invalid}\n```','[]','null','```json\n[]\n```']){
      content=response;
      await assert.rejects(providers.model('Synthetic test',{}),(error:unknown)=>error instanceof Fault&&error.code==='EXTRACTION_LOW_CONFIDENCE');
    }
  }finally{globalThis.fetch=originalFetch;}
});
