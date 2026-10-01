import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePoliticians} from '../api/gateway.js';
import {TARGET_KEYS} from '../lib/migration-service.js';

test('public map reads only elected profile stores and returns lean registered data without photos or analysis',async()=>{
 const calls=[];
 const command=async args=>{
  calls.push(args);
  const type=['assembly','metropolitan','basic'].find(type=>TARGET_KEYS.politicians(type)===args[1]);
  assert.ok(type,'unexpected store read: '+args[1]);
  return JSON.stringify({items:[{id:type+'-999',type,name:'등록 이름',party:'등록 정당',region:'서울',jurisdiction:'서울',isVacant:type==='basic',photo:'private-heavy-data',phone:'private-data'}]});
 };
 const res={setHeader(){},end(raw){this.body=JSON.parse(raw);}};
 await handlePoliticians({method:'GET',headers:{}},res,command,new URL('https://example.test/api/v3/politicians?map=1'));
 assert.equal(res.statusCode,200);
 assert.equal(res.body.items.length,3);
 assert.equal(calls.length,3);
 assert.equal(res.body.basis,'정참시 등록 정치인 정보');
 assert.ok(Number.isFinite(Date.parse(res.body.asOf)));
 assert.deepEqual(Object.keys(res.body.items[0]).sort(),['id','isVacant','jurisdiction','name','party','region','type']);
 assert.equal(res.body.items[0].party,'등록 정당');
 assert.equal(res.body.items[2].isVacant,true);
});
