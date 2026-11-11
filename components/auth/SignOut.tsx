"use client";
import {useState,type FormEvent} from 'react';

export function SignOut(){
  const [busy,setBusy]=useState(false);
  async function signOut(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;setBusy(true);
    // Retain encrypted unsent captures, but remove the offline signed-in shell.
    try{if('caches'in window)await Promise.all((await caches.keys()).filter(key=>key.startsWith('attest-field-')).map(key=>caches.delete(key)));await(await import('@/lib/field/secure')).forgetFieldProfile();}catch{/* Server sign-out must still proceed if device storage is unavailable. */}
    form.submit();
  }
  return <form action="/signout" method="post" onSubmit={signOut}><button type="submit" className="btn-quiet btn-sm" disabled={busy}>{busy?'Signing out':'Sign out'}</button></form>;
}
