import test from 'node:test';
import assert from 'node:assert/strict';
import {newMine,mineStats,applyMineAction,advanceMine,publicMine,migrateMine285} from '../lib/mining-engine.js';
import {PICKS,progression} from '../mine/pick-catalog.js';
import {createMiningService} from '../lib/mining-service.js';
import {memoryMineStore} from './support/mining-memory.js';
test('150-level progression anchors and every upgrade grows',()=>{
 for(const [i,l]of [1,20,50,100,150].entries()){
  const p=progression(l,l,l);assert.equal(p.chance,[.03,.06,.09,.14,.20][i]);
  assert.equal(p.autoMs,[3000,2800,2500,2000,1500][i]);assert.equal(p.capacity,[10,50,200,800,2000][i]);
 }
 let previous=progression(1,1,1);for(let l=2;l<=150;l++){const n=progression(l,l,l);assert.ok(n.chance>previous.chance);assert.ok(n.capacity>previous.capacity);assert.ok(n.autoMs<previous.autoMs);previous=n;}
 const s={...newMine(0),gold:9999999,pick:150,worker:150,storage:150};
 for(const target of ['pick','worker','storage'])assert.throws(()=>applyMineAction(s,{action:'upgrade',target},0),/MAX_LEVEL/);
});
test('purchases validate unlock, charge once and reject unowned equip',async()=>{
 const command=memoryMineStore(),s={...newMine(0),pick:150,gold:10000000};
 await command(['SET','jcsr2:mine:v1:user:shop285',JSON.stringify(s)]);
 const service=createMiningService({command,now:()=>0}),user={id:'shop285',role:'admin'};
 const body={action:'buy-pick',tool:'lightning',requestId:'buy-lightning285'};
 const [a,b]=await Promise.all([service.run(user,body),service.run(user,body)]);
 assert.equal(a.state.gold,10000000-PICKS.find(p=>p.id==='lightning').price);assert.equal(a.state.gold,b.state.gold);
 assert.ok(a.state.ownedPicks.includes('lightning'));
 const low=newMine(0);low.gold=10000000;assert.throws(()=>applyMineAction(low,{action:'buy-pick',tool:'wind'},0),/PICK_LOCKED/);
 assert.throws(()=>applyMineAction(low,{action:'tool',tool:'wind'},0),/TOOL/);
});
test('legacy migration preserves gold, ore, paid picks and old equipment tier once',()=>{
 const s={...newMine(0),character:'strong',pick:14,gold:333,ore:10,tool:'basic',paidPicks:['paid-v1']};delete s.balanceVersion;delete s.ownedPicks;
 migrateMine285(s);assert.equal(s.character,'orc');assert.equal(s.gold,333);assert.equal(s.ore,10);assert.equal(s.tool,'mystic');assert.ok(s.ownedPicks.includes('mystic'));assert.deepEqual(s.paidPicks,['paid-v1']);
 s.tool='rust';migrateMine285(s);assert.equal(s.tool,'rust');
});
test('online scheduled multihits match server settlement and stop at capacity',()=>{
 const s={...newMine(0),tool:'wind',ownedPicks:['rust','wind'],pick:150,storage:150};
 applyMineAction(s,{action:'enter',token:'motion-token285',sequence:1},0,()=>0);
 applyMineAction(s,{action:'auto-start',token:'motion-token285',sequence:2},0,()=>0);
 const publicState=publicMine(s,0);assert.equal(publicState.swings[0].hits,3);assert.equal(publicState.swings[0].at,1500);assert.ok(!('gained' in publicState.swings[0]));
 advanceMine(s,1499,()=>0);assert.equal(s.ore,0);advanceMine(s,1500,()=>0);assert.equal(s.ore,27);
 s.ore=1999;advanceMine(s,3000,()=>0);assert.equal(s.ore,2000);assert.equal(s.presence.running,false);
 advanceMine(s,6000,()=>0);assert.equal(s.ore,2000);
});
test('fixed double and conditional extra hits do not change success rate',()=>{
 const s={...newMine(0),pick:150,storage:150};
 s.tool='lightning';assert.equal(mineStats(s).chance,.2);let r=applyMineAction(s,{action:'strike'},0,()=>0);assert.equal(r.hits,2);assert.equal(r.gained,20);
 s.tool='heaven';r=applyMineAction(s,{action:'strike'},1500,()=>0);assert.equal(r.hits,2);assert.equal(r.gained,24);
 r=applyMineAction(s,{action:'strike'},3000,()=>.99);assert.equal(r.hits,1);assert.equal(r.gained,0);
});

import {makeMinerMotion} from '../mine/motion.js';
import {shopMarkup} from '../mine/pick-shop.js';
import {migrateCampaign} from '../lib/mining-campaign.js';
test('multi-hit animation produces the agreed impacts and cancels old callbacks',()=>{
 for(const hits of [1,2,3]){
  let callbacks=[],impacts=0;const m=makeMinerMotion({setFrame:()=>{},impact:()=>impacts++,schedule:(fn,at)=>{callbacks.push({fn,at});return callbacks.length;},cancel:()=>{}});
  m.play(false,hits);callbacks.sort((a,b)=>a.at-b.at).forEach(x=>x.fn());assert.equal(impacts,hits);
  callbacks=[];m.play(false,hits);m.stop();callbacks.forEach(x=>x.fn());assert.equal(impacts,hits);
 }
});
test('paid catalog tools remain equippable without repurchase after a campaign reset',()=>{
 const s={...newMine(0),paidPicks:['lightning','legacy-paid'],gold:0};
 applyMineAction(s,{action:'tool',tool:'lightning'},0);assert.equal(s.gold,0);assert.equal(s.tool,'lightning');
 const html=shopMarkup(s);assert.ok(html.includes('data-tool="legacy-paid"'));assert.ok(html.includes('data-tool="lightning"'));
});
test('legacy race is migrated before new campaign reset',()=>{
 const s={...newMine(0),character:'strong',campaignId:'old'};delete s.balanceVersion;
 migrateMine285(s);migrateCampaign(s,{id:'new'},0);assert.equal(s.character,'orc');assert.equal(s.balanceVersion,285);
});

