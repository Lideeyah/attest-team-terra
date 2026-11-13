"use client";
import {useEffect,useRef,type RefObject} from 'react';

export function useDialogFocus(open:boolean,panel:RefObject<HTMLElement|null>,onClose:()=>void,holding=false){
 const close=useRef(onClose),hold=useRef(holding);
 useEffect(()=>{close.current=onClose;hold.current=holding;});
 useEffect(()=>{
  if(!open)return;const previous=document.activeElement as HTMLElement|null;
  const items=()=>Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')??[]).filter(el=>el.getClientRects().length);
  const timer=setTimeout(()=>(items()[0]??panel.current)?.focus(),0);
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&!hold.current){event.preventDefault();close.current();}
   if(event.key!=='Tab')return;const stops=items();if(!stops.length){event.preventDefault();panel.current?.focus();return;}
   if(event.shiftKey&&document.activeElement===stops[0]){event.preventDefault();stops.at(-1)?.focus();}
   else if(!event.shiftKey&&document.activeElement===stops.at(-1)){event.preventDefault();stops[0].focus();}
  };
  document.addEventListener('keydown',key);return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);previous?.focus();};
 },[open,panel]);
}
