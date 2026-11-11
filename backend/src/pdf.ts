import PDFDocument from 'pdfkit';
import { type Row } from './core.js';
import type {BenefitSharingReport} from './contracts.js';
export async function attestationPdf(a:{document:object;hash:string;signature:string;publicKey:string}):Promise<Buffer>{
 const doc=new PDFDocument({size:'A4',margin:54,info:{Title:'Attest settlement record',Subject:'Signed canonical attestation',Author:'Attest'}});const chunks:Buffer[]=[];
 const result=new Promise<Buffer>((resolve,reject)=>{doc.on('data',(c:Buffer)=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 doc.font('Helvetica').fontSize(11).fillColor('#5C5A55').text('ATTEST / SETTLEMENT RECORD');doc.moveDown();doc.fontSize(28).fillColor('#181816').text('Period attestation');doc.moveDown();
 if(['mock','sandbox'].includes(String((a.document as Record<string,unknown>).bankEvidence))){doc.fontSize(11).fillColor('#7A5038').text((a.document as Record<string,unknown>).bankEvidence==='mock'?'OFFLINE SYNTHETIC DEMONSTRATION - NO REAL BANK SETTLEMENT':'SYNTHETIC BANK SANDBOX DEMONSTRATION - NO REAL BANK SETTLEMENT');doc.moveDown();}
 const d=a.document as Record<string,unknown>;for(const[label,value]of [['Project',d.projectId],['Period',d.period],['Enrolled households',d.enrolledCount],['Households paid',d.paidCount],['Amount committed (NGN)',d.amountCommitted],['Amount received by households (NGN)',d.amountMovedToHouseholds],['Charges borne (NGN)',d.chargesBorne],['Shortfall (NGN)',d.shortfall],['Confirmed receipts',d.confirmationCount],['Disputes open at close',d.disputesOpen],['Closed at',d.closedAt]]){doc.font('Helvetica').fontSize(10).fillColor('#5C5A55').text(String(label).toUpperCase());doc.fontSize(13).fillColor('#181816').text(String(value));doc.moveDown(.6);}
 doc.fontSize(9).text('Coverage records payments; it is not a verdict about project conduct.');doc.moveDown();doc.font('Courier').fontSize(9).text('ATTEST-SHA256: '+a.hash);doc.moveDown();doc.text('Signature (Ed25519): '+a.signature);doc.moveDown();doc.text('Previous hash: '+(d.previousHash??'genesis'));
 doc.file(Buffer.from(JSON.stringify({document:a.document,hash:a.hash,signature:a.signature,publicKey:a.publicKey})),{name:'attestation.json',type:'application/json',description:'Signed machine-readable attestation'});
 doc.end();return result;
}
export async function benefitSharingPdf(report:BenefitSharingReport):Promise<Buffer>{
 const doc=new PDFDocument({size:'A4',margin:54,bufferPages:true,info:{Title:'Attest benefit-sharing payment summary',Author:'Attest'}}),chunks:Buffer[]=[];
 const result=new Promise<Buffer>((resolve,reject)=>{doc.on('data',(chunk:Buffer)=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));});
 const d=report.attestation.document;
 doc.font('Courier').fontSize(9).fillColor('#5C5A55').text('ATTEST / BENEFIT-SHARING PAYMENT SUMMARY');doc.moveDown();
 doc.font('Helvetica').fontSize(24).fillColor('#181816').text(report.project.name);doc.moveDown(.5);
 if(report.demonstration?.isDemonstration||['mock','sandbox'].includes(d.bankEvidence))doc.fontSize(10).fillColor('#7A5038').text('SYNTHETIC PAYMENT DEMONSTRATION - NO REAL BANK SETTLEMENT');
 if(report.demonstration?.demonstrationNotice)doc.fontSize(10).fillColor('#7A5038').text(report.demonstration.demonstrationNotice);
 doc.font('Times-Roman').fontSize(11).fillColor('#181816').text(report.scope);doc.moveDown();
 const field=(label:string,value:unknown)=>{doc.font('Courier').fontSize(8).fillColor('#5C5A55').text(label.toUpperCase());doc.font('Times-Roman').fontSize(11).fillColor('#181816').text(String(value));doc.moveDown(.5);};
 field('Registry',report.project.registry+' / '+report.project.registryId);field('Period',d.period);
 field('Documented commitment',`${report.commitment.percentage}% of ${report.commitment.basis} revenue; ${report.commitment.cadence}`);
 if(report.commitment.reportingCadence)field('Reporting cadence',report.commitment.reportingCadence);if(report.commitment.paymentSchedule)field('Payment schedule',report.commitment.paymentSchedule.description);
  field('Commitment source ('+(report.commitment.sourceLocator?report.commitment.sourceLocator+', ':'')+'page '+report.commitment.page+')',report.commitment.sourceQuote);if(report.commitment.sourceUrl)field('Source document',report.commitment.sourceUrl);
 field('Enrolled households',d.enrolledCount);field('Households paid',d.paidCount);field('Household coverage',report.coverage.percentage+'%');
 for(const [label,value]of [['Amount committed (NGN)',d.amountCommitted],['Amount received by households (NGN)',d.amountMovedToHouseholds],['Charges borne (NGN)',d.chargesBorne],['Shortfall (NGN)',d.shortfall],['Confirmed receipts',d.confirmationCount],['Disputes open at close',d.disputesOpen],['Substantiated disputes',d.disputesSubstantiated],['Merkle root',d.merkleRoot],['Attestation hash',report.attestation.hash],['Anchor',report.anchor.status+' / '+(report.anchor.reference??'pending')]])field(String(label),value);
 field('Report signature (Ed25519)',report.reportSignature);field('Report hash',report.reportHash);
 doc.file(Buffer.from(JSON.stringify(report)),{name:'benefit-sharing-report.json',type:'application/json',description:'Signed payment summary and original signed attestation'});
 const range=doc.bufferedPageRange();for(let page=range.start;page<range.start+range.count;page++){doc.switchToPage(page);doc.save().strokeColor('#8C887E').lineWidth(.4);
  const w=doc.page.width,h=doc.page.height;for(const [x,y,sx,sy]of [[36,36,1,1],[w-36,36,-1,1],[36,h-36,1,-1],[w-36,h-36,-1,-1]]){doc.moveTo(x-8*sx,y).lineTo(x+8*sx,y).moveTo(x,y-8*sy).lineTo(x,y+8*sy).stroke();}doc.restore();
 }
 doc.end();return result;
}
