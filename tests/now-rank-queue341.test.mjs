import test from 'node:test';
import assert from 'node:assert/strict';
import {createNowRankSchedule,SCHEDULE_KEY} from '../lib/now-rank-schedule.js';
import {processRankQueueMessage,startRankQueueRequest} from '../lib/now-rank-queue-worker.js';

test('queue entry authenticates before creating scheduler and durably sends before success',async()=>{
  let created=0,sent=0;
  const deps={secret:'test',environment:'production',createScheduler:()=>{created++;return {start:async()=>({runId:'run',step:0})};},enqueue:async()=>{sent++;}};
  assert.equal((await startRankQueueRequest({method:'GET',headers:{}},deps)).status,401);
  assert.equal(created,0);
  assert.equal((await startRankQueueRequest({method:'GET',headers:{authorization:'Bearer test'}},deps)).status,202);
  assert.equal(sent,1);
  deps.enqueue=async()=>{throw Error('unavailable');};
  assert.equal((await startRankQueueRequest({method:'GET',headers:{authorization:'Bearer test'}},deps)).status,503);
});
test('durable redelivery recovers the next persisted step after enqueue failure',async()=>{
  const map=new Map(),runId='d021461c-14a8-4cef-a1b7-e057526de005';
  map.set(SCHEDULE_KEY,JSON.stringify({runId,step:3,status:'RUNNING',startedAt:Date.now()}));
  const command=async([op,key,...args])=>{
    if(op==='GET')return map.get(key)||null;
    if(op==='SET'){if(args.includes('NX')&&map.has(key))return null;map.set(key,args[0]);return 'OK';}
    if(op==='EVAL'){map.delete(args[1]);return 1;}
  };
  const scheduler=createNowRankSchedule({command,createService:()=>assert.fail('must not repeat finished step')});
  let attempts=0;
  const enqueue=async ticket=>{assert.equal(ticket.step,3);if(++attempts===1)throw Error('queue unavailable');};
  const input={runId,step:2};
  await assert.rejects(processRankQueueMessage(input,{scheduler,enqueue}),/queue unavailable/);
  await processRankQueueMessage(input,{scheduler,enqueue});
  assert.equal(attempts,2);
  let sent=false;
  await processRankQueueMessage({...input,runId:'old-run'},{scheduler,enqueue:async()=>{sent=true;}});
  assert.equal(sent,false);
});
test('busy processing throws for queue retry without acknowledging work',async()=>{
  await assert.rejects(processRankQueueMessage({runId:'run',step:0},{scheduler:{step:async()=>{throw Error('RANKING_BUSY');}},enqueue:()=>assert.fail()}),/RANKING_BUSY/);
});
