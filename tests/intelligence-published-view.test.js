import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';

const person={id:'assembly-031',type:'assembly',roleLabel:'국회의원',name:'김테스트',party:'더불어민주당',region:'경기',jurisdiction:'경기 테스트구',terms:'3선',committee:'정무위원회',office:'국회의원'};
const raw={personId:person.id,snapshotId:'jcs-live-1',collectedAt:'2026-09-03T00:00:00.000Z',officialProfile:person,searchAds:{volume:{pc:1500,mobile:10000,total:11500}},news:{items:[{title:'김테스트 민생 경제 정책 발표',source:'연합뉴스',url:'https://news.google.com/a',publishedAt:'2026-09-02'}]},sourceErrors:[]};
const context={peers:[{id:'assembly-032',name:'이경쟁',type:'assembly',party:'더불어민주당',region:'경기'}],ageSex:[{age:'20대',maleShare:49,femaleShare:51},{age:'30대',maleShare:50,femaleShare:50},{age:'40대',maleShare:51,femaleShare:49},{age:'50대',maleShare:49.5,femaleShare:50.5},{age:'60대 이상',maleShare:46,femaleShare:54}]};

test('a published politician uses live ranks and all ten projected administrator diagnostics',async()=>{
  const report=buildIntelligenceDraft(person,raw,context);report.rank={overall:12,category:9,temporary:false};
  const service={async get(){return {ok:true,item:person,intelligence:projectIntelligence(report,'admin','detail')};}};
  const html=await renderPoliticianDetail(person.id,service,{authenticated:true,user:{role:'admin'}});
  assert.doesNotMatch(html,/공개 스냅샷 운영 순위|국회의원 NOW 독립 순위/);
  assert.match(html,/전체 NOW<\/span><strong>12위/);
  assert.match(html,/국회의원<\/span><strong>9위/);
  assert.match(html,/JCS ADMIN POLITICAL INTELLIGENCE/);
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,10);
  assert.match(html,/정치인 브랜드 진단/);
  assert.match(html,/세대·성별 지지구조 분석/);
  assert.match(html,/JCS 종합해석/);
  assert.equal((html.match(/data-diagnosis-layout="\d{2}"/g)||[]).length,10);
  assert.match(html,/BRAND INDICATORS/);
  assert.match(html,/실행 처방/);
  assert.equal((html.match(/data-prescription-topic=/g)||[]).length,10);
  assert.doesNotMatch(html,/"raw"|data-generated-value/);
  assert.doesNotMatch(html,/더불어민주당 대표 선출/);
});
