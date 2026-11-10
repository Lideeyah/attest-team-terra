import {ensure} from './core.js';
import type {JobData} from './models.js';
import type {EnrolmentInput,RunInput} from './contracts.js';
import {cents} from './core.js';
export function record(value:unknown):Record<string,unknown>{ensure(typeof value==='object'&&value!==null&&!Array.isArray(value),'INVALID_REQUEST');return value as Record<string,unknown>;}
export function text(value:unknown):string{ensure(typeof value==='string'&&value.length>0,'INVALID_REQUEST');return value;}
export function optionalText(value:unknown):string|undefined{return typeof value==='string'?value:undefined;}
export function jobText(data:JobData,key:keyof JobData){return text(data[key]);}
export function jobPage(data:JobData){const page=data.page??1;ensure(Number.isInteger(page)&&page>=1&&page<=100,'INVALID_REQUEST');return page;}
export function jobPages(data:JobData){ensure(Array.isArray(data.pages)&&data.pages.every(p=>typeof p==='string'),'INVALID_REQUEST');return data.pages;}
export function sqlError(error:unknown,code:string){return typeof error==='object'&&error!==null&&'code'in error&&error.code===code;}
function optional(value:unknown){if(value===undefined||value===null)return undefined;return text(value);}
export function enrolmentInput(value:unknown):EnrolmentInput{
 const r=record(value);ensure(r.identityType==='bvn'||r.identityType==='nin','INVALID_REQUEST');ensure(r.consent===true,'CONSENT_MISSING');
 let point:[number,number]|undefined;if(r.point!==undefined&&r.point!==null){ensure(Array.isArray(r.point)&&r.point.length===2&&r.point.every(Number.isFinite),'INVALID_REQUEST');point=r.point as [number,number];}
 const language=optional(r.language);ensure(!language||['en','yo','ha','ig'].includes(language),'INVALID_REQUEST');
 return {clientId:text(r.clientId),projectId:text(r.projectId),name:text(r.name),phone:text(r.phone),identityType:r.identityType,identity:text(r.identity),firstName:text(r.firstName),lastName:text(r.lastName),dateOfBirth:text(r.dateOfBirth),capturedAt:text(r.capturedAt),consent:true,point,signature:optional(r.signature),boundaryReason:optional(r.boundaryReason),accountNumber:optional(r.accountNumber),bankCode:optional(r.bankCode),photographId:optional(r.photographId),consentEvidenceId:optional(r.consentEvidenceId),language:language as EnrolmentInput['language']};
}
export function runInput(value:unknown):RunInput&{sourceAccount?:string;closesAt?:string}{
 const r=record(value);cents(r.declaredGross);cents(r.fundingAmount);if(r.declaredNet!==undefined)cents(r.declaredNet);
 return {period:text(r.period),declaredGross:r.declaredGross as RunInput['declaredGross'],declaredNet:r.declaredNet as RunInput['declaredNet'],fundingAmount:r.fundingAmount as RunInput['fundingAmount'],rosterId:optional(r.rosterId),sourceAccount:optional(r.sourceAccount),closesAt:optional(r.closesAt)};
}
export function disputeInput(value:unknown){const r=record(value);const category=text(r.category);ensure(['not_received','someone_else_collected','wrong_amount'].includes(category),'INVALID_REQUEST');return {projectId:optional(r.projectId),category,body:optional(r.body),voiceNoteId:optional(r.voiceNoteId)};}
