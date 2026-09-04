import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntelligenceRepository } from '../lib/intelligence-repository.js';
import { INTELLIGENCE_KEYS } from '../lib/intelligence-keys.js';

function redisMock(seed={}){
  const store=new Map(Object.entries(seed));
  const command=async args=>{
    const [op,...rest]=args;
    if(op==='GET')return store.has(rest[0])?store.get(rest[0]):null;
    if(op==='SET'){store.set(rest[0],rest[1]);return 'OK';}
    if(op==='DEL'){let n=0;for(const key of rest){if(store.delete(key))n++;}return n;}
    if(op==='SCAN'){
      const pattern=rest[2]||'*';
      const escaped=pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
      const re=new RegExp(`^${escaped}$`);
      return ['0',[...store.keys()].filter(key=>re.test(key))];
    }
    if(op==='MGET')return rest.map(key=>store.get(key)??null);
    throw new Error(`UNSUPPORTED_${op}`);
  };
  return {store,command};
}

test('running V3 collection reclaims obsolete heavy snapshots before resuming cursor',async()=>{
  const current='snap-current',published='snap-public',old='snap-old';
  const job={id:`collect-${current}`,kind:'collect',snapshotId:current,status:'RUNNING',ids:['p1','p2'],total:2,cursor:1,completed:1,succeeded:1,failed:0,successIds:['p1'],failures:[],activeBatch:null,storageMode:'VERSIONED_V3'};
  const seed={
    [INTELLIGENCE_KEYS.job('collect')]:JSON.stringify(job),
    [INTELLIGENCE_KEYS.publicPointer]:published,
    [INTELLIGENCE_KEYS.draft(current,'p1')]:JSON.stringify({storageMode:'INPUT_ONLY_V4',id:'p1',snapshot:current,input:{news:{items:[]},sourceErrors:[]},rankingInput:{searchTotal:0,articleCount:0,sourceCount:0,latestPublishedAt:'',searchStatus:'MISSING',newsStatus:'DIRECT'}}),
    [INTELLIGENCE_KEYS.draft(published,'p1')]:JSON.stringify({id:'p1'}),
    [INTELLIGENCE_KEYS.draft(old,'p1')]:JSON.stringify({id:'p1',payload:'x'.repeat(1000)}),
    [INTELLIGENCE_KEYS.published(old,'p1')]:JSON.stringify({id:'p1'}),
    [INTELLIGENCE_KEYS.raw(old,'p1','news')]:JSON.stringify({items:[1,2,3]}),
    [INTELLIGENCE_KEYS.validation(old)]:JSON.stringify({ok:true}),
    [INTELLIGENCE_KEYS.rankings(old)]:JSON.stringify({overall:[]}),
    [INTELLIGENCE_KEYS.version(old)]:JSON.stringify({analysisVersion:old,status:'archived'}),
  };
  const {store,command}=redisMock(seed);
  const repo=createIntelligenceRepository(command,{now:()=>123});
  const result=await repo.prepareCompactCollection();

  assert.equal(result.cursor,1,'resume cursor must not reset');
  assert.equal(result.storageMode,'INPUT_ONLY_V4','running compact collection must be normalized without restart');
  assert.equal(store.has(INTELLIGENCE_KEYS.draft(current,'p1')),true,'current partial draft must survive');
  assert.equal(store.has(INTELLIGENCE_KEYS.draft(published,'p1')),true,'currently published snapshot must survive');
  assert.equal(store.has(INTELLIGENCE_KEYS.draft(old,'p1')),false,'obsolete draft must be reclaimed');
  assert.equal(store.has(INTELLIGENCE_KEYS.published(old,'p1')),false,'obsolete published payload must be reclaimed');
  assert.equal(store.has(INTELLIGENCE_KEYS.raw(old,'p1','news')),false,'obsolete raw payload must be reclaimed');
  assert.equal(store.has(INTELLIGENCE_KEYS.validation(old)),false,'obsolete validation payload must be reclaimed');
  assert.equal(store.has(INTELLIGENCE_KEYS.rankings(old)),false,'obsolete rankings payload must be reclaimed');
  assert.equal(store.has(INTELLIGENCE_KEYS.version(old)),true,'small version metadata must be preserved');
});
