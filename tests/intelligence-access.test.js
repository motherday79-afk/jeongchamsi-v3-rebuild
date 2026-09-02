import test from 'node:test';
import assert from 'node:assert/strict';
import { accessTierForUser, projectIntelligence } from '../lib/intelligence-access.js';

const report={
  id:'assembly-001',snapshot:'snapshot',algorithmVersion:'v1',interpretationLabel:'JCS 해석',mode:'운영',rank:{overall:1,category:1},currentRole:'국회의원',
  signal:{index:88},core:[{label:'관심도',score:88}],activity:[{label:'활동성',score:70}],media:[{label:'언론',score:80}],sources:[{type:'Google 뉴스'}],
  audience:{position:60},cohorts:[{age:'20대',male:55,female:57}],transition:[{label:'유입',score:81}],diagnosis:{title:'진단'},issues:[{title:'민생'}],risks:['위험'],opportunities:['기회'],conclusion:'종합',
  support:{core:75},resilience:{index:68},mediaScores:{reach:80},competitors:[{id:'assembly-002'}],strategies:[{title:'전략'}],raw:{searchAds:{volume:{pc:100,mobile:900}}},
  activities:['활동'],achievements:['성과'],policies:['정책'],news:[{title:'기사'}],related:[{id:'assembly-002'}],deep:['삭제 영역'],trend:[1,2,3]
};

test('session users map to public member and admin access tiers',()=>{
  assert.equal(accessTierForUser(null),'public');
  assert.equal(accessTierForUser({role:'member'}),'member');
  assert.equal(accessTierForUser({role:'partner'}),'member');
  assert.equal(accessTierForUser({role:'admin'}),'admin');
});

test('public compare projection contains only public comparison groups',()=>{
  const result=projectIntelligence(report,'public','compare');
  assert.deepEqual(Object.keys(result).sort(),['activity','core','id','media','mode','rank','signal','snapshot','sources'].sort());
  assert.equal(result.audience,undefined);
  assert.equal(result.support,undefined);
  assert.equal(result.raw,undefined);
});

test('member compare adds interpreted one-to-one groups but excludes private intelligence',()=>{
  const result=projectIntelligence(report,'member','compare');
  for(const key of ['audience','cohorts','transition','diagnosis','issues','risks','opportunities','conclusion'])assert.ok(key in result,key);
  for(const key of ['support','resilience','mediaScores','competitors','strategies','raw'])assert.equal(result[key],undefined,key);
});

test('admin compare receives the complete validated report',()=>{
  assert.deepEqual(projectIntelligence(report,'admin','compare'),report);
});

test('public detail retains approved public chapters but removes admin and deleted chapters',()=>{
  const result=projectIntelligence(report,'public','detail');
  for(const key of ['signal','core','audience','activity','media','transition','diagnosis','activities','achievements','policies','news','sources','related'])assert.ok(key in result,key);
  for(const key of ['support','resilience','mediaScores','competitors','strategies','raw','deep','trend'])assert.equal(result[key],undefined,key);
});

