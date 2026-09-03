import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_POLITICIAN_BATCH,
  chunkKeys,
  batchedMget,
  createIntelligenceRepository,
} from '../lib/intelligence-repository.js';
import { INTELLIGENCE_KEYS } from '../lib/intelligence-keys.js';

function fakeRedis(seed={}){
  const map=new Map(Object.entries(seed));
  const calls=[];
  return {
    map,
    calls,
    async command(args){
      const op=String(args[0]||'').toUpperCase();
      calls.push([...args]);
      if(op==='GET')return map.get(args[1])??null;
      if(op==='SET'){map.set(args[1],args[2]);return 'OK';}
      if(op==='MGET')return args.slice(1).map(key=>map.get(key)??null);
      if(op==='DEL'){let removed=0;for(const key of args.slice(1))if(map.delete(String(key)))removed+=1;return removed;}
      if(op==='SCAN'){
        const pattern=String(args[3]||'*').replace(/[.+^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*');
        return ['0',[...map.keys()].filter(key=>new RegExp(`^${pattern}$`).test(key))];
      }
      throw new Error(`UNSUPPORTED:${op}`);
    }
  };
}

test('politician batches can never be configured above 25 records',()=>{
  assert.equal(MAX_POLITICIAN_BATCH,25);
  assert.throws(()=>chunkKeys(Array.from({length:26},(_,i)=>`p${i+1}`),26),/BATCH_SIZE_EXCEEDS_25/);
});

test('legacy unfinished collection is reset without touching the public snapshot or user data',async()=>{
  const redis=fakeRedis(),repository=createIntelligenceRepository(redis.command,{now:()=>4_000});
  await repository.createJob('collect','new-snapshot',['p1','p2']);
  await repository.putDraft('new-snapshot','p1',{id:'p1'});
  const job=JSON.parse(redis.map.get(INTELLIGENCE_KEYS.job('collect')));
  job.cursor=1;job.completed=1;job.successIds=['p1'];job.activeBatch=null;delete job.storageMode;
  redis.map.set(INTELLIGENCE_KEYS.job('collect'),JSON.stringify(job));
  redis.map.set(INTELLIGENCE_KEYS.publicPointer,'public-snapshot');
  redis.map.set(INTELLIGENCE_KEYS.draft('public-snapshot','p1'),JSON.stringify({id:'public-p1'}));
  redis.map.set('jcs:rebuild:v2:users','preserve-users');
  redis.map.set(`${INTELLIGENCE_KEYS.prefix}:history:old-snapshot`,'obsolete-intelligence-history');

  const recovered=await repository.prepareCompactCollection();

  assert.equal(recovered.cursor,0);
  assert.equal(recovered.storageMode,'LATEST_ONLY_V3');
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft('new-snapshot','p1')),false);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft('public-snapshot','p1')),true);
  assert.equal(redis.map.get('jcs:rebuild:v2:users'),'preserve-users');
  assert.equal(redis.map.has(`${INTELLIGENCE_KEYS.prefix}:history:old-snapshot`),false);
});

test('latest-only storage clears intelligence history without touching users or the public snapshot',async()=>{
  const redis=fakeRedis(),repository=createIntelligenceRepository(redis.command);
  redis.map.set(INTELLIGENCE_KEYS.publicPointer,'current-snapshot');
  redis.map.set(INTELLIGENCE_KEYS.draft('current-snapshot','p1'),'current');
  redis.map.set(INTELLIGENCE_KEYS.history('old-1'),'history-1');
  redis.map.set(INTELLIGENCE_KEYS.history('old-2'),'history-2');
  redis.map.set(INTELLIGENCE_KEYS.historyIndex,'history-index');
  redis.map.set('jcs:rebuild:v2:users','preserve-users');

  const result=await repository.clearHistory();

  assert.equal(result.removed,3);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft('current-snapshot','p1')),true);
  assert.equal(redis.map.get('jcs:rebuild:v2:users'),'preserve-users');
});

test('snapshot cleanup removes only obsolete full intelligence keys',async()=>{
  const redis=fakeRedis(),repository=createIntelligenceRepository(redis.command);
  for(const key of [
    INTELLIGENCE_KEYS.draft('old-snapshot','p1'),INTELLIGENCE_KEYS.published('old-snapshot','p1'),
    INTELLIGENCE_KEYS.validation('old-snapshot'),INTELLIGENCE_KEYS.rankings('old-snapshot')
  ])redis.map.set(key,'old');
  redis.map.set(INTELLIGENCE_KEYS.draft('current-snapshot','p1'),'current');
  redis.map.set(INTELLIGENCE_KEYS.history('old-snapshot'),'history');
  redis.map.set('jcs:rebuild:v2:users','preserve-users');

  const result=await repository.cleanupObsoleteSnapshots(['current-snapshot']);

  assert.equal(result.removed,4);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.draft('current-snapshot','p1')),true);
  assert.equal(redis.map.has(INTELLIGENCE_KEYS.history('old-snapshot')),true);
  assert.equal(redis.map.get('jcs:rebuild:v2:users'),'preserve-users');
});

test('a 543-record read becomes 22 MGET calls with at most 25 keys each',async()=>{
  const redis=fakeRedis(Object.fromEntries(Array.from({length:543},(_,i)=>[`k${i+1}`,JSON.stringify({id:i+1})])));
  const values=await batchedMget(redis.command,Array.from({length:543},(_,i)=>`k${i+1}`));
  const mgets=redis.calls.filter(args=>args[0]==='MGET');
  assert.equal(values.length,543);
  assert.equal(mgets.length,22);
  assert.equal(Math.max(...mgets.map(args=>args.length-1)),25);
  assert.equal(mgets.at(-1).length-1,18);
});

test('collection cursor resumes at the first unfinished politician after a new repository instance',async()=>{
  const redis=fakeRedis();
  const ids=Array.from({length:543},(_,i)=>`assembly-${String(i+1).padStart(3,'0')}`);
  const first=createIntelligenceRepository(redis.command,{now:()=>1_000});
  await first.createJob('collect','snapshot-1',ids);
  const batch=await first.claimNextBatch('collect');
  assert.equal(batch.ids.length,25);
  assert.equal(batch.ids[0],'assembly-001');
  await first.completeBatch('collect',{start:batch.start,successIds:batch.ids,failures:[]});

  const resumed=createIntelligenceRepository(redis.command,{now:()=>2_000});
  const next=await resumed.claimNextBatch('collect');
  assert.equal(next.start,25);
  assert.equal(next.ids[0],'assembly-026');
  assert.equal((await resumed.readJob('collect')).completed,25);
});

test('a failed politician is recorded while successful politicians remain completed',async()=>{
  const redis=fakeRedis();
  const repository=createIntelligenceRepository(redis.command,{now:()=>3_000});
  await repository.createJob('collect','snapshot-2',['p1','p2','p3']);
  const batch=await repository.claimNextBatch('collect');
  const job=await repository.completeBatch('collect',{
    start:batch.start,
    successIds:['p1','p3'],
    failures:[{personId:'p2',stage:'searchAds',code:'SOURCE_TIMEOUT',attempts:3}]
  });
  assert.equal(job.status,'COMPLETED_WITH_ERRORS');
  assert.equal(job.completed,3);
  assert.deepEqual(job.successIds,['p1','p3']);
  assert.equal(job.failures[0].personId,'p2');
});
