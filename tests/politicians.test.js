import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir } from 'node:fs/promises';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
import { validatePoliticianSeed, writePoliticianSeed, TARGET_KEYS } from '../lib/migration-service.js';
import { renderPoliticianDirectory, renderPoliticianDetail } from '../src/views/politicians.js';
import { pilotForPolitician } from '../src/data/kim-minseok-pilot.js';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';

const reportForSample=sample=>{const pilot=pilotForPolitician('assembly-001');return {...buildIntelligenceDraft(sample,{snapshotId:'2026-09-02',collectedAt:'2026-09-02T00:00:00.000Z',searchAds:{volume:{pc:1200,mobile:6400}},news:{items:(pilot.news||[]).map(row=>({title:row.title,source:row.source,url:row.url,publishedAt:row.date}))},sourceErrors:[]},{peers:[]},'JCS_INTELLIGENCE_V2'),rank:{overall:1,category:1,temporary:false},activities:pilot.activities,achievements:pilot.achievements,policies:pilot.policies,related:pilot.related};};

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
  assert.ok(files.length>=Object.keys(POLITICIAN_SEED.photos).length);
  assert.equal(Object.keys(POLITICIAN_SEED.photos).length,515);
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
  const intelligence=structuredClone(reportForSample(sample));
  intelligence.snapshot='jcs-operating';
  intelligence.rank={overall:3,category:2,temporary:false};
  intelligence.related[0]={...intelligence.related[0],photo:POLITICIAN_SEED.photos['assembly-002']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence:projectIntelligence(intelligence,'public','detail')})});
  assert.match(html,/data-recent-politician/);
  assert.match(html,/data-recent-id="assembly-001"/);
  assert.match(html,/data-recent-name="김민석"/);
  assert.match(html,/data-recent-photo="\/assets\/politicians\/assembly-001\.jpg"/);
  assert.equal((html.match(/<span>전체 NOW<\/span>/g)||[]).length,1);
  assert.equal((html.match(/person-hero-rank-cell"><span>국회의원<\/span>/g)||[]).length,1);
  assert.match(html,/<strong>3위<\/strong>/);
  assert.match(html,/<strong>2위<\/strong>/);
  assert.doesNotMatch(html,/공개 스냅샷 운영 순위|국회의원 NOW 독립 순위/);
  assert.match(html,/JCS OPEN POLITICAL SNAPSHOT/);
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,3);
  assert.match(html,/related-person-avatar has-photo/);
  assert.match(html,/\/assets\/politicians\/assembly-002\./);
  assert.match(html,/data-politician-avatar/);
  assert.match(html,/data-politician-photo/);
  assert.doesNotMatch(html,/임시 파일럿 순위|국회의원 임시 순위|파일럿 지수/);
});

test('missing operating ranks render 집계 전 in the same compact NOW card',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[1]};
  const intelligence=structuredClone(reportForSample(sample));intelligence.rank={overall:null,category:null,temporary:false};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence:projectIntelligence(intelligence,'public','detail')})});
  assert.equal((html.match(/<strong>집계 전<\/strong>/g)||[]).length,2);
  assert.match(html,/person-hero-rank-split/);
});

test('administrator consulting callout follows the strategic conclusion inside the intelligence report',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=structuredClone(reportForSample(sample));
  intelligence.snapshot='jcs-operating';
  const projected=projectIntelligence(intelligence,'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence:projected})},{user:{role:'admin'}});
  const conclusion=html.indexOf('정참시 전략 판단'),consulting=html.indexOf('JCS STRATEGIC CONSULTING');
  assert.ok(conclusion>=0&&consulting>conclusion);
  assert.match(html,/분석 다음은 실행입니다/);
  assert.match(html,/data-layout-route="\/partners">정참시와 함께하기/);
});

test('Kim Min-seok published report fills the three approved public diagnostic topics',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'public','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})});
  const text=html.replaceAll('&amp;','&');
  for(const marker of ['JCS OPEN POLITICAL SNAPSHOT','정치인 브랜드 진단','언론·온라인 영향력 분석','정책·공약 반응 분석','RECENT NEWS','PROFILE & RECORD','RELATED POLITICIANS'])assert.match(text,new RegExp(marker));
  assert.match(html,/PROFILE & RECORD/);
  assert.match(html,/공식 프로필과 정치 기록/);
  assert.match(html,/기본정보/);
  assert.match(html,/임기 · 선거정보/);
  assert.match(html,/김민석/);
  assert.match(html,/민생·경제|리더십·정당/);
  assert.match(html,/민생·실용·확장/);
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,3);
  assert.doesNotMatch(html,/핵심 원인|실행 처방|modeled.*fallback/i);
  assert.doesNotMatch(html,/JCS ADMIN PRIVATE POLITICAL INTELLIGENCE/);
});

test('public politician detail uses the compact three-card diagnostic system',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'public','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})});
  assert.match(html,/jcs-diagnostics-public-grid/);
  assert.equal((html.match(/jcs-diagnostic-public-topic/g)||[]).length,3);
  assert.match(html,/jcs-diagnostic-spark/);
});

test('public politician diagnostics omit member and administrator modules',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'public','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})});
  assert.match(html,/JCS OPEN POLITICAL SNAPSHOT/);
  assert.doesNotMatch(html,/JCS MEMBER POLITICAL ANALYSIS|JCS ADMIN POLITICAL INTELLIGENCE|실행 처방/);
});

test('admin Kim Min-seok detail renders all ten evidence and prescription modules',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  const text=html.replaceAll('&amp;','&');
  for(const marker of ['JCS ADMIN POLITICAL INTELLIGENCE','정치인 브랜드 진단','세대·성별 지지구조 분석','핵심 지지층 결집도 분석','이슈·위기 위험도 진단','선거·캠페인 경쟁력 진단','중장기 정치 성장 진단','JCS STRATEGIC CONSULTING'])assert.match(text,new RegExp(marker));
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,10);
  assert.match(html,/근거 데이터/);
  assert.match(html,/실행 처방/);
  assert.doesNotMatch(html,/modeled.*fallback|"raw"/i);
});

test('administrator report uses compact topic headers and report fields',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  assert.equal((html.match(/class="jcs-diagnostic-topic jcs-diagnostic-admin-topic"/g)||[]).length,10);
  for(const field of ['현재 위치','변화 흐름','근거 데이터','기회 요인','위험 요인','정참시 전략 판단','실행 처방','실행 우선순위','예상 변화 및 추적 지표'])assert.match(html,new RegExp(field));
  assert.doesNotMatch(html,/>비교 기준<|>분석 기준</);
});

test('administrator report does not use a collapsed dashboard gate',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  assert.match(html,/jcs-diagnostics-admin/);
  assert.doesNotMatch(html,/admin-intelligence-report-gate-v3|EXECUTIVE INTELLIGENCE SUMMARY/);
});

test('administrator intelligence assigns stable status to every diagnostic topic',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,10);
});

test('administrator intelligence exposes source dates without inventing unavailable values',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const intelligence=projectIntelligence(reportForSample(sample),'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  assert.doesNotMatch(html,/>분석 기준</);
  assert.match(html,/2026-09-02/);
  assert.doesNotMatch(html,/data-generated-value/);
});

test('member detail also omits duplicated public deep analysis and NOW trend',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{authenticated:true,user:{role:'member'}});
  assert.doesNotMatch(html.replaceAll('&amp;','&'),/DEEP ANALYSIS|상세 분석 펼쳐보기|ANALYSIS TREND|관심 변화·NOW 이력|HISTORY INTELLIGENCE/);
});

test('all politicians keep the restored layout with complete structural diagnostics',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[1],photo:POLITICIAN_SEED.photos['assembly-002']};
  const intelligence=projectIntelligence(reportForSample(sample),'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,10);
  assert.doesNotMatch(html,/당대표 전환·다채널 확산형|SINGLE-PERSON PILOT|data-generated-value/);
  assert.match(html,/공식 프로필과 정치 기록/);
});

test('every politician administrator detail uses the same ten-topic report layout',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[1],photo:POLITICIAN_SEED.photos['assembly-002']};
  const intelligence=projectIntelligence(reportForSample(sample),'admin','detail');
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample,intelligence})},{user:{role:'admin'}});
  assert.equal((html.match(/data-diagnostic-topic=/g)||[]).length,10);
  assert.match(html,/JCS ADMIN POLITICAL INTELLIGENCE/);
  assert.match(html,/JCS STRATEGIC CONSULTING/);
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

test('0.0.27 restores legacy politician detail density before the corrected NOW geometry',async()=>{
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../css/pages.css',import.meta.url),'utf8');
  const start=css.lastIndexOf('JCS_0_0_27 · LEGACY DETAIL DENSITY');
  assert.ok(start>0);
  const end=css.indexOf('JCS_0_0_27_1 · CORRECTION HOTFIX',start),layer=css.slice(start,end);
  assert.match(layer,/\.person-live-detail-page \.person-hero-rank-split\{[^}]*aspect-ratio:1\s*\/\s*1/);
  assert.match(layer,/\.person-live-detail-page \.radar-axis-label\{[^}]*font-size:10px!important/);
  assert.match(layer,/\.person-live-detail-page \.person-intelligence-cover-copy p\{[^}]*font-size:13px!important/);
});

test('release metadata and browser cache keys identify JCS 0.0.30.2',async()=>{
  const {readFile}=await import('node:fs/promises');
  const root=new URL('../',import.meta.url);
  const [pkg,lock,index,app,gateway]=await Promise.all([
    readFile(new URL('package.json',root),'utf8'),
    readFile(new URL('package-lock.json',root),'utf8'),
    readFile(new URL('index.html',root),'utf8'),
    readFile(new URL('src/app.js',root),'utf8'),
    readFile(new URL('api/gateway.js',root),'utf8')
  ]);
  assert.match(pkg,/"name": "jcs-0-0-30-2"/);
  assert.match(pkg,/"version": "0\.0\.30-2"/);
  assert.match(lock,/"name": "jcs-0-0-30-2"/);
  assert.match(lock,/"version": "0\.0\.30-2"/);
  assert.doesNotMatch(index+app,/v=0\.0\.(?:12|13|14|15|16|17|18|19|20|21|22|23|24|25|26)(?:\D|$)/);
  assert.match(index,/pages\.css\?v=0\.0\.30\.2/);
  assert.match(app,/politicians\.js\?v=0\.0\.30\.2/);
  assert.match(gateway,/version:'JCS_0_0_30_2'/);
});
