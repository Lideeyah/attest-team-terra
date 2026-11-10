import { ensure, hash, canonical } from './core.js';

export interface Boundary {type:'Polygon';coordinates:[number,number][][];}
export interface RegistrySource {url:string;sha256:string;retrievedAt:string;}
export interface RegistryRecord {registryId:string;name:string;country:string;methodology:string;boundary:Boundary;issuances:Record<string,unknown>[];sources:RegistrySource[];registry:'Gold Standard';}
export function validateBoundary(value:unknown):Boundary {
 ensure(typeof value==='object'&&value!==null,'INVALID_REQUEST');const polygon=value as Record<string,unknown>;
 ensure(polygon.type==='Polygon'&&Array.isArray(polygon.coordinates)&&polygon.coordinates.length>0&&polygon.coordinates.length<=100,'INVALID_REQUEST');
 let total=0;
 for(const ring of polygon.coordinates){ensure(Array.isArray(ring)&&ring.length>=4,'INVALID_REQUEST');total+=ring.length;ensure(total<=20000,'INVALID_REQUEST');for(const point of ring)ensure(Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&Math.abs(point[0])<=180&&Math.abs(point[1])<=90,'INVALID_REQUEST');ensure(canonical(ring[0])===canonical(ring.at(-1)),'INVALID_REQUEST');}
 return value as Boundary;
}
export function validateRegistry(value:unknown):RegistryRecord {
 ensure(typeof value==='object'&&value!==null,'INVALID_REQUEST');const r=value as Record<string,unknown>;
 for(const key of ['registryId','name','country','methodology'])ensure(typeof r[key]==='string'&&(r[key] as string).length>0&&(r[key] as string).length<=500,'INVALID_REQUEST');
 ensure(/^[a-zA-Z0-9_-]{1,100}$/.test(r.registryId as string),'INVALID_REQUEST');validateBoundary(r.boundary);
 ensure(Array.isArray(r.sources)&&r.sources.length>0&&r.sources.length<=10,'INVALID_REQUEST');
 for(const source of r.sources){ensure(typeof source==='object'&&source!==null,'INVALID_REQUEST');const s=source as Record<string,unknown>;ensure(typeof s.url==='string'&&typeof s.sha256==='string'&&/^[a-f0-9]{64}$/.test(s.sha256)&&typeof s.retrievedAt==='string'&&Number.isFinite(Date.parse(s.retrievedAt)),'INVALID_REQUEST');const u=new URL(s.url);ensure(u.protocol==='https:'&&!u.username&&!u.password,'INVALID_REQUEST');}
 ensure(Array.isArray(r.issuances)&&r.issuances.length<=10000,'INVALID_REQUEST');
 return {...r,registry:'Gold Standard',boundary:validateBoundary(r.boundary)} as RegistryRecord;
}
export function registryDigest(record:RegistryRecord){return hash(canonical(record));}
