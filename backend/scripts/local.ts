import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomBytes,generateKeyPairSync} from 'node:crypto';
import {openEmbedded} from './embedded-db.js';
import {PgStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {createApp} from '../src/app.js';
import {passwordHash} from '../src/auth.js';
import {row,hash} from '../src/core.js';
import {MockBank} from '../src/bank.js';
import {Providers} from '../src/providers.js';
import {seedFixtures} from './fixtures.js';
if(process.env.NODE_ENV==='production')throw Error('The embedded developer server is excluded from production.');
await mkdir('.local-state',{recursive:true});
let credentials:{password:string;identityPepper:string;authSecret:string;evidenceKey:string;signingKey:string};
try{credentials=JSON.parse(await readFile('.local-state/local-settings.json','utf8')) as typeof credentials;}
catch(error){if(!(typeof error==='object'&&error!==null&&'code'in error&&error.code==='ENOENT'))throw error;credentials={password:randomBytes(18).toString('base64url'),identityPepper:randomBytes(32).toString('hex'),authSecret:randomBytes(32).toString('hex'),evidenceKey:randomBytes(32).toString('base64'),signingKey:generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64')};await writeFile('.local-state/local-settings.json',JSON.stringify(credentials),{mode:0o600});}
Object.assign(process.env,{IDENTITY_PEPPER:credentials.identityPepper,AUTH_SECRET:credentials.authSecret,EVIDENCE_KEY_BASE64:credentials.evidenceKey,SIGNING_KEY_BASE64:credentials.signingKey,BANK_PROVIDER:'mock',REGISTRY_PROVIDER:'mock',EXTRACTION_PROVIDER:'mock',MESSAGING_PROVIDER:'mock',ANCHOR_PROVIDER:'mock',PUBLIC_URL:process.env.PUBLIC_URL??'http://localhost:3000',BANK_ACCOUNT_CONTROL_PATH:'/mock/accounts/{account}/status',BANK_FLOW_PATH:'/mock/accounts/{account}/flows'});
const {db,pool}=await openEmbedded('.local-state/postgres');const store=new PgStore(pool);const email='local@example.test';
if(!await store.get('users',hash(email)))await store.put('users',row({id:hash(email),email,passwordHash:passwordHash(credentials.password),organisationId:'local-synthetic-organisation',role:'developer_admin',verified:true}));
const bank=new MockBank();try{bank.restore(JSON.parse(await readFile('.local-state/mock-bank.json','utf8')));}catch(error){if(!(typeof error==='object'&&error!==null&&'code'in error&&error.code==='ENOENT'))throw error;}
const service=new Service(store,new Providers(store,bank));console.log('Preparing persistent synthetic fixtures (500 + 30 + 400 households)...');
await seedFixtures(store,service,{id:hash(email),organisationId:'local-synthetic-organisation',role:'developer_admin'});
for(const role of ['bank_ops','platform_admin','verifier','developer_operator'] as const){const roleEmail=role+'@example.test';if(!await store.get('users',hash(roleEmail)))await store.put('users',row({id:hash(roleEmail),email:roleEmail,passwordHash:passwordHash(credentials.password),organisationId:'local-synthetic-organisation',role,verified:true}));}
let saves=Promise.resolve();const persist=()=>{saves=saves.then(async()=>{await writeFile('.local-state/mock-bank.next',JSON.stringify(bank.snapshot()),{mode:0o600});await rename('.local-state/mock-bank.next','.local-state/mock-bank.json');});return saves;};await persist();process.env.ENABLE_DEV_TOOLS='1';
const app=await createApp(store,service);app.addHook('onResponse',async()=>{await persist();});await app.listen({host:'127.0.0.1',port:Number(process.env.PORT??8080)});let working=false;
const timer=setInterval(async()=>{if(working)return;working=true;try{await service.tick();await persist();}catch{console.error('Local worker will retry pending jobs.');}finally{working=false;}},5000);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{clearInterval(timer);await app.close();while(working)await new Promise(r=>setTimeout(r,10));await persist();await db.close();process.exit(0);});
console.log(`Local synthetic server: http://localhost:${process.env.PORT??8080}/auth/signin\nDeveloper: ${email}\nBank operations: bank_ops@example.test\nPlatform review: platform_admin@example.test\nVerifier: verifier@example.test\nGenerated local password for these fixture accounts: ${credentials.password}\nDatabase, signing key and mock bank persist under ignored .local-state/. All external providers are mocked.`);
