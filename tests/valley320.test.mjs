import test from 'node:test';
import assert from 'node:assert/strict';
import {removeSpriteMatte,valleyPose} from '../mine/valley-sprites.js';
import {valleyAttacks,valleyCoins,valleyResult} from '../mine/valley-rules.js';
test('chroma matte is transparent while dark leather and gold stay opaque; poses return forward',()=>{
 const data=new Uint8ClampedArray([255,0,255,255,8,6,4,255,230,180,50,255]);removeSpriteMatte(data);
 assert.equal(data[3],0);assert.equal(data[7],255);assert.equal(data[11],255);
 assert.equal(valleyPose(3,0,false,0,true),0);assert.equal(valleyPose(3,190,false,0,true),1);
 assert.equal(valleyPose(3,190,true,-1,true),2);assert.equal(valleyPose(3,190,true,1,true),3);
 assert.equal(valleyPose(2,380,false,-1,true),4);
});
test('abundant trails can all be collected and avoided without impossible direction reversals',()=>{
 for(let seed=0;seed<100;seed++){
  const attacks=valleyAttacks(seed),coins=valleyCoins(seed);assert.ok(coins.length>=70&&coins.length<=130);
  for(const c of coins)for(const a of attacks)if(Math.abs(c.at-a.hit)<320)assert.notEqual(c.lane,a.lane);
  const events=[...coins,...attacks.map(a=>({at:a.hit,lane:1-a.lane}))].sort((a,b)=>a.at-b.at);
  let lane=0;const moves=[];
  for(const e of events)if(e.lane!==lane){moves.push([e.at,e.lane]);lane=e.lane;}
  for(let i=1;i<moves.length;i++)assert.ok(moves[i][0]-moves[i-1][0]>=120);
  const result=valleyResult(seed,moves);assert.equal(result.health,3);assert.equal(result.allCoins,true);
 }
});
