import test from 'node:test';
import assert from 'node:assert/strict';
import {aiPanelRequest} from '../lib/ai-panel-http.js';
test('HTTP rejects cross-origin, malformed, oversized bodies and hides unknown failures',async()=>{
 const url=new URL('https://example.org/api/v3/ai-panel'),service={save:async()=>{throw Error('private key');}};
 assert.equal((await aiPanelRequest({method:'POST',headers:{origin:'https://evil.org'},body:{}},{url,service})).status,403);
 assert.equal((await aiPanelRequest({method:'POST',body:'{'},{url,service})).status,400);
 assert.equal((await aiPanelRequest({method:'POST',body:' '.repeat(4*1024*1024+1)},{url,service})).status,413);
 assert.equal((await aiPanelRequest({method:'POST',body:{}},{url,service})).data.error,'AI_PANEL_REQUEST_FAILED');
});
test('public detail never inherits signed-in administrator access; explicit edit does',async()=>{
 const admin={id:'admin',role:'admin',status:'active'},seen=[],service={get:async(id,user)=>{seen.push(user);return {ok:true,item:{id}};}};
 let url=new URL('https://example.org/api/v3/ai-panel?id=run1');
 await aiPanelRequest({method:'GET'},{url,service,user:admin});assert.equal(seen.at(-1),null);
 url.searchParams.set('edit','1');await aiPanelRequest({method:'GET'},{url,service,user:admin});assert.equal(seen.at(-1),admin);
 assert.equal((await aiPanelRequest({method:'GET'},{url,service,user:null})).status,403);
});
test('history HTTP dispatch only passes ID and pagination, never administrator access',async()=>{
 let args;const service={history:async(...values)=>{args=values;return {ok:true,items:[],page:2,total:0};}},url=new URL('https://example.org/api/v3/ai-panel?view=history&panel=JCS-AI-1000&page=2');
 const response=await aiPanelRequest({method:'GET'},{url,service,user:{id:'a',role:'admin',status:'active'}});
 assert.equal(response.status,200);assert.deepEqual(args,['JCS-AI-1000',{page:'2'}]);
});
