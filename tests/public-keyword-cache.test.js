import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicKeywordCache} from '../lib/public-keyword-cache.js';

test('identical public inputs reuse calculation; every source change invalidates it',()=>{
 let calls=0;
 const cached=createPublicKeywordCache((...args)=>({call:++calls,args}));
 const inputs=[[{title:'기사',people:['a']}],{hidden:[]},'2026-09-29',['이름']];
 const first=cached(...inputs);
 assert.equal(cached(...structuredClone(inputs)),first);
 for(const index of [0,1,2,3]){
  const changed=structuredClone(inputs);
  changed[index]=index===0?[{title:'수정 기사',people:['a']}]:index===1?{hidden:['기사']}:index===2?'2026-09-30':['다른 이름'];
  assert.notEqual(cached(...changed),first);
  cached(...inputs);
 }
 assert.equal(calls,9);
});

test('failed calculations are not cached',()=>{
 let calls=0;const cached=createPublicKeywordCache(()=>{if(++calls===1)throw Error('retry');return [];});
 assert.throws(()=>cached([],{},'date',[]),/retry/);
 assert.deepEqual(cached([],{},'date',[]),[]);
 assert.equal(calls,2);
});
