import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { renderGroupDirectory, renderGroupDetail, renderGroupCreate } from '../src/views/group-pages.js';
import { loadGroupPage } from '../src/core/group-routing.js';
import { groupInputFromFormData, groupMutationFromForm, bindGroupInteractions } from '../src/ui/group-interactions.js';

const summary=(more={})=>({id:'g 1',name:'동네 <모임>',category:'social',description:'함께 & 안전하게',region:'서울',visibility:'public',status:'approved',memberCount:3,postCount:2,eventCount:1,ownerName:'가온',...more});
const detail=(viewer,more={})=>({...summary(),version:3,rules:'서로 존중',viewer:{role:'guest',membershipStatus:'none',canRead:false,canWrite:false,canManage:false,canEditSettings:false,canReview:false,notify:false,...viewer},posts:[],events:[],...more});

test('directory separates fictional examples and keeps them out of real totals',()=>{
  const html=renderGroupDirectory({ok:true,items:[summary()],examples:[summary({id:'example',name:'가상 문화 모임',isExample:true})],total:1,page:1,exampleCount:3},{});
  assert.match(html,/실제 모임 1개/); assert.match(html,/예시 모임/);
  assert.match(html,/href="\/groups\/g%201" data-layout-route="\/groups\/g%201"/);
  assert.doesNotMatch(html,/실제 모임 4개/); assert.match(html,/동네 &lt;모임&gt;/);
});

test('restricted detail renders intro and join but never private content',()=>{
  const html=renderGroupDetail(detail({}, {posts:[{id:'p',title:'비밀 <글>',body:'secret'}],events:[{id:'e',title:'비밀 행사'}]}));
  assert.match(html,/가입 신청/); assert.match(html,/서로 존중/);
  assert.doesNotMatch(html,/비밀|secret|data-group-post-form|멤버 관리|감사 기록/);
});

test('active member sees content and forms while management remains role scoped',()=>{
  const item=detail({role:'member',membershipStatus:'active',canRead:true,canWrite:true},{posts:[{id:'p',title:'안내 <script>',body:'본문 & 내용',kind:'post',authorName:'하람',images:[],comments:[],canEdit:true,canDelete:true}],events:[]});
  const html=renderGroupDetail(item,{},'posts');
  assert.match(html,/data-group-post-form/); assert.match(html,/안내 &lt;script&gt;/); assert.doesNotMatch(html,/<script>/);
  assert.doesNotMatch(html,/data-group-member-form|data-group-review-form|초대 링크 재설정/);
});

test('manager controls reflect server capabilities and examples are always read only',()=>{
  const item=detail({role:'owner',membershipStatus:'active',canRead:true,canWrite:true,canManage:true,canEditSettings:true,canReview:true},{members:[{userId:'u',nickname:'새봄',status:'pending',role:'member'}],reports:[],audit:[]});
  const members=renderGroupDetail(item,{},'members'),settings=renderGroupDetail(item,{},'settings');
  assert.match(members,/data-group-member-form/); assert.match(settings,/data-group-settings-form/); assert.match(members,/초대 링크 재설정/);
  const example=renderGroupDetail(detail({role:'admin',canRead:true,canWrite:true,canManage:true,canEditSettings:true},{isExample:true,posts:[{id:'p',title:'예시 글',body:'본문',kind:'post',images:[],comments:[]}]}));
  assert.match(example,/읽기 전용/); assert.doesNotMatch(example,/data-group-(post|member|settings|event|action)-form|name="operation"/);
  const lockedExample=renderGroupDetail(detail({canRead:false,canWrite:true},{isExample:true}));
  assert.doesNotMatch(lockedExample,/name="operation"|가입 신청/);
});

test('activity request keys include group and target identity',()=>{
 const viewer={role:'owner',userId:'member',membershipStatus:'active',canRead:true,canWrite:true,canManage:true};
 const first=renderGroupDetail(detail(viewer,{id:'group-one',posts:[{id:'post-a',title:'A',body:'A',kind:'post',authorName:'나',images:[],comments:[]},{id:'post-b',title:'B',body:'B',kind:'post',authorName:'나',images:[],comments:[]}]}));
 const second=renderGroupDetail(detail(viewer,{id:'group-two'}));
 assert.match(first,/data-activity-request-key="group:group-one:post:new"/);
 assert.match(first,/data-activity-request-key="group:group-one:comment:post-a"/);
 assert.match(first,/data-activity-request-key="group:group-one:comment:post-b"/);
 assert.match(second,/data-activity-request-key="group:group-two:post:new"/);
});

test('group kind changes suppress a notice reward promise and restore current policy for eligible kinds',()=>{
 const listeners={},hint={hidden:false,innerHTML:'현재 정책 100P'},images={dataset:{}},body={required:true},form={querySelector:selector=>selector==='[data-activity-hint]'?hint:selector==='[name=imageIds]'?images:selector==='[name=body]'?body:null},kind={value:'notice',closest:selector=>selector==='[name=kind]'?kind:selector==='form'?form:null},root={addEventListener:(name,handler)=>listeners[name]=handler};
 bindGroupInteractions(root,{client:{}});listeners.change({target:kind});assert.equal(hint.hidden,true);
 kind.value='gallery';listeners.change({target:kind});assert.equal(hint.hidden,false);assert.equal(hint.innerHTML,'현재 정책 100P');
 kind.value='post';listeners.change({target:kind});assert.equal(hint.hidden,false);
 assert.match(readFileSync(new URL('../css/activity-points-178.css',import.meta.url),'utf8'),/\.activity-hint\[hidden\]\s*\{[^}]*display\s*:\s*none/);
});

test('create form includes privacy consent and creates the exact payload',()=>{
  assert.match(renderGroupCreate({authenticated:true,user:{id:'u'}}),/name="privacyAccepted"[^>]*required/);
  const data=new FormData(); for(const [k,v] of Object.entries({name:'새 모임',category:'culture',description:'설명',region:'부산',rules:'존중',visibility:'members'}))data.set(k,v); data.set('privacyAccepted','on');
  assert.deepEqual(groupInputFromFormData(data,'create'),{name:'새 모임',category:'culture',description:'설명',region:'부산',rules:'존중',visibility:'members',privacyAccepted:true});
});

test('mutation extraction covers comment, RSVP and membership moderation payloads',()=>{
  const formData=entries=>{const d=new FormData();for(const [k,v] of entries)d.set(k,v);return d;};
  assert.deepEqual(groupMutationFromForm(formData([['operation','comment'],['postId','p'],['body','좋아요']])),{operation:'comment',input:{postId:'p',body:'좋아요'}});
  assert.deepEqual(groupMutationFromForm(formData([['operation','rsvp'],['eventId','e'],['response','yes']])),{operation:'rsvp',input:{eventId:'e',response:'yes'}});
  assert.deepEqual(groupMutationFromForm(formData([['operation','member'],['userId','u'],['decision','remove'],['reason','규칙 위반']])),{operation:'member',input:{userId:'u',decision:'remove',reason:'규칙 위반'}});
});

test('settings do not remove an existing cover unless removal is selected',()=>{
  const data=new FormData();for(const [k,v] of Object.entries({name:'모임',category:'social',description:'설명',region:'',rules:'',visibility:'public'}))data.set(k,v);
  assert.equal(Object.hasOwn(groupInputFromFormData(data,'settings'),'coverImageId'),false);
  data.set('removeCover','on'); assert.equal(groupInputFromFormData(data,'settings').coverImageId,'');
});

test('routing protects create and manage UI and forwards filters',async()=>{
  const calls=[]; const client={list:async o=>(calls.push(o),{ok:true,items:[],examples:[],total:0,page:2}),get:async()=>({ok:false,error:'GROUP_NOT_FOUND'})};
  assert.match(await loadGroupPage({parts:['groups','new'],session:{},client}),/로그인/);
  assert.match(await loadGroupPage({parts:['groups'],searchParams:new URLSearchParams('view=manage'),session:{},client}),/접근/);
  await loadGroupPage({parts:['groups'],searchParams:new URLSearchParams('view=mine&category=politics&q=test&page=2'),session:{authenticated:true,user:{id:'u'}},client});
  assert.deepEqual(calls,[{view:'mine',category:'politics',q:'test',page:'2'}]);
});

test('directory renders notifications and pagination preserving filters',()=>{
 const html=renderGroupDirectory({ok:true,items:[summary()],examples:[],total:21,page:2,hasMore:true,notifications:[{groupId:'g 1',groupName:'모임',title:'새 <공지>',createdAt:'2026-09-15'}]}, {authenticated:true,user:{id:'u'}},'mine','culture','함께');
 assert.match(html,/새 &lt;공지&gt;/);assert.match(html,/page=1/);assert.match(html,/page=3/);assert.match(html,/category=culture/);assert.match(html,/q=%ED%95%A8%EA%BB%98/);
});

test('detail exposes approved edit, transfer, close, resubmit, invite and scoped role controls',()=>{
 const owner=detail({role:'owner',membershipStatus:'active',canRead:true,canWrite:true,canManage:true,canEditSettings:true},{inviteUrl:'/groups/g?invite=token',members:[{userId:'m',nickname:'멤버',status:'active',role:'member'}],posts:[{id:'p',title:'글',body:'본문',kind:'post',authorId:'u',authorName:'나',images:[],comments:[{id:'c',body:'댓글',authorId:'u',authorName:'나'}],canEdit:true,canDelete:true,canModerate:true}],events:[{id:'e',title:'일정',body:'설명',startsAt:'2026-10-01T00:00:00Z',place:'서울',canEdit:true,canDelete:true}]});
 const posts=renderGroupDetail(owner,{},'posts'),events=renderGroupDetail(owner,{},'events'),members=renderGroupDetail(owner,{},'members'),settings=renderGroupDetail(owner,{},'settings');
 for(const op of ['post','comment-delete','post-delete','post-hide'])assert.match(posts,new RegExp(`value="${op}"`));
 assert.match(events,/name="eventId" value="e"/);assert.match(events,/value="event-delete"/);
 assert.match(members,/value="transfer"/);assert.match(members,/초대 링크/);
 assert.match(settings,/value="close"/);
 const rejected=renderGroupDetail({...owner,status:'rejected'}, {},'settings');assert.match(rejected,/value="resubmit"/);
 const member=renderGroupDetail({...owner,viewer:{...owner.viewer,role:'member',canManage:false,canEditSettings:false}}, {},'posts');assert.doesNotMatch(member,/<option value="notice"/);
});

test('cover uses an image element and never constructs inline CSS from a URL',()=>{
 const html=renderGroupDetail(detail({canRead:true},{coverUrl:"/media/x');color:red/*"}));
 assert.doesNotMatch(html,/<img class="group-cover-image"|style=|color:red/);
});

test('gallery uses a responsive image grid with client-side pages',()=>{
 const images=Array.from({length:25},(_,i)=>({id:`i${i}`,url:`/api/v3/groups?id=g&imageId=i${i}`}));
 const html=renderGroupDetail(detail({canRead:true},{posts:[{id:'p',kind:'gallery',title:'사진첩',authorName:'나',images,comments:[]}]}),{},'gallery',1);
 assert.match(html,/class="group-gallery"/);assert.match(html,/galleryPage=2/);assert.equal((html.match(/<figure>/g)||[]).length,24);
});

test('detail routing records unread approved state and renders the returned version',async()=>{
 const calls=[],client={get:async()=>({ok:true,item:detail({membershipStatus:'active',canRead:true,canWrite:true},{id:'g',version:2,unread:true})}),save:async x=>(calls.push(x),{ok:true,item:detail({membershipStatus:'active',canRead:true,canWrite:true},{id:'g',version:3,unread:false})})};
 const html=await loadGroupPage({parts:['groups','g'],session:{authenticated:true,user:{id:'u'}},client});
 assert.deepEqual(calls,[{id:'g',version:2,operation:'read',input:{},invite:''}]);assert.match(html,/data-group-version="3"/);
});

test('delegated upload advances the version used by the following save',async()=>{
 const listeners={},detailNode={dataset:{groupId:'g',groupVersion:'3'}},state={textContent:''},imageIds={name:'imageIds',value:''};
 const form={dataset:{},_data:new Map([['operation','post'],['title','사진'],['body','설명'],['kind','gallery'],['imageIds','im']]),matches:()=>false,querySelector:s=>s==='[data-group-state]'?state:s==='[name=imageIds],[name=coverImageId]'?imageIds:null,querySelectorAll:()=>[]};
 const input={files:[{type:'image/png'}],dataset:{},closest:s=>s==='[data-group-upload]'?input:s==='form'?form:null};
 const root={addEventListener:(n,fn)=>listeners[n]=fn,querySelector:s=>s==='[data-group-version]'||s==='[data-group-id]'?detailNode:null};
 const previousFormData=globalThis.FormData,previousLocation=globalThis.location;globalThis.FormData=class{constructor(f){this.d=f._data}get(k){return this.d.get(k)||null}};globalThis.location={pathname:'/groups/g',search:'?tab=gallery'};
 let saved;bindGroupInteractions(root,{client:{upload:async()=>({ok:true,image:{id:'im'},version:4}),save:async x=>(saved=x,{ok:true,item:{id:'g',version:5}})}});
 try{await listeners.change({target:input});form._data.set('imageIds',imageIds.value);await listeners.submit({target:{closest:()=>form},preventDefault(){}});assert.equal(saved.version,4);}finally{globalThis.FormData=previousFormData;globalThis.location=previousLocation;}
});

test('an old save completion invalidates without corrupting a newer route version',async()=>{
 const listeners={},detailNode={dataset:{groupId:'g',groupVersion:'1'}},newDetail={dataset:{groupId:'other',groupVersion:'9'}},state={textContent:''},form={dataset:{},_data:new Map([['operation','notify'],['enabled','true']]),matches:()=>false,querySelector:s=>s==='[data-group-state]'?state:null,querySelectorAll:()=>[]};let current=detailNode;
 const root={addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>current};let resolveSave,routes=[];const previousFormData=globalThis.FormData,previousLocation=globalThis.location;globalThis.FormData=class{constructor(f){this.d=f._data}get(k){return this.d.get(k)||null}};globalThis.location={pathname:'/groups/g',search:''};
 bindGroupInteractions(root,{client:{save:()=>new Promise(r=>resolveSave=r)},onSaved:(_result,route)=>routes.push(route)});
 try{const pending=listeners.submit({target:{closest:()=>form},preventDefault(){}});globalThis.location.pathname='/groups/other';current=newDetail;resolveSave({ok:true,item:{id:'g',version:2}});await pending;assert.deepEqual(routes,[null]);assert.equal(newDetail.dataset.groupVersion,'9');}finally{globalThis.FormData=previousFormData;globalThis.location=previousLocation;}
});

test('closed groups retain inspection tabs without mutation forms',()=>{
 const closed=detail({role:'owner',membershipStatus:'active',canRead:true,canWrite:false,canManage:true,canEditSettings:true},{status:'closed',members:[{userId:'m',nickname:'멤버',status:'active',role:'member'}],audit:[{action:'close',actorName:'나'}]});
 const html=renderGroupDetail(closed,{},'members');assert.match(html,/감사 기록/);assert.doesNotMatch(html,/name=\"operation\"|data-group-member-form/);
});

test('atlas media renders only the selected 2 by 3 tile across cover posts and gallery',()=>{
 const image={id:'i',url:'/assets/groups/examples-171.webp',crop:'culture-b'};
 const item=detail({canRead:true},{coverUrl:image.url,coverCrop:'politics-a',posts:[{id:'p',kind:'gallery',title:'사진',body:'',authorName:'나',images:[image],comments:[]}]});
 for(const html of [renderGroupDetail(item,{},'posts'),renderGroupDetail(item,{},'gallery')]){assert.match(html,/group-atlas/);assert.match(html,/crop-culture-b|crop-politics-a/);assert.doesNotMatch(html,/style=/);}
});

test('public readable details offer login, join, pending cancel, and removed users no join',()=>{
 const base=detail({canRead:true},{visibility:'public'});
 assert.match(renderGroupDetail(base,{},'posts'),/로그인 후 가입 신청/);
 assert.match(renderGroupDetail({...base,viewer:{...base.viewer,userId:'u'}},{authenticated:true,user:{id:'u'}},'posts'),/가입 신청/);
 assert.match(renderGroupDetail({...base,viewer:{...base.viewer,userId:'u',membershipStatus:'pending',canLeave:true}},{authenticated:true,user:{id:'u'}},'posts'),/가입 신청 취소/);
 assert.doesNotMatch(renderGroupDetail({...base,viewer:{...base.viewer,userId:'u',membershipStatus:'removed'}},{authenticated:true,user:{id:'u'}},'posts'),/가입 신청/);
});

test('event serializer interprets datetime-local as Korea time',()=>{
 const data=new FormData();for(const [k,v] of [['operation','event'],['title','일정'],['body',''],['startsAt','2026-10-01T09:30'],['place','서울']])data.set(k,v);
 assert.equal(groupMutationFromForm(data).input.startsAt,'2026-10-01T00:30:00.000Z');
});

test('My Groups renders versioned leave controls outside the routed card',()=>{
 const item=summary({version:8,membershipStatus:'active',canLeave:true});const html=renderGroupDirectory({ok:true,items:[item],examples:[],total:1,page:1},{authenticated:true,user:{id:'u'}},'mine');
 assert.match(html,/name="id" value="g 1"/);assert.match(html,/name="version" value="8"/);assert.match(html,/value="leave"/);assert.match(html,/모임 나가기/);
});

test('invite token survives detail tabs, gallery pages, and guest login return',()=>{
 const item=detail({canRead:true},{posts:[{id:'p',kind:'gallery',title:'사진',authorName:'나',images:Array.from({length:25},(_,i)=>({id:String(i),url:`/api/v3/groups?id=g&imageId=${i}`})),comments:[]}]});
 const html=renderGroupDetail(item,{},'gallery',1,'invite token');assert.match(html,/tab=posts&amp;invite=invite\+token/);assert.match(html,/galleryPage=2&amp;invite=invite\+token/);assert.match(html,/return=%2Fgroups%2Fg%25201%3Finvite%3Dinvite%2520token/);
 const writable=renderGroupDetail({...item,viewer:{...item.viewer,userId:'u',membershipStatus:'active',canWrite:true}}, {authenticated:true,user:{id:'u'}},'gallery',1,'invite token');assert.match(writable,/name="kind">[\s\S]*value="gallery" selected/);assert.match(writable,/accept="image\/jpeg,image\/png,image\/webp"/);
});

test('conflict blocks retry until the latest saved data is acknowledged',async()=>{
 const listeners={},detailNode={dataset:{groupId:'g',groupVersion:'1'}},state={textContent:''};let form;const accept={hidden:true,disabled:false,closest:()=>form};form={dataset:{},_data:new Map([['operation','settings'],['name','내 초안'],['category','social'],['description','초안 설명'],['region',''],['rules',''],['visibility','public']]),matches:()=>false,querySelector:s=>s==='[data-group-state]'?state:s==='[data-group-conflict-accept]'?accept:null,querySelectorAll:()=>[]};
 const root={addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>detailNode};let saves=0;const oldFD=globalThis.FormData,oldLoc=globalThis.location;globalThis.FormData=class{constructor(f){this.d=f._data}get(k){return this.d.get(k)||null}};globalThis.location={pathname:'/groups/g',search:'?tab=settings'};bindGroupInteractions(root,{client:{save:async()=>++saves===1?{ok:false,error:'GROUP_CONFLICT'}:{ok:true,item:{id:'g',version:3}},get:async()=>({ok:true,item:{id:'g',version:2,name:'서버 이름',description:'서버 설명'}})}});
 try{const e={target:{closest:()=>form},preventDefault(){}};await listeners.submit(e);assert.equal(detailNode.dataset.groupVersion,'1');assert.match(state.textContent,/서버 이름/);await listeners.submit(e);assert.equal(saves,1);listeners.click({target:{closest:()=>accept}});assert.equal(detailNode.dataset.groupVersion,'2');await listeners.submit(e);assert.equal(saves,2);}finally{globalThis.FormData=oldFD;globalThis.location=oldLoc;}
});

test('multi-file upload rejects races and preserves each successful image before a later failure',async()=>{
 const listeners={},detailNode={dataset:{groupId:'g',groupVersion:'1'}},state={textContent:''},target={name:'imageIds',value:''},form={dataset:{},querySelector:s=>s==='[data-group-state]'?state:s==='[name=imageIds],[name=coverImageId]'?target:null,querySelectorAll:()=>[]},input={files:[{name:'a'},{name:'b'}],dataset:{},closest:s=>s==='[data-group-upload]'?input:s==='form'?form:null},root={addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>detailNode};let resolveFirst,calls=0;const oldLoc=globalThis.location;globalThis.location={pathname:'/groups/g',search:''};bindGroupInteractions(root,{client:{upload:async()=>{calls++;if(calls===1)return new Promise(r=>resolveFirst=r);return {ok:false,error:'GROUP_STORAGE_FAILED'};}}});
 try{const first=listeners.change({target:input});await listeners.change({target:input});assert.equal(calls,1);resolveFirst({ok:true,image:{id:'a'},version:2});await first;assert.equal(target.value,'a');assert.equal(detailNode.dataset.groupVersion,'2');assert.equal(form.dataset.groupUploading,undefined);}finally{globalThis.location=oldLoc;}
});

test('late create completion cannot overwrite the version of a newly opened group',async()=>{
 const listeners={},state={textContent:''},form={dataset:{},_data:new Map([['name','새 모임'],['category','social'],['description','설명'],['visibility','public'],['privacyAccepted','true']]),matches:()=>true,querySelector:s=>s==='[data-group-state]'?state:null,querySelectorAll:()=>[]};let current=null;
 const root={addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>current};let resolveSave,route;
 const fd=globalThis.FormData,loc=globalThis.location;globalThis.FormData=class{constructor(f){this.d=f._data}get(k){return this.d.get(k)||null}};globalThis.location={pathname:'/groups/new',search:''};
 bindGroupInteractions(root,{client:{save:()=>new Promise(r=>resolveSave=r)},onSaved:(_r,next)=>route=next});
 try{const pending=listeners.submit({target:{closest:()=>form},preventDefault(){}});globalThis.location.pathname='/groups/other';current={dataset:{groupId:'other',groupVersion:'42'}};resolveSave({ok:true,item:{id:'created',version:1}});await pending;assert.equal(current.dataset.groupVersion,'42');assert.equal(route,null);}finally{globalThis.FormData=fd;globalThis.location=loc;}
});
test('late conflict does not fetch or update another group after navigation',async()=>{
 const listeners={},state={textContent:''},form={dataset:{},_data:new Map([['operation','settings'],['name','초안'],['category','social'],['description','설명'],['visibility','public']]),matches:()=>false,querySelector:s=>s==='[data-group-state]'?state:null,querySelectorAll:()=>[]};let current={dataset:{groupId:'first',groupVersion:'2'}},resolveSave,reads=0;
 const root={addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>current},fd=globalThis.FormData,loc=globalThis.location;globalThis.FormData=class{constructor(f){this.d=f._data}get(k){return this.d.get(k)||null}};globalThis.location={pathname:'/groups/first',search:''};
 bindGroupInteractions(root,{client:{save:()=>new Promise(r=>resolveSave=r),get:async()=>{reads++;return {ok:true,item:{version:99}}}}});
 try{const pending=listeners.submit({target:{closest:()=>form},preventDefault(){}});globalThis.location.pathname='/groups/second';current={dataset:{groupId:'second',groupVersion:'8'}};resolveSave({ok:false,error:'GROUP_CONFLICT'});await pending;assert.equal(reads,0);assert.equal(current.dataset.groupVersion,'8');}finally{globalThis.FormData=fd;globalThis.location=loc;}
});
