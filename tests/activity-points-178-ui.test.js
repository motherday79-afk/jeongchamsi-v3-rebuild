import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderActivityHint,
  renderActivitySummary,
  renderActivityReceipt,
  renderActivityAdmin,
  renderMemberActivityAdmin,
  ledgerPresentation,
  totalSpent
} from '../src/views/activity-points.js';
import {
  activityFormPayload,
  activityRequestId,
  settleActivityRequest,
  rememberActivityFeedback,
  consumeActivityFeedback,
  hydrateActivityHints,
  rememberSubmissionFeedback
} from '../src/ui/activity-points.js';
import {groupMutationFromForm} from '../src/ui/group-interactions.js';
import {renderMyPoints,renderAdminMemberPoints} from '../src/views/stage1.js';
import {renderPointShop} from '../src/views/participation-pages.js';

const status={policy:{enabled:true,postPoints:100,commentPoints:50,dailyLimit:2000,postMinLength:50,commentMinLength:15,cooldownSeconds:30},day:'2026-09-17',earnedToday:750,remainingToday:1250,debt:40,credit:0,restrictedUntil:0,restrictionReason:''};
const data=object=>({get:key=>object[key]??null});

test('server policy hint reports current award, gross KST allowance and keeps short writing valid',()=>{
  const html=renderActivityHint(status,'post',{authenticated:true});
  assert.match(html,/100/);assert.match(html,/750/);assert.match(html,/1,250/);assert.match(html,/한국시간/);
  assert.match(html,/50자/);assert.match(html,/30초/);assert.match(html,/짧은 글도 등록/);
  assert.doesNotMatch(html,/minlength/);
  assert.match(renderActivityHint({...status,policy:{...status.policy,postPoints:320,postMinLength:81}},'post',{authenticated:true}),/320/);
});

test('member summary and receipts distinguish gross earned, credited cash, debt offset and exclusions',()=>{
  const summary=renderActivitySummary(status);assert.match(summary,/오늘 적립 인정/);assert.match(summary,/750/);assert.match(summary,/활동 상계 대기/);assert.match(summary,/40/);
  const credited=renderActivityReceipt({status:'credited',reason:'awarded',earned:100,credited:60,offset:40,earnedToday:850,dailyLimit:2000,remainingToday:1150});
  assert.match(credited,/100P/);assert.match(credited,/60P/);assert.match(credited,/40P/);
  for(const [reason,text] of [['minimum-length','분량'],['repetitive','반복'],['duplicate','동일'],['daily-limit','하루'],['restricted','제한'],['disabled','중지'],['ineligible','적립 대상']])assert.match(renderActivityReceipt({status:'excluded',reason,earned:0,credited:0,offset:0}),new RegExp(text));
});

test('ledger labels and cumulative spending never disguise clawbacks as purchases',()=>{
  const rows=[
    {type:'charge',points:1000,at:1},
    {type:'cage',points:-200,at:2},
    {type:'person-refresh',personName:'홍길동',points:-100,at:3},
    {type:'activity',kind:'comment',earned:50,credited:20,offset:30,points:20,at:4},
    {type:'activity-revoke',earned:50,recovered:20,debtAdded:30,points:-20,reason:'삭제',at:5}
  ];
  assert.equal(totalSpent(rows),300);
  assert.match(ledgerPresentation(rows[3]).label,/댓글 활동 적립/);assert.match(ledgerPresentation(rows[3]).detail,/50P 인정/);assert.match(ledgerPresentation(rows[3]).detail,/20P 지급/);assert.match(ledgerPresentation(rows[3]).detail,/30P 상계/);
  assert.match(ledgerPresentation(rows[4]).label,/활동 적립 회수/);assert.match(ledgerPresentation(rows[4]).detail,/추가 상계 30P/);
});

test('administrator panel escapes operational data and exposes typed policy, suspicion and member controls',()=>{
  const result={ok:true,activityRewards:status,activityAdmin:{policy:status.policy,suspects:[{userId:'u<1',nickname:'<img src=x>',eventId:'e1',contentId:'p1',kind:'post',scope:'community',reason:'duplicate',at:1,earned:100}],audit:[]}};
  const html=renderActivityAdmin(result,{authenticated:true,user:{role:'admin'}});
  assert.match(html,/data-point-form="activity-policy"/);assert.match(html,/name="enabled"/);assert.match(html,/name="reason"/);assert.match(html,/의심 신호/);assert.match(html,/확정된 부정 활동이 아닙니다/);
  assert.doesNotMatch(html,/<img src=x>/);assert.match(html,/&lt;img src=x&gt;/);
  assert.equal(renderActivityAdmin(result,{authenticated:true,user:{role:'member'}}),'');

  const member=renderMemberActivityAdmin({ok:true,activityRewards:{...status,restrictedUntil:1_900_000_000_000,restrictionReason:'운영 검토'},activityEvents:Array.from({length:26},(_,i)=>({eventId:`ev-${i}`,contentId:`post-${i}`,scope:'community',kind:i%2?'comment':'post',at:1_800_000_000_000-i,earned:100,credited:60,offset:40,reason:'awarded',revoked:false}))},'u<1',1);
  assert.match(member,/data-point-form="activity-restrict"/);assert.match(member,/data-point-form="activity-revoke"/);assert.match(member,/ev-0/);assert.doesNotMatch(member,/ev-25/);assert.match(member,/page=2/);assert.doesNotMatch(member,/value="u<1"/);
});

test('activity admin payload converts policy fields to integers and enabled to a strict boolean',()=>{
  assert.deepEqual(activityFormPayload(data({enabled:'on',postPoints:'125',commentPoints:'55',dailyLimit:'2500',postMinLength:'70',commentMinLength:'20',cooldownSeconds:'45',reason:'정책 조정'}),'activity-policy'),{operation:'activity-policy',policy:{enabled:true,postPoints:125,commentPoints:55,dailyLimit:2500,postMinLength:70,commentMinLength:20,cooldownSeconds:45},reason:'정책 조정'});
  assert.deepEqual(activityFormPayload(data({userId:'member-1',hours:'72',reason:'검토',requestId:'request-activity-1'}),'activity-restrict'),{operation:'activity-restrict',userId:'member-1',hours:72,reason:'검토',requestId:'request-activity-1'});
});

test('new community and group activity reuse one request id after an unknown outcome and rotate after edited rejected input',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const form={dataset:{activityRequestKey:'community:post:new'},querySelector:()=>null};
  const first=activityRequestId(form,{title:'제목',body:'본문'},{storage,generate:()=> 'request-stable-1'});
  settleActivityRequest(form,{outcome:'unknown'},{storage});
  const retry=activityRequestId(form,{title:'제목',body:'본문'},{storage,generate:()=> 'must-not-rotate'});assert.equal(retry,first);
  settleActivityRequest(form,{outcome:'rejected'},{storage});
  assert.equal(activityRequestId(form,{title:'제목',body:'수정 본문'},{storage,generate:()=> 'request-stable-2'}),'request-stable-2');
  const mutation=groupMutationFromForm(data({operation:'comment',postId:'p',body:'댓글',requestId:'request-group-1'}));
  assert.equal(mutation.input.requestId,'request-group-1');
});

test('reward and aggregate reversal feedback persists until a later render consumes it',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  rememberActivityFeedback({activityReward:{status:'credited',reason:'awarded',earned:100,credited:70,offset:30}},{storage});
  assert.match(consumeActivityFeedback({storage}),/100P/);assert.equal(consumeActivityFeedback({storage}),'');
  rememberActivityFeedback({activityReversal:{revoked:3,recovered:120,debtAdded:80,events:[{},{}]}},{storage});
  const reversal=consumeActivityFeedback({storage});assert.match(reversal,/120P 회수/);assert.match(reversal,/80P/);
});

test('pending requests and saved receipts stay scoped to the submitting account',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const first={dataset:{activityUser:'member-a',activityRequestKey:'community:post:new'},querySelector:()=>null},second={dataset:{activityUser:'member-b',activityRequestKey:'community:post:new'},querySelector:()=>null};
  assert.equal(activityRequestId(first,{body:'같은 본문'},{storage,generate:()=> 'request-account-a'}),'request-account-a');
  assert.equal(activityRequestId(second,{body:'같은 본문'},{storage,generate:()=> 'request-account-b'}),'request-account-b');
  rememberActivityFeedback({activityReward:{status:'credited',earned:100,credited:100,offset:0}},{storage,identity:'member-a:member:1'});
  assert.equal(consumeActivityFeedback({storage,identity:'member-b:member:2'}),'');
});

test('group pending request tokens are isolated by group operation and target post',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},tokens=['token-post-g1','token-comment-p1','token-comment-p2','token-post-g2','token-post-g1-new'];
  const form=key=>({dataset:{activityUser:'member',activityRequestKey:key},querySelector:()=>null});
  const postG1=form('group:g1:post:new'),commentP1=form('group:g1:comment:p1'),commentP2=form('group:g1:comment:p2'),postG2=form('group:g2:post:new');
  const next=()=>tokens.shift(),first=activityRequestId(postG1,{title:'첫 글'},{storage,generate:next});settleActivityRequest(postG1,{outcome:'unknown'},{storage});
  assert.equal(activityRequestId(postG1,{title:'첫 글'},{storage,generate:next}),first);
  const p1=activityRequestId(commentP1,{body:'첫 댓글'},{storage,generate:next}),p2=activityRequestId(commentP2,{body:'둘째 댓글'},{storage,generate:next}),g2=activityRequestId(postG2,{title:'다른 모임'},{storage,generate:next});
  assert.equal(new Set([first,p1,p2,g2]).size,4);
  settleActivityRequest(commentP1,{outcome:'success'},{storage});
  assert.equal(activityRequestId(commentP2,{body:'둘째 댓글'},{storage,generate:next}),p2);
  assert.notEqual(activityRequestId(commentP1,{body:'첫 댓글'},{storage,generate:next}),p1);
});

test('hint hydration ignores a late response after identity changes',async()=>{
  const hint={dataset:{activityHint:'comment'},isConnected:true,innerHTML:''};let identity='member-a',finish;
  const root={querySelectorAll:selector=>selector==='[data-activity-hint]'?[hint]:[],contains:()=>true};
  const pending=hydrateActivityHints(root,{loadStatus:()=>new Promise(r=>finish=r),getIdentity:()=>identity});identity='member-b';finish({ok:true,activityRewards:status});await pending;
  assert.equal(hint.innerHTML,'');
});

test('older hydration cannot overwrite a newer identity result or restore private markup',async()=>{
  const hint={dataset:{activityHint:'post'},isConnected:true,innerHTML:'old-A-private-total'},root={querySelectorAll:()=>[hint],contains:()=>true};let identity='member-a',resolveA,resolveB;
  const first=hydrateActivityHints(root,{loadStatus:()=>new Promise(resolve=>resolveA=resolve),getIdentity:()=>identity});
  identity='member-b';const second=hydrateActivityHints(root,{loadStatus:()=>new Promise(resolve=>resolveB=resolve),getIdentity:()=>identity});
  resolveB({ok:true,activityRewards:{...status,policy:{...status.policy,postPoints:320}}});await second;assert.match(hint.innerHTML,/320/);
  resolveA({ok:true,activityRewards:status});await first;assert.match(hint.innerHTML,/320/);assert.doesNotMatch(hint.innerHTML,/old-A-private-total/);
  hint.innerHTML='private-before-switch';identity='member-a';let finish;const lone=hydrateActivityHints(root,{loadStatus:()=>new Promise(resolve=>finish=resolve),getIdentity:()=>identity});identity='member-b';finish({ok:true,activityRewards:status});await lone;assert.doesNotMatch(hint.innerHTML,/private-before-switch/);
});

test('late deletion feedback is accepted only for the account that submitted it',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},result={activityReversal:{revoked:1,recovered:20,debtAdded:80}};let active='member-a:member:1';const submitted=active;
  active='member-b:member:2';assert.equal(rememberSubmissionFeedback(result,{submittingIdentity:submitted,currentIdentity:()=>active,storage}),false);assert.equal(consumeActivityFeedback({storage,identity:active}),'');
  active=submitted;assert.equal(rememberSubmissionFeedback(result,{submittingIdentity:submitted,currentIdentity:()=>active,storage}),true);const html=consumeActivityFeedback({storage,identity:active});assert.match(html,/20P 회수/);assert.match(html,/80P/);
});

test('all member point surfaces share truthful activity labels and exclude reversals from spending',()=>{
  const wallet={balance:800,firstPaid:true,ledger:[{type:'cage',points:-200,at:1},{type:'activity',kind:'post',earned:100,credited:100,offset:0,points:100,at:2},{type:'activity-revoke',earned:100,recovered:100,debtAdded:0,points:-100,at:3}]};
  const result={ok:true,wallet,activityRewards:status,orders:[]};
  const mine=renderMyPoints(result,true),shop=renderPointShop(result,{authenticated:true,user:{role:'member'}},'shop'),admin=renderAdminMemberPoints({...result,activityEvents:[]},'member-1');
  for(const html of [mine,shop,admin]){assert.match(html,/활동 적립/);assert.match(html,/활동 적립 회수/);}
  assert.match(mine,/누적 사용[\s\S]*200/);assert.doesNotMatch(mine,/누적 사용[\s\S]*300/);
});
