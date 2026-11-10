import { createHash, createHmac, randomUUID, timingSafeEqual, generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey } from 'node:crypto';

export class Fault extends Error {
  constructor(public code: string, public status = 400, message = code, public field: string | null = null) { super(message); }
}
export const ensure: (test: unknown, code: string, status?: number) => asserts test = (test, code, status = 400) => { if (!test) throw new Fault(code, status); };
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
export const canonical = (v: any): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
};
export function cents(s: unknown): bigint {
  ensure(typeof s === 'string' && /^\d{1,12}\.\d{2}$/.test(s), 'INVALID_REQUEST');
  return BigInt(s.replace('.', ''));
}
export const money = (n: bigint): string => `${n < 0n ? '-' : ''}${(n < 0n ? -n : n) / 100n}.${((n < 0n ? -n : n) % 100n).toString().padStart(2, '0')}`;
export function bankMoney(value: unknown): string {
  const text=String(value);ensure(/^\d{1,12}(?:\.\d{1,2})?$/.test(text),'INVALID_BANK_RESPONSE',502);
  const [whole,fraction='']=text.split('.');return whole+'.'+fraction.padEnd(2,'0');
}
export const maskPhone = (s: string) => s ? '*'.repeat(Math.max(0, s.length - 4)) + s.slice(-4) : '';
export const identityHash = (s: string) => {
  const pepper = process.env.IDENTITY_PEPPER;
  ensure(pepper && pepper.length >= 32, 'IDENTITY_UNREACHABLE', 503);
  return createHmac('sha256', pepper).update(s).digest('hex');
};
export const nameMatch = (a: string, b: string) => {
  const normalize = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
  const aa=normalize(a).split(' '),bb=normalize(b).split(' ');
  if(aa.every(t=>bb.includes(t)))return 'match';
  return aa.some(t=>bb.includes(t))?'uncertain':'mismatch';
};
export type Role = 'developer_admin' | 'developer_operator' | 'agent' | 'verifier' | 'bank_ops' | 'platform_admin';
export interface Principal { id: string; role: Role; organisationId: string; projectId?: string; deviceKey?: string; }
export interface Row { id: string; projectId?: string; organisationId?: string; createdAt: string; [key: string]: any; }
export const row = (data: Record<string, any>): Row => ({ id: id(), createdAt: now(), ...data });
export function merkle(leaves: any[]) {
  const levels: string[][] = [leaves.map(l => hash(canonical(l)))];
  if (!leaves.length) levels[0] = [hash('[]')];
  while (levels.at(-1)!.length > 1) {
    const a = levels.at(-1)!; const next: string[] = [];
    for (let i = 0; i < a.length; i += 2) next.push(hash(a[i] + (a[i + 1] ?? a[i])));
    levels.push(next);
  }
  return { root: levels.at(-1)![0], proof(index: number) {
    ensure(index >= 0 && index < leaves.length, 'LEAF_NOT_IN_ROOT');
    const proof: { side: string; hash: string }[] = [];
    for (const level of levels.slice(0, -1)) { proof.push({ side: index % 2 ? 'left' : 'right', hash: level[index ^ 1] ?? level[index] }); index = Math.floor(index / 2); }
    return proof;
  } };
}
export function verifyProof(leaf: any, proof: any[], root: string) {
  if (!Array.isArray(proof) || proof.length > 64) return false;
  let h = hash(canonical(leaf));
  for (const p of proof) {
    if (!['left', 'right'].includes(p.side) || !/^[a-f0-9]{64}$/.test(p.hash)) return false;
    h = hash(p.side === 'left' ? p.hash + h : h + p.hash);
  }
  return h === root;
}
export class Signer {
  private key;
  public publicKey: string;
  constructor() {
    if (process.env.SIGNING_KEY_BASE64) this.key = createPrivateKey(Buffer.from(process.env.SIGNING_KEY_BASE64, 'base64'));
    else { ensure(process.env.NODE_ENV !== 'production', 'SIGNING_KEY_REQUIRED', 503); this.key = generateKeyPairSync('ed25519').privateKey; }
    this.publicKey = createPublicKey(this.key).export({ type: 'spki', format: 'pem' }).toString();
  }
  sign(h: string) { return sign(null, Buffer.from(h), this.key).toString('base64'); }
  verify(h: string, signature: string) { try { return verify(null, Buffer.from(h), this.publicKey, Buffer.from(signature, 'base64')); } catch { return false; } }
}
export function verifyAttestationRecord(a: Row) {
  try {return hash(canonical(a.document))===a.hash && verify(null,Buffer.from(a.hash),a.publicKey,Buffer.from(a.signature,'base64'));}catch{return false;}
}
export function verifyWebhook(raw: string, timestamp: string, signature: string, secret: string, clock = Date.now()) {
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(clock - Number(timestamp) * 1000) > 300_000) return false;
  const expected = createHmac('sha256', secret).update(timestamp + '.' + raw).digest();
  const actual = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
