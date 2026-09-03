import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';
import { createPoliticianService } from '../src/core/politicians.js';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';

const profiles=Array.from({length:6},(_,index)=>({
  id:`assembly-${String(index+1).padStart(3,'0')}`,
  type:'assembly',
  roleLabel:'국회의원',
  name:['김민석','강민국','강준현','강훈식','고동진','곽규택'][index],
  party:index%2?'국민의힘':'더불어민주당',
  jurisdiction:`선거구 ${index+1}`,
  terms:`${index+1}선`,
  committee:`위원회 ${index+1}`,
  photo:index<2?{localPath:`/assets/politicians/assembly-00${index+1}.jpg`,focus:'50% 28%'}:null
}));

const legacyIntelligenceFor=item=>{
  const index=profiles.findIndex(row=>row.id===item.id),base=70+index;
  return {
    id:item.id,snapshot:'jcs-live',mode:'전체 정치인 운영 분석',rank:{overall:index+1,category:index+1},signal:{index:90-index,label:'운영 신호',summary:`${item.name} 운영 요약`},
    core:[{label:'관심도',score:base},{label:'확산력',score:base-4},{label:'활동성',score:base+3}],
    activity:[{label:'활동 강도',score:base+2},{label:'현장성',score:base-3}],media:[{label:'언론 노출',score:base+5},{label:'자발 확산',score:base-2}],
    sources:[{type:'네이버 검색광고',grade:'DIRECT'},{type:'Google 뉴스',grade:'DIRECT'},{type:'한국갤럽·중앙선거여론조사심의위원회',grade:'CONTEXT',detail:`${item.party} 지지도 41%`}],
    audience:{position:base,label:'대중 확장 우세',summary:'관심층 구조'},cohorts:[{age:'20대',male:base-2,female:base+2},{age:'30대',male:base,female:base+1}],
    transition:[{label:'유입력',score:base+3},{label:'전환력',score:base-5}],diagnosis:{title:'비교 진단',body:'실제 스냅샷 기반 진단'},
    issues:[{title:'민생·경제',impact:base,persistence:base-2}],risks:[`${item.name} 위험 신호`],opportunities:[`${item.name} 기회 신호`],conclusion:`${item.name} JCS 종합`,
    support:{core:base,expand:base-3,risk:35,loyalty:base+2,action:base-1,stability:base-4,scalability:base-3},
    resilience:{index:base-2,resistance:base-1,speed:base+1,stability:base-4},mediaScores:{reach:base+5,social:base,organic:base-2,persistence:base-3},
    strategies:[{title:'우선 전략',body:`${item.name} 실행 전략`}],raw:{searchAds:{volume:{pc:1000+index,mobile:9000+index}},news:{items:[{source:'연합뉴스'}]}}
  };
};
const intelligenceFor=item=>{const legacy=legacyIntelligenceFor(item),index=profiles.findIndex(row=>row.id===item.id);return {...buildIntelligenceDraft(item,{snapshotId:'jcs-live',collectedAt:'2026-09-03T00:00:00.000Z',searchAds:legacy.raw.searchAds,news:{items:[{title:`${item.name} 민생 경제 정책 현장 발표`,source:'연합뉴스',publishedAt:'2026-09-02'}]},sourceErrors:[]},{peers:profiles},'JCS_INTELLIGENCE_V2'),rank:legacy.rank};};

const service={
  list:async()=>({ok:true,items:profiles,total:profiles.length,hasMore:false}),
  search:async query=>({ok:true,items:profiles.filter(profile=>`${profile.name} ${profile.party} ${profile.jurisdiction}`.includes(query)),total:profiles.length}),
  get:async id=>{
    const item=profiles.find(profile=>profile.id===id);
    return item?{ok:true,item}:{ok:false,error:'NOT_FOUND'};
  },
  getForCompare:async id=>{
    const item=profiles.find(profile=>profile.id===id);
    return item?{ok:true,item,intelligence:intelligenceFor(item)}:{ok:false,error:'NOT_FOUND'};
  },
};
const serviceFor=tier=>({...service,getForCompare:async id=>{
  const item=profiles.find(profile=>profile.id===id);
  return item?{ok:true,item,intelligence:projectIntelligence(intelligenceFor(item),tier,'compare')}:{ok:false,error:'NOT_FOUND'};
}});

test('anonymous comparison is strictly 1:1 and waits for the explicit compare action',async()=>{
  const html=await renderPoliticianCompare(serviceFor('public'),'/compare?ids=assembly-001,assembly-002,assembly-003',null);
  assert.match(html,/data-compare-role="public"/);
  assert.match(html,/data-compare-limit="2"/);
  assert.equal((html.match(/data-compare-slot/g)||[]).length,2);
  assert.match(html,/data-compare-selected="assembly-001"/);
  assert.match(html,/data-compare-selected="assembly-002"/);
  assert.doesNotMatch(html,/data-compare-selected="assembly-003"/);
  assert.match(html,/정치인 1:1 비교/);
  assert.match(html,/data-compare-run/);
  assert.match(html,/>비교하기</);
  assert.doesNotMatch(html,/NOW OPERATING INDEX|CORE INDICATORS|ACTIVITY &amp; MEDIA/);
  assert.doesNotMatch(html,/SOURCE CLASSES|원자료 범주/);
  assert.doesNotMatch(html,/MEMBER INTERPRETED COMPARISON|ADMIN MULTI INTELLIGENCE/);
});

test('member comparison reveals six interpreted topics only after compare is pressed',async()=>{
  const html=await renderPoliticianCompare(serviceFor('member'),'/compare?ids=assembly-001,assembly-002,assembly-003&run=1',{authenticated:true,user:{role:'member'}});
  assert.match(html,/data-compare-role="member"[^>]*data-compare-limit="2"/);
  assert.equal((html.match(/data-compare-slot/g)||[]).length,2);
  assert.equal((html.match(/data-comparison-topic=/g)||[]).length,6);
  for(const marker of ['JCS MEMBER POLITICAL COMPARISON','세대·성별 지지구조 분석','지역구 민심·메시지 진단','정참시 비교 해석'])assert.match(html,new RegExp(marker));
  assert.doesNotMatch(html,/실행 처방|경쟁 대응 우선순위/);
});

test('JCS support conversion remains populated when Gallup context is unavailable',async()=>{
  const noGallup={...service,getForCompare:async id=>{
    const item=profiles.find(profile=>profile.id===id),intelligence=intelligenceFor(item);
    intelligence.sources=intelligence.sources.filter(source=>!/한국갤럽/.test(source.type));
    return {ok:true,item,intelligence:projectIntelligence(intelligence,'member','compare')};
  }};
  const html=await renderPoliticianCompare({...serviceFor('member'),getForCompare:noGallup.getForCompare},'/compare?ids=assembly-001,assembly-002&run=1',{authenticated:true,user:{role:'member'}});
  assert.match(html,/세대·성별 지지구조 분석/);
  assert.match(html,/JCS 상대지수|정참시 비교 해석/);
  assert.doesNotMatch(html,/실행 처방/);
});

test('admin comparison accepts four people and renders ten-topic matrix only after execution',async()=>{
  const ids=profiles.map(profile=>profile.id).join(',');
  const waiting=await renderPoliticianCompare(serviceFor('admin'),`/compare?ids=${ids}`,{authenticated:true,user:{role:'admin'}});
  assert.doesNotMatch(waiting,/ADMIN CONSULTING SUMMARY|NOW OPERATING INDEX|SUPPORT QUALITY RADAR/);
  const html=await renderPoliticianCompare(serviceFor('admin'),`/compare?ids=${ids}&run=1`,{authenticated:true,user:{role:'admin'}});
  assert.match(html,/data-compare-role="admin"/);
  assert.match(html,/data-compare-limit="4"/);
  assert.equal((html.match(/data-compare-slot/g)||[]).length,4);
  assert.equal((html.match(/data-compare-selected=/g)||[]).length,4);
  assert.doesNotMatch(html,/data-compare-selected="assembly-005"/);
  assert.match(html,/관리자 다중 비교/);
  assert.match(html,/최대 4명/);
  assert.equal((html.match(/data-comparison-topic=/g)||[]).length,10);
  for(const marker of ['관리자 경쟁 분석 요약','가장 격차가 큰 영역','정참시 해석','실행 처방'])assert.match(html,new RegExp(marker));
});

test('one failed comparison load preserves successful people and identifies the retry id',async()=>{
  const partialService={...service,getForCompare:async id=>id==='assembly-002'?{ok:false,error:'STORAGE_REQUEST'}:service.getForCompare(id)};
  const html=await renderPoliticianCompare(partialService,'/compare?ids=assembly-001,assembly-002&run=1',{user:{role:'admin'}});
  assert.match(html,/data-compare-selected="assembly-001"/);
  assert.match(html,/data-compare-failed="assembly-002"/);
  assert.match(html,/assembly-002/);
  assert.match(html,/다시 시도/);
  assert.match(html,/data-layout-route="\/compare\?ids=assembly-001%2Cassembly-002&amp;run=1"/);
});

test('empty comparison preserves role capacity layout without fake values',async()=>{
  const publicHtml=await renderPoliticianCompare(service,'/compare',null);
  const adminHtml=await renderPoliticianCompare(serviceFor('admin'),'/compare',{user:{role:'admin'}});
  assert.equal((publicHtml.match(/data-compare-slot/g)||[]).length,2);
  assert.equal((adminHtml.match(/data-compare-slot/g)||[]).length,4);
  assert.equal((publicHtml.match(/data-compare-search-form/g)||[]).length,1);
  assert.equal((adminHtml.match(/data-compare-search-form/g)||[]).length,1);
  assert.match(publicHtml,/politician-compare-global-search/);
  assert.match(adminHtml,/politician-compare-global-search/);
  assert.match(publicHtml,/type="search"/);
  assert.match(publicHtml,/정치인 이름·정당·지역 검색/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/politician-compare-empty-mark|>＋<|아래 정치인 목록에서/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/politician-compare-picker|ASSEMBLY DIRECTORY|국회의원 선택/);
  assert.match(adminHtml,/비교할 정치인을 검색해 선택하세요/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/세부 데이터 연결 후 표시/);
  assert.doesNotMatch(`${publicHtml}${adminHtml}`,/당대표 전환·다채널 확산형|NOW INDEX[^<]*84|JCS 지수[^<]*84/);
});

test('comparison keeps the approved selected profile card and remove route',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001',{user:{role:'admin'}});
  assert.match(html,/김민석/);
  assert.match(html,/더불어민주당/);
  assert.match(html,/선거구 1/);
  assert.match(html,/위원회 1/);
  assert.match(html,/data-compare-remove="assembly-001"/);
  assert.match(html,/비교 대상/);
  assert.doesNotMatch(html,/NOW OPERATING INDEX/);
  assert.match(html,/\/assets\/politicians\/assembly-001\.jpg/);
});

test('search results stay inside the full-width picker and add a politician to the existing route',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001&q=강&slot=2',{user:{role:'admin'}});
  assert.equal((html.match(/data-compare-search-results/g)||[]).length,1);
  assert.match(html,/강민국/);
  assert.match(html,/data-compare-add="assembly-002"/);
  assert.match(html,/data-layout-route="\/compare\?ids=assembly-001%2Cassembly-002"/);
  assert.doesNotMatch(html,/politician-compare-picker/);
});

test('adding or removing a politician clears run state and compare button adds run=1',async()=>{
  const html=await renderPoliticianCompare(service,'/compare?ids=assembly-001,assembly-002&run=1&q=강&slot=3',{user:{role:'admin'}});
  assert.match(html,/data-compare-run[^>]*data-layout-route="\/compare\?ids=assembly-001%2Cassembly-002&amp;run=1"/);
  assert.match(html,/data-compare-remove="assembly-001"[^>]*data-layout-route="\/compare\?ids=assembly-002"/);
  assert.match(html,/data-compare-add="assembly-003"[^>]*data-layout-route="\/compare\?ids=assembly-001%2Cassembly-002%2Cassembly-003"/);
});

test('politician search covers every category and matches name, party, region or office',async()=>{
  const store=await import('../lib/politician-store.js');
  assert.equal(typeof store.searchPoliticianProfiles,'function');
  const groups={
    assembly:[profiles[0]],
    metropolitan:[{...profiles[1],id:'metropolitan-001',type:'metropolitan',name:'오세훈',office:'서울특별시장',jurisdiction:'서울'}],
    basic:[{...profiles[2],id:'basic-001',type:'basic',name:'정원오',office:'성동구청장',jurisdiction:'서울 성동구'}]
  };
  assert.deepEqual(store.searchPoliticianProfiles(groups,'서울',10).map(item=>item.id),['metropolitan-001','basic-001']);
  assert.deepEqual(store.searchPoliticianProfiles(groups,'더불어민주당',10).map(item=>item.id),['assembly-001','basic-001']);
  assert.deepEqual(store.searchPoliticianProfiles(groups,'성동구청장',10).map(item=>item.id),['basic-001']);
});

test('politician client sends an encoded all-category search request',async()=>{
  const originalFetch=globalThis.fetch;
  let requested='';
  globalThis.fetch=async url=>{requested=String(url);return {ok:true,json:async()=>({ok:true,items:[]})};};
  try{
    const result=await createPoliticianService().search('서울 시장',12);
    assert.equal(result.ok,true);
    assert.equal(requested,'/api/v3/politicians?q=%EC%84%9C%EC%9A%B8%20%EC%8B%9C%EC%9E%A5&limit=12');
  }finally{globalThis.fetch=originalFetch;}
});

test('politician compare client requests the server-projected compare view',async()=>{
  const originalFetch=globalThis.fetch;
  let requested='';
  globalThis.fetch=async url=>{requested=String(url);return {ok:true,json:async()=>({ok:true,item:profiles[0],intelligence:{}})};};
  try{
    const result=await createPoliticianService().getForCompare('assembly-001');
    assert.equal(result.ok,true);
    assert.equal(requested,'/api/v3/politicians?id=assembly-001&view=compare');
  }finally{globalThis.fetch=originalFetch;}
});

test('embedded compare search has a readable slot-local result layer',async()=>{
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_14 · EMBEDDED POLITICIAN COMPARE SEARCH');
  assert.ok(start>=0);
  const end=css.indexOf('JCS_0_0_27 · LEGACY DETAIL DENSITY',start),layer=css.slice(start,end<0?undefined:end);
  assert.match(layer,/\.politician-compare-slot-search/);
  assert.match(layer,/\.politician-compare-search-results/);
  assert.match(layer,/input\[type="search"\]/);
  const sub14=[...layer.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter(match=>Number(match[1])<14);
  assert.deepEqual(sub14.map(match=>match[0]),[]);
});

test('operating comparison visual layer supports readable two-to-five person analysis',async()=>{
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_18 · OPERATING ROLE COMPARISON');
  assert.ok(start>=0);
  const end=css.indexOf('JCS_0_0_27 · LEGACY DETAIL DENSITY',start),layer=css.slice(start,end<0?undefined:end);
  for(const selector of ['.politician-compare-index-grid','.politician-compare-cohort-map','.admin-compare-radar-grid','.admin-compare-issue-quadrant','.admin-compare-evidence-grid'])assert.match(layer,new RegExp(selector.replaceAll('.','\\.')));
  assert.match(layer,/--compare-count/);
  assert.match(layer,/overflow-x:auto/);
  const sub14=[...layer.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter(match=>Number(match[1])<14);
  assert.deepEqual(sub14.map(match=>match[0]),[]);
});
