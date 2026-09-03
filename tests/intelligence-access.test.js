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

test('public compare projection contains only preserved records and role-safe diagnostics',()=>{
  const result=projectIntelligence(report,'public','compare');
  assert.deepEqual(Object.keys(result).sort(),['accessTier','achievements','activities','algorithmVersion','currentRole','diagnostics','id','interpretationLabel','mode','news','policies','rank','related','snapshot','sources'].sort());
  assert.equal(result.diagnostics.role,'public');
  assert.equal(result.support,undefined);
  assert.equal(result.raw,undefined);
});

test('member compare adds six interpreted topics but excludes private intelligence',()=>{
  const result=projectIntelligence(report,'member','compare');
  assert.deepEqual(result.diagnostics.topics.map(topic=>topic.id),['01','02','03','05','07','09']);
  for(const key of ['support','resilience','mediaScores','competitors','strategies','raw'])assert.equal(result[key],undefined,key);
});

test('admin compare receives all diagnostic topics without an unprojected raw payload',()=>{
  const result=projectIntelligence(report,'admin','compare');
  assert.deepEqual(result.diagnostics.topics.map(topic=>topic.id),['01','02','03','04','05','06','07','08','09','10']);
  assert.equal(result.raw,undefined);
  assert.equal(result.strategies,undefined);
});

test('public detail retains public records but removes legacy analysis and private chapters',()=>{
  const result=projectIntelligence(report,'public','detail');
  for(const key of ['activities','achievements','policies','news','sources','related','diagnostics'])assert.ok(key in result,key);
  for(const key of ['signal','core','audience','activity','media','transition','diagnosis','support','resilience','mediaScores','competitors','strategies','raw','deep','trend'])assert.equal(result[key],undefined,key);
});

const TOPIC_META=['id','number','title','status'];
const PUBLIC_FIELDS=['headline','summary','trend','keywords','miniChart'];
const MEMBER_FIELDS=['summary','metrics','trend','benchmark','comparison','interpretation','source','updatedAt'];
const ADMIN_FIELDS=['currentPosition','metrics','trend','benchmark','evidence','rootCause','opportunity','risk','strategicJudgment','actionPlan','priority','expectedImpact','monitoringIndicators','source','updatedAt'];

function assertTopicContract(result,ids,fields){
  assert.equal(result.diagnostics.role,result.accessTier);
  assert.deepEqual(result.diagnostics.topics.map(topic=>topic.id),ids);
  for(const topic of result.diagnostics.topics){
    assert.deepEqual(Object.keys(topic).sort(),[...TOPIC_META,...fields].sort());
  }
}

test('server projection returns only three public diagnostic topics and public fields',()=>{
  const result=projectIntelligence(report,'public','detail');
  assertTopicContract(result,['01','07','09'],PUBLIC_FIELDS);
  const serialized=JSON.stringify(result);
  for(const forbidden of ['rootCause','strategicJudgment','actionPlan','monitoringIndicators','cohorts','strategies','raw'])assert.doesNotMatch(serialized,new RegExp(`"${forbidden}"`));
});

test('server projection returns six member topics without administrator strategy fields',()=>{
  const result=projectIntelligence(report,'member','detail');
  assertTopicContract(result,['01','02','03','05','07','09'],MEMBER_FIELDS);
  const serialized=JSON.stringify(result);
  for(const forbidden of ['rootCause','opportunity','risk','strategicJudgment','actionPlan','priority','expectedImpact','monitoringIndicators','strategies','raw'])assert.doesNotMatch(serialized,new RegExp(`"${forbidden}"`));
});

test('server projection returns all ten administrator topics with the full report field contract',()=>{
  const result=projectIntelligence(report,'admin','compare');
  assertTopicContract(result,['01','02','03','04','05','06','07','08','09','10'],ADMIN_FIELDS);
  assert.equal(result.diagnostics.topics[0].currentPosition,'진단');
  assert.equal(result.diagnostics.topics[6].metrics.some(metric=>metric.label==='언론'),true);
});

test('detail and compare use the same projected diagnostic values for one role',()=>{
  const detail=projectIntelligence(report,'member','detail');
  const compare=projectIntelligence(report,'member','compare');
  assert.deepEqual(compare.diagnostics,detail.diagnostics);
});

test('missing source data produces stable insufficient-data states without fabricated numbers',()=>{
  const result=projectIntelligence({id:'assembly-999',snapshot:'2026-09-03',core:[{label:'빈 점수',score:''}]},'admin','detail');
  assert.equal(result.diagnostics.topics.length,10);
  assert.ok(result.diagnostics.topics.every(topic=>topic.status!=='ready'));
  assert.doesNotMatch(JSON.stringify(result),/"score":(?:1|9|10)(?:,|})/);
  assert.doesNotMatch(JSON.stringify(result),/"value":0/);
  assert.match(JSON.stringify(result),/분석 준비 중|비교 가능한 데이터 부족|해당 기간 데이터 없음/);
});

test('public fallback text never borrows member interpretation or administrator diagnosis',()=>{
  const result=projectIntelligence({...report,signal:{},diagnosis:{title:'ADMIN_DIAGNOSIS_TITLE',body:'ADMIN_DIAGNOSIS_BODY'}},'public','detail');
  assert.doesNotMatch(JSON.stringify(result),/ADMIN_DIAGNOSIS_TITLE|ADMIN_DIAGNOSIS_BODY/);
});

test('member metric rows prune unknown nested strategy properties',()=>{
  const result=projectIntelligence({...report,core:[{label:'관심도',score:88,privateStrategy:'SECRET_CORE'}],competitors:[{name:'경쟁자',score:77,attackPlan:'SECRET_ATTACK'}]},'member','compare');
  assert.doesNotMatch(JSON.stringify(result),/privateStrategy|attackPlan|SECRET_CORE|SECRET_ATTACK/);
});

test('published record arrays also prune unknown nested private properties',()=>{
  const result=projectIntelligence({...report,rank:{overall:1,privateMemo:'SECRET_RANK'},news:[{title:'기사',privateMemo:'SECRET_NEWS'}],related:[{id:'assembly-002',attackPlan:'SECRET_RELATED'}]},'public','detail');
  assert.doesNotMatch(JSON.stringify(result),/privateMemo|attackPlan|SECRET_RANK|SECRET_NEWS|SECRET_RELATED/);
});
