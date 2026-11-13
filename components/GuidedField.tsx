"use client";
import {Children,cloneElement,isValidElement,useId,type ReactElement,type ReactNode} from 'react';
import {formCopy} from '@/lib/copy/forms';

export function GuidedField({label,hint,required,children}:{label:string;hint?:string;required?:boolean;children:ReactNode}){
 const id=useId(),copy=formCopy(label);
 const content=Children.toArray(children);
 const control=content.find(child=>isValidElement(child)&&(['input','select','textarea'].includes(String(child.type))||(typeof child.type!=='string'&&!!(child.props as {name?:string}).name))) as ReactElement<{required?:boolean;id?:string;'aria-describedby'?:string;'aria-label'?:string}>|undefined;
 const mandatory=required??control?.props.required??false,controlId=control?.props.id??id;
 return <div className="field"><label className="label" htmlFor={controlId}>{copy.label}<span className="field-requirement" aria-hidden="true">{mandatory?'Required':'Optional'}</span></label>{content.map(child=>child===control?cloneElement(control,{id:controlId,'aria-label':copy.label,'aria-describedby':`${controlId}-help`}):child)}<p id={`${controlId}-help`} className="field-note">{hint??copy.help}</p></div>;
}
