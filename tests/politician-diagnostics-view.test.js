import test from 'node:test';
import assert from 'node:assert/strict';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';

const person={id:'assembly-091',type:'assembly',roleLabel:'국회의원',name:'김진단',party:'테스트당',jurisdiction:'서울 테스트구',terms:'2선',committee:'정무위원회',office:'국회의원',photo:{localPath:'/assets/politicians/assembly-091.jpg',focus:'50% 25%'}};
const report={
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

const serviceFor=tier=>({async get(){return {ok:true,item:person,intelligence:projectIntelligence(report,tier,'detail')};}});

test('guest detail renders one compact 01 07 09 snapshot and a login entry only',async()=>{
  const html=await renderPoliticianDetail(person.id,serviceFor('public'),null);
  assert.match(html,/JCS OPEN POLITICAL SNAPSHOT/);
  assert.match(html,/정참시 정치인 현재 진단/);
  assert.deepEqual([...html.matchAll(/data-diagnostic-topic="(\d{2})"/g)].map(match=>match[1]),['01','07','09']);
  assert.equal((html.match(/class="jcs-diagnostic-topic/g)||[]).length,3);
  assert.match(html,/로그인하고 상세 분석 보기/);
  assert.doesNotMatch(html,/핵심 원인|실행 처방|실행 우선순위|예상 변화 및 추적 지표/);
});

test('member detail renders the exact six analysis modules without administrator prescriptions',async()=>{
  const html=await renderPoliticianDetail(person.id,serviceFor('member'),{authenticated:true,user:{role:'member'}});
  assert.match(html,/JCS MEMBER POLITICAL ANALYSIS/);
  assert.deepEqual([...html.matchAll(/data-diagnostic-topic="(\d{2})"/g)].map(match=>match[1]),['01','02','03','05','07','09']);
  for(const label of ['현재 평가','핵심 수치','최근 변화','비교 기준','정참시 해석','데이터 기준일 및 출처'])assert.match(html,new RegExp(label));
  assert.doesNotMatch(html,/핵심 원인|실행 처방|즉시 실행|90일 이내 실행/);
});

test('administrator detail renders all ten compact intelligence report modules',async()=>{
  const html=await renderPoliticianDetail(person.id,serviceFor('admin'),{authenticated:true,user:{role:'admin'}});
  assert.match(html,/JCS ADMIN POLITICAL INTELLIGENCE/);
  assert.deepEqual([...html.matchAll(/data-diagnostic-topic="(\d{2})"/g)].map(match=>match[1]),['01','02','03','04','05','06','07','08','09','10']);
  for(const label of ['현재 위치','변화 흐름','근거 데이터','비교 기준','핵심 원인','기회 요인','위험 요인','정참시 전략 판단','실행 처방','실행 우선순위','예상 변화 및 추적 지표'])assert.match(html,new RegExp(label));
  assert.match(html,/민생 의제를 중심으로 메시지를 정리합니다/);
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

test('an administrator sees stable insufficient-data cards without generated values',async()=>{
  const service={async get(){return {ok:true,item:person,intelligence:projectIntelligence({id:person.id,snapshot:'2026-09-03'},'admin','detail')};}};
  const html=await renderPoliticianDetail(person.id,service,{user:{role:'admin'}});
  assert.equal((html.match(/data-diagnostic-status="insufficient"/g)||[]).length,10);
  assert.match(html,/분석 준비 중|비교 가능한 데이터 부족|해당 기간 데이터 없음/);
  assert.doesNotMatch(html,/data-generated-value/);
});
