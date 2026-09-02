import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir } from 'node:fs/promises';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
import { validatePoliticianSeed, writePoliticianSeed, TARGET_KEYS } from '../lib/migration-service.js';
import { renderPoliticianDirectory, renderPoliticianDetail } from '../src/views/politicians.js';

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

test('NOW category layout shows agreed pending state without imported rank values',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDirectory({list:async()=>({ok:true,total:300,items:[sample],hasMore:true})},'/now?type=assembly');
  assert.match(html,/NOW RANK · CATEGORY LEAGUE/);
  assert.match(html,/NOW Rank · 분야별 순위/);
  assert.match(html,/집계 준비 중/);
  assert.match(html,/김민석/);
  assert.doesNotMatch(html,/categoryRank|globalRank|score:/);
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

test('public politician detail uses the premium intelligence visual system',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})});
  assert.match(html,/data-design-system="jcs-public-intelligence-v2"/);
  assert.match(html,/class="[^"]*person-intelligence-cover/);
  assert.match(html,/class="[^"]*person-intelligence-gauge-grid/);
  assert.match(html,/class="[^"]*person-intelligence-visual-dual/);
  assert.match(html,/class="[^"]*person-intelligence-flow/);
  assert.match(html,/aria-label="활동·미디어 지표 시각화"/);
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
  assert.doesNotMatch(html,/데이터 연결 전|데이터 준비 중|미연결|modeled.*fallback/i);
});

test('administrator report merges identity and executive intelligence into one cover',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  assert.match(html,/data-design-system="jcs-private-intelligence-v2"/);
  assert.match(html,/<summary class="admin-intelligence-unified-cover"[\s\S]*JCS ADMIN PRIVATE POLITICAL INTELLIGENCE[\s\S]*EXECUTIVE INTELLIGENCE SUMMARY[\s\S]*당대표 전환·다채널 확산형[\s\S]*<\/summary>/);
  assert.doesNotMatch(html,/<section class="admin-pi-executive"/);
  for(const visual of ['admin-pi-heatmap-chapter','admin-pi-waterfall-chapter','admin-pi-resilience-chapter','admin-pi-propagation-chapter','admin-pi-impact-chapter','admin-pi-signal-board','admin-pi-evidence-ledger','admin-pi-strategy-roadmap'])assert.match(html,new RegExp(visual));
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
