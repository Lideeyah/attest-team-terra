import {afterEach,describe,expect,it,vi} from 'vitest';
import {backendRequest} from './backend';
afterEach(()=>vi.unstubAllGlobals());
describe('transient backend connectivity',()=>{
  it('recovers a dropped read connection',async()=>{
    const fetch=vi.fn().mockRejectedValueOnce(new TypeError('connection reset')).mockResolvedValueOnce(new Response(JSON.stringify({status:'success',data:{id:'p'},meta:null,request_id:'r'})));
    vi.stubGlobal('fetch',fetch);
    expect((await backendRequest<{id:string}>('/api/projects/p')).data.id).toBe('p');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('never automatically resubmits an uncertain mutation',async()=>{
    const fetch=vi.fn().mockRejectedValue(new TypeError('connection reset'));vi.stubGlobal('fetch',fetch);
    await expect(backendRequest('/api/runs/r/execute',{method:'POST',body:{},key:'original-action'})).rejects.toThrow('connection reset');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
