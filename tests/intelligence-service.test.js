import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntelligenceService } from '../lib/intelligence-service.js';
import { INTELLIGENCE_KEYS } from '../lib/intelligence-keys.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';

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
      if(op==='SCAN'){
        if(options.failScanAfterPointerChangeFrom&&map.get(INTELLIGENCE_KEYS.publicPointer)!==options.failScanAfterPointerChangeFrom)throw Object.assign(new Error('STORAGE_REQUEST'),{code:'STORAGE_REQUEST'});
        const pattern=String(args[3]||'*').replace(/[.+^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*');
        return ['0',[...map.keys()].filter(item=>new RegExp(`^${pattern}$`).test(item))];
      }
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
    validateSnapshot:(drafts,expectedIds)=>({ok:drafts.length===expectedIds.length,total:drafts.length,expected:expectedIds.length,missingIds:[],duplicateIds:[],unexpectedIds:[],invalid:[]}),
    validateStoredSnapshot:(drafts,expectedIds)=>({ok:drafts.length===expectedIds.length,total:drafts.length,expected:expectedIds.length,missingIds:[],duplicateIds:[],unexpectedIds:[],invalid:[]}),
    requireReviewApproval:options.requireReviewApproval??false
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

test('version metadata never stores thousands of article URLs in one Redis value',async()=>{
  const redis=fakeRedis(),rows=profiles(30),service=createService(redis,rows,{
    collectRaw:async(person,context)=>({personId:person.id,snapshotId:context.snapshotId,officialProfile:person,sourceErrors:[],news:{items:Array.from({length:10},(_,index)=>({title:`${person.name} 정책 ${index}`,source:`매체${index}`,url:`https://news.example/${person.id}/${index}/`+'x'.repeat(300),publishedAt:'2026-09-04T00:00:00.000Z'}))}}),
    analyze:(person,raw)=>({id:person.id,snapshot:raw.snapshotId,algorithmVersion:'JCS_INTELLIGENCE_V3',signal:{index:1},raw})
  });
  const started=await service.startCollection();
  while(true){const step=await service.runCollectionStep();if(step.job.status!=='RUNNING')break;}
  const encoded=redis.map.get(INTELLIGENCE_KEYS.version(started.job.snapshotId)),version=JSON.parse(encoded);
  assert.deepEqual(version.newsIds,[]);
  assert.equal(version.newsCount,300);
  assert.ok(encoded.length<5000);
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

test('a collection with source errors publishes only current successful records without restoring old data',async()=>{
  const redis=fakeRedis(),rows=profiles(3),service=createService(redis,rows,{
    requireReviewApproval:true,
    collectRaw:async(person,context)=>{
      if(person.id==='assembly-002')throw Object.assign(new Error('SOURCE_TIMEOUT'),{code:'SOURCE_TIMEOUT'});
      return {personId:person.id,snapshotId:context.snapshotId,officialProfile:person,sourceErrors:[]};
    }
  });
  const started=await service.startCollection();
  const collected=await service.runCollectionStep();

  assert.equal(collected.job.status,'COMPLETED_WITH_ERRORS');
  assert.equal(collected.validation.ok,true);
  assert.equal((await service.status()).versions[0].status,'draft');

  await service.approveDraft({reviewedBy:'admin'});
  const publication=await service.startPublish();
  assert.deepEqual(publication.job.ids,['assembly-001','assembly-003']);
  assert.equal(publication.job.total,2);
  await service.runPublishStep();

  assert.equal((await service.status()).publicSnapshot,started.job.snapshotId);
  assert.equal((await service.getPublicRankings()).overall.length,2);
  assert.equal(await service.getPublicIntelligence('assembly-002'),null);
});

test('publication start removes abandoned analysis snapshots while keeping the current draft and public fallback',async()=>{
  const redis=fakeRedis(),rows=profiles(2),service=createService(redis,rows,{requireReviewApproval:true});
  redis.map.set(INTELLIGENCE_KEYS.publicPointer,'public-fallback');
  redis.map.set(INTELLIGENCE_KEYS.draft('public-fallback',rows[0].id),JSON.stringify({id:rows[0].id,snapshot:'public-fallback'}));
  const started=await service.startCollection();await service.runCollectionStep();await service.approveDraft({reviewedBy:'admin'});
  redis.map.set(INTELLIGENCE_KEYS.draft('abandoned-snapshot',rows[0].id),JSON.stringify({id:rows[0].id,snapshot:'abandoned-snapshot'}));
  redis.map.set(INTELLIGENCE_KEYS.version('abandoned-snapshot'),JSON.stringify({analysisVersion:'abandoned-snapshot'}));
  redis.map.set(INTELLIGENCE_KEYS.history('abandoned-snapshot'),JSON.stringify([{id:'old-history'}]));

  await service.startPublish();

  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft('abandoned-snapshot',rows[0].id)),false);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.version('abandoned-snapshot')),false);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.history('abandoned-snapshot')),false);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft('public-fallback',rows[0].id)),true);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft(started.job.snapshotId,rows[0].id)),true);
});

test('a published pointer remains successful when only post-publication cleanup fails',async()=>{
  const redis=fakeRedis({failScanAfterPointerChangeFrom:'public-fallback'}),rows=profiles(2),service=createService(redis,rows,{storageRetryDelays:[0,0,0]});
  redis.map.set(INTELLIGENCE_KEYS.publicPointer,'public-fallback');
  redis.map.set(INTELLIGENCE_KEYS.version('public-fallback'),JSON.stringify({analysisVersion:'public-fallback',status:'published'}));
  const started=await service.startCollection();await service.runCollectionStep();await service.startPublish();

  const result=await service.runPublishStep();

  assert.equal(result.finalized.ok,true);
  assert.equal(redis.map.get(INTELLIGENCE_KEYS.publicPointer),started.job.snapshotId);
  assert.deepEqual(result.finalized.cleanupWarnings,['STORAGE_REQUEST','STORAGE_REQUEST']);
});

test('missing metadata for the previous public snapshot cannot block the new public pointer',async()=>{
  const redis=fakeRedis(),rows=profiles(2),service=createService(redis,rows);
  redis.map.set(INTELLIGENCE_KEYS.publicPointer,'public-without-version-metadata');
  const started=await service.startCollection();await service.runCollectionStep();await service.startPublish();

  const result=await service.runPublishStep();

  assert.equal(result.finalized.ok,true);
  assert.equal(redis.map.get(INTELLIGENCE_KEYS.publicPointer),started.job.snapshotId);
});

test('collection validates the full analysis but stores only compact reconstruction inputs',async()=>{
  const redis=fakeRedis(),rows=profiles(1);let validatedFull=false;
  const service=createIntelligenceService({
    command:redis.command,profiles:rows,env:{NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},now:()=>1_788_400_000_000,
    collectRaw:async(person,context)=>({personId:person.id,snapshotId:context.snapshotId,officialProfile:person,searchAds:{volume:{pc:10,mobile:20}},news:{items:[]},sourceErrors:[]}),
    analyze:(person,raw)=>({id:person.id,snapshot:raw.snapshotId,diagnoses:[{id:'01'}],prescriptions:[{id:'01'}],raw}),
    validateDraft:draft=>{validatedFull=Array.isArray(draft.diagnoses)&&Array.isArray(draft.prescriptions);return {ok:validatedFull,errors:[]};}
  });
  const started=await service.startCollection();
  const result=await service.runCollectionStep();
  const stored=JSON.parse(redis.map.get(INTELLIGENCE_KEYS.draft(started.job.snapshotId,rows[0].id)));
  assert.equal(result.job.status,'COMPLETED');
  assert.equal(validatedFull,true);
  assert.equal(stored.diagnoses,undefined);
  assert.equal(stored.prescriptions,undefined);
  assert.deepEqual(stored.input.news.items,[]);
  assert.equal(stored.rankingInput.searchTotal,30);
});

test('public detail reconstructs the complete V3 report from compact current-snapshot input',async()=>{
  const redis=fakeRedis(),rows=profiles(1);
  const service=createIntelligenceService({
    command:redis.command,profiles:rows,env:{NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},now:()=>1_788_400_000_000,
    collectRaw:async(person,context)=>({personId:person.id,snapshotId:context.snapshotId,officialProfile:person,searchAds:{volume:{pc:120,mobile:880}},news:{items:[{title:`${person.name} 민생 정책 현장 발표`,source:'검증 뉴스',url:'https://news.example/1',publishedAt:'2026-09-04T00:00:00Z'}]},sourceErrors:[]}),
    analyze:(person,raw,context,version)=>buildIntelligenceDraft(person,raw,context,version),
    requireReviewApproval:false
  });
  const started=await service.startCollection();
  await service.runCollectionStep();
  const stored=JSON.parse(redis.map.get(INTELLIGENCE_KEYS.draft(started.job.snapshotId,rows[0].id)));
  assert.equal(stored.diagnoses,undefined);
  assert.ok(Buffer.byteLength(JSON.stringify(stored),'utf8')<5000);
  await service.startPublish();
  await service.runPublishStep();
  const detail=await service.getPublicIntelligence(rows[0].id);
  assert.equal(detail.diagnoses.length,10);
  assert.equal(detail.prescriptions.length,10);
  assert.equal(detail.news[0].title,`${rows[0].name} 민생 정책 현장 발표`);
});

test('compact storage retains bounded local and policy evidence outside the representative ten',async()=>{
  const redis=fakeRedis(),rows=profiles(1);
  const general=Array.from({length:10},(_,index)=>({title:`${rows[0].name} 정치 일반 기사 ${index}`,source:`일반매체${index}`,url:`https://news.example/general-${index}`,publishedAt:'2026-09-04T00:00:00Z'}));
  const evidence=[
    {title:`${rows[0].name} ${rows[0].jurisdiction} 지역 예산 확보`,source:'지역신문',url:'https://news.example/local',publishedAt:'2026-09-03T00:00:00Z'},
    {title:`${rows[0].name} 청년 주거 공약 발표`,source:'정책신문',url:'https://news.example/policy',publishedAt:'2026-09-02T00:00:00Z'}
  ];
  const service=createIntelligenceService({
    command:redis.command,profiles:rows,env:{NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},now:()=>1_788_400_000_000,
    collectRaw:async(person,context)=>({personId:person.id,snapshotId:context.snapshotId,officialProfile:person,searchAds:{volume:{pc:10,mobile:20}},news:{items:[...general,...evidence]},sourceErrors:[]}),
    analyze:(person,raw)=>({id:person.id,snapshot:raw.snapshotId,algorithmVersion:'JCS_INTELLIGENCE_V3',raw}),validateDraft:()=>({ok:true,errors:[]}),requireReviewApproval:false
  });
  const started=await service.startCollection();await service.runCollectionStep();
  const stored=JSON.parse(redis.map.get(INTELLIGENCE_KEYS.draft(started.job.snapshotId,rows[0].id)));
  assert.equal(stored.input.news.items.length,10);
  assert.deepEqual(stored.input.news.evidenceItems.map(row=>row.url),['https://news.example/local','https://news.example/policy']);
  assert.ok(Buffer.byteLength(JSON.stringify(stored),'utf8')<9000);
});

test('public detail joins three competitors from their own current snapshot records',async()=>{
  const redis=fakeRedis(),rows=profiles(4);
  const service=createIntelligenceService({
    command:redis.command,profiles:rows,env:{NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},now:()=>1_788_400_000_000,
    collectRaw:async(person,context)=>{const order=Number(person.id.slice(-3));return {personId:person.id,snapshotId:context.snapshotId,officialProfile:person,searchAds:{volume:{pc:order*100,mobile:order*1000}},news:{items:Array.from({length:order},(_,index)=>({title:`${person.name} 정책 발표 ${index}`,source:`매체${order}-${index}`,url:`https://news.example/${order}/${index}`,publishedAt:'2026-09-04T00:00:00Z'}))},sourceErrors:[]};},
    analyze:(person,raw,context,version)=>buildIntelligenceDraft(person,raw,context,version),requireReviewApproval:false
  });
  await service.startCollection();await service.runCollectionStep();await service.startPublish();await service.runPublishStep();
  const detail=await service.getPublicIntelligence(rows[0].id),people=detail.diagnoses.find(row=>row.id==='05').display.people;
  assert.equal(people.length,4);
  assert.equal(people.slice(1).every(row=>Number.isFinite(row.pc)&&Number.isFinite(row.mobile)),true);
  assert.equal(people.slice(1).every(row=>Number.isFinite(row.newsCount)&&Number.isFinite(row.sourceCount)),true);
  assert.equal(people.slice(1).every(row=>Number.isFinite(row.overallRank)&&Number.isFinite(row.categoryRank)),true);
  assert.equal(people.slice(1).every(row=>Array.isArray(row.agendas)&&row.agendas.length>0),true);
  assert.equal(people.slice(1).every(row=>Array.isArray(row.newsPeriods)&&row.newsPeriods.length===3),true);
});

test('a legacy rich running collection is reset before it consumes more Redis capacity',async()=>{
  const redis=fakeRedis(),rows=profiles(2),service=createService(redis,rows);
  const started=await service.startCollection();
  const legacyDraft={id:rows[0].id,snapshot:started.job.snapshotId,diagnoses:Array.from({length:10},()=>({body:'x'.repeat(10000)})),prescriptions:Array.from({length:10},()=>({body:'y'.repeat(10000)}))};
  redis.map.set(INTELLIGENCE_KEYS.draft(started.job.snapshotId,rows[0].id),JSON.stringify(legacyDraft));
  const job=JSON.parse(redis.map.get(INTELLIGENCE_KEYS.job('collect')));
  Object.assign(job,{cursor:1,completed:1,succeeded:1,successIds:[rows[0].id],storageMode:'VERSIONED_V3'});
  redis.map.set(INTELLIGENCE_KEYS.job('collect'),JSON.stringify(job));
  const resumed=await service.startCollection();
  assert.equal(resumed.job.completed,0);
  assert.equal(resumed.job.storageMode,'INPUT_ONLY_V5');
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft(started.job.snapshotId,rows[0].id)),false);
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
  assert.equal(rankings.overall[0].id,'assembly-001');
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

test('published ranks use operating 40 search 60 news weights and synchronize detail NOW index',async()=>{
  const redis=fakeRedis(),rows=profiles(4);
  const service=createIntelligenceService({
    command:redis.command,
    profiles:rows,
    env:{NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},
    now:()=>1_788_400_000_000,
    collectRaw:async(person,context)=>{
      const order=Number(person.id.slice(-3)),items=Array.from({length:order},(_,index)=>({title:`기사 ${index}`,source:`매체 ${index}`,publishedAt:`2026-09-0${order}T00:00:00.000Z`}));
      return {personId:person.id,snapshotId:context.snapshotId,searchAds:{volume:{pc:order*100,mobile:order*900}},news:{items},officialProfile:person,sourceErrors:[]};
    },
    analyze:(person,raw)=>({id:person.id,snapshot:raw.snapshotId,signal:{index:100},rank:{overall:null,category:null,temporary:false},raw}),
    validateDraft:()=>({ok:true,errors:[]}),
    validateSnapshot:(drafts,expectedIds)=>({ok:drafts.length===expectedIds.length,total:drafts.length,expected:expectedIds.length,missingIds:[],duplicateIds:[],unexpectedIds:[],invalid:[]}),
    validateStoredSnapshot:(drafts,expectedIds)=>({ok:drafts.length===expectedIds.length,total:drafts.length,expected:expectedIds.length,missingIds:[],duplicateIds:[],unexpectedIds:[],invalid:[]}),
    requireReviewApproval:false
  });
  await service.startCollection();await service.runCollectionStep();await service.startPublish();await service.runPublishStep();
  const rankings=await service.getPublicRankings();
  assert.deepEqual(rankings.weights,{search:40,news:60,newsArticles:20,newsSources:20,newsRecency:20});
  assert.ok(new Set(rankings.overall.map(row=>row.score)).size>1);
  const detail=await service.getPublicIntelligence(rankings.overall[0].id);
  assert.equal(detail.signal.index,rankings.overall[0].score);
  assert.equal(detail.rank.overall,1);
});

test('repeated collection and publication keeps only the latest Redis snapshot',async()=>{
  const redis=fakeRedis(),rows=profiles(30);let clock=1_788_400_000_000;
  redis.map.set('jcs:rebuild:v2:users','preserve-users');
  const service=createService(redis,rows,{now:()=>clock});
  for(let cycle=0;cycle<3;cycle+=1){
    await service.startCollection();
    while((await service.status()).collection.status==='RUNNING')await service.runCollectionStep();
    await service.startPublish();
    while((await service.status()).publication.status==='RUNNING')await service.runPublishStep();
    clock+=1_000;
  }
  const current=redis.map.get(INTELLIGENCE_KEYS.publicPointer);
  const fullDraftKeys=[...redis.map.keys()].filter(key=>key.startsWith(`${INTELLIGENCE_KEYS.prefix}:draft:`)&&key!==INTELLIGENCE_KEYS.latestDraft);
  const historyKeys=[...redis.map.keys()].filter(key=>key.startsWith(`${INTELLIGENCE_KEYS.prefix}:history:`)&&key!==INTELLIGENCE_KEYS.historyIndex);
  assert.equal(fullDraftKeys.length,30);
  assert.equal(fullDraftKeys.every(key=>key.includes(`:${current}:`)),true);
  assert.equal(historyKeys.length,0);
  const versions=(await service.status()).versions;
  assert.equal(versions.length,1);
  assert.equal(versions.filter(row=>row.status==='published').length,1);
  assert.equal(versions.filter(row=>row.status==='archived').length,0);
  assert.equal(redis.map.get('jcs:rebuild:v2:users'),'preserve-users');
});

test('production review flow requires an approved validated draft before publication',async()=>{
  const redis=fakeRedis(),rows=profiles(2),service=createService(redis,rows,{requireReviewApproval:true});
  const started=await service.startCollection();await service.runCollectionStep();
  await assert.rejects(()=>service.startPublish(),/DRAFT_APPROVAL_REQUIRED/);
  const approved=await service.approveDraft({reviewedBy:'admin'});
  assert.equal(approved.version.status,'approved');
  await service.startPublish();await service.runPublishStep();
  const status=await service.status();
  assert.equal(status.publicSnapshot,started.job.snapshotId);
  assert.equal(status.versions[0].status,'published');
});

test('a second publication removes the first snapshot and keeps only the current one',async()=>{
  const redis=fakeRedis(),rows=profiles(2);let clock=1_788_400_000_000;
  const service=createService(redis,rows,{now:()=>clock,requireReviewApproval:true});
  const publishCycle=async()=>{const started=await service.startCollection();await service.runCollectionStep();await service.approveDraft({reviewedBy:'admin'});await service.startPublish();await service.runPublishStep();return started.job.snapshotId;};
  const first=await publishCycle();clock+=1_000;const second=await publishCycle();
  const status=await service.status();
  assert.equal(status.publicSnapshot,second);
  assert.equal(status.versions.some(row=>row.analysisVersion===first),false);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft(first,rows[0].id)),false);
});

test('administrator draft edits preserve only edited fields beside compact collection input',async()=>{
  const redis=fakeRedis(),rows=profiles(1),service=createService(redis,rows,{requireReviewApproval:true,analyze:(person,raw)=>({id:person.id,snapshot:raw.snapshotId,diagnoses:[{id:'01',headline:'기존 진단'}],prescriptions:[{id:'01',linkedDiagnosisIds:['01'],strategicJudgment:'기존 처방'}],raw})});
  const started=await service.startCollection();await service.runCollectionStep();
  const pastRisks=[{tag:'#법적분쟁',title:'과거 법적 분쟁 근거',url:'https://evidence.example/legal',date:'2020-01-01'}];
  const edited=await service.updateDraft({personId:rows[0].id,editorId:'admin',diagnoses:[{id:'01',headline:'관리자 수정 진단',pastRisks}]});
  assert.equal(edited.draft.diagnoses[0].headline,'관리자 수정 진단');
  assert.deepEqual(edited.draft.diagnoses[0].display.pastRisks,pastRisks);
  assert.equal((await service.status()).versions[0].reviewStatus,'changes_pending');
  assert.equal(JSON.parse(redis.map.get(INTELLIGENCE_KEYS.revisions(started.job.snapshotId))).length,1);
  const stored=JSON.parse(redis.map.get(INTELLIGENCE_KEYS.draft(started.job.snapshotId,rows[0].id)));
  assert.equal(stored.adminOverrides.diagnoses[0].headline,'관리자 수정 진단');
  assert.deepEqual(stored.adminOverrides.diagnoses[0].pastRisks,pastRisks);
});
