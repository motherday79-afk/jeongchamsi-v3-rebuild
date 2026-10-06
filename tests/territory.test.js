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
