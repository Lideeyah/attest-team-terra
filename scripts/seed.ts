import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { PgStore } from '../src/store.js';
import { Service } from '../src/service.js';
import { passwordHash } from '../src/auth.js';
import { row, hash, id, now } from '../src/core.js';
import {seedFixtures} from './fixtures.js';
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
  const fixtures=await seedFixtures(db,s,principal);
  console.log(`Local login: ${email}\nGenerated password (shown once): ${password}\n${JSON.stringify(fixtures,null,2)}`);
}finally{await pool.end();}
