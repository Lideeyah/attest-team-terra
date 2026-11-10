import PDFDocument from 'pdfkit';
import { type Row } from './core.js';
export async function attestationPdf(a:Row):Promise<Buffer>{
 const doc=new PDFDocument({size:'A4',margin:54,info:{Title:'Attest settlement record',Subject:'Signed canonical attestation',Author:'Attest'}});const chunks:Buffer[]=[];
 const result=new Promise<Buffer>((resolve,reject)=>{doc.on('data',(c:Buffer)=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 doc.font('Helvetica').fontSize(11).fillColor('#5C5A55').text('ATTEST / SETTLEMENT RECORD');doc.moveDown();doc.fontSize(28).fillColor('#181816').text('Period attestation');doc.moveDown();
 if(a.document.bankEvidence==='mock'){doc.fontSize(11).fillColor('#7A5038').text('OFFLINE SYNTHETIC DEMONSTRATION — NO REAL BANK SETTLEMENT');doc.moveDown();}
 const d=a.document;for(const[label,value]of [['Project',d.projectId],['Period',d.period],['Enrolled households',d.enrolledCount],['Households paid',d.paidCount],['Amount committed (NGN)',d.amountCommitted],['Amount received by households (NGN)',d.amountMovedToHouseholds],['Charges borne (NGN)',d.chargesBorne],['Shortfall (NGN)',d.shortfall],['Confirmed receipts',d.confirmationCount],['Disputes open at close',d.disputesOpen],['Closed at',d.closedAt]]){doc.font('Helvetica').fontSize(10).fillColor('#5C5A55').text(String(label).toUpperCase());doc.fontSize(13).fillColor('#181816').text(String(value));doc.moveDown(.6);}
 doc.fontSize(9).text('Coverage records payments; it is not a verdict about project conduct.');doc.moveDown();doc.font('Courier').fontSize(9).text('ATTEST-SHA256: '+a.hash);doc.moveDown();doc.text('Signature (Ed25519): '+a.signature);doc.moveDown();doc.text('Previous hash: '+(d.previousHash??'genesis'));
 doc.file(Buffer.from(JSON.stringify({document:a.document,hash:a.hash,signature:a.signature,publicKey:a.publicKey})),{name:'attestation.json',type:'application/json',description:'Signed machine-readable attestation'});
 doc.end();return result;
}
