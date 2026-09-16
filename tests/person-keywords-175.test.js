import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchNaverKeywordVolume} from '../lib/naver-search-ads.js';
import {fetchGoogleNews,mergeNewsHistory} from '../lib/google-news.js';
import {collectPoliticianRaw} from '../lib/intelligence-collectors.js';
import {compactSearchMetrics} from '../lib/search-attention.js';

const person={id:'assembly-211',name:'박지원',type:'assembly',jurisdiction:'전북 군산시김제시부안군을'};
const collectionProfile={mode:'specified',searchKeywords:['전북박지원','군산박지원','김제박지원','부안박지원'],newsRegions:['전북','군산','김제','부안']};
const env={NAVER_AD_ACCESS_LICENSE:'test',NAVER_AD_SECRET_KEY:'test',NAVER_AD_CUSTOMER_ID:'test'};
const now=()=>Date.parse('2026-09-16T12:00:00Z');
test('specified search only sums exact selected keywords and preserves unreported volumes',async()=>{
 const requests=[],fetchImpl=async url=>{requests.push(new URL(url).searchParams.get('hintKeywords'));return {ok:true,json:async()=>({keywordList:[
  {relKeyword:'박지원',monthlyPcQcCnt:900000,monthlyMobileQcCnt:900000},
  {relKeyword:'전북박지원',monthlyPcQcCnt:20,monthlyMobileQcCnt:30},
  {relKeyword:'군산 박지원',monthlyPcQcCnt:'< 10',monthlyMobileQcCnt:40},
  {relKeyword:'김제박지원',monthlyPcQcCnt:10,monthlyMobileQcCnt:20}
 ]})};};
 const result=await fetchNaverKeywordVolume(person,{env,fetchImpl,now,collectionProfile});
 assert.ok(requests.every(q=>!q.split(',').includes('박지원')));
 assert.equal(result.keywordMode,'specified');assert.equal(result.keywords.length,4);
 assert.equal(result.confirmedVolume.total,120);assert.equal(result.volume.total,null);
 assert.equal(result.keywords.find(k=>k.keyword==='군산박지원').volume.pc,null);
 assert.equal(result.keywords.find(k=>k.keyword==='부안박지원').status,'unavailable');
 const compact=compactSearchMetrics(result);assert.deepEqual(compact.keywords,result.keywords);assert.equal(compact.confirmedVolume.total,120);
});
test('restricted news needs the name and a regional term, and repeated RSS results count once',async()=>{
 const queries=[],items=['박지원 전북 예산 확보','박지원 해남 정책 발표','군산 경제 소식','군산 박지원 시민 간담회'];
 const rss='<rss><channel>'+items.map((title,i)=>`<item><title>${title}</title><link>https://example.org/${i}</link><pubDate>Wed, 16 Sep 2026 01:00:00 GMT</pubDate><source>연합뉴스</source></item>`).join('')+'</channel></rss>';
 const result=await fetchGoogleNews(person,{collectionProfile,now,fetchImpl:async url=>{queries.push(new URL(url).searchParams.get('q'));return {ok:true,text:async()=>rss};}});
 assert.equal(result.items.length,2);assert.ok(result.items.every(x=>/전북|군산/.test(x.title)));
 assert.ok(queries.every(q=>q.includes('박지원')&&q.includes('전북')&&q.includes('부안')));
});
test('a collection scope change discards the mixed old news ledger',()=>{
 const date='2026-09-16',previous={scope:'name:박지원',daily:[{date,keys:['wrong-person'],collected:true,count:1}]};
 const ledger=mergeNewsHistory(previous,{collectionScope:'specified:regional',items:[],coverage:[{date,collected:true,truncated:false}]},new Date(now()).toISOString());
 assert.deepEqual(ledger.daily.find(x=>x.date===date).keys,[]);assert.equal(ledger.scope,'specified:regional');
});
test('ordinary name-only collection preserves the pre-upgrade daily news history',()=>{
 const date='2026-09-16',previous={daily:[{date,keys:['correct-old-article'],collected:true,count:1}]};
 const ledger=mergeNewsHistory(previous,{collectionScope:'name:normal',items:[],coverage:[]},new Date(now()).toISOString());
 assert.deepEqual(ledger.daily.find(x=>x.date===date).keys,['correct-old-article']);
});
test('collectors receive the selected profile rather than falling back to the bare name',async()=>{
 const queries=[],fetchImpl=async url=>{const u=new URL(url);if(u.hostname==='api.searchad.naver.com'){queries.push(u.searchParams.get('hintKeywords'));return {ok:true,json:async()=>({keywordList:collectionProfile.searchKeywords.map(relKeyword=>({relKeyword,monthlyPcQcCnt:10,monthlyMobileQcCnt:10}))})};}return {ok:true,text:async()=>'<rss><channel></channel></rss>'};};
 const raw=await collectPoliticianRaw(person,{collectionProfile},{env,now,fetchImpl,retryDelays:[0]});
 assert.equal(raw.searchAds.confirmedVolume?.total,80);assert.ok(queries.every(q=>q!=='박지원'));assert.equal(raw.collectionProfile?.mode,'specified');
});
