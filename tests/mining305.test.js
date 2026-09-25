import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningService} from '../lib/mining-service.js';
import {newMine} from '../lib/mining-engine.js';
import {publicRaid,raidAction,raidDay} from '../lib/mining-raid.js';
import {memoryMineStore} from './support/mining-memory.js';
const user={id:'raid-user',role:'admin',status:'active'};
const start=Date.parse('2026-09-25T12:00:00Z');
async function setup(){const command=memoryMineStore();let now=start;await command(['SET','jcsr2:mine:v1:user:'+user.id,JSON.stringify({...newMine(now),gold:14892})]);return {command,tick:ms=>now+=ms,service:createMiningService({command,now:()=>now,rng:()=>0})};}
const body=(n,card=0)=>({action:'raid-play',day:raidDay(start),expectedPlays:n,card,requestId:'raid-request-'+n});
test('success and failure use 10% current wallet, one quest, three daily attempts',async()=>{
 const {service}=await setup();let r=await service.run(user,body(0));assert.equal(r.state.gold,16381);assert.equal(r.raid.complete,true);assert.equal(r.result.raid.delta,1489);
 r=await service.run(user,body(1,1));assert.equal(r.state.gold,14743);assert.equal(r.result.raid.delta,-1638);
 await service.run(user,body(2));r=await service.run(user,body(3));assert.equal(r.error,'MINE_RAID_LIMIT');assert.equal(r.raid.used,3);
});
test('concurrent different requests for same slot settle once; retry survives short ledger eviction',async()=>{
 const {service}=await setup();const results=await Promise.all([service.run(user,body(0)),service.run(user,{...body(0),requestId:'different-request'})]);assert.equal(results.filter(r=>r.ok).length,1);
 for(let i=0;i<20;i++)await service.run(user,{action:'test-fill',requestId:'fill-request-'+i});
 const winner=results.find(r=>r.ok).result.raid;const retry=await service.run(user,{...body(0),requestId:winner.requestId});assert.equal(retry.ok,true);assert.equal(retry.state.gold,16381);assert.equal(retry.raid.used,1);
});
test('Korean midnight replenishes, stale-day input cannot spend a new attempt',async()=>{
 const {service,tick}=await setup();await service.run(user,body(0));tick(3*3600000);
 let r=await service.run(user);assert.equal(r.raid.used,0);assert.equal(r.raid.complete,false);
 r=await service.run(user,{...body(1),requestId:'old-day-request'});assert.equal(r.error,'MINE_RAID_DAY');
 r=await service.run(user,{...body(0),day:raidDay(start+3*3600000),requestId:'new-day-request'});assert.equal(r.raid.used,1);
});
test('no result leaks before selection; bounds and exactly one winning card',()=>{
 for(const roll of [0,.4,.9999]){let wins=0;for(let card=0;card<3;card++){const s={gold:100};assert.equal(publicRaid(s,start).last,null);const r=raidAction(s,{...body(0,card)},start,roll);wins+=Number(r.won);}assert.equal(wins,1);}
 for(const gold of [0,9])assert.throws(()=>raidAction({gold},body(0),start,0),/RAID_GOLD/);
 assert.throws(()=>raidAction({gold:100},{...body(0),card:3},start,0),/RAID_CARD/);
});
