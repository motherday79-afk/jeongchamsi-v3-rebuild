import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeRedisCommand } from '../lib/redis-rest.js';

test('a failed open native client is discarded so the next storage attempt reconnects',async()=>{
  let factoryCalls=0,destroyed=false;
  const broken={
    isOpen:true,
    on(){},
    async connect(){},
    async sendCommand(){throw new Error('socket closed');},
    destroy(){destroyed=true;this.isOpen=false;},
  };
  const healthy={
    isOpen:true,
    on(){},
    async connect(){},
    async sendCommand(){return 'saved';},
    destroy(){this.isOpen=false;},
  };
  const command=createNativeRedisCommand('redis://recovering-test.invalid:6379',{createClient(){factoryCalls+=1;return factoryCalls===1?broken:healthy;}});
  await assert.rejects(()=>command(['SET','key','value']),/STORAGE_REQUEST/);
  assert.equal(destroyed,true);
  assert.equal(await command(['SET','key','value']),'saved');
  assert.equal(factoryCalls,2);
});
