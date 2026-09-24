import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
test('admin gold grants are authorized, validated and idempotent',async()=>{
 const service=createMiningService({command:memoryMineStore(),now:()=>0});
 const admin={id:'admin283',role:'admin'},member={id:'member283',role:'member'};
 const body={action:'admin-gold',amount:10000,requestId:'grant-283-0001'};
 assert.equal((await service.run(member,body)).error,'FORBIDDEN');
 assert.equal((await service.run(member)).state.gold,0);
 const results=await Promise.all([service.run(admin,body),service.run(admin,body)]);
 results.forEach(r=>assert.equal(r.state.gold,10000));
 for(const [i,amount] of [0,-1,1.5,1000001,'100',null].entries()){
  assert.equal((await service.run(admin,{...body,amount,requestId:'invalid283-'+i})).error,'MINE_GOLD_AMOUNT');
 }
 assert.equal((await service.run(admin)).state.gold,10000);
});
