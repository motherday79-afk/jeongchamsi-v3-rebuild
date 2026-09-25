import test from 'node:test';
import assert from 'node:assert/strict';
import {valleyAttacks,valleyCoins,valleyResult,VALLEY_DURATION} from '../mine/valley-rules.js';
import {valleyAction} from '../lib/mining-valley.js';
test('60-second pattern speeds up after 20 seconds, coins can all be obtained without damage',()=>{
 assert.equal(VALLEY_DURATION,60000);
 for(const seed of [0,1,42,100,4294967295]){
  const attacks=valleyAttacks(seed),coins=valleyCoins(seed),moves=[];let lane=0;
  const move=(at,next)=>{if(next!==lane){moves.push([at,next]);lane=next;}};
  for(let i=0;i<attacks.length;i++){
   const a=attacks[i],coin=coins.find(c=>c.at===a.hit-220);
   assert.equal(a.hit-a.at,350);
   if(i>0){const gap=a.at-attacks[i-1].at;assert.ok(gap>=(attacks[i-1].at<20000?1700:900));assert.ok(gap<=(attacks[i-1].at<20000?2150:1200));}
   if(coin){move(coin.at-160,coin.lane);move(coin.at+10,1-coin.lane);}else move(a.hit-180,1-a.lane);
  }
  for(let i=1;i<moves.length;i++)assert.ok(moves[i][0]-moves[i-1][0]>=120);
  const result=valleyResult(seed,moves);assert.equal(result.health,3);assert.equal(result.allCoins,true);assert.equal(result.collected,coins.length);
  assert.equal(valleyResult(seed,moves,59999).won,false);
  const s={gold:1234};valleyAction(s,{action:'valley-start',requestId:'coin-run'},0,seed);
  const saved=valleyAction(s,{action:'valley-finish',runId:'coin-run',moves},60000);
  assert.equal(saved.valley.allCoins,true);assert.equal(s.dailyQuests.valleyAllCoins.collected,coins.length);assert.equal(s.gold,1234);
 }
});
test('death never grants all-coins completion; client supplied counts are ignored',()=>{
 const s={};valleyAction(s,{action:'valley-start',requestId:'dead-run'},0,1);
 const r=valleyAction(s,{action:'valley-finish',runId:'dead-run',moves:[],collected:999,allCoins:true},60000);
 assert.equal(r.valley.won,false);assert.equal(r.valley.allCoins,false);assert.equal(s.dailyQuests,undefined);
});
