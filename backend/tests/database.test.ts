import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';

test('actual PostgreSQL/PostGIS migrations enforce geography, append-only records and before/after audit',async()=>{
 const db=new PGlite({extensions:{postgis}});
 try{
  await db.exec('CREATE TABLE schema_migrations(version text PRIMARY KEY)');
  for(const filename of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('migrations/'+filename,'utf8'));
  const insert=async(table:string,value:Record<string,unknown>)=>db.query(`INSERT INTO "${table}"(id,data) VALUES($1,$2::jsonb)`,[value.id,JSON.stringify(value)]);
  await insert('projects',{id:'project',organisationId:'org',name:'Synthetic test project'});
  await db.query("UPDATE projects SET boundary=ST_GeomFromText('POLYGON((7 5,8 5,8 6,7 6,7 5))',4326) WHERE id='project'");
  const points=await db.query<{inside:boolean;outside:boolean}>("SELECT ST_Contains(boundary,ST_SetSRID(ST_MakePoint(7.5,5.5),4326)) inside,ST_Contains(boundary,ST_SetSRID(ST_MakePoint(9,9),4326)) outside FROM projects WHERE id='project'");
  assert.equal(points.rows[0].inside,true);assert.equal(points.rows[0].outside,false);
  await db.query("SELECT set_config('attest.actor','synthetic-operator',false)");
  await insert('participants',{id:'participant',projectId:'project',identityHash:'synthetic-hash',consent:true,status:'active',flags:[]});
  await db.query("UPDATE participants SET data=data||'{\"status\":\"removed\"}'::jsonb WHERE id='participant'");
  const audits=await db.query<{data:Record<string,unknown>}>("SELECT data FROM audit WHERE data->>'entityId'='participant' ORDER BY created_at,id");
  assert.equal(audits.rows.length,2);assert.equal(audits.rows[1].data.principal,'synthetic-operator');assert.deepEqual((audits.rows[1].data.before as Record<string,unknown>).status,'active');assert.deepEqual((audits.rows[1].data.after as Record<string,unknown>).status,'removed');
  await assert.rejects(db.query("DELETE FROM participants WHERE id='participant'"));
  await insert('attestations',{id:'record',projectId:'project'});
  for(const sql of ["UPDATE attestations SET data=data WHERE id='record'","DELETE FROM attestations WHERE id='record'"])await assert.rejects(db.query(sql));
  const transfer={id:'t1',runId:'run',participantId:'participant',reference:'ATT-1',amount:'1.00',state:'queued'};
  await insert('transfers',transfer);await assert.rejects(insert('transfers',{...transfer,id:'t2',reference:'ATT-2'}));
  await db.exec('SET ROLE attest_app');await assert.rejects(db.query("UPDATE attestations SET data=data WHERE id='record'"));await db.exec('RESET ROLE');
 }finally{await db.close();}
});
