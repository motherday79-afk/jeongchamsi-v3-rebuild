import test from 'node:test';import assert from 'node:assert/strict';
import {towerAction} from '../lib/mining-tower.js';
import {publicQuests} from '../lib/mining-quests.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
test('each floor has more ore, including early floors',()=>{let last=0;for(let floor=1;floor<=1000;floor++){const r=towerAction({towerFloor:floor},{action:'tower-start',requestId:'test'},0,1).towerRun;assert.ok(r.target>last,`floor ${floor}: ${r.target} <= ${last}`);last=r.target;}});
test('admin reset invalidates run and preserves wallet; tower clear counts once per day',async()=>{
 let now=100000;const service=createMiningService({command:memoryMineStore(),now:()=>now,rng:()=>.2}),admin={id:'reset328',role:'admin'};
 const start=await service.run(admin,{action:'tower-start',requestId:'start-328'});now+=30000;
 const end=await service.run(admin,{action:'tower-finish',runId:start.result.towerRun.id,requestId:'finish-328'});assert.equal(end.quests.tower,true);assert.equal(end.quests.total,8);
 const reset=await service.run(admin,{action:'tower-reset',requestId:'reset-328'});assert.equal(reset.ok,true);assert.equal(reset.tower.floor,1);assert.equal(reset.state.gold,end.state.gold);assert.equal(reset.quests.tower,true);
 const stale=await service.run(admin,{action:'tower-finish',runId:start.result.towerRun.id,requestId:'stale-328'});assert.equal(stale.ok,false);
 const denied=await service.run({id:'member328',role:'member'},{action:'tower-reset',requestId:'denied-328'});assert.equal(denied.ok,false);
 assert.equal(publicQuests({dailyQuests:{day:end.quests.day,tower:true}},now+86400000).tower,false);
});
