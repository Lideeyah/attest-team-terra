import pg from 'pg';
import { PgStore } from './store.js';
import { Service } from './service.js';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5});
const service=new Service(new PgStore(pool));let stopped=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;});
while(!stopped){try{await service.tick();}catch{console.error('Worker tick failed; durable jobs remain queued.');}await new Promise(r=>setTimeout(r,5000));}
await pool.end();
