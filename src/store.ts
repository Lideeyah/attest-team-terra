import pg from 'pg';
import { Fault, type Row } from './core.js';

export const tables = ['users','sessions','tokens','invites','projects','commitments','participants','agents','rosters','runs','transfers','confirmations','attestations','anchors','disputes','signals','cases','audit','jobs','receipts','events','idempotency','watchlist','alerts','notifications'] as const;
export type Table = typeof tables[number];
export interface Store {
  list(table: Table, where?: Record<string, any>): Promise<Row[]>;
  get(table: Table, id: string): Promise<Row | undefined>;
  put(table: Table, value: Row): Promise<Row>;
  lock<T>(key: string, work: (tx: Store) => Promise<T>): Promise<T>;
  inside(projectId: string, point: [number, number]): Promise<boolean>;
}
export class PgStore implements Store {
  constructor(public pool: pg.Pool, private client?: pg.PoolClient) {}
  private query(sql: string, args: any[] = []) { return (this.client ?? this.pool).query(sql, args); }
  async list(table: Table, where: Record<string, any> = {}) {
    const args: any[] = []; const clauses = Object.entries(where).map(([k,v]) => { args.push(k, JSON.stringify(v)); return `data -> $${args.length-1} = $${args.length}::jsonb`; });
    return (await this.query(`SELECT data FROM "${table}"${clauses.length ? ' WHERE '+clauses.join(' AND ') : ''} ORDER BY created_at, id LIMIT 10000`, args)).rows.map(r => r.data as Row);
  }
  async get(table: Table, id: string) { return (await this.query(`SELECT data FROM "${table}" WHERE id=$1`, [id])).rows[0]?.data as Row | undefined; }
  async put(table: Table, value: Row) {
    const append = ['attestations','audit','confirmations','events'].includes(table);
    try {
      await this.query(`INSERT INTO "${table}" (id,data) VALUES ($1,$2::jsonb) ${append ? '' : 'ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data'}`, [value.id, JSON.stringify(value)]);
      if (table === 'projects' && value.boundary) await this.query('UPDATE projects SET boundary=ST_SetSRID(ST_GeomFromGeoJSON($2),4326) WHERE id=$1', [value.id,JSON.stringify(value.boundary)]);
      if (table === 'participants' && value.point) await this.query('UPDATE participants SET location=ST_SetSRID(ST_MakePoint($2,$3),4326) WHERE id=$1',[value.id,...value.point]);
      return value;
    } catch (e: any) { if (e.code === '23505') throw new Fault('DUPLICATE_REQUEST',409); throw e; }
  }
  async lock<T>(key: string, work: (tx: Store) => Promise<T>): Promise<T> {
    if (this.client) {
      const savepoint='nested_'+Math.random().toString(36).slice(2);
      await this.query(`SAVEPOINT ${savepoint}`);
      try {await this.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);const result=await work(this);await this.query(`RELEASE SAVEPOINT ${savepoint}`);return result;}
      catch(e){await this.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);await this.query(`RELEASE SAVEPOINT ${savepoint}`);throw e;}
    }
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]); const result = await work(new PgStore(this.pool,client)); await client.query('COMMIT'); return result; }
    catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async inside(projectId: string, point: [number,number]) { return (await this.query('SELECT ST_Contains(boundary,ST_SetSRID(ST_MakePoint($2,$3),4326)) AS inside FROM projects WHERE id=$1',[projectId,...point])).rows[0]?.inside === true; }
}

// Test-only store. The production entry point always requires PostgreSQL.
export class MemoryStore implements Store {
  data = new Map<string,Row>(); private locks = new Map<string,Promise<any>>();
  async list(t: Table, where: Record<string,any> = {}) { return structuredClone([...this.data.entries()].filter(([k,v]) => k.startsWith(t+':') && Object.entries(where).every(([a,b]) => v[a] === b)).map(([,v])=>v)); }
  async get(t: Table, id: string) { return structuredClone(this.data.get(t+':'+id)); }
  async put(t: Table, r: Row) {
    if (['attestations','audit','confirmations','events'].includes(t) && this.data.has(t+':'+r.id)) throw new Fault('IMMUTABLE_RECORD',403);
    if (t === 'participants' && (await this.list(t)).some(p=>p.id !== r.id && p.identityHash === r.identityHash)) throw new Fault('IDENTITY_DUPLICATE',409);
    if (t === 'transfers' && (await this.list(t)).some(p=>p.id !== r.id && p.runId === r.runId && p.participantId === r.participantId)) throw new Fault('DUPLICATE_REQUEST',409);
    this.data.set(t+':'+r.id,structuredClone(r)); return structuredClone(r);
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
