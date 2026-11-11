import {cookies} from 'next/headers';
import {backendRequest} from '@/lib/api/backend';
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
  const input=await request.formData(),id=String(input.get('projectId')??'');
  try{await backendRequest(`/api/projects/${encodeURIComponent(id)}`);}catch{return new Response('Project unavailable',{status:403});}
  (await cookies()).set('attest_project',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:28800});
  return Response.redirect(new URL('/app',request.url),303);
}
