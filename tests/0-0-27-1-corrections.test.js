import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { renderHomeLayout } from '../src/layout/home-layout.js';
import { renderPollBoard, renderNationalEvaluationPage } from '../src/views/participation-pages.js';
import { siteHeader } from '../src/layout/site-shell.js';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';

const people={
  'assembly-001':{id:'assembly-001',type:'assembly',name:'김민석',party:'더불어민주당',jurisdiction:'서울 영등포구을',photo:{localPath:'/assets/politicians/assembly-001.jpg',focus:'50% 20%'}},
  'assembly-002':{id:'assembly-002',type:'assembly',name:'김영철',party:'국민의힘',jurisdiction:'서울',photo:{localPath:'/assets/politicians/assembly-002.jpg'}},
  'basic-001':{id:'basic-001',type:'basic',name:'김아무개',party:'무소속',jurisdiction:'경기'}
};
const politicians={
  async get(id){return people[id]?{ok:true,item:people[id]}:{ok:false};},
  async search(query){return {ok:true,items:Object.values(people).filter(item=>`${item.name} ${item.party} ${item.jurisdiction}`.includes(query))};}
};

test('전체 서비스는 상위 6개를 유지하고 중복 없이 추가 7개만 확장한다',()=>{
  const html=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:{},academy:{items:[]},rank:[],session:{authenticated:false}});
  const launcher=html.match(/<section class="product-launcher[\s\S]*?<\/section>/)?.[0]||'';
  const base=launcher.match(/<div class="product-launcher-grid">([\s\S]*?)<\/div><div class="product-launcher-expanded"/)?.[1]||'';
  const expanded=launcher.match(/data-launcher-panel hidden>([\s\S]*)<\/div><\/section>/)?.[1]||'';
  assert.equal((base.match(/class="launcher-card/g)||[]).length,6);
  assert.equal((expanded.match(/class="launcher-card/g)||[]).length,7);
  assert.equal((launcher.match(/data-layout-route="\/now"/g)||[]).length,1);
  assert.doesNotMatch(expanded,/정참시의 모든 서비스를 한곳에서 선택하세요|ALL SERVICES/);
  assert.doesNotMatch(launcher,/<small>[^<]+<\/small>/);
});

test('메인 검색 자동완성은 헤더 밖으로 잘리지 않고 한 글자부터 표시된다',async()=>{
  const header=siteHeader(0,{authenticated:false});
  assert.match(header,/data-politician-autocomplete/);
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_27_2 · SEARCH UI CORRECTION');
  assert.ok(start>0);
  const layer=css.slice(start);
  assert.match(layer,/\.product-search\{[^}]*overflow:visible/);
  assert.match(layer,/\.product-search>\.politician-autocomplete-results\{[^}]*top:calc\(100% \+ 7px\)/);
  const productCss=await readFile(new URL('../css/product-system.css',import.meta.url),'utf8');
  assert.doesNotMatch(productCss,/\.product-search\{[^}]*overflow:hidden/);
});

test('비교하기는 슬롯마다 깨지는 검색창 대신 전체 폭 자동완성 하나를 사용한다',async()=>{
  const service={
    async get(){return {ok:false};},
    async search(){return {ok:true,items:[]};}
  };
  const html=await renderPoliticianCompare(service,'/compare',{user:{role:'admin'}});
  assert.equal((html.match(/data-compare-search-form/g)||[]).length,1);
  assert.equal((html.match(/data-politician-autocomplete/g)||[]).length,1);
  assert.match(html,/politician-compare-global-search/);
  assert.doesNotMatch(html,/한 글자만 입력해도 사진과 함께 바로 선택할 수 있습니다/);
  assert.equal((html.match(/politician-compare-slot is-empty/g)||[]).length,4);
});

test('전국 평가제 사진은 메인·전체보기·지난 게시물에 같은 정치인 자산으로 노출된다',async()=>{
  const data={
    slots:{assembly:{slot:'assembly',evaluationId:'e1',subjectId:'assembly-001',subjectName:'김민석',enabled:true,photo:people['assembly-001'].photo}},
    results:{e1:{positive:4,neutral:1,negative:0}},
    history:[{evaluationId:'old',subjectId:'assembly-002',positive:3,neutral:1,negative:0,closedAt:'2026-08-01'}],
    items:[{id:'evaluation-post-1',subjectId:'assembly-001',slot:'assembly',title:'김민석 전국 평가',published:true,featured:true}]
  };
  const home=renderHomeLayout({...HOME_FIXTURE,itsmePosts:[],columns:[],community:[],polls:{items:[]},generation:{},nationalEvaluation:data,academy:{items:[]},rank:[],session:{authenticated:false}});
  assert.match(home,/national-eval-home-card[\s\S]*data-politician-photo src="\/assets\/politicians\/assembly-001\.jpg"/);
  const full=await renderNationalEvaluationPage({content:{async readDomain(){return data;}},politicians,session:{authenticated:false}});
  assert.match(full,/national-evaluation-avatar has-photo[\s\S]*assembly-001\.jpg/);
  assert.match(full,/evaluation-history-avatar has-photo[\s\S]*assembly-002\.jpg/);
});

test('관리자는 시티즌 초이스 전체보기에서 새 게시물을 쓰고 메인 게시물을 지정한다',async()=>{
  const data={items:[{id:'p1',question:'현재 메인 설문',published:true,featured:true,options:[{id:'yes',label:'찬성',votes:1}]}]};
  const html=await renderPollBoard({content:{async readDomain(){return data;}},session:{authenticated:true,user:{role:'admin'}},route:'/poll'});
  assert.match(html,/data-participation-admin-form="polls"/);
  assert.match(html,/name="options"/);
  assert.match(html,/data-participation-feature="polls:p1"/);
  assert.match(html,/메인 적용 중/);
});

test('관리자는 전국 평가제 전체보기에서 게시물을 작성하고 메인 슬롯에 적용한다',async()=>{
  const data={slots:{},results:{},history:[],items:[{id:'n1',subjectId:'assembly-001',slot:'assembly',title:'김민석 전국 평가',published:true}]};
  const html=await renderNationalEvaluationPage({content:{async readDomain(){return data;}},politicians,session:{authenticated:true,user:{role:'admin'}}});
  assert.match(html,/data-participation-admin-form="nationalEvaluation"/);
  assert.match(html,/data-politician-autocomplete/);
  assert.match(html,/data-participation-feature="nationalEvaluation:n1"/);
});

test('한 글자 정치인·정당 검색도 사진이 포함된 선택 후보를 반환한다',async()=>{
  const { loadPoliticianSuggestions, politicianSuggestionMarkup }=await import('../src/ui/interactions.js');
  const rows=await loadPoliticianSuggestions('김',politicians.search);
  assert.deepEqual(rows.map(item=>item.name),['김민석','김영철','김아무개']);
  const markup=politicianSuggestionMarkup(rows);
  assert.match(markup,/김민석/);
  assert.match(markup,/더불어민주당/);
  assert.match(markup,/data-politician-photo src="\/assets\/politicians\/assembly-001\.jpg"/);
  const partyRows=await loadPoliticianSuggestions('더불어민주당',politicians.search);
  assert.deepEqual(partyRows.map(item=>item.name),['김민석']);
});

test('참여 게시물 저장은 관리자만 허용하고 메인 적용 상태를 원자적으로 바꾼다',async()=>{
  const { createParticipationPost, featureParticipationPost }=await import('../lib/participation-admin.js');
  const pollData={items:[{id:'old',question:'이전',featured:true,published:true}]};
  const created=createParticipationPost('polls',pollData,{title:'새 설문',body:'설명',options:'찬성\n반대',applyToMain:true},{id:'admin',nickname:'관리자'},'2026-09-03T12:00:00.000Z');
  assert.equal(created.item.featured,true);
  assert.equal(created.data.items[1].featured,false);
  assert.deepEqual(created.item.options.map(item=>item.label),['찬성','반대']);
  const featured=featureParticipationPost('polls',created.data,'old');
  assert.equal(featured.data.items.find(item=>item.id==='old').featured,true);
  assert.equal(featured.data.items.find(item=>item.id===created.item.id).featured,false);
});

test('NOW 카드는 참고 이미지 비율이고 관리자 인텔리전스만 고밀도로 축소한다',async()=>{
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_27_1 · CORRECTION HOTFIX');
  assert.ok(start>0);
  const layer=css.slice(start);
  assert.match(layer,/\.person-live-detail-page \.person-hero-rank-split\{[^}]*width:176px[^}]*height:120px/);
  assert.doesNotMatch(layer,/\.person-live-detail-page :is\(/);
  assert.match(layer,/\.jcs-private-intelligence-v3 \.admin-pi-report-block\{[^}]*padding:13px/);
  assert.match(layer,/\.jcs-private-intelligence-v3 \.admin-pi-section-head h3\{[^}]*font-size:16px!important/);
  assert.match(layer,/\.jcs-private-intelligence-v3 :is\(p,span,small,em,dt,dd,label\)\{[^}]*font-size:12px!important/);
});
