import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
test('daily mining quests count accepted actions once and reset at Korean midnight',async()=>{
 const command=memoryMineStore();let now=Date.parse('2026-09-25T14:00:00Z'),n=0;
 const user={id:'quests313',role:'admin'},service=createMiningService({command,now:()=>now,rng:()=>.9});
 const run=(action,extra={})=>service.run(user,{action,requestId:'quest-request-'+(++n),...extra});
 let r=await service.run(user);assert.equal(r.quests.collect,0);
 r=await run('auto-start',{token:'test-token-313',sequence:2});assert.equal(r.ok,false);assert.equal(r.quests.autoStart,0);
 await run('enter',{token:'test-token-313',sequence:1});
 r=await run('auto-start',{token:'test-token-313',sequence:2});assert.equal(r.quests.autoStart,1);
 r=await run('collect',{cycle:r.state.cycle});assert.equal(r.ok,false);assert.equal(r.quests.collect,0);
 for(let i=0;i<5;i++){
  r=await run('test-fill');const body={action:'collect',cycle:r.state.cycle,requestId:'collect-quest-'+i};
  r=await service.run(user,body);assert.equal(r.quests.collect,i+1);
  r=await service.run(user,body);assert.equal(r.quests.collect,i+1);
 }
 assert.equal(r.quests.completed,2);assert.equal(r.quests.total,5);
 r=await run('raid-play',{day:r.raid.day,expectedPlays:0,card:0});assert.equal(r.quests.completed,3);
 now+=3600000;r=await service.run(user);assert.equal(r.quests.completed,0);assert.equal(r.quests.autoStart,0);assert.equal(r.quests.collect,0);
});
