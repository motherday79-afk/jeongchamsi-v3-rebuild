import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/gateway.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {USERS_CAS_LUA} from '../lib/rebuild-store.js';
import {issueSessionToken} from '../lib/session.js';
import {renderPoliticianDetail} from '../src/views/politicians.js';
import {renderPersonEditPermission} from '../src/ui/person-edit-permissions.js';
const owner={id:'admin',role:'admin',status:'active'},member={id:'member1',role:'member',status:'active',personPageEditing:{scope:'selected',personIds:['assembly-001']}};
test('gateway enforces live grants, isolated scope, owner-only restore and records actor history',async()=>{
 const map=new Map([[TARGET_KEYS.users,JSON.stringify({admin:owner,member1:member})],[TARGET_KEYS.politicians('assembly'),JSON.stringify({items:[{id:'assembly-001',name:'기존 이름',type:'assembly'},{id:'assembly-002',name:'다른 의원',type:'assembly'}]})]]);
 const lists=new Map();
 const command=async a=>{
  if(a[0]==='GET')return map.get(a[1])||null;
  if(a[0]==='MGET')return a.slice(1).map(k=>map.get(k)||null);
  if(a[0]==='LRANGE')return lists.get(a[1])||[];
  if(a[0]==='EVAL'&&a[1]===USERS_CAS_LUA){if((map.get(a[3])||'')!==a[4])return 0;map.set(a[3],a[5]);return 1;}
  if(a[0]==='EVAL'&&a[1].includes("':history'")){
   const key=a[3],section=a[4],state=JSON.parse(map.get(key)||'{}'),old=state[section],next=JSON.parse(a[6]);
   if((old?.revision||0)!==Number(a[5]))return 'CONFLICT';
   if(a[7]==='merge')next.changes={...old?.changes,...next.changes};next.revision=(old?.revision||0)+1;state[section]=next;map.set(key,JSON.stringify(state));
   const event={id:a[8],section,at:next.updatedAt,actor:next.updatedBy,action:a[7],before:old||{changes:{}},after:next};lists.set(key+':history',[JSON.stringify(event),...(lists.get(key+':history')||[])].slice(0,50));return 'OK';
  }
  throw Error('UNEXPECTED '+a[0]);
 };
 const keys=['JCS_REBUILD_SESSION_SECRET','JCS_REBUILD_REDIS_REST_URL','JCS_REBUILD_REDIS_REST_TOKEN','JCS_REBUILD_REDIS_REDIS_URL','JCS_REBUILD_REDIS_URL'],saved=new Map(keys.map(k=>[k,process.env[k]])),oldFetch=globalThis.fetch,secret='permissions440-test-secret';
 Object.assign(process.env,{JCS_REBUILD_SESSION_SECRET:secret,JCS_REBUILD_REDIS_REST_URL:'https://permissions440.invalid',JCS_REBUILD_REDIS_REST_TOKEN:'test'});delete process.env.JCS_REBUILD_REDIS_REDIS_URL;delete process.env.JCS_REBUILD_REDIS_URL;
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://permissions440.invalid');return {ok:true,status:200,json:async()=>({result:await command(JSON.parse(options.body))})};};
 const request=async(actor,path,method='GET',body={},origin='https://permissions440.invalid')=>{const res={setHeader(){},end(v){this.body=JSON.parse(v);}};await handler({url:'/api/v3/'+path,method,headers:{host:'permissions440.invalid',origin,cookie:'jcsr2_session='+issueSessionToken(actor,secret)},body},res);return res;};
 try{
  let r=await request('member1','admin/person-page?personId=assembly-001');assert.equal(r.statusCode,200);assert(!r.body.sections.some(s=>s.id==='prescriptions'));
  r=await request('member1','politicians?id=assembly-001');assert.equal(r.statusCode,200);assert.equal(r.body.intelligence.canEditPage,true);assert.equal(r.body.intelligence.accessTier,'admin');assert.equal(r.body.intelligence.prescriptions,undefined);
  r=await request('member1','politicians?id=assembly-002');assert.equal(r.body.intelligence.canEditPage,false);assert.equal(r.body.intelligence.accessTier,'member');
  assert.equal((await request('member1','admin/person-page?personId=assembly-002')).statusCode,403);
  assert.equal((await request('member1','admin/person-page?personId=assembly-001&history=1')).statusCode,403);
  const change={personId:'assembly-001',section:'profile',revision:0,changes:{name:'새 이름'}};
  assert.equal((await request('member1','admin/person-page','PATCH',change,'https://foreign.invalid')).statusCode,403);
  assert.equal((await request('member1','admin/person-page','PATCH',{...change,section:'prescriptions'})).statusCode,403);
  assert.equal((await request('member1','admin/person-page','PATCH',change)).statusCode,200);
  assert.equal((await request('member1','admin/person-page','PATCH',change)).statusCode,409);
  r=await request('admin','admin/person-page?personId=assembly-001&history=1');assert.equal(r.body.history.length,1);assert.equal(r.body.history[0].actor,'member1');
  const restore={personId:'assembly-001',operation:'restore',historyId:r.body.history[0].id,revision:1};
  assert.equal((await request('member1','admin/person-page','PATCH',restore)).statusCode,403);
  assert.equal((await request('admin','admin/person-page','PATCH',restore)).statusCode,200);
  assert.equal((await request('admin','admin/person-page?personId=assembly-001')).body.sections[0].fields.find(f=>f.path==='name').value,'기존 이름');
  assert.equal((await request('member1','admin/person-edit-permissions','PATCH',{id:'member1',scope:'all'})).statusCode,403);
  assert.equal((await request('admin','admin/person-edit-permissions','PATCH',{id:'member1',scope:'off'})).statusCode,200);
  assert.equal((await request('member1','admin/person-page','PATCH',{...change,revision:2})).statusCode,403);
  assert.equal((await request('member1','admin/person-page?personId=assembly-001')).statusCode,403);
 }finally{globalThis.fetch=oldFetch;for(const[k,v]of saved)v===undefined?delete process.env[k]:process.env[k]=v;}
});
test('delegated ordinary member sees inline report editor without a paid pass, but never owner history',async()=>{
 const report={accessTier:'admin',canEditPage:true,diagnoses:[{id:'01',title:'브랜드',score:50,display:{}}],stInterpretation:'분석',news:[]},service={get:async()=>({ok:true,item:{id:'assembly-001',name:'인물',type:'assembly'},intelligence:report})};
 const html=await renderPoliticianDetail('assembly-001',service,{authenticated:true,user:member});
 assert.match(html,/data-person-editor="assembly-001"/);assert.match(html,/data-inline-path/);assert.doesNotMatch(html,/data-page-history|data-paid-analysis/);
 const form=renderPersonEditPermission({...member,personPageEditing:{scope:'selected',people:[{id:'assembly-001',name:'<인물>'}]}});assert.match(form,/&lt;인물&gt;/);assert.match(form,/지정한 정치인만/);
});
