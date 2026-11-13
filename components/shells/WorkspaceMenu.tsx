"use client";
import {useId,useRef,useState,type ReactNode} from 'react';

export function WorkspaceMenu({children,current}:{children:ReactNode;current:string}){
  const [open,setOpen]=useState(false),id=useId(),button=useRef<HTMLButtonElement>(null);
  return <div className="workspace-menu" onKeyDown={event=>{if(event.key==='Escape'&&open){setOpen(false);button.current?.focus();}}}>
    <button ref={button} type="button" className="btn-outline workspace-menu-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><span>{open?'Close menu':'More'} · {current}</span><span aria-hidden="true">{open?'−':'+'}</span></button>
    <div id={id} className="workspace-menu-content" data-open={open} onClick={event=>{if((event.target as HTMLElement).closest('a'))setOpen(false);}}>{children}</div>
  </div>;
}
