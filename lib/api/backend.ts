import type { Envelope } from "@attest/contracts";
import { requestContext } from "#api-context";
export class BackendError extends Error {
  constructor(public code:string,public requestId:string,public status:number) { super(`${code.replaceAll('_',' ').toLowerCase()} · reference ${requestId}`); }
}
export async function backendRequest<T>(path:string,options:{method?:string;body?:unknown;key?:string;signal?:AbortSignal}={}):Promise<{data:T;meta:unknown}> {
  const method=options.method??'GET',multipart=options.body instanceof FormData;
  if(multipart)for(const value of (options.body as FormData).values())if(value instanceof Blob&&value.size>4*1024*1024)throw new Error('Use a file no larger than 4 MiB.');
  const headers:Record<string,string>={Accept:'application/json',...await requestContext()};
  if(method!=='GET'&&!multipart){headers['Content-Type']='application/json';headers['Idempotency-Key']=options.key??crypto.randomUUID();}
  const origin=typeof window==='undefined'?(process.env.ATTEST_INTERNAL_URL??'http://localhost:3000'):'';
  const response=await fetch(origin+path,{method,credentials:'include',headers,signal:options.signal,body:method==='GET'?undefined:multipart?options.body as FormData:JSON.stringify(options.body??{}),cache:'no-store'});
  const value=await response.json() as Envelope<T>;
  if(value.status==='error')throw new BackendError(value.error.code,value.request_id,response.status);
  if(!response.ok||value.status!=='success')throw new Error('Unexpected service response. The action outcome is unknown; refresh before repeating it.');
  return {data:value.data,meta:value.meta};
}
