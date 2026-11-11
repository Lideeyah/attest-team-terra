import {NextResponse,type NextRequest} from 'next/server';

export function proxy(request:NextRequest){
  if(request.nextUrl.pathname==='/field/manifest.webmanifest')return NextResponse.next();
  const destination=request.nextUrl.pathname+request.nextUrl.search;
  // This is only an optimistic gate. Layouts and the API validate the session.
  if(process.env.ATTEST_API_MODE==='live'&&!request.cookies.getAll().some(cookie=>cookie.name==='attest.session-token'||cookie.name.startsWith('attest.session-token.'))){
    const login=new URL('/signin',request.url);login.searchParams.set('next',destination);
    return NextResponse.redirect(login);
  }
  const headers=new Headers(request.headers);headers.set('x-attest-return-to',destination);
  return NextResponse.next({request:{headers}});
}
export const config={matcher:['/app/:path*','/field/:path*','/verifier/:path*','/ops/:path*','/admin/:path*','/onboarding/:path*']};
