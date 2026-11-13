"use client";
import {useState,type InputHTMLAttributes} from 'react';
export function PasswordInput(props:InputHTMLAttributes<HTMLInputElement>){
 const [visible,setVisible]=useState(false);
 return <div className="password-control"><input {...props} type={visible?'text':'password'}/><button type="button" className="btn-quiet" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'Hide':'Show'}</button></div>;
}
