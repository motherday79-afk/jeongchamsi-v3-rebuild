import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePoliticians} from '../api/gateway.js';
import handler from '../api/gateway.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {issueSessionToken} from '../lib/session.js';
import {fixture,profiles} from './helpers/person-refresh-fixture.js';
const secret='person-analysis-access-test-secret',user={id:'member',role:'member'},personId='assembly-211',walletKey='jcs:points:v1:wallet:member';
async function setup(){
 const f=await fixture({now:()=>Date.now()});
 f.db.values.set(TARGET_KEYS.users,JSON.stringify({member:user,other:{id:'other',role:'member'},admin:{id:'admin',role:'admin'},suspended:{id:'suspended',role:'member',status:'suspended'}}));
 f.db.values.set(TARGET_KEYS.politicians('assembly'),JSON.stringify({items:profiles}));f.db.values.set(walletKey,JSON.stringify({balance:1000}));
 await f.service.saveRefreshPolicy({enabled:true,fee:100,cooldownMinutes:10});
 const pay=()=>f.service.requestMemberRefresh(user,{personId,requestId:'api-access-request-12345',quotedFee:100});
 const call=async(actor='member',id=personId,query='',service=f.service)=>{
  const saved=process.env.JCS_REBUILD_SESSION_SECRET;process.env.JCS_REBUILD_SESSION_SECRET=secret;
  const headers={},res={setHeader:(k,v)=>headers[k]=v,end:body=>res.body=JSON.parse(body)};
  try{await handlePoliticians({method:'GET',headers:actor?{cookie:'jcsr2_session='+issueSessionToken(actor,secret)}:{}},res,f.db.command,new URL('https://example.org/api/v3/politicians?id='+id+query),service);return {status:res.statusCode,headers,...res.body};}
  finally{if(saved===undefined)delete process.env.JCS_REBUILD_SESSION_SECRET;else process.env.JCS_REBUILD_SESSION_SECRET=saved;}
 };
 return {...f,pay,call};
}
test('only the paying member receives full detail and comparison for the purchased person',async()=>{
 const f=await setup();await f.pay();
 for(const q of ['', '&view=compare']){
  const result=await f.call('member',personId,q);assert.equal(result.accessTier,'admin');assert.equal(result.intelligence.diagnoses.length,10);assert.ok(result.intelligence.prescriptions.length>0);assert.equal(result.analysisAccess.active,true);assert.deepEqual(result.intelligence.analysisAccess,result.analysisAccess);assert.equal(result.headers['Cache-Control'],'no-store');
  const other=await f.call('other',personId,q);assert.equal(other.accessTier,'member');assert.equal(other.intelligence.diagnoses.length,6);assert.equal(other.intelligence.prescriptions,undefined);
  const peer=await f.call('member','assembly-026',q);assert.equal(peer.accessTier,'member');assert.equal(peer.intelligence.prescriptions,undefined);
 }
 assert.equal(JSON.parse(f.db.values.get(walletKey)).balance,900);
 assert.equal(JSON.parse(f.db.values.get(TARGET_KEYS.users)).member.role,'member');
});
test('expiry, guest and suspended accounts cannot obtain paid analysis by query parameters',async()=>{
 const f=await setup();await f.pay();let wallet=JSON.parse(f.db.values.get(walletKey));
 wallet.analysisAccess[personId].grantedAt=Date.now()-86400000;wallet.analysisAccess[personId].expiresAt=Date.now()-1;
 f.db.values.set(walletKey,JSON.stringify(wallet));
 const expired=await f.call('member',personId,'&view=compare&role=admin&accessTier=admin&expiresAt=9999999999999');assert.equal(expired.accessTier,'member');assert.equal(expired.analysisAccess.active,false);assert.equal(expired.intelligence.prescriptions,undefined);
 for(const actor of [null,'suspended']){const result=await f.call(actor);assert.equal(result.accessTier,'public');assert.equal(result.intelligence.diagnoses.length,3);assert.equal(result.intelligence.prescriptions,undefined);}
 const admin=await f.call('admin');assert.equal(admin.accessTier,'admin');assert.equal(admin.intelligence.diagnoses.length,10);
});
test('authorization uses the grant at response time, after delayed report generation',async()=>{
 const f=await setup();await f.pay();let expire;
 const gate=new Promise(resolve=>expire=resolve);
 const pending=f.call('member',personId,'',{getPublicIntelligence:async id=>{await gate;return f.service.getPublicIntelligence(id);}});
 const wallet=JSON.parse(f.db.values.get(walletKey));wallet.analysisAccess[personId].expiresAt=Date.now()-1;wallet.analysisAccess[personId].grantedAt=wallet.analysisAccess[personId].expiresAt-86400000;f.db.values.set(walletKey,JSON.stringify(wallet));expire();
 const result=await pending;assert.equal(result.accessTier,'member');assert.equal(result.intelligence.prescriptions,undefined);assert.equal(result.analysisAccess.active,false);
});
test('paid analysis never authorizes administrator mutation endpoints',async()=>{
 const f=await setup();await f.pay();const oldFetch=globalThis.fetch,keys=['JCS_REBUILD_SESSION_SECRET','JCS_REBUILD_REDIS_REST_URL','JCS_REBUILD_REDIS_REST_TOKEN','JCS_REBUILD_REDIS_REDIS_URL','JCS_REBUILD_REDIS_URL'],saved=new Map(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{JCS_REBUILD_SESSION_SECRET:secret,JCS_REBUILD_REDIS_REST_URL:'https://grant-api.fixture.invalid',JCS_REBUILD_REDIS_REST_TOKEN:'test'});delete process.env.JCS_REBUILD_REDIS_REDIS_URL;delete process.env.JCS_REBUILD_REDIS_URL;
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://grant-api.fixture.invalid');return {ok:true,status:200,json:async()=>({result:await f.db.command(JSON.parse(options.body))})};};
 try{for(const [path,method,body] of [['admin/intelligence/person/publish','POST',{personId}],['admin/intelligence/collection-profile','PATCH',{personId,collectionProfile:{mode:'name'}}],['admin/intelligence/refresh-policy','PATCH',{enabled:true,fee:1,cooldownMinutes:1}]]){
  const res={setHeader(){},end(body){this.body=JSON.parse(body);}};await handler({url:'/api/v3/'+path,method,headers:{host:'fixture.invalid',cookie:'jcsr2_session='+issueSessionToken('member',secret)},body},res);assert.equal(res.statusCode,403,path);
 }}finally{globalThis.fetch=oldFetch;for(const [k,v] of saved)v===undefined?delete process.env[k]:process.env[k]=v;}
});
test('three separately purchased people render real projected deep comparison without an extra charge',async()=>{
 const f=await setup();await f.pay();
 for(const id of ['assembly-026','assembly-001'])await f.service.requestMemberRefresh(user,{personId:id,requestId:'compare-purchase-'+id,quotedFee:100});
 const {renderPoliticianCompare}=await import('../src/views/politician-compare.js');
 const service={getForCompare:id=>f.call('member',id,'&view=compare'),get:id=>f.call('member',id),search:async()=>({ok:true,items:[]})};
 const route='/compare?ids=assembly-211,assembly-026,assembly-001&run=1',session={authenticated:true,user};
 const before=f.db.values.get(walletKey),html=await renderPoliticianCompare(service,route,session);
 assert.ok(html.includes('jcs-compare-report-paid'));assert.ok(html.includes('data-comparison-topic="10"'));assert.equal((html.match(/data-compare-matrix-profile="/g)||[]).length,3);
 assert.equal(f.db.values.get(walletKey),before);
 const wallet=JSON.parse(before);wallet.analysisAccess['assembly-026'].expiresAt=Date.now()-1;wallet.analysisAccess['assembly-026'].grantedAt=wallet.analysisAccess['assembly-026'].expiresAt-86400000;f.db.values.set(walletKey,JSON.stringify(wallet));
 const expired=await renderPoliticianCompare(service,route,session);assert.ok(expired.includes('data-compare-access-gate'));assert.ok(!expired.includes('data-comparison-topic="10"'));assert.equal(JSON.parse(f.db.values.get(walletKey)).balance,700);
});
