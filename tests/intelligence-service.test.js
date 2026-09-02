import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntelligenceService } from '../lib/intelligence-service.js';
import { INTELLIGENCE_KEYS } from '../lib/intelligence-keys.js';

function fakeRedis(options={}){
  const map=new Map(),calls=[];
  let transientPublishedFailures=Number(options.transientPublishedFailures||0);
  return {
    map,calls,
    async command(args){
      const op=String(args[0]||'').toUpperCase(),key=String(args[1]||'');calls.push([...args]);
      if(transientPublishedFailures>0&&op==='SET'&&key.includes(':published:')){
        transientPublishedFailures-=1;
        throw Object.assign(new Error('STORAGE_REQUEST'),{code:'STORAGE_REQUEST'});
      }
      if(options.failPublishedId&&op==='SET'&&key.includes(`:published:`)&&key.endsWith(`:${options.failPublishedId}`))throw Object.assign(new Error('WRITE_FAILED'),{code:'WRITE_FAILED'});
      if(op==='GET')return map.get(key)??null;
      if(op==='SET'){map.set(key,args[2]);return 'OK';}
      if(op==='MGET')return args.slice(1).map(item=>map.get(item)??null);
      if(op==='DEL'){let removed=0;for(const item of args.slice(1)){if(map.delete(String(item)))removed+=1;}return removed;}
      throw new Error(`UNSUPPORTED:${op}`);
    }
  };
}

const profiles=count=>Array.from({length:count},(_,index)=>({
  id:`assembly-${String(index+1).padStart(3,'0')}`,type:'assembly',name:`정치인${index+1}`,party:index%2?'국민의힘':'더불어민주당',region:index%3?'서울':'경기',jurisdiction:`선거구${index+1}`,terms:`${index%5+1}선`,roleLabel:'국회의원',office:'국회의원',isVacant:false
}));

function createService(redis,rows,options={}){
  return createIntelligenceService({
    command:redis.command,profiles:rows,env:{NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},now:options.now||(()=>1_788_400_000_000),
    storageRetryDelays:options.storageRetryDelays,
    collectRaw:options.collectRaw||((person,context)=>Promise.resolve({personId:person.id,snapshotId:context.snapshotId,officialProfile:person,sourceErrors:[]})),
    analyze:options.analyze||((person,raw)=>({id:person.id,snapshot:raw.snapshotId,signal:{index:Number(person.id.slice(-3))%100},raw:{officialProfile:person}})),
    validateDraft:()=>({ok:true,errors:[]}),
    validateSnapshot:(drafts,expectedIds)=>({ok:drafts.length===expectedIds.length,total:drafts.length,expected:expectedIds.length,missingIds:[],duplicateIds:[],unexpectedIds:[],invalid:[]})
  });
}

test('a 542-person collection completes in exactly 22 steps of at most 25 people',async()=>{
  const redis=fakeRedis(),service=createService(redis,profiles(542));
  const started=await service.startCollection();
  assert.equal(started.job.total,542);
  const sizes=[];
  while(true){const step=await service.runCollectionStep();if(!step.batch.size)break;sizes.push(step.batch.size);if(step.job.status!=='RUNNING')break;}
  assert.equal(sizes.length,22);
  assert.equal(Math.max(...sizes),25);
  assert.equal(sizes.at(-1),17);
  assert.equal((await service.status()).collection.status,'COMPLETED');
});

test('a new service instance resumes from the persisted collection cursor',async()=>{
  const redis=fakeRedis(),rows=profiles(30),first=createService(redis,rows);
  await first.startCollection();
  const one=await first.runCollectionStep();
  assert.equal(one.job.completed,25);
  const resumed=createService(redis,rows);
  const two=await resumed.runCollectionStep();
  assert.equal(two.batch.start,25);
  assert.equal(two.batch.size,5);
  assert.equal(two.job.status,'COMPLETED');
});

test('one politician failure is recorded and later politicians still complete',async()=>{
  const redis=fakeRedis(),rows=profiles(3),service=createService(redis,rows,{collectRaw:async(person,context)=>{
    if(person.id==='assembly-002')throw Object.assign(new Error('SOURCE_TIMEOUT'),{code:'SOURCE_TIMEOUT'});
    return {personId:person.id,snapshotId:context.snapshotId,officialProfile:person,sourceErrors:[]};
  }});
  await service.startCollection();
  const result=await service.runCollectionStep();
  assert.equal(result.job.status,'COMPLETED_WITH_ERRORS');
  assert.equal(result.job.succeeded,2);
  assert.equal(result.job.failures[0].personId,'assembly-002');
  assert.ok(redis.map.has([...redis.map.keys()].find(key=>key.endsWith(':assembly-003'))));
});

test('publishing is rejected until a complete validated collection exists',async()=>{
  const service=createService(fakeRedis(),profiles(2));
  await assert.rejects(()=>service.startPublish(),/COLLECTION_NOT_READY/);
});

test('collection cannot silently publish zero search demand when Naver credentials are missing',async()=>{
  const redis=fakeRedis(),service=createIntelligenceService({command:redis.command,profiles:profiles(1),env:{},collectRaw:async()=>({})});
  await assert.rejects(()=>service.startCollection(),/NAVER_CREDENTIALS_MISSING/);
});

test('a partial direct publication leaves the existing public pointer unchanged',async()=>{
  const redis=fakeRedis();redis.map.set(INTELLIGENCE_KEYS.publicPointer,'old-snapshot');
  const service=createService(redis,profiles(30));
  await service.startCollection();await service.runCollectionStep();await service.runCollectionStep();await service.startPublish();
  const published=await service.runPublishStep();
  assert.equal(published.job.status,'RUNNING');
  assert.equal(published.job.completed,25);
  assert.equal(redis.map.get(INTELLIGENCE_KEYS.publicPointer),'old-snapshot');
});

test('successful publication writes rankings before switching the public pointer',async()=>{
  const redis=fakeRedis(),service=createService(redis,profiles(30));
  const collection=await service.startCollection();await service.runCollectionStep();await service.runCollectionStep();
  await service.startPublish();await service.runPublishStep();const result=await service.runPublishStep();
  assert.equal(result.job.status,'COMPLETED');
  assert.equal(redis.map.get(INTELLIGENCE_KEYS.publicPointer),collection.job.snapshotId);
  const rankings=await service.getPublicRankings();
  assert.equal(rankings.overall.length,30);
  assert.equal(rankings.overall[0].id,'assembly-030');
  const rankWrite=redis.calls.findIndex(args=>args[0]==='SET'&&args[1]===INTELLIGENCE_KEYS.rankings(collection.job.snapshotId));
  const pointerWrite=redis.calls.findIndex(args=>args[0]==='SET'&&args[1]===INTELLIGENCE_KEYS.publicPointer&&args[2]===collection.job.snapshotId);
  assert.ok(rankWrite>=0&&pointerWrite>rankWrite);
});

test('a transient storage failure is retried without advancing or losing the publication batch',async()=>{
  const redis=fakeRedis(),rows=profiles(3),service=createService(redis,rows,{storageRetryDelays:[0,0,0]});
  const collection=await service.startCollection();
  await service.runCollectionStep();
  await service.startPublish();
  const published=await service.runPublishStep();
  assert.equal(published.job.status,'COMPLETED');
  assert.equal(published.job.completed,3);
  assert.equal(published.job.failed,0);
  assert.equal(redis.map.get(INTELLIGENCE_KEYS.publicPointer),collection.job.snapshotId);
});

test('an old partial copy publication is cleaned and resumes from its saved cursor using validated drafts',async()=>{
  const redis=fakeRedis(),rows=profiles(30),oldService=createService(redis,rows);
  const collection=await oldService.startCollection();
  await oldService.runCollectionStep();await oldService.runCollectionStep();
  await oldService.startPublish();
  const snapshot=collection.job.snapshotId;
  const job=JSON.parse(redis.map.get(INTELLIGENCE_KEYS.job('publish')));
  job.cursor=25;job.completed=25;job.succeeded=20;job.failed=5;job.successIds=job.ids.slice(0,20);job.failures=job.ids.slice(20,25).map(personId=>({personId,stage:'publish',code:'STORAGE_REQUEST',attempts:1}));job.activeBatch={start:25,ids:job.ids.slice(25),claimedAt:1};
  redis.map.set(INTELLIGENCE_KEYS.job('publish'),JSON.stringify(job));
  for(const personId of job.ids.slice(0,20))redis.map.set(INTELLIGENCE_KEYS.published(snapshot,personId),redis.map.get(INTELLIGENCE_KEYS.draft(snapshot,personId)));
  redis.map.set('jcs:rebuild:v2:users','preserve-users');

  const recovered=createService(redis,rows);
  const result=await recovered.runPublishStep();

  assert.equal(result.batch.start,25);
  assert.equal(result.job.status,'COMPLETED');
  assert.equal(result.job.completed,30);
  assert.equal(result.job.failed,0);
  assert.equal(result.job.storageMode,'DRAFT_POINTER');
  assert.equal(job.ids.filter(personId=>redis.map.has(INTELLIGENCE_KEYS.published(snapshot,personId))).length,0);
  assert.equal(job.ids.filter(personId=>redis.map.has(INTELLIGENCE_KEYS.draft(snapshot,personId))).length,30);
  assert.equal(redis.map.get('jcs:rebuild:v2:users'),'preserve-users');
  assert.equal(redis.map.get(INTELLIGENCE_KEYS.publicPointer),snapshot);
  assert.equal((await recovered.getPublicIntelligence('assembly-001')).id,'assembly-001');
  assert.equal(redis.calls.some(args=>args[0]==='SET'&&job.ids.some(personId=>args[1]===INTELLIGENCE_KEYS.published(snapshot,personId))),false);
});
