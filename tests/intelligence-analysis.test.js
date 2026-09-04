import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { compactIntelligenceDraft } from '../lib/intelligence-storage.js';
import { validateIntelligenceDraft, validateSnapshot } from '../lib/intelligence-validation.js';

const person={id:'assembly-031',type:'assembly',roleLabel:'국회의원',name:'김테스트',party:'더불어민주당',region:'경기',jurisdiction:'경기 테스트구',terms:'3선',committee:'정무위원회',office:'국회의원',source:'국회 공개정보'};
const raw={
  personId:person.id,snapshotId:'snapshot-1',collectedAt:'2026-09-03T00:00:00.000Z',officialProfile:person,
  searchAds:{provider:'NAVER_SEARCH_ADS',volume:{pc:1500,mobile:10000,total:11500,pcRaw:1500,mobileRaw:10000},source:{url:'https://api.searchad.naver.com/keywordstool'}},
  news:{provider:'GOOGLE_NEWS_RSS',items:[
    {title:'김테스트 민생 경제 현장 행보',source:'연합뉴스',url:'https://news.google.com/a',publishedAt:'2026-09-02T00:00:00.000Z'},
    {title:'김테스트 청년 주거 정책 발표',source:'MBC',url:'https://news.google.com/b',publishedAt:'2026-09-01T00:00:00.000Z'},
    {title:'김테스트 당내 갈등 조정 강조',source:'KBS',url:'https://news.google.com/c',publishedAt:'2026-08-31T00:00:00.000Z'}
  ]},sourceErrors:[],sources:[]
};
const context={
  peers:[
    {id:'assembly-032',name:'이경쟁',type:'assembly',party:'더불어민주당',region:'경기'},
    {id:'assembly-033',name:'박경쟁',type:'assembly',party:'국민의힘',region:'경기'},
    {id:'assembly-034',name:'최경쟁',type:'assembly',party:'더불어민주당',region:'서울'}
  ],
  ageSex:[
    {age:'20대',maleShare:49.1,femaleShare:50.9},
    {age:'30대',maleShare:50.3,femaleShare:49.7},
    {age:'40대',maleShare:50.7,femaleShare:49.3},
    {age:'50대',maleShare:50.1,femaleShare:49.9},
    {age:'60대 이상',maleShare:46.5,femaleShare:53.5}
  ],
  source:{title:'공식 연령×성별 인구표',url:'https://jumin.mois.go.kr/ageStatMonth.do'}
};

test('the same raw snapshot always produces the same JCS intelligence draft',()=>{
  const first=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1');
  const second=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1');
  assert.deepEqual(first,second);
});

test('age by gender cells are independently derived instead of cloning one scalar',()=>{
  const draft=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1');
  assert.equal(draft.cohorts.length,5);
  assert.ok(new Set(draft.cohorts.map(row=>row.male)).size>=3);
  assert.ok(new Set(draft.cohorts.map(row=>row.female)).size>=3);
  assert.ok(draft.cohorts.some(row=>row.male!==row.female));
  assert.equal(validateIntelligenceDraft(draft).ok,true);
});

test('JCS age and gender interpretation reflects the collected party-support context',()=>{
  const democratic=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1');
  const conservative=buildIntelligenceDraft({...person,party:'국민의힘'},raw,context,'JCS_INTELLIGENCE_V1');
  assert.notDeepEqual(democratic.cohorts,conservative.cohorts);
  assert.ok(democratic.cohorts[0].female>conservative.cohorts[0].female);
  assert.ok(conservative.cohorts.at(-1).male>democratic.cohorts.at(-1).male);
});

test('a cloned age by gender vector is rejected before publication',()=>{
  const draft=structuredClone(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1'));
  draft.cohorts=draft.cohorts.map(row=>({...row,male:9,female:9}));
  const validation=validateIntelligenceDraft(draft);
  assert.equal(validation.ok,false);
  assert.ok(validation.errors.includes('COHORT_VECTOR_CLONED'));
});

test('every approved public and private chapter is populated from the draft contract',()=>{
  const draft=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1');
  for(const key of ['signal','core','audience','activity','media','transition','diagnosis','cohorts','support','resilience','mediaScores','issues','risks','opportunities','competitors','strategies','conclusion','activities','achievements','policies','news','sources','related'])assert.ok(draft[key],key);
  assert.equal(draft.core.length,6);
  assert.equal(draft.strategies.length,8);
  assert.equal(draft.sources.every(source=>source.url&&source.type),true);
  assert.equal(draft.interpretationLabel,'JCS 해석');
  assert.equal(JSON.stringify(draft).includes('fallback'),false);
});

test('snapshot validation requires every expected politician exactly once',()=>{
  const draft=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1');
  assert.equal(validateSnapshot([draft],[person.id]).ok,true);
  const invalid=validateSnapshot([draft],[person.id,'assembly-999']);
  assert.equal(invalid.ok,false);
  assert.deepEqual(invalid.missingIds,['assembly-999']);
});

test('stored intelligence keeps only current rendering inputs and compact ranking inputs',()=>{
  const full=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V1');
  const stored=compactIntelligenceDraft(full);
  assert.equal(stored.storageMode,'INPUT_ONLY_V5');
  assert.equal(stored.input.news.items.length,3);
  assert.deepEqual(stored.input.searchAds,{volume:{pc:1500,mobile:10000,total:11500}});
  assert.deepEqual(stored.rankingInput,{searchTotal:11500,articleCount:3,sourceCount:3,latestPublishedAt:'2026-09-02T00:00:00.000Z',searchStatus:'DIRECT',newsStatus:'DIRECT'});
  assert.ok(JSON.stringify(stored).length<JSON.stringify(full).length);
  assert.equal(stored.diagnoses,undefined);
  assert.equal(stored.prescriptions,undefined);
  assert.equal(stored.cohorts,undefined);
  assert.ok(JSON.stringify(stored).length<5000);
});

test('compact storage bounds article descriptions and remains a single reconstructable record',()=>{
  const oversized=structuredClone(raw);
  oversized.news.items=Array.from({length:30},(_,index)=>({...raw.news.items[index%3],title:`${index} ${raw.news.items[index%3].title}`,description:'정책 근거 '.repeat(300)}));
  const stored=compactIntelligenceDraft(buildIntelligenceDraft(person,oversized,context,'JCS_INTELLIGENCE_V3'));
  assert.equal(stored.input.news.items.length,10);
  assert.equal(stored.rankingInput.articleCount,30);
  assert.equal(stored.rankingInput.sourceCount,3);
  assert.equal(stored.input.news.items.every(row=>row.description.length<=360),true);
  assert.equal(stored.storageMode,'INPUT_ONLY_V5');
  assert.ok(JSON.stringify(stored).length<15000);
});
