import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNewsHeadlines } from '../lib/intelligence-headlines.js';

const person={id:'assembly-001',name:'김민석',party:'더불어민주당',region:'서울',jurisdiction:'서울 영등포구 을',office:'더불어민주당 당대표'};
const rows=[
  {title:'김민석, 민생경제 정책 발표',source:'연합뉴스',url:'https://news/1',publishedAt:'2026-09-03T09:00:00Z'},
  {title:'[속보] 김민석 민생경제 정책 발표 - 연합뉴스',source:'연합뉴스',url:'https://news/1-copy',publishedAt:'2026-09-03T08:50:00Z'},
  {title:'김민석 영등포 주거 현장 방문',source:'MBC',url:'https://news/2',publishedAt:'2026-09-02T09:00:00Z'},
  {title:'김민석 당내 통합 강조',source:'KBS',url:'https://news/3',publishedAt:'2026-09-01T09:00:00Z'},
  {title:'김민석 경제 법안 추진',source:'연합뉴스',url:'https://news/4',publishedAt:'2026-08-31T09:00:00Z'},
  {title:'김민석 청년 일자리 공약',source:'SBS',url:'https://news/5',publishedAt:'2026-08-28T09:00:00Z'},
  {title:'김민석 발언 논란 확산',source:'JTBC',url:'https://news/6',publishedAt:'2026-08-27T09:00:00Z'},
  {title:'김민석 국방 안보 정책 제안',source:'YTN',url:'https://news/7',publishedAt:'2026-08-20T09:00:00Z'},
  {title:'김민석 지역 예산 확보',source:'한겨레',url:'https://news/8',publishedAt:'2026-08-18T09:00:00Z'},
  {title:'김민석 지도부 인선 발표',source:'경향신문',url:'https://news/9',publishedAt:'2026-08-17T09:00:00Z'},
  {title:'김민석 총선 전략 공개',source:'한국일보',url:'https://news/10',publishedAt:'2026-08-16T09:00:00Z'},
  {title:'김민석 소상공인 지원 확대',source:'서울신문',url:'https://news/11',publishedAt:'2026-08-15T09:00:00Z'},
  {title:'김민석 외교 행보',source:'연합뉴스',url:'https://news/12',publishedAt:'2026-08-14T09:00:00Z'}
];

test('headline analysis removes duplicate events and returns at most ten representative articles',()=>{
  const result=analyzeNewsHeadlines(person,rows);
  assert.equal(result.items.length,10);
  assert.equal(result.items.filter(item=>/민생경제 정책 발표/.test(item.title)).length,1);
  assert.equal(result.items.every(item=>item.id&&item.agendaTag&&item.frame&&item.diagnosisRefs.length),true);
  assert.ok(Math.max(...Object.values(Object.groupBy(result.items,item=>item.source)).map(items=>items.length))<=2);
});

test('headline analysis turns titles into agenda frame and diagnosis signals instead of a link list',()=>{
  const result=analyzeNewsHeadlines(person,rows);
  assert.equal(result.topics[0].label,'민생·경제');
  assert.ok(result.topics.slice(0,3).some(topic=>topic.label==='지역·현장'));
  assert.ok(result.risingTopics.length>0);
  assert.match(result.mediaImage,/민생·경제/);
  assert.match(result.narratives.days30,/김민석/);
  assert.match(result.narratives.days90,/뉴스 서사/);
  assert.ok(result.items.find(item=>/논란/.test(item.title)).diagnosisRefs.includes('06'));
  assert.ok(result.items.find(item=>/주거 현장/.test(item.title)).diagnosisRefs.includes('03'));
});

test('headline analysis is deterministic and uses structural context when news is sparse',()=>{
  const first=analyzeNewsHeadlines(person,[]),second=analyzeNewsHeadlines(person,[]);
  assert.deepEqual(first,second);
  assert.equal(first.items.length,0);
  assert.match(first.mediaImage,/당대표|영등포|더불어민주당/);
  assert.ok(first.topics.length>=1);
  assert.doesNotMatch(JSON.stringify(first),/데이터 부족|분석 준비 중|N\/A|TODO|TBD/);
});

test('headline intelligence identifies the dominant event before judging whether attention is an asset or burden',()=>{
  const crisisRows=[
    {title:'김민석 발언 논란 확산',source:'A뉴스',url:'https://news/a',publishedAt:'2026-09-03T09:00:00Z'},
    {title:'김민석 의혹 수사 착수',source:'B뉴스',url:'https://news/b',publishedAt:'2026-09-02T09:00:00Z'},
    {title:'김민석 비판과 반발 이어져',source:'C뉴스',url:'https://news/c',publishedAt:'2026-08-30T09:00:00Z'},
    {title:'김민석 민생 정책 발표',source:'D뉴스',url:'https://news/d',publishedAt:'2026-07-01T09:00:00Z'}
  ];
  const result=analyzeNewsHeadlines(person,crisisRows);
  assert.deepEqual(result.dominantEvent,{title:'김민석 발언 논란 확산',date:'2026-09-03',source:'A뉴스',agendaTag:'논란·위기',frame:'부정·위기',agency:'외부 서사'});
  assert.deepEqual(result.frameSummary,{positive:0,neutral:1,negative:3,dominant:'부정·위기'});
  assert.equal(result.attentionQuality,'정치적 부담');
  assert.match(result.politicalMeaning,/부정 프레임|정치적 부담/);
  assert.match(result.effectSeparation,/뉴스 노출 상승.*브랜드 부담/);
});

test('headline time windows use observed article dates rather than fabricated historical scores',()=>{
  const result=analyzeNewsHeadlines(person,[
    {title:'김민석 민생 정책 발표',source:'A뉴스',publishedAt:'2026-09-03T09:00:00Z'},
    {title:'김민석 지역 예산 확보',source:'B뉴스',publishedAt:'2026-08-20T09:00:00Z'},
    {title:'김민석 당내 통합 강조',source:'C뉴스',publishedAt:'2026-06-20T09:00:00Z'},
    {title:'김민석 외교 행보',source:'D뉴스',publishedAt:'2025-10-01T09:00:00Z'}
  ]);
  assert.deepEqual(result.temporalSummary,{days30:2,days90:3,year:4,recentDirection:'상승',basis:'대표 뉴스 게시일'});
  assert.deepEqual(result.agencySummary,{led:3,external:1,dominant:'정치인 주도'});
});

test('dominant event strips media wrappers while preserving the original news-list title',()=>{
  const original="[한강만평] '5.18 도발' 이진숙 운명은? - 한강타임즈";
  const result=analyzeNewsHeadlines({...person,name:'이진숙'},[{title:original,source:'한강타임즈',publishedAt:'2026-09-03T09:00:00Z'}]);
  assert.equal(result.items[0].title,original);
  assert.equal(result.dominantEvent.title,"'5.18 도발' 이진숙의 운명은?");
  assert.doesNotMatch(result.politicalMeaning,/한강만평|한강타임즈|5\.18 도발/);
  assert.deepEqual(result.contextTemporalSummary,{days30:0,days90:0,year:0,recentDirection:'유지',basis:'핵심 이슈 외 대표 뉴스 게시일'});
});

test('historical controversy words drive the risk frame without treating 5.18 itself as negative',()=>{
  const result=analyzeNewsHeadlines({...person,name:'이진숙'},[
    {title:'이진숙 5.18 정신 계승 입장 발표',source:'A뉴스',publishedAt:'2026-09-03T09:00:00Z'},
    {title:"'5.18 도발' 이진숙의 운명은?",source:'B뉴스',publishedAt:'2026-09-02T09:00:00Z'}
  ]);
  const neutral=result.items.find(item=>/정신 계승/.test(item.title));
  const crisis=result.items.find(item=>/도발/.test(item.title));
  assert.equal(neutral.frame,'중립·정보');
  assert.equal(crisis.frame,'부정·위기');
  assert.equal(crisis.agendaTag,'논란·위기');
});
