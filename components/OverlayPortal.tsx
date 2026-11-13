"use client";
import {useSyncExternalStore,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
const subscribe=()=>()=>{};
export function OverlayPortal({children}:{children:ReactNode}){
 const mounted=useSyncExternalStore(subscribe,()=>true,()=>false);
 return mounted?createPortal(children,document.body):null;
}
