import {afterEach,expect,it,vi} from 'vitest';
import {redirectExpiredSession} from './expired-session';
afterEach(()=>vi.unstubAllGlobals());
it('returns an expired workspace session to its original page after login',()=>{
 const replace=vi.fn();vi.stubGlobal('window',{location:{pathname:'/app/roster',search:'?flagged=true',replace}});
 redirectExpiredSession();const destination=new URL(replace.mock.calls[0][0],'https://attest.example');
 expect(destination.pathname).toBe('/signin');expect(destination.searchParams.get('next')).toBe('/app/roster?flagged=true');
});
it('leaves public records open when an optional private request is refused',()=>{
 const replace=vi.fn();vi.stubGlobal('window',{location:{pathname:'/register',search:'',replace}});
 redirectExpiredSession();expect(replace).not.toHaveBeenCalled();
});
