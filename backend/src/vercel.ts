import type {IncomingMessage,ServerResponse} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import pg from 'pg';
import {waitUntil} from '@vercel/functions';
import {createApp} from './app.js';
import {PgStore} from './store.js';
import {Service} from './service.js';
import {Providers} from './providers.js';
import {DurableMockBank} from './durable-mock-bank.js';
import {row} from './core.js';

async function initialize(){
  for(const name of ['DATABASE_URL','IDENTITY_PEPPER','AUTH_SECRET','SIGNING_KEY_BASE64','EVIDENCE_KEY_BASE64','PUBLIC_URL','CRON_SECRET'])if(!process.env[name])throw Error(`${name} is required`);
  if(!['mock','live'].includes(process.env.BANK_PROVIDER??''))throw Error('BANK_PROVIDER must be explicit');
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:15000});
  const db=new PgStore(pool),providers=new Providers(db,process.env.BANK_PROVIDER==='mock'?new DurableMockBank(db):undefined),service=new Service(db,providers);
  const app=await createApp(db,service);
  async function work(){
    const client=await pool.connect();let locked=false;
    try{
      // Transaction-scoped locks also work through Neon's transaction pooler.
      await client.query('BEGIN');
      locked=(await client.query('SELECT pg_try_advisory_xact_lock(2026111101) AS locked')).rows[0].locked;
      if(!locked)return;
      const last=await db.get('tokens','hosted-worker-tick');
      if(last&&Date.now()-Date.parse(last.createdAt)<15000)return;
      await db.put('tokens',row({id:'hosted-worker-tick'}));
      await service.tick();
    }finally{await client.query('ROLLBACK');client.release();}
  }
  let documentsInFlight:Promise<void>|undefined;
  function documents(){
    // A separate lane prevents slow bank status checks from starving uploads.
    return documentsInFlight??=(service.processQueuedJobs({type:'extraction',limit:3}).finally(()=>{documentsInFlight=undefined;}));
  }
  app.get('/internal/tick',async(req,reply)=>{
    const actual=Buffer.from(req.headers.authorization??''),expected=Buffer.from('Bearer '+process.env.CRON_SECRET);
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply.code(401).send({error:'Unauthorized'});
    await documents();await work();return {status:'ok'};
  });
  app.addHook('onResponse',async(req,reply)=>{
    if(reply.statusCode<400&&req.url.startsWith('/api/')&&!req.url.startsWith('/api/public/')&&req.headers.cookie?.includes('attest.session-token=')){
      waitUntil(Promise.allSettled([documents(),work()]).then(results=>{if(results.some(result=>result.status==='rejected'))console.error('Hosted worker deferred; durable jobs remain queued.');}));
    }
  });
  await app.ready();return app;
}
let application:ReturnType<typeof initialize>|undefined;
export default async function handler(request:IncomingMessage,response:ServerResponse){
  try{
    const app=await(application??=initialize().catch(error=>{application=undefined;throw error;}));
    app.server.emit('request',request,response);
  }catch{console.error('Hosted API initialization failed. Check deployment configuration.');response.statusCode=503;response.end('Service unavailable');}
}
