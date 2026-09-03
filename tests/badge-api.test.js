import test from 'node:test';
import assert from 'node:assert/strict';
import { createBadgeService } from '../lib/badge-service.js';
import { dispatchBadgeRequest, sanitizeContentInput, isActiveAcademySlot, findPublishedPost, recordContentView } from '../api/gateway.js';

function memoryCommand(seed={}){
  const values=new Map(Object.entries(seed));
  const calls=[];
  const command=async args=>{
    calls.push(args);
    const [op,...rest]=args;
    if(op==='GET')return values.get(rest[0])??null;
    if(op==='SET'){values.set(rest[0],rest[1]);return 'OK';}
    if(op==='MGET')return rest.map(key=>values.get(key)??null);
    if(op==='EVAL'){
      const [,keyCount,viewersKey,countKey,userId,ownerId]=rest;if(keyCount!=='2')throw new Error('INVALID_EVAL_KEYS');const viewers=new Set(JSON.parse(values.get(viewersKey)||'[]')),current=Number(values.get(countKey)||0);if(userId===ownerId||viewers.has(userId))return JSON.stringify({ok:true,counted:false,increment:current});viewers.add(userId);const next=current+1;values.set(viewersKey,JSON.stringify([...viewers]));values.set(countKey,String(next));return JSON.stringify({ok:true,counted:true,increment:next});
    }
    throw new Error(`UNSUPPORTED_${op}`);
  };
  return {command,values,calls};
}

test('member badge status retroactively evaluates stored activity and content',async()=>{
  const user={id:'member',role:'member'};
  const activity={pollVotes:{p1:'o1'},likedPosts:[],grantedBadges:[]};
  const {command}=memoryCommand({
    'jcsr2:useractivity:v1:member':JSON.stringify(activity),
    'jcsr2:content:v1:community':JSON.stringify({items:[]}),
    'jcsr2:content:v1:itsme':JSON.stringify({items:[]}),
    'jcsr2:content:v1:columns':JSON.stringify({items:[]}),
    'jcsr2:content:v1:comments':JSON.stringify({items:[]})
  });
  const status=await createBadgeService(command).statusForUser(user);
  assert.ok(status.earnedBadges.includes('citizen-choice'));
  assert.ok(status.earnedBadges.includes('first-participation'));
});

test('representative and showcase mutations enforce ownership and exact 1 plus 3 layout',async()=>{
  const user={id:'member',role:'member'};
  const activity={grantedBadges:['first-penguin','influencer','first-step','first-participation','citizen-choice'],representativeBadge:'',showcaseBadges:[]};
  const {command}=memoryCommand({'jcsr2:useractivity:v1:member':JSON.stringify(activity)});
  const service=createBadgeService(command);
  assert.equal((await service.setRepresentative(user,'first-penguin')).activity.representativeBadge,'first-penguin');
  assert.equal((await service.toggleShowcase(user,'first-penguin')).error,'BADGE_IS_REPRESENTATIVE');
  for(const key of ['first-step','first-participation','citizen-choice'])assert.equal((await service.toggleShowcase(user,key)).ok,true);
  assert.equal((await service.toggleShowcase(user,'influencer')).error,'BADGE_SHOWCASE_FULL');
  assert.equal((await service.setRepresentative(user,'operator')).error,'BADGE_LOCKED');
});

test('admin may use all badges and grant or revoke any manually administered badge',async()=>{
  const admin={id:'admin',role:'admin'},member={id:'member',role:'member'};
  const {command}=memoryCommand({'jcsr2:useractivity:v1:member':JSON.stringify({grantedBadges:[],representativeBadge:'',showcaseBadges:[]})});
  const service=createBadgeService(command);
  assert.equal((await service.statusForUser(admin)).earnedBadges.length,56);
  const granted=await service.replaceGrants(member,['operator','michael','content-driver']);
  assert.deepEqual(granted.activity.grantedBadges,['operator','michael','content-driver']);
  const revoked=await service.replaceGrants(member,[]);
  assert.deepEqual(revoked.activity.grantedBadges,[]);
});

test('visit signals start attendance tracking without inventing historical visits',async()=>{
  const user={id:'member',role:'member'};
  const {command}=memoryCommand();const service=createBadgeService(command,{now:()=>new Date('2026-09-03T03:05:00.000Z')});
  const first=await service.recordVisit(user);
  assert.equal(first.activity.badgeSignals.events.length,1);
  assert.ok(first.status.earnedBadges.includes('noon-signal'));
  const status=await service.statusForUser(user);
  assert.ok(status.earnedBadges.includes('noon-signal'));
  assert.ok(!status.earnedBadges.includes('weekman'));
});

test('gateway badge dispatcher maps member and admin operations with stable status codes',async()=>{
  const calls=[];
  const service={
    async statusForUser(){calls.push('status');return {earnedBadges:[]};},
    async setRepresentative(_user,key){calls.push(`representative:${key}`);return {ok:true};},
    async toggleShowcase(_user,key){calls.push(`showcase:${key}`);return {ok:false,error:'BADGE_SHOWCASE_FULL'};},
    async recordVisit(_user,...extra){calls.push(`visit:${extra.length}`);return {ok:true};},
    async replaceGrants(_user,keys){calls.push(`grants:${keys.join(',')}`);return {ok:true};}
  };
  const member={id:'member',role:'member'},admin={id:'admin',role:'admin'};
  assert.equal((await dispatchBadgeRequest('user/badges','GET',member,{},service)).status,200);
  assert.equal((await dispatchBadgeRequest('action','POST',member,{action:'badge-representative-set',payload:{badgeKey:'first-step'}},service)).status,200);
  assert.equal((await dispatchBadgeRequest('action','POST',member,{action:'badge-showcase-toggle',payload:{badgeKey:'first-voice'}},service)).status,409);
  assert.equal((await dispatchBadgeRequest('admin/users','PATCH',member,{id:'member',grantedBadges:[]},service,member)).status,403);
  assert.equal((await dispatchBadgeRequest('admin/users','PATCH',admin,{id:'member',grantedBadges:['michael']},service,member)).status,200);
  assert.deepEqual(calls,['status','representative:first-step','showcase:first-voice','grants:michael']);
});

test('client supplied visit timestamps are never forwarded to attendance tracking',async()=>{
  const calls=[];
  const service={async recordVisit(_user,...extra){calls.push(extra);return {ok:true};}};
  const result=await dispatchBadgeRequest('action','POST',{id:'member',role:'member'},{action:'badge-visit',payload:{at:'2020-01-01T00:00:00.000Z'}},service);
  assert.equal(result.status,200);
  assert.deepEqual(calls,[[]]);
});

test('one admin badge service reuses shared content domains across member evaluations',async()=>{
  const calls=[];
  const command=async args=>{calls.push(args);if(args[0]==='GET')return null;if(args[0]==='SET')return 'OK';throw new Error(`UNSUPPORTED_${args[0]}`);};
  const service=createBadgeService(command);
  await service.statusForUser({id:'first',role:'member'});
  await service.statusForUser({id:'second',role:'member'});
  const contentReads=calls.filter(args=>args[0]==='GET'&&String(args[1]).startsWith('jcsr2:content:'));
  assert.equal(contentReads.length,4);
});

test('visit de-duplication uses the same Korean calendar day as badge metrics',async()=>{
  let instant='2026-09-03T03:00:00.000Z';
  const {command}=memoryCommand();const service=createBadgeService(command,{now:()=>new Date(instant)}),user={id:'member',role:'member'};
  await service.recordVisit(user);
  instant='2026-09-03T15:00:00.000Z';
  const second=await service.recordVisit(user);
  assert.equal(second.activity.badgeSignals.events.length,2);
  const status=await service.statusForUser(user);
  assert.ok(status.earnedBadges.includes('noon-signal'));
  assert.ok(status.earnedBadges.includes('midnight'));
});

test('member content cannot forge badge-driving counters or dates',()=>{
  const safe=sanitizeContentInput({id:'forged',title:'제목',body:'본문',summary:'요약',category:'토론',coverImage:'/a.webp',likes:9999,views:9999,createdAt:'2020-01-01T00:00:00Z',ownerId:'admin',published:false});
  assert.deepEqual(safe,{title:'제목',body:'본문',summary:'요약',category:'토론',coverImage:'/a.webp'});
});

test('academy participation counts only an existing open published slot',()=>{
  const data={slots:[{id:'open',published:true},{id:'hidden',published:false}]};
  assert.equal(isActiveAcademySlot(data,'open'),true);
  assert.equal(isActiveAcademySlot(data,'hidden'),false);
  assert.equal(isActiveAcademySlot(data,'forged'),false);
});

test('malformed legacy visit signals cannot block a new attendance write',async()=>{
  const {command}=memoryCommand({'jcsr2:useractivity:v1:member':JSON.stringify({badgeSignals:{events:[{type:'visit',at:'not-a-date'}]}})});
  const service=createBadgeService(command,{now:()=>new Date('2026-09-03T03:00:00.000Z')});
  const result=await service.recordVisit({id:'member',role:'member'});
  assert.equal(result.ok,true);
  assert.equal(result.activity.badgeSignals.events.length,1);
});

test('badge status GET remains read-only while the visit mutation persists new automatic badges',async()=>{
  const calls=[];
  const command=async args=>{calls.push(args);if(args[0]==='GET')return args[1]==='jcsr2:useractivity:v1:member'?JSON.stringify({pollVotes:{p1:'yes'}}):null;if(args[0]==='SET')return 'OK';throw new Error(`UNSUPPORTED_${args[0]}`);};
  const service=createBadgeService(command,{now:()=>new Date('2026-09-03T03:00:00.000Z')}),user={id:'member',role:'member'};
  const status=await service.statusForUser(user);
  assert.ok(status.earnedBadges.includes('citizen-choice'));
  assert.equal(calls.filter(args=>args[0]==='SET').length,0);
  const visit=await service.recordVisit(user);
  assert.ok(visit.activity.automaticBadges.includes('citizen-choice'));
});

test('comments require a real published target and member views count once without self-farming',async()=>{
  const seed={'jcsr2:content:v1:community':JSON.stringify({items:[{id:'post-1',ownerId:'author',published:true,views:0},{id:'hidden',ownerId:'author',published:false,views:0}]})};
  const {command,values,calls}=memoryCommand(seed),viewer={id:'viewer',role:'member'},author={id:'author',role:'member'};
  assert.ok(await findPublishedPost(command,'community','post-1'));
  assert.equal(await findPublishedPost(command,'community','hidden'),null);
  assert.equal((await recordContentView(command,viewer,'community','post-1')).counted,true);
  assert.equal((await recordContentView(command,viewer,'community','post-1')).counted,false);
  assert.equal((await recordContentView(command,author,'community','post-1')).counted,false);
  assert.equal(JSON.parse(values.get('jcsr2:content:v1:community')).items[0].views,0);
  assert.equal([...values.entries()].find(([key])=>key.includes('view-count'))?.[1],'1');
  assert.ok(calls.some(args=>args[0]==='EVAL'));
});

test('post view uniqueness uses a durable per-post viewer set independent of activity size',async()=>{
  const viewedPosts=['community:target',...Array.from({length:1001},(_,index)=>`community:filler-${index}`)];
  const {command,values}=memoryCommand({
    'jcsr2:content:v1:community':JSON.stringify({items:[{id:'target',ownerId:'author',published:true,views:7}]}),
    'jcsr2:useractivity:v1:viewer':JSON.stringify({viewedPosts}),
    'jcsr2:viewers:v1:community:target':JSON.stringify(['viewer']),
    'jcsr2:view-count:v1:community:target':'1'
  });
  const result=await recordContentView(command,{id:'viewer',role:'member'},'community','target');
  assert.equal(result.counted,false);
  assert.equal(JSON.parse(values.get('jcsr2:content:v1:community')).items[0].views,7);
});
