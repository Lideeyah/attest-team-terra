/* Explicit conversion of implemented backend DTOs to the existing presentation
   models. Financial values are never estimated here. Missing evidence stays absent. */
type Row = Record<string, unknown>;
import { cellToLatLng, isValidCell } from "h3-js";
const row=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.map(row):[];
const text=(v:unknown,fallback=''):string=>typeof v==='string'?v:fallback;
const vBoolean=(v:unknown):boolean=>v===true;
const count=(v:unknown):number=>typeof v==='number'&&Number.isFinite(v)?v:0;
const money=(v:unknown):string=>typeof v==='string'&&/^-?\d+\.\d{2}$/.test(v)?v:'Unavailable';
const state=(v:unknown)=>text(v).replaceAll('_','-');
const emptyCounts=()=>({queued:0,in_flight:0,settling:0,settled:0,failed:0,reversed:0,unconfirmed:0});

export function commitment(v:unknown) {
  const c=row(v);return {...c,percentage:count(c.percentage),basis:text(c.basis,'gross'),cadence:text(c.cadence,'annual'),beneficiary:text(c.beneficiary_definition??c.beneficiary),sourceQuote:text(c.source_quote??c.sourceQuote),page:count(c.page),section:c.sourceLocator??null,confidence:count(c.confidence),corrected:!!c.supersedes,originalPercentage:null,correctionReason:c.reason??null};
}
export function attestation(v:unknown) {
  const a=row(v),d=row(a.document),anchor=row(a.anchor);
  const paid=count(d.paidCount);
  return {...a,id:text(a.id),document:d,projectId:text(d.projectId),projectName:text(a.projectName,'Project settlement record'),period:text(d.period),enrolled:count(d.enrolledCount),paid,amountToHouseholds:money(d.amountMovedToHouseholds),chargesBorne:money(d.chargesBorne),required:money(d.amountCommitted),shortfall:money(d.shortfall),confirmationRate:paid?count(d.confirmationCount)/paid:0,hash:text(a.hash),previousHash:d.previousHash??null,merkleRoot:text(d.merkleRoot),chainPosition:count(a.chainPosition),anchor:{network:text(anchor.provider,'Not yet verified'),topicId:text(anchor.reference),sequence:null,at:anchor.timestamp??null},anchorState:anchor.status==='anchored'?'anchored':'pending',chainBreak:vBoolean(a.chainBreak),supersedes:d.supersedes??null,supersededBy:a.supersededBy??null,closedAt:text(d.closedAt),closedLate:false};
}
export function project(v:unknown) {
  const p=row(v),records=rows(p.attestations).map(attestation),current=records.filter(a=>!records.some(b=>b.supersedes===a.id)),latest=current.at(-1);
  const periods=current.map(a=>({period:a.period,state:'closed',enrolled:a.enrolled,paid:a.paid,amountToHouseholds:a.amountToHouseholds,chargesBorne:a.chargesBorne,required:a.required,shortfall:a.shortfall,surplus:'0.00',closesOn:a.closedAt,closedAt:a.closedAt,attestationId:a.id,corrected:!!a.supersedes,confirmationRate:a.confirmationRate}));
  for(const r of rows(p.runs))if(!periods.some(a=>a.period===r.period)){if(r.periodSummary){periods.push(row(r.periodSummary) as typeof periods[number]);continue;}periods.push({period:text(r.period),state:'open',enrolled:count(p.enrolled),paid:0,amountToHouseholds:'0.00',chargesBorne:'0.00',required:money(row(r.arithmetic).required),shortfall:money(row(r.arithmetic).shortfall),surplus:'0.00',closesOn:text(r.closesAt),closedAt:'',attestationId:'',corrected:false,confirmationRate:0});}
  return {...p,id:text(p.id),developerId:text(p.organisationId),developerName:text(p.operator??p.organisationName,'Project operator'),registry:text(p.registry,'Registry of record'),registryId:text(p.registryId),country:text(p.country),state:text(p.state),localGovernment:text(p.localGovernment),methodology:text(p.methodology),status:text(p.status,'onboarding'),commitment:commitment(p.commitment),enrolled:count(p.enrolled),enrolmentTarget:count(p.enrolmentTarget),paid:latest?.paid??0,openDisputes:count(p.openDisputes),substantiatedDisputes:latest?count(row(latest.document).disputesSubstantiated):0,signalCount:count(p.signalCount),confirmationRate:latest?.confirmationRate??0,lastClosedPeriod:latest?.period??null,periods};
}
function register(v:unknown){const p=project(v),latest=p.periods.filter(p=>p.state==='closed').at(-1);return {...p,commitmentPct:p.commitment.percentage,lastClosedPaid:latest?.paid??0,lastClosedEnrolled:latest?.enrolled??0,lastClosedConfirmationRate:latest?.confirmationRate??0};}
function participant(v:unknown){const p=row(v);return {...p,phoneMasked:text(p.phone),community:text(p.community,'Not recorded'),localGovernment:text(p.localGovernment),walletState:p.accountNumber?'active':'unopened',tier:count(p.kycLevel),accountName:text(p.resolvedAccountName),nameMatch:p.nameMatch==='uncertain'?'unchecked':p.nameMatch,bvnLastFour:p.identityType==='bvn'?text(p.identityLastFour):'',ninLastFour:p.identityType==='nin'?text(p.identityLastFour):'',enrolledAt:text(p.capturedAt),syncDelaySeconds:count(p.syncDelayMs)/1000,agentName:text(p.agentName,'Recorded agent'),status:p.status==='active'&&Array.isArray(p.flags)&&p.flags.length?'flagged':p.status,statusReason:null,boundary:Array.isArray(p.flags)&&p.flags.includes('BOUNDARY_OUTSIDE')?'outside':'inside',flags:Array.isArray(p.flags)?p.flags:[]};}
function agent(v:unknown){const a=row(v),captures=rows(a.enrolments),n=captures.length;return {...a,enrolments:n,flagRate:n?captures.filter(p=>Array.isArray(p.flags)&&p.flags.length).length/n:0,averageSyncDelaySeconds:n?captures.reduce((n,p)=>n+count(p.syncDelayMs),0)/n/1000:0,status:a.status==='pending_verification'?'invited':a.status,aboveFlagThreshold:false,deviceBound:a.deviceBound===true||!!a.deviceKey};}
function transfer(v:unknown){const t=row(v);return {...t,participantName:text(t.participantName,'Household payment'),community:text(t.community),stamp_duty:money(t.stampDuty),total_debit:money(t.totalDebit),failureClass:t.failureClass??null,sessionId:t.sessionId??null,queuedAt:text(t.submittedAt??t.createdAt),settledAt:t.settledAt??null,confirmedAt:t.confirmedAt??null,rail:t.bankCode==='000014'?'intrabank':'interbank'};}
function run(v:unknown){const r=row(v);return {...r,state:state(r.state),rosterSize:count(r.rosterSize),counts:r.counts??emptyCounts(),failures:r.failures??[],executedAt:r.executedAt??null};}
function dispute(v:unknown){const d=row(v);return {...d,projectName:text(d.projectName,'Project report'),participantName:null,period:text(d.period),category:state(d.category),state:state(d.status),resolutionBasis:d.resolutionBasis??null,raisedAt:text(d.createdAt),updatedAt:text(d.updatedAt??d.createdAt),responses:d.responses??[]};}
function report(v:unknown){const r=row(v),p=row(r.project),c=row(r.commitment),a=attestation(r.attestation),coverage=row(r.coverage),d=row(row(r.attestation).document);return {...r,projectId:p.id,projectName:p.name,registry:p.registry,registryId:p.registryId,period:a.period,commitment:c,enrolled:coverage.enrolled,paid:coverage.paid,coveragePercent:coverage.percentage,amountToHouseholds:a.amountToHouseholds,chargesBorne:a.chargesBorne,shortfall:a.shortfall,confirmations:d.confirmationCount,disputesOpenAtClose:d.disputesOpen,disputesSubstantiated:d.disputesSubstantiated,merkleRoot:a.merkleRoot,attestationHash:a.hash,anchor:a.anchor};}
function reconciliation(v:unknown){const r=row(v);return {...r,id:text(r.id??r.projectId),projectName:text(r.projectName,'Project account'),period:'Account lifetime',balance:money(r.bankBalance),charges:money(r.charges),state:r.status==='matched'?'reconciled':r.status==='mismatch'?'mismatch':'awaiting-settlement',difference:r.difference,delta:money(r.difference),candidateCauses:Array.isArray(r.candidateCauses)?r.candidateCauses.filter(c=>typeof c==='string'):[]};}

export function adaptResponse(path:string,value:unknown):unknown {
  const v=row(value);
  if(path==='/api/auth/session'){const roles:Record<string,string>={developer_admin:'developer',developer_operator:'developer',verifier:'institution',bank_ops:'ops',platform_admin:'admin',agent:'agent'};return {...v,userId:v.id,email:text(v.email),organisation:text(v.organisation??v.organisationId),backendRole:v.role,role:roles[text(v.role)],emailVerified:true};}
  if(path==='/api/public/register')return rows(value).map(register);
  if(path==='/api/verifier/watchlist')return rows(value).map(register);
  if(path==='/api/verifier/alerts')return rows(value).map(a=>({...a,condition:state(a.condition),threshold:count(a.threshold)/100,firedAt:a.kind==='event'?a.createdAt:null,record:row(a.evidence).attestationHash??null}));
  if(path.endsWith('/geography'))return {resolution:4,buckets:rows(value).filter(b=>isValidCell(text(b.cell))).map(b=>{const [lat,lng]=cellToLatLng(text(b.cell));return {h3:b.cell,centroid:[lng,lat],households:count(b.count)};})};
  if(/^\/api\/public\/projects\/[^/]+$/.test(path)){const p=project(v);return {project:p,attestations:rows(v.attestations).map(attestation),disputes:{open:p.openDisputes,substantiated:p.substantiatedDisputes},signals:p.signalCount};}
  if(/^\/api\/public\/developers\//.test(path)){const projects=rows(v.projects).map(project);return {developerId:path.split('/').at(-1),developerName:'Project operator',projects,aggregate:{enrolled:projects.reduce((n,p)=>n+p.enrolled,0),paid:projects.reduce((n,p)=>n+p.paid,0)}};}
  if(/^\/api\/verifier\/projects\//.test(path))return {project:project(v),attestations:rows(v.attestations).map(attestation),signals:count(v.signalCount),agentFlagRates:[],geography:[]};
  if(path==='/api/verifier/compare'){const projects=rows(value).map(project);return {projects,comparablePeriods:projects[0]?.periods.map(p=>p.period).filter(period=>projects.every(p=>p.periods.some(a=>a.period===period)))??[],unknown:[]};}
  if(/^\/api\/projects\/[^/]+$/.test(path))return project(v);
  if(path.endsWith('/extraction'))return value?{...v,commitment:commitment(v),sourceQuote:text(v.source_quote),page:count(v.page),confidence:count(v.confidence)}:null;
  if(path.endsWith('/commitment'))return commitment(v);
  if(path==='/api/registry/boundary')return {...v,points:Array.isArray(v.points)?v.points.length:0};
  if(path.endsWith('/participants'))return rows(value).map(participant);
  if(/^\/api\/participants\/[^/]+$/.test(path))return participant(v);
  if(path.endsWith('/agents'))return rows(value).map(agent);
  if(/^\/api\/agents\/[^/]+$/.test(path))return agent(v);
  if(path.endsWith('/runs'))return rows(value).map(run);
  if(path.endsWith('/reconciliation'))return (Array.isArray(value)?rows(value):[v]).map(reconciliation);
  if(/^\/api\/runs\/[^/]+$/.test(path))return run(v);
  if(path.endsWith('/transfers'))return rows(value).map(transfer);
  if(path.endsWith('/payments'))return rows(value).map(t=>({...transfer(t),transferId:t.id,period:text(t.period),disputeId:null}));
  if(path.endsWith('/preflight'))return {...v,exclusions:rows(v.exclusions).map(e=>({...e,reason:Array.isArray(e.reasons)?e.reasons.join(', '):'',code:Array.isArray(e.reasons)?e.reasons[0]:'PREFLIGHT_EXCLUSIONS_REQUIRED',participantName:'Household excluded',excluded:!!e.excluded}))};
  if(path.endsWith('/disputes'))return rows(value).map(dispute);
  if(/^\/api\/disputes\/[^/]+(?:\/respond)?$/.test(path))return dispute(v);
  if(path.endsWith('/attestations'))return rows(value).map(attestation);
  if(/^\/api\/(public\/)?attestations\/[^/]+$/.test(path))return attestation(v);
  if(path==='/api/verify/attestation')return {outcome:'match',attestation:attestation(v)};
  if(path==='/api/verify/disclosure')return {outcome:v.valid?'match':'no-match',period:null,projectName:null,anchorReachable:row(v.anchor).status==='anchored',checkedAt:new Date().toISOString()};
  if(path.endsWith('/report'))return report(v);
  if(path==='/api/verifier/export'){
    if(v.format==='pdf')return {format:'pdf',state:'ready',url:row(rows(v.downloads)[0]).url};
    if(typeof window!=='undefined'){
      const content=v.format==='csv'?text(v.content):JSON.stringify(v,null,2);
      return {...v,state:'ready',url:URL.createObjectURL(new Blob([content],{type:v.format==='csv'?'text/csv':'application/json'}))};
    }
    return {...v,state:'ready',url:null};
  }
  return value;
}

export function adaptRequest(path:string,method:string,body:unknown,query:Record<string,string|number|boolean|undefined>|undefined) {
  let b=body;let q=query?{...query}:undefined;
  if(path==='/api/public/register'&&q?.sort==='coverage'){q.sort='name';}
  if(path.endsWith('/preflight')){const input=row(body);b={exclusions:input.excluding??input.exclusions??[]};}
  if(path==='/api/verifier/export'){const input=row(body);b={...input,format:input.format==='benefit-sharing'?'pdf':input.format==='record'?'json':input.format};}
  if(path==='/api/verifier/alerts'){const input=row(body);b={...input,condition:text(input.condition).replaceAll('-','_'),threshold:typeof input.threshold==='number'?input.threshold*100:undefined};}
  if(path.endsWith('/action')){const input=row(body);b={...input,action:input.action==='documentation'?'request_documentation':input.action};}
  if(path==='/api/auth/signup'){const input=row(body);b={email:input.email,password:input.password,organisation:input.organisation};}
  if(path==='/api/disputes'||/^\/api\/receipt\/.*\/dispute$/.test(path)){const input=row(body);b={...input,category:text(input.category).replaceAll('-','_')};}
  if(path.endsWith('/commitment')){const input=row(body);b={...input,field:input.field==='beneficiary'?'beneficiary_definition':input.field};}
  if(path.endsWith('/participants')&&q){q={...q};delete q.wallet;delete q.enrolled_from;delete q.enrolled_to;if(q.status==='flagged'){delete q.status;q.flagged='true';}}
  return {path,body:method==='POST'||method==='PATCH'?b??{}:b,query:q};
}
