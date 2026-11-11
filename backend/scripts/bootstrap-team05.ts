import pg from 'pg';
import {PgStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {Providers,MockBank} from '../src/providers.js';
import {passwordHash} from '../src/auth.js';
import {hash,row} from '../src/core.js';
import {seedFixtures} from './fixtures.js';

if(process.env.TEAM05_BOOTSTRAP!=='confirmed'||!process.env.MIGRATION_DATABASE_URL||!process.env.DATABASE_URL||!process.env.TEAM05_DEMO_PASSWORD)throw Error('Explicit team05 bootstrap settings required');
const owner=new pg.Pool({connectionString:process.env.MIGRATION_DATABASE_URL,max:1});
try{
  if(!(await owner.query("SELECT 1 FROM pg_roles WHERE rolname='attest_runtime'")).rowCount){
    const password=decodeURIComponent(new URL(process.env.DATABASE_URL).password);
    const sql=(await owner.query("SELECT format('CREATE ROLE attest_runtime LOGIN PASSWORD %L IN ROLE attest_app', $1::text)",[password])).rows[0].format;
    await owner.query(sql);
  }
}finally{await owner.end();}

// Only this explicit, one-time administration process creates synthetic history.
Object.assign(process.env,{NODE_ENV:'development',BANK_PROVIDER:'mock',REGISTRY_PROVIDER:'mock',EXTRACTION_PROVIDER:'mock',MESSAGING_PROVIDER:'mock',ANCHOR_PROVIDER:'mock'});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2});
try{
  const db=new PgStore(pool),marker='team05:bootstrap:v1';
  if(!await db.get('tokens',marker)){
    const organisationId='team05-demo-organisation';
    for(const [email,role]of [['local@example.test','developer_admin'],['developer_operator@example.test','developer_operator'],['verifier@example.test','verifier'],['bank_ops@example.test','bank_ops'],['platform_admin@example.test','platform_admin']]){
      if(!await db.get('users',hash(email)))await db.put('users',row({id:hash(email),email,passwordHash:passwordHash(process.env.TEAM05_DEMO_PASSWORD),organisationId,role,verified:true}));
    }
    await seedFixtures(db,new Service(db,new Providers(db,new MockBank())),{id:hash('local@example.test'),organisationId,role:'developer_admin'},{demo:60,clean:30,concentration:60});
    // Historical reports stay explicitly synthetic; live payouts require an administrator-linked sandbox account.
    const projects=await db.list('projects',{organisationId}),projectIds=new Set(projects.map(project=>project.id));
    for(const project of projects)await db.put('projects',{...project,sourceAccount:null,openingBalance:'0.00'});
    const attestationIds=new Set((await db.list('attestations')).filter(a=>projectIds.has(a.projectId!)).map(a=>a.id));
    for(const job of await db.list('jobs'))if(job.state==='pending'&&(projectIds.has(job.data.projectId??'')||(job.type==='anchor'&&attestationIds.has(job.data.attestationId??''))))await db.put('jobs',{...job,state:'done',completedAt:new Date().toISOString(),bootstrapSynthetic:true});
    await db.put('tokens',row({id:marker,complete:true}));
  }
  console.log('Team05 roles and labelled synthetic walkthrough configured. Live source accounts require explicit linking.');
}finally{await pool.end();}
