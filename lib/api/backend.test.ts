import {afterEach,describe,expect,it,vi} from 'vitest';
import {backendRequest,messageForError,BackendError} from './backend';
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
    await expect(backendRequest('/api/runs/r/execute',{method:'POST',body:{},key:'original-action'})).rejects.toThrow('Check its latest status');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('helpful request failures',()=>{
 it('keeps diagnostic references out of the user message',()=>{const error=new BackendError('INTERNAL_SERVER_ERROR','private-reference',500);expect(error.message).not.toContain('private-reference');expect(error.requestId).toBe('private-reference');expect(error.message).toContain('Check the latest status');});
 it('explains expired sessions and access limits',()=>{expect(messageForError('UNAUTHORIZED',401)).toContain('sign in');expect(messageForError('FORBIDDEN',403)).toContain('administrator');});
 it('always clears request feedback after a failed mutation',async()=>{const dispatchEvent=vi.fn();vi.stubGlobal('window',{dispatchEvent,location:{pathname:'/register'}});vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('connection reset')));await expect(backendRequest('/api/example',{method:'POST'})).rejects.toThrow();expect(dispatchEvent.mock.calls.map(([event])=>event.detail.change)).toEqual([1,-1]);});
});
