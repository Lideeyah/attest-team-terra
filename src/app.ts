import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import multipart from '@fastify/multipart';
import { PDFParse } from 'pdf-parse';
import { createPublicKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Fault, ensure, row, id, now, hash, canonical, maskPhone, verifyWebhook, verifyProof, verifyAttestationRecord, type Principal, type Row } from './core.js';
import { passwordHash, passwordValid, session, issueSession } from './auth.js';
import { authHandler } from './authjs.js';
import { Service } from './service.js';
import type { Store } from './store.js';
import { attestationPdf } from './pdf.js';

type Context={s:Service;p:Principal;b:any;q:any;params:any;req:FastifyRequest;reply:FastifyReply};
export async function createApp(db: Store, suppliedService?: Service) {
  const app=Fastify({logger:false,bodyLimit:2*1024*1024,trustProxy:process.env.TRUST_PROXY?process.env.TRUST_PROXY.split(','):false});const root=suppliedService??new Service(db);
  const publicCache=new Map<string,{expires:number;value:any}>();
  await app.register(multipart,{limits:{fileSize:10*1024*1024,files:1,fields:5}});
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json',{parseAs:'string'},(req,body,done)=>{
    (req as any).rawBody=body;try{done(null,JSON.parse(body as string));}catch{done(new Fault('INVALID_REQUEST'),undefined);}
  });
  app.addContentTypeParser('application/x-www-form-urlencoded',{parseAs:'string'},(_req,body,done)=>done(null,Object.fromEntries(new URLSearchParams(body as string))));
  const rates=new Map<string,{at:number;n:number}>();
  app.addHook('onRequest',async(req)=>{
    if(req.url==='/healthz')return;
    const key=req.ip;const minute=Math.floor(Date.now()/60_000);const bucket=rates.get(key);const n=bucket?.at===minute?bucket.n+1:1; rates.set(key,{at:minute,n});
    if(rates.size>10000)for(const[k,v]of rates)if(v.at!==minute)rates.delete(k);
    ensure(n<=120,'RATE_LIMITED',429);
  });
  app.addHook('onSend',async(req,reply,payload)=>{reply.header('Referrer-Policy','no-referrer');reply.header('X-Content-Type-Options','nosniff');if(!req.url.startsWith('/api/public/'))reply.header('Cache-Control','no-store');return payload;});
  app.setErrorHandler((err:any,req,reply)=>{const e=err instanceof Fault?err:new Fault(err.statusCode===413?'INVALID_REQUEST':'INTERNAL_ERROR',err.statusCode??500);reply.code(e.status).send({status:'error',error:{code:e.code,message:e.message,field:e.field,remediation:null},request_id:req.id});});
  app.setNotFoundHandler((req,reply)=>reply.code(404).send({status:'error',error:{code:'NOT_FOUND',message:'NOT_FOUND',field:null,remediation:null},request_id:req.id}));
  const ok=(req:FastifyRequest,data:any,meta:any=null)=>({status:'success',message:'OK',data,meta,request_id:req.id});
  const list=(c:Context,values:any[])=>{
    const page=Number(c.q.page??1),per_page=Number(c.q.per_page??20);ensure(Number.isInteger(page)&&page>=1&&Number.isInteger(per_page)&&per_page>=1&&per_page<=100,'INVALID_REQUEST');
    return ok(c.req,values.slice((page-1)*per_page,page*per_page),{page,per_page,total:values.length,total_pages:Math.ceil(values.length/per_page)});
  };
  const route=(method:string,url:string,fn:(c:Context)=>Promise<any>,roles?:string[],publicRoute=false)=>{
    app.route({method:method as any,url,handler:async(req,reply)=>{
      const p=publicRoute?({id:'anonymous',role:'verifier',organisationId:''} as Principal):await session(db,req.headers.authorization,req.headers.cookie);
      if(roles)ensure(roles.includes(p.role),'FORBIDDEN',403);
      const context=(s:Service):Context=>({s,p,b:req.body??{},q:req.query??{},params:req.params??{},req,reply});
      const invoke=async(s:Service)=>{
        const cacheable=method==='GET'&&url.startsWith('/api/public/');const cached=cacheable?publicCache.get(req.url):null;
        if(cached&&cached.expires>Date.now())return {...cached.value,request_id:req.id};
        const data=await fn(context(s));const response=data?.status==='success'?data:ok(req,data);
        if(cacheable){if(publicCache.size>=500)publicCache.delete(publicCache.keys().next().value!);publicCache.set(req.url,{expires:Date.now()+15_000,value:response});}
        else if(method!=='GET')publicCache.clear();
        return response;
      };
      if(['GET','HEAD'].includes(method)||req.isMultipart()||url.startsWith('/api/webhooks')||url==='/hooks/forge')return invoke(root);
      const key=req.headers['idempotency-key'];ensure(typeof key==='string'&&key.length>=8&&key.length<=200,'INVALID_REQUEST');
      const requestHash=hash(canonical({method,url:req.url,body:req.body??null}));const recordId=hash(p.id+':'+key);
      return db.lock('request:'+recordId,async tx=>{
        const existing=await tx.get('idempotency',recordId);
        if(existing){ensure(existing.requestHash===requestHash,'DUPLICATE_REQUEST',409);reply.header('Idempotent-Replayed','true');return existing.response;}
        const scoped=new Service(tx,root.providers);scoped.signer=root.signer;scoped.events=root.events;
        const response=await invoke(scoped);await tx.put('idempotency',row({id:recordId,requestHash,response}));return response;
      });
    }});
  };
  app.get('/healthz',async()=>({status:'ok'}));app.get('/',async()=>({name:'Attest',health:'/healthz'}));
  app.route({method:['GET','POST'],url:'/auth/*',handler:async(req,reply)=>{
    const origin=process.env.PUBLIC_URL??'http://localhost:8080';const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(typeof v==='string'&&!['host','content-length'].includes(k))headers.set(k,v);
    const contentType=String(req.headers['content-type']??'');
    const body=req.method==='POST'?(contentType.includes('application/x-www-form-urlencoded')?new URLSearchParams(req.body as Record<string,string>).toString():JSON.stringify(req.body)):undefined;
    const response=await authHandler(db,new Request(new URL(req.url,origin),{method:req.method,headers,body}));
    reply.code(response.status);for(const[k,v]of response.headers)if(k!=='set-cookie')reply.header(k,v);const cookies=response.headers.getSetCookie();if(cookies.length)reply.header('set-cookie',cookies);return reply.send(await response.text());
  }});
  const dev=['developer_admin','developer_operator'];const ops=['bank_ops','platform_admin'];
  app.get('/ops',async(req,reply)=>{
    let p:Principal;try{p=await session(db,req.headers.authorization,req.headers.cookie);}catch{return reply.redirect('/auth/signin?callbackUrl=%2Fops');}
    ensure(ops.includes(p.role),'FORBIDDEN',403);reply.header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'");
    return reply.type('text/html').send(await readFile('public/ops.html','utf8'));
  });
  app.get('/receipt/:token',async(req,reply)=>{await root.receipt((req.params as any).token);return reply.type('text/html').send(await readFile('public/receipt.html','utf8'));});
  route('POST','/api/auth/signup',async c=>{
    ensure(typeof c.b.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.b.email)&&typeof c.b.organisation==='string','INVALID_REQUEST');
    ensure(!c.b.role||c.b.role==='developer_admin','FORBIDDEN',403);
    const email=c.b.email.toLowerCase();const uid=hash(email);ensure(!await c.s.db.get('users',uid),'DUPLICATE_REQUEST',409);
    const u=await c.s.db.put('users',row({id:uid,email,passwordHash:passwordHash(c.b.password),organisationId:id(),organisation:c.b.organisation,role:'developer_admin',verified:false}));
    // Provision verification via the operator command until an email provider is configured.
    await c.s.authEmail(u,'verify');await c.s.audit(u.id,'auth.verification_required');return {id:u.id,verificationRequired:true};
  },undefined,true);
  route('POST','/api/auth/signin',async c=>{
    const user=await c.s.db.get('users',hash(String(c.b.email).toLowerCase()));ensure(user&&passwordValid(c.b.password,user.passwordHash)&&user.verified,'UNAUTHORIZED',401);
    return {token:await issueSession(c.s.db,user.id),expiresIn:28800};
  },undefined,true);
  route('GET','/api/auth/session',async c=>c.p);
  route('POST','/api/auth/verify-email',async c=>{const t=await c.s.required('tokens',hash(c.b.token??''));ensure(t.type==='verify'&&!t.used&&Date.parse(t.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);const u=await c.s.required('users',t.userId);await c.s.db.put('users',{...u,verified:true});await c.s.db.put('tokens',{...t,used:true});return {verified:true};},undefined,true);
  route('POST','/api/auth/reset/request',async c=>{const emailHash=hash(String(c.b.email).toLowerCase());const u=await c.s.db.get('users',emailHash);if(u)await c.s.authEmail(u,'reset');await c.s.audit('anonymous','auth.reset_requested',undefined,{emailHash});return {accepted:true};},undefined,true);
  route('POST','/api/auth/reset/confirm',async c=>{const t=await c.s.required('tokens',hash(c.b.token??''));ensure(t.type==='reset'&&!t.used&&Date.parse(t.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);const u=await c.s.required('users',t.userId);await c.s.db.put('users',{...u,passwordHash:passwordHash(c.b.password),authVersion:(u.authVersion??0)+1});await c.s.db.put('tokens',{...t,used:true});for(const s of await c.s.db.list('sessions',{userId:u.id}))await c.s.db.put('sessions',{...s,revoked:true});return {reset:true};},undefined,true);
  route('POST','/api/projects/lookup',async c=>c.s.providers.registry(c.b.registryId),dev);
  route('POST','/api/projects',async c=>c.s.createProject(c.p,c.b.registryRecord?.registryId??c.b.registryId),['developer_admin']);
  route('GET','/api/projects/:id',async c=>c.s.project(c.p,c.params.id));
  route('POST','/api/projects/:id/pdd',async c=>{
    await c.s.project(c.p,c.params.id,true);const file=await c.req.file();ensure(file?.mimetype==='application/pdf','PDD_UNREADABLE',422);
    const buffer=await file.toBuffer();ensure(buffer.subarray(0,5).toString()==='%PDF-','PDD_UNREADABLE',422);
    const parser=new PDFParse({data:buffer});try{const text=await parser.getText();ensure(text.pages.length>0&&text.pages.length<=300,'PDD_UNREADABLE',422);return {jobId:(await c.s.enqueue('extraction',{projectId:c.params.id,pages:text.pages.map(p=>p.text)})).id};}finally{await parser.destroy();}
  },dev);
  route('GET','/api/projects/:id/extraction',async c=>{await c.s.project(c.p,c.params.id);return (await c.s.db.list('commitments',{projectId:c.params.id})).at(-1)??null;},dev);
  route('PATCH','/api/projects/:id/commitment',async c=>{
    await c.s.project(c.p,c.params.id,true);const original=(await c.s.db.list('commitments',{projectId:c.params.id})).at(-1);ensure(original,'PDD_NO_COMMITMENT',422);
    ensure(['percentage','basis','cadence','beneficiary_definition','accepted'].includes(c.b.field)&&typeof c.b.reason==='string'&&c.b.reason.trim(),'INVALID_REQUEST');
    const next:Row={...original,[c.b.field]:c.b.value,id:id(),createdAt:now(),original:false,supersedes:original.id,reason:c.b.reason};
    ensure(typeof next.percentage==='number'&&Number.isFinite(next.percentage)&&next.percentage>=0&&next.percentage<=100&&['gross','net'].includes(next.basis)&&['monthly','quarterly','annual'].includes(next.cadence)&&typeof next.accepted==='boolean','INVALID_REQUEST');
    await c.s.audit(c.p.id,'commitment.reviewed',c.params.id,{previousId:original.id,field:c.b.field,reason:c.b.reason});return c.s.db.put('commitments',next);
  },dev);
  route('POST','/api/projects/:id/register',async c=>{const p=await c.s.project(c.p,c.params.id,true);const carbon=await c.s.providers.bank.call('POST','/carbon/projects',{name:p.name,type:c.b.type},hash(p.id+':register'));await c.s.db.put('projects',{...p,carbonId:carbon.id});return carbon;},dev);
  for(const [method,suffix]of [['GET','mrv'],['POST','mrv'],['GET','certificates']])route(method,`/api/projects/:id/${suffix}`,async c=>{const p=await c.s.project(c.p,c.params.id,method==='POST');ensure(p.carbonId,'REGISTRY_NOT_FOUND',404);return c.s.providers.bank.call(method,`/carbon/projects/${p.carbonId}/${suffix}`,method==='POST'?c.b:undefined);},dev);
  route('GET','/api/projects/:id/participants',async c=>{await c.s.project(c.p,c.params.id);let rows=await c.s.db.list('participants',{projectId:c.params.id});for(const [query,field]of [['status','status'],['agent','agentId'],['tier','kycLevel']])if(c.q[query])rows=rows.filter(r=>String(r[field])===c.q[query]);if(c.q.flagged)rows=rows.filter(r=>r.flags.length>0);if(c.q.q)rows=rows.filter(r=>r.name.toLowerCase().includes(String(c.q.q).toLowerCase()));return list(c,rows.map(r=>({...r,phone:maskPhone(r.phone)})));},dev);
  const enrolBatch=async(c:Context)=>{ensure(Array.isArray(c.b.items)&&c.b.items.length>0&&c.b.items.length<=500,'INVALID_REQUEST');const results=[];for(const input of c.b.items){try{const p=await c.s.enrol(c.p,{...input,projectId:c.params.id??input.projectId});results.push({clientId:input.clientId,status:'success',data:{id:p.id,flags:p.flags}});}catch(e){results.push({clientId:input.clientId,status:'error',code:e instanceof Fault?e.code:'INTERNAL_ERROR'});}}return results;};
  route('POST','/api/projects/:id/participants',enrolBatch,dev);route('POST','/api/field/enrolments',enrolBatch,['agent']);
  for(const path of ['/api/participants/:id','/api/field/enrolments/:id'])route('GET',path,async c=>c.s.scoped(c.p,'participants',c.params.id),[...dev,'agent']);
  route('PATCH','/api/participants/:id',async c=>{const p=await c.s.scoped(c.p,'participants',c.params.id,true);ensure(typeof c.b.reason==='string'&&c.b.reason.trim()&&Object.keys(c.b).every(k=>['phone','status','reason'].includes(k)),'INVALID_REQUEST');if(c.b.phone)ensure(/^\+\d{8,15}$/.test(c.b.phone),'INVALID_REQUEST');if(c.b.status)ensure(['active','removed','suspended'].includes(c.b.status),'INVALID_REQUEST');await c.s.audit(c.p.id,'participant.corrected',p.projectId,{participantId:p.id,reason:c.b.reason});return c.s.db.put('participants',{...p,phone:c.b.phone??p.phone,status:c.b.status??p.status});},dev);
  route('DELETE','/api/participants/:id',async()=>{throw new Fault('PARTICIPANT_DELETE_NOT_PERMITTED',403);});
  route('GET','/api/participants/:id/payments',async c=>{await c.s.scoped(c.p,'participants',c.params.id);return list(c,await c.s.db.list('transfers',{participantId:c.params.id}));},dev);
  route('POST','/api/participants/:id/name-check',async c=>{const p=await c.s.scoped(c.p,'participants',c.params.id,true);const r=await c.s.providers.bank.call('POST',`/transfers/${p.bankCode==='000014'?'intrabank':'interbank'}/name-enquiry`,{account_number:p.accountNumber,destination_bank_code:p.bankCode});return {accountName:r.account_name,kycLevel:r.kyc_level};},dev);
  route('GET','/api/projects/:id/agents',async c=>{await c.s.project(c.p,c.params.id);return list(c,await c.s.db.list('agents',{projectId:c.params.id}));},dev);
  route('POST','/api/projects/:id/agents/invite',async c=>{await c.s.project(c.p,c.params.id,true);const code=id()+id();await c.s.db.put('invites',row({id:hash(code),projectId:c.params.id,organisationId:c.p.organisationId,name:c.b.name,email:c.b.email,expiresAt:new Date(Date.now()+2*86400_000).toISOString(),used:false,revoked:false}));return {code};},['developer_admin']);
  route('GET','/api/invites/:code',async c=>{const invite=await c.s.required('invites',hash(c.params.code));ensure(!invite.used&&!invite.revoked&&Date.parse(invite.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);return {projectId:invite.projectId,expiresAt:invite.expiresAt};},undefined,true);
  route('POST','/api/invites/:code/redeem',async c=>{
    return c.s.db.lock('invite:'+hash(c.params.code),async tx=>{
    const invite=await c.s.required('invites',hash(c.params.code));ensure(!invite.used&&!invite.revoked&&Date.parse(invite.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);
    ensure(typeof c.b.identity?.email==='string'&&c.b.identity.email.toLowerCase()===invite.email.toLowerCase(),'FORBIDDEN',403);try{ensure(createPublicKey(c.b.deviceKey).asymmetricKeyType==='ed25519','INVALID_REQUEST');}catch{throw new Fault('INVALID_REQUEST');}
    const userId=hash(invite.email.toLowerCase());ensure(!await tx.get('users',userId),'DUPLICATE_REQUEST',409);
    const user=await tx.put('users',row({id:userId,email:invite.email.toLowerCase(),passwordHash:passwordHash(c.b.identity.password),role:'agent',projectId:invite.projectId,organisationId:invite.organisationId,deviceKey:c.b.deviceKey,verified:true}));await tx.put('agents',{...user,status:'active',passwordHash:undefined});await tx.put('invites',{...invite,used:true});return {id:user.id};
    });
  },undefined,true);
  route('POST','/api/invites/:code/revoke',async c=>{const i=await c.s.required('invites',hash(c.params.code));await c.s.project(c.p,i.projectId!,true);return c.s.db.put('invites',{...i,revoked:true});},['developer_admin']);
  route('GET','/api/agents/:id',async c=>{const a=await c.s.required('agents',c.params.id);await c.s.project(c.p,a.projectId!);return a;},dev);
  route('PATCH','/api/agents/:id',async c=>{const a=await c.s.required('agents',c.params.id);await c.s.project(c.p,a.projectId!,true);ensure(['active','suspended'].includes(c.b.status)&&c.b.reason,'INVALID_REQUEST');return c.s.db.put('agents',{...a,status:c.b.status});},['developer_admin']);
  route('POST','/api/field/device/bind',async c=>{const agent=await c.s.required('agents',c.p.id);ensure(agent.deviceKey===c.b.deviceKey,'DEVICE_UNBOUND',403);return {bound:true};},['agent']);
  route('GET','/api/field/me',async c=>{const a=await c.s.required('agents',c.p.id);return {...a,enrolments:(await c.s.db.list('participants',{projectId:c.p.projectId,agentId:c.p.id})).map(p=>({id:p.id,flags:p.flags,syncDelayMs:p.syncDelayMs}))};},['agent']);
  route('GET','/api/projects/:id/runs',async c=>{await c.s.project(c.p,c.params.id);return list(c,await c.s.db.list('runs',{projectId:c.params.id}));},dev);
  route('POST','/api/projects/:id/runs',async c=>c.s.createRun(c.p,c.params.id,c.b),dev);
  route('GET','/api/runs/:id',async c=>c.s.scoped(c.p,'runs',c.params.id),dev);
  route('GET','/api/runs/:id/arithmetic',async c=>c.s.arithmetic(await c.s.scoped(c.p,'runs',c.params.id)),dev);
  route('POST','/api/runs/:id/preflight',async c=>c.s.preflight(await c.s.scoped(c.p,'runs',c.params.id,true),c.b.exclusions??[]),dev);
  route('POST','/api/runs/:id/execute',async c=>{const run=await c.s.scoped(c.p,'runs',c.params.id,true);ensure(run.state==='funded'||['executing','complete','partially_complete'].includes(run.state),'PREFLIGHT_EXCLUSIONS_REQUIRED',422);return {jobId:(await c.s.enqueue('execute',{runId:run.id},'execute:'+run.id)).id};},dev);
  route('POST','/api/runs/:id/requery',async c=>{await c.s.scoped(c.p,'runs',c.params.id,true);return c.s.requery(c.params.id,c.b.transferId);},dev);
  route('POST','/api/runs/:id/retry',async c=>{await c.s.scoped(c.p,'runs',c.params.id,true);return c.s.requery(c.params.id);},dev);
  route('POST','/api/runs/:id/cancel',async c=>{const r=await c.s.scoped(c.p,'runs',c.params.id,true);ensure(['draft','funded','preflight_failed'].includes(r.state),'INVALID_REQUEST',409);return c.s.db.put('runs',{...r,state:'cancelled'});},dev);
  route('GET','/api/runs/:id/transfers',async c=>{await c.s.scoped(c.p,'runs',c.params.id);return list(c,await c.s.db.list('transfers',{runId:c.params.id}));},dev);
  app.get('/api/runs/:id/stream',async(req,reply)=>{
    const p=await session(db,req.headers.authorization,req.headers.cookie);ensure(dev.includes(p.role),'FORBIDDEN',403);const run=await root.scoped(p,'runs',(req.params as any).id);
    reply.hijack();reply.raw.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
    const send=(event:any)=>reply.raw.write(`id: ${event.transferId??run.id}:${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    // Polling the durable state works across the independent worker and API processes.
    const states=new Map<string,string>();let polling=false,completed=false;
    const poll=async()=>{if(polling)return;polling=true;try{for(const t of await db.list('transfers',{runId:run.id}))if(states.get(t.id)!==t.state){states.set(t.id,t.state);send({type:'transfer.'+t.state,transferId:t.id,state:t.state});}const current=await db.get('runs',run.id);if(current?.state==='complete'&&!completed){send({type:'run.complete'});completed=true;}}catch{}finally{polling=false;}};
    await poll();const timer=setInterval(poll,2000);const heartbeat=setInterval(()=>reply.raw.write(': heartbeat\n\n'),15000);req.raw.on('close',()=>{clearInterval(timer);clearInterval(heartbeat);});
  });
  route('GET','/api/tariff',async c=>c.s.providers.bank.call('GET','/tariff'),dev);
  for(const suffix of ['funding','reconciliation'])route('GET',`/api/projects/:id/${suffix}`,async c=>{const p=await c.s.project(c.p,c.params.id);ensure(p.sourceAccount,'FUNDING_NOT_RECEIVED',422);return c.s.providers.bank.call('GET',suffix==='funding'?`/accounts/${p.sourceAccount}/balance`:'/reconciliation');},dev);
  route('POST','/api/disputes',async c=>{const d=await c.s.dispute(c.b);return {id:d.id,status:d.status};},undefined,true);
  route('GET','/api/projects/:id/disputes',async c=>{await c.s.project(c.p,c.params.id);return list(c,await c.s.db.list('disputes',{projectId:c.params.id}));},dev);
  route('GET','/api/disputes/:id',async c=>c.s.scoped(c.p,'disputes',c.params.id),dev);
  route('POST','/api/disputes/:id/respond',async c=>{const d=await c.s.scoped(c.p,'disputes',c.params.id,true);ensure(!c.b.status&&!c.b.resolutionBasis,'DISPUTE_RESOLUTION_BASIS_REQUIRED',403);ensure(typeof c.b.body==='string'&&c.b.body.length<=4000,'INVALID_REQUEST');await c.s.audit(c.p.id,'dispute.response',d.projectId,{disputeId:d.id,body:c.b.body});return c.s.db.put('disputes',{...d,status:'developer_responded'});},dev);
  route('GET','/api/projects/:id/attestations',async c=>{await c.s.project(c.p,c.params.id);return list(c,(await c.s.db.list('attestations',{projectId:c.params.id})).map(a=>c.s.publicAttestation(a)));},dev);
  route('GET','/api/attestations/:id',async c=>c.s.publicAttestation(await c.s.scoped(c.p,'attestations',c.params.id)),dev);
  route('POST','/api/attestations/:id/disclosure',async c=>c.s.disclosure(await c.s.scoped(c.p,'attestations',c.params.id),c.b.transferId),dev);
  const pdfBytes=async(a:Row)=>db.lock('pdf:'+a.hash,async tx=>{const cached=await tx.get('tokens','pdf:'+a.hash);if(cached)return Buffer.from(cached.bytes,'base64');const bytes=await attestationPdf(a);await tx.put('tokens',row({id:'pdf:'+a.hash,bytes:bytes.toString('base64'),fileHash:hash(bytes)}));return bytes;});
  app.get('/api/public/attestations/:id/pdf',async(req,reply)=>{const a=await root.required('attestations',(req.params as any).id);return reply.type('application/pdf').header('Content-Disposition',`attachment; filename="attestation-${a.hash.slice(0,16)}.pdf"`).send(await pdfBytes(a));});
  route('POST','/api/verify/attestation',async c=>{
    let requestedHash=c.b.hash;
    if(c.req.isMultipart()){
      const file=await c.req.file();ensure(file?.mimetype==='application/pdf','PROOF_INVALID',422);const bytes=await file.toBuffer();ensure(bytes.subarray(0,5).toString()==='%PDF-','PROOF_INVALID',422);
      const parser=new PDFParse({data:bytes});try{const result=await parser.getText();requestedHash=result.text.match(/ATTEST-SHA256:\s*([a-f0-9]{64})/i)?.[1];}finally{await parser.destroy();}
      ensure(requestedHash,'PROOF_INVALID',422);const cached=await db.get('tokens','pdf:'+requestedHash);ensure(cached?.fileHash===hash(bytes),'PROOF_INVALID',422);
    }
    const a=(await c.s.db.list('attestations',{hash:requestedHash}))[0];ensure(a,'PROOF_INVALID',422);ensure(verifyAttestationRecord(a),'PROOF_INVALID',422);return {...c.s.publicAttestation(a),anchor:await c.s.db.get('anchors',a.id)??{status:'pending'}};
  },undefined,true);
  route('POST','/api/verify/disclosure',async c=>{const b=c.b.bundle;ensure(b&&Array.isArray(b.proof),'PROOF_INVALID',422);const a=await c.s.required('attestations',b.attestationId);ensure(verifyAttestationRecord(a)&&a.hash===b.attestationHash&&a.document.merkleRoot===b.root&&verifyProof(b.leaf,b.proof,b.root),'LEAF_NOT_IN_ROOT',422);return {valid:true,attestationHash:a.hash,anchor:await c.s.db.get('anchors',a.id)??{status:'pending'}};},undefined,true);
  route('GET','/api/admin/chain/:id',async c=>c.s.chain(c.params.id),['platform_admin']);
  route('POST','/api/ops/signals/scan',async c=>{await c.s.required('projects',c.b.projectId);ensure(Array.isArray(c.b.flows)&&c.b.flows.length<=5000,'INVALID_REQUEST');for(const f of c.b.flows)ensure(typeof f.participantId==='string'&&typeof f.to==='string'&&Number.isFinite(Date.parse(f.receivedAt))&&Number.isFinite(Date.parse(f.sentAt)),'INVALID_REQUEST');return {jobId:(await c.s.enqueue('signals',{projectId:c.b.projectId,flows:c.b.flows})).id};},ops);
  route('GET','/api/public/register',async c=>{let projects=await c.s.db.list('projects');if(c.q.q)projects=projects.filter(p=>p.name.toLowerCase().includes(String(c.q.q).toLowerCase()));if(c.q.country)projects=projects.filter(p=>p.country===c.q.country);return list(c,await Promise.all(projects.map(p=>c.s.publicProject(p.id))));},undefined,true);
  route('GET','/api/public/projects/:id',async c=>c.s.publicProject(c.params.id),undefined,true);
  route('GET','/api/public/developers/:id',async c=>({projects:await Promise.all((await c.s.db.list('projects',{organisationId:c.params.id})).map(p=>c.s.publicProject(p.id)))}),undefined,true);
  route('GET','/api/public/attestations/:id',async c=>c.s.publicAttestation(await c.s.required('attestations',c.params.id)),undefined,true);
  route('GET','/api/public/projects/:id/geography',async c=>c.s.geography(c.params.id),undefined,true);
  route('GET','/api/verifier/projects/:id',async c=>c.s.publicProject(c.params.id),['verifier']);
  route('GET','/api/verifier/compare',async c=>{const ids=String(c.q.ids??'').split(',');ensure(ids.length<=10,'INVALID_REQUEST');return Promise.all(ids.map(id=>c.s.publicProject(id)));},['verifier']);
  for(const table of ['watchlist','alerts'] as const){route('GET',`/api/verifier/${table}`,async c=>list(c,await c.s.db.list(table,{userId:c.p.id})),['verifier']);route('POST',`/api/verifier/${table}`,async c=>{await c.s.required('projects',c.b.projectId);if(table==='alerts'){ensure(['coverage_below','dispute_raised','period_closed_late','correction_issued'].includes(c.b.condition),'INVALID_REQUEST');if(c.b.condition==='coverage_below')ensure(typeof c.b.threshold==='number'&&Number.isFinite(c.b.threshold)&&c.b.threshold>=0&&c.b.threshold<=100,'INVALID_REQUEST');}return c.s.db.put(table,row({kind:'rule',userId:c.p.id,projectId:c.b.projectId,condition:c.b.condition,threshold:c.b.threshold}));},['verifier']);}
  route('POST','/api/participants/:id/receipts/revoke',async c=>{const p=await c.s.scoped(c.p,'participants',c.params.id,true);ensure(c.b.reason,'INVALID_REQUEST');const receipts=await c.s.db.list('receipts',{participantId:p.id});for(const receipt of receipts)await c.s.db.put('receipts',{...receipt,revoked:true});await c.s.audit(c.p.id,'receipt.revoked',p.projectId,{participantId:p.id,reason:c.b.reason});return {revoked:receipts.length};},dev);
  route('POST','/api/verifier/export',async c=>{
    ensure(typeof c.b.projectId==='string'&&typeof c.b.period==='string','INVALID_REQUEST');await c.s.required('projects',c.b.projectId);
    const a=await c.s.db.list('attestations',{projectId:c.b.projectId,period:c.b.period});ensure(a.length<=100,'INVALID_REQUEST');
    if(c.b.format==='csv'){
      const escape=(v:any)=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
      const columns=['period','enrolledCount','paidCount','amountCommitted','amountMovedToHouseholds','chargesBorne','shortfall','closedAt'];
      const content=[columns.concat(['hash','signature']).map(escape).join(','),...a.map(r=>[...columns.map(k=>r.document[k]),r.hash,r.signature].map(escape).join(','))].join('\r\n');return {format:'csv',contentType:'text/csv',content};
    }
    if(c.b.format==='pdf')return {format:'pdf',downloads:a.map(r=>({attestationId:r.id,url:`/api/public/attestations/${r.id}/pdf`}))};
    return {format:'json',attestations:a.map(r=>c.s.publicAttestation(r))};
  },['verifier']);
  route('GET','/api/ops/signals',async c=>{let values=await c.s.db.list('signals');if(c.q.class)values=values.filter(r=>r.class===c.q.class);return list(c,values);},ops);
  route('GET','/api/ops/signals/:id',async c=>c.s.required('signals',c.params.id),ops);
  route('GET','/api/ops/signals/:id/graph',async c=>{const s=await c.s.required('signals',c.params.id);return {nodes:s.participantIds.map((id:string)=>({id})),edges:s.detail.to?s.participantIds.map((id:string)=>({from:id,to:s.detail.to})):[],sampled:true};},ops);
  route('GET','/api/ops/cases',async c=>list(c,await c.s.db.list('cases')),ops);
  route('POST','/api/ops/cases/:id/action',async c=>{const r=await c.s.required('cases',c.params.id);ensure(['request_documentation','escalate','clear','substantiated'].includes(c.b.action)&&c.b.note,'INVALID_REQUEST');const updated=await c.s.db.put('cases',{...r,status:c.b.action==='clear'?'unsubstantiated':c.b.action,actions:[...r.actions,{action:c.b.action,note:c.b.note,at:now(),by:c.p.id}]});await c.s.audit(c.p.id,'case.action',r.projectId,{caseId:r.id,action:c.b.action});if(c.b.action==='substantiated')for(const run of await c.s.db.list('runs',{projectId:r.projectId}))await c.s.enqueue('correction',{projectId:r.projectId,runId:run.id,reason:'substantiated_case'},'case-correction:'+r.id+':'+run.id);return updated;},ops);
  route('GET','/api/ops/exceptions',async c=>list(c,(await c.s.db.list('participants')).filter(p=>p.flags.length).map(p=>({id:p.id,projectId:p.projectId,flags:p.flags}))),ops);
  route('GET','/api/ops/reconciliation',async c=>c.s.providers.bank.call('GET','/reconciliation'),ops);
  route('GET','/api/receipt/:token',async c=>{const r=await c.s.receipt(c.params.token);const t=await c.s.required('transfers',r.transferId);return {projectId:r.projectId,amount:t.amount,settledAt:t.settledAt,state:t.state,confirmed:(await c.s.db.list('confirmations',{transferId:t.id})).length>0};},undefined,true);
  route('POST','/api/receipt/:token/confirm',async c=>{await c.s.confirm(await c.s.receipt(c.params.token));return {confirmed:true};},undefined,true);
  route('POST','/api/receipt/:token/dispute',async c=>{const d=await c.s.dispute(c.b,await c.s.receipt(c.params.token));return {id:d.id,status:d.status};},undefined,true);
  route('POST','/hooks/forge',async c=>{
    ensure(verifyWebhook((c.req as any).rawBody??'',String(c.req.headers['x-forge-timestamp']??''),String(c.req.headers['x-forge-signature']??''),process.env.FORGE_WEBHOOK_SECRET??''),'FORBIDDEN',403);
    ensure(typeof c.b.event_id==='string'&&typeof c.b.type==='string','INVALID_REQUEST');
    await c.s.db.lock('event:'+c.b.event_id,async tx=>{if(await tx.get('events',c.b.event_id))return;await tx.put('events',row({id:c.b.event_id,type:c.b.type}));await tx.put('jobs',row({id:'event:'+c.b.event_id,type:'forge-event',data:c.b,state:'pending',attempts:0,nextAt:now()}));});return {accepted:true};
  },undefined,true);
  const callback=async(c:Context)=>{ensure(process.env.AT_CALLBACK_SECRET&&c.req.headers.authorization===`Bearer ${process.env.AT_CALLBACK_SECRET}`,'FORBIDDEN',403);};
  route('POST','/api/webhooks/sms-delivery',async c=>{await callback(c);const n=(await c.s.db.list('notifications',{id:c.b.id}))[0];if(n)await c.s.db.put('notifications',{...n,deliveryStatus:c.b.status});return {accepted:true};},undefined,true);
  const participantAction=async(c:Context,text:string,phone:string,projectId?:string)=>{
    const participants=await c.s.db.list('participants',projectId?{phone,projectId}:{phone});if(participants.length>1)return 'You are enrolled in multiple projects. Use USSD to select a project.';ensure(participants.length===1,'NOT_FOUND',404);const p=participants[0];
    const transfers=(await c.s.db.list('transfers',{participantId:p.id})).filter(t=>t.state==='settled');const last=transfers.at(-1);
    const action=text.trim().toLowerCase().replace(/\s+/g,' ');
    if(['confirm','confirmed','confrm','3'].includes(action)){ensure(last,'NOT_FOUND',404);await c.s.confirm(row({projectId:p.projectId,participantId:p.id,transferId:last.id}));return 'Receipt confirmed.';}
    if(['problem','dispute','4'].includes(action)){ensure(last,'NOT_FOUND',404);await c.s.dispute({category:'not_received'},row({projectId:p.projectId,participantId:p.id,transferId:last.id}));return 'Your report was received.';}
    return last?`Last payment NGN ${last.amount}. Reply CONFIRM or PROBLEM.`:'Enrolled. No payments yet.';
  };
  route('POST','/api/webhooks/sms-inbound',async c=>{await callback(c);return {message:await participantAction(c,c.b.text??'',c.b.from)};},undefined,true);
  app.post('/api/webhooks/ussd',async(req,reply)=>{
    const c={s:root,p:{id:'anonymous'},b:req.body??{},req,reply} as Context;await callback(c);const b=c.b;const parts=String(b.text??'').split('*');
    reply.type('text/plain');if(!b.text)return 'CON Select language\n1. English';
    const participants=await root.db.list('participants',{phone:b.phoneNumber});
    if(participants.length>1){
      if(parts.length===1){const names=await Promise.all(participants.map(async(p,i)=>(i+1)+'. '+(await root.required('projects',p.projectId!)).name));return 'CON Select project\n'+names.join('\n');}
      const selected=participants[Number(parts[1])-1];ensure(selected,'NOT_FOUND',404);if(parts.length===2)return 'CON 1. Check enrolment\n2. Last payment\n3. Confirm receipt\n4. Report problem';
      return 'END '+await participantAction(c,parts.at(-1)!,b.phoneNumber,selected.projectId);
    }
    if(parts.length===1)return 'CON 1. Check enrolment\n2. Last payment\n3. Confirm receipt\n4. Report problem';
    return 'END '+await participantAction(c,parts.at(-1)!,b.phoneNumber);
  });
  return app;
}
