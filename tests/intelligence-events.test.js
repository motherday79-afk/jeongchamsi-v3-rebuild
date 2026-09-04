import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNewsHeadlines } from '../lib/intelligence-headlines.js';
import { buildEventClusters, buildPoliticalAssetMatrix } from '../lib/intelligence-events.js';

const person={id:'assembly-event',name:'이진숙',party:'국민의힘',region:'대구',jurisdiction:'대구 달성군',office:'국회의원'};

test('related coverage becomes one event with complete evidence and legal status',()=>{
  const narrative=analyzeNewsHeadlines(person,[
    {title:'5·18 유공자들, 이진숙 상대 손배소 청구…1인당 3000만원',source:'A뉴스',publishedAt:'2026-09-03T09:00:00Z'},
    {title:'이진숙 5·18 발언 놓고 유공자 손해배상 소송 제기',source:'B뉴스',publishedAt:'2026-09-02T09:00:00Z'},
    {title:'이진숙 민생 법안 발의',source:'C뉴스',publishedAt:'2026-09-01T09:00:00Z'}
  ]);
  const clusters=buildEventClusters(person,narrative,[]);
  assert.equal(clusters.length,2);
  const legal=clusters.find(row=>row.eventType==='법적 사건');
  assert.equal(legal.legalStatus,'민사소송');
  assert.equal(legal.relatedNewsIds.length,2);
  assert.match(legal.eventTitle,/5·18|손배|손해배상/);
  for(const key of ['eventId','eventTitle','eventType','dateRange','relatedNewsIds','mainActors','coreKeywords','politicalFrame','direction','affectedGroups','affectedPoliticalAssets','severity','persistence','evidence'])assert.ok(legal[key],key);
});

test('one negative controversy separates attention gain from brand and expansion loss',()=>{
  const narrative=analyzeNewsHeadlines(person,[
    {title:'이진숙 역사 인식 발언 논란과 손배소 확산',source:'A뉴스',publishedAt:'2026-09-03T09:00:00Z'}
  ]);
  const clusters=buildEventClusters(person,narrative,[]),matrix=buildPoliticalAssetMatrix(clusters),event=matrix.byEvent[0];
  assert.equal(event.effects.mediaAttention.direction,'positive');
  assert.equal(event.effects.brand.direction,'negative');
  assert.equal(event.effects.moderateExpansion.direction,'negative');
  assert.equal(event.effects.coreSupport.direction,'positive');
  assert.equal(event.effects.crisisRisk.direction,'negative');
  assert.ok(event.effects.brand.evidenceIds.length>0);
});

test('legal stages are never collapsed into a conviction',()=>{
  const cases=[
    ['의혹 제기','혐의'],['경찰 수사 착수','수사'],['검찰 기소','기소'],['첫 재판 시작','재판'],['대법원 유죄 확정','유죄 확정'],['손해배상 소송 청구','민사소송']
  ];
  for(const [headline,expected] of cases){
    const narrative=analyzeNewsHeadlines(person,[{title:`이진숙 ${headline}`,source:'법률뉴스',publishedAt:'2026-09-03T09:00:00Z'}]);
    const event=buildEventClusters(person,narrative,[])[0];
    assert.equal(event.legalStatus,expected,headline);
  }
});

test('event processing is deterministic and never expands beyond ten representative news items',()=>{
  const items=Array.from({length:15},(_,index)=>({title:`이진숙 지역 현장 정책 ${index}`,source:`매체${index}`,publishedAt:`2026-08-${String(index+1).padStart(2,'0')}T09:00:00Z`}));
  const narrative=analyzeNewsHeadlines(person,items),first=buildEventClusters(person,narrative,[]),second=buildEventClusters(person,narrative,[]);
  assert.deepEqual(first,second);
  assert.ok(first.flatMap(row=>row.relatedNewsIds).length<=10);
});
