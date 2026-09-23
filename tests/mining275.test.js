import test from 'node:test';
import assert from 'node:assert/strict';
import {newMine,advanceMine,applyMineAction,mineStats,publicMine} from '../lib/mining-engine.js';

test('automatic swings occur only at 3 second boundaries and cannot exceed storage',()=>{
 const s=newMine(10000);advanceMine(s,12999,()=>0);assert.equal(s.ore,0);
 advanceMine(s,13000,()=>0);assert.equal(s.ore,1);
 advanceMine(s,130000,()=>0);assert.equal(s.ore,10);
 advanceMine(s,160000,()=>0);assert.equal(s.ore,10);
});
test('manual strike uses 1.5 second server cooldown and excludes overlapping automatic time',()=>{
 const s=newMine(10000);applyMineAction(s,{action:'strike'},10000,()=>0);
 assert.equal(s.ore,1);assert.throws(()=>applyMineAction(s,{action:'strike'},11499,()=>0),/COOLDOWN/);
 applyMineAction(s,{action:'strike'},11500,()=>0);assert.equal(s.ore,2);
 advanceMine(s,14499,()=>0);assert.equal(s.ore,2);
 advanceMine(s,14500,()=>0);assert.equal(s.ore,3);
});
test('basic pick succeeds below 3 percent, not at boundary',()=>{
 const s=newMine(0);applyMineAction(s,{action:'strike'},0,()=>.0299);assert.equal(s.ore,1);
 applyMineAction(s,{action:'strike'},1500,()=>.03);assert.equal(s.ore,1);
});
test('collection requires full storage and expected cycle, pays once then resumes without old time',()=>{
 const s=newMine(0);assert.throws(()=>applyMineAction(s,{action:'collect',cycle:1},0),/NOT_FULL/);
 s.ore=10;applyMineAction(s,{action:'collect',cycle:1},300000,()=>0);
 assert.equal(s.gold,10);assert.equal(s.ore,0);assert.equal(s.cycle,2);
 assert.throws(()=>applyMineAction(s,{action:'collect',cycle:1},300000),/CYCLE_CHANGED/);
 advanceMine(s,302999,()=>0);assert.equal(s.ore,0);
});
test('storage requires either pick or worker level and gold cannot be forged through action payload',()=>{
 const s=newMine(0);s.gold=100;assert.throws(()=>applyMineAction(s,{action:'upgrade',target:'storage'},0),/LOCKED/);
 s.worker=5;applyMineAction(s,{action:'upgrade',target:'storage'},0);assert.equal(s.storage,2);assert.equal(s.gold,80);
 applyMineAction(s,{action:'character',character:'elf',gold:999999},0);assert.equal(s.gold,80);
 assert.throws(()=>applyMineAction(s,{action:'character',character:'<script>'},0),/CHARACTER/);
});
test('trial pick grants at most one independent extra hit, including storage boundary',()=>{
 const s=newMine(0);s.tool='trial';let draws=[0,0,0];
 const result=applyMineAction(s,{action:'strike'},0,()=>draws.shift()??1);
 assert.equal(result.hits,2);assert.equal(s.ore,2);s.ore=9;
 applyMineAction(s,{action:'strike'},1500,()=>0);assert.equal(s.ore,10);
});
test('negative time does not rewind state, and long offline interval stops at full',()=>{
 const s=newMine(10000);advanceMine(s,1,()=>0);assert.equal(s.cursor,10000);
 advanceMine(s,1000*60*60*24*365,()=>0);assert.equal(s.ore,10);
 assert.equal(publicMine(s,10000).stats.capacity,10);assert.equal(mineStats(s).chance,.03);
});
test('every paid worker upgrade improves speed and storage stops at its reachable cap',()=>{
 const s=newMine(0);s.gold=100000;s.worker=11;const before=mineStats(s).autoMs;
 applyMineAction(s,{action:'upgrade',target:'worker'},0);assert.ok(mineStats(s).autoMs<before);
 s.storage=5;s.pick=20;assert.throws(()=>applyMineAction(s,{action:'upgrade',target:'storage'},0),/MAX_LEVEL/);
});
