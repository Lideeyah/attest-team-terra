import {MockBank, type BankOptions} from './bank.js';
import {id,row} from './core.js';
import type {Store} from './store.js';

// Every invocation hydrates under a database lock. Warm function memory is never
// the source of truth for simulated balances, enquiries or idempotency results.
export class DurableMockBank extends MockBank {
  constructor(private store:Store){super();}
  override async call<T=unknown>(method:string,path:string,input:unknown={},key:string=id(),options:BankOptions={}):Promise<T>{
    let result:T|undefined,failure:unknown;
    await this.store.lock('hosted-mock-bank',async tx=>{
      const bank=new MockBank(),saved=await tx.get('tokens','hosted-mock-bank');
      if(saved?.snapshot)bank.restore(saved.snapshot);
      try{result=await bank.call<T>(method,path,input,key,options);}catch(error){failure=error;}
      // A timeout can follow acceptance. Persist that outcome before rethrowing.
      await tx.put('tokens',row({id:'hosted-mock-bank',snapshot:bank.snapshot()}));
    });
    if(failure)throw failure;
    return result as T;
  }
}
