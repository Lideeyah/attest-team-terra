import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { PgStore } from '../src/store.js';
import { hash, row } from '../src/core.js';
const [email,type]=process.argv.slice(2);
if(!email||!['verify','reset'].includes(type))throw Error('Usage: npx tsx scripts/auth-token.ts email verify|reset');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const db=new PgStore(pool);
try{const user=await db.get('users',hash(email.toLowerCase()));if(!user)throw Error('User not found');const token=randomBytes(32).toString('hex');await db.put('tokens',row({id:hash(token),userId:user.id,type,expiresAt:new Date(Date.now()+3600_000).toISOString(),used:false}));console.log(token);}finally{await pool.end();}
