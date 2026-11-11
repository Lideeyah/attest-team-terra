import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from '../src/store.js';
import {DurableMockBank} from '../src/durable-mock-bank.js';

test('separate hosted bank instances preserve balances and mutation idempotency',async()=>{
 const store=new MemoryStore(),first=new DurableMockBank(store),second=new DurableMockBank(store);
 const path='/admin/accounts/0123456789/fund';
 await first.call('POST',path,{amount:'100.00'},'same-funding');
 await second.call('POST',path,{amount:'100.00'},'same-funding');
 const result=await new DurableMockBank(store).call<{available_balance:string}>('GET','/accounts/0123456789/balance');
 assert.equal(result.available_balance,'100000100.00');
 await assert.rejects(second.call('POST',path,{amount:'200.00'},'same-funding'),{code:'DUPLICATE_REQUEST'});
});
