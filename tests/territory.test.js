import test from 'node:test';
import assert from 'node:assert/strict';
import {createTerritoryService,TERRITORY_KEYS,TERRITORY_CAS_LUA} from '../lib/territory-service.js';
import {territoryRound,newTerritoryGame,settleTerritoryGame,territoryActor} from '../lib/territory-engine.js';
import {territoryRequest} from '../lib/territory-http.js';

const START=Date.parse('2026-10-06T03:00:00Z'),user={id:'u1',status:'active',nickname:'테스트'};
function fixture(){
  const data=new Map(),writes=[];let at=START;
  const command=async args=>{
    if(args[0]==='MGET')return args.slice(1).map(k=>data.get(k)??null);
    assert.equal(args[0],'EVAL');assert.equal(args[1],TERRITORY_CAS_LUA);
    const n=Number(args[2]),keys=args.slice(3,3+n),argv=args.slice(3+n);
    if(keys.some((k,i)=>(data.get(k)??'')!==argv[i]))return 0;
    for(let i=0;i<n;i++)if(Number(argv[2*n+i])>=0){data.set(keys[i],argv[n+i]);writes.push(keys[i]);}
    return 1;
  };
  const service=createTerritoryService({command,now:()=>at});
  const input=(action,fields={},id='request_0000001')=>({action,roundId:territoryRound(at).id,requestId:id,...fields});
  const fund=(n=1000)=>data.set(TERRITORY_KEYS.wallet(user.id),JSON.stringify({balance:n,activityCredit:80,activityDebt:3,ledger:[]}));
  const read=k=>JSON.parse(data.get(k)||'null');
  return {data,writes,service,input,fund,read,tick:n=>{at+=n;},get at(){return at;}};
}

test('plaza presence is private, expires and settles each minute once',async()=>{
  const f=fixture();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const body=f.input('deploy',{territoryId:'assembly',mode:'solo',appearance:'citizen3'},'deploy_00000001');
  const responses=await Promise.all([f.service.mutate(user,body),f.service.mutate(user,body)]);
  assert.equal(responses[0].player.energy,99);assert.equal(responses[0].participants.length,1);
  assert.equal(responses[0].player.presence.appearance,'citizen3');
  assert.notEqual(responses[0].participants[0].id,user.id);
  assert.equal(JSON.stringify(responses[0].participants).includes('userId'),false);
  f.tick(60000);assert.equal((await f.service.get()).territories[1].scores.democratic,4);
  assert.equal((await f.service.get()).territories[1].scores.democratic,4);
  f.tick(600000);const expired=await f.service.get(user);assert.equal(expired.participants.length,0);assert.equal(expired.territories[1].scores.democratic,40);
});

test('vigil commitment blocks actions but leaving is always free',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  await f.service.mutate(user,f.input('deploy',{territoryId:'assembly',mode:'vigil',appearance:'citizen1'},'deploy_00000001'));
  f.tick(10000);
  await assert.rejects(f.service.mutate(user,f.input('act',{territoryId:'assembly',moveId:'bill',unitIds:['unit1']},'acting_00000001')),/VIGIL_COMMITTED/);
  await assert.rejects(f.service.mutate(user,f.input('deploy',{territoryId:'bluehouse',mode:'solo',unitIds:['unit1']},'deploy_00000002')),/VIGIL_COMMITTED/);
  const left=await f.service.mutate(user,f.input('leave',{},'leaving_0000001'));assert.equal(left.participants.length,0);assert.equal(left.player.balance,1000);
  f.tick(60000);assert.equal((await f.service.get()).territories[1].scores.democratic,0);
});

test('collective counts real co-located mode members and concurrent retries spend once',async()=>{
  const f=fixture();const users=[user,{...user,id:'u2'},{...user,id:'u3'}];f.fund();
  for(const member of users){
    await f.service.mutate(member,f.input('join',{partyId:'democratic'}));
    await f.service.mutate(member,f.input('deploy',{territoryId:'assembly',mode:'rally',appearance:'citizen1'},'deploy_00000001'));
  }
  f.tick(60000);assert.equal((await f.service.get()).territories[1].scores.democratic,24);
  const body=f.input('collective',{territoryId:'assembly',moveId:'conference'},'collective_00001');
  const responses=await Promise.all([f.service.mutate(user,body),f.service.mutate(user,body)]);
  assert.equal(responses.filter(r=>r.result.replayed).length,1);
  assert.equal(responses[0].result.participantCount,3);assert.equal(responses[0].territories[1].scores.democratic,104);
  assert.equal(f.read(TERRITORY_KEYS.wallet(user.id)).balance,980);assert.equal(f.read(TERRITORY_KEYS.actor(user.id)).energy,89);
  await f.service.mutate(users[2],f.input('leave',{},'leaving_0000001'));
  f.tick(10000);
  await assert.rejects(f.service.mutate(user,f.input('collective',{territoryId:'assembly',moveId:'conference'},'collective_00002')),/COLLECTIVE_REQUIRED/);
  await assert.rejects(f.service.mutate(user,f.input('collective',{territoryId:'assembly',moveId:'jointBill'},'collective_00003')),/COLLECTIVE_REQUIRED/);
});

test('support requires a teammate, stops contributing after teammate leaves, and rejects claims',async()=>{
  const f=fixture(),other={...user,id:'u2'};
  await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const support=f.input('deploy',{territoryId:'assembly',mode:'support',appearance:'citizen6'},'deploy_00000001');
  await assert.rejects(f.service.mutate(user,support),/SUPPORT_REQUIRED/);
  await f.service.mutate(other,f.input('join',{partyId:'democratic'}));
  await f.service.mutate(other,f.input('deploy',{territoryId:'assembly',mode:'solo',appearance:'citizen4'},'deploy_00000001'));
  await f.service.mutate(user,support);f.tick(60000);
  assert.equal((await f.service.get()).territories[1].scores.democratic,10);
  await f.service.mutate(other,f.input('leave',{},'leaving_0000001'));f.tick(60000);
  assert.equal((await f.service.get()).territories[1].scores.democratic,10);
  await assert.rejects(f.service.mutate(user,{...support,requestId:'deploy_00000002',participantCount:30}),/INVALID_INPUT/);
});

test('passive threshold starts hold at actual influence minute and never crosses round',async()=>{
  const f=fixture();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  await f.service.mutate(user,f.input('deploy',{territoryId:'bluehouse',mode:'solo',appearance:'citizen2'},'deploy_00000001'));
  const game=f.read(TERRITORY_KEYS.game);game.territories[0].scores.democratic=596;f.data.set(TERRITORY_KEYS.game,JSON.stringify(game));
  f.tick(300000);let view=await f.service.get();assert.equal(view.territories[0].ownerPartyId,null);assert.equal(view.territories[0].holdStartedAt,START+60000);
  f.tick(60000);view=await f.service.get();assert.equal(view.territories[0].ownerPartyId,'democratic');
  f.tick(7*86400000);view=await f.service.get(user);assert.equal(view.participants.length,0);assert.equal(view.territories[0].scores.democratic,0);assert.equal(view.player.presence,null);
});

test('deploy lifecycle respects cooldown, energy, fixed appearance slots and global bounds',async()=>{
  const f=fixture();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const deploy=(id,fields={})=>f.input('deploy',{territoryId:'assembly',mode:'solo',appearance:'citizen1',...fields},id);
  await assert.rejects(f.service.mutate(user,deploy('deploy_00000001',{appearance:'citizen7'})),/INVALID_APPEARANCE/);
  await assert.rejects(f.service.mutate(user,deploy('deploy_00000001',{appearance:['citizen1']})),/INVALID_INPUT/);
  await f.service.mutate(user,deploy('deploy_00000001'));
  await f.service.mutate(user,f.input('leave',{},'leaving_0000001'));
  await assert.rejects(f.service.mutate(user,deploy('deploy_00000002')),/COOLDOWN/);
  f.tick(10000);await f.service.mutate(user,deploy('deploy_00000002'));
  f.tick(10000);const moved=await f.service.mutate(user,deploy('deploy_00000003',{territoryId:'bluehouse',appearance:'citizen5'}));
  assert.equal(moved.participants.length,2);assert.equal(moved.player.energy,97);assert.equal(moved.player.appearance,'citizen5');
  f.tick(10000);const actor=f.read(TERRITORY_KEYS.actor(user.id));actor.energy=0;f.data.set(TERRITORY_KEYS.actor(user.id),JSON.stringify(actor));
  await assert.rejects(f.service.mutate(user,deploy('deploy_00000004')),/INSUFFICIENT_ENERGY/);
  const game=f.read(TERRITORY_KEYS.game);game.participants=Array.from({length:1000},(_,i)=>({...game.participants[0],id:'opaque'+i,ownerId:'other'+i}));f.data.set(TERRITORY_KEYS.game,JSON.stringify(game));
  await assert.rejects(f.service.mutate(user,deploy('deploy_00000005')),/PLAZA_FULL/);
});

test('entire fixed roster deploys atomically with owner isolation and subset recall',async()=>{
  const f=fixture(),other={...user,id:'other'},unitIds=Array.from({length:18},(_,i)=>`unit${i+1}`);
  await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  let view=await f.service.mutate(user,f.input('deploy',{territoryId:'assembly',mode:'rally',unitIds},'squad_deploy_01'));
  assert.equal(view.player.energy,82);assert.equal(view.player.units.length,18);assert.equal(view.unitCount,18);assert.equal(view.commanderCount,1);
  assert.deepEqual(view.player.units.map(u=>u.appearance),unitIds.map((_,i)=>`citizen${Math.floor(i/3)+1}`));
  await f.service.mutate(other,f.input('join',{partyId:'ppp'}));
  await f.service.mutate(other,f.input('deploy',{territoryId:'assembly',mode:'solo',unitIds:['unit1']},'squad_deploy_01'));
  view=await f.service.mutate(other,f.input('leave',{unitIds:['unit1']},'squad_leave_01'));
  assert.equal(view.participants.length,18);assert.equal(view.player.presences.length,0);
  const before=[...f.data];
  await assert.rejects(f.service.mutate(user,f.input('leave',{unitIds:['unit19']},'squad_leave_02')),/INVALID_UNIT/);assert.deepEqual([...f.data],before);
  view=await f.service.mutate(user,f.input('leave',{unitIds:['unit1','unit3']},'squad_leave_03'));
  assert.equal(view.participants.length,16);assert.equal(view.player.units[0].presence,null);assert.ok(view.player.units[1].presence);
});

test('same commander rally units qualify and duplicate selection consumes energy only once',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const view=await f.service.mutate(user,f.input('deploy',{territoryId:'assembly',mode:'rally',unitIds:['unit1','unit1','unit2','unit3']},'squad_deploy_01'));
  assert.equal(view.player.energy,97);assert.equal(view.participants.length,3);
  f.tick(60000);assert.equal((await f.service.get()).territories[1].scores.democratic,24);
  const result=(await f.service.mutate(user,f.input('collective',{territoryId:'assembly',moveId:'conference'},'squad_collect01'))).result;
  assert.equal(result.unitCount,3);assert.equal(result.commanderCount,1);
});

test('insufficient batch energy and capacity reject without any state changes',async()=>{
  const f=fixture();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const actor=f.read(TERRITORY_KEYS.actor(user.id));actor.energy=1;f.data.set(TERRITORY_KEYS.actor(user.id),JSON.stringify(actor));
  const input=f.input('deploy',{territoryId:'assembly',mode:'solo',unitIds:['unit1','unit2']},'squad_deploy_01');
  let before=[...f.data];await assert.rejects(f.service.mutate(user,input),/INSUFFICIENT_ENERGY/);assert.deepEqual([...f.data],before);
  actor.energy=100;f.data.set(TERRITORY_KEYS.actor(user.id),JSON.stringify(actor));
  const game=f.read(TERRITORY_KEYS.game);game.participants=Array.from({length:999},(_,i)=>({id:`owner${i}:unit1`,ownerId:`owner${i}`,unitId:'unit1',appearance:'citizen1',partyId:'ppp',territoryId:'assembly',mode:'solo',joinedAt:START,expiresAt:START+600000,nextTickAt:START+60000}));
  f.data.set(TERRITORY_KEYS.game,JSON.stringify(game));before=[...f.data];await assert.rejects(f.service.mutate(user,input),/PLAZA_FULL/);assert.deepEqual([...f.data],before);
});

test('legacy presence migration preserves timers, actor balances and immutable appearance slot',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const actor=f.read(TERRITORY_KEYS.actor(user.id)),game=f.read(TERRITORY_KEYS.game);
  game.participants=[{id:actor.participantId,appearance:'citizen4',partyId:'democratic',territoryId:'assembly',mode:'solo',joinedAt:START,expiresAt:START+600000,nextTickAt:START+60000}];f.data.set(TERRITORY_KEYS.game,JSON.stringify(game));
  f.tick(60000);const view=await f.service.get(user);assert.equal(view.player.units[9].presence.unitId,'unit10');assert.equal(view.player.energy,100);assert.equal(view.player.balance,1000);assert.equal(view.territories[1].scores.democratic,4);
  assert.equal(f.read(TERRITORY_KEYS.game).participants[0].nextTickAt,START+120000);
});

test('vigil locks only selected units and public formation tracks ownership changes',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  await f.service.mutate(user,f.input('deploy',{territoryId:'assembly',mode:'vigil',unitIds:['unit1']},'squad_deploy_01'));
  f.tick(10000);let view=await f.service.mutate(user,f.input('deploy',{territoryId:'assembly',mode:'rally',unitIds:['unit2','unit3','unit4']},'squad_deploy_02'));
  assert.equal(view.player.units[0].ready,false);assert.equal(view.player.units[1].ready,true);assert.equal(view.participants[0].role,'contesting');
  f.tick(10000);await f.service.mutate(user,f.input('act',{territoryId:'assembly',moveId:'bill',unitIds:['unit2']},'squad_action_01'));
  f.tick(10000);await f.service.mutate(user,f.input('collective',{territoryId:'assembly',moveId:'conference'},'squad_collect01'));
  const game=f.read(TERRITORY_KEYS.game);game.territories[1].ownerPartyId='democratic';f.data.set(TERRITORY_KEYS.game,JSON.stringify(game));
  assert.ok((await f.service.get()).participants.every(p=>p.role==='defender'));
  game.territories[1].ownerPartyId='ppp';f.data.set(TERRITORY_KEYS.game,JSON.stringify(game));assert.ok((await f.service.get()).participants.every(p=>p.role==='attacker'));
  view=await f.service.mutate(user,f.input('leave',{unitIds:['unit1']},'squad_leave_01'));assert.equal(view.participants.length,3);
});

test('vigil completes commitment and collective insufficient points is atomic',async()=>{
  const f=fixture();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  await f.service.mutate(user,f.input('deploy',{territoryId:'assembly',mode:'vigil',appearance:'citizen1'},'deploy_00000001'));
  f.tick(300000);const view=await f.service.get(user);assert.equal(view.territories[1].scores.democratic,30);
  await f.service.mutate(user,f.input('deploy',{territoryId:'assembly',mode:'petition',appearance:'citizen1'},'deploy_00000002'));
  for(const id of ['u2','u3']){const member={...user,id};await f.service.mutate(member,f.input('join',{partyId:'democratic'}));await f.service.mutate(member,f.input('deploy',{territoryId:'assembly',mode:'petition',appearance:'citizen1'},'deploy_00000001'));}
  f.tick(10000);const before=[...f.data];
  const body=f.input('collective',{territoryId:'assembly',moveId:'jointBill'},'collective_00001');
  await assert.rejects(f.service.mutate(user,body),/INSUFFICIENT_POINTS/);assert.deepEqual([...f.data],before);
  f.fund();assert.equal((await f.service.mutate(user,body)).result.influence,80);
});
test('KST Monday rounds and passive energy reset',()=>{
  assert.equal(territoryRound(Date.parse('2026-10-04T14:59:59Z')).id,'2026-09-28');
  assert.equal(territoryRound(Date.parse('2026-10-04T15:00:00Z')).id,'2026-10-05');
  const round=territoryRound(START),actor=territoryActor({roundId:round.id,energy:90,energyAt:START,partyId:'ppp'},round,START+650000);
  assert.equal(actor.energy,92);assert.equal(actor.energyAt,START+600000);
  assert.equal(territoryActor(actor,territoryRound(START+7*86400000),START+7*86400000).partyId,null);
});
test('public and member GET plus join never create or write wallets',async()=>{
  const f=fixture();assert.equal((await f.service.get()).player,null);
  assert.equal((await f.service.get(user)).player.balance,0);
  await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  assert.equal(f.data.has(TERRITORY_KEYS.wallet(user.id)),false);
  assert.equal(f.writes.includes(TERRITORY_KEYS.wallet(user.id)),false);
});
test('concurrent retries debit wallet and activity credit exactly once',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const body=f.input('act',{territoryId:'assembly',moveId:'bill'},'request_0000002');
  const responses=await Promise.all([f.service.mutate(user,body),f.service.mutate(user,body)]);
  const wallet=f.read(TERRITORY_KEYS.wallet(user.id));assert.equal(wallet.balance,980);assert.equal(wallet.activityCredit,60);assert.equal(wallet.activityDebt,3);assert.equal(wallet.ledger.length,1);
  assert.equal(responses.filter(r=>r.result.replayed).length,1);
  assert.equal(f.read(TERRITORY_KEYS.actor(user.id)).energy,90);
  await assert.rejects(f.service.mutate(user,{...body,moveId:'media'}),e=>e.message==='REQUEST_ID_REUSED'&&e.status===409);
});
test('insufficient funds rolls back game actor and receipt together',async()=>{
  const f=fixture();f.fund(19);await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const before=[...f.data];
  await assert.rejects(f.service.mutate(user,f.input('act',{territoryId:'assembly',moveId:'bill'},'request_0000002')),e=>e.status===402);
  assert.deepEqual([...f.data],before);
});
test('concurrent different actions cannot bypass cooldown or double charge',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const results=await Promise.allSettled(['request_0000002','request_0000003'].map(id=>f.service.mutate(user,f.input('act',{territoryId:'assembly',moveId:'bill'},id))));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.message,'COOLDOWN');assert.equal(f.read(TERRITORY_KEYS.wallet(user.id)).balance,980);
});
test('party lock, roles, upgrade price and new-round stale replay',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  await assert.rejects(f.service.mutate(user,f.input('join',{partyId:'ppp'},'request_0000002')),/PARTY_LOCKED/);
  await assert.rejects(f.service.mutate(user,f.input('act',{territoryId:'assembly',moveId:'rebuttal'},'request_0000003')),/ROLE_REQUIRED/);
  const body=f.input('upgrade',{officeId:'policy',expectedPoints:100},'request_0000004');
  const first=await f.service.mutate(user,body);assert.equal(first.result.points,100);assert.equal(first.player.energy,100);
  f.tick(10000);const second=await f.service.mutate(user,f.input('upgrade',{officeId:'policy',expectedPoints:200},'request_0000005'));assert.equal(second.result.points,200);assert.equal(second.offices.democratic.policy,2);
  f.tick(7*86400000);await assert.rejects(f.service.mutate(user,body),/ROUND_CHANGED/);
  const next=await f.service.get(user);assert.equal(next.player.partyId,null);assert.equal(next.offices.democratic.policy,0);assert.equal(next.player.balance,700);
});
test('hold survives polling; capture uses true completion time; lost lead resets',()=>{
  const game=newTerritoryGame(START),t=game.territories[0];t.scores.democratic=600;
  settleTerritoryGame(game,START);settleTerritoryGame(game,START+200000);assert.equal(t.holdStartedAt,START);
  settleTerritoryGame(game,START+400000);assert.equal(t.ownerPartyId,'democratic');assert.equal(t.protectedUntil,START+900000);
  t.scores.ppp=800;settleTerritoryGame(game,START+500000);assert.equal(t.challengerPartyId,null);
  settleTerritoryGame(game,START+900000);assert.equal(t.challengerPartyId,'ppp');
  t.scores.democratic=750;settleTerritoryGame(game,START+910000);assert.equal(t.holdStartedAt,null);
});
test('HTTP auth, origin and error statuses',async()=>{
  const f=fixture(),url=new URL('https://example.com/api/v3/territory'),body=f.input('join',{partyId:'ppp'}),headers={origin:url.origin};
  assert.equal((await territoryRequest({method:'POST',body,headers},{service:f.service,url})).status,401);
  assert.equal((await territoryRequest({method:'POST',body,headers},{service:f.service,user:{...user,status:'suspended'},url})).status,403);
  assert.equal((await territoryRequest({method:'POST',body,headers:{origin:'https://evil.example'}},{service:f.service,user,url})).status,403);
  assert.equal((await territoryRequest({method:'POST',body,headers:{origin:'http://example.com'}},{service:f.service,user,url})).status,403);
  assert.equal((await territoryRequest({method:'POST',body},{service:f.service,user,url})).status,403);
  assert.equal((await territoryRequest({method:'POST',body,headers:{...headers,'sec-fetch-site':'cross-site'}},{service:f.service,user,url})).status,403);
  assert.equal((await territoryRequest({method:'POST',body:'{',headers},{service:f.service,user,url})).status,400);
});
test('scrutiny breaks neutral score-cap ties',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  const game=f.read(TERRITORY_KEYS.game);game.territories[0].scores.democratic=2000;game.territories[0].scores.ppp=2000;f.data.set(TERRITORY_KEYS.game,JSON.stringify(game));
  const view=await f.service.mutate(user,f.input('act',{territoryId:'bluehouse',moveId:'scrutiny'},'request_0000002'));
  assert.equal(view.territories[0].scores.democratic,2000);assert.equal(view.territories[0].scores.ppp,1990);
});
test('stale upgrade quote cannot debit more than the displayed amount',async()=>{
  const f=fixture();f.fund();await f.service.mutate(user,f.input('join',{partyId:'democratic'}));
  await f.service.mutate(user,f.input('upgrade',{officeId:'policy',expectedPoints:100},'request_0000002'));
  f.tick(10000);const before=[...f.data];
  await assert.rejects(f.service.mutate(user,f.input('upgrade',{officeId:'policy',expectedPoints:100},'request_0000003')),e=>e.message==='PRICE_CHANGED'&&e.status===409);
  assert.deepEqual([...f.data],before);
  await assert.rejects(f.service.mutate(user,f.input('upgrade',{officeId:'policy'},'request_0000004')),e=>e.message==='INVALID_INPUT');
});
