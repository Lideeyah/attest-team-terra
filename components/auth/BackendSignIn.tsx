"use client";
import { useState, type FormEvent } from "react";

export function BackendSignIn({ next }: { next?: string }) {
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
      if(!response.ok)throw Error('Sign-in failed. Check your credentials and account activation.');
      const session=await fetch('/api/auth/session',{credentials:'include'}).then(r=>r.json()) as {status:string;data?:{role:string}};
      if(session.status!=='success'||!session.data)throw Error('Sign-in failed. Check your credentials and account activation.');
      const destinations:Record<string,string>={agent:'/field',verifier:'/verifier',bank_ops:'/ops',platform_admin:'/admin'};
      location.assign(safeNext??destinations[session.data.role]??'/app');
    } catch(error) {setProblem(error instanceof Error?error.message:'Sign-in could not complete.');setPending(false);}
  }
  return <div className="auth-frame"><section className="auth-column stack-lg">
    <h1 className="h2-display">Sign in</h1><p className="note">Use your Attest account. Your role determines which workspace opens.</p>
    <form onSubmit={submit} className="stack">
      <label className="field"><span className="label">Email</span><input className="input" name="email" type="email" autoComplete="username" required /></label>
      <label className="field"><span className="label">Password</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
      {problem?<p role="alert">{problem}</p>:null}<button className="btn" disabled={pending}>{pending?'Signing in':'Sign in'}</button>
    </form><a href="/signin/reset">Reset password</a>
  </section></div>;
}
