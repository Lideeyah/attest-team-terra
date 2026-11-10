import { ensure } from './core.js';
export function currentPeriod(cadence:string,date=new Date()):string{const year=date.getUTCFullYear();if(cadence==='quarterly')return `${year}-Q${Math.floor(date.getUTCMonth()/3)+1}`;if(cadence==='annual')return String(year);ensure(cadence==='monthly','INVALID_REQUEST');return date.toISOString().slice(0,7);}
export function periodDeadline(period:string,cadence:string):string {
 let result:Date;
 if(cadence==='quarterly'){const m=/^(\d{4})-Q([1-4])$/.exec(period);ensure(m,'INVALID_REQUEST');result=new Date(Date.UTC(Number(m[1]),Number(m[2])*3,1));}
 else if(cadence==='monthly'){const m=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);ensure(m,'INVALID_REQUEST');result=new Date(Date.UTC(Number(m[1]),Number(m[2]),1));}
 else {ensure(cadence==='annual'&&/^\d{4}$/.test(period),'INVALID_REQUEST');result=new Date(Date.UTC(Number(period)+1,0,1));}
 ensure(result.getUTCFullYear()>=2020&&result.getUTCFullYear()<=2100,'INVALID_REQUEST');return result.toISOString();
}
