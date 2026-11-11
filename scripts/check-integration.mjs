/* Local-only acceptance checks. Credentials and cookies never leave this process. */
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.ATTEST_TEST_ORIGIN||'http://localhost:3001';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Only local synthetic integration tests are allowed.');
const settings=JSON.parse(await readFile('backend/.local-state/local-settings.json','utf8'));
let checks=0;
function pass(label){checks++;console.log('PASS '+label);}
async function login(email){
  const csrf=await fetch(base+'/auth/csrf'),{csrfToken}=await csrf.json();let cookie=csrf.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const response=await fetch(base+'/auth/callback/credentials',{method:'POST',redirect:'manual',headers:{cookie,'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({email,password:settings.password,csrfToken,callbackUrl:base+'/app'})});
  cookie+='; '+response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');return cookie;
}
async function api(path,cookie,body,options={}){
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Accept:'application/json',...(cookie?{cookie}:{}),...(body!==undefined?{'Content-Type':'application/json','Idempotency-Key':options.key??crypto.randomUUID()}: {})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const result=await response.json();assert.equal(response.status,options.status??200,`${path}: ${result.error?.code??response.status}`);return result;
}
const anonymous=await api('/api/auth/session',undefined,undefined,{status:401});assert.equal(anonymous.status,'error');pass('unauthenticated private reads are refused');
const developer=await login('local@example.test'),verifier=await login('verifier@example.test'),platform=await login('platform_admin@example.test');
for(const [cookie,role] of [[developer,'developer_admin'],[verifier,'verifier'],[platform,'platform_admin']]){assert.equal((await api('/api/auth/session',cookie)).data.role,role);}pass('cookie login and role identity through same-origin proxy');
const register=await api('/api/public/register');assert(register.data.length>=3);assert(register.data.every(p=>p.isDemonstration));pass('persistent synthetic register and demonstration disclosure');
const project=register.data.find(p=>p.attestations?.length);assert(project?.attestations[0].document.bankEvidence==='mock','Tests require explicitly mocked bank evidence.');
const geometry=await api(`/api/projects/${project.id}/map`,developer);assert(geometry.data.areaHectares>0);await api(`/api/projects/${project.id}/map`,verifier,undefined,{status:403});pass('private PostGIS boundary and denied verifier geometry access');
const geography=await api(`/api/public/projects/${project.id}/geography`);assert(geography.data.every(cell=>cell.count>=5));assert(!JSON.stringify(geography).includes('phone'));pass('public H3 suppression and no exact household data');
for(const path of ['/app',`/register/${project.id}`,'/app/map']){const response=await fetch(base+path,{headers:{cookie:developer},redirect:'manual',signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,path);const page=await response.text();assert(!page.includes('Runtime Error'));}pass('authenticated server-rendered dashboard, project and GIS page');
const attestation=project.attestations.at(-1),pdf=await fetch(`${base}/api/public/attestations/${attestation.id}/pdf`);assert.equal(pdf.status,200);assert(pdf.headers.get('content-type')?.includes('application/pdf'));const bytes=await pdf.arrayBuffer();
const form=new FormData();form.append('file',new Blob([bytes],{type:'application/pdf'}),'signed-attestation.pdf');const verified=await fetch(base+'/api/verify/attestation',{method:'POST',body:form});assert.equal(verified.status,200);assert.equal((await verified.json()).data.hash,attestation.hash);pass('signed PDF download and exact-artifact verification');
const report=await api(`/api/attestations/${attestation.id}/report`,verifier);assert.equal(report.data.coverage.enrolled,attestation.document.enrolledCount);assert(report.data.reportSignature);pass('signed benefit-sharing report and historical denominator');
const historicalRuns=await api(`/api/projects/${project.id}/runs?per_page=100`,developer),historicalRun=historicalRuns.data.find(r=>r.period===attestation.document.period);assert(historicalRun);
const historicalTransfers=await api(`/api/runs/${historicalRun.id}/transfers?per_page=100`,developer),settledTransfer=historicalTransfers.data.find(t=>t.state==='settled');assert(settledTransfer);
const disclosure=await api(`/api/attestations/${attestation.id}/disclosure`,developer,{transferId:settledTransfer.id});assert.equal((await api('/api/verify/disclosure',undefined,{bundle:disclosure.data})).data.valid,true);
await api('/api/verify/disclosure',undefined,{bundle:{...disclosure.data,leaf:{...disclosure.data.leaf,amount:'0.01'}}},{status:422});pass('selective disclosure round-trip and tampered leaf rejection');
const csv=await api('/api/verifier/export',verifier,{projectId:project.id,period:attestation.document.period,format:'csv'});assert(csv.data.content.includes('demonstrationNotice'));pass('verifier export preserves synthetic provenance');
const clean=register.data.find(p=>p.name==='Synthetic clean project - Ikom');if(clean){const runs=await api(`/api/projects/${clean.id}/runs`,developer),run=runs.data.find(r=>r.state==='draft')??runs.data.at(-1);assert(run);if(run.state==='draft'){
  const preflight=await api(`/api/runs/${run.id}/preflight`,developer,{exclusions:[]});assert(preflight.data.passed,'Clean fixture should pass preflight');
  const key=crypto.randomUUID(),execution=await api(`/api/runs/${run.id}/execute`,developer,{}, {key});const replay=await api(`/api/runs/${run.id}/execute`,developer,{}, {key});assert.equal(replay.data.jobId,execution.data.jobId);pass('preflight and execute idempotency without duplicate submission');
  let complete=false;for(let attempt=0;attempt<18;attempt++){await new Promise(r=>setTimeout(r,3000));const current=await api(`/api/runs/${run.id}`,developer);if(['complete','partially_complete'].includes(current.data.state)){complete=true;break;}}
  assert(complete,'Run did not reach a final state in the acceptance window; inspect the job rather than resending.');
  const transfers=await api(`/api/runs/${run.id}/transfers`,developer);assert(transfers.data.length>0);assert(transfers.data.every(t=>typeof t.amount==='string'&&typeof t.totalDebit==='string'));pass('worker execution and durable transfer outcomes');
}else pass('existing executed clean fixture retained; no replacement payment was submitted');
const stream=await fetch(`${base}/api/runs/${run.id}/stream`,{headers:{cookie:developer},signal:AbortSignal.timeout(30000)});assert.equal(stream.status,200);assert(stream.headers.get('content-type')?.includes('text/event-stream'));const reader=stream.body.getReader();let frames='';while(!frames.includes('data:')){const next=await reader.read();assert(!next.done,'Stream ended before a snapshot');frames+=new TextDecoder().decode(next.value);}await reader.cancel();pass('SSE snapshot streamed through frontend proxy');}
await api('/api/ops/capabilities',platform);await api(`/api/admin/chain/${project.id}`,platform);pass('operations capabilities and platform chain inspection');
console.log(`${checks} local integration checks passed. External providers remain mocked.`);
