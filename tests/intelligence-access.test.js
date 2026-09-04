import test from 'node:test';
import assert from 'node:assert/strict';
import { accessTierForUser, projectIntelligence, ST_INTERPRETATION } from '../lib/intelligence-access.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';

const person={id:'assembly-001',name:'테스트 정치인',type:'assembly',party:'테스트당',office:'국회의원',roleLabel:'국회의원',jurisdiction:'서울 테스트구',terms:'재선'};
const report=buildIntelligenceDraft(person,{snapshotId:'2026-09-03',collectedAt:'2026-09-03T00:00:00.000Z',searchAds:{volume:{pc:100,mobile:900}},news:{items:[{title:'테스트 정치인 민생 정책 발표',source:'A뉴스',publishedAt:'2026-09-02'},{title:'지역 현장 방문 경제 대책 강조',source:'B일보',publishedAt:'2026-09-01'}]},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V2');

test('session users map to public member and admin access tiers',()=>{
  assert.equal(accessTierForUser(null),'public');
  assert.equal(accessTierForUser({role:'member'}),'member');
  assert.equal(accessTierForUser({role:'partner'}),'member');
  assert.equal(accessTierForUser({role:'admin'}),'admin');
});

test('public projection exposes three diagnoses and no private prescriptions',()=>{
  const result=projectIntelligence(report,'public','compare');
  assert.deepEqual(result.diagnoses.map(topic=>topic.id),['01','07','09']);
  assert.equal(result.prescriptions,undefined);
  assert.equal(result.newsNarrative,undefined);
  assert.equal(result.raw,undefined);
});

test('member projection exposes six interpreted diagnoses without strategy fields',()=>{
  const result=projectIntelligence(report,'member','compare');
  assert.deepEqual(result.diagnoses.map(topic=>topic.id),['01','02','03','05','07','09']);
  assert.equal(result.prescriptions,undefined);
  assert.ok(result.diagnoses.every(topic=>Array.isArray(topic.interpretation)));
  assert.doesNotMatch(JSON.stringify(result),/strategicJudgment|actionPlan|monitoringIndicators/);
});

test('admin projection exposes all diagnoses then all prescriptions',()=>{
  const result=projectIntelligence(report,'admin','compare');
  assert.deepEqual(result.diagnoses.map(topic=>topic.id),['01','02','03','04','05','06','07','08','09','10']);
  assert.deepEqual(result.prescriptions.map(topic=>topic.id),['01','02','03','04','05','06','07','08','09','10']);
  assert.equal(result.stInterpretation,ST_INTERPRETATION);
  assert.equal(result.prescriptionPriorities.immediate.length,3);
  assert.equal(result.prescriptionPriorities.days30.length,3);
  assert.equal(result.prescriptionPriorities.days90.length,2);
  assert.equal(result.prescriptionPriorities.longTerm.length,2);
});

test('detail and compare use identical projected values',()=>{
  assert.deepEqual(projectIntelligence(report,'member','detail').diagnoses,projectIntelligence(report,'member','compare').diagnoses);
});

test('sparse source input remains complete without prohibited placeholders',()=>{
  const sparse=buildIntelligenceDraft({...person,id:'assembly-999',name:'희소 정치인'},{snapshotId:'2026-09-03',collectedAt:'2026-09-03T00:00:00.000Z',news:{items:[]},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V2');
  const result=projectIntelligence(sparse,'admin','detail');
  assert.equal(result.diagnoses.length,10);
  assert.equal(result.prescriptions.length,10);
  const narrative={...result,diagnoses:result.diagnoses.map(({display,...diagnosis})=>diagnosis)};
  assert.doesNotMatch(JSON.stringify(narrative),/데이터 부족|분석 준비 중|분석 불가|판단 불가|비교 불가|알 수 없음|추가 데이터 필요|N\/A|TODO|TBD|추후 제공/);
  assert.ok(result.diagnoses.every(diagnosis=>diagnosis.display?.kind));
});

test('unknown nested properties never cross the role projection',()=>{
  const poisoned={...report,rank:{...report.rank,privateMemo:'SECRET_RANK'},news:[{title:'기사',privateMemo:'SECRET_NEWS'}],diagnoses:report.diagnoses.map((row,index)=>index?row:{...row,privateStrategy:'SECRET_DIAG',visualization:{...row.visualization,secret:'SECRET_VISUAL'}}),prescriptions:report.prescriptions.map((row,index)=>index?row:{...row,secret:'SECRET_RX',actions:[...row.actions,{attackPlan:'SECRET_ATTACK'}]})};
  for(const tier of ['public','member','admin'])assert.doesNotMatch(JSON.stringify(projectIntelligence(poisoned,tier,'detail')),/SECRET_|privateMemo|privateStrategy|attackPlan/);
});
