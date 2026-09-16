import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rawFor,now as start} from './helpers/person-refresh-fixture.js';
const user={id:'member',role:'member'},personId='assembly-211',walletKey='jcs:points:v1:wallet:member';
async function setup(options={}){
 let time=start();const f=await fixture({now:()=>time,...options});f.db.values.set(walletKey,JSON.stringify({balance:1000}));
 await f.service.saveRefreshPolicy({enabled:true,fee:100,cooldownMinutes:10});
 return {...f,setTime:value=>time=value,pay:(id=personId,requestId='grant-request-12345')=>f.service.requestMemberRefresh(user,{personId:id,requestId,quotedFee:100})};
}
test('successful paid publication grants exactly 24 hours for this member and person',async()=>{
 const f=await setup(),result=await f.pay(),wallet=JSON.parse(f.db.values.get(walletKey));
 assert.equal(result.analysisAccess?.active,true);
 assert.equal(result.analysisAccess.grantedAt,start());assert.equal(result.analysisAccess.expiresAt,start()+86400000);
 assert.equal(wallet.balance,900);assert.equal(wallet.analysisAccess[personId].expiresAt,start()+86400000);
 assert.equal((await f.service.personRefreshQuote(user,personId)).analysisAccess.active,true);
 assert.equal((await f.service.personRefreshQuote(user,'assembly-026')).analysisAccess.active,false);
 assert.equal((await f.service.personRefreshQuote({id:'other',role:'member'},personId)).analysisAccess.active,false);
});
test('expiry is enforced at the exact boundary and replay never extends a grant',async()=>{
 const f=await setup();await f.pay();f.setTime(start()+86399999);
 assert.equal((await f.service.personRefreshQuote(user,personId)).analysisAccess?.active,true);
 f.setTime(start()+86400000);assert.equal((await f.service.personRefreshQuote(user,personId)).analysisAccess.active,false);
 const replay=await f.pay();assert.equal(replay.analysisAccess.active,false);assert.equal(replay.analysisAccess.expiresAt,start()+86400000);
 assert.equal(JSON.parse(f.db.values.get(walletKey)).balance,900);assert.equal(f.collected.length,1);
});
test('administrator republication and disabling new purchases preserve existing access',async()=>{
 const f=await setup();await f.pay();f.setTime(start()+3600000);
 await f.service.refreshPerson({personId});await f.service.publishPersonRefresh({personId});
 await f.service.startPublish();await f.service.runPublishStep();
 await f.service.saveRefreshPolicy({enabled:false,fee:100,cooldownMinutes:10});
 const quote=await f.service.personRefreshQuote(user,personId);
 assert.equal(quote.enabled,false);assert.equal(quote.analysisAccess?.active,true);assert.equal(quote.analysisAccess.expiresAt,start()+86400000);
 assert.equal(JSON.parse(f.db.values.get(walletKey)).balance,900);
});
test('a failed refresh neither grants access nor charges and a failed repeat preserves the old grant',async()=>{
 let fail=true;const f=await setup({collectRaw:async(p,c)=>({...rawFor(p),snapshotId:c.snapshotId,...(fail?{news:null}:{})})});
 await assert.rejects(f.pay(),/PERSON_SOURCE_INCOMPLETE/);
 assert.equal((await f.service.personRefreshQuote(user,personId)).analysisAccess?.active,false);
 assert.equal(JSON.parse(f.db.values.get(walletKey)).balance,1000);
 fail=false;await f.pay(personId,'grant-success-12345');const before=JSON.parse(f.db.values.get(walletKey)).analysisAccess;
 fail=true;f.setTime(start()+3600000);await assert.rejects(f.pay(personId,'grant-repeat-12345'),/PERSON_SOURCE_INCOMPLETE/);
 assert.deepEqual(JSON.parse(f.db.values.get(walletKey)).analysisAccess,before);assert.equal(JSON.parse(f.db.values.get(walletKey)).balance,900);
});
test('independent purchases keep separate expiry times and retry results use current access',async()=>{
 const f=await setup();await f.pay();f.setTime(start()+3600000);await f.pay('assembly-026','grant-second-12345');
 const wallet=JSON.parse(f.db.values.get(walletKey));assert.equal(wallet.analysisAccess?.[personId]?.expiresAt,start()+86400000);
 assert.equal(wallet.analysisAccess['assembly-026'].expiresAt,start()+90000000);assert.equal(wallet.balance,800);
 f.setTime(start()+86400000);assert.equal((await f.service.memberRefreshStatus(user,'grant-request-12345')).analysisAccess.active,false);
 assert.equal((await f.service.personRefreshQuote(user,'assembly-026')).analysisAccess.active,true);
});
test('publication storage failure cannot leave an entitlement or point debit behind',async()=>{
 const f=await setup();const {createRefreshBilling}=await import('../lib/refresh-billing.js');const {publishOnePerson}=await import('../lib/person-publication.js');const {profiles}=await import('./helpers/person-refresh-fixture.js');
 const billing=createRefreshBilling({command:f.db.command,now:start});const {billing:charge}=await billing.begin(user,{personId,requestId:'failed-cas-request-12345',quotedFee:100});
 const collected=await f.service.refreshPerson({personId},{billing:charge});
 await assert.rejects(publishOnePerson({command:args=>args[0]==='EVAL'?Promise.reject(Error('STORAGE_WRITE_FAILED')):f.db.command(args),repository:f.repo,profiles,personId,refreshId:collected.refresh.refreshId,now:start,billing:charge}),/STORAGE_WRITE_FAILED/);
 const wallet=JSON.parse(f.db.values.get(walletKey));assert.equal(wallet.balance,1000);assert.equal(wallet.analysisAccess,undefined);assert.equal(wallet.ledger,undefined);assert.equal((await f.repo.getPersonRefresh(personId)).status,'DRAFT');
});
