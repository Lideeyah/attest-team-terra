/** Shared wire contract. Money is always an NGN decimal string. */
export type Money = `${number}.${number}`;
export type TransferState = 'queued'|'in_flight'|'settling'|'settled'|'failed'|'reversed';
export type RunState = 'draft'|'funded'|'preflight_failed'|'executing'|'partially_complete'|'complete'|'cancelled';
export interface Meta {page:number;per_page:number;total:number;total_pages:number;}
export type Envelope<T> = {status:'success';message:string;data:T;meta:Meta|null;request_id:string} | {status:'error';error:{code:string;message:string;field:string|null;remediation:string|null};request_id:string};
export interface RunArithmetic {commitmentPct:number;declaredGross:Money;required:Money;estimatedCharges:Money;totalNeeded:Money;funded:Money;shortfall:Money;perHousehold:Money;chargesCovered:boolean;}
export interface EnrolmentInput {clientId:string;projectId:string;consent:boolean;name:string;firstName:string;lastName:string;dateOfBirth:string;phone:string;identityType:'bvn'|'nin';identity:string;capturedAt:string;point?:[number,number];signature?:string;boundaryReason?:string;accountNumber?:string;bankCode?:string;}
export interface TransferLeaf {participantId:string;amount:Money;settledAt:string;bankReferenceHash:string;confirmed:boolean;}
export interface Disclosure {leaf:TransferLeaf;proof:{side:'left'|'right';hash:string}[];root:string;attestationId:string;attestationHash:string;signature:string;publicKey:string;}
export interface StreamEvent {type:`transfer.${TransferState}`|'run.complete';transferId?:string;state?:TransferState;}
