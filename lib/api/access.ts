import { redirect } from 'next/navigation';
import {headers} from 'next/headers';
import { backendRequest,BackendError } from './backend';
export async function requireRole(roles:string[]){
  if(process.env.ATTEST_API_MODE!=='live')return;
  try {const {data}=await backendRequest<{role:string}>('/api/auth/session');if(!roles.includes(data.role)){const destination:Record<string,string>={developer_admin:'/app',developer_operator:'/app',agent:'/field',verifier:'/verifier',bank_ops:'/ops',platform_admin:'/admin'};redirect(destination[data.role]??'/signin');}}
  catch(error){if(error instanceof BackendError&&error.status===401){const requested=(await headers()).get('x-attest-return-to')??'/app';redirect('/signin?next='+encodeURIComponent(requested));}throw error;}
}
