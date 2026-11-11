import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getToken } from '@auth/core/jwt';
import { ensure, hash, row, now, type Principal } from './core.js';
import type { Store } from './store.js';
export function passwordHash(password: string) { ensure(typeof password==='string'&&password.length>=12&&password.length<=256,'INVALID_REQUEST');const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex'); }
export function passwordValid(password: string, encoded: string) { if(typeof password!=='string'||password.length>256)return false; const [salt,value]=encoded.split(':');const actual=scryptSync(password,salt,64);const expected=Buffer.from(value,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected); }
export async function session(db: Store, authorization?: string, cookie?: string): Promise<Principal> {
  let user;
  if(authorization?.startsWith('Bearer ')){
    const s=await db.get('sessions',hash(authorization.slice(7))); ensure(s&&Date.parse(s.expiresAt)>Date.now()&&!s.revoked,'UNAUTHORIZED',401);
    user=await db.get('users',s.userId);
  }else if(cookie&&process.env.AUTH_SECRET){
    const token=await getToken({req:{headers:{cookie}},secret:process.env.AUTH_SECRET,cookieName:'attest.session-token',salt:'attest.session-token'});
    ensure(token?.sub,'UNAUTHORIZED',401);user=await db.get('users',token.sub);
    ensure(user&&(user.authVersion??0)===(token.authVersion??0),'UNAUTHORIZED',401);
  }
  ensure(user&&user.verified&&!user.suspended,'UNAUTHORIZED',401);
  if(user.role==='agent'){const agent=await db.get('agents',user.id);ensure(agent?.status==='active','FORBIDDEN',403);}
  return {id:user.id,role:user.role,organisationId:user.organisationId!,projectId:user.projectId,deviceKey:user.deviceKey};
}
export async function issueSession(db: Store, userId: string) { const token=randomBytes(32).toString('hex');await db.put('sessions',row({id:hash(token),userId,expiresAt:new Date(Date.now()+8*3600_000).toISOString()}));return token; }
