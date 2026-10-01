import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityService} from '../lib/community-service.js';
import {applyDisplayAuthor,validateDisplayAuthor} from '../lib/post-author.js';
import {sharedWrite,postMenu,authorIdentity} from '../src/views/community-ui.js';
import {createPointService} from '../lib/participation-admin.js';
import {fixture,now} from './helpers/person-refresh-fixture.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {attachRepresentativeBadges} from '../api/gateway.js';
const owner={id:'admin',role:'admin',nickname:'원래 이름'},staff={id:'staff',role:'admin',nickname:'회원관리자'};
const session=user=>({authenticated:true,user});
function service(){const db=new Map();return createCommunityService({command:async a=>{
 if(a[0]==='GET')return db.get(a[1])||null;
 if(a[0]==='EVAL'){const n=Number(a[2]),keys=a.slice(3,3+n),old=a.slice(3+n,3+2*n),next=a.slice(3+2*n);if(keys.some((k,i)=>(db.get(k)||'')!==old[i]))return 0;keys.forEach((k,i)=>db.set(k,next[i]));return 1;}
 throw Error(a[0]);
}});}
test('per-post byline across boards retains owner, can be edited and reset',async()=>{
 const s=service();
 for(const domain of ['community','news','columns','itsme']){
  const p=await s.createPost(domain,{title:'제목',body:'내용',displayAuthor:'  별도의 이름  ',ownerId:'fake',author:'fake'},owner);
  assert.equal(p.author,'별도의 이름');assert.equal(p.ownerId,'admin');assert.equal(owner.nickname,'원래 이름');
  const kept=await s.editPost(domain,p.id,{body:'수정'},staff);assert.equal(kept.author,'별도의 이름');
  await assert.rejects(s.editPost(domain,p.id,{displayAuthor:'위조'},staff),/DISPLAY_AUTHOR_FORBIDDEN/);
  assert.equal((await s.editPost(domain,p.id,{displayAuthor:'다른 필명'},owner)).author,'다른 필명');
  const reset=await s.editPost(domain,p.id,{displayAuthor:''},owner);assert.equal(reset.author,'원래 이름');assert.equal(reset.authorAlias,'');
 }
});
test('forged nickname field rejected for staff, platinum, members and suspended owner',async()=>{
 for(const user of [staff,{id:'p',role:'platinum'},{id:'m',role:'member',membershipTier:'superadmin'},{...owner,status:'suspended'}])
  await assert.rejects(service().createPost('community',{title:'제목',displayAuthor:'이름'},user),/DISPLAY_AUTHOR_FORBIDDEN|ACCOUNT_SUSPENDED/);
 assert.throws(()=>validateDisplayAuthor({displayAuthor:'a'.repeat(41)},owner),/DISPLAY_AUTHOR_INVALID/);
 assert.throws(()=>validateDisplayAuthor({displayAuthor:'a\nb'},owner),/DISPLAY_AUTHOR_INVALID/);
 assert.throws(()=>applyDisplayAuthor({ownerId:'someone'}, {displayAuthor:'이름'},owner),/DISPLAY_AUTHOR_OWNER_REQUIRED/);
});
test('cage root and reply use the same byline and ownership rules',async()=>{
 const s=service(),root=await s.createPost('community',{title:'케이지',pinKind:'cage',displayAuthor:'진행자'},owner);
 const reply=await s.createPost('community',{title:'의견',cageParentId:root.id,camp:'progressive',displayAuthor:'기고자'},owner);
 assert.equal(reply.author,'기고자');assert.equal(reply.cageParentId,root.id);assert.equal(reply.ownerId,'admin');
});
test('only owner sees byline controls; escaping and alias badge suppression',()=>{
 for(const domain of ['community','news','columns','itsme']){
  assert.match(sharedWrite(domain,session(owner)),/name="displayAuthor"/);
  assert.doesNotMatch(sharedWrite(domain,session(staff)),/name="displayAuthor"/);
 }
 const item={id:'p',ownerId:'admin',author:'<별명>',authorAlias:'<별명>',representativeBadge:'admin'};
 assert.match(postMenu('community',item,session(owner)),/value="&lt;별명&gt;"/);
 assert.doesNotMatch(postMenu('community',item,session(staff)),/name="displayAuthor"/);
 assert.doesNotMatch(postMenu('community',{...item,ownerId:'other'},session(owner)),/name="displayAuthor"/);
 assert.match(authorIdentity(item),/&lt;별명&gt;/);assert.doesNotMatch(authorIdentity(item),/author-representative-badge/);
});
test('cage discussion comments allow byline only for highest administrator',async()=>{
 const s=service(),p=await s.createPost('community',{title:'케이지',pinKind:'cage'},owner);
 const c=await s.addComment('community',p.id,{text:'의견',camp:'conservative',displayAuthor:'기고자'},owner);
 assert.equal(c.author,'기고자');assert.equal(c.ownerId,'admin');
 await assert.rejects(s.addComment('community',p.id,{text:'의견',camp:'conservative',displayAuthor:'위조'},staff),/DISPLAY_AUTHOR_FORBIDDEN/);
 assert.equal((await s.editComment('community',p.id,c.id,'수정',owner,{displayAuthor:'새 이름'})).author,'새 이름');
 await assert.rejects(s.editComment('community',p.id,c.id,'수정',staff,{displayAuthor:'위조'}),/DISPLAY_AUTHOR_FORBIDDEN/);
});
test('paid cage creation stores byline without changing wallet rules; badges suppressed',async()=>{
 const f=await fixture(),points=createPointService({command:f.db.command,clock:now});
 f.db.values.set('jcs:points:v1:wallet:admin',JSON.stringify({balance:100000}));
 const result=await points.cage(owner,{fee:50000,title:'케이지',body:'정책 토론',displayAuthor:'진행자',requestId:'author-cage-382001'});
 const item=JSON.parse(f.db.values.get(TARGET_KEYS.content('community'))).items.find(p=>p.id===result.id);
 assert.equal(item.author,'진행자');assert.equal(item.ownerId,'admin');
 assert.equal(JSON.parse(f.db.values.get('jcs:points:v1:wallet:admin')).balance,50000);
 await assert.rejects(points.cage(staff,{displayAuthor:'위조'}),/DISPLAY_AUTHOR_FORBIDDEN/);
 const decorated=await attachRepresentativeBadges(f.db.command,{items:[{...item,representativeBadge:'admin'}]});
 assert.equal(decorated.items[0].representativeBadge,'');
});
