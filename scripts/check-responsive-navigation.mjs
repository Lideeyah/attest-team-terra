import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const base=process.env.ATTEST_AUDIT_ORIGIN??'http://localhost:3001';
const local=['localhost','127.0.0.1'].includes(new URL(base).hostname);
if(!local&&base!=='https://attest-mc-johnsons-projects.vercel.app')throw Error('Unrecognised test destination');
const {password}=JSON.parse(await readFile(local?'backend/.local-state/local-settings.json':'backend/.local-state/hosted-settings.json','utf8'));
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
const output='C:/Users/HomePC/.codex/visualizations/2026/11/10/01a1c7bb-ed92-7403-b2d3-7cfa6fdf6515';await mkdir(output,{recursive:true});
async function login(email){const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const c=await context.request.get(base+'/auth/csrf'),{csrfToken}=await c.json();await context.request.post(base+'/auth/callback/credentials',{form:{email,password,csrfToken,callbackUrl:base+'/app'},headers:{'X-Auth-Return-Redirect':'1'}});return context;}
try{
 const developer=await login('local@example.test'),page=await developer.newPage();page.setDefaultNavigationTimeout(90000);page.setDefaultTimeout(60000);await page.goto(base+'/app',{waitUntil:'domcontentloaded'});await page.getByRole('combobox',{name:'Project',exact:true}).locator('option').first().waitFor({state:'attached'});
 const menu=page.getByRole('button',{name:/Menu ·/}),map=page.getByRole('link',{name:'Project map',exact:true});
 assert(await menu.isVisible());assert(!await map.isVisible());await menu.click();assert(await map.isVisible());
 await page.keyboard.press('Escape');assert(!await map.isVisible());assert(await menu.evaluate(el=>el===document.activeElement));
 await menu.click();await page.screenshot({path:output+'/attest-responsive-mobile-menu.png'});await map.click();await page.waitForURL('**/app/map');assert(!await map.isVisible());
 console.log('PASS phone menu opens, Escape closes and restores focus, navigation closes the menu');
 await page.setViewportSize({width:1440,height:1000});assert(!await menu.isVisible());assert(await map.isVisible());console.log('PASS desktop sidebar remains visible');
 await page.setViewportSize({width:844,height:390});assert(await menu.isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);console.log('PASS landscape workspace fits without document scrolling');
 const verifier=await login('verifier@example.test'),review=await verifier.newPage();review.setDefaultNavigationTimeout(90000);await review.goto(base+'/verifier/compare',{waitUntil:'domcontentloaded'});const verifierMenu=review.getByRole('button',{name:/Menu ·/});await verifierMenu.waitFor();await review.waitForTimeout(500);await verifierMenu.click();assert(await review.getByRole('link',{name:'Export',exact:true}).isVisible());await review.keyboard.press('Escape');assert(!await review.getByRole('link',{name:'Export',exact:true}).isVisible());console.log('PASS verifier navigation has the same phone keyboard behaviour');
 const publicPage=await browser.newPage({viewport:{width:320,height:700},reducedMotion:'reduce'});await publicPage.goto(base+'/register',{waitUntil:'domcontentloaded',timeout:90000});assert.equal(await publicPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await publicPage.screenshot({path:output+'/attest-responsive-register-320.png'});console.log('PASS public register fits the narrow phone viewport');
}finally{await browser.close();}
