import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
const url=process.env.MIGRATION_DATABASE_URL;
if(!url)throw Error('MIGRATION_DATABASE_URL must use a dedicated database owner');
const pool=new pg.Pool({connectionString:url});
try {
 const client=await pool.connect();
 try {
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(20261109)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY)');
  for(const file of (await readdir('migrations')).filter(f=>/^\d+.*\.sql$/.test(f)).sort()){
   const version=file.split('_')[0];
   if(!(await client.query('SELECT 1 FROM schema_migrations WHERE version=$1',[version])).rowCount){
    await client.query(await readFile('migrations/'+file,'utf8'));await client.query('INSERT INTO schema_migrations VALUES ($1)',[version]);
   }
  }
  await client.query('COMMIT');console.log('Migrations applied.');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}finally{await pool.end();}
