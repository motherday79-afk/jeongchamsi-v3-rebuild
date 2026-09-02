import test from 'node:test';
import assert from 'node:assert/strict';
import { runIntelligenceAction } from '../src/core/intelligence-runner.js';

test('one collection click keeps requesting bounded steps until terminal',async()=>{
  let steps=0,starts=0;
  const auth={
    async intelligenceCollectStart(){starts++;return {ok:true,job:{status:'RUNNING'}};},
    async intelligenceCollectStep(){steps++;return {ok:true,job:{status:steps===22?'COMPLETED':'RUNNING',completed:Math.min(542,steps*25),total:542}};},
  };
  const seen=[];
  const result=await runIntelligenceAction(auth,'collect',{onProgress:job=>seen.push(job.completed)});
  assert.equal(starts,1);
  assert.equal(steps,22);
  assert.equal(result.status,'COMPLETED');
  assert.equal(seen.at(-1),542);
});

test('a reload resumes a running publication without creating another job',async()=>{
  let starts=0,steps=0;
  const auth={
    async intelligencePublishStart(){starts++;return {ok:true,job:{status:'RUNNING'}};},
    async intelligencePublishStep(){steps++;return {ok:true,job:{status:'COMPLETED',completed:542,total:542}};},
  };
  await runIntelligenceAction(auth,'publish',{resume:true});
  assert.equal(starts,0);
  assert.equal(steps,1);
});

test('runner stops and reports a stable API error',async()=>{
  const auth={async intelligenceCollectStart(){return {ok:false,error:'STORAGE_MISSING'};}};
  await assert.rejects(()=>runIntelligenceAction(auth,'collect'),/STORAGE_MISSING/);
});
