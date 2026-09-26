import test from 'node:test';import assert from 'node:assert/strict';
import {ruinsPuzzle,ruinsAction} from '../lib/mining-ruins.js';
import {publicQuests} from '../lib/mining-quests.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
test('300 layouts have exactly one answer and require all four clues',()=>{
 for(let seed=0;seed<300;seed++){const p=ruinsPuzzle(seed*982451653);assert.equal(p.board.length,6);assert.equal(p.clues.length,4);assert.equal(p.clues.reduce((m,c)=>m&c.mask,63),1<<p.answer);for(let i=0;i<4;i++)assert.notEqual(p.clues.filter((_,j)=>j!==i).reduce((m,c)=>m&c.mask,63),1<<p.answer);}
});
test('server hides solution, limits questions, resumes run and rejects second verdict',()=>{
 const s={},start=ruinsAction(s,{action:'ruins-start',requestId:'r'},100,42).ruins;
 assert.equal(start.answer,undefined);assert.ok(start.clues.every(c=>c.text===null));assert.ok(start.questions.every(q=>q.mask===undefined));
 assert.equal(ruinsAction(s,{action:'ruins-start',requestId:'new'},200,1).ruins.id,'r');
 for(let question=0;question<2;question++)ruinsAction(s,{action:'ruins-ask',runId:'r',question},200);
 assert.throws(()=>ruinsAction(s,{action:'ruins-ask',runId:'r',question:2},200),/QUESTIONS/);
 assert.throws(()=>ruinsAction(s,{action:'ruins-finish',runId:'r',choice:6},200),/INPUT/);
 const end=ruinsAction(s,{action:'ruins-finish',runId:'r',choice:s.ruinsRun.answer},200).ruins;
 assert.equal(end.won,true);assert.equal(publicQuests(s,200).ruins,true);assert.equal(publicQuests(s,86400200).ruins,false);
 assert.throws(()=>ruinsAction(s,{action:'ruins-finish',runId:'r',choice:0},200),/RUN/);
});
test('service supports member play, idempotent verdict and no gold reward',async()=>{
 const service=createMiningService({command:memoryMineStore(),now:()=>100000,rng:()=>.3}),user={id:'ruins-member',role:'member'};
 const a=await service.run(user,{action:'ruins-start',requestId:'ruins-start-337'});assert.equal(a.ok,true);assert.equal(a.quests.total,8);
 const p=ruinsPuzzle(Math.floor(.3*4294967296));
 const body={action:'ruins-finish',requestId:'ruins-end-337',runId:a.result.ruins.id,choice:p.answer};
 const b=await service.run(user,body);assert.equal(b.ok,true);assert.equal(b.result.ruins.won,true);assert.equal(b.quests.ruins,true);assert.equal(b.state.gold,a.state.gold);
 const c=await service.run(user,body);assert.equal(c.ok,true);assert.equal(c.quests.completed,b.quests.completed);
});
