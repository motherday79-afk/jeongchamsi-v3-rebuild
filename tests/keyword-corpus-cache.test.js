import test from 'node:test';
import assert from 'node:assert/strict';
import {readKeywordCorpus} from '../lib/keyword-corpus-cache.js';
test('shared corpus is reused across callers and publication changes miss the cache',async()=>{
 const map=new Map();let loads=0,ttl;
 const command=async([verb,key,...args])=>verb==='GET'?map.get(key): (ttl=args[0],map.set(key,args[1]),'OK');
 const load=async()=>{loads++;return [{title:'공개 기사'}];};
 assert.deepEqual(await readKeywordCorpus(command,'first',load),[{title:'공개 기사'}]);
 await readKeywordCorpus(command,'first',load);assert.equal(loads,1);assert.equal(ttl,'60');
 await readKeywordCorpus(command,'second',load);assert.equal(loads,2);
});
test('cache failure falls back to authoritative data; source errors still fail',async()=>{
 const command=async()=>{throw Error('cache unavailable');};
 assert.deepEqual(await readKeywordCorpus(command,'x',async()=>[]),[]);
 await assert.rejects(readKeywordCorpus(command,'x',async()=>{throw Error('source failed');}),/source failed/);
});
