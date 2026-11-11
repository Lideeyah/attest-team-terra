"use client";
import {useEffect,useState} from 'react';
import {backendRequest} from '@/lib/api/backend';
export function SessionAccount(){const [account,setAccount]=useState<{email:string;role:string}|null>(null);useEffect(()=>{let current=true;void backendRequest<{email:string;role:string}>('/api/auth/session').then(r=>{if(current)setAccount(r.data);}).catch(()=>{});return()=>{current=false;};},[]);return <><span className="eyebrow">{account?.role.replaceAll('_',' ')??'Account'}</span><span className="record-cell console-account">{account?.email??'Sign in required'}</span></>;}
