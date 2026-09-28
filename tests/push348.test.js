import test from 'node:test';
import assert from 'node:assert/strict';
import {changedPollProviders,pushCopy,pollOperationEvents,watchdogProblems,watchdogRecovery} from '../lib/update-notifications.js';
const row=(provider,positive=50)=>({institution:provider,provenance:{provider},publishedDate:'2026-09-28',results:{overall:{positive}}});
test('only changed public content names providers, timestamps and old archive additions do not',()=>{
 const old=['gallup','realmeter','nbs'].map(x=>row(x));
 assert.deepEqual(changedPollProviders(old,old.map(x=>({...x,fetchedAt:'later'}))),[]);
 assert.deepEqual(changedPollProviders(old,[row('gallup',51),...old.slice(1)]),['gallup']);
 assert.deepEqual(changedPollProviders(old,[...old,{...row('gallup',3),publishedDate:'2025-01-01'}]),[]);
});
test('completion copy names exactly one, two, or all updated institutions',()=>{
 assert.equal(pushCopy({kind:'poll',providers:['gallup']}).title,'한국갤럽 여론조사 데이터가 업데이트되었습니다.');
 assert.equal(pushCopy({kind:'poll',providers:['nbs','gallup']}).title,'한국갤럽·NBS 여론조사 데이터가 업데이트되었습니다.');
 assert.equal(pushCopy({kind:'poll',providers:['nbs','realmeter','gallup']}).title,'전체 여론조사 데이터가 업데이트되었습니다.');
 assert.equal(pushCopy({kind:'rank'}).title,'나우랭크 데이터가 업데이트되었습니다.');
 assert.ok(!pushCopy({kind:'poll'}).title.includes('전체'));
});
test('partial failure states successful checks accurately and safe reasons never leak exceptions',()=>{
 const next={providers:[{id:'gallup',state:'success'},{id:'realmeter',state:'error',error:'secret'},{id:'nbs',state:'success'}]};
 const events=pollOperationEvents({},next,Date.parse('2026-09-28T08:00:00Z'),[]);
 assert.equal(events.length,1);assert.match(pushCopy(events[0]).title,/리얼미터.*실패/);
 assert.match(pushCopy(events[0]).body,/기존/);assert.ok(!JSON.stringify(events).includes('secret'));
 const recovered=pollOperationEvents(next,{providers:next.providers.map(p=>({...p,state:'success'}))},Date.parse('2026-09-28T09:00:00Z'),[]);
 assert.equal(recovered[0].kind,'recovered');
});
test('watchdog respects KST due times, non-poll days and catches missing/stalled runs',()=>{
 const monday=Date.parse('2026-09-28T09:15:00Z');
 assert.deepEqual(watchdogProblems({now:Date.parse('2026-09-28T06:00:00Z')}),[]);
 assert.equal(watchdogProblems({now:monday}).length,2);
 assert.equal(watchdogProblems({now:Date.parse('2026-09-29T09:15:00Z')}).length,1);
 const rank={date:'2026-09-28',status:'RUNNING',updatedAt:monday-16*60000};
 assert.ok(watchdogProblems({now:monday,rank,polls:{lastCheckedAt:new Date(monday).toISOString()}}).some(e=>e.reason==='stalled'));
});
test('watchdog recovery requires actual later completion, not a new day or an early check',()=>{
 const at=Date.parse('2026-09-28T09:15:00Z'),issue={target:'rank',at};
 assert.deepEqual(watchdogRecovery([issue],{now:at+1000,rank:{status:'RUNNING'}}),[]);
 assert.deepEqual(watchdogRecovery([issue],{now:at+1000,rank:{status:'COMPLETED',completedAt:at-1}}),[]);
 assert.equal(watchdogRecovery([issue],{now:at+1000,rank:{status:'COMPLETED',completedAt:at+1}})[0].kind,'recovered');
});
