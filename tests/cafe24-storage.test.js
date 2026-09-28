import test from 'node:test';import assert from 'node:assert/strict';
import {cafe24Token} from '../lib/cafe24-storage.js';
import {rebuildRedisCommand} from '../lib/redis-rest.js';
test('Cafe24 transport uses server-side derived authentication and never silently falls back',async()=>{
 const old=process.env.JCS_REBUILD_REDIS_REDIS_URL,oldBackend=process.env.JCS_STORAGE_BACKEND,original=global.fetch;
 process.env.JCS_REBUILD_REDIS_REDIS_URL='redis://default:private-test-password@source.invalid:1234';process.env.JCS_STORAGE_BACKEND='cafe24';
 let seen;global.fetch=async(url,options)=>{seen={url,options};return {ok:true,json:async()=>({result:'saved'})};};
 try{assert.equal(await rebuildRedisCommand()(['SET','wallet','value']),'saved');assert.equal(seen.url,'https://terry2525.cafe24.com/redis');assert.equal(seen.options.headers.Authorization,'Bearer '+cafe24Token(process.env.JCS_REBUILD_REDIS_REDIS_URL));assert.ok(!seen.options.headers.Authorization.includes('private-test-password'));
 global.fetch=async()=>{throw new Error('down');};await assert.rejects(()=>rebuildRedisCommand()(['GET','wallet']),/STORAGE_NETWORK/);
 }finally{global.fetch=original;if(old===undefined)delete process.env.JCS_REBUILD_REDIS_REDIS_URL;else process.env.JCS_REBUILD_REDIS_REDIS_URL=old;if(oldBackend===undefined)delete process.env.JCS_STORAGE_BACKEND;else process.env.JCS_STORAGE_BACKEND=oldBackend;}
});
