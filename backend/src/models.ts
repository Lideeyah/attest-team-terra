import type {Role,Row} from './core.js';
import type {AttestationDocument,TransferLeaf,RunArithmetic,Money,PaymentCadence,ReportingCadence,PaymentSchedule} from './contracts.js';
import type {RegistryRecord,Boundary} from './registry.js';
import type {BulkRequest} from './bank.js';
export interface IdentityDecision{match:boolean;confidence?:number;fields?:Record<string,string>;watchlisted:boolean;}
export interface Project extends Row{name:string;registryId:string;country:string;methodology?:string;boundary?:Boundary;status:string;sourceAccount?:string;openingBalance?:string;carbonId?:string;mrvVerified?:boolean;mrvStatus?:string;retirement?:CarbonEventData;openPeriod?:string;openRosterId?:string;}
export interface User extends Row{email:string;passwordHash:string;role:Role;organisationId:string;verified:boolean;suspended?:boolean;projectId?:string;deviceKey?:string;authVersion?:number;}
export interface Session extends Row{userId:string;expiresAt:string;revoked?:boolean;}
export interface Token extends Row{type?:string;userId?:string;expiresAt?:string;used?:boolean;revoked?:boolean;minute?:number;count?:number;secret?:string;bytes?:string;fileHash?:string;transactionId?:string;phoneHash?:string;language?:string;record?:RegistryRecord;approved?:boolean;result?:unknown;proposal?:unknown;flows?:Flow[];}
export interface Invite extends Row{projectId:string;organisationId:string;email:string;name:string;expiresAt:string;used:boolean;revoked:boolean;}
export interface Commitment extends Row{projectId:string;percentage:number;basis:'gross'|'net';cadence:PaymentCadence;reportingCadence?:ReportingCadence;paymentSchedule?:PaymentSchedule;sourceLocator?:string;beneficiary_definition?:string;source_quote?:string;page?:number;confidence?:number;accepted:boolean;reviewStatus?:'pending'|'developer_review';original:boolean;supersedes?:string;reason?:string;}
export interface Participant extends Row{projectId:string;agentId:string;name:string;phone:string;identityHash:string;identityLastFour:string;identityType:'bvn'|'nin';verification:IdentityDecision;point:[number,number]|null;capturedAt:string;receivedAt:string;syncDelayMs:number;consent:boolean;accountNumber:string;bankCode:string;kycLevel:number;resolvedAccountName:string|null;nameMatch:'match'|'mismatch'|'uncertain';maskedBvn:string|null;flags:string[];status:string;noticeAttempted:boolean;noticeStatus:'pending'|'sent';language?:string;photographId?:string|null;consentEvidenceId?:string|null;}
export interface Agent extends User{status:string;verification?:IdentityDecision;identityHash?:string;identityLastFour?:string;}
export interface Roster extends Row{projectId:string;period:string;participantIds:string[];}
export interface Run extends Row{projectId:string;period:string;closesAt:string;rosterId:string;commitmentId:string;declaredGross:Money;declaredNet?:Money|null;fundingAmount:Money;sourceAccount:string|null;state:string;batchReference:string;batchReferences?:string[];retryNumber?:number;eligibleIds?:string[];arithmetic?:RunArithmetic;}
export interface Transfer extends Row{projectId:string;runId:string;participantId:string;reference:string;amount:string;accountNumber:string;bankCode:string;state:string;fee:string;vat:string;stampDuty:string;totalDebit:string;submittedAt:string;sessionId?:string;settledAt?:string;reversedAt?:string;failureClass?:string|null;failureMessage?:string|null;submissionRejected?:boolean;attempts?:{reference:string;state:string;failureClass?:string|null;failureMessage?:string|null}[];}
export interface TransferBatch extends Row{projectId:string;runId:string;reference:string;key:string;request:BulkRequest;transferIds:string[];state:'pending'|'submitting'|'accepted'|'unknown'|'rejected';nextAt?:string;lastError?:string;}
export interface Confirmation extends Row{projectId:string;transferId:string;participantId:string;}
export interface Attestation extends Row{projectId:string;period:string;runId:string;document:AttestationDocument&{substantiatedCaseCount:number};hash:string;signature:string;publicKey:string;leaves:TransferLeaf[];transferIds:string[];}
export interface Anchor extends Row{attestationId:string;status:string;reference?:string;timestamp?:string;provider?:string;topicId?:string;sequence?:string;}
export interface Receipt extends Row{projectId:string;participantId:string;transferId:string;expiresAt:string;revoked?:boolean;}
export interface Dispute extends Row{projectId:string;transferId:string|null;participantId:string|null;category:string;body:string;status:string;resolvedAt?:string;runId?:string;resolutionBasis?:string;voiceNoteId?:string|null;requiresListening?:boolean;}
export interface Flow{participantId:string;to:string;receivedAt:string;sentAt:string;dormantDays?:number;amount?:string;}
export interface Edge{from:string;to:string;amount?:string|null;occurredAt?:string;}
export interface Signal extends Row{projectId:string;class:string;severity:string;participantIds:string[];detail:{to?:string;count?:number;bucket?:string;agents?:string[];transferId?:string;edges?:Edge[];sampled?:boolean;};}
export interface Case extends Row{projectId:string;signalId:string;status:string;actions:{action:string;note:string;at:string;by:string}[];}
export interface Audit extends Row{principal:string;action:string;entityId?:string;before?:Row|null;after?:Row|null;detail?:unknown;}
export interface Notification extends Row{type:string;participantId?:string;providerMessageId?:string;status?:string;deliveryStatus?:string;amount?:string;}
export interface Evidence extends Row{projectId:string;ownerId:string;kind:string;contentType:string;sha256:string;length:number;iv:string;tag:string;ciphertext:string;}
export interface StreamRecord extends Row{runId?:string;type:string;transferId?:string|null;}
export interface Alert extends Row{userId:string;kind:'rule'|'event';condition:string;threshold?:number;evidence?:unknown;}
export interface Idempotency extends Row{requestHash:string;response:unknown;}
export interface CarbonEventData{id?:string;project_id?:string;period?:string;certificate_id?:string;eventId?:string;retirement_id?:string;credit_batch_id?:string;}
export interface Job extends Row{type:string;data:JobData;state:string;attempts:number;nextAt:string;}
export interface JobData{runId?:string;transferId?:string;participantId?:string;projectId?:string;attestationId?:string;disputeId?:string;userId?:string;caseId?:string;page?:number;action?:string;type?:string;token?:string;message?:string;reason?:string;failureClass?:string;condition?:string;evidence?:unknown;pages?:string[];flows?:Flow[];event_id?:string;data?:Record<string,unknown>;}
export interface EntityMap{users:User;sessions:Session;tokens:Token;invites:Invite;projects:Project;commitments:Commitment;participants:Participant;agents:Agent;rosters:Roster;runs:Run;transfers:Transfer;transfer_batches:TransferBatch;confirmations:Confirmation;attestations:Attestation;anchors:Anchor;disputes:Dispute;signals:Signal;cases:Case;audit:Audit;jobs:Job;receipts:Receipt;events:StreamRecord;idempotency:Idempotency;watchlist:Alert;alerts:Alert;notifications:Notification;evidence:Evidence;registry_history:Row;}
