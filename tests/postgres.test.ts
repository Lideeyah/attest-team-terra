import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { id, row } from '../src/core.js';
test('database rejects attestation mutation and duplicate run/participant transfers',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});const client=await pool.connect();
 try{await client.query('BEGIN');const aid=id();await client.query('INSERT INTO attestations(id,data) VALUES ($1,$2)',[aid,JSON.stringify(row({id:aid}))]);
 await client.query('SAVEPOINT immutable_check');await assert.rejects(client.query('UPDATE attestations SET data=data WHERE id=$1',[aid]),(e:any)=>e.code==='42501');await client.query('ROLLBACK TO SAVEPOINT immutable_check');
 const runId=id(),participantId=id();for(let i=0;i<2;i++){const tid=id();if(i===1)await client.query('SAVEPOINT unique_check');const write=client.query('INSERT INTO transfers(id,data) VALUES ($1,$2)',[tid,JSON.stringify(row({id:tid,runId,participantId,reference:id(),amount:'1.00',state:'queued'}))]);if(i===0)await write;else{await assert.rejects(write,(e:any)=>e.code==='23505');await client.query('ROLLBACK TO SAVEPOINT unique_check');}}
 await client.query('ROLLBACK');}finally{client.release();await pool.end();}
});
