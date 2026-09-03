import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir } from 'node:fs/promises';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
import { validatePoliticianSeed, writePoliticianSeed, TARGET_KEYS } from '../lib/migration-service.js';
import { renderPoliticianDirectory, renderPoliticianDetail } from '../src/views/politicians.js';
import { pilotForPolitician } from '../src/data/kim-minseok-pilot.js';

test('approved politician seed keeps 300 slots, 16 metropolitan and 227 basic records',()=>{
  const report=validatePoliticianSeed();
  assert.deepEqual(report.counts,{assembly:300,metropolitan:16,basic:227,total:543,people:542,vacancies:1,photos:515,missingPhotos:27});
  assert.equal(POLITICIAN_SEED.profiles.assembly.at(-1).id,'assembly-300');
  assert.equal(POLITICIAN_SEED.profiles.assembly.at(-1).isVacant,true);
});

test('politician seed contains no score, rank or analysis fields',()=>{
  const forbidden=/score|rank|analysis|intelligence|support|sentiment|trend|mention|metric|signal/i;
  for(const item of Object.values(POLITICIAN_SEED.profiles).flat())for(const key of Object.keys(item))assert.doesNotMatch(key,forbidden,`${item.id}:${key}`);
});

test('only successfully copied legacy photos are connected to profiles',async()=>{
  const files=(await readdir(new URL('../assets/politicians/',import.meta.url))).filter(name=>/\.(?:jpe?g|png|webp)$/i.test(name));
  assert.equal(files.length,515);
  for(const photo of Object.values(POLITICIAN_SEED.photos))await access(new URL(`..${photo.localPath}`,import.meta.url));
  assert.equal(POLITICIAN_SEED.photos['assembly-018'],undefined);
  assert.equal(POLITICIAN_SEED.photos['metropolitan-016'],undefined);
});

test('politician migration writes only isolated rebuild keys',async()=>{
  const writes=[];const command=async parts=>{writes.push(parts);return 'OK';};
  const report=await writePoliticianSeed(command);
  assert.equal(report.ok,true);
  assert.deepEqual(writes.map(parts=>parts[1]),[TARGET_KEYS.politicians('assembly'),TARGET_KEYS.politicians('metropolitan'),TARGET_KEYS.politicians('basic'),TARGET_KEYS.politicianPhotos,TARGET_KEYS.politicianMigration]);
  assert.equal(writes.some(parts=>String(parts[1]).startsWith('jcv3:')),false);
});

test('NOW category layout renders the published operating score and independent rank',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001'],now:{rank:3,categoryRank:2,score:87.4}};
  const html=await renderPoliticianDirectory({list:async()=>({ok:true,total:300,items:[sample],hasMore:true})},'/now?type=assembly');
  assert.match(html,/NOW RANK · CATEGORY LEAGUE/);
  assert.match(html,/NOW Rank · 분야별 순위/);
  assert.match(html,/NOW 87\.4/);
  assert.match(html,/전체 3위 · 국회의원 2위/);
  assert.match(html,/김민석/);
});

test('published detail uses one two-column NOW card without operational descriptions',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=structuredClone(pilotForPolitician(sample.id));
  intelligence.snapshot='jcs-operating';
  intelligence.rank={overall:3,category:2,temporary:false};
  intelligence.signal.index=87.4;
  intelligence.related[0]={...intelligence.related[0],photo:POLITICIAN_SEED.photos['assembly-002']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})});
  assert.match(html,/data-recent-politician/);
  assert.match(html,/data-recent-id="assembly-001"/);
  assert.match(html,/data-recent-name="김민석"/);
  assert.match(html,/data-recent-photo="\/assets\/politicians\/assembly-001\.jpg"/);
  assert.equal((html.match(/<span>전체 NOW<\/span>/g)||[]).length,1);
  assert.equal((html.match(/<span>분야별 NOW<\/span>/g)||[]).length,1);
  assert.match(html,/<strong>3위<\/strong>/);
  assert.match(html,/<strong>2위<\/strong>/);
  assert.doesNotMatch(html,/공개 스냅샷 운영 순위|국회의원 NOW 독립 순위/);
  assert.match(html,/허용 원자료 기반 JCS 운영 지수/);
  assert.match(html,/related-person-avatar has-photo/);
  assert.match(html,/\/assets\/politicians\/assembly-002\./);
  assert.match(html,/data-politician-avatar/);
  assert.match(html,/data-politician-photo/);
  assert.doesNotMatch(html,/임시 파일럿 순위|국회의원 임시 순위|파일럿 지수/);
});

test('missing operating ranks render 집계 전 in the same square NOW card',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[1]};
  const intelligence=structuredClone(pilotForPolitician('assembly-001'));intelligence.rank={overall:null,category:null,temporary:false};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})});
  assert.equal((html.match(/<strong>집계 전<\/strong>/g)||[]).length,2);
  assert.match(html,/person-hero-rank-split/);
});

test('administrator consulting callout follows the strategic conclusion inside the intelligence report',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=structuredClone(pilotForPolitician(sample.id));
  intelligence.snapshot='jcs-operating';
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  const conclusion=html.indexOf('STRATEGIC CONCLUSION'),consulting=html.indexOf('JCS STRATEGIC CONSULTING'),reportEnd=html.indexOf('</details>');
  assert.ok(conclusion>=0&&consulting>conclusion&&reportEnd>consulting);
  assert.match(html,/분석 다음은 실행입니다/);
  assert.match(html,/data-layout-route="\/partners">정참시와 함께하기/);
});

test('Kim Min-seok pilot fills the complete public detail from approved source classes',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})});
  const text=html.replaceAll('&amp;','&');
  for(const marker of ['정참시 SIGNAL','CORE INDICATORS','AUDIENCE LANDSCAPE','ACTIVITY & MEDIA','ATTENTION FLOW','RECENT NEWS','PROFILE & RECORD','RELATED POLITICIANS'])assert.match(text,new RegExp(marker));
  assert.doesNotMatch(text,/DEEP ANALYSIS|상세 분석 펼쳐보기|ANALYSIS TREND|관심 변화·NOW 이력/);
  assert.match(html,/PROFILE & RECORD/);
  assert.match(html,/공식 프로필과 정치 기록/);
  assert.match(html,/기본정보/);
  assert.match(html,/임기 · 선거정보/);
  assert.match(html,/김민석/);
  assert.match(html,/당대표 전환·다채널 확산형/);
  assert.match(html,/민생·실용·확장/);
  assert.match(html,/49,651표/);
  assert.match(html,/검색광고.*이번 산정에서 제외/);
  assert.doesNotMatch(html,/데이터 준비 중|미연결|modeled.*fallback/i);
  assert.doesNotMatch(html,/JCS ADMIN PRIVATE POLITICAL INTELLIGENCE/);
});

test('public politician detail uses the data-dense intelligence visual system',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})});
  assert.match(html,/data-design-system="jcs-public-intelligence-v3"/);
  assert.match(html,/class="[^"]*person-intelligence-cover/);
  assert.match(html,/class="[^"]*person-core-radar/);
  assert.match(html,/class="[^"]*person-activity-bars/);
  assert.match(html,/class="[^"]*person-attention-funnel/);
});

test('public politician intelligence v3 uses semantic visuals instead of repeated oversized score cards',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})});
  assert.match(html,/data-design-system="jcs-public-intelligence-v3"/);
  for(const visual of ['person-core-radar','person-core-bullet-ledger','person-audience-spectrum-v3','person-activity-bars','person-attention-funnel'])assert.match(html,new RegExp(visual));
  assert.match(html,/role="img" aria-label="김민석 핵심 분석지표 레이더 차트"/);
  assert.doesNotMatch(html,/person-intelligence-plot/);
});

test('admin Kim Min-seok detail fills private intelligence while identifying evidence mode',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  const text=html.replaceAll('&amp;','&');
  for(const marker of ['JCS ADMIN PRIVATE POLITICAL INTELLIGENCE','EXECUTIVE INTELLIGENCE SUMMARY','AGE × GENDER MATRIX','CORE SUPPORT DYNAMICS','POLITICAL RESILIENCE','MEDIA PROPAGATION','ISSUE IMPACT MAP','RISK & OPPORTUNITY','ATTENTION → SUPPORT GAP','COMPETITOR FLOW','EVIDENCE BASE','JCS STRATEGIC SOLUTION','JCS STRATEGIC CONSULTING','HISTORY INTELLIGENCE'])assert.match(text,new RegExp(marker));
  assert.match(html,/SINGLE-PERSON PILOT/);
  assert.match(html,/DIRECT/);
  assert.match(html,/CONTEXT/);
  assert.match(html,/EXCLUDED/);
  assert.match(html,/국민 여론조사 49\.30%/);
  assert.doesNotMatch(text,/DEEP ANALYSIS|상세 분석 펼쳐보기|ANALYSIS TREND|관심 변화·NOW 이력/);
  assert.match(text,/HISTORY INTELLIGENCE/);
  assert.doesNotMatch(html,/modeled.*fallback/i);
  assert.match(html,/SEARCH DATA CONNECTION REQUIRED/);
});

test('administrator report separates its compact identity gate from expanded executive intelligence',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  assert.match(html,/data-design-system="jcs-private-intelligence-v3"/);
  assert.match(html,/<summary class="admin-intelligence-report-gate-v3"[\s\S]*JCS ADMIN PRIVATE POLITICAL INTELLIGENCE[\s\S]*<\/summary>/);
  assert.match(html,/<section class="admin-intelligence-executive-v3"[\s\S]*EXECUTIVE INTELLIGENCE SUMMARY[\s\S]*당대표 전환·다채널 확산형/);
  for(const visual of ['admin-pi-heatmap-chapter','admin-pi-waterfall-chapter','admin-pi-resilience-chapter','admin-pi-propagation-chapter','admin-pi-impact-chapter','admin-pi-signal-board','admin-pi-evidence-ledger','admin-pi-strategy-roadmap'])assert.match(html,new RegExp(visual));
});

test('administrator report v3 keeps only report identity inside the collapsed summary',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  const summary=html.match(/<summary class="admin-intelligence-report-gate-v3"[\s\S]*?<\/summary>/)?.[0]||'';
  assert.match(summary,/JCS ADMIN PRIVATE POLITICAL INTELLIGENCE/);
  assert.match(summary,/허용 원자료와 JCS 해석을 분리한 단일 인물 파일럿 리포트 \(JCS 해석\)/);
  assert.match(summary,/REPORT STATUS[\s\S]*LIVE[\s\S]*리포트 열기/);
  assert.doesNotMatch(summary,/EXECUTIVE INTELLIGENCE SUMMARY|30D PULSE|EVIDENCE MODE/);
  assert.match(html,/class="admin-intelligence-executive-v3"/);
  assert.match(html,/EXECUTIVE INTELLIGENCE SUMMARY/);
  assert.equal((html.match(/JCS 해석/g)||[]).length,2,'the approved subtitle contains the phrase twice and no section repeats it');
});

test('administrator intelligence v3 assigns a distinct semantic visual to every existing chapter',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  for(const visual of ['admin-cohort-heatmap-v3','admin-support-bars-v3','admin-support-waterfall-v3','admin-support-radar-v3','admin-resilience-area-v3','admin-propagation-flow-v3','admin-issue-quadrant-v3','admin-risk-matrix-v3','admin-gap-dumbbell-v3','admin-competitor-flow-v3','admin-evidence-ledger-v3','admin-strategy-roadmap-v3','admin-history-timeline-v3'])assert.match(html,new RegExp(visual));
  assert.match(html,/--heat-opacity:0\.\d+/);
});

test('administrator intelligence v3 exposes data-ready derived chapters without inventing search volumes',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  for(const marker of ['DIGITAL DEMAND INTELLIGENCE','SEARCH INTENT MAP','NEWS NARRATIVE INTELLIGENCE','PUBLIC OPINION CONVERSION','CONSTITUENCY OPPORTUNITY','JCS CROSS INTELLIGENCE','30-DAY CONSULTING ACTION'])assert.match(html,new RegExp(marker));
  assert.match(html,/SEARCH DATA CONNECTION REQUIRED/);
  assert.doesNotMatch(html,/PC 검색량<\/[^>]+>\s*[0-9,]+|모바일 검색량<\/[^>]+>\s*[0-9,]+/);
});

test('member detail also omits duplicated public deep analysis and NOW trend',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{authenticated:true,user:{role:'member'}});
  assert.doesNotMatch(html.replaceAll('&amp;','&'),/DEEP ANALYSIS|상세 분석 펼쳐보기|ANALYSIS TREND|관심 변화·NOW 이력|HISTORY INTELLIGENCE/);
});

test('all non-pilot politicians keep the restored layout without invented analysis',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[1],photo:POLITICIAN_SEED.photos['assembly-002']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  assert.match(html,/데이터 준비 중/);
  assert.match(html,/데이터 연결 전/);
  assert.doesNotMatch(html.replaceAll('&amp;','&'),/DEEP ANALYSIS|상세 분석 펼쳐보기|ANALYSIS TREND|관심 변화·NOW 이력/);
  assert.doesNotMatch(html,/당대표 전환·다채널 확산형|SINGLE-PERSON PILOT/);
  assert.match(html,/class="person-core-radar is-pending"/);
  assert.match(html,/class="person-core-bullet-ledger"[\s\S]*?<strong>—<\/strong>/);
});

test('every non-pilot administrator detail uses the same semantic chapter layout as the Kim pilot',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[1],photo:POLITICIAN_SEED.photos['assembly-002']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  for(const visual of [
    'admin-cohort-heatmap-v3','admin-support-bars-v3','admin-support-waterfall-v3','admin-support-radar-v3',
    'admin-resilience-area-v3','admin-propagation-flow-v3','admin-issue-quadrant-v3','admin-risk-matrix-v3',
    'admin-gap-dumbbell-v3','admin-competitor-flow-v3','admin-evidence-ledger-v3','admin-strategy-roadmap-v3',
    'admin-news-narrative-v3','admin-opinion-conversion-v3','admin-constituency-opportunity-v3',
    'admin-cross-intelligence-v3','admin-message-market-v3','admin-action-kpi-v3','admin-history-timeline-v3'
  ])assert.match(html,new RegExp(visual));
  for(const heading of ['DIGITAL DEMAND INTELLIGENCE','SEARCH INTENT MAP','NEWS NARRATIVE INTELLIGENCE','PUBLIC OPINION CONVERSION','CONSTITUENCY OPPORTUNITY','JCS CROSS INTELLIGENCE','30-DAY CONSULTING ACTION','JCS STRATEGIC CONSULTING','HISTORY INTELLIGENCE'])assert.match(html,new RegExp(heading));
});

test('politician intelligence typography establishes readable size floors',()=>{
  const css=new URL('../css/pages.css',import.meta.url);
  return import('node:fs/promises').then(({readFile})=>readFile(css,'utf8')).then(text=>{
    const marker='JCS_0_0_12 · LUXURY POLITICAL INTELLIGENCE FINAL LAYER';
    const start=text.lastIndexOf(marker),legacy=text.lastIndexOf('JCS_0_0_6 exact legacy board geometry');
    assert.ok(start>legacy,'final typography layer must be physically after every legacy rule');
    const finalLayer=text.slice(start);
    assert.match(finalLayer,/\.person-live-detail-page\.jcs-public-intelligence-v2 :is\([^}]+\)\{[^}]*font-size:14px!important/);
    assert.match(finalLayer,/\.admin-intelligence-report-shell\.jcs-private-intelligence-v2 :is\([^}]+\)\{[^}]*font-size:14px!important/);
    assert.match(finalLayer,/@media\(max-width:680px\)[\s\S]*font-size:14px!important/);
  });
});

test('politician intelligence v3 final layer fixes typography and approved high-contrast tokens',()=>{
  const css=new URL('../css/pages.css',import.meta.url);
  return import('node:fs/promises').then(({readFile})=>readFile(css,'utf8')).then(text=>{
    const marker='JCS_0_0_13 · DATA-DENSE POLITICAL INTELLIGENCE FINAL LAYER';
    const start=text.lastIndexOf(marker);
    assert.ok(start>text.lastIndexOf('JCS_0_0_12 · LUXURY POLITICAL INTELLIGENCE FINAL LAYER'));
    const end=text.indexOf('JCS_0_0_27 · LEGACY DETAIL DENSITY',start);
    const layer=text.slice(start,end<0?undefined:end);
    assert.match(layer,/--jcs-v3-text:#173133/);
    assert.match(layer,/--jcs-v3-body:#30484a/i);
    assert.match(layer,/--jcs-v3-support:#65777a/i);
    assert.match(layer,/\.jcs-public-intelligence-v3 :is\([^}]+\)\{[^}]*font-size:14px!important/);
    assert.match(layer,/\.jcs-private-intelligence-v3 :is\([^}]+\)\{[^}]*font-size:14px!important/);
    const sub14=[...layer.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)].filter(match=>Number(match[1])<14);
    assert.deepEqual(sub14.map(match=>match[0]),[]);
  });
});

test('0.0.27 restores legacy politician detail density and square NOW geometry',async()=>{
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_27 · LEGACY DETAIL DENSITY');
  assert.ok(start>0);
  const layer=css.slice(start);
  assert.match(layer,/\.person-live-detail-page \.person-hero-rank-split\{[^}]*aspect-ratio:1\s*\/\s*1/);
  assert.match(layer,/\.person-live-detail-page \.radar-axis-label\{[^}]*font-size:10px!important/);
  assert.match(layer,/\.person-live-detail-page \.person-intelligence-cover-copy p\{[^}]*font-size:13px!important/);
});

test('release metadata and browser cache keys identify JCS 0.0.27',async()=>{
  const {readFile}=await import('node:fs/promises');
  const root=new URL('../',import.meta.url);
  const [pkg,lock,index,app,gateway]=await Promise.all([
    readFile(new URL('package.json',root),'utf8'),
    readFile(new URL('package-lock.json',root),'utf8'),
    readFile(new URL('index.html',root),'utf8'),
    readFile(new URL('src/app.js',root),'utf8'),
    readFile(new URL('api/gateway.js',root),'utf8')
  ]);
  assert.match(pkg,/"name": "jcs-0-0-27"/);
  assert.match(pkg,/"version": "0\.0\.27"/);
  assert.match(lock,/"name": "jcs-0-0-27"/);
  assert.match(lock,/"version": "0\.0\.27"/);
  assert.doesNotMatch(index+app,/v=0\.0\.(?:12|13|14|15|16|17|18|19|20|21|22|23|24|25|26)(?:\D|$)/);
  assert.match(index,/pages\.css\?v=0\.0\.27/);
  assert.match(app,/politicians\.js\?v=0\.0\.27/);
  assert.match(gateway,/version:'JCS_0_0_27'/);
});
