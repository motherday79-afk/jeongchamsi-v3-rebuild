import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchGoogleNews, googleNewsFingerprint, mergeNewsHistory, parseGoogleNewsRss } from '../lib/google-news.js';

const rss=items=>`<rss><channel>${items.map(row=>`<item><title>${row.title}</title><description>${row.description||''}</description><link>${row.url}</link><pubDate>${row.date}</pubDate><source>${row.source||'테스트뉴스'}</source></item>`).join('')}</channel></rss>`;
const NOW=Date.parse('2026-09-06T12:00:00Z');

test('publisher normalization preserves previously saved RSS article exclusions',async()=>{
  for(const source of ['yna.co.kr','MBC']){
    const raw={title:'고민정 정책 발표',source,url:'https://news.example/stable',date:'Sun, 06 Sep 2026 08:00:00 GMT'};
    const fingerprint=googleNewsFingerprint(raw);
    const result=await fetchGoogleNews({id:'assembly-001',name:'고민정'},{fetchImpl:async()=>({ok:true,text:async()=>rss([raw])}),now:()=>NOW,exclusions:[fingerprint]});
    assert.equal(result.items.length,0,`${source}: saved exclusion must still match`);
    assert.ok(result.excludedCount>0);
  }
});

test('recollecting an article with a normalized publisher does not increase saved history counts',()=>{
  for(const [source,publisher] of [['yna.co.kr','연합뉴스'],['MBC','MBC뉴스']]){
    const raw={title:'고민정 정책 발표',source,url:'https://news.example/stable',date:'Sun, 06 Sep 2026 08:00:00 GMT'};
    const previous=mergeNewsHistory({},{items:[{...raw,publishedAt:raw.date}],coverage:[]},new Date(NOW).toISOString());
    const [parsed]=parseGoogleNewsRss(rss([raw]));
    assert.equal(parsed.source,publisher);
    const next=mergeNewsHistory(previous,{items:[parsed],coverage:[]},new Date(NOW).toISOString());
    assert.equal(next.daily.find(row=>row.date==='2026-09-06').count,1,`${source}: recollection must reuse original identity`);
  }
});

test('Google News uses bounded 1d, 7d, and 30d queries and discards stale relevance results',async()=>{
  const urls=[];
  const fetchImpl=async url=>{urls.push(decodeURIComponent(url));return {ok:true,text:async()=>rss([
    {title:'고민정 지역 현장 간담회',url:'https://news.example/recent',date:'Sun, 06 Sep 2026 08:00:00 GMT'},
    {title:'고민정 과거 기사',url:'https://news.example/stale',date:'Tue, 01 Jul 2026 08:00:00 GMT'}
  ])};};
  const result=await fetchGoogleNews({id:'assembly-001',name:'고민정',party:'더불어민주당',jurisdiction:'서울 광진구을'},{fetchImpl,now:()=>NOW});
  assert.equal(urls.length,5);
  assert.match(urls[0],/after:2026-08-06/);assert.match(urls.at(-1),/before:2026-09-07/);assert.equal(result.coverage.length,31);
  assert.equal(result.items.some(row=>row.url.includes('stale')),false);
  assert.deepEqual(result.periodCounts,{h24:1,d7:1,d30:1});
});

test('Google News deduplicates merged feeds, rejects another person, and applies saved exclusions',async()=>{
  const accepted={title:'고민정 민주당 정책 발표',description:'서울 광진구을 현장',url:'https://news.example/a',date:'Sun, 06 Sep 2026 08:00:00 GMT',source:'A뉴스'};
  const falsePositive={title:'김민정 고민 보도',description:'다른 인물 기사',url:'https://news.example/b',date:'Sun, 06 Sep 2026 09:00:00 GMT'};
  const fingerprint=googleNewsFingerprint({title:accepted.title,source:accepted.source});
  const fetchImpl=async()=>({ok:true,text:async()=>rss([accepted,accepted,falsePositive])});
  const result=await fetchGoogleNews({id:'assembly-001',name:'고민정',party:'더불어민주당'},{fetchImpl,now:()=>NOW,exclusions:[fingerprint]});
  assert.equal(result.items.length,0);
  assert.equal(result.excludedCount>=1,true);
  assert.deepEqual(result.periodCounts,{h24:0,d7:0,d30:0});
});

test('Google News period windows remain monotonic and record collection basis',async()=>{
  const items=[
    {title:'고민정 오늘 일정',url:'https://news.example/1',date:'Sun, 06 Sep 2026 08:00:00 GMT'},
    {title:'고민정 주간 활동',url:'https://news.example/2',date:'Thu, 03 Sep 2026 08:00:00 GMT'},
    {title:'고민정 월간 활동',url:'https://news.example/3',date:'Thu, 20 Aug 2026 08:00:00 GMT'}
  ];
  const result=await fetchGoogleNews({id:'assembly-001',name:'고민정'},{fetchImpl:async()=>({ok:true,text:async()=>rss(items)}),now:()=>NOW});
  assert.deepEqual(result.periodCounts,{h24:1,d7:2,d30:3});
  assert.equal(result.queryBasis,'Google News RSS · 한국 날짜 기준 30일 전~오늘, 기간 분할 수집');
  assert.equal(result.queries.length,5);
});
