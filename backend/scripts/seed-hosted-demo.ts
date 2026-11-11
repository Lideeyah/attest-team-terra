import pg from 'pg';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {generateKeyPairSync,randomBytes} from 'node:crypto';
import {PgStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {Providers} from '../src/providers.js';
import {MockBank} from '../src/bank.js';
import {hash,row} from '../src/core.js';
import {passwordHash} from '../src/auth.js';
import {seedFixtures} from './fixtures.js';

// Explicit local administration only; never exposed as a public seed route.
if(process.env.HOSTED_DEMO_SEED!=='confirmed'||process.env.NODE_ENV==='production')throw Error('Explicit hosted demo confirmation required');
process.loadEnvFile('.local-state/vercel-database.env');
await mkdir('.local-state',{recursive:true});
type Settings={password:string;identityPepper:string;authSecret:string;evidenceKey:string;signingKey:string;cronSecret:string};
let settings:Settings;
try{settings=JSON.parse(await readFile('.local-state/hosted-settings.json','utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;settings={password:randomBytes(18).toString('base64url'),identityPepper:randomBytes(32).toString('hex'),authSecret:randomBytes(32).toString('hex'),evidenceKey:randomBytes(32).toString('base64'),signingKey:generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64'),cronSecret:randomBytes(32).toString('hex')};await writeFile('.local-state/hosted-settings.json',JSON.stringify(settings),{mode:0o600});}
Object.assign(process.env,{IDENTITY_PEPPER:settings.identityPepper,AUTH_SECRET:settings.authSecret,EVIDENCE_KEY_BASE64:settings.evidenceKey,SIGNING_KEY_BASE64:settings.signingKey,BANK_PROVIDER:'mock',REGISTRY_PROVIDER:'mock',EXTRACTION_PROVIDER:'mock',MESSAGING_PROVIDER:'mock',ANCHOR_PROVIDER:'mock',MAIL_PROVIDER:'mock',PUBLIC_URL:process.env.PUBLIC_URL??'http://localhost:3001',BANK_ACCOUNT_CONTROL_PATH:'/mock/accounts/{account}/status',BANK_FLOW_PATH:'/mock/accounts/{account}/flows'});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5});
try{
 const db=new PgStore(pool),bank=new MockBank(),saved=await db.get('tokens','hosted-mock-bank');if(saved?.snapshot)bank.restore(saved.snapshot);
 const organisationId='hosted-synthetic-organisation',email='local@example.test';
 for(const [account,role]of [[email,'developer_admin'],['developer_operator@example.test','developer_operator'],['verifier@example.test','verifier'],['bank_ops@example.test','bank_ops'],['platform_admin@example.test','platform_admin']]){
  if(!await db.get('users',hash(account)))await db.put('users',row({id:hash(account),email:account,passwordHash:passwordHash(settings.password),organisationId,role,verified:true}));
 }
 const result=await seedFixtures(db,new Service(db,new Providers(db,bank)),{id:hash(email),organisationId,role:'developer_admin'},{demo:60,clean:30,concentration:60});
 await db.put('tokens',row({id:'hosted-mock-bank',snapshot:bank.snapshot()}));
 console.log(JSON.stringify(result));
}finally{await pool.end();}
