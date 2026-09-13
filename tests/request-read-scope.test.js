import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestReadScope } from '../lib/request-read-scope.js';

test('repeated GETs share one pending read only within their request',async()=>{
  let calls=0,value='first';
  const command=async()=>{calls++;return value;};
  const first=createRequestReadScope(command);
  assert.deepEqual(await Promise.all([first(['GET','profile']),first(['GET','profile'])]),['first','first']);
  assert.equal(calls,1);
  value='updated';
  assert.equal(await createRequestReadScope(command)(['GET','profile']),'updated');
  assert.equal(calls,2);
});

test('a failed GET can retry and a write clears the request read scope',async()=>{
  let calls=0,value='before';
  const read=createRequestReadScope(async([op,key,next])=>{
    if(op==='SET'){value=next;return 'OK';}
    if(++calls===1)throw new Error('network');
    return value;
  });
  await assert.rejects(read(['GET','key']),/network/);
  assert.equal(await read(['GET','key']),'before');
  await read(['SET','key','after']);
  assert.equal(await read(['GET','key']),'after');
  assert.equal(calls,3);
});

test('a bulk report read does not discard already-read profiles',async()=>{
  const calls=[];
  const read=createRequestReadScope(async args=>{calls.push(args);return args[0]==='MGET'?['report']:'profile';});
  assert.equal(await read(['GET','person']),'profile');
  assert.deepEqual(await read(['MGET','draft']),['report']);
  assert.equal(await read(['GET','person']),'profile');
  assert.equal(calls.length,2);
});
