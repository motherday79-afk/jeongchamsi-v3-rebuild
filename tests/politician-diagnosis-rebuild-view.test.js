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

async function effectiveCssDeclaration(selector,property){
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const hrefs=[...index.matchAll(/<link[^>]+href="([^"]+\.css(?:\?[^\"]*)?)"/g)]
    .map(match=>match[1].split('?')[0]);
  const css=(await Promise.all(hrefs.map(href=>readFile(new URL(`..${href}`,import.meta.url),'utf8')))).join('\n');
  let value='';
  for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    if(!match[1].split(',').map(item=>item.trim()).includes(selector))continue;
    for(const declaration of match[2].split(';')){
      const colon=declaration.indexOf(':');
      if(colon<0)continue;
      if(declaration.slice(0,colon).trim()===property)value=declaration.slice(colon+1).trim().replace(/!important$/,'').trim();
    }
  }
  return value;
}

test('administrator detail renders all ten approved diagnosis-specific layouts',async()=>{
  const html=await adminHtml();
  assert.equal((html.match(/data-diagnosis-layout="\d{2}"/g)||[]).length,10);
  for(const marker of ['NOW SIGNAL','BRAND INDICATORS','PAST RISK SIGNALS','BRAND TOTAL SIGN','서칭엔진 검색추이','AGE × GENDER COMPOSITION','기반 순위','지역 유권자 구조','코어','유동','이탈','이슈 확산 속도','매체 집중도','5대 메이저','정치 기반 흐름','정치 행보 구성','관련 보도','JCS TOTAL SCORE'])assert.match(html,new RegExp(marker));
  assert.doesNotMatch(html,/SUPPORT COMPOSITION <span>합계 100%/);
  assert.match(html,/jcs-region-structure/);
  assert.match(html,/jcs-persistence/);
  assert.doesNotMatch(html,/정책 진행 단계|공식 데이터 연결 전|JCS 현재 캠페인 신호/);
});

test('brand search values use compact K notation while retaining exact accessible values',async()=>{
  const html=await adminHtml();
  assert.match(html,/2K/);
  assert.match(html,/8K/);
  assert.match(html,/aria-label="정확한 검색량 2,000"/);
});

test('administrator diagnosis part omits the removed repeated prose fields',async()=>{
  const html=await adminHtml(),start=html.indexOf('<section id="jcs-intelligence-nine"'),end=html.indexOf('<section class="jcs-report-transition">'),diagnosis=html.slice(start,end);
  for(const removed of ['정치적 의미','현재 위치','정참시 해석','기회 요인','위험 요인','변화 원인','과거와 현재','비교 기준','서브데이터'])assert.doesNotMatch(diagnosis,new RegExp(`>${removed}<`));
});

test('approved source-native stylesheet includes all visual families and mobile reflow',async()=>{
  const css=await readFile(new URL('../css/diagnosis-approved.css',import.meta.url),'utf8');
  for(const marker of ['.jcs-sheet','.jcs-chapter','.jcs-brand-tools','.jcs-age-chart','.jcs-support-svg','.jcs-competitors','.jcs-treemap','.jcs-foundations','.jcs-total-grid'])assert.match(css,new RegExp(marker.replaceAll('.','\\.')));
  assert.match(css,/@media \(max-width: 680px\)/);
  assert.match(css,/linear-gradient\(/);
});

test('approved final stylesheet preserves the exact diagnosis and compact compare visual contracts',async()=>{
  const css=await readFile(new URL('../css/diagnosis-approved.css',import.meta.url),'utf8');
  for(const marker of ['.jcs-region-structure','.jcs-age-share','.jcs-support','.jcs-media-list','.jcs-total-opening','.jcs-compare-report-admin .jcs-compare-matrix'])assert.match(css,new RegExp(marker.replaceAll('.','\\.')));
  assert.match(css,/@media \(max-width: 680px\)/);
});

test('approved diagnosis headers and signals use the source ink colors',async()=>{
  const css=await readFile(new URL('../css/diagnosis-approved.css',import.meta.url),'utf8');
  assert.match(css,/#jcs-intelligence-nine\s*\{[^}]*color:\s*var\(--jcs-ink\)/);
  assert.match(css,/\.jcs-signal-copy\s*\{[^}]*font-size:/);
});

test('administrator diagnosis report exposes direct 01 through 10 navigation without internal run ids',async()=>{
  const html=await adminHtml();
  assert.match(html,/<nav class="jcs-nav"[^>]*aria-label="진단 항목 바로가기"/);
  for(let number=1;number<=10;number+=1){
    const id=String(number).padStart(2,'0');
    assert.match(html,new RegExp(`href="#jcs-d${id}"[^>]*>${id}<\\/a>`));
    assert.match(html,new RegExp(`id="jcs-d${id}"[^>]*data-diagnostic-topic="${id}"`));
  }
  assert.doesNotMatch(html,/>jcs-visual</);
});

test('administrator diagnosis uses the approved editorial sheet instead of the legacy green card shell',async()=>{
  const html=await adminHtml();
  assert.match(html,/class="jcs-diagnostics-report jcs-diagnostics-admin"/);
  assert.match(html,/class="jcs-report-head"/);
  assert.match(html,/class="jcs-sheet"/);
  assert.match(html,/<p class="jcs-en">POLITICAL BRAND<\/p>/);
  assert.match(html,/<p class="jcs-en">JCS TOTAL DIAGNOSIS<\/p>/);
  assert.doesNotMatch(html,/class="jcs-report-index"/);
  assert.doesNotMatch(html,/class="jcs-diagnosis-part/);
});

test('administrator diagnosis renders the approved source-native 01 through 10 design instead of a restyled legacy renderer',async()=>{
  const html=await adminHtml();
  assert.match(html,/class="jcs-sheet"/);
  assert.match(html,/class="jcs-report-head"/);
  assert.match(html,/class="jcs-nav"/);
  assert.equal((html.match(/class="jcs-chapter"/g)||[]).length,10);
  for(const marker of ['jcs-brand-tools','jcs-search-trend','jcs-age-chart','jcs-region-structure','jcs-support-svg','jcs-competitors','jcs-direction','jcs-persistence','jcs-treemap','jcs-foundations','jcs-action-metrics','jcs-total-grid'])assert.match(html,new RegExp(marker));
  assert.doesNotMatch(html,/class="[^"]*jcs-dx-module/);
  assert.doesNotMatch(html,/class="[^"]*jcs-dx-panel/);
  assert.doesNotMatch(html,/class="[^"]*jcs-approved-sheet/);
});

test('media panels expose full outlet names instead of ellipsized fragments',async()=>{
  const html=await adminHtml(),css=await readFile(new URL('../css/diagnosis-approved.css',import.meta.url),'utf8');
  assert.match(html,/jcs-media-list-grid/);
  assert.match(html,/>연합뉴스</);
  const legendCss=css.slice(css.lastIndexOf('#jcs-intelligence-nine .jcs-media-name'));
  assert.doesNotMatch(legendCss,/text-overflow:ellipsis/);
});

test('competitor renderer uses row agenda and election data rather than hard-coded empty cells',async()=>{
  const source=await readFile(new URL('../src/views/politicians.js',import.meta.url),'utf8');
  const render=source.slice(source.indexOf('function renderDxCompetitor'),source.indexOf('function renderDxRisk'));
  assert.doesNotMatch(render,/rows\.map\(\(\)=>'<div class="is-empty">데이터 부족<\/div>'\)/);
  assert.match(render,/row\.agendas/);
  assert.match(render,/row\.election/);
});

test('demographic and support visuals reset legacy positioning and keep three independent circles',async()=>{
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  assert.match(css,/\.jcs-dx-age-row header b\s*\{[^}]*position:static/);
  assert.match(css,/\.jcs-dx-support-orbit\s*\{[^}]*grid-template-columns:repeat\(3/);
  assert.match(css,/\.jcs-dx-support-orbit>div\s*\{[^}]*position:relative/);
});

test('approved demographic and support markup uses vertical age columns and three distinct shapes',async()=>{
  const html=await adminHtml();
  assert.match(html,/AGE × GENDER COMPOSITION/);
  assert.equal((html.match(/class="jcs-age-col"/g)||[]).length,5);
  assert.equal((html.match(/class="jcs-support-svg"/g)||[]).length,3);
  for(const label of ['코어','유동','이탈'])assert.match(html,new RegExp(`<p class="jcs-support-name">${label}<`));
});

test('persistence and media markup uses the approved curve and full outlet list',async()=>{
  const html=await adminHtml();
  assert.match(html,/class="jcs-persistence"/);
  assert.match(html,/30일 전/);
  assert.match(html,/오늘/);
  assert.match(html,/5대 메이저/);
  assert.match(html,/비메이저/);
  assert.match(html,/jcs-treemap/);
  assert.match(html,/jcs-media-list-grid/);
  assert.match(html,/전체 목록 접기/);
});

test('campaign and policy renderers remove repeated and connection-pending placeholders',async()=>{
  const html=await adminHtml();
  assert.doesNotMatch(html,/공식 프로필 기록|공식 득표율 연결 전|공식 득표 격차 연결 전|공식 경쟁자 기록 연결 전|지역별 공식 개표 데이터 연결 전/);
  assert.match(html,/정치 기반 흐름/);
  assert.match(html,/정치 활동·미디어 전환 진단/);
});

test('media removes duplicate search panel and summary contains only approved seven diagnosis sources',async()=>{
  const html=await adminHtml();
  const media=html.slice(html.indexOf('data-diagnosis-layout="07"'),html.indexOf('data-diagnosis-layout="08"'));
  assert.doesNotMatch(media,/PC·모바일 검색 관심|서칭엔진 검색추이/);
  for(const id of ['01','02','03','04','05','06','09'])assert.match(html,new RegExp(`data-summary-source="${id}"`));
  assert.doesNotMatch(html,/data-summary-source="0[78]"/);
});

test('approved report stays white and keeps the desktop two by two layouts',async()=>{
  const css=await readFile(new URL('../css/diagnosis-approved.css',import.meta.url),'utf8');
  const desktop=css.slice(0,css.indexOf('@media'));
  assert.match(desktop,/#jcs-intelligence-nine\s*\{[^}]*color-scheme:\s*light/);
  assert.doesNotMatch(desktop,/light-dark\(/);
  assert.match(desktop,/\.jcs-competitors\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(desktop,/\.jcs-foundations\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('local diagnosis always renders four message stages and four gap quadrants',async()=>{
  const html=await adminHtml();
  const local=html.slice(html.indexOf('data-diagnosis-layout="03"'),html.indexOf('data-diagnosis-layout="04"'));
  assert.equal((local.match(/class="jcs-message-node"/g)||[]).length,4);
  assert.equal((local.match(/class="jcs-gap-cell"/g)||[]).length,4);
  for(const label of ['수요 높음 · 대응 강함','수요 높음 · 대응 약함','수요 낮음 · 대응 강함','수요 낮음 · 대응 약함'])assert.match(local,new RegExp(label));
});

test('competitor period controls expose real period values for every comparison card',async()=>{
  const html=await adminHtml();
  const competitor=html.slice(html.indexOf('data-diagnosis-layout="05"'),html.indexOf('data-diagnosis-layout="06"'));
  assert.equal((competitor.match(/class="jcs-competitor(?: me)?"/g)||[]).length,4);
  assert.equal((competitor.match(/data-jcs-period="(?:24H|7D|30D)"/g)||[]).length,3);
  assert.equal((competitor.match(/data-jcs-period-value="(?:24H|7D|30D)"/g)||[]).length,12);
  assert.match(competitor,/data-jcs-period-label>30일 뉴스</);
});

test('media disclosure has a real controlled list and summary shows local fit status',async()=>{
  const html=await adminHtml();
  assert.equal((html.match(/data-jcs-period-panel="(?:24H|7D|30D)"/g)||[]).length,3);
  assert.equal((html.match(/class="jcs-media-toggle"/g)||[]).length,3);
  assert.match(html,/aria-controls="jcs-media-all-24h"/);
  assert.match(html,/class="jcs-media-list" id="jcs-media-all-30d"/);
  const summary=html.slice(html.indexOf('data-diagnosis-layout="10"'),html.indexOf('<\/div><\/section><section class="jcs-report-transition"'));
  assert.match(summary,/data-local-fit-status="(?:우세|중립|열세)"/);
  assert.match(summary,/메시지 적합 \d+/);
});

test('administrator identity and actions live in the approved report header without the legacy hero',async()=>{
  const html=await adminHtml(),head=html.slice(html.indexOf('<header class="jcs-report-head">'),html.indexOf('</header>',html.indexOf('<header class="jcs-report-head">')));
  assert.doesNotMatch(html,/person-detail-hero|person-live-hero/);
  for(const marker of ['국회의원','더불어민주당 · 서울 시각구','재선','정무위원회','목록으로','즐겨찾기 준비 중','비교하기','전체 NOW','분야별 NOW'])assert.match(head,new RegExp(marker));
  assert.match(head,/data-layout-route="\/now\?type=assembly"/);
  assert.match(head,/data-layout-route="\/compare\?ids=assembly-visual"/);
});

test('approved stylesheet is loaded last so its exact source typography wins the cascade',async()=>{
  const [index,html]=await Promise.all([readFile(new URL('../index.html',import.meta.url),'utf8'),adminHtml()]);
  const styles=[...index.matchAll(/<link[^>]+href="([^"]+\.css(?:\?[^\"]*)?)"/g)].map(match=>match[1]);
  assert.equal(styles.at(-1).split('?')[0],'/css/diagnosis-approved.css');
  assert.match(html,/person-live-detail-page jcs-approved-intelligence/);
  assert.doesNotMatch(html,/person-live-detail-page jcs-public-intelligence-v3/);
  assert.equal(await effectiveCssDeclaration('#jcs-intelligence-nine .jcs-person strong','font-size'),'18px');
  assert.equal(await effectiveCssDeclaration('#jcs-intelligence-nine .jcs-person small','font-size'),'12px');
  assert.equal(await effectiveCssDeclaration('#jcs-intelligence-nine .jcs-comp-row','font-size'),'11px');
  assert.equal(await effectiveCssDeclaration('#jcs-intelligence-nine .jcs-media-toggle','font-size'),'12px');
});
