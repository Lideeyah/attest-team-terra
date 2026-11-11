import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ensure, hash, canonical, Fault } from './core.js';

export interface Boundary {type:'Polygon'|'MultiPolygon';coordinates:[number,number][][]|[number,number][][][];}
export interface RegistrySource {url:string;sha256:string;retrievedAt:string;}
export interface RegistryRecord {registryId:string;name:string;country:string;methodology:string;boundary?:Boundary|null;issuances:Record<string,unknown>[];sources:RegistrySource[];registry:'Gold Standard'|'Plan Vivo'|'Acorn';boundaryStatus?:'available'|'upload_required';}
export function validateBoundary(value:unknown):Boundary {
 ensure(typeof value==='object'&&value!==null,'INVALID_BOUNDARY');const polygon=value as Record<string,unknown>;
 ensure(['Polygon','MultiPolygon'].includes(String(polygon.type))&&Array.isArray(polygon.coordinates)&&polygon.coordinates.length>0,'INVALID_BOUNDARY');
 const polygons=polygon.type==='Polygon'?[polygon.coordinates]:polygon.coordinates;
 ensure(polygons.length<=100,'INVALID_BOUNDARY');let total=0;
 for(const rings of polygons){ensure(Array.isArray(rings)&&rings.length>0&&rings.length<=100,'INVALID_BOUNDARY');
  for(const ring of rings){ensure(Array.isArray(ring)&&ring.length>=4,'INVALID_BOUNDARY');total+=ring.length;ensure(total<=20000,'INVALID_BOUNDARY');
   for(const point of ring)ensure(Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&Math.abs(point[0])<=180&&Math.abs(point[1])<=90,'INVALID_BOUNDARY');
   ensure(canonical(ring[0])===canonical(ring.at(-1)),'INVALID_BOUNDARY');
  }
 }
 return value as Boundary;
}
export function validateRegistry(value:unknown):RegistryRecord {
 ensure(typeof value==='object'&&value!==null,'INVALID_REQUEST');const r=value as Record<string,unknown>;
 for(const key of ['registryId','name','country','methodology'])ensure(typeof r[key]==='string'&&(r[key] as string).length>0&&(r[key] as string).length<=500,'INVALID_REQUEST');
 ensure(/^[a-zA-Z0-9_-]{1,100}$/.test(r.registryId as string),'INVALID_REQUEST');
 const registry=r.registry??'Gold Standard';ensure(['Gold Standard','Plan Vivo','Acorn'].includes(String(registry)),'INVALID_REQUEST');if(r.boundary)validateBoundary(r.boundary);
 ensure(Array.isArray(r.sources)&&r.sources.length>0&&r.sources.length<=10,'INVALID_REQUEST');
 for(const source of r.sources){ensure(typeof source==='object'&&source!==null,'INVALID_REQUEST');const s=source as Record<string,unknown>;ensure(typeof s.url==='string'&&typeof s.sha256==='string'&&/^[a-f0-9]{64}$/.test(s.sha256)&&typeof s.retrievedAt==='string'&&Number.isFinite(Date.parse(s.retrievedAt)),'INVALID_REQUEST');const u=new URL(s.url);ensure(u.protocol==='https:'&&!u.username&&!u.password,'INVALID_REQUEST');}
 ensure(Array.isArray(r.issuances)&&r.issuances.length<=10000,'INVALID_REQUEST');
 return {...r,registry,boundary:r.boundary?validateBoundary(r.boundary):null,boundaryStatus:r.boundary?'available':'upload_required'} as RegistryRecord;
}
// Reject DTDs, entity declarations and links before parsing uploaded XML.
export function parseBoundary(kml:string):Boundary {
 ensure(Buffer.byteLength(kml)<=2*1024*1024&&!/<!DOCTYPE|<!ENTITY|<\s*(?:\w+:)?NetworkLink\b/i.test(kml),'INVALID_BOUNDARY');
 ensure(XMLValidator.validate(kml)===true,'INVALID_BOUNDARY');
 const parsed:unknown=new XMLParser({removeNSPrefix:true,ignoreAttributes:true,parseTagValue:false,processEntities:false}).parse(kml);
 const polygons:[number,number][][][]=[];
 const object=(v:unknown):Record<string,unknown>=>{ensure(typeof v==='object'&&v!==null&&!Array.isArray(v),'INVALID_BOUNDARY');return v as Record<string,unknown>;};
 const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[v];
 const ring=(value:unknown):[number,number][]=>{
  const coordinates=object(object(value).LinearRing).coordinates;ensure(typeof coordinates==='string','INVALID_BOUNDARY');
  return coordinates.trim().split(/\s+/).map(tuple=>{const parts=tuple.split(',');ensure(parts.length===2||parts.length===3,'INVALID_BOUNDARY');ensure(parts.every(v=>v.trim().length>0&&Number.isFinite(Number(v))),'INVALID_BOUNDARY');return [Number(parts[0]),Number(parts[1])];});
 };
 const visit=(value:unknown,depth=0)=>{ensure(depth<=40,'INVALID_BOUNDARY');if(Array.isArray(value)){for(const child of value)visit(child,depth+1);return;}if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){
   if(key==='Polygon')for(const p of array(child)){const r=object(p);ensure(r.outerBoundaryIs,'INVALID_BOUNDARY');const rings=[ring(r.outerBoundaryIs)];if(r.innerBoundaryIs)rings.push(...array(r.innerBoundaryIs).map(ring));polygons.push(rings);}
   else visit(child,depth+1);
  }
 };
 ensure(parsed&&typeof parsed==='object'&&'kml'in parsed,'INVALID_BOUNDARY');visit(parsed);
 ensure(polygons.length>0,'INVALID_BOUNDARY');return validateBoundary(polygons.length===1?{type:'Polygon',coordinates:polygons[0]}:{type:'MultiPolygon',coordinates:polygons});
}
export function registryBoundary(record:RegistryRecord):Boundary {if(!record.boundary)throw new Fault('BOUNDARY_NOT_AVAILABLE',409);return record.boundary;}
export function registryDigest(record:RegistryRecord){return hash(canonical(record));}
// Offline preview uses a spherical approximation; production uses PostGIS geography.
export function boundaryAreaHectares(boundary:Boundary):number{
 validateBoundary(boundary);const polygons=(boundary.type==='Polygon'?[boundary.coordinates]:boundary.coordinates) as [number,number][][][];
 const radians=(v:number)=>v*Math.PI/180;
 const ringArea=(ring:[number,number][])=>{let sum=0;for(let i=1;i<ring.length;i++){let delta=radians(ring[i][0]-ring[i-1][0]);if(delta>Math.PI)delta-=2*Math.PI;if(delta< -Math.PI)delta+=2*Math.PI;sum+=delta*(2+Math.sin(radians(ring[i-1][1]))+Math.sin(radians(ring[i][1])));}return Math.abs(sum)*6371008.8**2/2;};
 const area=polygons.reduce((total,rings)=>total+ringArea(rings[0])-rings.slice(1).reduce((n,r)=>n+ringArea(r),0),0)/10000;
 ensure(Number.isFinite(area)&&area>0,'INVALID_BOUNDARY');return area;
}
