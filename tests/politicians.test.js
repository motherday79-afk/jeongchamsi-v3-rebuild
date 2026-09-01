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

test('politician detail restores the complete public layout but connects only profile data',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})});
  const text=html.replaceAll('&amp;','&');
  for(const marker of ['정참시 SIGNAL','CORE INDICATORS','AUDIENCE LANDSCAPE','ACTIVITY & MEDIA','ATTENTION FLOW','DEEP ANALYSIS','ANALYSIS TREND','RECENT NEWS','PROFILE & RECORD','RELATED POLITICIANS'])assert.match(text,new RegExp(marker));
  assert.match(html,/PROFILE & RECORD/);
  assert.match(html,/공식 프로필과 정치 기록/);
  assert.match(html,/기본정보/);
  assert.match(html,/임기 · 선거정보/);
  assert.match(html,/김민석/);
  assert.match(html,/데이터 준비 중/);
  assert.doesNotMatch(html,/76\.9|99\/100|전면 급상승형|NOW 1위/);
  assert.doesNotMatch(html,/JCS ADMIN PRIVATE POLITICAL INTELLIGENCE/);
});

test('admin politician detail restores private intelligence and history shells without values',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})},{user:{role:'admin'}});
  const text=html.replaceAll('&amp;','&');
  for(const marker of ['JCS ADMIN PRIVATE POLITICAL INTELLIGENCE','EXECUTIVE INTELLIGENCE SUMMARY','AGE × GENDER MATRIX','CORE SUPPORT DYNAMICS','POLITICAL RESILIENCE','MEDIA PROPAGATION','ISSUE IMPACT MAP','RISK & OPPORTUNITY','ATTENTION → SUPPORT GAP','COMPETITOR FLOW','EVIDENCE BASE','JCS STRATEGIC SOLUTION','JCS STRATEGIC CONSULTING','HISTORY INTELLIGENCE'])assert.match(text,new RegExp(marker));
  assert.match(html,/데이터 연결 전/);
  assert.doesNotMatch(html,/76\.9|99\/100|전면 급상승형|NOW 1위/);
});
