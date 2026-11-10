import type {FastifyInstance} from 'fastify';
import type {Service} from './service.js';
import {session} from './auth.js';
import {Fault,ensure} from './core.js';
import {record,text} from './validation.js';
import {MockBank,type BankOptions} from './bank.js';
export const devCodes=`FORBIDDEN RATE_LIMITED INVALID_REQUEST NOT_FOUND DUPLICATE_REQUEST IDENTITY_DUPLICATE BVN_MISMATCH IDENTITY_UNREACHABLE NAME_MISMATCH NAME_ENQUIRY_EXPIRED NAME_ENQUIRY_MISMATCH BOUNDARY_OUTSIDE BOUNDARY_NOT_AVAILABLE INVALID_BOUNDARY WALLET_ACCOUNT_REQUIRED REPORTING_CADENCE_REQUIRED GPS_UNAVAILABLE CONSENT_MISSING DEVICE_UNBOUND REGISTRY_NOT_FOUND REGISTRY_UNREACHABLE PDD_UNREADABLE PDD_NO_COMMITMENT EXTRACTION_LOW_CONFIDENCE MODEL_UNAVAILABLE ROSTER_EMPTY PERIOD_CLOSED FUNDING_NOT_RECEIVED FUNDING_INSUFFICIENT FUNDING_EXCLUDES_CHARGES PREFLIGHT_EXCLUSIONS_REQUIRED ACCOUNT_NOT_FOUND ACCOUNT_DORMANT ACCOUNT_RESTRICTED BENEFICIARY_FROZEN INSUFFICIENT_FUNDS LIMIT_EXCEEDED BANK_UNAVAILABLE TIMEOUT TRANSFER_REVERSED ANCHOR_PENDING ANCHOR_UNREACHABLE CHAIN_DISCONTINUITY PROOF_INVALID LEAF_NOT_IN_ROOT TOKEN_EXPIRED ALREADY_CONFIRMED DISPUTE_ALREADY_OPEN DISPUTE_RESOLUTION_BASIS_REQUIRED RECONCILIATION_MISMATCH PARTICIPANT_DELETE_NOT_PERMITTED`.split(' ');
export async function registerDevTools(app:FastifyInstance,s:Service){
 const authorize=async(headers:{authorization?:string;cookie?:string})=>{const p=await session(s.db,headers.authorization,headers.cookie);ensure(['developer_admin','platform_admin'].includes(p.role)&&s.providers.bank instanceof MockBank,'FORBIDDEN',403);};
 app.get('/dev/states',async req=>{await authorize(req.headers);return {codes:devCodes,outcomes:['successful','failed','pending','timeout','reversed'],accountStates:['active','dormant','frozen','pnd']};});
 app.post('/api/dev/trigger',async req=>{
  await authorize(req.headers);const b=record(req.body);const bank=s.providers.bank as MockBank;
  if(b.code){const code=text(b.code);ensure(devCodes.includes(code),'INVALID_REQUEST');throw new Fault(code,code==='FORBIDDEN'?403:code==='RATE_LIMITED'?429:422);}
  if(b.account){const state=text(b.state);ensure(/^\d{10}$/.test(text(b.account))&&['active','dormant','frozen','pnd'].includes(state),'INVALID_REQUEST');bank.setAccountState(text(b.account),state as 'active'|'dormant'|'frozen'|'pnd');return {configured:true};}
  const outcome=text(b.outcome);ensure(['successful','failed','pending','timeout','reversed'].includes(outcome),'INVALID_REQUEST');
  // Real mock transfer path exercises settlement, charges and requery; no record figures are editable.
  return bank.call('POST','/transfers/bulk',b.transfer,text(req.headers['idempotency-key']),{testOutcome:outcome as BankOptions['testOutcome']});
 });
}
