import test from 'node:test';
import assert from 'node:assert/strict';
import {forestChart,createJudgment,forestResult,FOREST_DURATION} from '../mine/forest-rules.js';
import {forestAction} from '../lib/mining-forest.js';
import {publicQuests} from '../lib/mining-quests.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
const perfect=mode=>forestChart(mode).flatMap(n=>[[n.at,n.lane,1],[n.at+(n.hold||30),n.lane,0]]).sort((a,b)=>a[0]-b[0]);
test('three playable charts, perfect replay, no input fails and holds need release timing',()=>{
 let last=0;
 for(const mode of ['easy','normal','hard']){const c=forestChart(mode);assert.ok(c.length>last);last=c.length;
  for(const n of c){assert.ok(n.lane>=0&&n.lane<5);assert.ok(n.at+n.hold<FOREST_DURATION);assert.ok(c.filter(x=>x.at<=n.at&&x.at+x.hold>=n.at).length<=2);assert.ok(!c.some(x=>x!==n&&x.lane===n.lane&&x.at>=n.at&&x.at<n.at+n.hold+50));}
  assert.equal(forestResult(mode,perfect(mode)).accuracy,100);assert.equal(forestResult(mode,[]).cleared,false);
 }
 const notes=forestChart('hard'),hold=notes.find(n=>n.hold),judge=createJudgment('hard');judge.input(hold.at,hold.lane,1);judge.input(hold.at+10,hold.lane,0);judge.advance(FOREST_DURATION);assert.equal(judge.notes[hold.id].grade,'miss');
});
test('repeated keydown cannot farm notes and extra taps reduce accuracy',()=>{
 const events=perfect('easy');const spam=events.concat([[0,0,1],[30,0,0],[60,0,1],[90,0,0]]).sort((a,b)=>a[0]-b[0]);assert.ok(forestResult('easy',spam).accuracy<100);
 const j=createJudgment('easy'),n=forestChart('easy')[0];j.input(n.at,n.lane,1);j.input(n.at,n.lane,1);assert.equal(j.stats().perfect,1);
});
test('server rejects spoofed/early/invalid sessions and persists once with no gold reward',async()=>{
 let now=Date.parse('2026-09-26T14:00:00Z');const s={gold:42};forestAction(s,{action:'forest-start',requestId:'a',difficulty:'easy'},now);
 assert.throws(()=>forestAction(s,{action:'forest-finish',runId:'a',events:perfect('easy')},now+100),/TIME/);
 assert.throws(()=>forestAction(s,{action:'forest-finish',runId:'a',events:[[0,8,1]]},now+FOREST_DURATION),/INPUT/);
 const result=forestAction(s,{action:'forest-finish',runId:'a',events:perfect('easy'),score:0},now+FOREST_DURATION+3000);assert.equal(result.forest.cleared,true);assert.equal(s.gold,42);assert.equal(publicQuests(s,now).forest,true);
 assert.deepEqual(forestAction(s,{action:'forest-finish',runId:'a'},now+FOREST_DURATION+4000),result);
 const service=createMiningService({command:memoryMineStore(),now:()=>now,rng:()=>.5}),user={id:'forest322',role:'admin'};
 const start=await service.run(user,{action:'forest-start',requestId:'forest-start-322',difficulty:'normal'});assert.equal(start.ok,true);now+=FOREST_DURATION+4000;
 const finish={action:'forest-finish',requestId:'forest-finish-322',runId:start.result.forest.id,events:perfect('normal')};
 const end=await service.run(user,finish);assert.equal(end.quests.forest,true);assert.equal(end.quests.total,6);assert.equal((await service.run(user,finish)).quests.completed,1);
 now+=3600000;assert.equal((await service.run(user)).quests.forest,false);
});
