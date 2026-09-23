import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';

test('all members contribute failed cycles once, including concurrent retries; rewards are not invented',async()=>{
 let now=0;const command=memoryMineStore(),service=createMiningService({command,now:()=>now,rng:()=>.999999});
 const a={id:'member-a'},b={id:'member-b'};
 await service.run(a);await service.run(b);now=9000;
 const body={action:'enter',token:'jackpot-tab-001',sequence:1,requestId:'jackpot-enter-001'};
 await Promise.all([service.run(a,body),service.run(a,body),service.run(b)]);
 const result=await service.run(a);
 assert.equal(result.jackpot.failedCycles,6);assert.equal(result.state.gold,0);
 assert.equal(result.jackpot.enabled,false);
 assert.deepEqual(result.jackpot.rewards,{bronze:100,silver:300,gold:1000});
 now=12000;await service.run(a);assert.equal((await service.run(a)).jackpot.failedCycles,6);
});
