import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { validateIntelligenceConsistency } from '../lib/intelligence-consistency.js';
import { validateIntelligenceDraft } from '../lib/intelligence-validation.js';

const person={id:'assembly-consistency',type:'assembly',name:'검증의원',party:'국민의힘',region:'대구',jurisdiction:'대구 테스트구',terms:'재선',roleLabel:'국회의원',office:'국회의원',electionLabel:'제22대 국회의원 당선'};
const raw={personId:person.id,snapshotId:'v3-consistency',collectedAt:'2026-09-04T00:00:00Z',officialProfile:person,searchAds:{volume:{pc:100,mobile:200}},news:{items:[{title:'검증의원 역사 인식 발언 의혹 제기',source:'검증뉴스',publishedAt:'2026-09-03T00:00:00Z'}]},sourceErrors:[]};
const report=()=>buildIntelligenceDraft(person,raw,{peers:[person],ageSex:[{age:'20대',maleShare:51,femaleShare:49},{age:'30대',maleShare:50,femaleShare:50},{age:'40대',maleShare:49,femaleShare:51},{age:'50대',maleShare:48,femaleShare:52},{age:'60대 이상',maleShare:47,femaleShare:53}]},'JCS_INTELLIGENCE_V3');
const clone=value=>JSON.parse(JSON.stringify(value));

test('a valid V3 report passes named contradiction, duplication and linkage checks',()=>{
  const validation=validateIntelligenceConsistency(report(),{now:()=>Date.parse('2026-09-04T00:00:00Z')});
  assert.equal(validation.ok,true);
  assert.equal(validation.errors.length,0);
  assert.ok(validation.checks.includes('SOURCE_STATE'));
  assert.ok(validation.checks.includes('DUPLICATION'));
  assert.ok(validation.checks.includes('DIAGNOSIS_PRESCRIPTION_LINK'));
  assert.equal(validateIntelligenceDraft(report()).ok,true);
});

test('technical collection failure cannot be published as a zero-news maintenance judgment',()=>{
  const broken=clone(report());broken.raw.sourceErrors=[{source:'GOOGLE_NEWS',code:'SOURCE_TIMEOUT'}];broken.news=[];broken.newsNarrative.items=[];broken.diagnoses[0].changeCause='최근 30일 뉴스 0건으로 유지 흐름이다.';
  const validation=validateIntelligenceConsistency(broken);
  assert.equal(validation.ok,false);
  assert.ok(validation.errors.includes('SOURCE_FAILURE_AS_ABSENCE'));
});

test('duplicate judgments, cloned scores and disconnected prescriptions block publication',()=>{
  const broken=clone(report()),first=broken.diagnoses[0];
  for(const diagnosis of broken.diagnoses){diagnosis.score=50;diagnosis.opportunity=first.opportunity;diagnosis.risk=first.risk;diagnosis.interpretation=[first.interpretation[0]];diagnosis.politicalMeaning=first.politicalMeaning;}
  broken.prescriptions[0].linkedDiagnosisIds=['99'];
  const validation=validateIntelligenceConsistency(broken);
  assert.equal(validation.ok,false);
  for(const code of ['DIAGNOSIS_SCORE_CLONED','OPPORTUNITY_COPY_REPEATED','RISK_COPY_REPEATED','INTERPRETATION_COPY_REPEATED','POLITICAL_MEANING_COPY_REPEATED','PRESCRIPTION_LINK_INVALID'])assert.ok(validation.errors.includes(code),code);
});

test('legal suspicion cannot be narrated as a final conviction and negative attention cannot become a positive brand judgment',()=>{
  const broken=clone(report());broken.diagnoses[0].politicalMeaning='유죄 확정으로 정치적 책임이 끝났다.';broken.diagnoses[0].attentionQuality='정치 자산';
  const validation=validateIntelligenceConsistency(broken);
  assert.equal(validation.ok,false);
  assert.ok(validation.errors.includes('LEGAL_STAGE_CONTRADICTION'));
  assert.ok(validation.errors.includes('NEGATIVE_ATTENTION_MARKED_AS_ASSET'));
});

test('negative event cluster count does not override a positive article majority',()=>{
  const current=clone(report());
  current.newsNarrative.frameSummary={positive:2,neutral:0,negative:1,dominant:'긍정·성과'};
  current.newsNarrative.items=[
    {frame:'긍정·성과'},{frame:'긍정·성과'},{frame:'부정·위기'}
  ];
  current.eventClusters=[
    {direction:'positive',politicalFrame:'긍정·성과'},
    {direction:'negative',politicalFrame:'부정·위기'}
  ];
  for(const diagnosis of current.diagnoses)diagnosis.attentionQuality='정치 자산';
  const validation=validateIntelligenceConsistency(current);
  assert.equal(validation.errors.includes('NEGATIVE_ATTENTION_MARKED_AS_ASSET'),false);
});

test('search volume cannot become the headline or primary political conclusion',()=>{
  const broken=clone(report());broken.diagnoses[6].headline='모바일 검색량이 높으므로 영향력이 강하다.';
  const validation=validateIntelligenceConsistency(broken);
  assert.equal(validation.ok,false);
  assert.ok(validation.errors.includes('SEARCH_USED_AS_PRIMARY_CONCLUSION'));
});

test('cross-field copies, overused evidence and repeated prescription monitoring block publication',()=>{
  const broken=clone(report());
  for(const diagnosis of broken.diagnoses){
    diagnosis.politicalMeaning=diagnosis.currentPosition;
    diagnosis.interpretation=[diagnosis.currentPosition];
    diagnosis.headline='모든 항목에 복사된 동일 진단';
    diagnosis.evidenceIds=['shared-news'];
  }
  for(const prescription of broken.prescriptions){
    prescription.expectedImpact='현재 판단을 정치 활동 실행 성과로 전환';
    prescription.monitoringIndicators=['정치 활동 뉴스 점유','지역 메시지 반응'];
  }
  broken.diagnoses[0].currentPosition='[object Object]';
  const validation=validateIntelligenceConsistency(broken);
  for(const code of ['DIAGNOSIS_FIELDS_COPIED','EVIDENCE_OVERUSED','EXPECTED_IMPACT_COPY_REPEATED','MONITORING_COPY_REPEATED','OBJECT_TEXT_RENDERED'])assert.ok(validation.errors.includes(code),code);
});

test('removed legacy prose does not block an otherwise valid visual diagnosis',()=>{
  const current=clone(report());
  for(const diagnosis of current.diagnoses){diagnosis.currentPosition='분석 준비 중';diagnosis.politicalMeaning='분석 준비 중';diagnosis.interpretation=['분석 준비 중'];}
  const validation=validateIntelligenceDraft(current);
  assert.equal(validation.errors.includes('PROHIBITED_INTELLIGENCE_COPY'),false);
});
