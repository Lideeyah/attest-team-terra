import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {PDFParse} from 'pdf-parse';
import {readFile} from 'node:fs/promises';
import {MemoryStore,PgStore} from '../src/store.js';
import {Service} from '../src/service.js';
import {MockBank,LiveBank,GatewayBudgetError,type Bank,type BulkResult,type BulkRequest} from '../src/bank.js';
import {Providers,extractionCandidates} from '../src/providers.js';
import {Fault,row,id,now,hash,canonical,verifyAttestationRecord} from '../src/core.js';
import {parseBoundary,validateRegistry} from '../src/registry.js';
import {createApp} from '../src/app.js';
import {issueSession} from '../src/auth.js';
import {benefitSharingReport} from '../src/reports.js';
import {benefitSharingPdf} from '../src/pdf.js';
import {openEmbedded} from '../scripts/embedded-db.js';
import {registerCarbon,submitMrv,listMrv,retireCredits,certificates} from '../src/carbon.js';
import {normalizeTariff,charges} from '../src/tariff.js';
import {normalizeTransfer,bankPayload} from '../src/bank.js';
import sandboxTariff from './fixtures/sandbox-tariff.json' with {type:'json'};
import sandboxTransfer from './fixtures/sandbox-transfer.json' with {type:'json'};
import {reseedBank,reseedManifest} from '../src/reseed.js';

process.env.IDENTITY_PEPPER='participant-contract-test-pepper-at-least-32';
const admin={id:'developer',role:'developer_admin' as const,organisationId:'org'};
async function fixture(count=1,bank:Bank=new MockBank()){
 const db=new MemoryStore(),s=new Service(db,new Providers(db,bank)),p=await s.createProject(admin,'SYNTHETIC');
 await db.put('commitments',row({id:'commitment',projectId:p.id,percentage:60,basis:'gross',cadence:'annual',accepted:true,source_quote:'60% of gross revenue goes to synthetic households.',page:7}));
 for(let i=0;i<count;i++)await db.put('participants',row({id:'p'+i,projectId:p.id,name:'Synthetic Household',phone:'+2348000000001',identityHash:'i'+i,flags:[],status:'active',accountNumber:'8'+String(i).padStart(9,'0'),bankCode:'000014',kycLevel:2,noticeAttempted:true,noticeStatus:'sent'}));
 const run=await s.createRun(admin,p.id,{period:'2026',declaredGross:'10000.00',fundingAmount:'6000.00',sourceAccount:'0123456790'});await s.preflight(run);return {db,s,p,run,bank};
}
function request(count:number):BulkRequest{return {source_account:'0123456790',batch_reference:'batch',auto_name_enquiry:true,items:Array.from({length:count},(_,i)=>({reference:'r'+i,destination_bank_code:'000014',destination_account:'8'+String(i).padStart(9,'0'),amount:'10.00'}))};}

test('captured live tariff and settlement shapes normalize without trusting bulk fee summaries',()=>{
 const tariff=normalizeTariff(sandboxTariff);assert.deepEqual(charges(tariff,'25000.00','000013'),{fee:'25.00',vat:'1.88',stamp_duty:'0.00'});assert.equal(charges(tariff,'3000.00','000014').fee,'0.00');
 const transfer=normalizeTransfer(sandboxTransfer);assert.equal(transfer.settled_at,sandboxTransfer.completed_at);assert.equal(transfer.fee,10);assert.equal(transfer.total_debit,20.75);
 const body=bankPayload(request(1)) as {items:{amount:number;destination_account:string}[]};assert.equal(body.items[0].amount,10);assert.equal(body.items[0].destination_account,'8000000000');
});

test('participant bulk limit, auto-enquiry and per-item name checking are enforced',async()=>{
 const bank=new MockBank();await assert.rejects(bank.call('POST','/transfers/bulk',request(201)),{code:'INVALID_REQUEST'});
 await assert.rejects(bank.call('POST','/transfers/bulk',{...request(1),auto_name_enquiry:false}),{code:'INVALID_REQUEST'});
 bank.setAccountName('8000000000','SYNTHETIC ADA HOUSEHOLD');const r=request(2);r.expected_names_check='loose';r.items[0].expected_name='Synthetic Household';bank.setAccountName(r.items[1].destination_account,'Other Holder');r.items[1].expected_name='Synthetic Household';
 const result=await bank.call<BulkResult>('POST','/transfers/bulk',r);assert.equal(result.accepted,1);assert.equal(result.rejected,1);assert.equal(result.items[1].error_code,'NAME_MISMATCH');
});

test('a timed-out batch is only queried while the next bounded batch still executes once',async()=>{
 class UncertainBank extends MockBank{posts=0;override async call<T=unknown>(...args:Parameters<Bank['call']>):Promise<T>{if(args[0]==='POST'&&args[1]==='/transfers/bulk'){this.posts++;const result=await super.call<T>(...args);if(this.posts===1)throw new Fault('TIMEOUT',504);return result;}return super.call<T>(...args);}}
 const bank=new UncertainBank(),{db,s,run}=await fixture(201,bank);
 await Promise.all([s.execute(run.id),s.execute(run.id)]);assert.equal(bank.posts,2);assert.deepEqual((await db.list('transfer_batches')).map(b=>b.request.items.length),[200,1]);
 const recovered=new Service(db,new Providers(db,bank));await recovered.requery(run.id);await recovered.execute(run.id);assert.equal(bank.posts,2);assert.equal((await db.list('transfers',{state:'settled'})).length,201);assert.equal((await s.required('runs',run.id)).state,'complete');
});

test('budget exhaustion defers an unsubmitted batch and resumes with its original key',async()=>{
 class BudgetBank extends MockBank{blocked=true;keys:string[]=[];override async call<T=unknown>(...args:Parameters<Bank['call']>):Promise<T>{if(args[0]==='POST'&&args[1]==='/transfers/bulk'){this.keys.push(String(args[3]));if(this.blocked)throw new GatewayBudgetError();}return super.call<T>(...args);}}
 const bank=new BudgetBank(),{db,s,run}=await fixture(1,bank);await s.execute(run.id);const batch=(await db.list('transfer_batches'))[0];assert.equal(batch.state,'pending');assert.equal(bank.bulkCalls,0);
 await db.put('transfer_batches',{...batch,nextAt:now()});bank.blocked=false;await s.requery(run.id);assert.equal(bank.bulkCalls,0,'requery cannot submit a payment');await s.execute(run.id);await s.requery(run.id);assert.equal(bank.bulkCalls,1);assert.equal(bank.keys[0],bank.keys[1]);assert.equal((await db.list('transfers'))[0].state,'settled');
});

test('mixed sparse bulk responses hydrate accepted settlements and record rejected items',async()=>{
 class SparseBank extends MockBank{override async call<T=unknown>(...args:Parameters<Bank['call']>):Promise<T>{const result=await super.call<T>(...args);if(args[1]==='/transfers/bulk'){const batch=result as BulkResult;return {...batch,items:batch.items.map(i=>({reference:i.reference,status:i.error_code?'rejected':i.status,error_code:i.error_code}))} as T;}return result;}}
 const bank=new SparseBank(),{db,s,run}=await fixture(2,bank);bank.setAccountState('8000000001','frozen');await s.execute(run.id);assert.equal((await db.list('transfers',{state:'settled'})).length,1);assert.equal((await db.list('transfers',{state:'failed'}))[0].failureClass,'BENEFICIARY_FROZEN');
});

test('a pending session ID never permits an underpaid settlement to count as paid',async()=>{
 const {db,s,run}=await fixture();await s.execute(run.id);const t=(await db.list('transfers'))[0];
 await db.put('transfers',{...t,state:'settling',sessionId:'existing-session'});
 await assert.rejects(s.applyTransfer(t.id,{status:'successful',amount:'1.00',session_id:'existing-session',settled_at:now(),fee:'0.00',vat:'0.00',stamp_duty:'0.00',total_debit:t.amount}),{code:'RECONCILIATION_MISMATCH'});assert.equal((await s.required('transfers',t.id)).state,'settling');
});

const kml=(coordinates:string)=>`<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></kml>`;
test('KML accepts multiparcel polygons with holes and rejects hostile XML and invalid coordinates',()=>{
 const polygon=parseBoundary(kml('7,5,0 8,5,0 8,6,0 7,6,0 7,5,0'));assert.equal(polygon.type,'Polygon');
 const multi=parseBoundary('<kml><MultiGeometry>'+kml('7,5 8,5 8,6 7,6 7,5').match(/<Polygon>.*<\/Polygon>/)![0]+kml('9,5 10,5 10,6 9,6 9,5').match(/<Polygon>.*<\/Polygon>/)![0]+'</MultiGeometry></kml>');assert.equal(multi.type,'MultiPolygon');
 for(const xml of ['<!DOCTYPE kml [<!ENTITY x SYSTEM "file:///private">]><kml/>','<kml><NetworkLink/></kml>',kml('181,5 8,5 8,6 181,5'),'<kml><Polygon></kml>',kml('7,5 8,5 8,6 7,6')])assert.throws(()=>parseBoundary(xml),{code:'INVALID_BOUNDARY'});
});

test('PostGIS persists KML multipolygons, excludes holes and rejects self-intersecting boundaries',async()=>{
 const {db,pool}=await openEmbedded();const store=new PgStore(pool);
 try{const boundary=parseBoundary(kml('7,5 8,5 8,6 7,6 7,5').replace('</Polygon>','<innerBoundaryIs><LinearRing><coordinates>7.2,5.2 7.4,5.2 7.4,5.4 7.2,5.4 7.2,5.2</coordinates></LinearRing></innerBoundaryIs></Polygon>'));
  const hectares=await store.boundaryArea(boundary);assert(hectares>1100000&&hectares<1300000);await store.put('projects',row({id:'polygon',boundary}));assert(await store.inside('polygon',[7.7,5.7]));assert(!await store.inside('polygon',[7.3,5.3]));assert(!await store.inside('polygon',[7,5]));
  await assert.rejects(store.put('projects',row({id:'invalid',boundary:parseBoundary(kml('7,5 8,6 8,5 7,6 7,5'))})),{code:'INVALID_BOUNDARY'});
  await assert.rejects(pool.query('INSERT INTO transfer_batches(id,data) VALUES($1,$2::jsonb)',['oversize',JSON.stringify({id:'oversize',request:request(201)})]));
 }finally{await db.close();}
});

test('Plan Vivo references can onboard without an available boundary',async()=>{
 const s=new Service(new MemoryStore());const project=await s.createProject(admin,'trees-for-global-benefits-uganda');assert.equal(project.registry,'Plan Vivo');assert.equal(project.boundary,null);assert.equal(project.boundaryStatus,'upload_required');assert.equal((await s.providers.getIssuances(project.registryId)).length,0);await assert.rejects(s.providers.getBoundary(project.registryId),{code:'BOUNDARY_NOT_AVAILABLE'});
});

test('boundary uploads and report downloads enforce organisation and verifier permissions',async()=>{
 const {db,s,p,run}=await fixture();
 const auth=async(userId:string,organisationId:string,role:string)=>{await db.put('users',row({id:userId,organisationId,role,email:userId+'@example.test',verified:true,passwordHash:'unused'}));return {authorization:'Bearer '+await issueSession(db,userId)};};
 const own=await auth(admin.id,'org','developer_admin'),other=await auth('other','other-org','developer_admin'),verifier=await auth('verifier','institution','verifier');
 await db.put('projects',{...p,boundary:null,boundaryStatus:'upload_required'});const app=await createApp(db,s);
 try{
  const missing=await app.inject({url:'/api/projects/'+p.id+'/boundary',headers:own});assert.equal(missing.statusCode,409);assert.equal(missing.json().error.code,'BOUNDARY_NOT_AVAILABLE');
  const boundary='kml-upload';const payload=Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="boundary.kml"\r\nContent-Type: application/vnd.google-earth.kml+xml\r\n\r\n${kml('7,5 8,5 8,6 7,6 7,5')}\r\n--${boundary}--\r\n`);
  const request={method:'POST' as const,url:'/api/projects/'+p.id+'/boundary',payload,headers:{...own,'content-type':'multipart/form-data; boundary='+boundary}};
  assert.equal((await app.inject({...request,headers:{...request.headers,...other}})).statusCode,403);
  const uploaded=await app.inject(request);assert.equal(uploaded.statusCode,200,uploaded.body);assert.equal(uploaded.json().data.boundaryStatus,'available');assert.equal((await db.list('registry_history')).length,1);
  await s.execute(run.id);await db.put('runs',{...await s.required('runs',run.id),closesAt:new Date(Date.now()-1).toISOString()});const a=await s.close(run.id);assert(a);
  const url='/api/attestations/'+a.id+'/benefit-sharing';assert.equal((await app.inject({url,headers:other})).statusCode,403);assert.equal((await app.inject({url,headers:verifier})).statusCode,200);assert.equal((await app.inject({url:url+'/pdf',headers:own})).statusCode,200);
 }finally{await app.close();}
});

test('PDD candidate ranking prioritizes the revenue share over unrelated percentage tables',async()=>{
 const pages=['Community benefits '.repeat(40)+'70% of trees survive.','The cash revenue gives the community at least 60% of the purchase price.'];
 assert.equal(extractionCandidates(pages)[0].page,2);const result=await new Providers(new MemoryStore()).extract(pages);assert.equal(result.percentage,60);assert.equal(result.page,2);assert(result.requiresReview);
});

test('benefit-sharing report signs closed facts, retains source quotation and excludes household data',async()=>{
 const {db,s,p,run}=await fixture();await s.execute(run.id);await db.put('runs',{...await s.required('runs',run.id),closesAt:new Date(Date.now()-1).toISOString()});const a=await s.close(run.id);assert(a);const report=await benefitSharingReport(s,a.id);assert.equal(report.coverage.percentage,100);assert.equal(report.commitment.page,7);assert(verifyAttestationRecord(report.attestation));assert(!canonical(report).includes('+234'));assert.equal(report.anchor.status,'pending');
 const parser=new PDFParse({data:await benefitSharingPdf(report)});try{const text=await parser.getText();assert(text.text.includes('BENEFIT-SHARING'));assert(text.text.includes(a.hash));assert(text.text.includes('SYNTHETIC'));}finally{await parser.destroy();}
});

test('the participant event envelope verifies and queues exactly once',async()=>{
 const {db,s}=await fixture();process.env.FORGE_WEBHOOK_SECRET='contract-webhook-secret';const app=await createApp(db,s);
 try{const body=JSON.stringify({event:'transfer.pending',event_id:'participant-envelope',data:{reference:'unknown'}}),timestamp=String(Math.floor(Date.now()/1000)),signature='sha256='+createHmac('sha256',process.env.FORGE_WEBHOOK_SECRET).update(timestamp+'.'+body).digest('hex');const req={method:'POST' as const,url:'/hooks/forge',headers:{'content-type':'application/json','x-forge-event':'transfer.pending','x-forge-timestamp':timestamp,'x-forge-signature':signature},payload:body};assert.equal((await app.inject(req)).statusCode,200);assert.equal((await app.inject(req)).statusCode,200);assert.equal((await db.list('jobs',{type:'forge-event'})).length,1);assert.equal((await db.list('jobs',{type:'forge-event'}))[0].data.type,'transfer.pending');}finally{await app.close();}
});

test('mock carbon chain uses participant IDs, verified MRV, paid retirement and certificate endpoints',async()=>{
 const {db,s,p,bank}=await fixture();const owner={name:'Synthetic Forest Co-operative',contact_name:'Synthetic Contact',phone:'+2348000000001',payout_account:'0123987006',bank_code:'000016'};
 const registered=await registerCarbon(s,admin,p.id,{type:'tree_planting',owner,location:{state:'Cross River',lga:'Ogoja',lat:6.6,lng:8.8}});assert.equal(typeof registered.project_id,'string');
 const submission=await submitMrv(s,admin,p.id,{period:{from:'2026-01-01',to:'2026-10-31'},metric:'trees_planted',value:10000,evidence_url:'https://example.test/synthetic-evidence'},'mrv');
 await bank.call('POST','/carbon/mrv/'+submission.submission_id+'/review',{decision:'verified'},'review');const mrv=(await listMrv(s,admin,p.id))[0] as Record<string,unknown>;assert.equal(mrv.status,'verified');
 await bank.call('POST','/payments/checkout',{reference:'purchase',merchant_id:'mer_900',amount:'10000.00'},'purchase');await bank.call('POST','/payments/purchase/simulate-transfer',{},'paid');
 const retired=await retireCredits(s,admin,p.id,{credit_batch_id:mrv.credit_batch_id,quantity:10,price_per_credit:'1000.00',currency:'NGN',payment_reference:'purchase',buyer:{name:'Synthetic Buyer',email:'buyer@example.test'},retirement_reason:'Synthetic demonstration'},'retire');assert.equal(retired.status,'retired');assert.equal((await certificates(s,admin,p.id)).length,1);assert.equal((await db.list('rosters')).filter(r=>r.openedBy==='carbon.credits.retired').length,1);
});

test('sandbox reseed includes a paid checkout and resumes without another payout',async()=>{
 const db=new MemoryStore(),bank=new MockBank(),steps=reseedManifest(JSON.parse(await readFile('docs/examples/sandbox-reseed.example.json','utf8')));
 await reseedBank(db,bank,steps,'contract-reseed');assert.equal(bank.bulkCalls,1);await reseedBank(db,bank,steps,'contract-reseed');assert.equal(bank.bulkCalls,1);assert((await db.get('tokens','forge-webhook-secret'))?.secret);
 await assert.rejects(reseedBank(db,bank,[{...steps[0],body:{amount:'200000.00'}},...steps.slice(1)],'contract-reseed'),{code:'DUPLICATE_REQUEST'});
});
