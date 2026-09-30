import test from 'node:test';
import assert from 'node:assert/strict';
import * as permissions from '../src/core/membership.js';
import {accessTierForUser} from '../lib/intelligence-access.js';
import {updateUserRole,updateUserByAdmin,updateProfile,resetUserPassword,publicUser,USERS_CAS_LUA} from '../lib/rebuild-store.js';
import {renderBoardWrite,renderAdminStable} from '../src/views/stage1.js';
import {renderPoliticianDetail} from '../src/views/politicians.js';
import {createCommunityService,COMMUNITY_CAS_LUA} from '../lib/community-service.js';
import {isAdmin as isPanelAdministrator} from '../src/core/ai-panel-model.js';
import handler from '../api/gateway.js';
import {issueSessionToken} from '../lib/session.js';
import {TARGET_KEYS} from '../lib/migration-service.js';

const member={id:'member',role:'member',status:'active'};
const platinum={id:'platinum',role:'platinum',status:'active'};
const admin={id:'staff',role:'admin',membershipTier:'admin',status:'active'};
const owner={id:'admin',role:'admin',status:'active'};
function memory(){
 const map=new Map([[TARGET_KEYS.users,JSON.stringify({member,platinum,staff:admin,admin:owner})]]);
 return {map,command:async args=>{const [op,key]=args;if(op==='GET')return map.get(key)||null;if(op==='EVAL'&&key===USERS_CAS_LUA){const storage=args[3];if((map.get(storage)||'')!==args[4])return 0;map.set(storage,args[5]);return 1;}throw Error(op);}};
}
test('four grades separate editorial, analysis and console permissions',()=>{
 for(const [user,tier,editor,analysis,consoleAccess] of [[member,'member',false,false,false],[platinum,'platinum',true,true,false],[admin,'admin',true,true,false],[owner,'superadmin',true,true,true]]){
  assert.equal(permissions.membershipTier(user),tier);
  assert.equal(permissions.canWriteEditorial(user),editor);
  assert.equal(permissions.canViewAdminAnalysis(user),analysis);
  assert.equal(permissions.isSuperAdmin(user),consoleAccess);
  assert.equal(accessTierForUser(user),analysis?'admin':'member');
 }
});
test('legacy admin retains ownership; forged tier on a member grants nothing',()=>{
  assert.equal(publicUser(owner).membershipTier,'superadmin');
 assert.equal(permissions.membershipTier({id:'another-admin',role:'admin'}),'admin');
 assert.equal(permissions.isSuperAdmin({...member,membershipTier:'superadmin'}),false);
 assert.equal(permissions.isSuperAdmin({...owner,status:'suspended'}),false);
 assert.equal(permissions.canViewAdminAnalysis({...platinum,status:'suspended'}),false);
});
test('staff keeps inline operations but cannot call console or account management endpoints',()=>{
 for(const route of ['admin/users','admin/summary','admin/footer-info','admin/audit','admin/intelligence/publish/start'])assert.equal(permissions.canAccessAdminEndpoint(admin,route),false,route);
 for(const route of ['admin/home-cage','admin/participation','admin/home-banner','admin/home-compare','admin/politicians/photo'])assert.equal(permissions.canAccessAdminEndpoint(admin,route),true,route);
 assert.equal(permissions.canAccessAdminEndpoint(platinum,'admin/politicians/photo'),false);
 assert.equal(permissions.canAccessAdminEndpoint(owner,'admin/users'),true);
});
test('highest administrator assigns all four grades and invalidates changed sessions',async()=>{
 const db=memory();
 for(const tier of ['platinum','admin','superadmin','member']){
  const result=await updateUserRole(db.command,'member',tier,'admin');
  assert.equal(result.ok,true);
  assert.equal(result.user.membershipTier,tier);
 }
 assert.equal(JSON.parse(db.map.get(TARGET_KEYS.users)).member.sessionVersion,4);
});
test('staff cannot promote themselves through either membership update path',async()=>{
 const db=memory();
 assert.equal((await updateUserRole(db.command,'staff','superadmin','staff')).ok,false);
 assert.equal((await updateUserByAdmin(db.command,{id:'staff',role:'superadmin'},'staff')).ok,false);
 assert.equal((await resetUserPassword(db.command,{id:'admin',temporaryPassword:'new-password-354'},'staff')).error,'SUPERADMIN_REQUIRED');
 const updated=await updateProfile(db.command,'staff',{role:'admin',membershipTier:'superadmin'});
 assert.equal(updated.user.membershipTier,'admin');
});

test('console page and survey management reject staff; editorial form allows platinum',async()=>{
 const session=user=>({authenticated:true,user});
 for(const user of [member,platinum,admin]){
  const html=await renderAdminStable(session(user),new Proxy({},{get(){throw Error('unauthorized admin data read');}}));
  assert.match(html,/최고관리자/);
  assert.equal(isPanelAdministrator(user),false);
 }
 assert.equal(isPanelAdministrator(owner),true);
 for(const domain of ['columns','news']){
  assert.doesNotMatch(renderBoardWrite(domain,session(member)),/data-stage-form/);
  assert.match(renderBoardWrite(domain,session(platinum)),/data-stage-form/);
 }
});

test('platinum permanent report shows all ten diagnoses without timers or photo editing',async()=>{
 const result={ok:true,item:{id:'p1',name:'테스트 정치인',type:'assembly',party:'무소속'},accessTier:'admin',intelligence:{accessTier:'admin',diagnoses:Array.from({length:10},(_,i)=>({id:String(i+1).padStart(2,'0'),title:`진단 ${i+1}`,headline:'분석',score:50,display:{kind:'summary',items:[]}})),prescriptions:[{id:'01',title:'비공개 처방',strategicJudgment:'PRIVATE_RX'}]}};
 const html=await renderPoliticianDetail('p1',{get:async()=>result},{authenticated:true,user:platinum},{},result);
 assert.match(html,/data-diagnostic-topic="10"/);
 assert.doesNotMatch(html,/data-paid-analysis|data-analysis-access|data-politician-photo-form|data-prescription-payload|data-prescription-disclosure|PRIVATE_RX/);
});

test('editorial service allows platinum own posts but not changing other authors',async()=>{
 const map=new Map();
 const command=async args=>{
  if(args[0]==='GET')return map.get(args[1])||null;
  if(args[0]==='EVAL'&&args[1]===COMMUNITY_CAS_LUA){const n=Number(args[2]),keys=args.slice(3,3+n),old=args.slice(3+n,3+2*n),next=args.slice(3+2*n);if(keys.some((key,i)=>(map.get(key)||'')!==old[i]))return 0;keys.forEach((key,i)=>map.set(key,next[i]));return 1;}
  throw Error(args[0]);
 };
 let clock=Date.now();const service=createCommunityService({command,now:()=>new Date(clock+=60000).toISOString()});
 for(const domain of ['news','columns']){
  await assert.rejects(service.createPost(domain,{title:'일반 회원',body:'내용'},member),/EDITOR_WRITE_FORBIDDEN/);
  const post=await service.createPost(domain,{title:'새 글',body:'본문'},platinum);
  assert.equal(post.ownerId,platinum.id);
  const other=await service.createPost(domain,{title:'다른 글',body:'본문'},owner);
  assert.equal((await service.editPost(domain,post.id,{title:'수정'},platinum)).title,'수정');
  await assert.rejects(service.editPost(domain,other.id,{title:'무단 수정'},platinum),/FORBIDDEN/);
 }
});
test('owner cannot remove their own highest access, and role omission preserves it',async()=>{
 const db=memory();
 assert.equal((await updateUserRole(db.command,'admin','admin','admin')).ok,false);
 assert.equal((await updateUserByAdmin(db.command,{id:'admin',role:'admin'},'admin')).ok,false);
 const result=await updateUserByAdmin(db.command,{id:'admin',nickname:'최고관리자'},'admin');
 assert.equal(result.ok,true);
 assert.equal(result.user.membershipTier,'superadmin');
});

test('real gateway rejects staff and platinum console requests despite forged request roles',async()=>{
 const db=memory(),secret='membership354-test-session-secret';
 const envKeys=['JCS_REBUILD_SESSION_SECRET','JCS_REBUILD_REDIS_REST_URL','JCS_REBUILD_REDIS_REST_TOKEN','JCS_REBUILD_REDIS_REDIS_URL','JCS_REBUILD_REDIS_URL'];
 const saved=new Map(envKeys.map(key=>[key,process.env[key]])),oldFetch=globalThis.fetch;
 Object.assign(process.env,{JCS_REBUILD_SESSION_SECRET:secret,JCS_REBUILD_REDIS_REST_URL:'https://membership354.invalid',JCS_REBUILD_REDIS_REST_TOKEN:'test'});
 delete process.env.JCS_REBUILD_REDIS_REDIS_URL;delete process.env.JCS_REBUILD_REDIS_URL;
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://membership354.invalid');return {ok:true,status:200,json:async()=>({result:await db.command(JSON.parse(options.body))})};};
 try{
  for(const actor of ['staff','platinum','member'])for(const [route,method] of [['admin/users','GET'],['admin/users','PATCH'],['admin/intelligence/publish/start','POST'],['admin/summary','GET']]){
   const res={setHeader(){},end(body){this.body=JSON.parse(body);}};
   await handler({url:'/api/v3/'+route+'?role=superadmin',method,headers:{host:'membership354.invalid',cookie:'jcsr2_session='+issueSessionToken(actor,secret)},body:{id:actor,role:'superadmin'}},res);
   assert.equal(res.statusCode,403,actor+' '+route);assert.equal(res.body.error,'SUPERADMIN_REQUIRED');
  }
 }finally{globalThis.fetch=oldFetch;for(const [key,value] of saved)value===undefined?delete process.env[key]:process.env[key]=value;}
});
