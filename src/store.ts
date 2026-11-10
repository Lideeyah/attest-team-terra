import pg from 'pg';
import type {EntityMap} from './models.js';
import { Fault, row, type Row, type Principal } from './core.js';

export const tables = ['users','sessions','tokens','invites','projects','commitments','participants','agents','rosters','runs','transfers','confirmations','attestations','anchors','disputes','signals','cases','audit','jobs','receipts','events','idempotency','watchlist','alerts','notifications','evidence','registry_history'] as const;
export type Table = typeof tables[number];
export interface PageOptions{page:number;perPage:number;where?:Record<string,unknown>;search?:{field:string;value:string};flagged?:boolean;sort?:string;descending?:boolean;}
export interface SqlResult{rows:Record<string,unknown>[];rowCount:number|null;}
export interface SqlClient{query(sql:string,args?:unknown[]):Promise<SqlResult>;release():void;}
export interface SqlPool{query(sql:string,args?:unknown[]):Promise<SqlResult>;connect():Promise<SqlClient>;}
export interface Store {
  list<T extends Table>(table: T, where?: Record<string, unknown>): Promise<EntityMap[T][]>;
  page<T extends Table>(table:T,options:PageOptions):Promise<{rows:EntityMap[T][];total:number}>;
  get<T extends Table>(table: T, id: string): Promise<EntityMap[T] | undefined>;
  put<T extends Table>(table: T, value: Row): Promise<EntityMap[T]>;
  lock<T>(key: string, work: (tx: Store) => Promise<T>): Promise<T>;
  inside(projectId: string, point: [number, number]): Promise<boolean>;
  scoped<T extends Table>(table: T, id: string, principal: Principal): Promise<EntityMap[T] | undefined>;
  asActor(actor: string): Store;
}
export class PgStore implements Store {
  constructor(public pool: SqlPool, private client?: SqlClient, private actor = 'worker') {}
  asActor(actor: string): Store { return new PgStore(this.pool,this.client,actor); }
  async scoped<T extends Table>(table:T,id:string,p:Principal){
    const global=['bank_ops','platform_admin'].includes(p.role);
    const project=table==='projects'?'e.id':"e.data->>'projectId'";
    const ownership=global?'TRUE':p.role==='agent'?`${project}=$2 AND ${table==='participants'?"e.data->>'agentId'=$3":'TRUE'}`:`EXISTS (SELECT 1 FROM projects p WHERE p.id=${project} AND p.data->>'organisationId'=$2)`;
    const args=global?[id]:p.role==='agent'&&table==='participants'?[id,p.projectId,p.id]:[id,p.role==='agent'?p.projectId:p.organisationId];
    return (await this.query(`SELECT e.data FROM "${table}" e WHERE e.id=$1 AND (${ownership})`,args)).rows[0]?.data as EntityMap[T]|undefined;
  }
  private query(sql: string, args: unknown[] = []) { return (this.client ?? this.pool).query(sql, args); }
  async list<T extends Table>(table: T, where: Record<string, unknown> = {}) {
    const args: unknown[] = []; const clauses = Object.entries(where).map(([k,v]) => { args.push(k, JSON.stringify(v)); return `data -> $${args.length-1} = $${args.length}::jsonb`; });
    return (await this.query(`SELECT data FROM "${table}"${clauses.length ? ' WHERE '+clauses.join(' AND ') : ''} ORDER BY created_at, id`, args)).rows.map(r => r.data as EntityMap[T]);
  }
  async page<T extends Table>(table:T,o:PageOptions){
    const args:unknown[]=[],clauses=Object.entries(o.where??{}).map(([k,v])=>{args.push(k,JSON.stringify(v));return `data -> $${args.length-1} = $${args.length}::jsonb`;});
    if(o.search){args.push(o.search.field,'%'+o.search.value.replace(/[\\%_]/g,'\\$&')+'%');clauses.push(`data ->> $${args.length-1} ILIKE $${args.length} ESCAPE '\\'`);}
    if(o.flagged)clauses.push("jsonb_array_length(COALESCE(data->'flags','[]'::jsonb))>0");
    const where=clauses.length?' WHERE '+clauses.join(' AND '):'';const count=await this.query(`SELECT count(*)::integer total FROM "${table}"${where}`,args);
    args.push(o.sort??'createdAt');const sort=`data ->> $${args.length}`;args.push(o.perPage,(o.page-1)*o.perPage);
    const result=await this.query(`SELECT data FROM "${table}"${where} ORDER BY ${sort} ${o.descending?'DESC':'ASC'} NULLS LAST,id ${o.descending?'DESC':'ASC'} LIMIT $${args.length-1} OFFSET $${args.length}`,args);return {rows:result.rows.map(r=>r.data as EntityMap[T]),total:Number(count.rows[0].total)};
  }
  async get<T extends Table>(table: T, id: string) { return (await this.query(`SELECT data FROM "${table}" WHERE id=$1`, [id])).rows[0]?.data as EntityMap[T] | undefined; }
  async put<T extends Table>(table: T, value: Row):Promise<EntityMap[T]> {
    if(!this.client)return this.lock('write:'+table+':'+value.id,tx=>tx.put(table,value));
    const append = ['attestations','audit','confirmations','events','evidence','registry_history','commitments'].includes(table);
    try {
      await this.query(`INSERT INTO "${table}" (id,data) VALUES ($1,$2::jsonb) ${append ? '' : 'ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data'}`, [value.id, JSON.stringify(value)]);
      if (table === 'projects' && value.boundary) await this.query('UPDATE projects SET boundary=ST_SetSRID(ST_GeomFromGeoJSON($2),4326) WHERE id=$1', [value.id,JSON.stringify(value.boundary)]);
      if (table === 'participants' && value.point) await this.query('UPDATE participants SET location=ST_SetSRID(ST_MakePoint($2,$3),4326) WHERE id=$1',[value.id,...value.point as [number,number]]);
      return value as EntityMap[T];
    } catch (e: unknown) { if (typeof e==='object'&&e!==null&&'code'in e&&e.code === '23505') throw new Fault('DUPLICATE_REQUEST',409); throw e; }
  }
  async lock<T>(key: string, work: (tx: Store) => Promise<T>): Promise<T> {
    if (this.client) {
      const savepoint='nested_'+Math.random().toString(36).slice(2);
      await this.query(`SAVEPOINT ${savepoint}`);
      try {await this.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);const result=await work(this);await this.query(`RELEASE SAVEPOINT ${savepoint}`);return result;}
      catch(e){await this.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);await this.query(`RELEASE SAVEPOINT ${savepoint}`);throw e;}
    }
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); await client.query("SELECT set_config('attest.actor',$1,true)",[this.actor]); await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]); const result = await work(new PgStore(this.pool,client,this.actor)); await client.query('COMMIT'); return result; }
    catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async inside(projectId: string, point: [number,number]) { return (await this.query('SELECT ST_Contains(boundary,ST_SetSRID(ST_MakePoint($2,$3),4326)) AS inside FROM projects WHERE id=$1',[projectId,...point])).rows[0]?.inside === true; }
}

// Test-only store. The production entry point always requires PostgreSQL.
export class MemoryStore implements Store {
  data = new Map<string,Row>(); private locks = new Map<string,Promise<unknown>>();
  private actor='worker';
  asActor(actor:string):Store {const view=Object.create(this) as MemoryStore;view.actor=actor;return view;}
  async scoped<T extends Table>(t:T,entityId:string,p:Principal){const entity=await this.get(t,entityId);if(!entity)return;const project=t==='projects'?entity:await this.get('projects',entity.projectId!);if(!project)return;if(['bank_ops','platform_admin'].includes(p.role)||p.role==='agent'&&p.projectId===project.id&&(t!=='participants'||entity.agentId===p.id)||['developer_admin','developer_operator'].includes(p.role)&&p.organisationId===project.organisationId)return entity;}
  async list<T extends Table>(t: T, where: Record<string,unknown> = {}) { return structuredClone([...this.data.entries()].filter(([k,v]) => k.startsWith(t+':') && Object.entries(where).every(([a,b]) => v[a] === b)).map(([,v])=>v)) as EntityMap[T][]; }
  async page<T extends Table>(t:T,o:PageOptions){let values=await this.list(t,o.where);if(o.search)values=values.filter(r=>String(r[o.search!.field]??'').toLowerCase().includes(o.search!.value.toLowerCase()));if(o.flagged)values=values.filter(r=>Array.isArray(r.flags)&&r.flags.length>0);const key=o.sort??'createdAt';values.sort((a,b)=>{const result=String(a[key]??'').localeCompare(String(b[key]??''))||a.id.localeCompare(b.id);return o.descending?-result:result;});return {rows:values.slice((o.page-1)*o.perPage,o.page*o.perPage),total:values.length};}
  async get<T extends Table>(t: T, id: string) { return structuredClone(this.data.get(t+':'+id)) as EntityMap[T]|undefined; }
  async put<T extends Table>(t: T, r: Row):Promise<EntityMap[T]> {
    if (['attestations','audit','confirmations','events','evidence','registry_history','commitments'].includes(t) && this.data.has(t+':'+r.id)) throw new Fault('IMMUTABLE_RECORD',403);
    if (t === 'participants' && (await this.list(t)).some(p=>p.id !== r.id && p.identityHash === r.identityHash)) throw new Fault('IDENTITY_DUPLICATE',409);
    if (t === 'transfers' && (await this.list(t)).some(p=>p.id !== r.id && p.runId === r.runId && p.participantId === r.participantId)) throw new Fault('DUPLICATE_REQUEST',409);
    const before=this.data.get(t+':'+r.id);this.data.set(t+':'+r.id,structuredClone(r));
    if(['participants','runs','disputes','cases','rosters'].includes(t)&&JSON.stringify(before)!==JSON.stringify(r)){const entry=row({principal:this.actor,action:t+'.'+(before?'updated':'created'),projectId:r.projectId,entityId:r.id,before:before??null,after:r});this.data.set('audit:'+entry.id,structuredClone(entry));}
    return structuredClone(r) as EntityMap[T];
  }
  async lock<T>(key: string, fn: (s: Store)=>Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve(); let release!: ()=>void;
    const next = new Promise<void>(r=>release=r); this.locks.set(key,next); await previous.catch(()=>{});
    try { return await fn(this); } finally { release(); if (this.locks.get(key) === next) this.locks.delete(key); }
  }
  async inside(projectId: string, point: [number,number]) {
    const p = await this.get('projects',projectId); const ring = p?.boundary?.coordinates?.[0] ?? []; let inside = false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++) { const [xi,yi]=ring[i], [xj,yj]=ring[j]; if((yi>point[1]) !== (yj>point[1]) && point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi) inside=!inside; }
    return inside;
  }
}
