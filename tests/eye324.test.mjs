import test from 'node:test';
import assert from 'node:assert/strict';
import {eyeAction} from '../lib/mining-eye.js';
import {publicQuests} from '../lib/mining-quests.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
test('service persists success once, preserves shuffle identity and resets quest at Korean midnight',async()=>{
 let now=Date.parse('2026-09-26T14:00:00Z');const service=createMiningService({command:memoryMineStore(),now:()=>now,rng:()=>.31});const user={id:'eye324',role:'admin'};
 const start=await service.run(user,{action:'eye-start',requestId:'eye-start-324'});assert.equal(start.ok,true);const r=start.result.eye,layout=Array.from({length:20},(_,i)=>i);
 for(const pairs of r.swaps){assert.equal(new Set(pairs.flat()).size,4);for(const [a,b] of pairs)[layout[a],layout[b]]=[layout[b],layout[a]];}
 assert.equal(new Set(layout).size,20);now+=10000;const body={action:'eye-choose',requestId:'eye-choose-324',runId:r.id,round:1,picks:r.targets.map(id=>layout.indexOf(id))};
 const end=await service.run(user,body);assert.equal(end.ok,true);assert.equal(end.result.eye.won,true);assert.equal(end.quests.total,6);assert.equal(end.quests.eye,true);assert.deepEqual((await service.run(user,body)).result.eye,end.result.eye);
 now+=3600000;assert.equal((await service.run(user)).quests.eye,false);
});
test('eye accumulates treasure over three rounds and records only success',()=>{
 const s={gold:100};let now=100000;let r=eyeAction(s,{action:'eye-start',requestId:'start1234'},now,12).eye;
 const choose=(hits)=>{now+=20000;const run=s.eyeRun;const yes=run.layout.map((id,i)=>run.targets.includes(id)?i:-1).filter(i=>i>=0);const no=run.layout.map((id,i)=>run.targets.includes(id)?-1:i).filter(i=>i>=0);return eyeAction(s,{action:'eye-choose',runId:r.id,round:r.round,picks:[...yes.slice(0,hits),...no.slice(0,2-hits)]},now,33).eye;};
 r=choose(0);assert.equal(r.found,0);r=choose(1);assert.equal(r.found,1);r=choose(1);assert.equal(r.won,true);assert.equal(publicQuests(s,now).eye,true);assert.equal(s.gold,100);
});
test('eye rejects early, duplicate and stale picks; three misses fail',()=>{
 const s={};let r=eyeAction(s,{action:'eye-start',requestId:'start1234'},0,7).eye;
 assert.throws(()=>eyeAction(s,{action:'eye-choose',runId:r.id,round:1,picks:[0,1]},1,8));
 assert.throws(()=>eyeAction(s,{action:'eye-choose',runId:r.id,round:1,picks:[0,0]},20000,8));
 for(let n=1;n<=3;n++){const picks=s.eyeRun.layout.map((id,i)=>s.eyeRun.targets.includes(id)?-1:i).filter(i=>i>=0).slice(0,2);r=eyeAction(s,{action:'eye-choose',runId:r.id,round:n,picks},n*20000,9).eye;}
 assert.equal(r.done,true);assert.equal(r.won,false);assert.equal(publicQuests(s,60000).eye,false);
});
