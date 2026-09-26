import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNowRankSchedule, SCHEDULE_KEY, MUTATION_LOCK, withRankingMutation, kstDate} from '../lib/now-rank-schedule.js';
import {nowRankCronRequest, continueNowRank} from '../lib/now-rank-cron-http.js';
import {INTELLIGENCE_KEYS as K} from '../lib/intelligence-keys.js';
import {dispatchAdminIntelligence} from '../api/gateway.js';
import {formatRankUpdatedAt,renderNowRankSchedule,renderRankUpdateNote} from '../src/views/now-rank-schedule.js';
import {createIntelligenceService} from '../lib/intelligence-service.js';

function fixture({failures=0, fatal=false}={}) {
  let time=Date.parse('2026-09-27T03:00:00Z'), collects=0, retries=0, publishes=0, starts=0;
  const map=new Map();
  const command=async ([op,key,...args])=>{
    if(op==='GET')return map.get(key)||null;
    if(op==='SET'){if(args.includes('NX')&&map.has(key))return null;map.set(key,args[0]);return 'OK';}
    if(op==='DEL')return Number(map.delete(key));
    if(op==='MGET')return [key,...args].map(k=>map.get(k)||null);
    if(op==='SCAN')return ['0',[]];
    if(op==='EVAL'){const actualKey=args[1], token=args[2];if(map.get(actualKey)===token){map.delete(actualKey);return 1;}return 0;}
    throw Error(op);
  };
  const put=(key,value)=>map.set(key,JSON.stringify(value));
  const get=key=>JSON.parse(map.get(key)||'null');
  const service={
    async startCollection(){starts++;const job={id:'collect-test',snapshotId:'test',status:'RUNNING',total:20,failed:0,successIds:[],createdAt:time};put(K.job('collect'),job);return {job};},
    async runCollectionStep(){if(fatal)throw Error('STORAGE_UNAVAILABLE');collects++;const job={...get(K.job('collect')),status:collects<2?'RUNNING':failures?'COMPLETED_WITH_ERRORS':'COMPLETED',failed:failures,total:20};put(K.job('collect'),job);put(K.validation('test'),{ok:true});return {job};},
    async retryCollectionFailures(){retries++;const job={...get(K.job('collect')),status:'RUNNING'};put(K.job('collect'),job);return {job};},
    async startPublish(){const job={snapshotId:'test',status:'RUNNING',publicationPending:true};put(K.job('publish'),job);return {job};},
    async runPublishStep(){publishes++;const job={snapshotId:'test',status:'COMPLETED',publicationPending:false};put(K.job('publish'),job);map.set(K.publicPointer,'test');return {job,finalized:{ok:true}};}
  };
  const scheduler=createNowRankSchedule({command,createService:()=>service,now:()=>time});
  return {scheduler,command,map,get,put,setTime:v=>time=v,counts:()=>({collects,retries,publishes,starts}),setFailures:v=>failures=v};
}
async function drain(f,ticket){let current=ticket;for(let i=0;current&&i<30;i++)current=await f.scheduler.step(current);return f.get(SCHEDULE_KEY);}

test('noon in Korea is 03:00 UTC and human poll schedule is retained',()=>{
  assert.equal(kstDate(Date.parse('2026-09-26T15:00:00Z')),'2026-09-27');
  const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));
  assert.ok(cfg.crons.some(x=>x.path==='/api/now-rank-cron'&&x.schedule==='0 3 * * *'));
  assert.ok(cfg.crons.some(x=>x.path==='/api/human-poll-cron'&&x.schedule==='0 8 * * *'));
});
test('daily start and replayed steps are idempotent; completion publishes once',async()=>{
  const f=fixture(), a=await f.scheduler.start(), b=await f.scheduler.start();
  assert.deepEqual(a,b);
  const next=await f.scheduler.step(a);
  assert.equal(await f.scheduler.step(a),null);
  assert.equal((await drain(f,next)).status,'COMPLETED');
  assert.equal(await f.scheduler.start(),null);
  assert.deepEqual(f.counts(),{collects:2,retries:0,publishes:1,starts:1});
});
test('failed collection is retried once and never published while incomplete',async()=>{
  const f=fixture({failures:1});f.map.set(K.publicPointer,'previous');
  const record=await drain(f,await f.scheduler.start());
  assert.equal(record.status,'FAILED');assert.equal(f.counts().retries,1);assert.equal(f.counts().publishes,0);
  assert.equal(f.map.get(K.publicPointer),'previous');
});
test('recovered source failure proceeds to publication',async()=>{
  const f=fixture({failures:1});let next=await f.scheduler.start();
  while(!f.counts().retries)next=await f.scheduler.step(next);
  f.setFailures(0);assert.equal((await drain(f,next)).status,'COMPLETED');
});
test('fatal collection exceptions are bounded and retain previous snapshot',async()=>{
  const f=fixture({fatal:true});f.map.set(K.publicPointer,'previous');
  const r=await drain(f,await f.scheduler.start());
  assert.equal(r.status,'FAILED');assert.equal(f.map.get(K.publicPointer),'previous');
  assert.notEqual(f.get(K.job('collect')).status,'RUNNING');
});
test('manual full refresh is excluded while scheduled run owns the pipeline',async()=>{
  const f=fixture();await f.scheduler.start();
  await assert.rejects(withRankingMutation(f.command,()=>assert.fail('must not run'),{now:()=>Date.parse('2026-09-27T03:01:00Z')}),/SCHEDULED_REFRESH_RUNNING/);
});
test('existing manual job is not adopted or published by the scheduler',async()=>{
  const f=fixture();f.put(K.job('collect'),{snapshotId:'manual',status:'RUNNING'});
  await drain(f,await f.scheduler.start());assert.equal(f.counts().starts,0);assert.equal(f.counts().publishes,0);
  assert.equal(f.get(K.job('collect')).status,'RUNNING');
});
test('an old callback cannot operate a new day and a live mutex excludes concurrent callers',async()=>{
  const f=fixture(),old=await f.scheduler.start();await drain(f,old);
  f.setTime(Date.parse('2026-09-28T03:00:00Z'));const next=await f.scheduler.start();
  assert.notEqual(next.runId,old.runId);assert.equal(await f.scheduler.step(old),null);
  f.map.set(MUTATION_LOCK,'held');await assert.rejects(f.scheduler.step(next),/RANKING_BUSY/);
});
test('authentication and preview guards run before storage or background work',async()=>{
  const createScheduler=()=>assert.fail('no storage access');const waitUntil=()=>assert.fail('no background work');
  for(const req of [{method:'GET',headers:{}},{method:'POST',headers:{authorization:'Bearer wrong'}}]){
    const r=await nowRankCronRequest(req,{secret:'valid',environment:'production',createScheduler,waitUntil});assert.equal(r.status,401);
  }
  const r=await nowRankCronRequest({method:'GET',headers:{authorization:'Bearer valid'}},{secret:'valid',environment:'preview',createScheduler,waitUntil});assert.equal(r.status,409);
});
test('server handoff uses only first-party endpoint, no redirects, bounded retries',async()=>{
  const calls=[];
  await continueNowRank({runId:'run',step:2},{secret:'test',fetchImpl:async(url,init)=>{calls.push({url,init});return {ok:true,status:202,json:async()=>({ok:true})};}});
  assert.equal(calls[0].url,'https://jeongchamsi-v3-rebuild.vercel.app/api/now-rank-cron');assert.equal(calls[0].init.redirect,'error');
  assert.equal(calls[0].init.headers.authorization,'Bearer test');
  let tries=0;await assert.rejects(continueNowRank({runId:'run',step:2},{secret:'test',fetchImpl:async()=>{tries++;throw Error('offline');},sleep:async()=>{}}),/CONTINUATION_FAILED/);assert.equal(tries,3);
});
test('HTTP background chain reaches publication without a browser',async()=>{
  const f=fixture(),pending=[];
  const deps={secret:'test',environment:'production',createScheduler:()=>f.scheduler,waitUntil:p=>pending.push(p),fetchImpl:async(url,init)=>{
    const result=await nowRankCronRequest({method:'POST',headers:init.headers,body:init.body},deps);
    return {status:result.status,json:async()=>result.data};
  }};
  const result=await nowRankCronRequest({method:'GET',headers:{authorization:'Bearer test'}},deps);
  assert.equal(result.status,202);
  for(let i=0;i<pending.length;i++)await pending[i];
  assert.equal(f.get(SCHEDULE_KEY).status,'COMPLETED');assert.equal(f.counts().publishes,1);
});
test('manual dispatch blocks full mutations but allows reading status',async()=>{
  const f=fixture();await f.scheduler.start();
  // The fixture clock must match the dispatcher's real-time guard.
  f.put(SCHEDULE_KEY,{...f.get(SCHEDULE_KEY),startedAt:Date.now()});
  const service={startCollection:()=>assert.fail('blocked'),status:async()=>({available:true})};
  const blocked=await dispatchAdminIntelligence('admin/intelligence/collect/start','POST',service,{},f.command);
  assert.equal(blocked.status,409);assert.equal(blocked.body.error,'SCHEDULED_REFRESH_RUNNING');
  assert.equal((await dispatchAdminIntelligence('admin/intelligence/status','GET',service,{},f.command)).status,200);
});
test('failure while handing off records a failed attempt without changing public ranking',async()=>{
  const f=fixture(),first=await f.scheduler.start();const next=await f.scheduler.step(first);
  f.map.set(K.publicPointer,'previous');await f.scheduler.fail(next,'CONTINUATION_FAILED');
  assert.equal(f.get(SCHEDULE_KEY).status,'FAILED');assert.equal(f.map.get(K.publicPointer),'previous');
});
test('invalid callback payload is rejected before initialization',async()=>{
  for(const body of ['not-json',{runId:'bad',step:0},{runId:'a'.repeat(36),step:-1}]){
    const result=await nowRankCronRequest({method:'POST',headers:{authorization:'Bearer test'},body},{secret:'test',environment:'production',createScheduler:()=>assert.fail('invalid request')});
    assert.equal(result.status,400);
  }
});
test('scheduled status and published timestamp use Korean time and escape errors',()=>{
  assert.match(formatRankUpdatedAt('2026-09-27T03:25:00Z'),/12:25/);
  assert.equal(formatRankUpdatedAt('bad'),'');
  assert.match(renderRankUpdateNote('2026-09-27T03:25:00Z'),/마지막 업데이트/);
  const html=renderNowRankSchedule({latest:{status:'FAILED',error:'<script>',updatedAt:Date.now()}});
  assert.match(html,/기존 순위 유지/);assert.ok(!html.includes('<script>'));
});
test('real collection rejects missing or partial fresh ranking sources only for scheduled jobs',async()=>{
  for(const [strict,partial] of [[true,false],[false,false],[true,true],[false,true]]){
    const f=fixture();
    const service=createIntelligenceService({command:f.command,profiles:[{id:'one',name:'테스트',type:'assembly'}],
      requireRankingSources:strict,now:()=>Date.parse('2026-09-27T03:00:00Z'),
      env:{NAVER_AD_ACCESS_LICENSE:'test',NAVER_AD_SECRET_KEY:'test',NAVER_AD_CUSTOMER_ID:'test'},
      collectRaw:async(person,context)=>({personId:person.id,snapshotId:context.snapshotId,searchAds:partial?{volume:{total:10}}:null,news:{items:[],coverage:partial?[{date:'2026-09-26',collected:true},{date:'2026-09-27',collected:false}]:[]},sourceErrors:partial?[]:[{source:'NAVER_SEARCH_ADS',code:'TIMEOUT'}]}),
      analyze:(person,raw)=>({id:person.id,snapshot:raw.snapshotId,signal:{index:1},raw}),
      validateDraft:()=>({ok:true}),validateStoredSnapshot:()=>({ok:true}),
      youtubeChannels:{registryForCollection:async()=>({})},
      adminPoliticians:{editorialInputs:async()=>({pastRisks:[],newsExclusions:[]}),applyToDraft:async(id,draft)=>draft}
    });
    await service.startCollection();const result=await service.runCollectionStep();
    assert.equal(result.job.status,strict?'COMPLETED_WITH_ERRORS':'COMPLETED');
    if(strict)assert.equal(result.job.failures[0].code,'RANKING_SOURCE_UNAVAILABLE');
  }
});
test('busy background step is re-delivered and does not strand the accepted ticket',async()=>{
  const f=fixture(),pending=[];let attempts=0;
  const scheduler={...f.scheduler,step:async input=>{if(attempts++<3)throw Error('RANKING_BUSY');return f.scheduler.step(input);}};
  const deps={secret:'test',environment:'production',createScheduler:()=>scheduler,waitUntil:p=>pending.push(p),sleep:async()=>{},fetchImpl:async(url,init)=>{
    const result=await nowRankCronRequest({method:'POST',headers:init.headers,body:init.body},deps);
    return {status:result.status,json:async()=>result.data};
  }};
  await nowRankCronRequest({method:'GET',headers:{authorization:'Bearer test'}},deps);
  for(let i=0;i<pending.length;i++)await pending[i];
  assert.equal(f.get(SCHEDULE_KEY).status,'COMPLETED');assert.equal(f.counts().publishes,1);
});
