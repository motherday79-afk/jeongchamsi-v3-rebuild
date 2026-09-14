import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignRequest } from '../lib/campaign-http.js';
import { createCampaignService } from '../lib/campaign-service.js';
const url=query=>new URL('/api/v3/campaigns'+query,'https://www.jeongchamsi.com');
const admin={id:'a',role:'admin'};
test('HTTP dispatch forwards default and explicit-category lists, public detail and protected edit separately',async()=>{
 const calls=[];const service={list:async(...args)=>{calls.push(['list',...args]);return {ok:true};},get:async(...args)=>{calls.push(['get',...args]);return {ok:true};}};
 await campaignRequest({method:'GET'},{service,url:url('?view=archive&page=2')});
 await campaignRequest({method:'GET'},{service,url:url('?view=current&page=3&category=culture')});
 await campaignRequest({method:'GET'},{service,url:url('?id=one')});
 await campaignRequest({method:'GET'},{service,user:admin,url:url('?id=one&edit=1')});
 assert.deepEqual(calls,[['list',null,{view:'archive',page:'2',category:'all'}],['list',null,{view:'current',page:'3',category:'culture'}],['get','one',null,{edit:false}],['get','one',admin,{edit:true}]]);
});
test('HTTP mutation rejects cross-origin writes before storage and keeps conflict status',async()=>{
 let called=false;const service={save:async()=>{called=true;throw new Error('CAMPAIGN_CONFLICT');}};
 const denied=await campaignRequest({method:'PATCH',headers:{origin:'https://other.example'},body:{}},{service,user:admin,url:url('')});
 assert.equal(denied.status,403);assert.equal(called,false);
 const conflict=await campaignRequest({method:'PATCH',headers:{origin:'https://www.jeongchamsi.com'},body:{}},{service,user:admin,url:url('')});
 assert.equal(conflict.status,409);
});
test('HTTP protected operations deny guests without accessing Redis',async()=>{
 const service=createCampaignService({command:()=>assert.fail('must not access storage')});
 for(const req of [{method:'GET',query:'?view=manage'},{method:'GET',query:'?id=one&edit=1'},{method:'POST',query:''},{method:'DELETE',query:'',body:{id:'one',version:1}},{method:'POST',query:'?image=1'}]){
  const result=await campaignRequest(req,{service,url:url(req.query)});assert.equal(result.status,403);
 }
});
test('HTTP preserves operation/version and safely handles malformed input',async()=>{
 let saved;const service={save:async(user,body)=>{saved={user,body};return {ok:true};}};
 const body={id:'one',version:3,operation:'publish',input:{headline:'정책'}};
 assert.equal((await campaignRequest({method:'PATCH',body:JSON.stringify(body)},{service,user:admin,url:url('')})).status,200);
 assert.deepEqual(saved,{user:admin,body});
 assert.equal((await campaignRequest({method:'POST',body:'{bad'},{service,url:url('')})).status,400);
 assert.equal((await campaignRequest({method:'PUT'},{service,url:url('')})).status,405);
});
test('unexpected storage errors do not reveal connection details to the client',async()=>{
 const result=await campaignRequest({method:'GET'},{service:{list:async()=>{throw new Error('redis://private-host:password');}},url:url('')});
 assert.equal(result.status,500);assert.equal(result.data.error,'CAMPAIGN_REQUEST_FAILED');
});
