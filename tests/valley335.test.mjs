import test from 'node:test';
import assert from 'node:assert/strict';
import {valleyAttacks,valleyResult} from '../mine/valley-rules.js';
import {valleyAction} from '../lib/mining-valley.js';
test('a dodge after 0.35 seconds now succeeds, but after 0.45 seconds still hits',()=>{
 const seed=1,first=valleyAttacks(seed)[0];
 assert.equal(first.lane,0);
 assert.equal(valleyResult(seed,[[first.at+400,1]],first.hit).health,3);
 assert.equal(valleyResult(seed,[[first.at+460,1]],first.hit).health,2);
});
test('old timing runs must restart rather than being judged with new timing',()=>{
 const state={valleyRun:{id:'old',rules:323}};
 assert.throws(()=>valleyAction(state,{action:'valley-finish',runId:'old',moves:[]},60000,1),/MINE_VALLEY_RUN/);
});
