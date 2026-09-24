import test from 'node:test';
import assert from 'node:assert/strict';
import {createMiningService} from '../lib/mining-service.js';
import {newMine} from '../lib/mining-engine.js';
import {memoryMineStore} from './support/mining-memory.js';
const admin={id:'admin',role:'admin'},a={id:'a',nickname:'광부'},b={id:'b'};
async function setup(rng=()=>0){const command=memoryMineStore(),service=createMiningService({command,now:()=>1000,rng});for(const u of [a,b])await command(['SET','jcsr2:mine:v1:user:'+u.id,JSON.stringify({...newMine(1000),gold:200,pick:5,tool:'trial',character:'elf',paidPicks:['paid-one']})]);return {service,command};}
const buy=(campaignId,expectedPlays=0,requestId='buy-first-001')=>({action:'lottery-buy',campaignId,expectedPlays,requestId});
test('initial migration keeps balances; independent lottery has exact 5% boundary and refresh persistence',async()=>{
 const {service}=await setup(()=>.05),first=await service.run(a);assert.equal(first.state.gold,200);assert.equal(first.campaign.limit,50);
 const result=await service.run(a,buy(first.campaign.id));assert.equal(result.state.gold,180);assert.equal(result.lottery.ticket.won,false);assert.equal(result.lottery.plays,1);
 assert.deepEqual((await service.run(a)).lottery.ticket,result.lottery.ticket);
 const pending=await service.run(a,buy(first.campaign.id,1,'buy-second-001'));assert.equal(pending.error,'MINE_LOTTERY_PENDING');assert.equal(pending.state.gold,180);
});
test('concurrent last prize closes lottery without overaward or charging the loser; mining continues',async()=>{
 const {service}=await setup(),first=await service.run(a),id=first.campaign.id;
 await service.admin(admin,{action:'campaign-update',campaignId:id,requestId:'update-cap-001',title:'영화',prize:'영화권',limit:1});
 const results=await Promise.all([service.run(a,buy(id)),service.run(b,buy(id))]);assert.equal(results.filter(r=>r.ok).length,1);assert.deepEqual(results.map(r=>r.state.gold).sort(),[180,200]);
 const report=await service.admin(admin);assert.equal(report.winners.length,1);assert.equal(report.campaign.status,'closed');assert.equal((await service.run(a,{action:'upgrade',target:'worker',requestId:'upgrade-still-001'})).ok,true);
});
test('old retries cannot repurchase after ledger eviction; reveal and claims survive round reset',async()=>{
 const {service}=await setup(),first=await service.run(a),id=first.campaign.id;
 const won=await service.run(a,buy(id));for(let i=0;i<20;i++)await service.run(a,{action:'character',character:'elf',requestId:'character-set-'+i});
 const retry=await service.run(a,buy(id));assert.equal(retry.state.gold,180);assert.equal(retry.lottery.ticket.id,won.lottery.ticket.id);
 await service.run(a,{action:'lottery-reveal',campaignId:id,ticketId:won.lottery.ticket.id,requestId:'reveal-first-001'});
 const request={action:'campaign-start',campaignId:id,requestId:'start-next-001',title:'다음',prize:'쿠폰',limit:3};
 const next=await service.admin(admin,request);assert.equal((await service.admin(admin,request)).campaign.id,next.campaign.id);
 const reset=await service.run(a);assert.equal(reset.state.gold,0);assert.equal(reset.state.pick,1);assert.equal(reset.state.worker,1);assert.equal(reset.state.storage,1);assert.equal(reset.state.character,'elf');assert.equal(reset.state.tool,'basic');assert.deepEqual(reset.state.paidPicks,['paid-one']);assert.equal(reset.lottery.history[0].id,won.lottery.ticket.id);assert.equal(reset.lottery.plays,0);
 assert.equal((await service.admin(admin)).winners.length,1);
 await assert.rejects(()=>service.admin(admin,{...request,requestId:'start-stale-001'}),/CAMPAIGN_CHANGED/);
});
test('owned pick survives reset; client cannot grant a paid pick; never-seen legacy user resets after initial round',async()=>{
 const {service}=await setup(),first=await service.run(a);
 assert.equal((await service.run(a,{action:'tool',tool:'paid-one',requestId:'owned-pick-001'})).ok,true);
 assert.equal((await service.run(a,{action:'tool',tool:'paid-forged',paidPicks:['paid-forged'],requestId:'fake-pick-001'})).error,'MINE_TOOL');
 const body={action:'campaign-start',campaignId:first.campaign.id,requestId:'next-round-001',title:'다음',prize:'상품',limit:2};
 const results=await Promise.all([service.admin(admin,body),service.admin(admin,body)]);assert.equal(results[0].campaign.id,results[1].campaign.id);
 assert.equal((await service.run(a)).state.tool,'paid-one');assert.equal((await service.run(b)).state.gold,0);assert.equal((await service.admin(admin)).campaigns.length,2);
});
test('owners see only own claims and updated fulfillment; only admins modify valid campaign caps',async()=>{
 const {service}=await setup(),first=await service.run(a),id=first.campaign.id,won=await service.run(a,buy(id));
 assert.equal((await service.run(b)).lottery.history.length,0);
 await assert.rejects(()=>service.admin(a),/FORBIDDEN/);
 await assert.rejects(()=>service.admin(admin,{action:'campaign-update',campaignId:id,requestId:'bad-limit-001',title:'x',prize:'x',limit:0}),/CAMPAIGN_INPUT/);
 await service.admin(admin,{action:'campaign-fulfill',campaignId:id,requestId:'fulfill-claim-001',ticketId:won.lottery.ticket.id,fulfilled:true});
 assert.equal((await service.run(a)).lottery.history[0].fulfilled,true);
 const rows=await service.admin(admin,{action:'campaign-winners',campaignId:id});assert.equal(rows.winners[0].userId,'a');assert.equal(rows.winners[0].fulfilled,true);
 await assert.rejects(()=>service.admin(admin,{action:'campaign-update',campaignId:id,requestId:'big-limit-001',title:'x',prize:'x',limit:10001}),/CAMPAIGN_INPUT/);
});
test('round reset invalidates legacy collection cycles and supplied old campaign mutations',async()=>{
 const {service,command}=await setup(),first=await service.run(a),id=first.campaign.id;
 await service.admin(admin,{action:'campaign-start',campaignId:id,requestId:'round-replay-001',title:'다음',prize:'상품',limit:3});
 const reset=await service.run(a);assert.ok(reset.state.cycle>first.state.cycle);
 const raw=JSON.parse(await command(['GET','jcsr2:mine:v1:user:a']));raw.ore=10;await command(['SET','jcsr2:mine:v1:user:a',JSON.stringify(raw)]);
 const stale=await service.run(a,{action:'collect',cycle:first.state.cycle,requestId:'old-collect-001'});assert.equal(stale.error,'MINE_CYCLE_CHANGED');assert.equal(stale.state.gold,0);assert.equal(stale.state.ore,10);
 const oldCharacter=await service.run(a,{action:'character',character:'strong',campaignId:id,requestId:'old-character-001'});assert.equal(oldCharacter.error,'MINE_CAMPAIGN_CHANGED');assert.equal(oldCharacter.state.character,'elf');
 const collect=await service.run(a,{action:'collect',cycle:reset.state.cycle,campaignId:reset.campaign.id,requestId:'new-collect-001'});assert.equal(collect.ok,true);assert.equal(collect.state.gold,10);
});
