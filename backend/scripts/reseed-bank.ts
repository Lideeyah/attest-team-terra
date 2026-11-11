import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {PgStore} from '../src/store.js';
import {LiveBank,MockBank} from '../src/bank.js';
import {reseedBank,reseedManifest} from '../src/reseed.js';
const [manifestPath,sessionId]=process.argv.slice(2);
if(!manifestPath||!sessionId||!/^[a-zA-Z0-9_-]{8,100}$/.test(sessionId))throw Error('Usage: npm run reseed:bank -- path/to/approved.reseed.json unique-session-id');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
if(process.env.NODE_ENV==='production'||process.env.BANK_SANDBOX_CONFIRMED!=='true')throw Error('This command requires BANK_SANDBOX_CONFIRMED=true and refuses NODE_ENV=production');
const steps=reseedManifest(JSON.parse(await readFile(manifestPath,'utf8'))),pool=new pg.Pool({connectionString:process.env.DATABASE_URL}),db=new PgStore(pool);
try{console.log('Resuming sandbox preconditions with session '+sessionId+'; reuse it after uncertainty.');console.log(JSON.stringify(await reseedBank(db,process.env.BANK_PROVIDER==='live'?new LiveBank(db):new MockBank(),steps,sessionId)));}finally{await pool.end();}
