import type { Envelope } from "@attest/contracts";
import { requestContext } from "#api-context";
import {redirectExpiredSession} from './expired-session';
export function messageForError(code:string,status:number):string {
  if(status===401)return 'Your session has ended. Please sign in again.';
  if(status===403)return 'You do not have access to this action. Ask your administrator for help.';
  if(status===404)return 'This record is no longer available. Refresh the page to see the latest records.';
  if(status===413)return 'This file is too large. Choose a smaller file and try again.';
  if(status===429)return 'There have been too many requests. Please wait a moment and try again.';
  if(status>=500)return 'We could not confirm the result. Check the latest status before trying again.';
  if(code.includes('INSUFFICIENT'))return 'There are not enough funds available. Review the funding before continuing.';
  if(code.includes('CONFLICT')||status===409)return 'This record has changed or this action was already requested. Refresh and check its status before continuing.';
  if(code.includes('EXPIRED'))return 'This link or request has expired. Please request a new one.';
  return 'We could not complete this request. Check the details and try again. If it continues, contact your administrator.';
}
export class BackendError extends Error {
  constructor(public code:string,public requestId:string,public status:number) { super(messageForError(code,status)); }
}
export async function backendRequest<T>(path:string,options:{method?:string;body?:unknown;key?:string;signal?:AbortSignal}={}):Promise<{data:T;meta:unknown}> {
  const method=options.method??'GET',multipart=options.body instanceof FormData;
  if(multipart)for(const value of (options.body as FormData).values())if(value instanceof Blob&&value.size>4*1024*1024)throw new Error('Use a file no larger than 4 MiB.');
  const headers:Record<string,string>={Accept:'application/json',...await requestContext()};
  if(method!=='GET'&&!multipart){headers['Content-Type']='application/json';headers['Idempotency-Key']=options.key??crypto.randomUUID();}
  const origin=typeof window==='undefined'?(process.env.ATTEST_INTERNAL_URL??'http://localhost:3000'):'';
  const send=()=>fetch(origin+path,{method,credentials:'include',headers,signal:options.signal,body:method==='GET'?undefined:multipart?options.body as FormData:JSON.stringify(options.body??{}),cache:'no-store'});
  const notify=(change:number)=>{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('attest:request',{detail:{change,method}}));};
  notify(1);
  try {
  const response=await send().catch(error=>{if(method!=='GET'||options.signal?.aborted)throw error;return send();});
  const value=await response.json() as Envelope<T>;
  if(response.status===401)redirectExpiredSession();
  if(value.status==='error')throw new BackendError(value.error.code,value.request_id,response.status);
  if(!response.ok||value.status!=='success')throw new Error('Unexpected service response. The action outcome is unknown; refresh before repeating it.');
  return {data:value.data,meta:value.meta};
  } catch(error) {
    if(error instanceof BackendError || (error instanceof DOMException && error.name==='AbortError'))throw error;
    throw new Error(method==='GET'?'We could not load this information. Check your connection and try again.':'We could not confirm whether your request completed. Check its latest status before trying again.');
  } finally {notify(-1);}
}
