import { createCipheriv, createDecipheriv, randomBytes, hkdfSync } from 'node:crypto';
import { ensure, hash, row, type Principal } from './core.js';
import type { Store } from './store.js';
export type EvidenceKind='photograph'|'consent'|'voice_note';
const accepted:Record<EvidenceKind,readonly string[]>={photograph:['image/jpeg','image/png'],consent:['audio/mpeg','audio/ogg','audio/wav','application/pdf'],voice_note:['audio/mpeg','audio/ogg','audio/wav']};
function key(){ensure(process.env.EVIDENCE_KEY_BASE64,'EVIDENCE_STORAGE_UNAVAILABLE',503);const secret=Buffer.from(process.env.EVIDENCE_KEY_BASE64,'base64');ensure(secret.length===32,'EVIDENCE_STORAGE_UNAVAILABLE',503);return Buffer.from(hkdfSync('sha256',secret,'attest','private-evidence-v1',32));}
export async function storeEvidence(db:Store,p:Principal,projectId:string,kind:EvidenceKind,contentType:string,bytes:Buffer){
 ensure(accepted[kind]?.includes(contentType)&&bytes.length>0&&bytes.length<=5*1024*1024,'INVALID_REQUEST');
 if(contentType==='image/jpeg')ensure(bytes[0]===255&&bytes[1]===216&&bytes[2]===255,'INVALID_REQUEST');
 if(contentType==='image/png')ensure(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'INVALID_REQUEST');
 if(contentType==='application/pdf')ensure(bytes.subarray(0,5).toString()==='%PDF-','INVALID_REQUEST');
 if(contentType==='audio/ogg')ensure(bytes.subarray(0,4).toString()==='OggS','INVALID_REQUEST');
 if(contentType==='audio/wav')ensure(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WAVE','INVALID_REQUEST');
 if(contentType==='audio/mpeg')ensure(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255&&(bytes[1]&224)===224,'INVALID_REQUEST');
 const record=row({projectId,ownerId:p.id,kind,contentType,sha256:hash(bytes),length:bytes.length});
 const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(record.id+':'+projectId));
 const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
 await db.put('evidence',{...record,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')});return {id:record.id,kind,sha256:record.sha256};
}
export async function readEvidence(db:Store,evidenceId:string,p:Principal){const record=await db.scoped('evidence',evidenceId,p);ensure(record&&(['developer_admin','developer_operator','bank_ops','platform_admin'].includes(p.role)||record.ownerId===p.id),'FORBIDDEN',403);const cipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(record.iv,'base64'));cipher.setAAD(Buffer.from(record.id+':'+record.projectId));cipher.setAuthTag(Buffer.from(record.tag,'base64'));return {record,bytes:Buffer.concat([cipher.update(Buffer.from(record.ciphertext,'base64')),cipher.final()])};}
