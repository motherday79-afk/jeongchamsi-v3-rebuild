import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningService,validateMineAd} from '../lib/mining-service.js';
import {miningRequest} from '../lib/mining-http.js';
import {memoryMineStore} from './support/mining-memory.js';
const member={id:'mine-member',role:'member',status:'active'},admin={id:'mine-admin',role:'admin',status:'active'};
function setup(){let time=10000;const command=memoryMineStore();return {command,tick:n=>time+=n,service:createMiningService({command,now:()=>time,rng:()=>0})};}
test('concurrent full-store collections pay exactly once; retry yields the original receipt',async()=>{
 const {service,tick}=setup();await service.run(member);tick(30000);
 const body={action:'collect',cycle:1,requestId:'collection-0001'};
 const result=await Promise.all([service.run(member,body),service.run(member,body)]);
 assert.ok(result.every(r=>r.ok));assert.equal(result[0].result.visitUrl,result[1].result.visitUrl);
 assert.equal((await service.run(member)).state.gold,10);
 const another=await service.run(member,{...body,requestId:'collection-0002'});assert.equal(another.ok,false);assert.equal(another.state.gold,10);
});
test('receipt visits count once per claim; test visits do not enter advertiser metrics',async()=>{
 const {service,tick}=setup();await service.admin(admin,{name:'Brand',url:'https://example.com/offer',enabled:true});
 await service.run(member);tick(30000);const claim=await service.run(member,{action:'collect',cycle:1,requestId:'collect-real-001'});
 const token=new URL(claim.result.visitUrl,'https://jcs.test').searchParams.get('token');
 assert.equal(await service.visit(member,token),'https://example.com/offer');await service.visit(member,token);
 let report=await service.admin(admin);assert.equal(report.rows[0].visits,1);assert.equal(report.rows[0].users,1);
 await assert.rejects(()=>service.visit(admin,token),/VISIT_EXPIRED/);
 await service.run(admin,{action:'test-fill',requestId:'admin-fill-001'});
 const testClaim=await service.run(admin,{action:'collect',cycle:1,requestId:'admin-collect-001'});
 await service.visit(admin,new URL(testClaim.result.visitUrl,'https://jcs.test').searchParams.get('token'));
 report=await service.admin(admin);assert.equal(report.rows[0].visits,1);
});
test('member cannot change advertisements or fill a test store',async()=>{
 const {service}=setup();await assert.rejects(()=>service.admin(member,{name:'x'}),/FORBIDDEN/);
 const result=await service.run(member,{action:'test-fill',requestId:'illegal-fill-001'});assert.equal(result.ok,false);assert.equal(result.state.ore,0);
 await assert.rejects(()=>service.run(null),/LOGIN_REQUIRED/);
});
test('malformed storage fails closed instead of resetting a wallet',async()=>{
 const {service,command}=setup();await command(['SET','jcsr2:mine:v1:user:mine-member','{']);
 await assert.rejects(()=>service.run(member),/STORAGE_INVALID/);
});
test('advertiser destination must be an external HTTPS URL with no embedded credentials',()=>{
 for(const url of ['javascript:alert(1)','http://example.com','https://name:secret@example.com','https://127.0.0.1','https://localhost'])assert.throws(()=>validateMineAd({name:'x',url,enabled:true}),/AD_URL/);
 assert.equal(validateMineAd({name:'상점',url:'https://example.com/path?a=1',enabled:true}).url,'https://example.com/path?a=1');
});
test('HTTP requires authentication, JSON, same-origin writes and admin role',async()=>{
 const {service}=setup(),url=new URL('https://jcs.test/api/v3/mine');
 assert.equal((await miningRequest({method:'GET'},{service,url})).status,401);
 assert.equal((await miningRequest({method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:{}},{service,url,user:admin})).status,403);
 assert.equal((await miningRequest({method:'POST',headers:{'content-type':'text/plain'},body:{}},{service,url,user:admin})).status,415);
 assert.equal((await miningRequest({method:'DELETE'},{service,url,user:admin})).status,405);
 assert.equal((await miningRequest({method:'GET'},{service,url:new URL(url+'/admin'),user:member})).status,403);
});
test('HTTP malformed JSON and internal storage failures never expose implementation secrets',async()=>{
 const {service}=setup(),url=new URL('https://jcs.test/api/v3/mine');
 const bad=await miningRequest({method:'POST',headers:{'content-type':'application/json'},body:'{'},{service,url,user:admin});assert.equal(bad.status,400);
 const broken=await miningRequest({method:'GET'},{service:{run:()=>{throw Error('secret-redis-password');}},url,user:admin});assert.equal(broken.status,503);assert.doesNotMatch(JSON.stringify(broken),/secret-redis/);
});
