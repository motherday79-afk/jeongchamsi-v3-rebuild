import test from 'node:test';
import assert from 'node:assert/strict';
import {valleyAttacks,valleyResult} from '../mine/valley-rules.js';
import {valleyAction} from '../lib/mining-valley.js';
import {publicQuests} from '../lib/mining-quests.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
const dodge=seed=>{let lane=0;return valleyAttacks(seed).flatMap(a=>{const target=1-a.lane;if(lane===target)return [];lane=target;return [[a.at+200,lane]];});};
test('seeded attacks allow fair dodges, three contacts fail and finish does not grant gold',()=>{
 for(const seed of [0,1,98,4294967295]){
  assert.deepEqual(valleyAttacks(seed),valleyAttacks(seed));
  const moves=dodge(seed);assert.equal(valleyResult(seed,moves).won,true);
  const s={gold:500};valleyAction(s,{action:'valley-start',requestId:'run-id-315'},1000,seed);
  assert.throws(()=>valleyAction(s,{action:'valley-finish',runId:'run-id-315',moves},2000),/TIME/);
  const result=valleyAction(s,{action:'valley-finish',runId:'run-id-315',moves},91000);
  assert.equal(result.valley.won,true);assert.equal(s.gold,500);assert.equal(publicQuests(s,91000).valley,true);
  assert.deepEqual(valleyAction(s,{action:'valley-finish',runId:'run-id-315',moves},92000),result);
 }
 const failed=valleyResult(1,[]);assert.equal(failed.health,0);assert.equal(failed.won,false);assert.ok(failed.endedAt<90000);
});
test('invalid input and replaced sessions cannot complete a quest',()=>{
 const s={};valleyAction(s,{action:'valley-start',requestId:'new-run'},1000,1);
 assert.throws(()=>valleyAction(s,{action:'valley-finish',runId:'old-run',moves:[]},92000),/RUN/);
 assert.throws(()=>valleyAction(s,{action:'valley-finish',runId:'new-run',moves:[[100,0],[101,1]]},92000),/MOVES/);
 assert.equal(publicQuests(s,92000).valley,false);
});
test('service persists completion once and resets quest at Korean midnight',async()=>{
 let now=Date.parse('2026-09-26T14:00:00Z');const command=memoryMineStore(),user={id:'valley315',role:'admin'};
 const service=createMiningService({command,now:()=>now,rng:()=>.4});
 let r=await service.run(user,{action:'valley-start',requestId:'valley-start-315'});assert.equal(r.ok,true);
 const run=r.result.valley;now+=90000;
 const body={action:'valley-finish',requestId:'valley-finish-315',runId:run.id,moves:dodge(run.seed)};
 r=await service.run(user,body);assert.equal(r.ok,true);assert.equal(r.quests.valley,true);assert.equal(r.quests.total,5);
 r=await service.run(user,body);assert.equal(r.quests.completed,1);
 now+=3600000;r=await service.run(user);assert.equal(r.quests.valley,false);
});
