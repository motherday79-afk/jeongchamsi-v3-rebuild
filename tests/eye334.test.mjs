import test from 'node:test';import assert from 'node:assert/strict';
import {eyeAction} from '../lib/mining-eye.js';import {publicQuests} from '../lib/mining-quests.js';
for(const hits of [[2,1],[1,0,2],[1,1,0]])test(`three treasures required: ${hits}`,()=>{
 const s={};let r=eyeAction(s,{action:'eye-start',requestId:'start334'},0,7).eye;
 assert.equal(r.targets.length,3);let now=0;
 for(const hit of hits){const run=s.eyeRun,yes=[],no=[];run.layout.forEach((id,i)=>(run.targets.includes(id)?yes:no).push(i));now+=20000;r=eyeAction(s,{action:'eye-choose',runId:r.id,round:r.round,picks:[...yes.slice(0,hit),...no.slice(0,2-hit)]},now,9).eye;if(!r.done){assert.equal(r.targets.length,3-r.found);assert.equal(publicQuests(s,now).eye,false);}}
 const won=hits.reduce((a,b)=>a+b,0)===3;assert.equal(r.done,true);assert.equal(r.won,won);assert.equal(publicQuests(s,now).eye,won);
 assert.throws(()=>eyeAction(s,{action:'eye-choose',runId:r.id,round:r.round,picks:[0,1]},now+10000,2));
});
