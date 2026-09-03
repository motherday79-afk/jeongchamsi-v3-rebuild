import test from 'node:test';
import assert from 'node:assert/strict';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';

const people=Array.from({length:5},(_,index)=>({id:`assembly-${index+101}`,type:'assembly',roleLabel:'국회의원',name:`비교정치인${index+1}`,party:index%2?'국민의힘':'더불어민주당',jurisdiction:`서울 비교구${index+1}`,office:'국회의원',photo:{localPath:`/assets/politicians/assembly-${index+101}.jpg`,focus:'50% 28%'}}));
const legacyReportFor=(person,index)=>({
  id:person.id,snapshot:'2026-09-03',rank:{overall:index+3,category:index+2},currentRole:'국회의원',
  signal:{label:`${person.name} 브랜드`,summary:`${person.name} 현재 브랜드 진단`},core:[{label:'관심도',score:80-index}],
  audience:{position:60-index,label:'관심 구조',summary:'세대 반응 관측'},cohorts:[{age:'40대',male:70-index,female:68-index}],
  media:[{label:'뉴스 노출',score:75-index,desc:'최근 뉴스 흐름'}],issues:[{title:'민생 정책',impact:72-index}],
  competitors:[{name:'직접 경쟁자',score:67-index,note:'동일 지역'}],support:{core:71-index},resilience:{index:69-index},
  diagnosis:{title:'현재 위치 진단',body:'실제 공개 근거 기반 해석'},risks:['관리 위험'],opportunities:['활용 기회'],
  strategies:[{title:'핵심 메시지 설계',body:'검증된 메시지 방향'},{title:'실행 우선순위',body:'30일 재측정'}],
  conclusion:'근거 기반 전략 판단',policies:['민생 정책'],activities:['공식 활동'],achievements:['공식 기록'],news:[],related:[],trend:[60-index,70-index,80-index],
  sources:[{type:'Google 뉴스',title:'최근 보도',detail:'공개 보도',grade:'DIRECT',url:'https://news.google.com/'}]
});
const reportFor=(person,index)=>{const legacy=legacyReportFor(person,index);return {...buildIntelligenceDraft(person,{snapshotId:'2026-09-03',collectedAt:'2026-09-03T00:00:00.000Z',searchAds:{volume:{pc:200+index*20,mobile:500-index*15}},news:{items:[{title:`${person.name} 민생 정책 지역 현장 발표`,source:`뉴스${index+1}`,publishedAt:'2026-09-02'}]},sourceErrors:[]},{peers:people},'JCS_INTELLIGENCE_V2'),rank:legacy.rank};};

const serviceFor=tier=>({
  async search(query){return {ok:true,items:people.filter(person=>person.name.includes(query)||person.party.includes(query))};},
  async get(id){const item=people.find(person=>person.id===id);return item?{ok:true,item}:{ok:false,error:'NOT_FOUND'};},
  async getForCompare(id){const index=people.findIndex(person=>person.id===id),item=people[index];return item?{ok:true,item,intelligence:projectIntelligence(reportFor(item,index),tier,'compare')}:{ok:false,error:'NOT_FOUND'};}
});

test('guest comparison waits for the button then renders only 01 07 09 for two people',async()=>{
  const waiting=await renderPoliticianCompare(serviceFor('public'),'/compare?ids=assembly-101,assembly-102',null);
  assert.doesNotMatch(waiting,/data-comparison-topic/);
  const html=await renderPoliticianCompare(serviceFor('public'),'/compare?ids=assembly-101,assembly-102&run=1',null);
  assert.match(html,/data-compare-limit="2"/);
  assert.deepEqual([...html.matchAll(/data-comparison-topic="(\d{2})"/g)].map(match=>match[1]),['01','07','09']);
  assert.match(html,/로그인하고 상세 비교 보기/);
  assert.doesNotMatch(html,/핵심 원인|실행 처방|세대·성별 지지구조 분석/);
});

test('member comparison renders six interpreted topics for exactly two people',async()=>{
  const html=await renderPoliticianCompare(serviceFor('member'),'/compare?ids=assembly-101,assembly-102,assembly-103&run=1',{authenticated:true,user:{role:'member'}});
  assert.deepEqual([...html.matchAll(/data-comparison-topic="(\d{2})"/g)].map(match=>match[1]),['01','02','03','05','07','09']);
  assert.equal((html.match(/data-compare-matrix-profile=/g)||[]).length,2);
  assert.match(html,/정참시 비교 해석/);
  assert.doesNotMatch(html,/실행 처방|관리해야 할 위험|경쟁 대응 우선순위/);
});

test('administrator comparison caps selection at four and renders all ten topics with photo headers',async()=>{
  const ids=people.map(person=>person.id).join(',');
  const html=await renderPoliticianCompare(serviceFor('admin'),`/compare?ids=${ids}&run=1`,{authenticated:true,user:{role:'admin'}});
  assert.match(html,/data-compare-limit="4"/);
  assert.equal((html.match(/data-compare-selected=/g)||[]).length,4);
  assert.equal((html.match(/data-compare-matrix-profile=/g)||[]).length,4);
  assert.doesNotMatch(html,/data-compare-selected="assembly-105"/);
  assert.deepEqual([...html.matchAll(/data-comparison-topic="(\d{2})"/g)].map(match=>match[1]),['01','02','03','04','05','06','07','08','09','10']);
  for(let index=101;index<=104;index++)assert.match(html,new RegExp(`/assets/politicians/assembly-${index}\\.jpg`));
  for(const label of ['활용 가능한 기회','관리해야 할 위험','정참시 전략 판단','실행 처방','실행 우선순위'])assert.match(html,new RegExp(label));
  assert.equal((html.match(/data-prescription-topic=/g)||[]).length,10);
  assert.match(html,/진단 근거/);
  assert.equal((html.match(/data-competitor-response=/g)||[]).length,3);
  for(const label of ['공세 영역','방어 영역','회피 영역','단기 역전 가능 영역'])assert.match(html,new RegExp(label));
});

test('administrator target strategy produces one response card per selected rival for two three and four people',async()=>{
  for(const count of [2,3,4]){
    const ids=people.slice(0,count).map(person=>person.id).join(',');
    const html=await renderPoliticianCompare(serviceFor('admin'),`/compare?ids=${ids}&run=1&strategy=assembly-101`,{user:{role:'admin'}});
    assert.equal((html.match(/data-competitor-response=/g)||[]).length,count-1);
    for(let index=2;index<=count;index++)assert.match(html,new RegExp(`비교정치인${index}`));
  }
});

test('comparison cells use the same projected topic values as detail data',async()=>{
  const projected=projectIntelligence(reportFor(people[0],0),'member','detail');
  const html=await renderPoliticianCompare(serviceFor('member'),'/compare?ids=assembly-101,assembly-102&run=1',{user:{role:'member'}});
  assert.match(html,new RegExp(projected.diagnoses[0].currentPosition));
  assert.match(html,/정참시 비교 해석/);
});

test('administrator can change the strategy baseline politician',async()=>{
  const html=await renderPoliticianCompare(serviceFor('admin'),'/compare?ids=assembly-101,assembly-102&run=1&strategy=assembly-102',{user:{role:'admin'}});
  assert.match(html,/비교정치인2 기준 전략 처방/);
  assert.match(html,/class="active" data-layout-route="[^"]*strategy=assembly-102"/);
});

test('comparison search and removal routes remain usable after the matrix change',async()=>{
  const html=await renderPoliticianCompare(serviceFor('admin'),'/compare?ids=assembly-101&q=비교정치인',{user:{role:'admin'}});
  assert.match(html,/data-politician-autocomplete/);
  assert.match(html,/data-compare-add="assembly-102"/);
  assert.match(html,/data-compare-remove="assembly-101"/);
  assert.match(html,/정치인 이름·정당·지역 검색/);
});
