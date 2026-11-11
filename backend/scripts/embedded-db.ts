import {PGlite} from '@electric-sql/pglite';
import {postgis} from '@electric-sql/pglite-postgis';
import {readdir,readFile} from 'node:fs/promises';
import type {SqlPool,SqlClient,SqlResult} from '../src/store.js';
export class EmbeddedPool implements SqlPool{
 private gate:Promise<void>=Promise.resolve();constructor(public db:PGlite){}
 async connect():Promise<SqlClient>{let release!:()=>void;const previous=this.gate;this.gate=new Promise<void>(r=>{release=r;});await previous;let released=false;return {query:async(sql,args=[])=>{const result=await this.db.query<Record<string,unknown>>(sql,args);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length};},release:()=>{if(!released){released=true;release();}}};}
 async query(sql:string,args:unknown[]=[]):Promise<SqlResult>{const client=await this.connect();try{return await client.query(sql,args);}finally{client.release();}}
}
export async function openEmbedded(dataDir?:string){
 const db=new PGlite({dataDir,extensions:{postgis}});await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY)');
 for(const file of (await readdir('migrations')).filter(f=>/^\d+.*\.sql$/.test(f)).sort()){
  const version=file.split('_')[0];if((await db.query('SELECT 1 FROM schema_migrations WHERE version=$1',[version])).rows.length)continue;
  await db.transaction(async tx=>{await tx.exec(await readFile('migrations/'+file,'utf8'));await tx.query('INSERT INTO schema_migrations VALUES($1)',[version]);});
 }
 return {db,pool:new EmbeddedPool(db)};
}
