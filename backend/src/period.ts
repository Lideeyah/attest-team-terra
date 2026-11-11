import { ensure } from './core.js';
import type {ReportingCadence} from './contracts.js';
export function reportingCadence(commitment:{cadence:string;reportingCadence?:string}):ReportingCadence{
 const cadence=commitment.cadence==='staged'?commitment.reportingCadence:commitment.cadence??'quarterly';
 ensure(cadence&&['monthly','quarterly','annual'].includes(cadence),commitment.cadence==='staged'?'REPORTING_CADENCE_REQUIRED':'INVALID_REQUEST',422);
 return cadence as ReportingCadence;
}
export function validateCommitmentSchedule(value:{cadence:string;reportingCadence?:string;paymentSchedule?:unknown;sourceLocator?:unknown}){
 reportingCadence(value);
 if(value.reportingCadence!==undefined)ensure(['monthly','quarterly','annual'].includes(value.reportingCadence),'INVALID_REQUEST');
 if(value.sourceLocator!==undefined)ensure(typeof value.sourceLocator==='string'&&value.sourceLocator.length>0&&value.sourceLocator.length<=200,'INVALID_REQUEST');
 if(value.paymentSchedule!==undefined){const schedule=value.paymentSchedule;ensure(typeof schedule==='object'&&schedule!==null&&'type'in schedule&&schedule.type==='verification_milestones'&&'description'in schedule&&typeof schedule.description==='string'&&schedule.description.length>0&&schedule.description.length<=2000,'INVALID_REQUEST');}
}
export function currentPeriod(cadence:string,date=new Date()):string{const year=date.getUTCFullYear();if(cadence==='quarterly')return `${year}-Q${Math.floor(date.getUTCMonth()/3)+1}`;if(cadence==='annual')return String(year);ensure(cadence==='monthly','INVALID_REQUEST');return date.toISOString().slice(0,7);}
export function periodDeadline(period:string,cadence:string):string {
 let result:Date;
 if(cadence==='quarterly'){const m=/^(\d{4})-Q([1-4])$/.exec(period);ensure(m,'INVALID_REQUEST');result=new Date(Date.UTC(Number(m[1]),Number(m[2])*3,1));}
 else if(cadence==='monthly'){const m=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);ensure(m,'INVALID_REQUEST');result=new Date(Date.UTC(Number(m[1]),Number(m[2]),1));}
 else {ensure(cadence==='annual'&&/^\d{4}$/.test(period),'INVALID_REQUEST');result=new Date(Date.UTC(Number(period)+1,0,1));}
 ensure(result.getUTCFullYear()>=2020&&result.getUTCFullYear()<=2100,'INVALID_REQUEST');return result.toISOString();
}
