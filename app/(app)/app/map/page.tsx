import {connection} from 'next/server';
import {api} from '@/lib/api/client';
import {PaymentMap} from '@/components/console/PaymentMap';
export default async function MapPage(){await connection();const s=await api.session();return <div className="console-page stack-lg">{s.ok&&s.data.projectId?<PaymentMap projectId={s.data.projectId}/>:<p>Select a project to inspect its geography.</p>}</div>;}
