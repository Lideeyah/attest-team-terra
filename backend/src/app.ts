import Fastify, { type FastifyRequest, type FastifyReply, type HTTPMethods } from 'fastify';
import multipart from '@fastify/multipart';
import { PDFParse } from 'pdf-parse';
import { createPublicKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Fault, ensure, row, id, now, hash, canonical, cents, money, bankMoney, identityHash, maskPhone, nameMatch, verifyWebhook, verifyProof, verifyAttestationRecord, type Principal, type Row } from './core.js';
import { passwordHash, passwordValid, session, issueSession } from './auth.js';
import { authHandler } from './authjs.js';
import { Service } from './service.js';
import type { Store,Table,PageOptions } from './store.js';
import type { EntityMap } from './models.js';
import { attestationPdf,benefitSharingPdf } from './pdf.js';
import { storeEvidence,readEvidence, type EvidenceKind } from './evidence.js';
import { enabledLanguages,translation,parseSms } from './messaging.js';
import type {BalanceResult,NameResult,IdentityResult,WebhookRegistration} from './bank.js';
import {parseBody,queryValues,type BodyFor} from './request-types.js';
import type {Envelope,Meta} from './contracts.js';
import {record,text} from './validation.js';
import { validateRegistry,registryDigest } from './registry.js';

import {benefitSharingReport} from './reports.js';
import {validateCommitmentSchedule} from './period.js';
import {registerCarbon,submitMrv,listMrv,retireCredits,certificates} from './carbon.js';

type Context<B=Record<string,unknown>>={s:Service;p:Principal;b:B;q:Record<string,string>;params:Record<string,string>;req:FastifyRequest;reply:FastifyReply};
export async function createApp(db: Store, suppliedService?: Service) {
  const app=Fastify({logger:false,bodyLimit:2*1024*1024,trustProxy:process.env.TRUST_PROXY?process.env.TRUST_PROXY.split(','):false});const root=suppliedService??new Service(db);
  const publicCache=new Map<string,{expires:number;value:Envelope<unknown>}>();
  await app.register(multipart,{limits:{fileSize:10*1024*1024,files:1,fields:5}});
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json',{parseAs:'string'},(req,body,done)=>{
    req.rawBody=body as string;try{done(null,JSON.parse(body as string));}catch{done(new Fault('INVALID_REQUEST'),undefined);}
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
  app.setErrorHandler((err:unknown,req,reply)=>{const status=typeof err==='object'&&err!==null&&'statusCode'in err&&typeof err.statusCode==='number'?err.statusCode:500;const e=err instanceof Fault?err:new Fault(status===413?'INVALID_REQUEST':'INTERNAL_ERROR',status);reply.code(e.status).send({status:'error',error:{code:e.code,message:e.message,field:e.field,remediation:null},request_id:req.id});});
  app.setNotFoundHandler((req,reply)=>reply.code(404).send({status:'error',error:{code:'NOT_FOUND',message:'NOT_FOUND',field:null,remediation:null},request_id:req.id}));
  const ok=(req:FastifyRequest,data:unknown,meta:Meta|null=null):Envelope<unknown>=>({status:'success',message:'OK',data,meta,request_id:req.id});
  const list=(c:Pick<Context,'q'|'req'>,values:unknown[])=>{
    const page=Number(c.q.page??1),per_page=Number(c.q.per_page??20);ensure(Number.isInteger(page)&&page>=1&&Number.isInteger(per_page)&&per_page>=1&&per_page<=100,'INVALID_REQUEST');
    return ok(c.req,values.slice((page-1)*per_page,page*per_page),{page,per_page,total:values.length,total_pages:Math.ceil(values.length/per_page)});
  };
  const paged=async<T extends Table>(c:Pick<Context,'q'|'req'|'s'>,table:T,where:Record<string,unknown>={},map:(r:EntityMap[T])=>unknown=r=>r,filters:Pick<PageOptions,'search'|'flagged'>={})=>{
    const page=Number(c.q.page??1),perPage=Number(c.q.per_page??20);ensure(Number.isSafeInteger(page)&&page>=1&&page<=100000&&Number.isInteger(perPage)&&perPage>=1&&perPage<=100,'INVALID_REQUEST');
    const sort=c.q.sort??'createdAt';ensure(['createdAt','name','status','state','period','class','severity','capturedAt'].includes(sort)&&(!c.q.order||['asc','desc'].includes(c.q.order)),'INVALID_REQUEST');
    const result=await c.s.db.page(table,{page,perPage,where,sort,descending:c.q.order==='desc',...filters});return ok(c.req,await Promise.all(result.rows.map(map)),{page,per_page:perPage,total:result.total,total_pages:Math.ceil(result.total/perPage)});
  };
  const route=<P extends string>(method:string,url:P,fn:(c:Context<BodyFor<P>>)=>Promise<unknown>,roles?:string[],publicRoute=false)=>{
    app.route({method:method as HTTPMethods,url,handler:async(req,reply)=>{
      const p=publicRoute?({id:'anonymous',role:'verifier',organisationId:''} as Principal):await session(db,req.headers.authorization,req.headers.cookie);
      if(roles)ensure(roles.includes(p.role),'FORBIDDEN',403);
      const context=(s:Service):Context<BodyFor<P>>=>({s,p,b:method==='GET'||method==='HEAD'||method==='DELETE'||req.isMultipart()?{} as BodyFor<P>:parseBody(url,req.body),q:queryValues(req.query??{}),params:req.params as Record<string,string>,req,reply});
      const invoke=async(s:Service)=>{
        const cacheable=method==='GET'&&url.startsWith('/api/public/');const cached=cacheable?publicCache.get(req.url):null;
        if(cached&&cached.expires>Date.now())return {...cached.value,request_id:req.id};
        const data=await fn(context(s));const response=typeof data==='object'&&data!==null&&'status'in data&&data.status==='success'?data as Envelope<unknown>:ok(req,data);
        if(cacheable){if(publicCache.size>=500)publicCache.delete(publicCache.keys().next().value!);publicCache.set(req.url,{expires:Date.now()+15_000,value:response});}
        else if(method!=='GET')publicCache.clear();
        return response;
      };
      if(['GET','HEAD'].includes(method)||req.isMultipart()||url.startsWith('/api/webhooks')||url==='/hooks/forge')return invoke(root);
      const key=req.headers['idempotency-key'];ensure(typeof key==='string'&&key.length>=8&&key.length<=200,'INVALID_REQUEST');
      const requestHash=hash(canonical({method,url:req.url,body:req.body??null}));const recordId=hash(p.id+':'+key);
      return db.asActor(p.id).lock('request:'+recordId,async tx=>{
        const existing=await tx.get('idempotency',recordId);
        if(existing){ensure(existing.requestHash===requestHash,'DUPLICATE_REQUEST',409);reply.header('Idempotent-Replayed','true');return existing.response;}
        const scoped=new Service(tx,root.providers.forStore(tx));scoped.signer=root.signer;scoped.events=root.events;
        const response=await invoke(scoped);await tx.put('idempotency',row({id:recordId,requestHash,response}));return response;
      });
    }});
  };
  app.get('/healthz',async()=>({status:'ok'}));app.get('/',async()=>({name:'Attest',health:'/healthz'}));
  app.get('/readyz',async()=>{await db.get('tokens','readiness');return {status:'ready'};});
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
  app.get('/receipt/:token',async(req,reply)=>{await root.receipt((req.params as {token:string}).token);return reply.type('text/html').send(await readFile('public/receipt.html','utf8'));});
  route('POST','/api/auth/signup',async c=>{
    ensure(typeof c.b.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.b.email)&&typeof c.b.organisation==='string','INVALID_REQUEST');
    ensure(!c.b.role||c.b.role==='developer_admin','FORBIDDEN',403);
    const email=c.b.email.toLowerCase();const uid=hash(email);ensure(!await c.s.db.get('users',uid),'DUPLICATE_REQUEST',409);
    const u=await c.s.db.put('users',row({id:uid,email,passwordHash:passwordHash(c.b.password),organisationId:id(),organisation:c.b.organisation,role:'developer_admin',verified:false}));
    // Provision verification via the operator command until an email provider is configured.
    await c.s.authEmail(u,'verify');await c.s.audit(u.id,'auth.verification_required');return {id:u.id,verificationRequired:true};
  },undefined,true);
  route('POST','/api/auth/signin',async c=>{
    const user=await c.s.db.get('users',hash(String(c.b.email).toLowerCase()));ensure(user&&passwordValid(c.b.password,user.passwordHash)&&user.verified&&!user.suspended,'UNAUTHORIZED',401);
    if(user.role==='agent')ensure((await c.s.db.get('agents',user.id))?.status==='active','FORBIDDEN',403);
    return {token:await issueSession(c.s.db,user.id),expiresIn:28800};
  },undefined,true);
  route('GET','/api/auth/session',async c=>{
    const user=await c.s.required('users',c.p.id);
    const projects=dev.includes(c.p.role)?await c.s.db.list('projects',{organisationId:c.p.organisationId}):[];
    const selected=/\battest_project=([^;]+)/.exec(c.req.headers.cookie??'')?.[1];
    return {...c.p,email:user.email,organisation:c.p.organisationId,projectId:c.p.projectId??projects.find(p=>p.id===selected)?.id??projects[0]?.id??null};
  });
  route('POST','/api/auth/verify-email',async c=>{const t=await c.s.required('tokens',hash(c.b.token??''));ensure(t.type==='verify'&&t.userId&&t.expiresAt&&!t.used&&Date.parse(t.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);const u=await c.s.required('users',t.userId);await c.s.db.put('users',{...u,verified:true});await c.s.db.put('tokens',{...t,used:true});return {verified:true};},undefined,true);
  route('POST','/api/auth/reset/request',async c=>{const emailHash=hash(String(c.b.email).toLowerCase());const u=await c.s.db.get('users',emailHash);if(u)await c.s.authEmail(u,'reset');await c.s.audit('anonymous','auth.reset_requested',undefined,{emailHash});return {accepted:true};},undefined,true);
  route('POST','/api/auth/reset/confirm',async c=>{const t=await c.s.required('tokens',hash(c.b.token??''));ensure(t.type==='reset'&&t.userId&&t.expiresAt&&!t.used&&Date.parse(t.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);const u=await c.s.required('users',t.userId);await c.s.db.put('users',{...u,passwordHash:passwordHash(c.b.password),authVersion:(u.authVersion??0)+1});await c.s.db.put('tokens',{...t,used:true});for(const s of await c.s.db.list('sessions',{userId:u.id}))await c.s.db.put('sessions',{...s,revoked:true});return {reset:true};},undefined,true);
  route('POST','/api/projects/lookup',async c=>c.s.providers.registry(c.b.registryId),dev);
  route('POST','/api/projects/:id/evidence',async c=>{await c.s.project(c.p,c.params.id);ensure([...dev,'agent'].includes(c.p.role),'FORBIDDEN',403);const file=await c.req.file();ensure(file,'INVALID_REQUEST');const kind=String(c.q.kind) as EvidenceKind;return storeEvidence(c.s.db,c.p,c.params.id,kind,file.mimetype,await file.toBuffer());},[...dev,'agent']);
  app.get('/api/evidence/:id',async(req,reply)=>{const p=await session(db,req.headers.authorization,req.headers.cookie);const evidence=await readEvidence(db,(req.params as {id:string}).id,p);await root.audit(p.id,'evidence.disclosed',evidence.record.projectId,{evidenceId:evidence.record.id});return reply.type(evidence.record.contentType).header('Content-Disposition','attachment').send(evidence.bytes);});
  route('POST','/api/receipt/:token/evidence',async c=>{const receipt=await c.s.receipt(c.params.token);const file=await c.req.file();ensure(file,'INVALID_REQUEST');return storeEvidence(c.s.db,{id:'receipt:'+receipt.id,role:'agent',organisationId:'',projectId:receipt.projectId},receipt.projectId!,'voice_note',file.mimetype,await file.toBuffer());},undefined,true);
  route('POST','/api/admin/registry/import',async c=>{const record=validateRegistry(c.b.record);const digest=registryDigest(record);await c.s.db.put('tokens',row({id:'registry:'+record.registryId,type:'registry-export',record,digest,reviewedBy:c.p.id,reviewedAt:now(),approved:true}));await c.s.db.put('registry_history',row({registryId:record.registryId,principal:c.p.id,action:'export.imported',digest,sources:record.sources}));return {registryId:record.registryId,digest};},['platform_admin']);
  route('GET','/api/admin/registry/history',async c=>paged(c,'registry_history'),['platform_admin']);
  route('POST','/api/projects/:id/registry/sync',async c=>{await c.s.project(c.p,c.params.id,true);return {jobId:(await c.s.enqueue('registry-sync',{projectId:c.params.id})).id};},['developer_admin']);
  route('POST','/api/registry/boundary',async c=>{
    ensure(c.b.name.trim().length>0&&c.b.name.length<=200&&Buffer.byteLength(c.b.kml)<=2*1024*1024,'INVALID_BOUNDARY');
    const geometry=c.s.providers.parseBoundary(c.b.kml),areaHectares=await c.s.db.boundaryArea(geometry),sha256=hash(c.b.kml),boundaryId=hash('boundary:'+c.p.organisationId+':'+sha256);
    const points=(geometry.type==='Polygon'?geometry.coordinates[0]:geometry.coordinates[0][0]) as [number,number][];
    await c.s.db.put('tokens',row({id:boundaryId,type:'boundary-upload',organisationId:c.p.organisationId,ownerId:c.p.id,name:c.b.name.trim(),geometry,sha256,areaHectares}));
    return {name:c.b.name.trim(),points,areaHectares,geometry,boundaryId,sha256};
  },dev);
  route('POST','/api/projects',async c=>c.s.createProject(c.p,text(c.b.registryRecord?.registryId??c.b.registryId),c.b.boundaryId??c.b.registryRecord?.boundaryId),['developer_admin']);
  route('POST','/api/admin/projects/:id/account',async c=>{
    const project=await c.s.required('projects',c.params.id);ensure(/^\d{10}$/.test(c.b.accountNumber??''),'INVALID_REQUEST');
    return c.s.db.lock('source-account:'+c.b.accountNumber,async tx=>{const assigned=await tx.get('tokens','source-account:'+c.b.accountNumber);ensure(!assigned||assigned.projectId===project.id,'FORBIDDEN',403);const balance=await c.s.providers.bank.call<BalanceResult>('GET',`/accounts/${c.b.accountNumber}/balance`);await tx.put('tokens',row({id:'source-account:'+c.b.accountNumber,projectId:project.id}));await tx.put('projects',{...project,sourceAccount:c.b.accountNumber,openingBalance:bankMoney(balance.available_balance)});await c.s.audit(c.p.id,'project.account_linked',project.id,{accountLastFour:c.b.accountNumber.slice(-4)});return {linked:true};});
  },['platform_admin']);
  route('GET','/api/projects',async c=>paged(c,'projects',{organisationId:c.p.organisationId}),dev);
  route('GET','/api/projects/:id',async c=>{
    const project=await c.s.project(c.p,c.params.id);
    const runs=await Promise.all((await c.s.db.list('runs',{projectId:project.id})).map(r=>runView(c.s,r)));
    return {...project,...await c.s.publicProject(project.id),commitment:(await c.s.db.list('commitments',{projectId:project.id,accepted:true})).at(-1)??null,runs};
  });
  route('GET','/api/projects/:id/boundary',async c=>{const p=await c.s.project(c.p,c.params.id);ensure(p.boundary,'BOUNDARY_NOT_AVAILABLE',409);return {boundary:p.boundary,boundaryStatus:'available'};},dev);
  route('GET','/api/projects/:id/map',async c=>{
    const p=await c.s.project(c.p,c.params.id);ensure(p.boundary,'BOUNDARY_NOT_AVAILABLE',409);
    const areaHectares=await c.s.db.boundaryArea(p.boundary);
    const captures=await c.s.db.list('participants',{projectId:p.id,...(c.p.role==='agent'?{agentId:c.p.id}:{})});
    return {boundary:p.boundary,name:p.name,synthetic:record(p.boundarySource??{}).synthetic===true,areaHectares,capturePoints:captures.filter(c=>c.point).slice(0,5000).map(c=>({point:c.point,flags:c.flags,capturedAt:c.capturedAt})),sampled:captures.length>5000};
  },[...dev,...ops,'agent']);
  route('POST','/api/projects/:id/boundary',async c=>{
    await c.s.project(c.p,c.params.id,true);const file=await c.req.file();ensure(file&&/\.kml$/i.test(file.filename),'INVALID_BOUNDARY');
    const bytes=await file.toBuffer();ensure(bytes.length<=2*1024*1024,'INVALID_BOUNDARY');const boundary=c.s.providers.parseBoundary(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    return c.s.db.lock('boundary:'+c.params.id,async tx=>{const p=await tx.get('projects',c.params.id);ensure(p,'NOT_FOUND',404);const source={sha256:hash(bytes),filename:file.filename,uploadedAt:now(),uploadedBy:c.p.id};await tx.put('projects',{...p,boundary,boundaryStatus:'available',boundarySource:source});await tx.put('registry_history',row({projectId:p.id,registryId:p.registryId,principal:c.p.id,action:'boundary.uploaded',source,before:p.boundary??null,after:boundary}));return {boundary,boundaryStatus:'available',sha256:source.sha256};});
  },dev);

  route('POST','/api/projects/:id/pdd',async c=>{
    await c.s.project(c.p,c.params.id,true);const file=await c.req.file();ensure(file?.mimetype==='application/pdf','PDD_UNREADABLE',422);
    const buffer=await file.toBuffer();ensure(buffer.subarray(0,5).toString()==='%PDF-','PDD_UNREADABLE',422);
    const parser=new PDFParse({data:buffer});try{const text=await parser.getText();ensure(text.pages.length>0&&text.pages.length<=300,'PDD_UNREADABLE',422);return {jobId:(await c.s.enqueue('extraction',{projectId:c.params.id,pages:text.pages.map(p=>p.text)})).id};}finally{await parser.destroy();}
  },dev);
  route('GET','/api/projects/:id/extraction',async c=>{await c.s.project(c.p,c.params.id);return (await c.s.db.list('commitments',{projectId:c.params.id})).at(-1)??null;},dev);
  route('GET','/api/projects/:id/extraction/status',async c=>{
    await c.s.project(c.p,c.params.id);const job=(await c.s.db.list('jobs',{type:'extraction'})).filter(job=>job.data.projectId===c.params.id).at(-1);
    return {id:job?.id??null,state:job?.state??'not_uploaded',error:job?.lastError??null,proposal:(await c.s.db.list('commitments',{projectId:c.params.id})).at(-1)??null};
  },dev);
  route('GET','/api/projects/:id/extraction/jobs/:jobId',async c=>{
    await c.s.project(c.p,c.params.id);const job=await c.s.required('jobs',c.params.jobId);ensure(job.type==='extraction'&&job.data.projectId===c.params.id,'NOT_FOUND',404);
    return {id:job.id,state:job.state,error:job.lastError??null,proposal:await c.s.db.get('commitments','extraction:'+job.id)??null};
  },dev);
  route('GET','/api/admin/extractions',async c=>list(c,(await c.s.db.list('commitments')).filter(r=>r.reviewStatus==='pending')),['platform_admin']);
  route('POST','/api/admin/extractions/:id/review',async c=>{
    const original=await c.s.required('commitments',c.params.id);ensure(c.b.reason&&typeof c.b.reason==='string','INVALID_REQUEST');
    const job=await c.s.required('jobs',original.id.replace(/^extraction:/,''));const proposal=c.b.commitment;
    ensure(proposal&&Number.isFinite(proposal.percentage)&&proposal.percentage>=0&&proposal.percentage<=100&&['gross','net'].includes(proposal.basis)&&['monthly','quarterly','annual','staged'].includes(proposal.cadence)&&Number.isInteger(proposal.page)&&typeof proposal.source_quote==='string'&&job.data.pages?.[proposal.page-1]?.includes(proposal.source_quote),'EXTRACTION_LOW_CONFIDENCE',422);
    validateCommitmentSchedule(proposal);
    const record=await c.s.db.put('commitments',row({projectId:original.projectId,percentage:proposal.percentage,basis:proposal.basis,cadence:proposal.cadence,reportingCadence:proposal.reportingCadence,paymentSchedule:proposal.paymentSchedule,sourceLocator:proposal.sourceLocator,source_quote:proposal.source_quote,page:proposal.page,beneficiary_definition:proposal.beneficiary_definition,confidence:original.confidence,reviewStatus:'developer_review',original:false,supersedes:original.id,reviewedBy:c.p.id,reason:c.b.reason,accepted:false}));await c.s.audit(c.p.id,'extraction.reviewed',original.projectId,{originalId:original.id,reviewId:record.id,reason:c.b.reason});return record;
  },['platform_admin']);
  route('PATCH','/api/projects/:id/commitment',async c=>{
    await c.s.project(c.p,c.params.id,true);const original=(await c.s.db.list('commitments',{projectId:c.params.id})).at(-1);ensure(original,'PDD_NO_COMMITMENT',422);
    ensure(['percentage','basis','cadence','reportingCadence','paymentSchedule','sourceLocator','beneficiary_definition','accepted'].includes(c.b.field)&&typeof c.b.reason==='string'&&c.b.reason.trim(),'INVALID_REQUEST');
    const next={...original,[c.b.field]:c.b.value,id:id(),createdAt:now(),original:false,supersedes:original.id,reason:c.b.reason};
    ensure(typeof next.percentage==='number'&&Number.isFinite(next.percentage)&&next.percentage>=0&&next.percentage<=100&&['gross','net'].includes(next.basis)&&['monthly','quarterly','annual','staged'].includes(next.cadence)&&typeof next.accepted==='boolean','INVALID_REQUEST');
    validateCommitmentSchedule(next);
    await c.s.audit(c.p.id,'commitment.reviewed',c.params.id,{previousId:original.id,field:c.b.field,reason:c.b.reason});return c.s.db.put('commitments',next);
  },dev);
  route('POST','/api/projects/:id/register',async c=>registerCarbon(c.s,c.p,c.params.id,c.b),dev);
  route('POST','/api/projects/:id/mrv',async c=>submitMrv(c.s,c.p,c.params.id,c.b,hash(c.p.id+':mrv:'+String(c.req.headers['idempotency-key']))),dev);
  route('GET','/api/projects/:id/mrv',async c=>listMrv(c.s,c.p,c.params.id),dev);
  route('POST','/api/projects/:id/credits/retire',async c=>retireCredits(c.s,c.p,c.params.id,c.b,hash(c.p.id+':retire:'+String(c.req.headers['idempotency-key']))),dev);
  route('GET','/api/projects/:id/certificates',async c=>certificates(c.s,c.p,c.params.id),dev);
  route('GET','/api/projects/:id/participants',async c=>{await c.s.project(c.p,c.params.id);const where:Record<string,unknown>={projectId:c.params.id};for(const [query,field]of [['status','status'],['agent','agentId'],['tier','kycLevel']])if(c.q[query])where[field]=query==='tier'?Number(c.q[query]):c.q[query];return paged(c,'participants',where,r=>({...r,phone:maskPhone(r.phone)}),{flagged:c.q.flagged==='true',search:c.q.q?{field:'name',value:c.q.q}:undefined});},dev);
  const enrolBatch=async(c:Context<{items:Record<string,unknown>[]}>)=>{ensure(Array.isArray(c.b.items)&&c.b.items.length>0&&c.b.items.length<=500,'INVALID_REQUEST');const results=[];for(const input of c.b.items){try{const p=await c.s.enrol(c.p,{...input,projectId:c.params.id??input.projectId});results.push({clientId:input.clientId,status:'success',data:{id:p.id,flags:p.flags}});}catch(e){results.push({clientId:input.clientId,status:'error',code:e instanceof Fault?e.code:'INTERNAL_ERROR'});}}return results;};
  route('POST','/api/projects/:id/participants',enrolBatch,dev);route('POST','/api/field/enrolments',enrolBatch,['agent']);
  for(const path of ['/api/participants/:id','/api/field/enrolments/:id'])route('GET',path,async c=>c.s.scoped(c.p,'participants',c.params.id),[...dev,'agent']);
  route('PATCH','/api/participants/:id',async c=>{const p=await c.s.scoped(c.p,'participants',c.params.id,true);ensure(typeof c.b.reason==='string'&&c.b.reason.trim()&&Object.keys(c.b).every(k=>['phone','status','reason'].includes(k)),'INVALID_REQUEST');if(c.b.phone)ensure(/^\+\d{8,15}$/.test(c.b.phone),'INVALID_REQUEST');if(c.b.status)ensure(['active','removed','suspended'].includes(c.b.status),'INVALID_REQUEST');await c.s.audit(c.p.id,'participant.corrected',p.projectId,{participantId:p.id,reason:c.b.reason});return c.s.db.put('participants',{...p,phone:c.b.phone??p.phone,status:c.b.status??p.status});},dev);
  app.delete('/api/participants/:id',async()=>{throw new Fault('PARTICIPANT_DELETE_NOT_PERMITTED',403);});
  route('GET','/api/participants/:id/payments',async c=>{await c.s.scoped(c.p,'participants',c.params.id);return paged(c,'transfers',{participantId:c.params.id});},dev);
  route('POST','/api/participants/:id/name-check',async c=>{const p=await c.s.scoped(c.p,'participants',c.params.id,true);const r=await c.s.providers.bank.call<NameResult>('POST',`/transfers/${p.bankCode==='000014'?'intra':'interbank'}/name-enquiry`,{account_number:p.accountNumber,destination_bank_code:p.bankCode});const match=r.account_name?nameMatch(p.name,r.account_name):'uncertain';const flags=p.flags.filter(f=>f!=='NAME_MISMATCH');if(match!=='match')flags.push('NAME_MISMATCH');await c.s.db.put('participants',{...p,resolvedAccountName:r.account_name??null,nameMatch:match,kycLevel:r.kyc_level??p.kycLevel,maskedBvn:r.bvn_masked??p.maskedBvn,flags});if(match==='uncertain'&&r.account_name)await c.s.enqueue('name-review',{participantId:p.id},'name-review:'+p.id+':'+hash(r.account_name));return {accountName:r.account_name,match,kycLevel:r.kyc_level,flags};},dev);
  const agentView=async(s:Service,a:import('./models.js').Agent)=>{
    const enrolments=await s.db.list('participants',{projectId:a.projectId,agentId:a.id});
    return {id:a.id,projectId:a.projectId,name:a.name,email:a.email,status:a.status,verification:a.verification,deviceBound:!!a.deviceKey,enrolments:enrolments.map(p=>({id:p.id,flags:p.flags,syncDelayMs:p.syncDelayMs}))};
  };
  route('GET','/api/projects/:id/agents',async c=>{await c.s.project(c.p,c.params.id);return paged(c,'agents',{projectId:c.params.id},a=>agentView(c.s,a));},dev);
  route('GET','/api/projects/:id/notifications/summary',async c=>{await c.s.project(c.p,c.params.id);const participants=await c.s.db.list('participants',{projectId:c.params.id});const notifications=await c.s.db.list('notifications',{projectId:c.params.id});const failed=new Set(notifications.filter(n=>['Failed','Rejected','Undelivered','failed','rejected'].includes(n.deliveryStatus??'')).map(n=>n.participantId));return {enrolled:participants.length,noticePending:participants.filter(p=>p.noticeStatus!=='sent').length,noReachableNumber:participants.filter(p=>!p.phone||failed.has(p.id)).length};},[...dev,...ops]);
  route('POST','/api/projects/:id/agents/invite',async c=>{await c.s.project(c.p,c.params.id,true);const code=id()+id();await c.s.db.put('invites',row({id:hash(code),projectId:c.params.id,organisationId:c.p.organisationId,name:c.b.name,email:c.b.email,expiresAt:new Date(Date.now()+2*86400_000).toISOString(),used:false,revoked:false}));return {code};},['developer_admin']);
  route('GET','/api/invites/:code',async c=>{const invite=await c.s.required('invites',hash(c.params.code));ensure(!invite.used&&!invite.revoked&&Date.parse(invite.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);return {projectId:invite.projectId,expiresAt:invite.expiresAt};},undefined,true);
  route('POST','/api/invites/:code/redeem',async c=>{
    return c.s.db.lock('invite:'+hash(c.params.code),async tx=>{
    const invite=await c.s.required('invites',hash(c.params.code));ensure(!invite.used&&!invite.revoked&&Date.parse(invite.expiresAt)>Date.now(),'TOKEN_EXPIRED',410);
    ensure(typeof c.b.identity?.email==='string'&&c.b.identity.email.toLowerCase()===invite.email.toLowerCase(),'FORBIDDEN',403);try{ensure(createPublicKey(c.b.deviceKey).asymmetricKeyType==='ed25519','INVALID_REQUEST');}catch{throw new Fault('INVALID_REQUEST');}
    const userId=hash(invite.email.toLowerCase());ensure(!await tx.get('users',userId),'DUPLICATE_REQUEST',409);
    const user=await tx.put('users',row({id:userId,email:invite.email.toLowerCase(),passwordHash:passwordHash(c.b.identity.password),role:'agent',projectId:invite.projectId,organisationId:invite.organisationId,deviceKey:c.b.deviceKey,verified:true}));await tx.put('agents',{...user,status:'pending_verification',passwordHash:undefined});await tx.put('invites',{...invite,used:true});return {id:user.id};
    });
  },undefined,true);
  route('POST','/api/invites/:code/revoke',async c=>{const i=await c.s.required('invites',hash(c.params.code));await c.s.project(c.p,i.projectId!,true);return c.s.db.put('invites',{...i,revoked:true});},['developer_admin']);
  route('GET','/api/agents/:id',async c=>{const a=await c.s.required('agents',c.params.id);await c.s.project(c.p,a.projectId!);return agentView(c.s,a);},dev);
  route('PATCH','/api/agents/:id',async c=>{const a=await c.s.required('agents',c.params.id);await c.s.project(c.p,a.projectId!,true);ensure(['active','suspended'].includes(c.b.status)&&c.b.reason,'INVALID_REQUEST');if(c.b.status==='active')ensure(a.verification?.match,'BVN_MISMATCH',422);return c.s.db.put('agents',{...a,status:c.b.status});},['developer_admin']);
  route('POST','/api/agents/:id/identity',async c=>{const agent=await c.s.scoped(c.p,'agents',c.params.id,true);ensure(/^\d{11}$/.test(c.b.bvn??''),'INVALID_REQUEST');const result=await c.s.providers.bank.call<IdentityResult>('POST','/identity/bvn/verify',{bvn:c.b.bvn,first_name:c.b.firstName,last_name:c.b.lastName,date_of_birth:c.b.dateOfBirth});const verification={match:result.match===true,confidence:result.confidence,fields:result.fields,watchlisted:result.watchlisted===true};await c.s.db.put('agents',{...agent,identityHash:identityHash(c.b.bvn),identityLastFour:c.b.bvn.slice(-4),verification,status:verification.match?'active':'pending_verification'});await c.s.audit(c.p.id,'agent.identity_verified',agent.projectId,{agentId:agent.id,match:verification.match});return verification;},['developer_admin']);
  route('POST','/api/field/device/bind',async c=>{const agent=await c.s.required('agents',c.p.id);ensure(agent.deviceKey===c.b.deviceKey,'DEVICE_UNBOUND',403);return {bound:true};},['agent']);
  route('GET','/api/field/me',async c=>agentView(c.s,await c.s.required('agents',c.p.id)),['agent']);
  const runView=async(s:Service,r:import('./models.js').Run)=>{
    const transfers=await s.db.list('transfers',{runId:r.id});
    const roster=await s.db.get('rosters',r.rosterId);
    const counts:Record<string,number>={queued:0,in_flight:0,settling:0,settled:0,failed:0,reversed:0,unconfirmed:0};
    const failures=new Map<string,number>();
    for(const t of transfers){counts[t.state]=(counts[t.state]??0)+1;if(t.state==='failed'&&t.failureClass)failures.set(t.failureClass,(failures.get(t.failureClass)??0)+1);}
    const settled=transfers.filter(t=>t.state==='settled'),received=settled.reduce((n,t)=>n+cents(t.amount),0n),charges=settled.reduce((n,t)=>n+cents(t.fee)+cents(t.vat)+cents(t.stampDuty),0n);
    const calculation=r.arithmetic??await s.arithmetic(r),required=cents(calculation.required),settledIds=new Set(settled.map(t=>t.id)),confirmations=(await s.db.list('confirmations',{projectId:r.projectId})).filter(c=>settledIds.has(c.transferId));
    const periodSummary={period:r.period,state:'open',enrolled:roster?.participantIds.length??0,paid:new Set(settled.map(t=>t.participantId)).size,amountToHouseholds:money(received),chargesBorne:money(charges),required:calculation.required,shortfall:money(required>received?required-received:0n),surplus:money(received>required?received-required:0n),closesOn:r.closesAt,closedAt:null,attestationId:null,corrected:false,confirmationRate:settled.length?confirmations.length/settled.length:0};
    return {...r,periodSummary,rosterSize:roster?.participantIds.length??0,counts,failures:[...failures].map(([failureClass,count])=>({class:failureClass,count}))};
  };
  route('GET','/api/projects/:id/runs',async c=>{await c.s.project(c.p,c.params.id);return paged(c,'runs',{projectId:c.params.id},r=>runView(c.s,r));},dev);
  route('POST','/api/projects/:id/runs',async c=>c.s.createRun(c.p,c.params.id,c.b),dev);
  route('GET','/api/runs/:id',async c=>runView(c.s,await c.s.scoped(c.p,'runs',c.params.id)),dev);
  route('GET','/api/runs/:id/arithmetic',async c=>c.s.arithmetic(await c.s.scoped(c.p,'runs',c.params.id)),dev);
  route('POST','/api/runs/:id/preflight',async c=>c.s.preflight(await c.s.scoped(c.p,'runs',c.params.id,true),c.b.exclusions??[]),dev);
  route('POST','/api/runs/:id/execute',async c=>{const run=await c.s.scoped(c.p,'runs',c.params.id,true);ensure(run.state==='funded'||['executing','complete','partially_complete'].includes(run.state),'PREFLIGHT_EXCLUSIONS_REQUIRED',422);return {jobId:(await c.s.enqueue('execute',{runId:run.id},'execute:'+run.id)).id};},dev);
  route('POST','/api/runs/:id/requery',async c=>{await c.s.scoped(c.p,'runs',c.params.id,true);return c.s.requery(c.params.id,c.b.transferId);},dev);
  route('POST','/api/runs/:id/retry',async c=>{await c.s.scoped(c.p,'runs',c.params.id,true);ensure(['INSUFFICIENT_FUNDS','BANK_UNAVAILABLE','ACCOUNT_RESTRICTED','LIMIT_EXCEEDED'].includes(c.b.failureClass),'INVALID_REQUEST');return {jobId:(await c.s.enqueue('retry',{runId:c.params.id,failureClass:c.b.failureClass})).id};},dev);
  route('POST','/api/runs/:id/cancel',async c=>{const r=await c.s.scoped(c.p,'runs',c.params.id,true);ensure(['draft','funded','preflight_failed'].includes(r.state),'INVALID_REQUEST',409);return c.s.db.put('runs',{...r,state:'cancelled'});},dev);
  route('GET','/api/runs/:id/transfers',async c=>{await c.s.scoped(c.p,'runs',c.params.id);return paged(c,'transfers',{runId:c.params.id},r=>({...r,accountNumber:'******'+r.accountNumber.slice(-4)}));},dev);
  app.get('/api/runs/:id/stream',async(req,reply)=>{
    const p=await session(db,req.headers.authorization,req.headers.cookie);ensure(dev.includes(p.role),'FORBIDDEN',403);const run=await root.scoped(p,'runs',(req.params as {id:string}).id);
    reply.hijack();reply.raw.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no',Connection:'keep-alive'});
    reply.raw.flushHeaders();reply.raw.write(': connected\n\n');
    const send=(event:Row)=>reply.raw.write(`id: ${event.id}\ndata: ${JSON.stringify({type:event.type,transferId:event.transferId??undefined})}\n\n`);
    let cursor=String(req.headers['last-event-id']??''),polling=false,initialized=false;
    const poll=async()=>{
      if(polling)return;polling=true;
      try{
        const records=await db.list('events',{runId:run.id});const index=records.findIndex(e=>e.id===cursor);
        if(initialized||index>=0){for(const event of records.slice(index+1))send(event);}
        else{
          for(const t of await db.list('transfers',{runId:run.id}))send(row({id:'snapshot:'+t.id+':'+t.state,type:'transfer.'+t.state,transferId:t.id}));
          if((await db.get('runs',run.id))?.state==='complete')send(row({id:'snapshot:'+run.id,type:'run.complete'}));
        }
        cursor=records.at(-1)?.id??cursor;initialized=true;
      }catch{reply.raw.end();}finally{polling=false;}
    };
    await poll();const timer=setInterval(poll,2000);const heartbeat=setInterval(()=>reply.raw.write(': heartbeat\n\n'),15000);
    const expiry=setInterval(async()=>{try{await session(db,req.headers.authorization,req.headers.cookie);}catch{reply.raw.end();}},60000);
    const lifetime=process.env.VERCEL?setTimeout(()=>reply.raw.end(),25000):undefined;
    reply.raw.on('close',()=>{clearInterval(timer);clearInterval(heartbeat);clearInterval(expiry);if(lifetime)clearTimeout(lifetime);});
  });
  route('GET','/api/tariff',async c=>c.s.providers.bank.call('GET','/tariff'),dev);
  for(const suffix of ['funding','reconciliation'])route('GET',`/api/projects/:id/${suffix}`,async c=>{
    const p=await c.s.project(c.p,c.params.id);ensure(p.sourceAccount,'FUNDING_NOT_RECEIVED',422);
    const reconciliation=await c.s.reconciliation(p.id);
    if(suffix==='reconciliation')return reconciliation;
    const payments=await c.s.db.list('notifications',{projectId:p.id,type:'funding'});
    return {accountNumber:p.sourceAccount,accountName:'Linked project source account',bank:'Configured banking provider',inbound:payments.map(n=>({reference:n.id,amount:n.amount,receivedAt:n.createdAt})),funded:reconciliation.inbound,outbound:reconciliation.outbound,charges:reconciliation.charges,balance:reconciliation.bankBalance};
  },dev);
  route('POST','/api/disputes',async c=>{const d=await c.s.dispute(c.b);return {id:d.id,status:d.status};},undefined,true);
  route('GET','/api/projects/:id/disputes',async c=>{await c.s.project(c.p,c.params.id);return paged(c,'disputes',{projectId:c.params.id});},dev);
  route('GET','/api/disputes/:id',async c=>c.s.scoped(c.p,'disputes',c.params.id),dev);
  route('POST','/api/disputes/:id/respond',async c=>{const d=await c.s.scoped(c.p,'disputes',c.params.id,true);ensure(!c.b.status&&!c.b.resolutionBasis,'DISPUTE_RESOLUTION_BASIS_REQUIRED',403);ensure(typeof c.b.body==='string'&&c.b.body.length<=4000,'INVALID_REQUEST');await c.s.audit(c.p.id,'dispute.response',d.projectId,{disputeId:d.id,body:c.b.body});return c.s.db.put('disputes',{...d,status:'developer_responded'});},dev);
  route('GET','/api/projects/:id/attestations',async c=>{await c.s.project(c.p,c.params.id);return paged(c,'attestations',{projectId:c.params.id},a=>c.s.attestationView(a));},dev);
  route('GET','/api/attestations/:id',async c=>c.s.attestationView(await c.s.scoped(c.p,'attestations',c.params.id)),dev);
  app.get('/api/attestations/:id/report',async(req,reply)=>{
    const p=await session(db,req.headers.authorization,req.headers.cookie);ensure([...dev,'verifier'].includes(p.role),'FORBIDDEN',403);
    const a=await root.required('attestations',(req.params as {id:string}).id);if(p.role!=='verifier')await root.project(p,a.projectId);
    const query=queryValues(req.query??{}),format=query.format??(String(req.headers.accept??'').split(',')[0].split(';')[0].trim()==='application/pdf'?'pdf':'json');ensure(['json','pdf'].includes(format),'INVALID_REQUEST');reply.header('Vary','Accept');
    const report=await benefitSharingReport(root,a.id);if(format==='json')return ok(req,report);
    await root.audit(p.id,'benefit_report.downloaded',a.projectId,{attestationId:a.id});return reply.type('application/pdf').header('Content-Disposition',`attachment; filename="benefit-sharing-${a.hash.slice(0,16)}.pdf"`).send(await benefitSharingPdf(report));
  });
  route('GET','/api/attestations/:id/benefit-sharing',async c=>{const a=await c.s.required('attestations',c.params.id);if(c.p.role!=='verifier')await c.s.project(c.p,a.projectId);return benefitSharingReport(c.s,a.id);},[...dev,'verifier']);
  app.get('/api/attestations/:id/benefit-sharing/pdf',async(req,reply)=>{const p=await session(db,req.headers.authorization,req.headers.cookie);ensure([...dev,'verifier'].includes(p.role),'FORBIDDEN',403);const a=await root.required('attestations',(req.params as {id:string}).id);if(p.role!=='verifier')await root.project(p,a.projectId);const report=await benefitSharingReport(root,a.id);await root.audit(p.id,'benefit_report.downloaded',a.projectId,{attestationId:a.id});return reply.type('application/pdf').header('Content-Disposition',`attachment; filename="benefit-sharing-${a.hash.slice(0,16)}.pdf"`).send(await benefitSharingPdf(report));});
  route('POST','/api/attestations/:id/disclosure',async c=>c.s.disclosure(await c.s.scoped(c.p,'attestations',c.params.id),c.b.transferId),dev);
  const pdfBytes=async(a:import('./models.js').Attestation)=>db.lock('pdf:'+a.hash,async tx=>{const cached=await tx.get('tokens','pdf:'+a.hash);if(cached)return Buffer.from(cached.bytes!,'base64');const bytes=await attestationPdf(a);await tx.put('tokens',row({id:'pdf:'+a.hash,bytes:bytes.toString('base64'),fileHash:hash(bytes)}));return bytes;});
  app.get('/api/public/attestations/:id/pdf',async(req,reply)=>{const a=await root.required('attestations',(req.params as {id:string}).id);return reply.type('application/pdf').header('Content-Disposition',`attachment; filename="attestation-${a.hash.slice(0,16)}.pdf"`).send(await pdfBytes(a));});
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
  route('POST','/api/ops/signals/scan',async c=>{await c.s.required('projects',c.b.projectId);ensure(Array.isArray(c.b.flows)&&c.b.flows.length<=5000,'INVALID_REQUEST');for(const f of c.b.flows){ensure(typeof f.participantId==='string'&&typeof f.to==='string'&&Number.isFinite(Date.parse(f.receivedAt))&&Number.isFinite(Date.parse(f.sentAt)),'INVALID_REQUEST');ensure((await c.s.required('participants',f.participantId)).projectId===c.b.projectId,'FORBIDDEN',403);if(f.amount)bankMoney(f.amount);}return {jobId:(await c.s.enqueue('signals',{projectId:c.b.projectId,flows:c.b.flows})).id};},ops);
  route('GET','/api/public/register',async c=>paged(c,'projects',c.q.country?{country:c.q.country}:{},p=>c.s.publicProject(p.id),{search:c.q.q?{field:'name',value:c.q.q}:undefined}),undefined,true);
  route('GET','/api/public/projects/:id',async c=>c.s.publicProject(c.params.id),undefined,true);
  route('GET','/api/public/developers/:id',async c=>({projects:await Promise.all((await c.s.db.list('projects',{organisationId:c.params.id})).map(p=>c.s.publicProject(p.id)))}),undefined,true);
  route('GET','/api/public/attestations/:id',async c=>c.s.attestationView(await c.s.required('attestations',c.params.id)),undefined,true);
  route('GET','/api/public/projects/:id/geography',async c=>c.s.geography(c.params.id),undefined,true);
  route('GET','/api/verifier/projects/:id',async c=>c.s.publicProject(c.params.id),['verifier']);
  route('GET','/api/verifier/compare',async c=>{const ids=String(c.q.ids??'').split(',');ensure(ids.length<=10,'INVALID_REQUEST');return Promise.all(ids.map(id=>c.s.publicProject(id)));},['verifier']);
  for(const table of ['watchlist','alerts'] as const){route('GET',`/api/verifier/${table}`,async c=>{const values=await c.s.db.list(table,{userId:c.p.id});return list(c,table==='watchlist'?await Promise.all(values.map(v=>c.s.publicProject(v.projectId!))):values);},['verifier']);route('POST',`/api/verifier/${table}`,async c=>{await c.s.required('projects',c.b.projectId);if(table==='alerts'){ensure(['coverage_below','dispute_raised','period_closed_late','correction_issued'].includes(c.b.condition??''),'INVALID_REQUEST');if(c.b.condition==='coverage_below')ensure(typeof c.b.threshold==='number'&&Number.isFinite(c.b.threshold)&&c.b.threshold>=0&&c.b.threshold<=100,'INVALID_REQUEST');}return c.s.db.put(table,row({...table==='watchlist'?{id:hash(c.p.id+':watch:'+c.b.projectId)}:{},kind:'rule',userId:c.p.id,projectId:c.b.projectId,condition:c.b.condition,threshold:c.b.threshold}));},['verifier']);}
  route('POST','/api/participants/:id/receipts/revoke',async c=>{const p=await c.s.scoped(c.p,'participants',c.params.id,true);ensure(c.b.reason,'INVALID_REQUEST');const receipts=await c.s.db.list('receipts',{participantId:p.id});for(const receipt of receipts)await c.s.db.put('receipts',{...receipt,revoked:true});await c.s.audit(c.p.id,'receipt.revoked',p.projectId,{participantId:p.id,reason:c.b.reason});return {revoked:receipts.length};},dev);
  route('POST','/api/verifier/export',async c=>{
    ensure(typeof c.b.projectId==='string'&&typeof c.b.period==='string','INVALID_REQUEST');await c.s.required('projects',c.b.projectId);
    const a=await c.s.db.list('attestations',{projectId:c.b.projectId,period:c.b.period});ensure(a.length<=100,'INVALID_REQUEST');
    if(c.b.format==='csv'){
      const escape=(v:unknown)=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
      const columns=['period','enrolledCount','paidCount','amountCommitted','amountMovedToHouseholds','chargesBorne','shortfall','closedAt'] as const;
      const content=[[...columns,'hash','signature','isDemonstration','paymentData','demonstrationNotice'].map(escape).join(','),...a.map(r=>{const disclosure=c.s.publicAttestation(r);return [...columns.map(k=>r.document[k]),r.hash,r.signature,disclosure.isDemonstration,disclosure.paymentData,disclosure.demonstrationNotice].map(escape).join(',');})].join('\r\n');return {format:'csv',contentType:'text/csv',content};
    }
    if(c.b.format==='pdf')return {format:'pdf',downloads:a.map(r=>({attestationId:r.id,url:`/api/attestations/${r.id}/report?format=pdf`}))};
    ensure(!c.b.format||c.b.format==='json','INVALID_REQUEST');return {format:'json',attestations:a.map(r=>c.s.publicAttestation(r)),reports:await Promise.all(a.map(r=>benefitSharingReport(c.s,r.id)))};
  },['verifier']);
  route('GET','/api/ops/signals',async c=>paged(c,'signals',c.q.class?{class:c.q.class}:{}),ops);
  route('GET','/api/ops/signals/:id',async c=>c.s.required('signals',c.params.id),ops);
  route('GET','/api/ops/signals/:id/graph',async c=>{const s=await c.s.required('signals',c.params.id);const edges=s.detail.edges??(s.detail.to?s.participantIds.map((id:string)=>({from:id,to:s.detail.to})):[]);const ids=new Set<string>(s.participantIds);for(const edge of edges){ids.add(edge.from);if(edge.to)ids.add(edge.to);}return {nodes:[...ids].map(id=>({id})),edges,sampled:s.detail.sampled??true};},ops);
  route('GET','/api/ops/cases',async c=>paged(c,'cases'),ops);
  route('POST','/api/ops/cases/:id/action',async c=>{const r=await c.s.required('cases',c.params.id);ensure(['request_documentation','escalate','clear','substantiated','freeze','unfreeze'].includes(c.b.action)&&typeof c.b.note==='string'&&c.b.note.trim().length>0&&c.b.note.length<=4000,'INVALID_REQUEST');if(['freeze','unfreeze'].includes(c.b.action)){const signal=await c.s.required('signals',r.signalId);for(const participantId of signal.participantIds)await c.s.enqueue('account-control',{participantId,action:c.b.action,caseId:r.id,reason:c.b.note});}const updated=await c.s.db.put('cases',{...r,status:c.b.action==='clear'?'unsubstantiated':c.b.action,actions:[...r.actions,{action:c.b.action,note:c.b.note,at:now(),by:c.p.id}]});await c.s.audit(c.p.id,'case.action',r.projectId,{caseId:r.id,action:c.b.action});if(c.b.action==='substantiated')for(const run of await c.s.db.list('runs',{projectId:r.projectId}))await c.s.enqueue('correction',{projectId:r.projectId,runId:run.id,reason:'substantiated_case'},'case-correction:'+r.id+':'+run.id);return updated;},ops);
  route('POST','/api/ops/projects/:id/onward-sync',async c=>{await c.s.required('projects',c.params.id);return {jobId:(await c.s.enqueue('onward-sync',{projectId:c.params.id})).id};},ops);
  route('GET','/api/ops/exceptions',async c=>paged(c,'participants',{},p=>({id:p.id,projectId:p.projectId,flags:p.flags}),{flagged:true}),ops);
  route('GET','/api/ops/reconciliation',async c=>list(c,await Promise.all((await c.s.db.list('projects')).filter(p=>p.sourceAccount).map(p=>c.s.reconciliation(p.id)))),ops);
  route('POST','/api/ops/webhooks/recover',async c=>c.s.recoverWebhooks(),ops);
  route('GET','/api/ops/jobs',async c=>paged(c,'jobs',c.q.state?{state:c.q.state}:{},j=>({id:j.id,type:j.type,state:j.state,attempts:j.attempts,nextAt:j.nextAt,lastError:j.lastError??null,projectId:j.data.projectId??null})),ops);
  route('GET','/api/ops/capabilities',async()=>({accountControl:!!process.env.BANK_ACCOUNT_CONTROL_PATH,onwardFlows:!!process.env.BANK_FLOW_PATH}),ops);
  route('POST','/api/admin/webhooks/register',async c=>{const url=new URL('/hooks/forge',process.env.PUBLIC_URL??'http://localhost:8080');ensure(url.protocol==='https:'||process.env.BANK_PROVIDER!=='live','INVALID_REQUEST');const result=await c.s.providers.bank.call<WebhookRegistration>('POST','/webhooks',{url:url.toString(),events:['transfer.pending','transfer.successful','transfer.failed','transfer.reversed','transfer.bulk.completed','virtual_account.credited','settlement.completed','carbon.mrv.verified','carbon.mrv.rejected','carbon.credits.retired']});ensure(typeof result.webhook_secret==='string','INVALID_BANK_RESPONSE',502);await c.s.db.put('tokens',row({id:'forge-webhook-secret',secret:result.webhook_secret}));return {registered:true,id:result.id};},['platform_admin']);
  route('GET','/api/receipt/:token',async c=>{const r=await c.s.receipt(c.params.token);const t=await c.s.required('transfers',r.transferId);return {projectId:r.projectId,amount:t.amount,settledAt:t.settledAt,state:t.state,confirmed:(await c.s.db.list('confirmations',{transferId:t.id})).length>0};},undefined,true);
  route('POST','/api/receipt/:token/confirm',async c=>{await c.s.confirm(await c.s.receipt(c.params.token));return {confirmed:true};},undefined,true);
  route('POST','/api/receipt/:token/dispute',async c=>{const d=await c.s.dispute(c.b,await c.s.receipt(c.params.token));return {id:d.id,status:d.status};},undefined,true);
  route('POST','/hooks/forge',async c=>{
    const configuredSecret=process.env.FORGE_WEBHOOK_SECRET??(await c.s.db.get('tokens','forge-webhook-secret'))?.secret??'';
    ensure(verifyWebhook(c.req.rawBody??'',String(c.req.headers['x-forge-timestamp']??''),String(c.req.headers['x-forge-signature']??''),configuredSecret),'FORBIDDEN',403);
    ensure(typeof c.b.event_id==='string'&&c.b.event_id.length<=200&&typeof(c.b.event??c.b.type)==='string','INVALID_REQUEST');const eventType=String(c.b.event??c.b.type);ensure(!c.b.event||!c.b.type||c.b.event===c.b.type,'INVALID_REQUEST');ensure(!c.req.headers['x-forge-event']||c.req.headers['x-forge-event']===eventType,'INVALID_REQUEST');record(c.b.data);
    await c.s.db.lock('event:'+c.b.event_id,async tx=>{if(await tx.get('events',c.b.event_id))return;await tx.put('events',row({id:c.b.event_id,type:eventType}));await tx.put('jobs',row({id:'event:'+c.b.event_id,type:'forge-event',data:{...c.b,type:eventType},state:'pending',attempts:0,nextAt:now()}));});return {accepted:true};
  },undefined,true);
  const callback=async(c:Pick<Context,'req'>)=>{ensure(process.env.AT_CALLBACK_SECRET&&c.req.headers.authorization===`Bearer ${process.env.AT_CALLBACK_SECRET}`,'FORBIDDEN',403);};
  route('POST','/api/webhooks/sms-delivery',async c=>{await callback(c);const n=(await c.s.db.list('notifications',{providerMessageId:c.b.id}))[0];if(n)await c.s.db.put('notifications',{...n,deliveryStatus:c.b.status});return {accepted:true};},undefined,true);
  const participantAction=async(c:Pick<Context,'s'>,text:string,phone:string,projectId?:string,language='en')=>{
    const copy=translation(language);
    const participants=await c.s.db.list('participants',projectId?{phone,projectId}:{phone});if(participants.length>1)return 'You are enrolled in multiple projects. Use USSD to select a project.';ensure(participants.length===1,'NOT_FOUND',404);const p=participants[0];
    const transfers=(await c.s.db.list('transfers',{participantId:p.id})).filter(t=>t.state==='settled');const last=transfers.at(-1);
    const action=parseSms(text);
    if(action==='confirm'){ensure(last,'NOT_FOUND',404);await c.s.confirm(row({projectId:p.projectId,participantId:p.id,transferId:last.id}));return copy.confirmed;}
    if(action==='dispute'){ensure(last,'NOT_FOUND',404);await c.s.dispute({category:'not_received'},row({projectId:p.projectId,participantId:p.id,transferId:last.id}));return copy.reported;}
    return last?`NGN ${last.amount}. ${copy.menu}`:copy.enrolled+' '+copy.none;
  };
  route('POST','/api/webhooks/sms-inbound',async c=>{await callback(c);let message:string;try{message=await participantAction(c,c.b.text??'',c.b.from);}catch(error){if(error instanceof Fault&&error.code==='ALREADY_CONFIRMED')message=translation('en').confirmed;else if(error instanceof Fault&&error.code==='DISPUTE_ALREADY_OPEN')message=translation('en').reported;else throw error;}const participant=(await c.s.db.list('participants',{phone:c.b.from}))[0];if(participant)await c.s.enqueue('sms-reply',{participantId:participant.id,message},'sms-inbound:'+hash(c.b.id??canonical(c.b)));return {message};},undefined,true);
  app.post('/api/webhooks/ussd',async(req,reply)=>{
    const c={s:root,req};await callback(c);const b=record(req.body);
    ensure(typeof b.sessionId==='string'&&typeof b.phoneNumber==='string'&&/^\+\d{8,15}$/.test(b.phoneNumber)&&typeof b.text==='string','INVALID_REQUEST');
    reply.type('text/plain');const sessionId='ussd:'+hash(b.sessionId),previous=await db.get('tokens',sessionId);
    if(previous&&previous.phoneHash!==hash(b.phoneNumber))throw new Fault('FORBIDDEN',403);
    if(previous&&Date.parse(previous.expiresAt??'')<=Date.now())return 'END '+translation(previous.language??'en').timeout;
    const allowed=enabledLanguages();const parts=b.text.split('*');const language=allowed[Number(parts[0])-1]??'en';const copy=translation(language);
    if(!previous)await db.put('tokens',row({id:sessionId,phoneHash:hash(b.phoneNumber),language,expiresAt:new Date(Date.now()+180000).toISOString()}));
    if(!b.text)return 'CON Select language\n'+allowed.map((l,i)=>(i+1)+'. '+({en:'English',yo:'Yoruba',ha:'Hausa',ig:'Igbo'}[l])).join('\n');
    if(!allowed[Number(parts[0])-1])return 'END Invalid selection.';
    const participants=await root.db.list('participants',{phone:b.phoneNumber});if(!participants.length)return 'END '+copy.notFound;
    if(participants.length>1){
      if(parts.length===1){const names=await Promise.all(participants.map(async(p,i)=>(i+1)+'. '+(await root.required('projects',p.projectId!)).name));return 'CON Select project\n'+names.join('\n');}
      const selected=participants[Number(parts[1])-1];if(!selected)return 'END Invalid selection.';
      if(parts.length===2)return 'CON '+copy.menu;
      if(!['1','2','3','4'].includes(parts.at(-1)!))return 'END Invalid selection.';
      try{return 'END '+await participantAction(c,parts.at(-1)!,b.phoneNumber,selected.projectId,language);}catch(error){if(error instanceof Fault&&error.code==='ALREADY_CONFIRMED')return 'END '+copy.confirmed;if(error instanceof Fault&&error.code==='DISPUTE_ALREADY_OPEN')return 'END '+copy.reported;if(error instanceof Fault&&error.code==='NOT_FOUND')return 'END '+copy.none;throw error;}
    }
    if(parts.length===1)return 'CON '+copy.menu;
    if(!['1','2','3','4'].includes(parts.at(-1)!))return 'END Invalid selection.';
    try{return 'END '+await participantAction(c,parts.at(-1)!,b.phoneNumber,participants[0].projectId,language);}catch(error){if(error instanceof Fault&&error.code==='ALREADY_CONFIRMED')return 'END '+copy.confirmed;if(error instanceof Fault&&error.code==='DISPUTE_ALREADY_OPEN')return 'END '+copy.reported;if(error instanceof Fault&&error.code==='NOT_FOUND')return 'END '+copy.none;throw error;}
  });
  if((typeof __ATTEST_DEV__==='undefined'?process.env.NODE_ENV!=='production':__ATTEST_DEV__)&&process.env.ENABLE_DEV_TOOLS==='1'){const {registerDevTools}=await import('./dev-tools.js');await registerDevTools(app,root);}
  return app;
}
