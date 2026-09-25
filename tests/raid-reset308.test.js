import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningService} from '../lib/mining-service.js';
import {newMine} from '../lib/mining-engine.js';
import {memoryMineStore} from './support/mining-memory.js';
const now=Date.parse('2026-09-25T12:00:00Z'),day='2026-09-25',admin={id:'raid-reset',role:'admin',status:'active'};
async function setup(){const command=memoryMineStore();await command(['SET','jcsr2:mine:v1:user:'+admin.id,JSON.stringify({...newMine(now),gold:1000})]);return createMiningService({command,now:()=>now,rng:()=>0});}
const play={action:'raid-play',day,revision:0,expectedPlays:0,card:0,requestId:'first-raid-308'};
const reset={action:'raid-reset',day,revision:0,requestId:'reset-raid-308'};
test('admin resets only own attempts and completion; gold stays settled; repeated reset is idempotent',async()=>{
 const s=await setup();await s.run(admin,play);const r=await s.run(admin,reset);assert.equal(r.ok,true);assert.equal(r.state.gold,1100);assert.equal(r.raid.used,0);assert.equal(r.raid.complete,false);assert.equal(r.raid.revision,1);
 const again=await s.run(admin,reset);assert.equal(again.raid.revision,1);
 const next=await s.run(admin,{...play,revision:1,requestId:'second-raid-308'});assert.equal(next.ok,true);assert.equal(next.raid.used,1);assert.equal(next.state.gold,1210);
});
test('members cannot reset, stale reset cannot clear later attempts, old plays cannot settle after ledger eviction',async()=>{
 const s=await setup();assert.equal((await s.run({...admin,role:'member'},reset)).error,'FORBIDDEN');
 await s.run(admin,{...reset,requestId:'allowed-reset-308'});
 for(let i=0;i<20;i++)await s.run(admin,{action:'test-fill',requestId:'fill-reset-308-'+i});
 assert.equal((await s.run(admin,play)).error,'MINE_RAID_CHANGED');
 assert.equal((await s.run(admin,{...reset,requestId:'stale-reset-308'})).error,'MINE_RAID_CHANGED');
 assert.equal((await s.run(admin)).state.gold,1000);
});
