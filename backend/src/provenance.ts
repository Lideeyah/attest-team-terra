import type {DemonstrationDisclosure} from './contracts.js';

export function demonstrationDisclosure(isDemonstration:boolean):DemonstrationDisclosure{
 return {isDemonstration,paymentData:isDemonstration?'synthetic':'unverified',demonstrationNotice:isDemonstration?"Demonstration only. All payment data, coverage, paid counts and disbursement amounts are synthetic and do not describe the named project's actual performance.":null};
}
export function publicReferenceStatistics(value:unknown){
 if(!value||typeof value!=='object')return null;const r=value as Record<string,unknown>;
 if(typeof r.sourceUrl!=='string'||!r.sourceUrl.startsWith('https://')||typeof r.retrievedAt!=='string')return null;
 const metrics:Record<string,number>={};for(const key of ['participants','certificatesIssued','projectStartYear','districts'])if(typeof r[key]==='number'&&Number.isSafeInteger(r[key])&&r[key]>=0)metrics[key]=r[key];
 return {...metrics,sourceUrl:r.sourceUrl,retrievedAt:r.retrievedAt,sourcePage:Number.isSafeInteger(r.sourcePage)?r.sourcePage:null,asOf:typeof r.asOf==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.asOf)?r.asOf:null,notice:'Reference statistics are separate from payment coverage and the synthetic demonstration population.'};
}
