import { Auth, type AuthConfig } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import type { Store } from './store.js';
import { passwordValid } from './auth.js';
import { hash } from './core.js';

export function authConfig(db: Store): AuthConfig {
  return {
    secret:process.env.AUTH_SECRET,
    trustHost:true,
    basePath:'/auth',
    session:{strategy:'jwt',maxAge:8*3600},
    cookies:{sessionToken:{name:'attest.session-token',options:{httpOnly:true,sameSite:'lax',path:'/',secure:process.env.NODE_ENV==='production'}}},
    providers:[Credentials({credentials:{email:{type:'email'},password:{type:'password'}},authorize:async(credentials)=>{
      if(typeof credentials.email!=='string'||typeof credentials.password!=='string')return null;
      const user=await db.get('users',hash(credentials.email.toLowerCase()));
      if(!user?.verified||user.suspended||!passwordValid(credentials.password,user.passwordHash))return null;
      if(user.role==='agent'&&(await db.get('agents',user.id))?.status!=='active')return null;
      return {id:user.id,email:user.email,authVersion:user.authVersion??0};
    }})],
    callbacks:{jwt:async({token,user})=>{if(user){token.sub=user.id;token.authVersion=(user as any).authVersion??0;}return token;},session:async({session,token})=>{
      if(token.sub){const u=await db.get('users',token.sub);if(u?.verified&&!u.suspended&&(u.authVersion??0)===(token.authVersion??0))Object.assign(session.user,{id:u.id,role:u.role,organisationId:u.organisationId,projectId:u.projectId});}
      return session;
    }},
    logger:{error:()=>{},warn:()=>{},debug:()=>{}}
  };
}
export async function authHandler(db:Store,request:Request){return Auth(request,authConfig(db));}
