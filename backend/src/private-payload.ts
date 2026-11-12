import {createCipheriv,createDecipheriv,randomBytes,hkdfSync} from 'node:crypto';
import {ensure} from './core.js';
import {record,text} from './validation.js';
function key(){ensure(process.env.EVIDENCE_KEY_BASE64,'EVIDENCE_STORAGE_UNAVAILABLE',503);const raw=Buffer.from(process.env.EVIDENCE_KEY_BASE64,'base64');ensure(raw.length===32,'EVIDENCE_STORAGE_UNAVAILABLE',503);return Buffer.from(hkdfSync('sha256',raw,'attest','private-job-payload-v1',32));}
export function sealPayload(value:unknown,scope:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(scope));const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};}
export function openPayload(value:unknown,scope:string):unknown{const p=record(value),decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(text(p.iv),'base64'));decipher.setAAD(Buffer.from(scope));decipher.setAuthTag(Buffer.from(text(p.tag),'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(text(p.data),'base64')),decipher.final()]).toString('utf8'));}
