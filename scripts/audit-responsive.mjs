import {chromium} from '@playwright/test';
import {globSync,readFileSync,writeFileSync} from 'node:fs';
const origin=process.env.ATTEST_AUDIT_ORIGIN??'http://localhost:3001';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use an isolated local preview for the audit.');
const {password}=JSON.parse(readFileSync('backend/.local-state/local-settings.json','utf8'));
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
const widths=[320,390,768,1024,1440,1920],results=[];
const roles={developer:'local@example.test',verifier:'verifier@example.test',ops:'bank_ops@example.test',admin:'platform_admin@example.test',field:process.env.ATTEST_AUDIT_FIELD_EMAIL??'responsive-agent@example.test'};
const contexts={public:await browser.newContext()};
async function login(email){const context=await browser.newContext();const csrf=await context.request.get(origin+'/auth/csrf');const {csrfToken}=await csrf.json();await context.request.post(origin+'/auth/callback/credentials',{form:{email,password,csrfToken,callbackUrl:origin+'/app'},headers:{'X-Auth-Return-Redirect':'1'}});return context;}
try{
 for(const [role,email]of Object.entries(roles)){contexts[role]=await login(email);const response=await contexts[role].request.get(origin+'/api/auth/session');if(!response.ok())throw Error('Activate the local '+role+' audit account before running its workspace checks.');}
 const projects=(await(await contexts.developer.request.get(origin+'/api/projects?per_page=100')).json()).data;
 const project=projects[0],detail=(await(await contexts.developer.request.get(origin+'/api/projects/'+project.id)).json()).data;
 const participants=(await(await contexts.developer.request.get(origin+'/api/projects/'+project.id+'/participants?per_page=1')).json()).data;
 const agents=(await(await contexts.developer.request.get(origin+'/api/projects/'+project.id+'/agents?per_page=1')).json()).data;
 const signals=(await(await contexts.ops.request.get(origin+'/api/ops/signals?per_page=1')).json()).data;
 let examples={};try{examples=JSON.parse(readFileSync(process.env.ATTEST_AUDIT_RECORDS??'backend/.local-state/responsive-records.json','utf8'));}catch{/* Optional examples must be prepared through the supported API. */}
 const ids={projectId:project.id,attestationId:detail.attestations[0].id,runId:detail.runs[0].id,participantId:participants[0].id,id:participants[0].id,agentId:agents[0].id,developerId:project.organisationId,signalId:signals?.[0]?.id,...examples};
 let pages=globSync('app/**/page.tsx').map(file=>'/'+file.replaceAll('\\','/').replace(/^app\//,'').replace(/\([^/]+\)\//g,'').replace(/\/?page\.tsx$/,'')).filter(path=>path!=='/dev'&&!path.startsWith('/dev/'));
 if(process.env.ATTEST_AUDIT_FILTER)pages=pages.filter(path=>new RegExp(process.env.ATTEST_AUDIT_FILTER).test(path));
 for(const raw of pages){
  const role=raw.startsWith('/field')?'field':raw.startsWith('/app')||raw.startsWith('/onboarding/developer')?'developer':raw.startsWith('/verifier')||raw.startsWith('/onboarding/institution')?'verifier':raw.startsWith('/ops')?'ops':raw.startsWith('/admin')?'admin':'public';
  if([...raw.matchAll(/\[([^\]]+)\]/g)].some(match=>!ids[match[1]])){console.log('SKIPPED '+raw+': prepare a valid scoped record first');continue;}
  const route=raw.replace(/\[([^\]]+)\]/g,(_,key)=>raw.startsWith('/field/enrolment/')&&key==='id'?examples.fieldId??ids[key]:ids[key]);
  const page=await contexts[role].newPage();
  try{
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.setViewportSize({width:1440,height:1000});
   const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('h1').first().waitFor({timeout:15000}).catch(()=>{});
   if(role==='field'&&!raw.startsWith('/field/enrolment/'))await page.getByText(roles.field,{exact:true}).first().waitFor({timeout:60000});
   await page.evaluate(async()=>{await document.fonts.ready;});
   for(const width of widths){
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(150);
    const layout=await page.evaluate(()=>{const w=document.documentElement.clientWidth;return {overflow:document.documentElement.scrollWidth-w,offenders:[...document.querySelectorAll('body *')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.position!=='fixed'&&r.width>0&&(r.right>w+2||r.left< -2)&&!el.closest('.table-scroll,.table-wrap,.compare-scroll,.leaflet-container,.virtual-roster');}).slice(0,8).map(el=>({tag:el.tagName,class:el.className,text:el.textContent?.slice(0,65)}))};});
    results.push({route,role,width,status:response?.status(),url:new URL(page.url()).pathname,...layout});
    if(layout.overflow>2)console.log('OVERFLOW '+route+' @ '+width+': '+layout.overflow+'px '+JSON.stringify(layout.offenders.slice(0,3)));
   }
   console.log('AUDITED '+route+' ['+response?.status()+']');
  }catch(error){results.push({route,role,error:error.message});console.log('ERROR '+route+' '+error.message.slice(0,100));}finally{await page.close();writeFileSync(process.env.ATTEST_AUDIT_REPORT??'backend/.local-state/responsive-audit.json',JSON.stringify(results,null,2));}
 }
}finally{await browser.close();}
console.log('Audit complete: '+results.length+' viewport checks.');
