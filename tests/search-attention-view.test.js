import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSearchAttention} from '../src/views/search-attention-view.js';

const ready={
  status:'ready',
  target:{
    id:'assembly-001',name:'김민석',party:'더불어민주당',type:'assembly',
    newsCount:37,searchCount:12840,pc:1840,mobile:11000,
    newsAt:'2026-09-11T16:20:00.000Z',searchAt:'2026-09-12T16:00:00.000Z',referenceAt:'2026-09-12T16:00:00.000Z',
    newsRank:2,searchRank:3,newsTied:true,searchTied:false,x:100,y:0
  },
  category:'search',
  headline:'보도 순위보다 검색 순위가 앞선 관심 흐름입니다.',
  cohort:{label:'국회의원',size:6,from:'2026-09-10T16:00:00.000Z',to:'2026-09-12T16:00:00.000Z',partial:false},
  points:[
    {id:'assembly-002',name:'동료 의원',newsCount:28,searchCount:7600,newsRank:3,searchRank:4,x:48,y:62},
    {id:'assembly-001',name:'김민석',newsCount:37,searchCount:12840,newsRank:2,searchRank:3,x:100,y:0}
  ],
  peers:[
    {kind:'more-search',label:'보도량은 비슷한데 검색이 많은',person:{id:'assembly-002',name:'동료 의원',party:'국민의힘',newsCount:28,searchCount:7600,newsRank:3,searchRank:4,newsTied:true,searchTied:false}}
  ]
};

test('returns no markup when attention data is absent',()=>{
  assert.equal(renderSearchAttention(null),'');
});

test('renders the selected person first with actual monthly metrics, ranks, dates, and an accessible position chart',()=>{
  const html=renderSearchAttention(ready);
  assert.match(html,/월간 관심도/);
  assert.match(html,/보도 순위보다 검색 순위가 앞선 관심 흐름입니다/);
  assert.match(html,/12,840/);
  assert.match(html,/12,840<em[^>]*>회<\/em>/);
  assert.match(html,/37/);
  assert.match(html,/37<em[^>]*>건<\/em>/);
  assert.match(html,/공동 2위/);
  assert.match(html,/검색 순위[^<]*3위/);
  assert.match(html,/2026\.09\.12/);
  assert.match(html,/2026\.09\.13/);
  assert.match(html,/수집 기준일 2026\.09\.11 – 2026\.09\.13/);
  assert.match(html,/<svg[^>]*role="img"[^>]*aria-labelledby=/);
  assert.match(html,/가로축은 보도 순위의 상대 위치/);
  assert.match(html,/세로축은 검색 순위의 상대 위치/);
  assert.match(html,/>보도 순위 위치 →<\/text>/);
  assert.match(html,/>검색 순위 위치 →<\/text>/);
  assert.match(html,/<text x="58" y="39">검색 쪽<\/text>/);
  assert.match(html,/<text x="382" y="180" text-anchor="end">보도 쪽<\/text>/);
  assert.match(html,/data-attention-point="target"/);
  assert.match(html,/>김민석<\/text>/);
});

test('renders faint cohort points separately from the selected purple and gold target point',()=>{
  const html=renderSearchAttention(ready);
  assert.match(html,/data-attention-point="peer"[^>]*class="attention-point-peer"/);
  assert.match(html,/data-attention-point="target"[^>]*class="attention-point-target"/);
  assert.match(html,/class="attention-point-ring"/);
  assert.match(html,/class="attention-point-core"/);
});

test('shows counts and an honest explanation when the cohort is insufficient',()=>{
  const html=renderSearchAttention({
    ...ready,status:'insufficient',category:undefined,
    headline:'비교 가능한 국회의원이 아직 충분하지 않습니다.',
    target:{...ready.target,newsRank:null,searchRank:null,x:null,y:null},
    cohort:{...ready.cohort,size:3,partial:true},points:[],peers:ready.peers
  });
  assert.match(html,/비교 가능한 국회의원이 아직 충분하지 않습니다/);
  assert.match(html,/비교 인원 3명/);
  assert.match(html,/보도 수집 일부 제한/);
  assert.match(html,/12,840/);
  assert.match(html,/37/);
  assert.match(html,/비교 가능한 같은 직군 4명/);
  assert.match(html,/일부 보도 수집에 누락·응답 제한 또는 확인되지 않은 구간/);
  assert.doesNotMatch(html,/범위값/);
  assert.doesNotMatch(html,/<svg/);
  assert.doesNotMatch(html,/attention-related/);
  assert.doesNotMatch(html,/>0위</);
});

test('escapes all supplied text and safely encodes local navigation URLs',()=>{
  const unsafe={
    ...ready,
    headline:'<img src=x onerror=alert(1)>',
    target:{...ready.target,id:'id&1',name:'<김 & 민석>',party:'당\" onclick=\"alert(1)'},
    points:[],
    peers:[{kind:'similar',label:'<비슷 & 함>',person:{id:'peer/2?x=1',name:'동료 & 의원',party:'<당>',newsCount:35,searchCount:12000,newsRank:2,searchRank:2}}]
  };
  const html=renderSearchAttention(unsafe);
  assert.doesNotMatch(html,/<img/);
  assert.doesNotMatch(html,/onclick="/);
  assert.match(html,/&lt;김 &amp; 민석&gt;/);
  assert.match(html,/href="\/search\?q=%EB%8F%99%EB%A3%8C\+%26\+%EC%9D%98%EC%9B%90&amp;person=peer%2F2%3Fx%3D1"/);
  assert.match(html,/href="\/compare\?ids=id%261%2Cpeer%2F2%3Fx%3D1&amp;run=1"/);
});

test('gives every related card a search destination and a direct compare destination',()=>{
  const html=renderSearchAttention(ready);
  assert.match(html,/href="\/search\?q=%EB%8F%99%EB%A3%8C\+%EC%9D%98%EC%9B%90&amp;person=assembly-002"/);
  assert.match(html,/href="\/compare\?ids=assembly-001%2Cassembly-002&amp;run=1"/);
  assert.match(html,/동료 의원 검색 결과 보기/);
  assert.match(html,/김민석과 비교하기/);
  assert.match(html,/보도 순위<\/dt><dd>공동 3위/);
  assert.match(html,/검색 순위<\/dt><dd>4위/);
});

test('explains that metric counts and plotted rank positions have different bases',()=>{
  const html=renderSearchAttention(ready);
  assert.match(html,/<details[^>]*class="attention-basis"/);
  assert.match(html,/네이버 월간 PC \+ 모바일 검색량/);
  assert.match(html,/수집 시점 기준 최근 30일 기사 수/);
  assert.match(html,/점의 위치는 같은 직군 안의 순위 상대 위치/);
  assert.match(html,/동률 중간 순위의 백분위 위치/);
  assert.match(html,/50 중간선/);
  assert.match(html,/합성 점수가 아닙니다/);
  assert.match(html,/수집 시각이 대상과 각각 48시간 이내/);
  assert.match(html,/키워드 검색 횟수이며 검색한 사람 수가 아닙니다/);
  assert.match(html,/포털 경유 등 원언론사 미확인 기사도 포함/);
  assert.match(html,/언론사별 분석에서는 제외/);
  assert.match(html,/의미가 불명확한 0과 범위 검색량은 비교에서 제외/);
  assert.match(html,/지지나 반대를 뜻하지 않습니다/);
});
