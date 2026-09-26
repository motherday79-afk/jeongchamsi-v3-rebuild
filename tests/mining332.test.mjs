import test from 'node:test';import assert from 'node:assert/strict';
import {miningRequest} from '../lib/mining-http.js';
test('active members may play and visit; anonymous and suspended users cannot; admin endpoints stay private',async()=>{
 let calls=0;const service={run:async()=>{calls++;return {ok:true};},visit:async()=>{calls++;return 'https://example.com';},admin:async()=>{calls++;return {ok:true};},upload:async()=>{calls++;return {ok:true};}};
 const call=(path,user,method='GET')=>miningRequest({method,headers:{'content-type':'application/json'},body:{}},{service,user,url:new URL('https://jcs.test/api/v3/'+path)});
 const member={id:'member',role:'member',status:'active'};
 assert.equal((await call('mine',member)).status,200);assert.equal((await call('mine',member,'POST')).status,200);assert.equal((await call('mine/visit',member)).status,303);assert.equal(calls,3);
 assert.equal((await call('mine',null)).status,401);assert.equal((await call('mine',{...member,status:'suspended'})).status,403);
 assert.equal((await call('mine/admin',member)).status,403);assert.equal((await call('mine/image',member,'POST')).status,403);assert.equal(calls,3);
 assert.equal((await call('mine/admin',{id:'admin',role:'admin'})).status,200);
});
