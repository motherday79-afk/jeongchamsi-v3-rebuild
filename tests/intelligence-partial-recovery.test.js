import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntelligenceRepository } from '../lib/intelligence-repository.js';
import { INTELLIGENCE_KEYS } from '../lib/intelligence-keys.js';

function redisMock(seed={}){
  const store=new Map(Object.entries(seed));
  const command=async args=>{
    const [op,...rest]=args;
    if(op==='GET')return store.get(rest[0])??null;
    if(op==='SET'){store.set(rest[0],rest[1]);return 'OK';}
    if(op==='MGET')return rest.map(key=>store.get(key)??null);
    if(op==='DEL'){let n=0;for(const key of rest){if(store.delete(String(key)))n++;}return n;}
    if(op==='SCAN')return ['0',[]];
    throw new Error(`UNSUPPORTED_${op}`);
  };
  return {store,command};
}

test('collection reuses last published input for a failed politician so one transient error does not block full publish',async()=>{
  const current='snap-new',published='snap-old';
  const prior={storageMode:'INPUT_ONLY_V4',id:'p2',snapshot:published,algorithmVersion:'JCS_INTELLIGENCE_V3',input:{searchAds:{volume:{pc:1,mobile:2,total:3}},news:{items:[]},officialContext:null,sourceErrors:[]},rankingInput:{searchTotal:3,articleCount:0,sourceCount:0,latestPublishedAt:'',searchStatus:'DIRECT',newsStatus:'DIRECT'}};
  const seed={
    [INTELLIGENCE_KEYS.publicPointer]:published,
    [INTELLIGENCE_KEYS.draft(published,'p2')]:JSON.stringify(prior),
  };
  const {store,command}=redisMock(seed);
  const repo=createIntelligenceRepository(command,{now:()=>123});
  await repo.createJob('collect',current,['p1','p2']);
  const batch=await repo.claimNextBatch('collect');
  await repo.putDraft(current,'p1',{...prior,id:'p1',snapshot:current});
  const job=await repo.completeBatch('collect',{start:batch.start,successIds:['p1'],failures:[{personId:'p2',stage:'collection',code:'SOURCE_TIMEOUT',attempts:3}]});

  assert.equal(job.status,'COMPLETED');
  assert.equal(job.failed,0);
  assert.deepEqual(job.successIds,['p1','p2']);
  const recovered=JSON.parse(store.get(INTELLIGENCE_KEYS.draft(current,'p2')));
  assert.equal(recovered.snapshot,current);
  assert.equal(recovered.input.sourceErrors.at(-1).code,'PREVIOUS_PUBLISHED_FALLBACK');
});
