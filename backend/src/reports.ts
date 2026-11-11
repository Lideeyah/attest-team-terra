import {ensure,hash,canonical} from './core.js';
import type {Service} from './service.js';
import type {BenefitSharingReport} from './contracts.js';
import {reportingCadence} from './period.js';
import {demonstrationDisclosure} from './provenance.js';

export async function benefitSharingReport(s:Service,attestationId:string):Promise<BenefitSharingReport>{
 const a=await s.required('attestations',attestationId);const run=await s.required('runs',a.runId);
 const p=await s.required('projects',a.projectId),c=await s.required('commitments',run.commitmentId),anchor=await s.db.get('anchors',a.id);
 ensure(typeof c.source_quote==='string'&&c.source_quote.length>0&&Number.isInteger(c.page),'PDD_NO_COMMITMENT',422);
 const d=a.document;
 const report={version:1 as const,title:'Benefit-sharing payment summary',project:{id:p.id,name:p.name,registryId:p.registryId,registry:String(p.registry??'unspecified'),country:p.country},demonstration:demonstrationDisclosure(p.isDemonstration===true||['mock','sandbox'].includes(d.bankEvidence)),commitment:{percentage:c.percentage,basis:c.basis,cadence:c.cadence,reportingCadence:reportingCadence(c),paymentSchedule:c.paymentSchedule??null,sourceLocator:c.sourceLocator??null,sourceAlignment:typeof c.sourceAlignment==='string'?c.sourceAlignment:null,specifiedSourceLocator:typeof c.specifiedSourceLocator==='string'?c.specifiedSourceLocator:null,beneficiaryDefinition:c.beneficiary_definition??'',sourceQuote:c.source_quote,page:c.page!,sourceUrl:typeof c.sourceUrl==='string'?c.sourceUrl:null},coverage:{enrolled:d.enrolledCount,paid:d.paidCount,percentage:d.enrolledCount?Number((d.paidCount/d.enrolledCount*100).toFixed(4)):0},attestation:s.publicAttestation(a),anchor:anchor?{status:anchor.status,reference:anchor.reference??null,timestamp:anchor.timestamp??null}:{status:'pending',reference:null,timestamp:null},scope:'Recorded cash settlements for this period. Does not assess certification compliance or in-kind benefits.'};
 return {...report,reportHash:hash(canonical(report)),reportSignature:s.signer.sign(hash(canonical(report))),reportPublicKey:s.signer.publicKey};
}
