import {connection} from 'next/server';
import {api} from '@/lib/api/client';
import {FinanceWorkspace} from '@/components/console/FinanceWorkspace';
import Link from 'next/link';
export default async function Page(){await connection();const session=await api.session();if(!session.ok||!session.data.projectId)return <div className="console-page stack"><h1 className="h2-display">Choose a project</h1><p>Select or create a project to continue.</p><Link href="/onboarding/developer/project">Set up a project</Link></div>;return <div className="console-page stack-lg"><FinanceWorkspace projectId={session.data.projectId} section="documents"/></div>;}
