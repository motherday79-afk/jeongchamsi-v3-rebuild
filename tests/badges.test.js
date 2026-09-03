import test from 'node:test';
import assert from 'node:assert/strict';
import { BADGE_CATALOG, badgeByKey, badgeCrestSvg } from '../src/data/badge-catalog.js';
import { VALID_BADGE_KEYS, computeBadgeMetrics, evaluateBadgeRules } from '../lib/badge-engine.js';

test('historical badge collection restores all 56 items and five tiers',()=>{
  assert.equal(BADGE_CATALOG.length,56);
  assert.equal(VALID_BADGE_KEYS.size,56);
  assert.deepEqual(Object.fromEntries(['BRONZE','SILVER','GOLD','PLATINUM','BLACK'].map(tier=>[tier,BADGE_CATALOG.filter(x=>x.tier===tier).length])),{
    BRONZE:9,SILVER:22,GOLD:14,PLATINUM:8,BLACK:3
  });
  assert.deepEqual(BADGE_CATALOG.filter(x=>x.tier==='BLACK').map(x=>x.name),['운영자','정참시장','미카엘']);
});

test('crest renderer gives every tier a named signature crest',()=>{
  for(const tier of ['BRONZE','SILVER','GOLD','PLATINUM','BLACK']){
    const badge=BADGE_CATALOG.find(x=>x.tier===tier);
    const svg=badgeCrestSvg(badge.key);
    assert.match(svg,new RegExp(`badge-crest-${tier.toLowerCase()}`));
    assert.match(svg,/badge-crest-facet/);
    assert.match(svg,new RegExp(`aria-label="${badge.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`));
  }
  assert.equal(badgeByKey('missing'),null);
});

test('bronze and silver conditions earn automatically and expose progress',()=>{
  const metrics={actionTotal:20,comments:10,pollCount:1,participationCount:5,activeDays:7,maxStreak:7,engagedThreads:3};
  const status=evaluateBadgeRules({id:'member',role:'member'},{grantedBadges:[]},metrics);
  assert.ok(status.earnedBadges.includes('first-step'));
  assert.ok(status.earnedBadges.includes('citizen-choice'));
  assert.ok(status.earnedBadges.includes('weekman'));
  assert.ok(status.earnedBadges.includes('diligent-participant'));
  assert.equal(status.progress.weekman.current,7);
});

test('gold platinum and black become eligible but require an admin grant',()=>{
  const metrics={
    activeDays:90,authoredPosts:60,comments:150,likesReceived:300,viewsReceived:20000,
    uniqueResponders:75,engagedThreads:50,participationTypes:5,highImpactPosts:10,
    responsesReceived:100,itsmePosts:25,referralsRecruited:1000
  };
  const pending=evaluateBadgeRules({id:'member',role:'member'},{grantedBadges:[]},metrics);
  assert.ok(pending.eligibleBadges.includes('content-driver'));
  assert.ok(pending.eligibleBadges.includes('elite-strategist'));
  assert.ok(!pending.earnedBadges.includes('content-driver'));
  assert.ok(!pending.earnedBadges.includes('elite-strategist'));
  assert.ok(!pending.earnedBadges.includes('michael'));
  assert.ok(!evaluateBadgeRules({id:'partner',role:'partner'},{grantedBadges:[]},metrics).earnedBadges.includes('jungchamsi-partner'));

  const approved=evaluateBadgeRules({id:'member',role:'member'},{grantedBadges:['content-driver','elite-strategist','michael']},metrics);
  assert.ok(approved.earnedBadges.includes('content-driver'));
  assert.ok(approved.earnedBadges.includes('elite-strategist'));
  assert.ok(approved.earnedBadges.includes('michael'));
});

test('administrator can use every badge without mutating grants',()=>{
  const status=evaluateBadgeRules({id:'admin',role:'admin'},{grantedBadges:[]},{});
  assert.equal(status.earnedBadges.length,56);
  assert.deepEqual(status.grantedBadges,[]);
});

test('existing posts comments likes and votes are evaluated retroactively',()=>{
  const domains={
    community:{items:[{id:'p1',ownerId:'member',likes:3,views:120,createdAt:'2026-08-01T00:00:00Z'}]},
    itsme:{items:[{id:'p2',ownerId:'member',likes:2,views:80,createdAt:'2026-08-02T00:00:00Z'}]},
    columns:{items:[]},
    comments:{items:[
      {ownerId:'member',domain:'community',postId:'other',createdAt:'2026-08-03T00:00:00Z'},
      {ownerId:'other',domain:'community',postId:'p1',createdAt:'2026-08-04T00:00:00Z'}
    ]}
  };
  const activity={likedPosts:['community:other'],pollVotes:{poll1:'a'},generationVotes:{'30대':'assembly-001'},nationalEvaluationVotes:{eval1:'positive'}};
  const metrics=computeBadgeMetrics('member',activity,domains);
  assert.equal(metrics.authoredPosts,2);
  assert.equal(metrics.comments,1);
  assert.equal(metrics.likesReceived,5);
  assert.equal(metrics.participationCount,3);
  assert.equal(metrics.responsesReceived,1);
  assert.equal(metrics.noonSignals,0);
});

test('historical authored dates never count as rollout attendance streaks',()=>{
  const items=Array.from({length:30},(_,index)=>({id:`p${index}`,ownerId:'member',createdAt:new Date(Date.UTC(2025,0,index+1)).toISOString()}));
  const metrics=computeBadgeMetrics('member',{badgeSignals:{events:[]}},{community:{items},itsme:{items:[]},columns:{items:[]},comments:{items:[]}});
  const status=evaluateBadgeRules({id:'member',role:'member'},{},metrics);
  assert.equal(metrics.maxStreak,0);
  assert.ok(!status.earnedBadges.includes('weekman'));
  assert.ok(!status.earnedBadges.includes('superhero'));
});

test('automatic badges remain collected after the triggering signal is no longer present',()=>{
  const first=evaluateBadgeRules({id:'member',role:'member'},{},{actionTotal:1});
  assert.ok(first.earnedBadges.includes('first-step'));
  const later=evaluateBadgeRules({id:'member',role:'member'},{automaticBadges:first.automaticBadges},{actionTotal:0});
  assert.ok(later.earnedBadges.includes('first-step'));
});
