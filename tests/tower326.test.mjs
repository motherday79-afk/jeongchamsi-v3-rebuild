import test from 'node:test';import assert from 'node:assert/strict';
import {towerAction,publicTower} from '../lib/mining-tower.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
test('service persists tower floor, allows admin equipment and rejects replaced runs',async()=>{
 let now=100000;const service=createMiningService({command:memoryMineStore(),now:()=>now,rng:()=>.2}),user={id:'tower326',role:'admin'};
 const start=await service.run(user,{action:'tower-start',requestId:'tower-start-326'});assert.equal(start.ok,true);assert.equal(start.result.towerRun.pick.id,'wind');now+=30000;
 const body={action:'tower-finish',requestId:'tower-finish-326',runId:start.result.towerRun.id};const end=await service.run(user,body);assert.equal(end.tower.floor,2);assert.equal((await service.run(user,body)).tower.floor,2);
 const next=await service.run(user,{action:'tower-start',requestId:'tower-next-326'});assert.equal(next.result.towerRun.floor,2);
 const stale=await service.run(user,{action:'tower-finish',requestId:'tower-stale-326',runId:start.result.towerRun.id});assert.equal(stale.ok,false);assert.equal(stale.tower.floor,2);
});
test('tower snapshots strongest owned pick, forbids early finish, advances only once',()=>{
 const s={ownedPicks:['rust','silver'],gold:100};const r=towerAction(s,{action:'tower-start',requestId:'tower001'},0,7).towerRun;
 assert.equal(r.pick.id,'silver');assert.equal(r.floor,1);assert.throws(()=>towerAction(s,{action:'tower-finish',runId:r.id},1,7));
 const end=towerAction(s,{action:'tower-finish',runId:r.id},30000,7);assert.equal(end.towerRun.won,true);assert.equal(publicTower(s).floor,2);assert.equal(s.gold,100);
 towerAction(s,{action:'tower-finish',runId:r.id},31000,7);assert.equal(publicTower(s).floor,2);
});
test('high floors keep growing, failed floor is retained and client cannot pick its floor or damage',()=>{
 const s={towerFloor:301,ownedPicks:['rust']};const r=towerAction(s,{action:'tower-start',requestId:'tower002',floor:1,pick:'wind'},0,3).towerRun;
 assert.equal(r.floor,301);assert.equal(r.pick.id,'rust');assert.ok(r.target>540);
 const end=towerAction(s,{action:'tower-finish',runId:r.id,won:true},30000,3);assert.equal(end.towerRun.won,false);assert.equal(publicTower(s).floor,301);
});
