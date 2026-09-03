import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
import { validateIntelligenceDraft } from '../lib/intelligence-validation.js';
import { applyPoliticianRoleUpdates } from '../lib/politician-role-updates.js';
import { projectIntelligence } from '../lib/intelligence-access.js';

const basePerson=applyPoliticianRoleUpdates({id:'assembly-031',type:'assembly',roleLabel:'국회의원',name:'김테스트',party:'더불어민주당',region:'경기',jurisdiction:'경기 테스트구',terms:'3선',committee:'정무위원회',office:'국회의원',termStart:'2024.05.30',termEnd:'2028.05.29',source:'국회 공개정보'});
const news=[
  {title:'김테스트 민생경제 법안 추진',source:'연합뉴스',url:'https://news/1',publishedAt:'2026-09-02T00:00:00Z'},
  {title:'김테스트 경기 지역 주거 현장 방문',source:'MBC',url:'https://news/2',publishedAt:'2026-09-01T00:00:00Z'},
  {title:'김테스트 당내 갈등 조정 강조',source:'KBS',url:'https://news/3',publishedAt:'2026-08-31T00:00:00Z'},
  {title:'김테스트 발언 논란 확산',source:'JTBC',url:'https://news/4',publishedAt:'2026-08-28T00:00:00Z'}
];
const raw={personId:basePerson.id,snapshotId:'snapshot-v2',collectedAt:'2026-09-03T00:00:00Z',officialProfile:basePerson,searchAds:{volume:{pc:1500,mobile:10000}},news:{items:news},sourceErrors:[]};
const context={peers:[basePerson,{...basePerson,id:'assembly-032',name:'이경쟁',terms:'초선',region:'서울'},{...basePerson,id:'assembly-033',name:'박경쟁',party:'국민의힘',terms:'5선'}],ageSex:[{age:'20대',maleShare:49.1,femaleShare:50.9},{age:'30대',maleShare:50.3,femaleShare:49.7},{age:'40대',maleShare:50.7,femaleShare:49.3},{age:'50대',maleShare:50.1,femaleShare:49.9},{age:'60대 이상',maleShare:46.5,femaleShare:53.5}],source:{title:'공식 연령×성별 인구표',url:'https://jumin.mois.go.kr/ageStatMonth.do'}};

const diagnosisFields=['id','title','headline','currentPosition','score','percentile','trend','benchmark','visualization','interpretation','evidence','opportunity','risk','sourceTypes','updatedAt','algorithmVersion','basis'];
const prescriptionFields=['id','linkedDiagnosisIds','title','objective','strategicJudgment','actions','target','messageDirection','channels','timing','priority','expectedImpact','monitoringIndicators','visualization','updatedAt','algorithmVersion'];
const diagnosisVisuals=['positioning-matrix','cohort-diverging','issue-fit-bars','support-stack','competitor-heatmap','risk-matrix','narrative-timeline','campaign-matrix','policy-heatmap','growth-gap'];
const prescriptionVisuals=['message-pyramid','target-matrix','local-playbook','support-flow','response-matrix','crisis-timeline','propagation-flow','resource-allocation','policy-quadrant','growth-timeline'];
const forbidden=/데이터 부족|분석 준비 중|분석 불가|판단 불가|비교 불가|알 수 없음|추가 데이터 필요|N\/A|TODO|TBD|추후 제공/;

test('every registered-style profile receives ten complete diagnoses followed by ten linked prescriptions',()=>{
  const draft=buildIntelligenceDraft(basePerson,raw,context,'JCS_INTELLIGENCE_V2');
  assert.equal(draft.diagnoses.length,10);
  assert.equal(draft.prescriptions.length,10);
  assert.deepEqual(draft.diagnoses.map(item=>item.visualization.type),diagnosisVisuals);
  assert.deepEqual(draft.prescriptions.map(item=>item.visualization.type),prescriptionVisuals);
  for(const item of draft.diagnoses)for(const field of diagnosisFields)assert.ok(item[field]!==null&&item[field]!==undefined&&item[field]!=='' ,`diagnosis ${item.id}.${field}`);
  for(const item of draft.prescriptions){for(const field of prescriptionFields)assert.ok(item[field]!==null&&item[field]!==undefined&&item[field]!=='' ,`prescription ${item.id}.${field}`);assert.ok(item.linkedDiagnosisIds.length>0);}
  assert.doesNotMatch(JSON.stringify({diagnoses:draft.diagnoses,prescriptions:draft.prescriptions}),forbidden);
});

test('prescriptions are diagnosis-linked and priorities resolve to 3 immediate 3 monthly 2 quarterly and 2 long-term',()=>{
  const draft=buildIntelligenceDraft(basePerson,raw,context,'JCS_INTELLIGENCE_V2');
  assert.deepEqual(draft.prescriptions.find(item=>item.id==='01').linkedDiagnosisIds,['01','07','09']);
  assert.deepEqual(draft.prescriptions.find(item=>item.id==='05').linkedDiagnosisIds,['05','06','08']);
  assert.deepEqual(Object.fromEntries(Object.entries(draft.prescriptionPriorities).map(([key,value])=>[key,value.length])),{immediate:3,days30:3,days90:2,longTerm:2});
  assert.equal(new Set(Object.values(draft.prescriptionPriorities).flat()).size,10);
});

test('diagnosis narrative is news and structure led while search remains a supporting signal',()=>{
  const draft=buildIntelligenceDraft(basePerson,raw,context,'JCS_INTELLIGENCE_V2');
  const narrative=JSON.stringify({diagnoses:draft.diagnoses,prescriptions:draft.prescriptions,summary:draft.diagnosisSummary});
  assert.match(narrative,/민생·경제|지역·현장|뉴스|정무위원회/);
  assert.doesNotMatch(narrative,/모바일 검색|PC 검색|모바일 이용자|모바일 우위/);
  assert.equal(draft.news.length<=10,true);
  assert.equal(draft.news.every(item=>item.agendaTag&&item.diagnosisRefs.length),true);
});

test('sparse-news politicians still receive complete non-cloned structural intelligence',()=>{
  const sparseRaw={...raw,news:{items:[]},searchAds:null};
  const first=buildIntelligenceDraft(basePerson,sparseRaw,context,'JCS_INTELLIGENCE_V2');
  const second=buildIntelligenceDraft(basePerson,sparseRaw,context,'JCS_INTELLIGENCE_V2');
  const other=buildIntelligenceDraft({...basePerson,id:'assembly-099',name:'박다른',party:'국민의힘',region:'부산',jurisdiction:'부산 다른구',terms:'초선'},sparseRaw,context,'JCS_INTELLIGENCE_V2');
  assert.deepEqual(first,second);
  assert.equal(first.diagnoses.length,10);
  assert.equal(first.prescriptions.length,10);
  assert.ok(new Set(first.diagnoses.map(item=>item.score)).size>=5);
  assert.notDeepEqual(first.diagnoses.map(item=>item.score),other.diagnoses.map(item=>item.score));
  assert.notEqual(first.diagnosisSummary.strongestAsset,other.diagnosisSummary.strongestAsset);
  assert.doesNotMatch(JSON.stringify(first),forbidden);
  assert.equal(validateIntelligenceDraft(first).ok,true);
});

test('server projection sends only role-authorized diagnoses and never leaks prescriptions downward',()=>{
  const draft=buildIntelligenceDraft(basePerson,raw,context,'JCS_INTELLIGENCE_V2');
  const guest=projectIntelligence(draft,'public','detail'),member=projectIntelligence(draft,'member','detail'),admin=projectIntelligence(draft,'admin','detail');
  assert.deepEqual(guest.diagnoses.map(item=>item.id),['01','07','09']);
  assert.deepEqual(member.diagnoses.map(item=>item.id),['01','02','03','05','07','09']);
  assert.equal(guest.prescriptions,undefined);
  assert.equal(member.prescriptions,undefined);
  assert.equal(guest.diagnosisSummary,undefined);
  assert.equal(member.prescriptionPriorities,undefined);
  assert.equal(admin.diagnoses.length,10);
  assert.equal(admin.prescriptions.length,10);
  assert.equal(admin.news.length<=10,true);
  assert.equal(admin.stInterpretation,'JCS ST 해석 · 공개 데이터, 뉴스 헤드라인, 정치 이력, 지역·정당 구조와 정참시 누적 신호를 종합한 자체 분석입니다.');
  assert.equal(admin.diagnostics,undefined);
});

test('nested diagnosis and prescription secrets are pruned by the server contract',()=>{
  const draft=buildIntelligenceDraft(basePerson,raw,context,'JCS_INTELLIGENCE_V2');
  draft.diagnoses[0].secretAttack='SECRET_DIAGNOSIS';
  draft.diagnoses[0].evidence[0].secretMemo='SECRET_EVIDENCE';
  draft.prescriptions[0].privateClient='SECRET_CLIENT';
  draft.prescriptions[0].actions=[{label:'허용 행동',secretRoute:'SECRET_ROUTE'}];
  const projected=projectIntelligence(draft,'admin','detail'),serialized=JSON.stringify(projected);
  assert.doesNotMatch(serialized,/secretAttack|secretMemo|privateClient|secretRoute|SECRET_/);
});

test('all 542 registered politicians receive a deterministic 10 diagnosis and 10 prescription report',()=>{
  const people=Object.values(POLITICIAN_SEED.profiles).flat().filter(person=>!person.isVacant);
  assert.equal(people.length,542);
  const signatures=new Set();
  for(const person of people){
    const report=buildIntelligenceDraft(person,{snapshotId:'2026-09-03',collectedAt:'2026-09-03T00:00:00.000Z',news:{items:[]},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V2');
    assert.equal(report.diagnoses.length,10,person.id);
    assert.equal(report.prescriptions.length,10,person.id);
    assert.deepEqual(report.prescriptions.map(row=>row.id),report.diagnoses.map(row=>row.id),person.id);
    assert.doesNotMatch(JSON.stringify({diagnoses:report.diagnoses,prescriptions:report.prescriptions}),/데이터 부족|분석 준비 중|분석 불가|판단 불가|비교 불가|알 수 없음|추가 데이터 필요|N\/A|TODO|TBD|추후 제공/,person.id);
    signatures.add(report.diagnoses.map(row=>row.score).join(','));
  }
  assert.ok(signatures.size>100,'reports must not clone one score vector across profiles');
});
