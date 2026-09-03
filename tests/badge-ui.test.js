import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBadgeCollection, renderMyActivity } from '../src/views/stage1.js';
import { BADGE_CATALOG } from '../src/data/badge-catalog.js';

const status={
  earnedBadges:['first-step','weekman','first-penguin'],
  eligibleBadges:['content-driver'],
  grantedBadges:['first-penguin'],
  representativeBadge:'first-step',
  showcaseBadges:['weekman','first-penguin'],
  progress:{weekman:{current:7,target:7,label:'연속 활동일'},'content-driver':{current:1,target:2,label:'콘텐츠+조회'}}
};

test('member collection renders all badges in five tier sections',()=>{
  const html=renderBadgeCollection(status,{role:'member'});
  assert.equal((html.match(/data-badge-card=/g)||[]).length,BADGE_CATALOG.length);
  for(const tier of ['BRONZE','SILVER','GOLD','PLATINUM','BLACK'])assert.match(html,new RegExp(`data-badge-tier="${tier}"`));
  assert.match(html,/승인 후보/);
  assert.match(html,/대표 배지/);
  assert.match(html,/전시 해제/);
});

test('mypage activity badges route contains collection summary and exact selection guidance',()=>{
  const html=renderMyActivity({authenticated:true,user:{id:'member',nickname:'시민',role:'member'}},status,'?tab=badges');
  assert.match(html,/내 배지 컬렉션/);
  assert.match(html,/대표 1개 · 전시 3개/);
  assert.match(html,/3개 획득 · 총 56종/);
});

test('locked badge does not render selection controls',()=>{
  const html=renderBadgeCollection(status,{role:'member'});
  const locked=html.match(/<article[^>]+data-badge-card="michael"[\s\S]*?<\/article>/)?.[0]||'';
  assert.match(locked,/관리자 승인 필요/);
  assert.doesNotMatch(locked,/data-badge-representative/);
});
