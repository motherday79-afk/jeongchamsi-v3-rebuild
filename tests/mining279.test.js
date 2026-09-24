import test from 'node:test';
import assert from 'node:assert/strict';
import {miningRequest} from '../lib/mining-http.js';
test('mine is admin-only before any state reads, writes or ad redirects',async()=>{
 let calls=0;
 const service={run:async()=>{calls++;return {ok:true};},admin:async()=>{calls++;return {ok:true};},visit:async()=>{calls++;return 'https://example.com';}};
 for(const path of ['mine','mine/admin','mine/visit'])for(const method of ['GET','POST']){
  const response=await miningRequest({method,headers:{'content-type':'application/json'},body:{action:'lottery-buy'}},{service,user:{id:'member',role:'member'},url:new URL('https://jcs.test/api/v3/'+path)});
  assert.equal(response.status,403);assert.equal(response.data.error,'MINE_FORBIDDEN');
 }
 assert.equal(calls,0);
 const allowed=await miningRequest({method:'GET'},{service,user:{id:'admin',role:'admin'},url:new URL('https://jcs.test/api/v3/mine')});
 assert.equal(allowed.status,200);assert.equal(calls,1);
});
