import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.ATTEST_AUDIT_ORIGIN??'https://attest-mc-johnsons-projects.vercel.app';
if(!['https://attest-mc-johnsons-projects.vercel.app','http://localhost:3001'].includes(base))throw Error('Unrecognised destination');
const local=base.startsWith('http://localhost');
const {password}=JSON.parse(await readFile(local?'backend/.local-state/local-settings.json':'backend/.local-state/hosted-settings.json','utf8'));
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const {csrfToken}=await (await context.request.get(base+'/auth/csrf')).json();await context.request.post(base+'/auth/callback/credentials',{form:{email:'local@example.test',password,csrfToken,callbackUrl:base+'/app'},headers:{'X-Auth-Return-Redirect':'1'}});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const reply=(route,data)=>route.fulfill({json:{status:'success',data,meta:null,request_id:'ui-check'}});
 let creations=0;
 await page.route('**/api/projects/lookup',async route=>{await new Promise(r=>setTimeout(r,500));await reply(route,{name:'UI test project',country:'Uganda',methodology:'Agroforestry',boundaryStatus:'available'});});
 await page.route('**/api/projects',async route=>{if(route.request().method()==='POST'){creations++;await reply(route,{id:'ui-preview-only'});}else await route.continue();});
 await page.goto(base+'/onboarding/developer/project',{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByRole('button',{name:'Look up project',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Working'}).waitFor();
 await page.getByRole('button',{name:'Continue: create project',exact:true}).click();
 await page.getByText('Step 2 of 3',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Back',exact:true}).click();
 assert.equal(await page.getByRole('textbox',{name:'Registry project ID'}).inputValue(),'trees-for-global-benefits-uganda');
 assert(await page.getByRole('button',{name:'Project created',exact:true}).isDisabled());
 await page.getByRole('button',{name:'Continue to document',exact:true}).click();
 assert.equal(creations,1);
 assert(await page.getByRole('button',{name:/Review commitment/}).isDisabled());
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'C:/Users/HomePC/.codex/visualizations/2026/11/10/01a1c7bb-ed92-7403-b2d3-7cfa6fdf6515/attest-polished-onboarding.png'});
 console.log('PASS delayed request feedback, onboarding Back/Continue preserves values, prevents duplicate creation, locks review until ready, and fits four widths (requests mocked; no project was created)');
 await page.unrouteAll({behavior:'wait'});
}finally{await browser.close();}

