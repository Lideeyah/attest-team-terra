export type Money=`${number}.${number}`;
export type Role='developer_admin'|'developer_operator'|'agent'|'verifier'|'bank_ops'|'platform_admin';
export type TransferState='queued'|'in_flight'|'settling'|'settled'|'failed'|'reversed';
export type RunState='draft'|'funded'|'preflight_failed'|'executing'|'partially_complete'|'complete'|'cancelled';
export type ReportingCadence='monthly'|'quarterly'|'annual';
export type PaymentCadence=ReportingCadence|'staged';
export interface PaymentSchedule{type:'verification_milestones';description:string;sourceLocator?:string;}
export interface DemonstrationDisclosure{isDemonstration:boolean;paymentData:'synthetic'|'unverified';demonstrationNotice:string|null;}
export interface BoundaryInput{kml:string;name:string;}
export interface BoundaryPreview{name:string;points:[number,number][];areaHectares:number;geometry:{type:'Polygon'|'MultiPolygon';coordinates:[number,number][][]|[number,number][][][]};boundaryId:string;sha256:string;}
export interface Meta{page:number;per_page:number;total:number;total_pages:number;}
export type Envelope<T>={status:'success';message:string;data:T;meta:Meta|null;request_id:string}|{status:'error';error:{code:string;message:string;field:string|null;remediation:string|null};request_id:string};
export interface Commitment{percentage:number;basis:'gross'|'net';cadence:PaymentCadence;reportingCadence?:ReportingCadence;paymentSchedule?:PaymentSchedule;sourceLocator?:string;beneficiary_definition:string;source_quote:string;page:number;confidence:number;accepted:boolean;}
export interface RunInput{period:string;rosterId?:string;declaredGross:Money;declaredNet?:Money;fundingAmount:Money;}
export interface RunArithmetic{commitmentPct:number;basis:'gross'|'net';declaredGross:Money;declaredNet:Money|null;required:Money;estimatedCharges:Money;totalNeeded:Money;funded:Money;shortfall:Money;perHousehold:Money;chargesCovered:boolean;}
export interface EnrolmentInput{clientId:string;projectId:string;consent:boolean;name:string;firstName:string;lastName:string;dateOfBirth:string;phone:string;identityType:'bvn'|'nin';identity:string;capturedAt:string;point?:[number,number];signature?:string;boundaryReason?:string;accountNumber?:string;bankCode?:string;photographId?:string;consentEvidenceId?:string;language?:'en'|'yo'|'ha'|'ig';}
export interface TransferLeaf{participantId:string;amount:Money;settledAt:string;bankReferenceHash:string;confirmed:boolean;}
export interface Disclosure{leaf:TransferLeaf;proof:{side:'left'|'right';hash:string}[];root:string;attestationId:string;attestationHash:string;signature:string;publicKey:string;}
export interface StreamEvent{type:`transfer.${TransferState}`|'run.complete';transferId?:string;}
export interface ParticipantSummary{id:string;projectId:string;name:string;phone:string;status:string;flags:string[];kycLevel:number;nameMatch:'match'|'mismatch'|'uncertain';capturedAt:string;receivedAt:string;syncDelayMs:number;}
export interface Transfer{id:string;runId:string;participantId:string;amount:Money;state:TransferState;fee:Money;vat:Money;stampDuty:Money;totalDebit:Money;settledAt?:string;failureClass?:string;failureMessage?:string|null;}
export interface AttestationDocument{allocationIds?:string[];commitmentIds?:string[];projectId:string;period:string;enrolledCount:number;paidCount:number;amountCommitted:Money;amountMovedToHouseholds:Money;chargesBorne:Money;shortfall:Money;confirmationCount:number;disputesOpen:number;disputesSubstantiated:number;signalCounts:Record<string,number>;merkleRoot:string;previousHash:string|null;supersedes:string|null;reason:string|null;closedAt:string;bankEvidence:'mock'|'sandbox';}
export interface SignedAttestation{id:string;createdAt:string;document:AttestationDocument;hash:string;signature:string;publicKey:string;isDemonstration?:boolean;paymentData?:'synthetic'|'unverified';demonstrationNotice?:string|null;}
export type AttestErrorCode='BOUNDARY_POLYGON_REQUIRED'|'COMMITMENT_TERMS_UNSUPPORTED'|'BOUNDARY_NOT_AVAILABLE'|'INVALID_BOUNDARY'|'WALLET_ACCOUNT_REQUIRED'|'INVALID_BANK_RESPONSE'|'BANK_CAPABILITY_UNCONFIGURED'|'TARIFF_REVIEW_REQUIRED'|'REPORTING_CADENCE_REQUIRED';
export interface RegistryBoundaryState{boundaryStatus:'available'|'upload_required';uploadUrl:string|null;}
export interface BenefitSharingReport{version:1;title:string;project:{id:string;name:string;registryId:string;registry:string;country:string};demonstration?:DemonstrationDisclosure;commitment:{percentage:number;basis:'gross'|'net';cadence:string;reportingCadence?:ReportingCadence;paymentSchedule?:PaymentSchedule|null;sourceLocator?:string|null;sourceAlignment?:string|null;specifiedSourceLocator?:string|null;beneficiaryDefinition:string;sourceQuote:string;page:number;sourceUrl:string|null};coverage:{enrolled:number;paid:number;percentage:number};attestation:SignedAttestation;anchor:{status:string;reference:string|null;timestamp:string|null};scope:string;reportHash:string;reportSignature:string;reportPublicKey:string;}
export interface Run{id:string;projectId:string;period:string;state:RunState;closesAt:string;rosterId:string;declaredGross:Money;fundingAmount:Money;}
export class ApiError extends Error{constructor(public code:string,public status:number,public requestId?:string){super(code);}}
export function parseMoney(value:unknown):Money{if(typeof value!=='string'||!/^\d+\.\d{2}$/.test(value))throw new TypeError('Expected an NGN decimal string');return value as Money;}
export class AttestClient{
 constructor(private baseUrl='',private token?:string){}
 async request<T>(path:string,options:{method?:'GET'|'POST'|'PATCH'|'DELETE';body?:unknown;idempotencyKey?:string}={}):Promise<Envelope<T>>{
  const method=options.method??'GET';const headers:Record<string,string>={Accept:'application/json'};if(this.token)headers.Authorization='Bearer '+this.token;
  if(method!=='GET'){headers['Content-Type']='application/json';headers['Idempotency-Key']=options.idempotencyKey??crypto.randomUUID();}
  const response=await fetch(this.baseUrl+path,{method,headers,credentials:'include',body:options.body===undefined?undefined:JSON.stringify(options.body)});
  const payload:unknown=await response.json();if(typeof payload!=='object'||payload===null||!('status'in payload)||!('request_id'in payload))throw new ApiError('INVALID_RESPONSE',response.status);
  const envelope=payload as Envelope<T>;if(envelope.status==='error')throw new ApiError(envelope.error.code,response.status,envelope.request_id);if(!response.ok||envelope.status!=='success')throw new ApiError('INVALID_RESPONSE',response.status);return envelope;
 }
}
export * from './product.js';
