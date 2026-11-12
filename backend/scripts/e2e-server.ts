import {Finance} from '../src/finance.js';
/** Isolated local test server. Never included in production builds. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {openEmbedded} from './embedded-db.js';
import {seedFixtures} from './fixtures.js';
import {PgStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {Providers} from '../src/providers.js';
import {MockBank} from '../src/bank.js';
import {createApp} from '../src/app.js';
import {hash,row,ensure,now,id} from '../src/core.js';
import {passwordHash} from '../src/auth.js';
import {record,text} from '../src/validation.js';
if(process.env.NODE_ENV==='production')throw Error('E2E server is local only');
const settings=JSON.parse(await readFile('.local-state/local-settings.json','utf8')) as Record<string,string>;
Object.assign(process.env,{IDENTITY_PEPPER:settings.identityPepper,AUTH_SECRET:settings.authSecret,EVIDENCE_KEY_BASE64:settings.evidenceKey,SIGNING_KEY_BASE64:settings.signingKey,BANK_PROVIDER:'mock',REGISTRY_PROVIDER:'mock',EXTRACTION_PROVIDER:'mock',MESSAGING_PROVIDER:'mock',ANCHOR_PROVIDER:'mock',PUBLIC_URL:'http://localhost:3100',BANK_ACCOUNT_CONTROL_PATH:'/mock/accounts/{account}/status',BANK_FLOW_PATH:'/mock/accounts/{account}/flows',ENABLE_DEV_TOOLS:'1'});
await mkdir('.local-state',{recursive:true});
const {db:engine,pool}=await openEmbedded();const db=new PgStore(pool),bank=new MockBank(),s=new Service(db,new Providers(db,bank));
for(const [email,role]of [['local@example.test','developer_admin'],['developer_operator@example.test','developer_operator'],['verifier@example.test','verifier'],['bank_ops@example.test','bank_ops'],['platform_admin@example.test','platform_admin'],['other@example.test','developer_admin']])await db.put('users',row({id:hash(email),email,role,organisationId:email==='other@example.test'?'other-organisation':'e2e-organisation',verified:true,passwordHash:passwordHash(settings.password)}));
const principal={id:hash('local@example.test'),role:'developer_admin' as const,organisationId:'e2e-organisation'};
console.log('Seeding isolated PostGIS demo data...');
await seedFixtures(db,s,principal,{demo:30,clean:8,concentration:20});
const app=await createApp(db,s),secret=randomBytes(32).toString('hex');
let working:Promise<void>|undefined;function tick(){return working??=(s.tick().finally(()=>{working=undefined;}));}
app.post('/__e2e/control',async(req)=>{
 ensure(req.headers.authorization==='Bearer '+secret,'FORBIDDEN',403);const b=record(req.body);
 if(b.action==='income'){const project=await s.required('projects',text(b.projectId));ensure(project.sourceAccount,'INVALID_REQUEST');const receipt=await new Finance(s).receive(id(),{account_number:project.sourceAccount,session_id:text(b.reference),amount:text(b.amount),currency:'NGN'});await tick();return {receipt};}
 if(b.action==='tick'){bank.advanceTime(7000);await tick();return {ok:true};}
 if(b.action==='close'){await tick();const run=await s.required('runs',text(b.runId));await db.put('runs',{...run,closesAt:new Date(Date.now()-1000).toISOString()});return {attestation:await s.close(run.id)};}
 if(b.action==='receipt'){const transfer=await s.required('transfers',text(b.transferId)),token=id()+id();await db.put('receipts',row({id:hash(token),projectId:transfer.projectId,participantId:transfer.participantId,transferId:transfer.id,expiresAt:new Date(Date.now()+3600000).toISOString()}));return {token};}
 if(b.action==='auth-token'){const jobs=(await db.list('jobs',{type:'auth-email'})).filter(job=>job.data.userId===hash(text(b.email))&&job.data.type===text(b.type));return {token:jobs.at(-1)?.data.token};}
 if(b.action==='summary')return {projects:(await db.list('projects')).length,jobs:(await db.list('jobs')).map(j=>({id:j.id,type:j.type,state:j.state})),at:now()};
 throw Error('Unknown test action');
});
await app.listen({host:'127.0.0.1',port:8081});await writeFile('.local-state/e2e-control.json',JSON.stringify({secret,pid:process.pid,api:'http://127.0.0.1:8081',frontend:'http://localhost:3100'}),{mode:0o600});
const timer=setInterval(()=>{void tick().catch(()=>console.error('E2E worker deferred'));},2000);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{clearInterval(timer);await working;await app.close();await engine.close();process.exit(0);});
console.log('Isolated E2E service ready at http://127.0.0.1:8081; providers are mocked.');
