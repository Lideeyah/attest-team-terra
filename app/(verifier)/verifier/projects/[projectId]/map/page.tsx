import {connection} from 'next/server';
import {PaymentMap} from '@/components/console/PaymentMap';
export default async function Page({params}:{params:Promise<{projectId:string}>}){await connection();const {projectId}=await params;return <div className="console-page stack-lg"><PaymentMap projectId={projectId} verifier/></div>;}
