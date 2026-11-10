import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { PgStore } from '../src/store.js';
import { Service } from '../src/service.js';
import { passwordHash } from '../src/auth.js';
import { row, hash, id, now } from '../src/core.js';
if(process.env.BANK_PROVIDER==='live'||process.env.NODE_ENV==='production')throw Error('Local synthetic seed only; refusing live/production');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
if(!process.env.IDENTITY_PEPPER)throw Error('Set a stable IDENTITY_PEPPER before seeding');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const db=new PgStore(pool);const s=new Service(db);
try {
  const email='developer@example.test',uid=hash(email);
  if(await db.get('users',uid))throw Error('Seed already exists; refusing to replace records');
  const password=randomBytes(18).toString('base64url');const org=id();
  await db.put('users',row({id:uid,email,passwordHash:passwordHash(password),organisationId:org,role:'developer_admin',verified:true}));
  const principal={id:uid,organisationId:org,role:'developer_admin' as const};
  const project=await s.createProject(principal,'SYNTHETIC-001');
  await db.put('projects',{...project,sourceAccount:'0123456790'});
  await db.put('commitments',row({projectId:project.id,percentage:60,basis:'gross',cadence:'quarterly',beneficiary_definition:'synthetic households',source_quote:'Sixty percent of gross revenue is allocated to enrolled households.',page:1,accepted:true,original:true,provenance:'synthetic test fixture; not extracted real-world data'}));
  for(let i=1;i<=500;i++)await s.enrol(principal,{projectId:project.id,clientId:id(),consent:true,name:`Synthetic Household ${String(i).padStart(3,'0')}`,phone:'+234800'+String(i).padStart(7,'0'),identityType:'bvn',identity:'222'+String(i).padStart(8,'0'),capturedAt:now(),firstName:'Synthetic',lastName:'Household',dateOfBirth:'1990-01-01',point:[7.1+(i%20)*0.03,5.1+Math.floor(i/20)*0.02]});
  await s.tick();
  console.log(`Synthetic project: ${project.id}\nLocal login: ${email}\nGenerated password (shown once): ${password}`);
}finally{await pool.end();}
