import test from 'node:test';
import assert from 'node:assert/strict';
const model=await import('../src/core/group-model.js').catch(()=>({}));
const owner={id:'owner',nickname:'운영자'},alice={id:'alice',nickname:'회원'},bob={id:'bob',nickname:'방문자'},admin={id:'admin',nickname:'관리자',role:'admin'};
const now='2026-09-15T09:00:00.000Z';let seq=0;
const options={now,idFor:()=>`item-${++seq}`,inviteToken:'secret-invite'};
const input={name:'우리 모임',category:'politics',description:'정책을 함께 읽습니다.',rules:'서로 존중합니다.',visibility:'members',privacyAccepted:true};
const create=()=>model.createGroup(input,{id:'group-one',user:owner,now,inviteToken:'invite-original'});
const mutate=(g,u,operation,input={})=>model.mutateGroup(g,u,{...options,operation,input});
const approved=()=>mutate(create(),admin,'review',{decision:'approve'});
const joined=()=>mutate(mutate(approved(),alice,'join',{privacyAccepted:true}),owner,'member',{userId:'alice',decision:'approve'});

test('creation enters pending review without global role elevation',()=>{assert.equal(typeof model.createGroup,'function');const g=create();assert.equal(g.status,'pending');assert.equal(model.groupViewer(g,owner).role,'applicant');assert.equal(owner.role,undefined);assert.throws(()=>model.groupDetail(g,bob),/GROUP_NOT_FOUND/);});
test('only site admin approves group creation and activates the owner',()=>{const g=create();assert.throws(()=>mutate(g,owner,'review',{decision:'approve'}),/GROUP_FORBIDDEN/);assert.equal(model.groupViewer(approved(),owner).role,'owner');});
test('membership requires consent and explicit approval before reading/writing',()=>{let g=approved();assert.throws(()=>mutate(g,alice,'join'),/GROUP_INPUT_INVALID/);g=mutate(g,alice,'join',{privacyAccepted:true});assert.equal(model.groupViewer(g,alice).canRead,false);assert.throws(()=>mutate(g,alice,'post',{title:'무단 글',body:'본문'}),/GROUP_MEMBERS_ONLY/);g=mutate(g,owner,'member',{userId:'alice',decision:'approve'});assert.equal(model.groupViewer(g,alice).canWrite,true);});
test('members-only projection omits content, events, member identifiers and secrets',()=>{let g=mutate(joined(),alice,'post',{title:'회원 비밀 제목',body:'회원 비밀 본문'});g=mutate(g,owner,'event',{title:'내부 일정',startsAt:'2026-10-01T10:00:00+09:00',place:'비밀 장소'});const serialized=JSON.stringify(model.groupDetail(g,bob));assert.doesNotMatch(serialized,/회원 비밀|비밀 장소|invite-original|"members"\s*:\s*\[/);assert.equal(model.groupDetail(g,alice).posts.length,1);});
test('public reading does not permit writing or disclose membership lists',()=>{let g=mutate(joined(),owner,'settings',{...input,visibility:'public'});g=mutate(g,alice,'post',{title:'공개 제목',body:'공개 본문'});const view=model.groupDetail(g,null);assert.equal(view.posts.length,1);assert.equal(view.viewer.canWrite,false);assert.equal(view.members,undefined);assert.equal(view.inviteUrl,undefined);});
test('membership and moderator powers are local to one group',()=>{const g=joined(),other={...approved(),id:'group-two',ownerId:'bob',members:[{userId:'bob',nickname:'다른 모임장',status:'active',role:'owner'}]};assert.equal(model.groupViewer(g,owner).canManage,true);assert.equal(model.groupViewer(other,owner).canManage,false);assert.throws(()=>mutate(other,owner,'member',{userId:'alice',decision:'approve'}),/GROUP_FORBIDDEN/);});
test('group owner cannot rewrite member opinions, but can hide with reason and audit',()=>{let g=mutate(joined(),alice,'post',{title:'내 의견',body:'작성자 본문'});const p=g.posts[0];assert.throws(()=>mutate(g,owner,'post',{postId:p.id,title:'바꾼 의견',body:'왜곡'}),/GROUP_FORBIDDEN/);assert.throws(()=>mutate(g,owner,'post-hide',{postId:p.id,hidden:true}),/GROUP_INPUT_INVALID/);g=mutate(g,owner,'post-hide',{postId:p.id,hidden:true,reason:'운영규칙 위반'});assert.equal(model.groupDetail(g,alice).posts.length,0);assert.equal(model.groupDetail(g,owner).posts[0].hidden,true);assert.ok(g.audit.some(a=>a.action==='post-hide'));});
test('ordinary members cannot publish notices, appoint moderators or remove owners',()=>{const g=joined();for(const [op,data] of [['post',{title:'공지',body:'내용',kind:'notice'}],['member',{userId:'alice',decision:'promote'}],['member',{userId:'owner',decision:'remove'}]])assert.throws(()=>mutate(g,alice,op,data),/GROUP_FORBIDDEN/);});
test('moderators cannot edit membership of owners or peer moderators',()=>{let g=mutate(joined(),owner,'member',{userId:'alice',decision:'promote'});assert.throws(()=>mutate(g,alice,'member',{userId:'owner',decision:'remove'}),/GROUP_FORBIDDEN/);assert.throws(()=>mutate(g,alice,'member',{userId:'alice',decision:'demote'}),/GROUP_FORBIDDEN/);});
test('leaving immediately revokes private reads, posting and RSVP counts',()=>{let g=mutate(joined(),owner,'event',{title:'정기모임',startsAt:'2026-10-01T10:00:00+09:00',place:'모임방'});g=mutate(g,alice,'rsvp',{eventId:g.events[0].id,response:'yes'});assert.equal(model.groupDetail(g,owner).events[0].yesCount,1);g=mutate(g,alice,'leave');assert.equal(model.groupViewer(g,alice).canRead,false);assert.equal(model.groupDetail(g,owner).events[0].yesCount,0);assert.throws(()=>mutate(g,alice,'comment',{postId:'x',body:'댓글'}),/GROUP_MEMBERS_ONLY/);});
test('owner must transfer ownership before leaving',()=>{let g=joined();assert.throws(()=>mutate(g,owner,'leave'),/GROUP_OWNER_TRANSFER_REQUIRED/);g=mutate(g,owner,'transfer',{userId:'alice'});g=mutate(g,owner,'leave');assert.equal(g.ownerId,'alice');assert.equal(model.groupViewer(g,alice).role,'owner');});
test('invite-only group is invisible without membership or current invitation',()=>{const g=mutate(approved(),owner,'settings',{...input,visibility:'invite'});assert.throws(()=>model.groupDetail(g,bob),/GROUP_NOT_FOUND/);assert.equal(model.groupDetail(g,bob,{invite:'invite-original'}).viewer.canRead,false);assert.throws(()=>model.mutateGroup(g,bob,{...options,operation:'join',input:{privacyAccepted:true},invite:'wrong'}),/GROUP_INVITE_INVALID/);const next=mutate(g,owner,'invite-reset');assert.throws(()=>model.groupDetail(next,bob,{invite:'invite-original'}),/GROUP_NOT_FOUND/);});
test('sample data is read-only even for a site administrator',()=>{const g={...joined(),isExample:true};assert.equal(model.groupViewer(g,admin).canWrite,false);assert.throws(()=>mutate(g,admin,'settings',input),/GROUP_EXAMPLE_READ_ONLY/);});
test('renaming an approved group requires admin review again',()=>{const g=mutate(approved(),owner,'settings',{...input,name:'변경된 모임'});assert.equal(g.status,'pending');assert.throws(()=>model.groupDetail(g,bob),/GROUP_NOT_FOUND/);});
test('foreign or unregistered media cannot be attached to a post',()=>{const g=joined();assert.throws(()=>mutate(g,alice,'post',{title:'사진',kind:'gallery',imageIds:['other-group-asset']}),/GROUP_IMAGE_INVALID/);});
test('moderation deletions clear body and images while retaining reason in audit',()=>{let g=mutate(joined(),alice,'post',{title:'삭제할 글',body:'원문'});g=mutate(g,owner,'post-delete',{postId:g.posts[0].id,reason:'규칙 위반'});assert.equal(g.posts[0].body,'');assert.equal(model.groupDetail(g,alice).posts.length,0);assert.ok(g.audit.some(a=>a.reason==='규칙 위반'));});
test('closed groups remain readable to members but cannot accept new activity',()=>{const g=mutate(joined(),owner,'close',{reason:'활동 종료'});assert.equal(model.groupViewer(g,alice).canRead,true);assert.equal(model.groupViewer(g,alice).canWrite,false);assert.throws(()=>mutate(g,alice,'post',{title:'새 글',body:'본문'}),/GROUP_REVIEW_REQUIRED/);});

test('closing cannot publish an unapproved application and closed membership is immutable',()=>{
 const pending=create();assert.throws(()=>mutate(pending,owner,'close',{reason:'종료'}),/GROUP_REVIEW_REQUIRED/);
 const closed=mutate(approved(),owner,'close',{reason:'운영 종료'});
 assert.throws(()=>mutate(closed,owner,'member',{userId:'someone',decision:'approve'}),/GROUP_REVIEW_REQUIRED/);
});
test('hidden and deleted gallery media follow post visibility, including its original author',()=>{
 let g=joined();g.assets.push({id:'asset-one',purpose:'gallery',createdBy:alice.id});
 g=mutate(g,alice,'post',{kind:'gallery',title:'사진',body:'',imageIds:['asset-one']});const id=g.posts[0].id;
 assert.equal(model.canReadGroupImage(g,alice,g.assets[0]),true);
 g=mutate(g,owner,'post-hide',{postId:id,hidden:true,reason:'운영규칙 검토'});
 assert.equal(model.canReadGroupImage(g,alice,g.assets[0]),false);assert.equal(model.canReadGroupImage(g,owner,g.assets[0]),true);
 g=mutate(g,owner,'post-delete',{postId:id,reason:'삭제 결정'});
 assert.equal(model.canReadGroupImage(g,owner,g.assets[0]),false);assert.equal(model.canReadGroupImage(g,alice,g.assets[0]),false);
});
test('rename reapproval limits pending detail to owner and site administrator',()=>{
 const g=mutate(joined(),owner,'settings',{name:'바뀐 모임'});
 assert.throws(()=>model.groupDetail(g,alice),/GROUP_NOT_FOUND/);
 assert.equal(model.groupDetail(g,owner).status,'pending');assert.equal(model.groupDetail(g,admin).status,'pending');
});

test('event optional end time is validated, projected, preserved for old clients and can be cleared',()=>{
 let g=mutate(joined(),owner,'event',{title:'일정',startsAt:'2026-10-01T10:00:00+09:00',endsAt:'2026-10-01T12:00:00+09:00'});
 const id=g.events[0].id;
 assert.equal(model.groupDetail(g,owner).events[0].endsAt,'2026-10-01T03:00:00.000Z');
 const edit={eventId:id,title:'수정',startsAt:'2026-10-01T11:00:00+09:00'};
 g=mutate(g,owner,'event',edit);
 assert.equal(g.events[0].endsAt,'2026-10-01T03:00:00.000Z');
 assert.throws(()=>mutate(g,owner,'event',{...edit,endsAt:'2026-10-01T10:00:00+09:00'}),/GROUP_INPUT_INVALID/);
 assert.throws(()=>mutate(g,owner,'event',{...edit,endsAt:'invalid'}),/GROUP_INPUT_INVALID/);
 assert.throws(()=>mutate(g,alice,'event',{...edit,endsAt:''}),/GROUP_FORBIDDEN/);
 g=mutate(g,owner,'event',{...edit,endsAt:''});
 assert.equal(model.groupDetail(g,owner).events[0].endsAt,'');
 assert.equal(model.groupDetail(g,bob).events.length,0);
});
