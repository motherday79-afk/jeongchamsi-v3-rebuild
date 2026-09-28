import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBadgeStatus} from '../src/core/badge-loading.js';
import {renderMyActivity} from '../src/views/stage1.js';
const status={earnedBadges:['operator'],representativeBadge:'operator'};
test('failed visit HTTP status is never treated as badge data; stored selection is read',async()=>{
 const result=await loadBadgeStatus({recordBadgeVisit:async()=>({ok:false,status:500}),badgeStatus:async()=>status});
 assert.equal(result,status);
});
test('network failure on visit still loads persisted badges; total read failure stays explicit',async()=>{
 assert.equal(await loadBadgeStatus({recordBadgeVisit:async()=>{throw Error('offline');},badgeStatus:async()=>status}),status);
 const result=await loadBadgeStatus({recordBadgeVisit:async()=>({status:503}),badgeStatus:async()=>null});
 assert.equal(result.loadError,true);
 const html=renderMyActivity({authenticated:true,user:{role:'admin'}},result);
 assert.doesNotMatch(html,/관리자 승인 필요|0개 획득|is-locked/);assert.match(html,/불러오지 못/);
});
