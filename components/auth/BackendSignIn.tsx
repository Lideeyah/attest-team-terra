"use client";

import {GuidedField} from "@/components/GuidedField";
import {PasswordInput} from "./PasswordInput";
import { useState, type FormEvent } from "react";

export function BackendSignIn({ next, email, created=false }: { next?: string; email?: string; created?: boolean }) {
  const [pending,setPending]=useState(false);
  const [problem,setProblem]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setPending(true);setProblem("");
    try {
      const fields=new FormData(event.currentTarget);
      const csrf=await fetch('/auth/csrf',{credentials:'include'}).then(r=>r.json()) as {csrfToken:string};
      const requested=new URL(next||'/app',location.origin);
      const safeNext=next&&requested.origin===location.origin?requested.pathname+requested.search+requested.hash:null;
      const callback=safeNext??'/app';
      const response=await fetch('/auth/callback/credentials',{method:'POST',credentials:'include',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({email:String(fields.get('email')),password:String(fields.get('password')),csrfToken:csrf.csrfToken,callbackUrl:new URL(callback,location.origin).href})});
      if(!response.ok)throw Error('We could not sign you in. Check your email and password and try again.');
      const session=await fetch('/api/auth/session',{credentials:'include'}).then(r=>r.json()) as {status:string;data?:{role:string;projectId?:string|null}};
      if(session.status!=='success'||!session.data)throw Error('We could not sign you in. Check your email and password and try again.');
      const destinations:Record<string,string>={agent:'/field',verifier:'/verifier',bank_ops:'/ops',platform_admin:'/admin'};
      const needsProject=['developer_admin','developer_operator'].includes(session.data.role)&&!session.data.projectId;
      location.assign(needsProject?'/onboarding/developer/project':safeNext??destinations[session.data.role]??'/app');
    } catch(error) {setProblem(error instanceof Error?error.message:'Sign-in could not complete.');setPending(false);}
  }
  return <div className="auth-frame"><section className="auth-column stack-lg">
    <h1 className="h2-display">Sign in</h1><p className="note">Use your Attest account. Your role determines which workspace opens.</p>
    <p className="note" role="status">{created?"Your account is ready. Sign in below. No email confirmation is needed.":""}</p>
    <form onSubmit={submit} className="stack">
      <GuidedField label="Email"><input className="input" name="email" defaultValue={email} type="email" autoComplete="username" required /></GuidedField>
      <GuidedField label="Password"><PasswordInput className="input" name="password" autoComplete="current-password" required /></GuidedField>
      {problem?<p role="alert">{problem}</p>:null}<button className="btn" disabled={pending}>{pending?'Signing in':'Sign in'}</button>
    </form><a href="/signup/developer">Create an account</a><a href="/signin/reset">Reset password</a>
  </section></div>;
}
