export async function GET(request:Request,{params}:{params:Promise<{attestationId:string}>}){
  const {attestationId}=await params;
  return Response.redirect(new URL(`/api/attestations/${encodeURIComponent(attestationId)}/report?format=pdf`,request.url));
}
