import test from 'node:test';
import assert from 'node:assert/strict';
import {newMine,advanceMine,applyMineAction,publicMine} from '../lib/mining-engine.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
const token='tab-session-0001';
const presence=(action,sequence=1,t=token)=>({action,token:t,sequence});
test('opening the game stops offline workers until player automatic mining is started',()=>{
 const s=newMine(0);advanceMine(s,6000,()=>0);assert.equal(s.ore,2);
 applyMineAction(s,presence('enter'),6000);advanceMine(s,12000,()=>0);assert.equal(s.ore,2);
 assert.equal(publicMine(s,12000).mode,'ready');
});
test('player automatic mining has a 1.5 second cadence across batched heartbeats without worker overlap',()=>{
 const s=newMine(0);applyMineAction(s,presence('enter'),0);applyMineAction(s,presence('auto-start',2),0,()=>0);
 advanceMine(s,1499,()=>0);assert.equal(s.ore,0);advanceMine(s,1500,()=>0);assert.equal(s.ore,1);
 advanceMine(s,4000,()=>0);applyMineAction(s,presence('heartbeat',3),4000,()=>0);assert.equal(s.ore,2);
 advanceMine(s,4500,()=>0);assert.equal(s.ore,3);
 applyMineAction(s,presence('auto-stop',4),4500);advanceMine(s,7500,()=>0);assert.equal(s.ore,3);
});
test('leaving immediately resumes workers at their own cadence and late heartbeat cannot reactivate player',()=>{
 const s=newMine(0);applyMineAction(s,presence('enter'),0);applyMineAction(s,presence('auto-start',2),0,()=>0);
 advanceMine(s,1500,()=>0);applyMineAction(s,presence('leave',4),1500);
 assert.throws(()=>applyMineAction(s,presence('heartbeat',3),2000),/SESSION/);
 advanceMine(s,4499,()=>0);assert.equal(s.ore,1);advanceMine(s,4500,()=>0);assert.equal(s.ore,2);
});
test('lost close notification expires player mode and calculates remaining time only at worker speed',()=>{
 const s=newMine(0);s.storage=5;applyMineAction(s,presence('enter'),0);applyMineAction(s,presence('auto-start',2),0,()=>0);
 advanceMine(s,15000,()=>0);assert.equal(s.ore,9);assert.equal(publicMine(s,15000).mode,'offline');
});
test('old tab cannot stop a newer tab; leave before enter is not reversed by delayed entry',()=>{
 const s=newMine(0);applyMineAction(s,presence('enter'),0);applyMineAction(s,presence('enter',1,'new-tab-0002'),100);
 applyMineAction(s,presence('leave',9),200);assert.equal(publicMine(s,200).onlineToken,'new-tab-0002');
 applyMineAction(s,presence('leave',2,'future-tab-003'),300);
 assert.throws(()=>applyMineAction(s,presence('enter',1,'future-tab-003'),400),/SESSION/);
});
test('server retry and overlapping heartbeat do not duplicate online strikes',async()=>{
 let time=0;const service=createMiningService({command:memoryMineStore(),now:()=>time,rng:()=>0}),user={id:'online-test',role:'member'};
 await service.run(user,{...presence('enter'),requestId:'enter-request-001'});
 await service.run(user,{...presence('auto-start',2),requestId:'start-request-001'});
 time=4500;const body={...presence('heartbeat',3),requestId:'heartbeat-0001'};
 const results=await Promise.all([service.run(user,body),service.run(user,body)]);assert.equal(results[0].state.ore,3);assert.equal(results[1].state.ore,3);
});
