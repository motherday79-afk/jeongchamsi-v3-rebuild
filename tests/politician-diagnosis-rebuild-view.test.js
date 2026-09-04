import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';

const person={id:'assembly-visual',type:'assembly',roleLabel:'국회의원',name:'김시각',party:'더불어민주당',region:'서울',jurisdiction:'서울 시각구',terms:'재선',committee:'정무위원회',office:'국회의원',electionLabel:'제22대 국회의원 당선',photo:{localPath:'/assets/politicians/assembly-001.jpg',focus:'50% 28%'}};
const raw={snapshotId:'jcs-visual',collectedAt:'2026-09-04T00:00:00.000Z',searchAds:{volume:{pc:2000,mobile:8000}},news:{items:[
  {title:'김시각 지역 예산 확보 성과',source:'연합뉴스',url:'https://example.com/a',publishedAt:'2026-09-04T00:00:00.000Z'},
  {title:'김시각 주거 정책 발표',source:'KBS',url:'https://example.com/b',publishedAt:'2026-09-03T00:00:00.000Z'},
  {title:'김시각 과거 발언 논란',source:'MBC',url:'https://example.com/c',publishedAt:'2026-08-20T00:00:00.000Z'}
]},sourceErrors:[]};
const context={peers:[{id:'r1',name:'이경쟁',party:'국민의힘',region:'서울',office:'국회의원'},{id:'r2',name:'박경쟁',party:'더불어민주당',region:'서울',office:'국회의원'},{id:'r3',name:'최경쟁',party:'무소속',region:'경기',office:'국회의원'}],ageSex:[{age:'20대',maleShare:49,femaleShare:51},{age:'30대',maleShare:50,femaleShare:50},{age:'40대',maleShare:51,femaleShare:49},{age:'50대',maleShare:49,femaleShare:51},{age:'60대 이상',maleShare:46,femaleShare:54}]};

async function adminHtml(){
  const intelligence=projectIntelligence(buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),'admin','detail');
  return renderPoliticianDetail(person.id,{get:async()=>({ok:true,item:person,intelligence})},{user:{role:'admin'}});
}

test('administrator detail renders all ten approved diagnosis-specific layouts',async()=>{
  const html=await adminHtml();
  assert.equal((html.match(/data-diagnosis-layout="\d{2}"/g)||[]).length,10);
  for(const marker of ['NOW SIGNAL','BRAND INDICATORS','PAST RISK SIGNALS','BRAND TOTAL SIGN','AGE × GENDER COMPOSITION','기반 순위','공식 선거 기반','코어','유동','이탈','이슈 확산 속도','매체 집중도','출마·당선 이력','정책 진행 단계','JCS TOTAL'])assert.match(html,new RegExp(marker));
  assert.doesNotMatch(html,/SUPPORT COMPOSITION <span>합계 100%/);
  assert.match(html,/jcs-dx-local-overlap/);
  assert.match(html,/jcs-dx-persistence-curve/);
  assert.match(html,/is-current[^>]*>[^<]*(발표|제안|검토|통과|시행|완료)/);
});

test('media search values use compact K notation while retaining exact accessible values',async()=>{
  const html=await adminHtml();
  assert.match(html,/2K/);
  assert.match(html,/8K/);
  assert.match(html,/aria-label="정확한 검색량 2,000"/);
});

test('administrator diagnosis part omits the removed repeated prose fields',async()=>{
  const html=await adminHtml(),start=html.indexOf('<div class="jcs-diagnosis-part">'),end=html.indexOf('<section class="jcs-v2-summary">'),diagnosis=html.slice(start,end);
  for(const removed of ['정치적 의미','현재 위치','정참시 해석','기회 요인','위험 요인','변화 원인','과거와 현재','비교 기준','서브데이터'])assert.doesNotMatch(diagnosis,new RegExp(`>${removed}<`));
});

test('diagnosis visual styles use compact gradient modules with a mobile reflow',async()=>{
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  for(const marker of ['.jcs-dx-brand-axis','.jcs-dx-demographic-chart','.jcs-dx-support-orbit','.jcs-dx-competitor-grid','.jcs-dx-summary-grid'])assert.match(css,new RegExp(marker.replaceAll('.','\\.')));
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.jcs-dx-module/);
  assert.match(css,/linear-gradient\(/);
});

test('media panels expose full outlet names instead of ellipsized fragments',async()=>{
  const html=await adminHtml(),css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  assert.match(html,/jcs-dx-media-legend/);
  assert.match(html,/>연합뉴스</);
  const legendCss=css.slice(css.lastIndexOf('.jcs-dx-media-legend'));
  assert.doesNotMatch(legendCss,/text-overflow:ellipsis/);
});

test('competitor renderer uses row agenda and election data rather than hard-coded empty cells',async()=>{
  const source=await readFile(new URL('../src/views/politicians.js',import.meta.url),'utf8');
  const render=source.slice(source.indexOf('function renderDxCompetitor'),source.indexOf('function renderDxRisk'));
  assert.doesNotMatch(render,/rows\.map\(\(\)=>'<div class="is-empty">데이터 부족<\/div>'\)/);
  assert.match(render,/row\.agendas/);
  assert.match(render,/row\.election/);
});
