import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCampaignPage } from '../src/core/campaign-routing.js';

const admin={authenticated:true,user:{id:'a',role:'admin'}};
test('more entry routes to the public list and archive pagination reaches the client',async()=>{
  const calls=[];const client={list:async options=>{calls.push(options);return {ok:true,items:[],counts:{}};}};
  const html=await loadCampaignPage({parts:['campaigns'],searchParams:new URLSearchParams('view=archive&page=2'),client});
  assert.deepEqual(calls,[{view:'archive',page:'2'}]);assert.match(html,/CAMPAIGN ARCHIVE/);
});
test('guest cannot load a protected record or create form',async()=>{
  const client={get:()=>assert.fail('protected data requested'),list:()=>assert.fail('protected list requested')};
  for(const parts of [['campaigns','write'],['campaigns','one','edit']]){
    const html=await loadCampaignPage({parts,client});assert.doesNotMatch(html,/data-campaign-form/);assert.match(html,/관리자/);
  }
  assert.match(await loadCampaignPage({parts:['campaigns'],searchParams:new URLSearchParams('view=manage'),client}),/관리자/);
});
test('admin edit uses the draft endpoint and detail uses only the public endpoint',async()=>{
  const calls=[];const client={get:async(id,options)=>{calls.push([id,options]);return {ok:true,item:options.edit?{id,version:2,draft:{headline:'초안 제목'}}:{id,headline:'공개 제목'}};}};
  assert.match(await loadCampaignPage({parts:['campaigns','one','edit'],session:admin,client}),/초안 제목/);
  assert.match(await loadCampaignPage({parts:['campaigns','one'],session:admin,client}),/공개 제목/);
  assert.deepEqual(calls,[['one',{edit:true}],['one',{edit:false}]]);
});
test('load failures stay readable and do not expose backend exception details',async()=>{
  const client={get:async()=>{throw new Error('redis-password-secret');}};
  const html=await loadCampaignPage({parts:['campaigns','one'],client});
  assert.match(html,/다시 시도/);assert.doesNotMatch(html,/redis-password-secret/);
});
test('category filter is combined with the current view and page',async()=>{const calls=[];const client={list:async options=>(calls.push(options),{ok:true,items:[],counts:{}})};await loadCampaignPage({parts:['campaigns'],searchParams:new URLSearchParams('category=business&page=3'),client});assert.deepEqual(calls,[{view:'current',page:'3',category:'business'}]);});
