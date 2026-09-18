import test from 'node:test';
import assert from 'node:assert/strict';
import {humanPollRequest,humanPollCronRequest} from '../lib/human-poll-http.js';
const admin={id:'a',role:'admin',status:'active'},url=new URL('https://example.com/api/v3/ai-panel-human');
test('public GET never collects and POST requires active admin, same origin, collect operation',async()=>{
 let writes=0;const service={list:async()=>({ok:true,items:[]}),collect:async()=>{writes++;return {ok:true,items:[]};}};
 assert.equal((await humanPollRequest({method:'GET'},{service,url})).status,200);assert.equal(writes,0);
 const post={method:'POST',headers:{origin:url.origin},body:{operation:'collect'}};
 for(const user of [null,{...admin,status:'suspended'}])assert.equal((await humanPollRequest(post,{service,user,url})).status,403);
 for(const headers of [{},{origin:'https://evil.com'},{origin:url.origin,'sec-fetch-site':'cross-site'}])assert.equal((await humanPollRequest({...post,headers},{service,user:admin,url})).status,403);
 assert.equal((await humanPollRequest({...post,body:{operation:'save'}},{service,user:admin,url})).status,400);assert.equal(writes,0);
 assert.equal((await humanPollRequest(post,{service,user:admin,url})).status,200);assert.equal(writes,1);
});
test('cron fails closed with absent/wrong secret, authenticated refresh succeeds',async()=>{
 let writes=0;const service={collectScheduled:async()=>{writes++;return {ok:true};}};
 for(const secret of ['',undefined,'valid'])assert.equal((await humanPollCronRequest({method:'GET',headers:{}},{service,secret})).status,401);
 assert.equal(writes,0);assert.equal((await humanPollCronRequest({method:'GET',headers:{authorization:'Bearer valid'}},{service,secret:'valid'})).status,200);assert.equal(writes,1);
});
