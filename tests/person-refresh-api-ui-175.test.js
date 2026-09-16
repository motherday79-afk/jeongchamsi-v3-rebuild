import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/gateway.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {issueSessionToken} from '../lib/session.js';
import {fixture,profiles} from './helpers/person-refresh-fixture.js';
import {renderAdminStable,renderMyPoints} from '../src/views/stage1.js';
import {renderRefreshSummary,renderMemberRefreshMount} from '../src/views/person-refresh.js';
import {createAuthService} from '../src/core/auth.js';
import {projectIntelligence} from '../lib/intelligence-access.js';
test('real HTTP routes enforce admin settings, member authentication, and authenticated actor identity',async()=>{
 const {db}=await fixture(),savedFetch=globalThis.fetch,keys=['JCS_REBUILD_SESSION_SECRET','JCS_REBUILD_REDIS_REST_URL','JCS_REBUILD_REDIS_REST_TOKEN','JCS_REBUILD_REDIS_REDIS_URL','JCS_REBUILD_REDIS_URL'],saved=new Map(keys.map(k=>[k,process.env[k]]));
 const secret='refresh-api-test-secret';Object.assign(process.env,{JCS_REBUILD_SESSION_SECRET:secret,JCS_REBUILD_REDIS_REST_URL:'https://refresh.fixture.invalid',JCS_REBUILD_REDIS_REST_TOKEN:'test'});delete process.env.JCS_REBUILD_REDIS_REDIS_URL;delete process.env.JCS_REBUILD_REDIS_URL;
 db.values.set(TARGET_KEYS.users,JSON.stringify({admin:{id:'admin',role:'admin'},member:{id:'member',role:'member'}}));db.values.set(TARGET_KEYS.politicians('assembly'),JSON.stringify({items:profiles}));
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://refresh.fixture.invalid');return {ok:true,status:200,json:async()=>({result:await db.command(JSON.parse(options.body))})};};
 async function call(path,method,actor,body){let result;const res={statusCode:0,setHeader(){},end(v){result=JSON.parse(v)}};await handler({url:'/api/v3/'+path,method,headers:{host:'fixture.invalid',...(actor?{cookie:'jcsr2_session='+issueSessionToken(actor,secret)}:{})},body},res);return {status:res.statusCode,...result};}
 try{
  const settings={enabled:true,fee:100,cooldownMinutes:10,editorId:'forged'};
  assert.equal((await call('admin/intelligence/refresh-policy','PATCH','member',settings)).status,403);
  assert.equal((await call('admin/intelligence/refresh-policy','PATCH',null,settings)).status,401);
  const result=await call('admin/intelligence/refresh-policy','PATCH','admin',settings);assert.equal(result.refreshPolicy.updatedBy,'admin');
  assert.equal((await call('person-refresh?personId=assembly-211','GET',null)).status,401);
  const quote=await call('person-refresh?personId=assembly-211','GET','member');assert.equal(quote.fee,100);assert.equal(quote.enabled,true);
  assert.equal((await call('admin/intelligence/collection-profile','PATCH','member',{personId:'assembly-211',collectionProfile:{mode:'name'}})).status,403);
  const wrong=await call('person-refresh','POST','member',{personId:'assembly-211',requestId:'valid-request-12345',quotedFee:1,billing:{fee:0}});assert.equal(wrong.error,'REFRESH_PRICE_CHANGED');
  assert.equal((await call('admin/intelligence/person/status?personId=assembly-211','GET','admin')).ok,true);
 }finally{globalThis.fetch=savedFetch;for(const [k,v] of saved)v===undefined?delete process.env[k]:process.env[k]=v;}
});
test('admin views expose scoped keywords, result inspection, and disabled-by-default paid settings',async()=>{
 const f=await fixture(),admin={authenticated:true,user:{id:'admin',role:'admin'}};
 const people=await renderAdminStable(admin,{adminPoliticians:()=>f.service.adminPoliticianStatus('박지원').then(x=>({ok:true,...x.list,completeness:x.completeness,audit:x.audit}))},{tab:'politicians',q:'박지원'});
 assert.match(people,/전북박지원/);assert.match(people,/최근 수집 결과 확인/);assert.doesNotMatch(people,/전체 순위는 다음 전체 게시까지/);
 const pipeline=await renderAdminStable(admin,{intelligenceStatus:()=>f.service.status()},{tab:'pipeline'});assert.match(pipeline,/data-refresh-policy-form/);assert.doesNotMatch(pipeline,/name="enabled" checked/);
 const html=renderRefreshSummary({summary:{search:{keywordMode:'specified',keywords:[{keyword:'군산박지원',volume:{pc:null,pcRange:{min:0,max:9},mobile:null}}],confirmedVolume:{total:0,complete:false}},news:{items:[]}}});
 assert.match(html,/10건 미만/);assert.match(html,/미확인/);
 assert.equal(renderMemberRefreshMount(profiles[0],{authenticated:false}), '');
});
test('the real client sends the displayed price and stable request ID without accepting arbitrary billing parameters',async()=>{
 const old=globalThis.fetch;let request;
 globalThis.fetch=async(url,options)=>{request={url,body:JSON.parse(options.body)};return {ok:true,status:200,json:async()=>({ok:true,publishedAt:1})};};
 try{await createAuthService().requestMemberRefresh({personId:'assembly-211',requestId:'request-one-12345',quotedFee:100});assert.equal(request.url,'/api/v3/person-refresh');assert.deepEqual(request.body,{personId:'assembly-211',requestId:'request-one-12345',quotedFee:100});}finally{globalThis.fetch=old;}
});
test('paid refresh does not upgrade member report access',async()=>{
 const {service}=await fixture();await service.refreshPerson({personId:'assembly-211'});await service.publishPersonRefresh({personId:'assembly-211'});
 const report=projectIntelligence(await service.getPublicIntelligence('assembly-211'),'member');
 assert.equal(report.accessTier,'member');assert.equal(report.prescriptions,undefined);
});
