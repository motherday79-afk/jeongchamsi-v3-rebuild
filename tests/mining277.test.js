import test from 'node:test';
import assert from 'node:assert/strict';
import {newMine,advanceMine,applyMineAction,publicMine} from '../lib/mining-engine.js';
import {makeMinerMotion} from '../mine/motion.js';

test('stopping a swing cancels even late callbacks and resets the miner without residual impacts',()=>{
 const jobs=[],frames=[];let impacts=0;
 const motion=makeMinerMotion({setFrame:n=>frames.push(n),impact:()=>impacts++,schedule:fn=>{jobs.push(fn);return jobs.length;},cancel:()=>{}});
 motion.play();motion.stop();jobs.forEach(fn=>fn());
 assert.equal(impacts,0);assert.equal(frames.at(-1),0);
});

test('full storage permanently stops player auto until a new explicit start after collection',()=>{
 const s=newMine(0);s.ore=9;
 const token='full-test-001';
 applyMineAction(s,{action:'enter',token,sequence:1},0);
 applyMineAction(s,{action:'auto-start',token,sequence:2},0);
 advanceMine(s,1500,()=>0);
 assert.equal(s.ore,10);assert.equal(s.presence.running,false);
 assert.equal(publicMine(s,1500).mode,'ready');
 applyMineAction(s,{action:'collect',cycle:1},1500);
 applyMineAction(s,{action:'enter',token:'return-test-002',sequence:1},1500);
 advanceMine(s,6000,()=>0);assert.equal(s.ore,0);
 applyMineAction(s,{action:'auto-start',token:'return-test-002',sequence:2},6000);
 advanceMine(s,7500,()=>0);assert.equal(s.ore,1);
});

test('failed productive-cycle gaps are counted without per-miss loops; full and idle add nothing',()=>{
 const s=newMine(0);advanceMine(s,9000,()=>.999999);
 assert.equal(s.failedSwings,3);assert.equal(s.totalSwings,3);
 advanceMine(s,12000,()=>0);assert.equal(s.failedSwings,3);assert.equal(s.totalSwings,4);
 s.ore=10;advanceMine(s,18000,()=>0);assert.equal(s.totalSwings,4);
 applyMineAction(s,{action:'enter',token:'idle-test-001',sequence:1},18000);
 advanceMine(s,21000,()=>0);assert.equal(s.failedSwings,3);
});
