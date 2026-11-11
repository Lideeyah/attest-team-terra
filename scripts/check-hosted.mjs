// Read-only hosted walkthrough checks, except verification/export POSTs.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='https://attest-mc-johnsons-projects.vercel.app';
const {password}=JSON.parse(await readFile('backend/.local-state/hosted-settings.json','utf8'));
let checks=0;const pass=label=>{checks++;console.log('PASS '+label);};
async function login(email){
 const csrf=await fetch(base+'/auth/csrf',{signal:AbortSignal.timeout(60000)});assert.equal(csrf.status,200);
 const {csrfToken}=await csrf.json();let cookie=csrf.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
 const response=await fetch(base+'/auth/callback/credentials',{method:'POST',redirect:'manual',headers:{cookie,'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({email,password,csrfToken,callbackUrl:base+'/app'}),signal:AbortSignal.timeout(60000)});
 cookie+='; '+response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');return cookie;
}
async function api(path,cookie,body,status=200){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Accept:'application/json',...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
 const result=await response.json();assert.equal(response.status,status,`${path}: ${result.error?.code??response.status}`);return result;
}
await api('/api/auth/session',undefined,undefined,401);pass('anonymous private access refused');
const developer=await login('local@example.test'),verifier=await login('verifier@example.test');
assert.equal((await api('/api/auth/session',developer)).data.role,'developer_admin');
assert.equal((await api('/api/auth/session',verifier)).data.role,'verifier');pass('secure cookie login for developer and verifier');
const projects=(await api('/api/projects?per_page=100',developer)).data;assert(projects.length>=3);assert(projects.some(p=>p.name==='Synthetic clean project - Ikom'));pass('scoped projects include the hosted demo fixtures');
const register=(await api('/api/public/register')).data;
const historical=register.find(p=>p.isDemonstration&&p.attestations?.length===3);assert(historical);pass('synthetic public register and signed historical records');
const map=(await api(`/api/projects/${historical.id}/map`,developer)).data;assert(map.areaHectares>0&&map.capturePoints.length===60);
await api(`/api/projects/${historical.id}/map`,verifier,undefined,403);pass('PostGIS geometry, capture points and verifier access boundary');
const geography=(await api(`/api/public/projects/${historical.id}/geography`)).data;assert(geography.length&&geography.every(c=>c.count>=5));pass('suppressed public H3 distribution');
for(const path of ['/app','/app/map','/app/roster']){const response=await fetch(base+path,{headers:{cookie:developer},redirect:'manual',signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,path);assert(!(await response.text()).includes('Runtime Error'));}pass('authenticated dashboard, map and roster server rendering');
const attestation=historical.attestations[0],pdf=await fetch(`${base}/api/public/attestations/${attestation.id}/pdf`,{signal:AbortSignal.timeout(60000)});assert.equal(pdf.status,200);assert(pdf.headers.get('content-type')?.includes('application/pdf'));
const form=new FormData();form.append('file',new Blob([await pdf.arrayBuffer()],{type:'application/pdf'}),'signed-attestation.pdf');
const verified=await fetch(base+'/api/verify/attestation',{method:'POST',body:form,signal:AbortSignal.timeout(60000)});assert.equal(verified.status,200);assert.equal((await verified.json()).data.hash,attestation.hash);pass('signed PDF download and multipart verification');
const clean=projects.find(p=>p.name==='Synthetic clean project - Ikom');assert(clean);const runs=(await api(`/api/projects/${clean.id}/runs`,developer)).data;assert(runs.some(r=>r.state==='draft'));pass('clean draft ready for the user to execute');
const stream=await fetch(`${base}/api/runs/${runs[0].id}/stream`,{headers:{cookie:developer},signal:AbortSignal.timeout(30000)});assert.equal(stream.status,200);assert(stream.headers.get('content-type')?.includes('text/event-stream'));const reader=stream.body.getReader();assert(new TextDecoder().decode((await reader.read()).value).includes('connected'));await reader.cancel();pass('streaming connection through the hosted proxy');
console.log(`${checks} hosted checks passed. No payment execution submitted.`);
