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

test('politician detail contains profile and record only',async()=>{
  const sample={...POLITICIAN_SEED.profiles.assembly[0],photo:POLITICIAN_SEED.photos['assembly-001']};
  const html=await renderPoliticianDetail(sample.id,{get:async()=>({ok:true,item:sample})});
  assert.match(html,/PROFILE & RECORD/);
  assert.match(html,/공식 프로필과 정치 기록/);
  assert.match(html,/기본정보/);
  assert.match(html,/선거·임기/);
  assert.doesNotMatch(html,/전체 NOW|CORE INTELLIGENCE|분석지표|person-analysis/);
});
