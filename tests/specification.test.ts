import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PDFParse} from 'pdf-parse';
import {MemoryStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {createApp} from '../src/app.js';
import {issueSession} from '../src/auth.js';
import {row,id,now,canonical,hash,verifyAttestationRecord} from '../src/core.js';
import {MockBank,type Bank,type BulkResult} from '../src/bank.js';
import {Providers} from '../src/providers.js';
import {reportingCadence} from '../src/period.js';
import {alignDemoFixture} from '../scripts/demo-direction.js';
import {benefitSharingReport} from '../src/reports.js';
import reference from '../data/plan-vivo-tgb.json' with {type:'json'};

process.env.IDENTITY_PEPPER='specification-test-pepper-at-least-32-characters';
const principal={id:'owner',role:'developer_admin' as const,organisationId:'org'};
const kml='<kml><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>31,0 31.01,0 31.01,0.01 31,0.01 31,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>';
async function auth(db:MemoryStore,who='owner',organisationId='org',role='developer_admin'){
 await db.put('users',row({id:who,email:who+'@example.test',organisationId,role,verified:true,passwordHash:'unused'}));
 return {authorization:'Bearer '+await issueSession(db,who),'idempotency-key':id()};
}
async function fixture(bank:Bank=new MockBank()){
 const db=new MemoryStore(),s=new Service(db,new Providers(db,bank)),p=await s.createProject(principal,'SYNTHETIC');
 const commitment=await db.put('commitments',row({projectId:p.id,percentage:60,basis:'gross',cadence:'annual',accepted:true,source_quote:'60% of gross revenue is allocated to participating farmers.',page:1}));
 await db.put('participants',row({id:'participant',projectId:p.id,name:'Synthetic Farmer',phone:'+2348000000001',identityHash:'synthetic',accountNumber:'8000000001',bankCode:'000014',kycLevel:2,flags:[],status:'active',noticeAttempted:true,noticeStatus:'sent'}));
 return {db,s,p,commitment};
}
async function closeFixture(){
 const f=await fixture();const run=await f.s.createRun(principal,f.p.id,{period:'2026',declaredGross:'100.00',fundingAmount:'60.00',sourceAccount:'0123456790'});await f.s.preflight(run);await f.s.execute(run.id);await f.db.put('runs',{...await f.s.required('runs',run.id),closesAt:new Date(Date.now()-1).toISOString()});const a=await f.s.close(run.id);assert(a);return {...f,run,a};
}

test('specified JSON boundary preview computes hectares, replays and binds uploads to their organisation',async()=>{
 const db=new MemoryStore(),s=new Service(db),app=await createApp(db,s),headers=await auth(db),other=await auth(db,'other','other-org');
 try{
  const req={method:'POST' as const,url:'/api/registry/boundary',headers,payload:{kml,name:'TGB demonstration boundary'}};
  const response=await app.inject(req);assert.equal(response.statusCode,200,response.body);const data=response.json().data;assert.equal(data.name,req.payload.name);assert.deepEqual(data.points[0],[31,0]);assert(data.areaHectares>120&&data.areaHectares<125);assert.equal(data.geometry.type,'Polygon');
  const replay=await app.inject(req);assert.deepEqual(replay.json().data,data);assert.equal(replay.headers['idempotent-replayed'],'true');
  assert.equal((await app.inject({...req,headers:{'idempotency-key':id()}})).statusCode,401);
  const denied=await app.inject({method:'POST',url:'/api/projects',headers:other,payload:{registryId:'SYNTHETIC',boundaryId:data.boundaryId}});assert.equal(denied.statusCode,403);
  const created=await app.inject({method:'POST',url:'/api/projects',headers:{...headers,'idempotency-key':id()},payload:{registryId:'SYNTHETIC',boundaryId:data.boundaryId}});assert.equal(created.statusCode,200,created.body);assert.deepEqual(created.json().data.boundary,data.geometry);
  const invalid=await app.inject({...req,headers:{...headers,'idempotency-key':id()},payload:{name:'bad',kml:'<!DOCTYPE kml><kml/>'}});assert.equal(invalid.statusCode,400);
 }finally{await app.close();}
});

test('specified report route negotiates signed JSON/PDF and protects organisation boundaries',async()=>{
 const {db,s,p,a}=await closeFixture(),app=await createApp(db,s),owner=await auth(db),other=await auth(db,'other','other-org'),verifier=await auth(db,'institution','institution','verifier');
 try{
  const url='/api/attestations/'+a.id+'/report';const json=await app.inject({url,headers:owner});assert.equal(json.statusCode,200,json.body);assert(verifyAttestationRecord(json.json().data.attestation));assert.equal(json.json().data.demonstration.isDemonstration,true);
  assert.equal((await app.inject({url,headers:other})).statusCode,403);assert.equal((await app.inject({url,headers:verifier})).statusCode,200);assert.equal((await app.inject({url})).statusCode,401);assert.equal((await app.inject({url:url+'?format=invalid',headers:owner})).statusCode,400);
  const pdf=await app.inject({url,headers:{...owner,accept:'application/pdf'}});assert.equal(pdf.statusCode,200);assert(pdf.rawPayload.subarray(0,5).equals(Buffer.from('%PDF-')));assert.equal(pdf.headers.vary,'Accept');
  const parser=new PDFParse({data:pdf.rawPayload});try{const text=(await parser.getText()).text;assert(text.includes('SYNTHETIC'));assert(text.includes(a.hash));}finally{await parser.destroy();}
  const exportResult=await app.inject({method:'POST',url:'/api/verifier/export',headers:verifier,payload:{projectId:p.id,period:a.period,format:'pdf'}});assert.equal(exportResult.statusCode,200,exportResult.body);assert(exportResult.json().data.downloads[0].url.endsWith('/report?format=pdf'));
  const csv=await app.inject({method:'POST',url:'/api/verifier/export',headers:{...verifier,'idempotency-key':id()},payload:{projectId:p.id,period:a.period,format:'csv'}});assert.equal(csv.statusCode,200);assert(csv.json().data.content.includes('demonstrationNotice'));assert(csv.json().data.content.includes('synthetic'));
 }finally{await app.close();}
});

test('staged report includes accurate source status, separate reporting cadence and a verifiable report signature',async()=>{
 const {db,s,p}=await fixture();await db.put('commitments',row({...reference.commitment,projectId:p.id,percentage:60,accepted:true}));
 const run=await s.createRun(principal,p.id,{period:'2026',declaredGross:'100.00',fundingAmount:'60.00',sourceAccount:'0123456790'});await s.preflight(run);await s.execute(run.id);await db.put('runs',{...await s.required('runs',run.id),closesAt:new Date(Date.now()-1).toISOString()});const a=await s.close(run.id);assert(a);
 const report=await benefitSharingReport(s,a.id);assert.equal(report.commitment.cadence,'staged');assert.equal(report.commitment.reportingCadence,'annual');assert.equal(report.commitment.sourceLocator,'J2.1');assert.equal(report.commitment.sourceAlignment,'edition_pending');assert.equal(report.commitment.specifiedSourceLocator,'A.13.1 / Table 5');
 const {reportHash,reportSignature,reportPublicKey,...payload}=report;assert.equal(hash(canonical(payload)),reportHash);assert(s.signer.verify(reportHash,reportSignature));assert(verifyAttestationRecord(report.attestation));
});

test('staged payments use an explicit reporting cadence and cannot bypass missing scheduling metadata',async()=>{
 const {db,s,p}=await fixture();const c=await db.put('commitments',row({projectId:p.id,percentage:60,basis:'gross',cadence:'staged',accepted:true,source_quote:'60% of gross revenue goes to farmers.',page:1}));
 await assert.rejects(s.createRun(principal,p.id,{period:'2026',declaredGross:'100.00',fundingAmount:'60.00',sourceAccount:'0123456790',closesAt:'2099-01-01T00:00:00Z'}),{code:'REPORTING_CADENCE_REQUIRED'});
 await db.put('commitments',row({...c,id:id(),reportingCadence:'annual',paymentSchedule:{type:'verification_milestones',description:'Staged against verified performance'}}));
 const run=await s.createRun(principal,p.id,{period:'2026',declaredGross:'100.00',fundingAmount:'60.00',sourceAccount:'0123456790'});assert.equal(run.closesAt,'2027-01-01T00:00:00.000Z');assert.equal(reportingCadence({cadence:'staged',reportingCadence:'quarterly'}),'quarterly');
});

test('demo fixture upgrade appends staged commitments while preserving signed historical evidence',async()=>{
 const {db,s,p,a,run}=await closeFixture();const original=await benefitSharingReport(s,a.id);await db.put('projects',{...p,registryId:reference.record.registryId});
 const draft=await s.createRun(principal,p.id,{period:'2027',declaredGross:'100.00',fundingAmount:'60.00',sourceAccount:'0123456790'});
 await alignDemoFixture(db,principal);await alignDemoFixture(db,principal);
 const commitments=await db.list('commitments',{projectId:p.id,accepted:true});assert.equal(commitments.length,2);assert.equal(commitments.at(-1)?.cadence,'staged');assert.equal(commitments.at(-1)?.reportingCadence,'annual');assert.equal(commitments.at(-1)?.sourceLocator,'J2.1');
 assert.equal((await s.required('runs',run.id)).commitmentId,run.commitmentId);assert.equal((await s.required('runs',draft.id)).commitmentId,commitments.at(-1)?.id);assert.equal((await s.required('attestations',a.id)).hash,a.hash);assert(verifyAttestationRecord(await s.required('attestations',a.id)));
 const report=await benefitSharingReport(s,a.id);assert.equal(report.commitment.sourceQuote,original.commitment.sourceQuote);assert.equal(report.commitment.cadence,'annual');
});

test('public demo metadata distinguishes source statistics from simulated payment counts and excludes private fields',async()=>{
 const {db,s,p}=await fixture();await db.put('projects',{...p,isDemonstration:true,referenceStatistics:{participants:51874,certificatesIssued:7518071,projectStartYear:2003,sourceUrl:'https://www.planvivo.org/projects/trees-for-global-benefits-uganda',retrievedAt:now(),phone:'private-phone',householdCoordinates:[31,0]}});
 const app=await createApp(db,s);try{for(const url of ['/api/public/register','/api/public/projects/'+p.id]){const response=await app.inject(url);assert.equal(response.statusCode,200);const data=url.endsWith('/register')?response.json().data[0]:response.json().data;assert.equal(data.isDemonstration,true);assert.equal(data.paymentData,'synthetic');assert(data.demonstrationNotice.includes('actual performance'));assert.equal(data.enrolled,1);assert.equal(data.referenceStatistics.participants,51874);assert(!response.body.includes('private-phone'));assert(!response.body.includes('householdCoordinates'));}}finally{await app.close();}
});

test('bank rejection messages are bounded and redacted, and remain private to operational transfer reads',async()=>{
 class RejectedBank extends MockBank{override async call<T=unknown>(...args:Parameters<Bank['call']>):Promise<T>{const result=await super.call<T>(...args);if(args[1]==='/transfers/bulk'){const batch=result as BulkResult;return {...batch,items:batch.items.map(t=>({...t,status:'rejected',error_code:'ACCOUNT_NOT_FOUND',message:'private-bank-note account 1234567890\n'+'.'.repeat(600)}))} as T;}return result;}}
 const {db,s,p}=await fixture(new RejectedBank());const run=await s.createRun(principal,p.id,{period:'2026',declaredGross:'100.00',fundingAmount:'60.00',sourceAccount:'0123456790'});await s.preflight(run);await s.execute(run.id);
 const t=(await db.list('transfers'))[0];assert.equal(t.failureClass,'ACCOUNT_NOT_FOUND');assert(t.failureMessage?.includes('[redacted]'));assert.equal(t.failureMessage?.length,500);assert(!t.failureMessage?.includes('1234567890'));
 const app=await createApp(db,s);try{const headers=await auth(db);const privateRead=await app.inject({url:'/api/runs/'+run.id+'/transfers',headers});assert(privateRead.body.includes('private-bank-note'));const publicRead=await app.inject('/api/public/projects/'+p.id);assert(!publicRead.body.includes('private-bank-note'));}finally{await app.close();}
});
