import {ensure} from './core.js';
import {record,text,runInput,disputeInput} from './validation.js';
import type {Flow} from './models.js';
import type {RunInput,BoundaryInput,ReportingCadence,PaymentCadence,PaymentSchedule} from './contracts.js';
type Items={items:Record<string,unknown>[]};
interface Review{percentage:number;basis:string;cadence:PaymentCadence;reportingCadence?:ReportingCadence;paymentSchedule?:PaymentSchedule;sourceLocator?:string;source_quote:string;page:number;beneficiary_definition:string;}
export interface RequestBodies{
 '/api/auth/signup':{email:string;password:string;organisation:string;role?:string};
 '/api/auth/signin':{email:string;password:string};
 '/api/auth/verify-email':{token:string};
 '/api/auth/resend-verification':{email:string};
 '/api/auth/reset/request':{email:string};
 '/api/auth/reset/confirm':{token:string;password:string};
 '/api/projects/lookup':{registryId:string};
 '/api/projects':{registryId?:string;boundaryId?:string;registryRecord?:{registryId:string;boundaryId?:string}};
 '/api/registry/boundary':BoundaryInput;
 '/api/admin/projects/:id/account':{accountNumber:string;ownershipVerified:boolean;reason:string};
 '/api/admin/registry/import':{record:unknown};
 '/api/admin/extractions/:id/review':{commitment:Review;reason:string};
 '/api/projects/:id/commitment':{field:string;value:unknown;reason:string};
 '/api/projects/:id/register':{type:string};
 '/api/projects/:id/participants':Items;
 '/api/field/enrolments':Items;
 '/api/participants/:id':{phone?:string;status?:string;reason:string};
 '/api/projects/:id/agents/invite':{name:string;email:string};
 '/api/invites/:code/redeem':{identity:{email:string;password:string};deviceKey:string};
 '/api/agents/:id':{status:string;reason:string};
 '/api/agents/:id/identity':{bvn:string;firstName:string;lastName:string;dateOfBirth:string};
 '/api/field/device/bind':{deviceKey:string};
 '/api/projects/:id/runs':RunInput&{sourceAccount?:string;closesAt?:string};
 '/api/runs/:id/preflight':{exclusions?:{participantId:string;reason:string}[]};
 '/api/runs/:id/requery':{transferId?:string};
 '/api/runs/:id/retry':{failureClass:string};
 '/api/disputes':{projectId?:string;category:string;body?:string;voiceNoteId?:string};
 '/api/disputes/:id/respond':{body:string;status?:string;resolutionBasis?:string};
 '/api/attestations/:id/disclosure':{transferId:string};
 '/api/verify/attestation':{hash?:string};
 '/api/verify/disclosure':{bundle:{attestationId:string;attestationHash:string;root:string;leaf:unknown;proof:{side:string;hash:string}[]}};
 '/api/ops/signals/scan':{projectId:string;flows:Flow[]};
 '/api/verifier/watchlist':{projectId:string;condition?:string;threshold?:number};
 '/api/verifier/alerts':{projectId:string;condition:string;threshold?:number};
 '/api/verifier/export':{projectId:string;period:string;format?:string};
 '/api/participants/:id/receipts/revoke':{reason:string};
 '/api/ops/cases/:id/action':{action:string;note:string};
 '/api/receipt/:token/dispute':{category:string;body?:string;voiceNoteId?:string};
 '/hooks/forge':{event_id:string;type?:string;event?:string;data:Record<string,unknown>};
 '/api/webhooks/sms-delivery':{id:string;status:string};
 '/api/webhooks/sms-inbound':{from:string;text:string;id?:string};
}
export type BodyFor<P extends string>=P extends keyof RequestBodies?RequestBodies[P]:Record<string,unknown>;
const required:Record<string,string[]>={
 '/api/auth/signup':['email','password','organisation'],'/api/auth/signin':['email','password'],'/api/auth/verify-email':['token'],'/api/auth/reset/request':['email'],'/api/auth/reset/confirm':['token','password'],'/api/projects/lookup':['registryId'],'/api/registry/boundary':['kml','name'],'/api/admin/projects/:id/account':['accountNumber'],'/api/projects/:id/commitment':['field','reason'],'/api/projects/:id/register':['type'],'/api/participants/:id':['reason'],'/api/projects/:id/agents/invite':['name','email'],'/api/invites/:code/redeem':['deviceKey'],'/api/agents/:id':['status','reason'],'/api/agents/:id/identity':['bvn','firstName','lastName','dateOfBirth'],'/api/field/device/bind':['deviceKey'],'/api/runs/:id/retry':['failureClass'],'/api/disputes/:id/respond':['body'],'/api/attestations/:id/disclosure':['transferId'],'/api/ops/signals/scan':['projectId'],'/api/verifier/watchlist':['projectId'],'/api/verifier/alerts':['projectId','condition'],'/api/verifier/export':['projectId','period'],'/api/participants/:id/receipts/revoke':['reason'],'/api/ops/cases/:id/action':['action','note'],'/api/admin/extractions/:id/review':['reason'],'/api/webhooks/sms-delivery':['id','status'],'/api/webhooks/sms-inbound':['from','text']};
const optionalStrings=['phone','status','resolutionBasis','transferId','format','role','hash','condition'];
export function parseBody<P extends string>(path:P,input:unknown):BodyFor<P>{
 const value=record(input??{});for(const field of required[path]??[])text(value[field]);
 if(path!=='/hooks/forge')for(const field of optionalStrings)if(value[field]!==undefined)ensure(typeof value[field]==='string','INVALID_REQUEST');
 if(path==='/api/projects/:id/runs')return runInput(value) as BodyFor<P>;
 if(path==='/api/disputes'||path==='/api/receipt/:token/dispute')return disputeInput(value) as BodyFor<P>;
 if(path==='/api/projects'&&value.registryRecord!==undefined)text(record(value.registryRecord).registryId);
 if(path==='/api/projects/:id/participants'||path==='/api/field/enrolments'){ensure(Array.isArray(value.items),'INVALID_REQUEST');for(const item of value.items as unknown[])record(item);}
 if(path==='/api/invites/:code/redeem'){const identity=record(value.identity);text(identity.email);text(identity.password);}
 if(path==='/api/runs/:id/preflight'&&value.exclusions!==undefined){ensure(Array.isArray(value.exclusions),'INVALID_REQUEST');for(const entry of value.exclusions as unknown[]){const e=record(entry);text(e.participantId);text(e.reason);}}
 if(path==='/api/admin/extractions/:id/review'){const c=record(value.commitment);ensure(typeof c.percentage==='number'&&typeof c.page==='number','INVALID_REQUEST');for(const key of ['basis','cadence','source_quote','beneficiary_definition'])text(c[key]);}
 if(path==='/api/verify/disclosure'){const b=record(value.bundle);for(const key of ['attestationId','attestationHash','root'])text(b[key]);ensure(Array.isArray(b.proof)&&b.proof.length<=64,'PROOF_INVALID');for(const step of b.proof as unknown[]){const p=record(step);text(p.side);text(p.hash);}}
 if(path==='/api/ops/signals/scan'){ensure(Array.isArray(value.flows)&&value.flows.length<=5000,'INVALID_REQUEST');for(const entry of value.flows as unknown[]){const f=record(entry);for(const key of ['participantId','to','receivedAt','sentAt'])text(f[key]);if(f.dormantDays!==undefined)ensure(typeof f.dormantDays==='number','INVALID_REQUEST');if(f.amount!==undefined)text(f.amount);}}
 if(value.threshold!==undefined)ensure(typeof value.threshold==='number'&&Number.isFinite(value.threshold),'INVALID_REQUEST');
 return value as BodyFor<P>;
}
export function queryValues(value:unknown):Record<string,string>{const values=record(value);for(const item of Object.values(values))ensure(typeof item==='string','INVALID_REQUEST');return values as Record<string,string>;}
