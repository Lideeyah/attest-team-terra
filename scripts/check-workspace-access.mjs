import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.ATTEST_TEST_ORIGIN??'http://localhost:3001';
const local=['localhost','127.0.0.1'].includes(new URL(base).hostname);
if(!local&&base!=='https://attest-mc-johnsons-projects.vercel.app')throw Error('Unrecognised test destination');
async function redirectLocation(response,path){
 if(response.status===307)return new URL(response.headers.get('location'),base);
 assert.equal(response.status,200,path);
 const body=await response.text(),match=body.match(/<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=([^"]+)"/);
 assert(match&&body.includes('NEXT_REDIRECT'),`Expected a streamed redirect for ${path}`);
 return new URL(match[1].replaceAll('&amp;','&'),base);
}
const privatePages=['/app','/app/roster?flagged=true','/app/runs/new','/field','/field/enrol','/field/queue','/field/me','/verifier','/verifier/compare','/ops/cases','/admin/registry','/onboarding/developer/project','/onboarding/institution/watchlist'];
for(const path of privatePages){
 const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(30000)});
 const location=await redirectLocation(response,path);
 assert.equal(location.pathname,'/signin',path);assert.equal(location.searchParams.get('next'),path,path);
}
console.log('PASS signed-out redirects preserve all 13 requested workspace destinations');
for(const path of ['/field','/onboarding/developer/project','/admin']){
 const response=await fetch(base+path,{headers:{cookie:'attest.session-token=invalid'},redirect:'manual',signal:AbortSignal.timeout(30000)});
 assert.equal((await redirectLocation(response,path)).pathname,'/signin');
}
console.log('PASS invalid cookies do not bypass server session validation');
for(const path of ['/register','/verify','/signin','/field/manifest.webmanifest']){const response=await fetch(base+path,{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,path);assert.equal(new URL(response.url).pathname,path);}
console.log('PASS public records, verification, login and PWA metadata stay accessible');
const {password}=JSON.parse(await readFile(local?'backend/.local-state/local-settings.json':'backend/.local-state/hosted-settings.json','utf8'));
async function loginAs(email){const csrf=await fetch(base+'/auth/csrf'),{csrfToken}=await csrf.json();let cookie=csrf.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');const auth=await fetch(base+'/auth/callback/credentials',{method:'POST',redirect:'manual',headers:{cookie,'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({email,password,csrfToken,callbackUrl:base+'/app'})});return cookie+'; '+auth.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');}
const cookie=await loginAs('local@example.test');
for(const path of ['/field','/admin','/ops','/verifier']){const response=await fetch(base+path,{headers:{cookie},redirect:'manual',signal:AbortSignal.timeout(60000)});assert.equal((await redirectLocation(response,path)).pathname,'/app');}
console.log('PASS authenticated users cannot open another role’s workspace');
if(local){
 const examples=JSON.parse(await readFile('backend/.local-state/responsive-records.json','utf8')),agent=await loginAs('responsive-agent@example.test');
 const own=await fetch(base+'/field/enrolment/'+examples.fieldId,{headers:{cookie:agent},signal:AbortSignal.timeout(60000)});assert.equal(own.status,200);assert((await own.text()).includes('Synthetic Responsive Household'));
 const projects=(await(await fetch(base+'/api/projects',{headers:{cookie}})).json()).data,participants=(await(await fetch(base+`/api/projects/${projects[0].id}/participants?per_page=1`,{headers:{cookie}})).json()).data;
 const other=await fetch(base+'/field/enrolment/'+participants[0].id,{headers:{cookie:agent},signal:AbortSignal.timeout(60000)});assert.equal(other.status,200);assert((await other.text()).includes('Enrolment unavailable'));
 console.log('PASS field records show own captures and refuse another agent’s household');
}
