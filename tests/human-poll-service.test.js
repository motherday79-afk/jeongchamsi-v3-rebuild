import test from 'node:test';
import assert from 'node:assert/strict';
import {createHumanPollService,HUMAN_POLL_KEYS,publicHumanPoll} from '../lib/human-poll-service.js';
const admin={id:'admin',role:'admin',status:'active'};
const poll={id:'gallup-1',institution:'한국갤럽',question:'직무 수행 평가',sourceUrl:'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1',startDate:'2026-09-15',endDate:'2026-09-17',publishedDate:'2026-09-18',sampleSize:1000,results:{overall:{positive:50,negative:40,undecided:10}},provenance:{parserVersion:'1',contentHash:'abc',questionKind:'approval'}};
function storage(){
 const values=new Map();return {values,command:async args=>{const [op,key,...rest]=args;
  if(op==='GET')return values.get(key)||null;
  if(op==='SET'){if(rest.includes('NX')&&values.has(key))return null;values.set(key,rest[0]);return 'OK';}
  if(op==='EVAL'){
   if(key.includes('HUMAN_POLL_RELEASE_V1')){const [,lock,token]=rest;if(values.get(lock)!==token)return 0;values.delete(lock);return 1;}
   const [,lock,snapshot,token,old,next]=rest;if(values.get(lock)!==token||(values.get(snapshot)||'')!==old)return 0;values.set(snapshot,next);return 1;
  }throw Error('unexpected command');
 }};
}
const result=items=>({items,providers:[{id:'gallup',state:'success'}]});
test('idempotent archive preserves successful rows and timestamp after source failure or malformed revision',async()=>{
 const db=storage();let payload=result([poll]),clock=0;const service=createHumanPollService({command:db.command,now:()=>clock,collect:async()=>payload});
 await service.collect(admin);clock=1000;await service.collect(admin);assert.equal((await service.list()).items.length,1);
 payload=result([{...poll,results:{overall:{positive:400}}}]);clock=2000;const failed=await service.collect(admin);assert.equal(failed.items[0].results.overall.positive,50);assert.equal(failed.lastSuccessAt,new Date(1000).toISOString());assert.equal(failed.providers[0].lastSuccessAt,new Date(1000).toISOString());assert.equal(failed.providers[0].error,'SOURCE_UNAVAILABLE');
 payload=null;clock=3000;await service.collect(admin);assert.equal((await service.list()).items.length,1);
});
test('concurrent refresh is single writer and collection requires active admin',async()=>{
 const db=storage();let release,entered;const enteredPromise=new Promise(r=>entered=r),barrier=new Promise(r=>release=r);const service=createHumanPollService({command:db.command,collect:async()=>{entered();await barrier;return result([poll]);}});
 for(const user of [null,{...admin,status:'suspended'},{...admin,role:'member'}])await assert.rejects(service.collect(user),/FORBIDDEN/);
 const first=service.collect(admin);await enteredPromise;await assert.rejects(service.collect(admin),/BUSY/);release();await first;assert.equal((await service.list()).items.length,1);assert.equal(db.values.has(HUMAN_POLL_KEYS.lock),false);
});
test('expired lock owner cannot overwrite or delete successor lock',async()=>{
 const db=storage();const service=createHumanPollService({command:db.command,collect:async()=>{db.values.set(HUMAN_POLL_KEYS.lock,'successor');return result([poll]);}});
 await assert.rejects(service.collect(admin),/BUSY/);assert.equal(db.values.get(HUMAN_POLL_KEYS.lock),'successor');assert.equal(db.values.has(HUMAN_POLL_KEYS.snapshot),false);
});
test('source failure cannot expose exception details and public records whitelist fields',async()=>{
 const db=storage();let broken=false;const service=createHumanPollService({command:db.command,collect:async()=>{if(broken)throw Error('secret token');return result([{...poll,secret:'private',provenance:{...poll.provenance,rawBody:'copyright'}}]);}});
 await service.collect(admin);broken=true;const data=await service.collect(admin);assert.equal(JSON.stringify(data).includes('secret'),false);assert.equal(JSON.stringify(data).includes('copyright'),false);
});
test('partial collection preserves valid groups, provenance and comparison note; valid source revisions upsert',async()=>{
 const db=storage();let value=50;const service=createHumanPollService({command:db.command,collect:async()=>({items:[{...poll,comparisonNote:'원문 질문 확인 필요',provenance:{questionKind:'source-summary'},results:{overall:{positive:value,negative:40,undecided:100-value-40},gender:{남성:{positive:51,negative:39,undecided:10,n:500}}}}],providers:[{id:'gallup',state:'partial'}]})});
 const first=await service.collect(admin);assert.equal(first.providers[0].state,'partial');assert.equal(first.items[0].results.gender.남성.n,500);assert.equal(first.items[0].provenance.questionKind,'source-summary');assert.equal(first.items[0].comparisonNote,'원문 질문 확인 필요');
 value=51;const second=await service.collect(admin);assert.equal(second.items.length,1);assert.equal(second.items[0].results.overall.positive,51);
});
test('incomplete same-ID revisions preserve whole prior record and report partial without advancing success',async()=>{
 const db=storage();let clock=0;
 const original={...poll,fetchedAt:'2026-09-18T00:00:00Z',results:{...poll.results,gender:{남성:{positive:51,negative:39,undecided:10,n:500}}}};
 let item=original;const service=createHumanPollService({command:db.command,now:()=>clock,collect:async()=>result([item])});
 const prior=await service.collect(admin);clock=1000;
 for(const results of [
  {...original.results,overall:{positive:51,negative:40,undecided:null}},
  {overall:{positive:51,negative:40,undecided:9},gender:{}},
  {...original.results,gender:{남성:{positive:51,negative:39,undecided:null,n:500}}},
  {...original.results,gender:{남성:{positive:51,negative:39,undecided:10,n:null}}}
 ]){
  item={...original,results,fetchedAt:'2026-09-19T00:00:00Z'};const next=await service.collect(admin);
  assert.deepEqual(next.items,prior.items);assert.equal(next.providers[0].state,'partial');assert.equal(next.providers[0].fetchedCount,0);assert.equal(next.lastSuccessAt,prior.lastSuccessAt);assert.equal(next.providers[0].lastSuccessAt,prior.providers[0].lastSuccessAt);
 }
});
test('public provenance derives provider and transport from official URL; invalid calendar/publication dates reject',()=>{
 const g=publicHumanPoll({...poll,provenance:{...poll.provenance,provider:'untrusted',transport:'http'}});assert.equal(g.provenance.provider,'gallup');assert.equal(g.provenance.transport,'https');
 const r=publicHumanPoll({...poll,sourceUrl:'http://www.realmeter.net/report'});assert.equal(r.provenance.provider,'realmeter');assert.equal(r.provenance.transport,'http');
 for(const patch of [{startDate:'2026-02-30'},{endDate:'2026-02-30'},{publishedDate:'2026-02-30'},{publishedDate:'2026-09-16'}])assert.equal(publicHumanPoll({...poll,...patch}),null);
});
