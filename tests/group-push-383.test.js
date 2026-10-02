import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroupPushService,GP,groupPushUsage} from '../lib/group-push-service.js';
import {renderGroupPush} from '../src/views/group-push.js';
import {groupMutationFromForm} from '../src/ui/group-interactions.js';
import {cageDetail} from '../src/views/community-ui.js';
function fixture(){
 const values=new Map(),hashes=new Map(),sets=new Map(),sent=[],queued=[];let at=Date.parse('2026-10-01T01:00:00Z'),failToken='';
 const user={id:'owner',role:'member',status:'active'},admin={id:'admin',role:'admin',status:'active'};
 const g={id:'g1',name:'동네 모임',status:'approved',ownerId:'owner',members:[{userId:'owner',status:'active',notify:false},{userId:'one',status:'active',notify:true},{userId:'two',status:'active',notify:true},{userId:'off',status:'active',notify:false},{userId:'pending',status:'pending',notify:true}]};
 const groupKey='jcsr2:groups:v1:item:g1',saveGroup=()=>values.set(groupKey,JSON.stringify(g));saveGroup();
 const command=async([op,key,...a])=>{
  if(op==='GET')return values.get(key)||null;
  if(op==='SET'){if(a.includes('NX')&&values.has(key))return null;values.set(key,a[0]);return 'OK';}
  if(op==='DEL'){values.delete(key);hashes.delete(key);return 1;}
  if(op==='EXPIRE')return 1;
  if(op==='HSET'){if(!hashes.has(key))hashes.set(key,{});hashes.get(key)[a[0]]=a[1];return 1;}
  if(op==='HGET')return hashes.get(key)?.[a[0]]||null;
  if(op==='HVALS')return Object.values(hashes.get(key)||{});
  if(op==='HGETALL')return Object.entries(hashes.get(key)||{}).flat();
  if(op==='HDEL'){if(hashes.has(key))delete hashes.get(key)[a[0]];return 1;}
  if(op==='SMEMBERS')return [...(sets.get(key)||[])];
  if(op==='SREM'){sets.get(key)?.delete(a[0]);return 1;}
  if(op==='EVAL'){
   if(key.includes('GROUP_PUSH_COMMIT_V1')){const [n,gkey,skey,jkey,pkey,oldg,olds,state,job,id]=a;if((values.get(gkey)||'')!==oldg||(values.get(skey)||'')!==olds)return 0;values.set(skey,state);if(job){values.set(jkey,job);if(!sets.has(pkey))sets.set(pkey,new Set());sets.get(pkey).add(id);}return 1;}
   const [,lock,nonce]=a;if(values.get(lock)===nonce)values.delete(lock);return 1;
  }throw Error(op);
 };
 const service=createGroupPushService({command,now:()=>at,getUser:async id=>({id,role:'member',status:'active'}),send:async(token,p)=>{if(token===failToken)throw Error('network');sent.push({token,p});},enqueue:async id=>queued.push(id)});
 const post=(requestId='request-383-1')=>service.save('g1',user,{title:'공지 <제목>',body:'내용입니다.',requestId});
 return {service,user,admin,values,hashes,sets,sent,queued,g,saveGroup,post,advance:ms=>at+=ms,fail:t=>failToken=t};
}
const token=x=>x.repeat(100);
test('only group owner or highest admin can send, policy limited to highest admin',async()=>{
 const f=fixture();for(const u of [{id:'one',role:'member'},{id:'staff',role:'admin'},{id:'off',role:'member'},null])await assert.rejects(f.service.save('g1',u,{title:'a',body:'b',requestId:'request-383'}),/GROUP_FORBIDDEN|LOGIN_REQUIRED/);
 await assert.rejects(f.service.save('g1',f.user,{daily:3,monthly:30,disabled:false},'policy'),/GROUP_FORBIDDEN/);
 await f.service.save('g1',f.admin,{daily:3,monthly:30,disabled:false},'policy');assert.equal((await f.service.status('g1',f.user)).usage.daily,3);
});
test('atomic duplicate submission uses one quota and concurrent sends cannot bypass cooldown',async()=>{
 const f=fixture(),r=await Promise.all([f.post(),f.post()]);assert.equal(r[0].id,r[1].id);assert.equal((await f.service.status('g1',f.user)).usage.today,1);
 await assert.rejects(f.post('second'),/GROUP_PUSH_INTERVAL/);f.advance(1800000);
 const out=await Promise.allSettled([f.post('second'),f.post('third')]);assert.equal(out.filter(r=>r.status==='fulfilled').length,1);
 f.advance(1800000);await assert.rejects(f.post('fourth'),/GROUP_PUSH_LIMIT/);
});
test('Korean day and calendar month limits reset without dropping cooldown',()=>{
 const at=Date.parse('2026-10-31T14:59:00Z'),s={history:[{at}],policy:{daily:2,monthly:20}};
 assert.equal(groupPushUsage(s,at).today,1);assert.equal(groupPushUsage(s,at+120000).today,0);assert.equal(groupPushUsage(s,at+120000).month,0);assert.ok(groupPushUsage(s,at+120000).nextAt>at+120000);
});
test('only active opted-in members with registered devices get messages; web notices remain',async()=>{
 const f=fixture();await f.service.register({id:'one'},{token:token('a'),enabled:true});await f.service.register({id:'off'},{token:token('b'),enabled:true});
 const r=await f.post();await f.service.deliver(r.id);await f.service.deliver(r.id);
 assert.equal(f.sent.length,1);assert.equal(f.sent[0].p.path,'/groups/g1?tab=notifications');
 const status=await f.service.status('g1',f.user);assert.deepEqual(status.messages[0].delivery,{status:'complete',eligible:2,accepted:1,noDevice:1,skipped:0,failed:0});
 const member=await f.service.status('g1',{id:'off'});assert.equal(member.messages.length,1);assert.equal(member.canSend,false);assert.equal(member.messages[0].delivery,undefined);
 assert.equal(await f.service.status('g1',{id:'pending'}),null);assert.equal(await f.service.status('g1',null),null);
});
test('web subscriptions receive visible group content through the same membership checks',async()=>{
 const f=fixture(),key='web-browser';f.hashes.set(GP.devices('one'),{[key]:JSON.stringify({kind:'web',subscription:{endpoint:'https://fcm.googleapis.com/send/test'},at:1})});f.values.set(GP.binding(key),'one');
 const r=await f.post();await f.service.deliver(r.id);assert.equal(f.sent.length,1);assert.equal(f.sent[0].token.kind,'web');assert.equal(f.sent[0].p.title,'동네 모임 · 공지 <제목>');assert.equal(f.sent[0].p.body,'내용입니다.');
});
test('leave and opt-out after queueing block delivery and native message fetch',async()=>{
 const f=fixture();await f.service.register({id:'one'},{token:token('a'),enabled:true});const r=await f.post();f.g.members.find(m=>m.userId==='one').status='left';f.g.members.find(m=>m.userId==='two').notify=false;f.saveGroup();await f.service.deliver(r.id);assert.equal(f.sent.length,0);
 await assert.rejects(f.service.message(r.id,{id:'one'}),/GROUP_FORBIDDEN/);
 await assert.rejects(f.service.message(r.id,{id:'pending'}),/GROUP_NOT_FOUND/);
});
test('retry preserves accepted devices; logout and device account switch stop old recipient',async()=>{
 const f=fixture();await f.service.register({id:'one'},{token:token('a'),enabled:true});await f.service.register({id:'two'},{token:token('b'),enabled:true});f.fail(token('b'));const r=await f.post();await assert.rejects(f.service.deliver(r.id),/network/);assert.equal(f.sent.length,1);f.fail('');await f.service.deliver(r.id);assert.equal(f.sent.length,2);
 f.advance(1800000);const next=await f.post('next');await f.service.revoke('one');await f.service.register({id:'outsider'},{token:token('b'),enabled:true});await f.service.deliver(next.id);assert.equal(f.sent.length,2);
});
test('disabled policy blocks queued dispatch and new requests, expired jobs terminate',async()=>{
 const f=fixture(),r=await f.post();await f.service.save('g1',f.admin,{daily:2,monthly:20,disabled:true},'policy');await f.service.deliver(r.id);assert.equal((await f.service.status('g1',f.user)).messages[0].delivery.status,'cancelled');await assert.rejects(f.post('new'),/GROUP_PUSH_DISABLED/);
 const second=fixture(),old=await second.post();second.advance(86400001);await second.service.deliver(old.id);assert.equal((await second.service.status('g1',second.user)).messages[0].delivery.status,'expired');
});
test('notice UI and form payload are bounded, escaped, and separate from normal membership',async()=>{
 const f=fixture();await f.post();const push=await f.service.status('g1',f.user),html=renderGroupPush({id:'g1',push});assert.match(html,/공지 &lt;제목&gt;/);assert.match(html,/name="requestId"/);assert.match(html,/등록 기기 없음/);
 const member=renderGroupPush({id:'g1',push:await f.service.status('g1',{id:'one'})});assert.doesNotMatch(member,/name="requestId"|name="daily"/);
 assert.deepEqual(groupMutationFromForm(new Map([['operation','push-send'],['title',' 공지 '],['body',' 내용 '],['requestId','r1']])),{operation:'push-send',input:{title:'공지',body:'내용',requestId:'r1'}});
});
test('highest administrator has byline field inside Cage opinion form, not just comment form',async()=>{
 const item={id:'cage',title:'케이지',body:'내용',cageEnabled:true},content={commentsFor:async()=>[],peekDomain:()=>({items:[item]})};
 const html=await cageDetail(item,content,{authenticated:true,user:{id:'admin',role:'admin'}},{},'/community/cage?camp=progressive&compose=1');
 const form=html.match(/<form data-stage-form="board"[\s\S]*?<\/form>/)[0];assert.match(form,/name="displayAuthor"/);assert.match(form,/의견 제목/);
 const staff=await cageDetail(item,content,{authenticated:true,user:{id:'staff',role:'admin'}});assert.doesNotMatch(staff.match(/<form data-stage-form="board"[\s\S]*?<\/form>/)[0],/name="displayAuthor"/);
});
test('channel-scoped logout revokes only that transport; explicit revoke still removes all',async()=>{
 const f=fixture();
 await f.service.register({id:'one'},{token:token('a'),enabled:true});
 await f.service.register({id:'one'},{token:token('b'),enabled:true});
 const key=GP.devices('one');f.hashes.get(key).web=JSON.stringify({kind:'web',subscription:{},at:1});
 await f.service.revoke('one',{kind:'web'});
 assert.equal(Object.keys(f.hashes.get(key)).length,2);
 f.hashes.get(key).web=JSON.stringify({kind:'web',subscription:{},at:1});
 await f.service.revoke('one',{kind:'native'});
 assert.deepEqual(Object.keys(f.hashes.get(key)),['web']);
 await f.service.revoke('one');assert.equal(f.hashes.has(key),false);
});
