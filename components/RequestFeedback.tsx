"use client";
import {useEffect,useState} from 'react';
/** A short delay avoids flashing on fast requests; the count covers overlapping requests. */
export function RequestFeedback(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{let count=0;let timer:ReturnType<typeof setTimeout>|undefined;const listener=(event:Event)=>{const {change}=(event as CustomEvent<{change:number}>).detail;count=Math.max(0,count+change);if(count===0){clearTimeout(timer);timer=undefined;setVisible(false);}else if(!timer){timer=setTimeout(()=>setVisible(true),200);}};window.addEventListener('attest:request',listener);return()=>{clearTimeout(timer);window.removeEventListener('attest:request',listener);};},[]);
 return visible?<div className="request-feedback" role="status" aria-live="polite"><span className="busy-spinner" aria-hidden="true"/>Working... Please wait.</div>:null;
}
