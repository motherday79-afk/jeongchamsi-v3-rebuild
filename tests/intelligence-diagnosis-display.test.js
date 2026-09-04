import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { projectIntelligence } from '../lib/intelligence-access.js';

const person={id:'assembly-display',type:'assembly',roleLabel:'국회의원',name:'김진단',party:'더불어민주당',region:'서울',jurisdiction:'서울 진단구',terms:'재선',committee:'정무위원회',office:'제22대 국회의원',electionLabel:'제22대 국회의원 당선'};
const raw={snapshotId:'jcs-display',collectedAt:'2026-09-04T00:00:00.000Z',searchAds:{volume:{pc:2400,mobile:7600}},news:{items:[
  {title:'김진단 청년 주거 정책 발표 - 연합뉴스',source:'연합뉴스',url:'https://example.com/a',publishedAt:'2026-09-04T00:00:00.000Z'},
  {title:'김진단 지역 예산 확보 성과',source:'KBS',url:'https://example.com/b',publishedAt:'2026-09-03T00:00:00.000Z'},
  {title:'김진단 과거 발언 논란 재점화',source:'MBC',url:'https://example.com/c',publishedAt:'2026-08-20T00:00:00.000Z'},
  {title:'김진단 주거 법안 비판 확산',source:'SBS',url:'https://example.com/d',publishedAt:'2026-07-10T00:00:00.000Z'}
]},sourceErrors:[]};
const context={peers:[
  {id:'r1',name:'이경쟁',type:'assembly',party:'더불어민주당',region:'서울',jurisdiction:'서울 진단구',terms:'3선',office:'국회의원'},
  {id:'r2',name:'박경쟁',type:'assembly',party:'국민의힘',region:'서울',terms:'초선',office:'국회의원'},
  {id:'r3',name:'최경쟁',type:'assembly',party:'무소속',region:'경기',terms:'재선',office:'국회의원'},
  {id:'r4',name:'정경쟁',type:'assembly',party:'더불어민주당',region:'부산',terms:'4선',office:'국회의원'}
],ageSex:[
  {age:'20대',maleShare:49,femaleShare:51},{age:'30대',maleShare:50,femaleShare:50},{age:'40대',maleShare:51,femaleShare:49},{age:'50대',maleShare:49,femaleShare:51},{age:'60대 이상',maleShare:46,femaleShare:54}
]};

test('administrator diagnoses expose ten distinct approved display contracts',()=>{
  const report=buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3');
  const diagnoses=projectIntelligence(report,'admin','detail').diagnoses;
  assert.deepEqual(diagnoses.map(row=>row.display?.kind),['brand','demographic','local','support','competitor','risk','media','campaign','policy','summary']);
  assert.equal(diagnoses[9].title,'JCS 종합해석');
});

test('demographic age totals sum to one hundred and each age splits male and female to one hundred',()=>{
  const report=projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const demographic=report.diagnoses.find(row=>row.id==='02').display;
  const support=report.diagnoses.find(row=>row.id==='04').display;
  assert.equal(demographic.cohorts.reduce((sum,row)=>sum+row.total,0),100);
  assert.equal(demographic.cohorts.every(row=>row.male+row.female===100),true);
  assert.equal(support.composition.reduce((sum,row)=>sum+row.value,0),100);
  assert.deepEqual(support.composition.map(row=>row.key),['core','floating','exit']);
  assert.deepEqual(support.composition.map(row=>row.label),['코어','유동','이탈']);
});

test('competitor comparison is capped at three and campaign keeps verified profile history without inventing vote values',()=>{
  const report=projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const competitor=report.diagnoses.find(row=>row.id==='05').display;
  const campaign=report.diagnoses.find(row=>row.id==='08').display;
  assert.equal(competitor.people.length,4);
  assert.equal(competitor.people[0].name,'김진단');
  assert.equal(new Set(competitor.people.slice(1).map(row=>row.name)).size,3);
  assert.equal(campaign.elections.length,1);
  assert.equal(campaign.elections[0].election,'제22대 국회의원 당선');
  assert.equal(campaign.elections[0].voteRate,null);
  assert.equal(campaign.elections[0].margin,null);
});

test('official election rows derive the vote margin and regional classification from recorded values',()=>{
  const officialPerson={...person,elections:[{year:'2024',election:'제22대 국회의원선거',voteRate:'53.2%',opponent:'이경쟁',opponentRate:'45.1%',regions:[{name:'진단1동',voteRate:55,opponentRate:40},{name:'진단2동',voteRate:48,opponentRate:50}]}]};
  const report=projectIntelligence(buildIntelligenceDraft(officialPerson,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const campaign=report.diagnoses.find(row=>row.id==='08').display;
  assert.equal(campaign.elections[0].margin,8.1);
  assert.equal(campaign.elections[0].regions[0].status,'우세');
  assert.equal(campaign.elections[0].regions[1].status,'경합');
});

test('collected official election context feeds both competitor and campaign displays',()=>{
  const official={elections:[{year:'2024',election:'제22대 국회의원선거',voteRate:54.7,opponent:'이경쟁',opponentRate:43.2,regions:[{name:'진단1동',voteRate:58,opponentRate:40}]}]};
  const report=projectIntelligence(buildIntelligenceDraft(person,raw,{...context,officialElection:official},'JCS_INTELLIGENCE_V3'),'admin','detail');
  const competitor=report.diagnoses.find(row=>row.id==='05').display;
  const campaign=report.diagnoses.find(row=>row.id==='08').display;
  assert.equal(campaign.elections[0].voteRate,54.7);
  assert.equal(campaign.elections[0].margin,11.5);
  assert.equal(competitor.people[0].election.voteRate,54.7);
});

test('brand past risk signals link only to observed negative news evidence',()=>{
  const report=projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const brand=report.diagnoses.find(row=>row.id==='01').display;
  assert.ok(brand.pastRisks.length>=1&&brand.pastRisks.length<=5);
  assert.equal(brand.pastRisks.every(row=>row.tag.startsWith('#')&&row.url),true);
  assert.match(brand.nowSignal,/김진단/);
  assert.doesNotMatch(brand.nowSignal,/연합뉴스$/);
});

test('local diagnosis excludes national coverage that has no district evidence',()=>{
  const localRaw={...raw,news:{items:[
    {title:'김진단 서울 진단구 지역 예산 확보',source:'지역신문',url:'https://example.com/local',publishedAt:'2026-09-04T00:00:00.000Z'},
    {title:'김진단 국회 외교 정책 발표',source:'전국신문',url:'https://example.com/national',publishedAt:'2026-09-03T00:00:00.000Z'}
  ]}};
  const report=projectIntelligence(buildIntelligenceDraft(person,localRaw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const local=report.diagnoses.find(row=>row.id==='03').display;
  assert.equal(local.issues.reduce((sum,row)=>sum+row.count,0),1);
  assert.equal(local.messageFit.length,1);
  assert.equal(local.issues[0].evidence[0].url,'https://example.com/local');
  assert.match(local.issues[0].evidence[0].title,/지역 예산 확보/);
  assert.equal(local.messageFit[0].gap,Math.abs(local.messageFit[0].localShare-local.messageFit[0].messageShare));
});

test('RSS publication dates are normalized before 24H 7D and 30D windows are counted',()=>{
  const rssRaw={...raw,news:{items:[
    {title:'김진단 지역 정책 발표',source:'연합뉴스',url:'https://example.com/rss-a',publishedAt:'Fri, 04 Sep 2026 00:00:00 GMT'},
    {title:'김진단 경제 법안 제안',source:'KBS',url:'https://example.com/rss-b',publishedAt:'Thu, 03 Sep 2026 00:00:00 GMT'}
  ]}};
  const report=projectIntelligence(buildIntelligenceDraft(person,rssRaw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const brand=report.diagnoses.find(row=>row.id==='01').display;
  const risk=report.diagnoses.find(row=>row.id==='06').display;
  assert.deepEqual(brand.news.map(row=>row.value),[2,2,2]);
  assert.deepEqual(risk.velocity.map(row=>row.value),[2,2,2]);
  assert.equal(risk.persistence.durationDays>=1,true);
  assert.equal(typeof risk.persistence.reignitionCount,'number');
});

test('policy rows expose an explicit current stage index',()=>{
  const report=projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const policy=report.diagnoses.find(row=>row.id==='09').display;
  assert.equal(policy.policies.every(row=>Number.isInteger(row.stageIndex)&&row.stageIndex>=0&&row.stageIndex<=5),true);
});

test('local diagnosis exposes official electorate structure from the collected population context',()=>{
  const report=projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const local=report.diagnoses.find(row=>row.id==='03').display;
  assert.equal(local.population.length,5);
  assert.deepEqual(local.population[0],{age:'20대',maleShare:49,femaleShare:51});
  assert.equal(local.populationBasis,'광역 연령·성별 인구 구조');
});

test('policy diagnosis uses retained supplemental evidence as observed policy rows',()=>{
  const supplemental={...raw,news:{items:raw.news.items,evidenceItems:[
    {title:'김진단 청년 주거 공약 예산 300억원 추진',source:'정책뉴스',url:'https://example.com/policy',publishedAt:'2026-09-02T00:00:00.000Z'}
  ]}};
  const report=projectIntelligence(buildIntelligenceDraft(person,supplemental,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const policy=report.diagnoses.find(row=>row.id==='09').display;
  assert.ok(policy.policies.some(row=>row.name.includes('청년 주거 공약')));
});

test('policy diagnosis excludes party creation and dissolution coverage without a policy action',()=>{
  const nonPolicy={...raw,news:{items:[
    {title:"'김진단 창당' 소나무당 공식 해산…선관위 공고로 활동 마무리",source:'정치뉴스',url:'https://example.com/dissolve',publishedAt:'2026-09-04T00:00:00.000Z'},
    {title:'김진단 청년 주거 공약 예산안 발의',source:'정책뉴스',url:'https://example.com/policy-real',publishedAt:'2026-09-03T00:00:00.000Z'}
  ]}};
  const report=projectIntelligence(buildIntelligenceDraft(person,nonPolicy,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  const policy=report.diagnoses.find(row=>row.id==='09').display;
  assert.equal(policy.policies.some(row=>/해산|창당/.test(row.name)),false);
  assert.equal(policy.policies.some(row=>/주거 공약/.test(row.name)),true);
});
