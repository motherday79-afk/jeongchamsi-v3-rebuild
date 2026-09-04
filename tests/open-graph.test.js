import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildShareMetadata, renderShareDocument, SITE_ORIGIN } from '../lib/share-metadata.js';

const people={
  'assembly-001':{id:'assembly-001',name:'김민석',party:'더불어민주당',office:'국회의원',jurisdiction:'서울 영등포구',photo:{localPath:'/assets/politicians/assembly-001.webp'}},
  'assembly-002':{id:'assembly-002',name:'홍준표',party:'국민의힘',office:'정치인',jurisdiction:'대구',photo:{localPath:'/assets/politicians/assembly-002.webp'}},
  'assembly-003':{id:'assembly-003',name:'오세훈',party:'국민의힘',office:'서울특별시장',jurisdiction:'서울특별시',photo:{localPath:'/assets/politicians/assembly-003.png'}}
};
const domains={
  columns:{items:[{id:'column-1',title:'정치를 읽는 새로운 기준',summary:'데이터로 정치의 흐름을 읽습니다.',coverImage:'/assets/content/column-1.webp',published:true},{id:'column-2',title:'두 번째 칼럼',body:'대표 이미지 없이 작성된 두 번째 칼럼 본문입니다.',published:true},{id:'column-3',title:'지역 정치의 오늘',summary:'지역 의제와 시민 반응을 살펴봅니다.',coverImage:'/assets/content/column-3.png',published:true},{id:'private',title:'비공개 칼럼',body:'관리자 내부 문장',published:false}]},
  community:{items:[{id:'community-1',title:'시민의 질문',body:'공개 게시글 본문입니다.',authorEmail:'private@example.com',adminMemo:'관리자 메모',published:true}]},
  itsme:{items:[{id:'itsme-1',title:'청년 주거 제안',summary:'청년 주거 비용을 낮추는 정책 제안',published:true}]},
  news:{items:[{id:'news-1',title:'정참시 뉴스 브리핑',summary:'오늘의 공개 정치 뉴스 요약',coverImage:'https://images.example.com/news.webp',published:true}]},
  academy:{slots:[{id:'academy-1',title:'정치 데이터 읽기',description:'실전 정치 데이터 강의',published:true}]},
  polls:{items:[{id:'poll-1',title:'정참시민 전국 평가제',description:'시민이 직접 평가하는 공개 콘텐츠',published:true}]},
  generation:{title:'세대별로 대통령을 뽑는다면?',description:'세대별 선택을 공개 데이터로 확인합니다.'},
  nationalEvaluation:{title:'정참시민 전국 평가제',description:'전국 시민 평가 결과를 확인합니다.'}
};
const source={getPolitician:async id=>people[id]||null,readDomain:async domain=>domains[domain]||null};

test('main metadata uses the official canonical domain and dedicated brand image',async()=>{
  const meta=await buildShareMetadata('/',source);
  assert.equal(meta.title,'정참시 — 정치에 참여할 시간');
  assert.match(meta.description,/대한민국 정치 데이터 플랫폼 JEONGCHAMSI/);
  assert.equal(meta.url,`${SITE_ORIGIN}/`);
  assert.equal(meta.image,`${SITE_ORIGIN}/assets/og/jcs-main.png`);
  assert.equal(meta.type,'website');
});

test('three politician URLs produce distinct public profile cards without intelligence fields',async()=>{
  const cards=await Promise.all(Object.keys(people).map(id=>buildShareMetadata(`/person/${id}`,source)));
  assert.deepEqual(cards.map(card=>card.title),['김민석 | 정참시 정치인 데이터','홍준표 | 정참시 정치인 데이터','오세훈 | 정참시 정치인 데이터']);
  assert.equal(new Set(cards.map(card=>card.image)).size,3);
  for(const card of cards){
    assert.match(card.description,/정참시 공개 정치 데이터/);
    assert.doesNotMatch(JSON.stringify(card),/전략|처방|취약점|관리자/);
    assert.match(card.url,/^https:\/\/www\.jeongchamsi\.com\/person\//);
  }
});

test('content routes use their own copy and apply section fallback when an image is missing',async()=>{
  const column=await buildShareMetadata('/column/column-1',source);
  const fallback=await buildShareMetadata('/column/column-2',source);
  const third=await buildShareMetadata('/column/column-3',source);
  const news=await buildShareMetadata('/news/news-1',source);
  const itsme=await buildShareMetadata('/itsme/itsme-1',source);
  assert.equal(column.title,'정치를 읽는 새로운 기준');
  assert.equal(column.image,`${SITE_ORIGIN}/assets/content/column-1.webp`);
  assert.equal(fallback.image,`${SITE_ORIGIN}/assets/og/jcs-column.png`);
  assert.deepEqual([column.title,fallback.title,third.title],['정치를 읽는 새로운 기준','두 번째 칼럼','지역 정치의 오늘']);
  assert.equal(new Set([column.image,fallback.image,third.image]).size,3);
  assert.equal(news.image,'https://images.example.com/news.webp');
  assert.match(itsme.description,/청년 주거 비용/);
});

test('community cards never serialize private or administrator fields',async()=>{
  const card=await buildShareMetadata('/community/community-1',source);
  const serialized=JSON.stringify(card);
  assert.equal(card.title,'시민의 질문');
  assert.doesNotMatch(serialized,/private@example\.com|관리자 메모|authorEmail|adminMemo/);
});

test('academy and participation routes receive their own service metadata',async()=>{
  const academy=await buildShareMetadata('/academy/academy-1',source);
  const evaluation=await buildShareMetadata('/national-evaluation',source);
  const generation=await buildShareMetadata('/generation-president',source);
  const president=await buildShareMetadata('/president',source);
  assert.equal(academy.title,'정치 데이터 읽기');
  assert.match(academy.description,/실전 정치 데이터 강의/);
  assert.equal(evaluation.title,'정참시민 전국 평가제');
  assert.equal(generation.title,'세대별로 대통령을 뽑는다면?');
  assert.equal(president.image,`${SITE_ORIGIN}/assets/og/jcs-president.png`);
  assert.equal(new Set([academy.image,evaluation.image,generation.image,president.image]).size,4);
});

test('public comparison is limited to two profiles and keeps administrator intelligence out',async()=>{
  const card=await buildShareMetadata('/compare?ids=assembly-001,assembly-002,assembly-003&admin=1',source);
  assert.equal(card.title,'김민석 vs 홍준표 | 정참시 정치인 비교');
  assert.match(card.description,/김민석과 홍준표/);
  assert.equal(card.url,`${SITE_ORIGIN}/compare?ids=assembly-001%2Cassembly-002`);
  assert.equal(card.image,`${SITE_ORIGIN}/assets/og/jcs-compare.png`);
  assert.doesNotMatch(JSON.stringify(card),/admin|전략|처방/);
});

test('server document contains complete crawler-readable Open Graph and Twitter metadata',async()=>{
  const meta=await buildShareMetadata('/column/column-1',source);
  const html=renderShareDocument(meta,'<!doctype html><html lang="ko"><head><title>old</title></head><body><div id="app"></div><script type="module" src="/src/app.js"></script></body></html>');
  for(const marker of ['property="og:title"','property="og:description"','property="og:image"','property="og:url"','property="og:type"','name="twitter:card"','name="twitter:title"','name="twitter:description"','name="twitter:image"','rel="canonical"'])assert.match(html,new RegExp(marker));
  assert.match(html,/정치를 읽는 새로운 기준/);
  assert.doesNotMatch(html,/<title>old<\/title>/);
});

test('unpublished or missing content returns a safe section card instead of leaking its data',async()=>{
  const hidden=await buildShareMetadata('/column/private',source);
  assert.equal(hidden.title,'정참시 칼럼 | JEONGCHAMSI');
  assert.doesNotMatch(JSON.stringify(hidden),/비공개 칼럼|관리자 내부 문장/);
  assert.equal(hidden.image,`${SITE_ORIGIN}/assets/og/jcs-column.png`);
});

test('all section fallback images are real 1200 by 630 PNG assets',async()=>{
  for(const name of ['main','politician','column','news','itsme','community','academy','evaluation','generation','president','compare']){
    const data=await readFile(new URL(`../assets/og/jcs-${name}.png`,import.meta.url));
    assert.equal(data.subarray(1,4).toString(),'PNG');
    assert.equal(data.readUInt32BE(16),1200);
    assert.equal(data.readUInt32BE(20),630);
  }
});
