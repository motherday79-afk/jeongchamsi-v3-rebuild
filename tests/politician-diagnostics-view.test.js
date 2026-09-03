import test from 'node:test';
import assert from 'node:assert/strict';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';

const person={id:'assembly-091',type:'assembly',roleLabel:'국회의원',name:'김진단',party:'테스트당',jurisdiction:'서울 테스트구',terms:'2선',committee:'정무위원회',office:'국회의원',photo:{localPath:'/assets/politicians/assembly-091.jpg',focus:'50% 25%'}};
const legacyReport={
  id:person.id,snapshot:'2026-09-03',rank:{overall:11,category:7},currentRole:'국회의원',
  signal:{label:'민생 의제 상승',summary:'최근 민생 의제 관심이 상승했습니다.'},
  core:[{label:'관심도',score:73,desc:'최근 공개 관심 신호'}],
  audience:{position:62,label:'확장 구간',summary:'40대에서 상대적으로 강한 반응이 관측됩니다.'},
  cohorts:[{age:'20대',male:48,female:55},{age:'40대',male:74,female:71}],
  activity:[{label:'활동 강도',score:69}],media:[{label:'뉴스 노출',score:78,desc:'최근 뉴스 노출 상승'}],
  transition:[{label:'유입력',score:70}],diagnosis:{title:'대표 의제 집중 구간',body:'인지도 대비 대표 의제 선명도를 확인해야 합니다.'},
  issues:[{title:'민생 경제',impact:76}],competitors:[{name:'이비교',score:70,note:'동일 직군'}],
  support:{core:72,expand:61},resilience:{index:68},risks:['대표 의제 분산 위험'],opportunities:['민생 관심 확대'],
  strategies:[{title:'핵심 메시지 설계',body:'민생 의제를 중심으로 메시지를 정리합니다.'},{title:'실행 우선순위',body:'30일 이내 핵심 지표를 재측정합니다.'}],
  conclusion:'대표 의제 집중이 우선입니다.',policies:['민생 경제'],activities:['국회 정무위원회 활동'],achievements:['공식 의정 기록'],
  news:[{date:'2026-09-02',source:'테스트뉴스',title:'민생 정책 발표',url:'https://example.com/news'}],
  sources:[{type:'Google 뉴스',title:'최근 보도',detail:'1건',grade:'DIRECT',url:'https://news.google.com/'},{type:'공식 프로필',title:'국회 프로필',detail:'서울 테스트구',grade:'DIRECT',url:'https://assembly.go.kr/'}],related:[],trend:[65,69,73],trendSummary:'최근 공개 관심 흐름'
};
const report={...buildIntelligenceDraft(person,{snapshotId:'2026-09-03',collectedAt:'2026-09-03T00:00:00.000Z',searchAds:{volume:{pc:240,mobile:620}},news:{items:legacyReport.news.map(row=>({title:row.title,source:row.source,publishedAt:row.date,url:row.url}))},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V2'),rank:legacyReport.rank,activities:legacyReport.activities,achievements:legacyReport.achievements,policies:legacyReport.policies};

const serviceFor=tier=>({async get(){return {ok:true,item:person,intelligence:projectIntelligence(report,tier,'detail')};}});

test('guest detail renders one compact 01 07 09 snapshot and a login entry only',async()=>{
  const html=await renderPoliticianDetail(person.id,serviceFor('public'),null);
  assert.match(html,/JCS OPEN POLITICAL SNAPSHOT/);
  assert.match(html,/정참시 정치인 현재 진단/);
  assert.deepEqual([...html.matchAll(/data-diagnostic-topic="(\d{2})"/g)].map(match=>match[1]),['01','07','09']);
  assert.equal((html.match(/class="jcs-diagnostic-topic/g)||[]).length,3);
  assert.match(html,/로그인하고 상세 분석 보기/);
  assert.equal((html.match(/>핵심 사건</g)||[]).length,1);
  assert.equal((html.match(/jcs-diagnostic-spark/g)||[]).length,1);
  assert.match(html,/정치적 의미/);
  assert.doesNotMatch(html,/핵심 원인|실행 처방|실행 우선순위|예상 변화 및 추적 지표/);
});

test('member detail renders the exact six analysis modules without administrator prescriptions',async()=>{
  const html=await renderPoliticianDetail(person.id,serviceFor('member'),{authenticated:true,user:{role:'member'}});
  assert.match(html,/JCS MEMBER POLITICAL ANALYSIS/);
  assert.deepEqual([...html.matchAll(/data-diagnostic-topic="(\d{2})"/g)].map(match=>match[1]),['01','02','03','05','07','09']);
  for(const label of ['현재 평가','핵심 사건','변화 원인','과거와 현재','핵심 수치','최근 변화','비교 기준','정참시 해석','데이터 기준일 및 출처'])assert.match(html,new RegExp(label));
  for(const label of ['핵심 사건','변화 원인','과거와 현재','최근 변화'])assert.equal((html.match(new RegExp(`>${label}<`,'g'))||[]).length,1);
  assert.equal((html.match(/>서브데이터</g)||[]).length,0);
  assert.doesNotMatch(html,/핵심 원인|실행 처방|즉시 실행|90일 이내 실행/);
});

test('administrator detail renders all ten compact intelligence report modules',async()=>{
  const html=await renderPoliticianDetail(person.id,serviceFor('admin'),{authenticated:true,user:{role:'admin'}});
  assert.match(html,/JCS ADMIN POLITICAL INTELLIGENCE/);
  assert.deepEqual([...html.matchAll(/data-diagnostic-topic="(\d{2})"/g)].map(match=>match[1]),['01','02','03','04','05','06','07','08','09','10']);
  for(const label of ['핵심 사건','정치적 의미','변화 원인','과거와 현재','서브데이터','현재 위치','변화 흐름','근거 데이터','기회 요인','위험 요인','진단 근거','정참시 전략 판단','실행 처방','실행 우선순위','예상 변화 및 추적 지표'])assert.match(html,new RegExp(label));
  assert.equal((html.match(/>과거와 현재</g)||[]).length,1);
  assert.equal((html.match(/>핵심 사건</g)||[]).length,1);
  assert.equal((html.match(/>변화 원인</g)||[]).length,1);
  assert.equal((html.match(/>변화 흐름</g)||[]).length,1);
  assert.equal((html.match(/>근거 데이터</g)||[]).length,1);
  assert.equal((html.match(/>서브데이터</g)||[]).length,1);
  assert.equal((html.match(/>비교 기준</g)||[]).length,0);
  assert.equal((html.match(/>분석 기준</g)||[]).length,0);
  const topic01=html.slice(html.indexOf('data-diagnostic-topic="01"'),html.indexOf('data-diagnostic-topic="02"'));
  const topic06=html.slice(html.indexOf('data-diagnostic-topic="06"'),html.indexOf('data-diagnostic-topic="07"'));
  assert.match(topic01,/>과거와 현재</);
  assert.match(topic01,/>근거 데이터</);
  assert.match(topic06,/>서브데이터</);
  assert.equal((html.match(/data-prescription-topic=/g)||[]).length,10);
  assert.equal((html.match(/JCS ST 해석 · 뉴스 헤드라인, 공식 이력, 선거·지역·정당 구조와 검색 반응을 종합한 정참시 자체 분석입니다\./g)||[]).length,1);
  assert.ok(html.indexOf('PART 01')<html.indexOf('PART 02'));
  assert.equal((html.match(/대표 뉴스는 핵심 이슈 주제에서 벗어난 관련 기사 집계를 의미합니다\./g)||[]).length,1);
});

test('diagnostics preserve profile photo and record sections for every role',async()=>{
  for(const [tier,session] of [['public',null],['member',{user:{role:'member'}}],['admin',{user:{role:'admin'}}]]){
    const html=await renderPoliticianDetail(person.id,serviceFor(tier),session);
    assert.match(html,/\/assets\/politicians\/assembly-091\.jpg/);
    assert.match(html,/공식 프로필과 정치 기록/);
    assert.match(html,/정치 타임라인/);
    assert.match(html,/공약 · 정책/);
  }
});

test('an administrator sees stable complete structural cards with sparse source input',async()=>{
  const sparse=buildIntelligenceDraft(person,{snapshotId:'2026-09-03',collectedAt:'2026-09-03T00:00:00.000Z',news:{items:[]},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V2');
  const service={async get(){return {ok:true,item:person,intelligence:projectIntelligence(sparse,'admin','detail')};}};
  const html=await renderPoliticianDetail(person.id,service,{user:{role:'admin'}});
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,10);
  assert.equal((html.match(/data-prescription-topic=/g)||[]).length,10);
  assert.doesNotMatch(html,/데이터 부족|분석 준비 중|분석 불가|판단 불가|비교 불가|알 수 없음|추가 데이터 필요|N\/A|TODO|TBD|추후 제공/);
});
