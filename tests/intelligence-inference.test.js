import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPoliticalFacts } from '../lib/intelligence-facts.js';
import { inferPoliticalStates } from '../lib/intelligence-inference.js';
import { analyzeNewsHeadlines } from '../lib/intelligence-headlines.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';

const person={id:'metro-seoul',type:'metro',name:'오세훈',party:'국민의힘',region:'서울',jurisdiction:'서울특별시',terms:'5선',office:'서울특별시장',roleLabel:'광역단체장'};
const newsItems=[
  {title:'오세훈 서울시장 최초 5선 성공',description:'서울시장 최초 5선으로 장기 행정 경험을 이어간다.',source:'연합뉴스',url:'https://news.example/1',publishedAt:'2026-09-04T00:00:00.000Z'},
  {title:'오세훈 48.94%, 정원오 48.34% 초접전',description:'두 후보의 격차는 0.60%포인트였다.',source:'KBS',url:'https://news.example/2',publishedAt:'2026-09-03T00:00:00.000Z'},
  {title:'오세훈 정치자금법 1심 벌금 1000만원…확정시 시장직 상실',description:'형이 확정되면 시장직 상실 가능성이 거론된다.',source:'MBC',url:'https://news.example/3',publishedAt:'2026-09-02T00:00:00.000Z'},
  {title:'민주당 서울시의회 81석…오세훈 시정 제약',description:'여소야대 의회 구조가 예산과 조례 처리의 제약으로 작용한다.',source:'SBS',url:'https://news.example/4',publishedAt:'2026-09-01T00:00:00.000Z'},
  {title:'오세훈 2031년까지 주택 31만호 착공',description:'주거 공급 일정과 목표 물량을 공개했다.',source:'서울신문',url:'https://news.example/5',publishedAt:'2026-08-31T00:00:00.000Z'},
  {title:'오세훈 도시철도 7개 노선 추진',description:'서울 생활권 교통망 확충 계획이다.',source:'한국일보',url:'https://news.example/6',publishedAt:'2026-08-30T00:00:00.000Z'}
];
const raw={snapshotId:'jcs-golden',collectedAt:'2026-09-04T10:00:00.000Z',officialProfile:person,searchAds:{volume:{pc:12400,mobile:48600,total:61000}},news:{items:newsItems},sourceErrors:[]};
const context={peers:[{id:'rival-1',name:'정원오',party:'더불어민주당',region:'서울',office:'서울시장 후보',terms:'재선'}],ageSex:[{age:'20대',maleShare:51,femaleShare:49},{age:'30대',maleShare:50,femaleShare:50},{age:'40대',maleShare:49,femaleShare:51},{age:'50대',maleShare:49,femaleShare:51},{age:'60대 이상',maleShare:47,femaleShare:53}]};

test('political facts preserve concrete legal election policy organization and career evidence',()=>{
  const narrative=analyzeNewsHeadlines(person,newsItems);
  const facts=extractPoliticalFacts(person,{newsNarrative:narrative,searchMetrics:{pc:12400,mobile:48600,total:61000},competitors:context.peers});
  const statements=facts.map(row=>row.statement).join(' ');
  assert.match(statements,/5선/);
  assert.match(statements,/48\.94%/);
  assert.match(statements,/1심.*1000만원/);
  assert.match(statements,/81석/);
  assert.match(statements,/31만호/);
  assert.equal(new Set(facts.map(row=>row.id)).size,facts.length);
});

test('ten inference topics use separate decisions and evidence routes',()=>{
  const narrative=analyzeNewsHeadlines(person,newsItems);
  const facts=extractPoliticalFacts(person,{newsNarrative:narrative,searchMetrics:{pc:12400,mobile:48600,total:61000},competitors:context.peers});
  const states=inferPoliticalStates(person,{facts,newsNarrative:narrative,competitors:context.peers});
  assert.equal(states.length,10);
  assert.equal(new Set(states.map(row=>row.judgment)).size,10);
  assert.equal(states.every(row=>row.evidenceIds.length>=2),true);
  assert.match(states.find(row=>row.id==='01').judgment,/5선/);
  assert.match(states.find(row=>row.id==='05').judgment,/정원오|0\.60%/);
  assert.match(states.find(row=>row.id==='06').judgment,/1심|시장직/);
  assert.match(states.find(row=>row.id==='09').judgment,/31만호|주택/);
  assert.match(states.find(row=>row.id==='10').judgment,/5선|시장직|신뢰/);
});

test('diagnosis fields are independently written and evidence ownership is bounded',()=>{
  const narrative=analyzeNewsHeadlines(person,newsItems);
  const facts=extractPoliticalFacts(person,{newsNarrative:narrative,searchMetrics:{pc:12400,mobile:48600,total:61000},competitors:context.peers});
  const states=inferPoliticalStates(person,{facts,newsNarrative:narrative,competitors:context.peers});
  const useCount=new Map();
  for(const state of states){
    assert.notEqual(state.currentPosition,state.politicalMeaning,`${state.id}: position/meaning`);
    assert.equal(state.interpretation.includes(state.currentPosition),false,`${state.id}: position copied into interpretation`);
    assert.equal(state.interpretation.includes(state.politicalMeaning),false,`${state.id}: meaning copied into interpretation`);
    for(const evidenceId of state.evidenceIds)useCount.set(evidenceId,(useCount.get(evidenceId)||0)+1);
  }
  assert.ok([...useCount.values()].every(count=>count<=2),JSON.stringify([...useCount.entries()].filter(([,count])=>count>2)));
});

test('golden report has ten fact-led judgments and prescriptions cite facts instead of diagnosis titles',()=>{
  const report=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3');
  const meanings=report.diagnoses.map(row=>row.politicalMeaning);
  assert.equal(new Set(meanings).size,10);
  assert.equal(meanings.some(value=>value.includes('긍정과 부정 효과가 함께 나타나')),false);
  assert.match(report.diagnoses.find(row=>row.id==='06').politicalMeaning,/1심|1000만원|시장직/);
  assert.match(report.diagnoses.find(row=>row.id==='09').politicalMeaning,/31만호|주택/);
  assert.equal(report.prescriptions.every(row=>row.sourceFindings.length>=2),true);
  assert.equal(report.prescriptions.some(row=>row.sourceFindings.some(value=>/^\d{2}\s*·/.test(value))),false);
  assert.equal(new Set(report.prescriptions.map(row=>row.expectedImpact)).size,10);
  assert.equal(report.prescriptions.some(row=>/현재 판단을 .*실행 성과로 전환/.test(row.expectedImpact)),false);
  assert.equal(new Set(report.prescriptions.map(row=>row.monitoringIndicators.join('|'))).size,10);
});

test('structural-only politicians still receive ten differentiated fact-backed judgments',()=>{
  const sparse={id:'assembly-sparse',name:'김구조',party:'무소속',region:'강원',jurisdiction:'강원 테스트군',terms:'초선',office:'제22대 국회의원',roleLabel:'국회의원'};
  const report=buildIntelligenceDraft(sparse,{snapshotId:'sparse-1',officialProfile:sparse,news:{items:[]},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V3');
  assert.equal(report.diagnoses.length,10);
  assert.equal(new Set(report.diagnoses.map(row=>row.politicalMeaning)).size,10);
  assert.equal(report.diagnoses.every(row=>row.evidenceIds.length>=2),true);
  assert.equal(report.diagnoses.some(row=>/데이터 부족|분석 준비 중/.test(row.politicalMeaning)),false);
});
