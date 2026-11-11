import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.js';
import { createApp } from '../src/app.js';
import { passwordHash } from '../src/auth.js';
import { row, hash } from '../src/core.js';
test('Auth.js credentials sign-in issues an encrypted cookie accepted by the API',async()=>{
 process.env.AUTH_SECRET='synthetic-auth-secret-with-at-least-thirty-two-characters';process.env.PUBLIC_URL='http://localhost:8080';
 const db=new MemoryStore(),email='authjs@example.test';await db.put('users',row({id:hash(email),email,passwordHash:passwordHash('synthetic-password-12345'),verified:true,role:'verifier',organisationId:'org'}));const app=await createApp(db);
 try{
 const csrf=await app.inject('/auth/csrf');assert.equal(csrf.statusCode,200,csrf.body);const cookies=csrf.cookies.map(c=>c.name+'='+c.value).join('; ');
 const result=await app.inject({method:'POST',url:'/auth/callback/credentials',headers:{'content-type':'application/x-www-form-urlencoded',cookie:cookies},payload:new URLSearchParams({email,password:'synthetic-password-12345',csrfToken:csrf.json().csrfToken,callbackUrl:'http://localhost:8080/'}).toString()});
 assert.equal(result.statusCode,302,result.body);const authCookie=result.cookies.filter(c=>c.name.startsWith('attest.session-token')).map(c=>c.name+'='+c.value).join('; ');assert(authCookie);
 const session=await app.inject({url:'/api/auth/session',headers:{cookie:authCookie}});assert.equal(session.statusCode,200,session.body);assert.equal(session.json().data.role,'verifier');
 const user=await db.get('users',hash(email));await db.put('users',{...user!,authVersion:1});assert.equal((await app.inject({url:'/api/auth/session',headers:{cookie:authCookie}})).statusCode,401);
 }finally{await app.close();}
});
