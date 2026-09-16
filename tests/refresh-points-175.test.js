import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rawFor} from './helpers/person-refresh-fixture.js';
import {INTELLIGENCE_KEYS as K} from '../lib/intelligence-keys.js';
const user={id:'member',role:'member'},personId='assembly-211',requestId='request-one-123456',walletKey='jcs:points:v1:wallet:member';
async function setup(options){const f=await fixture(options);f.db.values.set(walletKey,JSON.stringify({balance:1000}));return f;}
test('member refresh stays disabled until the administrator sets a positive fee and enables it',async()=>{
 const {service}=await setup();assert.equal(typeof service.requestMemberRefresh,'function');
 await assert.rejects(service.requestMemberRefresh(user,{personId,requestId,quotedFee:100}),/REFRESH_DISABLED/);
 await assert.rejects(service.saveRefreshPolicy({enabled:true,fee:0,cooldownMinutes:10}),/REFRESH_POLICY_INVALID/);
});
test('a successful paid refresh charges once with publishing and is idempotent on retry',async()=>{
 const {service,db,collected,repo}=await setup();assert.equal(typeof service.saveRefreshPolicy,'function');
 await service.saveRefreshPolicy({enabled:true,fee:100,cooldownMinutes:10});
 const input={personId,requestId,quotedFee:100},result=await service.requestMemberRefresh(user,input);
 assert.equal(result.ok,true);assert.equal(result.points,100);assert.equal((await repo.getRankings('base')).byId[personId].rank,3);
 assert.equal(JSON.parse(db.values.get(walletKey)).balance,900);
 const retry=await service.requestMemberRefresh(user,input);assert.deepEqual(retry,result);assert.equal(collected.length,1);
 assert.equal(JSON.parse(db.values.get(walletKey)).ledger.filter(x=>x.type==='person-refresh').length,1);
 await assert.rejects(service.requestMemberRefresh(user,{...input,requestId:'request-two-123456'}),/REFRESH_RECENT/);
});
test('source failures leave points and public data untouched',async()=>{
 const {service,db,repo}=await setup({collectRaw:async p=>({...rawFor(p),news:null})});assert.equal(typeof service.saveRefreshPolicy,'function');
 await service.saveRefreshPolicy({enabled:true,fee:100,cooldownMinutes:10});const before=await repo.getRankings('base');
 await assert.rejects(service.requestMemberRefresh(user,{personId,requestId,quotedFee:100}),/PERSON_SOURCE_INCOMPLETE/);
 assert.equal(JSON.parse(db.values.get(walletKey)).balance,1000);assert.deepEqual(await repo.getRankings('base'),before);
});
test('authentication, sufficient balance and the server quote are required before collection',async()=>{
 const {service,collected}=await setup();assert.equal(typeof service.saveRefreshPolicy,'function');
 await service.saveRefreshPolicy({enabled:true,fee:2000,cooldownMinutes:10});
 await assert.rejects(service.requestMemberRefresh(null,{personId,requestId,quotedFee:2000}),/LOGIN_REQUIRED/);
 await assert.rejects(service.requestMemberRefresh(user,{personId,requestId,quotedFee:1}),/REFRESH_PRICE_CHANGED/);
 await assert.rejects(service.requestMemberRefresh(user,{personId,requestId,quotedFee:2000}),/INSUFFICIENT_POINTS/);
 assert.equal(collected.length,0);
});
test('concurrent identical requests do not collect or charge twice',async()=>{
 let release;const gate=new Promise(r=>release=r);
 const {service,db}=await setup({collectRaw:async(p,c)=>{await gate;return {...rawFor(p,1),snapshotId:c.snapshotId};}});assert.equal(typeof service.saveRefreshPolicy,'function');
 await service.saveRefreshPolicy({enabled:true,fee:100,cooldownMinutes:10});
 const input={personId,requestId,quotedFee:100},first=service.requestMemberRefresh(user,input);
 await new Promise(r=>setTimeout(r,10));const second=await service.requestMemberRefresh(user,input);assert.equal(second.status,'RUNNING');release();await first;
 assert.equal(JSON.parse(db.values.get(walletKey)).balance,900);
});
test('an administrator cannot publish a pending paid request without its settlement',async()=>{
 const {service,db}=await setup();
 const {createRefreshBilling}=await import('../lib/refresh-billing.js');const billing=createRefreshBilling({command:db.command,now:()=>Date.parse('2026-09-16T12:00:00Z')});
 await service.saveRefreshPolicy({enabled:true,fee:100,cooldownMinutes:10});
 const request=await billing.begin(user,{personId,requestId,quotedFee:100});
 await service.refreshPerson({personId},{billing:request.billing});
 await assert.rejects(service.publishPersonRefresh({personId}),/PERSON_REFRESH_MEMBER_OWNED/);
 const result=await service.publishPersonRefresh({personId},{billing:request.billing});assert.equal(result.points,100);assert.equal(JSON.parse(db.values.get(walletKey)).balance,900);
});
test('spending the balance while collection runs cannot produce a negative balance or unpaid publication',async()=>{
 let release;const gate=new Promise(r=>release=r);
 const {service,db,repo}=await setup({collectRaw:async(p,c)=>{await gate;return {...rawFor(p,1),snapshotId:c.snapshotId};}});
 await service.saveRefreshPolicy({enabled:true,fee:100,cooldownMinutes:10});
 const first=service.requestMemberRefresh(user,{personId,requestId,quotedFee:100});await new Promise(r=>setTimeout(r,10));
 const wallet=JSON.parse(db.values.get(walletKey));wallet.balance=50;db.values.set(walletKey,JSON.stringify(wallet));release();
 await assert.rejects(first,/INSUFFICIENT_POINTS/);assert.equal(JSON.parse(db.values.get(walletKey)).balance,50);assert.equal((await repo.getRankings('base')).byId[personId].rank,1);
});
