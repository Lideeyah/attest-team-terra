"use client";
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {Lockup} from '@/components/Mark';
import {DeveloperShell} from '@/components/shells/DeveloperShell';

export function AccessFrame({children}:{children:ReactNode}){
 const pathname=usePathname();
 if(pathname.startsWith('/onboarding/developer'))return <div className="setup-workspace"><DeveloperShell account={{organisation:'Project setup',email:''}}>{children}</DeveloperShell></div>;
 return <div className="auth-frame"><aside className="auth-intro stack-lg"><Lockup size={24}/><h2 className="h2-display">Project income.<br/>Community benefit.</h2><p>Set up your project, check the agreement and follow payments to your community in one place.</p><p className="note">Your project workspace keeps agreement history, participant information and payment outcomes together.</p></aside><div className="auth-column stack-lg"><Lockup size={20}/>{children}</div></div>;
}
