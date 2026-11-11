import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFParse } from 'pdf-parse';
import { MemoryStore } from '../src/store.js';
import { Service } from '../src/service.js';
import { createApp } from '../src/app.js';
import { row, canonical, hash } from '../src/core.js';
test('PDF download embeds the signed record and rejects a modified uploaded file',async()=>{
 const db=new MemoryStore(),s=new Service(db);const document={projectId:'synthetic-project',period:'offline-demo',enrolledCount:5,paidCount:3,amountCommitted:'100.00',amountMovedToHouseholds:'60.00',chargesBorne:'1.00',shortfall:'40.00',confirmationCount:0,disputesOpen:0,closedAt:new Date().toISOString(),bankEvidence:'mock'};const digest=hash(canonical(document));const a=await db.put('attestations',row({projectId:'synthetic-project',document,hash:digest,signature:s.signer.sign(digest),publicKey:s.signer.publicKey}));const app=await createApp(db,s);
 try{const response=await app.inject('/api/public/attestations/'+a.id+'/pdf');assert.equal(response.statusCode,200);assert.equal(response.rawPayload.subarray(0,5).toString(),'%PDF-');const parser=new PDFParse({data:response.rawPayload});try{const text=await parser.getText();assert(text.text.includes('ATTEST-SHA256: '+digest));assert(text.text.includes('OFFLINE SYNTHETIC'));}finally{await parser.destroy();}
 const boundary='attest-test-boundary';const upload=(bytes:Buffer)=>Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="record.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)]);
 const verified=await app.inject({method:'POST',url:'/api/verify/attestation',headers:{'content-type':'multipart/form-data; boundary='+boundary},payload:upload(response.rawPayload)});assert.equal(verified.statusCode,200,verified.body);
 const tampered=Buffer.concat([response.rawPayload,Buffer.from('\nchanged')]);const rejected=await app.inject({method:'POST',url:'/api/verify/attestation',headers:{'content-type':'multipart/form-data; boundary='+boundary},payload:upload(tampered)});assert.equal(rejected.statusCode,422,rejected.body);
 }finally{await app.close();}
});
test('patched Hedera dependency graph can sign and round-trip an HCS transaction offline',async()=>{
 const {Client,PrivateKey,TopicMessageSubmitTransaction,Transaction}=await import('@hashgraph/sdk');const key=PrivateKey.generateED25519();const client=Client.forTestnet().setOperator('0.0.1001',key);
 try{const transaction=new TopicMessageSubmitTransaction().setTopicId('0.0.1002').setMessage('a'.repeat(64)).freezeWith(client);await transaction.sign(key);const restored=Transaction.fromBytes(transaction.toBytes());assert.equal(restored.transactionId?.toString(),transaction.transactionId?.toString());}finally{client.close();}
});
