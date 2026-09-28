import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorageServer} from '../ops/cafe24/gateway.mjs';
test('storage gateway rejects unauthorized access and administrative commands, preserves Lua results',async()=>{
 const seen=[];const server=createStorageServer({token:'test-token',command:async args=>{seen.push(args);return args[0]==='EVAL'?'lua-result':'OK';}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/redis`;
 try {
  assert.equal((await fetch(url,{method:'POST',body:'["GET","wallet"]'})).status,401);
  const request=args=>fetch(url,{method:'POST',headers:{authorization:'Bearer test-token','content-type':'application/json'},body:JSON.stringify(args)});
  assert.equal((await request(['FLUSHALL'])).status,403);
  assert.equal((await request(['SET','x',{}])).status,400);
  assert.deepEqual(await (await request(['EVAL','return 1',0])).json(),{result:'lua-result'});
  assert.equal(seen.length,1);
 }finally{await new Promise(r=>server.close(r));}
});
