import test from 'node:test';
import assert from 'node:assert/strict';
import {createTaxiService,TAXI_CAS_LUA} from '../lib/taxi-service.js';
import {taxiRequest} from '../lib/taxi-http.js';

const passengers=['a','b','c'].map(id=>({id,personId:'person-'+id,name:'Name '+id,partyLabel:'Party '+id,photoUrl:'https://example.com/'+id+'.jpg',beats:[0,1,2,3,4].map(index=>({id:id+index,text:'익명 대화 '+index,type:'paraphrase',context:'출처 맥락',sources:[{title:'원문',url:'https://example.com/source/'+id+index,date:'2026-01-01'}]}))}));
test('distance excludes boarding and paused time, audio stays anonymous',async()=>{
 const f=setup();let s=await f.service.mutate(f.user,f.body('start',0));
 assert.equal(s.ride.distanceMeters,0);assert.match(s.ride.beat.audioUrl,/\/audio\/[a-f0-9]{32}\.mp3$/);assert.equal(s.ride.phase,'intro');s=await f.service.mutate(f.user,f.body('begin',s.version));assert.ok(s.ride.beat.comfort.text);
 f.tick(1000);s=await f.service.mutate(f.user,f.body('heartbeat',s.version));assert.equal(s.ride.distanceMeters,0);
 f.tick(10000);s=await f.service.mutate(f.user,f.body('pause',s.version));assert.equal(s.ride.distanceMeters,80);
 f.tick(60000);s=await f.service.mutate(f.user,f.body('resume',s.version));assert.equal(s.ride.distanceMeters,80);
 f.tick(1000);s=await f.service.mutate(f.user,f.body('listen',s.version));assert.equal(s.ride.distanceMeters,88);assert.equal(s.ride.beat.comfort,undefined);
 s=await f.service.mutate(f.user,f.body('dropoff',s.version));assert.equal(s.history[0].distanceMeters,88);
});
function setup(){
  const db=new Map(),keys=[];let at=100000,seq=0;
  const command=async args=>{if(args[0]==='GET'){keys.push(args[1]);return db.get(args[1])??null;}assert.equal(args[0],'EVAL');assert.equal(args[1],TAXI_CAS_LUA);const [, , ,key,old,value]=args;if((db.get(key)??'')!==old)return 0;db.set(key,value);return 1;};
  const service=createTaxiService({command,now:()=>at,random:()=>0.5,passengers});
  const user={id:'private-account',role:'admin',membershipTier:'admin',status:'active'};
  const body=(action,version)=>({action,expectedVersion:version,requestId:'request_'+String(++seq).padStart(12,'0')});
  return {service,user,db,keys,body,tick:n=>{at+=n;}};
}
test('intro withholds policy content until consent; leaving during greeting records zero heard',async()=>{
 const f=setup();let s=await f.service.mutate(f.user,f.body('start',0));
 assert.equal(s.ride.phase,'intro');assert.equal(s.ride.heardCount,0);assert.equal(s.ride.beat.type,'game_intro');assert.doesNotMatch(s.ride.beat.text,/익명 대화/);
 for(const action of ['listen','like','finish'])await assert.rejects(f.service.mutate(f.user,f.body(action,s.version)),/INTRO_REQUIRED/);
 s=await f.service.mutate(f.user,f.body('dropoff',s.version));assert.equal(s.history[0].heardCount,0);
 s=await f.service.mutate(f.user,f.body('start',s.version));s=await f.service.mutate(f.user,f.body('begin',s.version));
 assert.equal(s.ride.phase,'story');assert.equal(s.ride.heardCount,1);assert.equal(s.ride.beat.text,'익명 대화 0');
 await assert.rejects(f.service.mutate(f.user,f.body('begin',s.version)),/STORY_STARTED/);
});
test('guest bootstrap is opaque, identity withheld and histories isolated',async()=>{
  const f=setup(),a=await f.service.get(),b=await f.service.get();assert.match(a.sessionToken,/^[a-f0-9]{64}$/);assert.notEqual(a.sessionToken,b.sessionToken);assert.equal(f.db.size,0);
  const active=await f.service.mutate(null,f.body('start',0),a.sessionToken);assert.equal(active.ride.heardCount,0);assert.equal(active.ride.passenger,undefined);assert.equal(active.ride.beat.sources,undefined);assert.equal(active.ride.firstRide,undefined);
  const raw=JSON.stringify(active);for(const secret of ['person-','Name ','Party ','source/','photoUrl','passengerId'])assert.equal(raw.includes(secret),false);
  assert.equal((await f.service.get(null,b.sessionToken)).ride,null);
  await assert.rejects(f.service.mutate(null,f.body('start',0)),/INVALID_SESSION/);
  assert.equal(f.keys.some(k=>k.includes(a.sessionToken)),false);
});
test('same request concurrency advances once; altered or stale commands fail',async()=>{
  const f=setup(),start=await f.service.mutate(f.user,f.body('start',0)),body=f.body('begin',start.version);
  const results=await Promise.all([f.service.mutate(f.user,body),f.service.mutate(f.user,body)]);
  assert.equal(results[0].ride.heardCount,1);assert.equal(results[1].ride.heardCount,1);assert.equal(results.filter(r=>r.result.replayed).length,1);
  await assert.rejects(f.service.mutate(f.user,{...body,action:'like'}),/REQUEST_ID_REUSED/);
  await assert.rejects(f.service.mutate(f.user,f.body('listen',1)),/VERSION_CHANGED/);
});
test('server credits capped active intervals; pause and GET cannot accrue time',async()=>{
  const f=setup();let s=await f.service.mutate(f.user,f.body('start',0));
  f.tick(15000);s=await f.service.mutate(f.user,f.body('heartbeat',s.version));assert.equal(s.ride.activeMs,15000);
  f.tick(1000000);s=await f.service.mutate(f.user,f.body('pause',s.version));assert.equal(s.ride.activeMs,35000);
  f.tick(1000000);assert.equal((await f.service.get(f.user)).ride.activeMs,35000);
  s=await f.service.mutate(f.user,f.body('resume',s.version));assert.equal(s.ride.activeMs,35000);
  f.tick(5000);s=await f.service.mutate(f.user,f.body('begin',s.version));assert.equal(s.ride.activeMs,40000);
  await assert.rejects(f.service.mutate(f.user,{...f.body('heartbeat',s.version),elapsed:999999}),/INVALID_INPUT/);
});
test('likes never advance and are unique, final listen reveals sources and journal',async()=>{
  const f=setup();let s=await f.service.mutate(f.user,f.body('start',0));s=await f.service.mutate(f.user,f.body('begin',s.version));s=await f.service.mutate(f.user,f.body('like',s.version));assert.equal(s.ride.heardCount,1);assert.deepEqual(s.ride.likedBeatIndexes,[0]);
  await assert.rejects(f.service.mutate(f.user,f.body('like',s.version)),/ALREADY_LIKED/);
  await assert.rejects(f.service.mutate(f.user,f.body('finish',s.version)),/NOT_LAST_BEAT/);
  for(let i=0;i<5;i++)s=await f.service.mutate(f.user,f.body('listen',s.version));
  assert.equal(s.ride.status,'completed');assert.equal(s.ride.heardCount,5);assert.equal(s.ride.beats.length,5);assert.equal(s.ride.beats[0].sources.length,1);assert.equal(s.history.length,1);assert.equal(s.ride.firstRide,true);assert.equal(s.ride.visitNumber,1);assert.equal(s.ride.events.filter(e=>e.action==='listen').length,5);
});

test('resume after an undelivered pause does not count the hidden interval',async()=>{
  const f=setup();let s=await f.service.mutate(f.user,f.body('start',0));
  f.tick(15000);s=await f.service.mutate(f.user,f.body('heartbeat',s.version));
  f.tick(3600000);s=await f.service.mutate(f.user,f.body('resume',s.version));
  assert.equal(s.ride.activeMs,15000);
  f.tick(2000);s=await f.service.mutate(f.user,f.body('dropoff',s.version));
  assert.equal(s.ride.activeMs,17000);
});
test('deck exhausts without repeats, repeat count survives and journals are private',async()=>{
  const f=setup();let s=await f.service.get(f.user);const ids=[];
  for(let i=0;i<4;i++){s=await f.service.mutate(f.user,f.body('start',s.version));s=await f.service.mutate(f.user,f.body('dropoff',s.version));ids.push(s.ride.passenger.id);assert.equal(s.ride.firstRide,i<3);}
  assert.equal(new Set(ids.slice(0,3)).size,3);assert.equal(s.ride.visitNumber,2);assert.equal(s.ride.heardCount,0);
  assert.equal((await f.service.get({id:'other',status:'active'})).history.length,0);
  assert.equal(f.keys.some(k=>k.includes('wallet')||k.includes('private-account')),false);
});
test('receipt eviction cannot replay old action and history remains bounded',async()=>{
  const f=setup();const original=f.body('start',0);let s=await f.service.mutate(f.user,original);
  for(let i=0;i<130;i++)s=await f.service.mutate(f.user,f.body('heartbeat',s.version));
  await assert.rejects(f.service.mutate(f.user,original),/VERSION_CHANGED/);
  s=await f.service.mutate(f.user,f.body('dropoff',s.version));
  for(let i=0;i<102;i++){s=await f.service.mutate(f.user,f.body('start',s.version));s=await f.service.mutate(f.user,f.body('dropoff',s.version));}
  assert.equal(s.history.length,100);assert.equal(JSON.parse([...f.db.values()][0]).receipts.length,128);
});
test('HTTP blocks foreign or missing origins, malformed input and inactive accounts',async()=>{
  const f=setup(),url=new URL('https://example.com/api/v3/taxi'),body=f.body('start',0),headers={origin:url.origin};
  for(const h of [{},{origin:'http://example.com'},{...headers,'sec-fetch-site':'cross-site'}])assert.equal((await taxiRequest({method:'POST',headers:h,body},{service:f.service,user:f.user,url})).status,403);
  assert.equal((await taxiRequest({method:'POST',headers,body:'{'},{service:f.service,user:f.user,url})).status,400);
  assert.equal((await taxiRequest({method:'POST',headers,body},{service:f.service,user:{...f.user,status:'suspended'},url})).status,403);
  assert.equal((await taxiRequest({method:'GET'},{service:f.service,url})).status,401);
});
test('taxi API admits only active administrators and owners on reads and writes',async()=>{
 const f=setup(),url=new URL('https://example.com/api/v3/taxi');
 for(const method of ['GET','POST'])for(const [user,status] of [[null,401],[{id:'member',role:'member',status:'active'},403],[{id:'p',role:'platinum',status:'active'},403],[{...f.user,status:'suspended'},403],[f.user,200],[{...f.user,id:'owner',membershipTier:'superadmin'},200]]){
  const result=await taxiRequest({method,headers:{origin:url.origin},body:f.body('reset',0)},{service:{get:async()=>({ok:true}),mutate:async()=>({ok:true})},user,url});assert.equal(result.status,status);
 }
});
test('reset clears only own ride, deck, visits and history; retries and stale requests cannot resurrect rides',async()=>{
 const f=setup();let s=await f.service.mutate(f.user,f.body('start',0));s=await f.service.mutate(f.user,f.body('dropoff',s.version));
 const other={...f.user,id:'other-admin'};const o=await f.service.mutate(other,f.body('start',0));
 s=await f.service.mutate(f.user,f.body('start',s.version));const stale=f.body('listen',s.version),reset=f.body('reset',s.version);
 s=await f.service.mutate(f.user,reset);assert.equal(s.ride,null);assert.deepEqual(s.history,[]);
 const replay=await f.service.mutate(f.user,reset);assert.equal(replay.version,s.version);assert.equal(replay.result.replayed,true);
 await assert.rejects(f.service.mutate(f.user,stale),/VERSION_CHANGED/);
 assert.equal((await f.service.get(other)).ride.id,o.ride.id);
 s=await f.service.mutate(f.user,f.body('start',s.version));assert.equal(s.ride.distanceMeters,0);
 s=await f.service.mutate(f.user,f.body('dropoff',s.version));assert.equal(s.ride.firstRide,true);
});
