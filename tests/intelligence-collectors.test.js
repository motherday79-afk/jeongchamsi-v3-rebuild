import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNaverSignature,
  naverCredentialStatus,
  fetchNaverKeywordVolume,
} from '../lib/naver-search-ads.js';
import { fetchGoogleNews } from '../lib/google-news.js';
import { collectPoliticianRaw } from '../lib/intelligence-collectors.js';

const credentials={
  NAVER_AD_ACCESS_LICENSE:'access-license',
  NAVER_AD_SECRET_KEY:'secret-key',
  NAVER_AD_CUSTOMER_ID:'customer-1'
};

test('Naver signature matches the documented HMAC-SHA256 Base64 contract',()=>{
  assert.equal(createNaverSignature({timestamp:'1700000000000',method:'GET',uri:'/keywordstool',secret:'secret-key'}),'W36UoKa4A2YA0CeiPcIkr6EEjdpEfLZmO+/k+2kP8CY=');
});

test('Naver credential status reports only readiness and missing key names',()=>{
  assert.deepEqual(naverCredentialStatus(credentials),{configured:true,missing:[]});
  assert.deepEqual(naverCredentialStatus({NAVER_AD_ACCESS_LICENSE:'x'}),{
    configured:false,
    missing:['NAVER_AD_SECRET_KEY','NAVER_AD_CUSTOMER_ID']
  });
  assert.doesNotMatch(JSON.stringify(naverCredentialStatus(credentials)),/access-license|secret-key|customer-1/);
});

test('Naver keyword collector preserves PC and mobile monthly volumes without exposing credentials',async()=>{
  let request=null;
  const fetchImpl=async(url,options)=>{
    request={url,options};
    return {ok:true,status:200,json:async()=>({keywordList:[{relKeyword:'김민석',monthlyPcQcCnt:1500,monthlyMobileQcCnt:10000}]})};
  };
  const result=await fetchNaverKeywordVolume({id:'assembly-001',name:'김민석'},{fetchImpl,env:credentials,now:()=>1700000000000});
  assert.deepEqual(result.volume,{pc:1500,mobile:10000,total:11500,pcRaw:1500,mobileRaw:10000});
  assert.match(request.url,/\/keywordstool\?hintKeywords=/);
  assert.equal(request.options.headers['X-API-KEY'],'access-license');
  assert.equal(request.options.headers['X-Customer'],'customer-1');
  assert.doesNotMatch(JSON.stringify(result),/access-license|secret-key|customer-1/);
});

test('Naver less-than-ten values remain bounded source facts',async()=>{
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({keywordList:[{relKeyword:'테스트',monthlyPcQcCnt:'< 10',monthlyMobileQcCnt:'< 10'}]})});
  const result=await fetchNaverKeywordVolume({id:'p1',name:'테스트'},{fetchImpl,env:credentials,now:()=>1});
  assert.equal(result.volume.pcRaw,'< 10');
  assert.equal(result.volume.pc,null);
  assert.deepEqual(result.volume.pcRange,{min:0,max:9});
});

test('Google News collector parses Korean RSS items and keeps provenance',async()=>{
  const rss=`<?xml version="1.0"?><rss><channel><item><title><![CDATA[김민석 민생 행보 - 연합뉴스]]></title><description><![CDATA[<p>청년 주택 3만호 공급 계획을 발표했다.</p>]]></description><link>https://news.google.com/articles/one</link><pubDate>Wed, 02 Sep 2026 01:00:00 GMT</pubDate><source url="https://yna.co.kr">연합뉴스</source></item><item><title>김민석 당대표 메시지 - MBC</title><link>https://news.google.com/articles/two</link><pubDate>Tue, 01 Sep 2026 01:00:00 GMT</pubDate><source url="https://imnews.imbc.com">MBC</source></item></channel></rss>`;
  const result=await fetchGoogleNews({id:'assembly-001',name:'김민석'},{fetchImpl:async()=>({ok:true,status:200,text:async()=>rss}),now:()=>1700000000000});
  assert.equal(result.items.length,2);
  assert.equal(result.items[0].source,'연합뉴스');
  assert.equal(result.items[0].title,'김민석 민생 행보 - 연합뉴스');
  assert.equal(result.items[0].description,'청년 주택 3만호 공급 계획을 발표했다.');
  assert.equal(result.provider,'GOOGLE_NEWS_RSS');
});

test('Google News collector keeps up to forty current articles for evidence routing',async()=>{
  const items=Array.from({length:40},(_,index)=>`<item><title>김민석 정책 지역 기사 ${index}</title><link>https://news.google.com/${index}</link><pubDate>Wed, 02 Sep 2026 01:00:00 GMT</pubDate><source>매체 ${index}</source></item>`).join('');
  const result=await fetchGoogleNews({id:'assembly-001',name:'김민석'},{fetchImpl:async()=>({ok:true,status:200,text:async()=>`<rss><channel>${items}</channel></rss>`}),now:()=>1700000000000});
  assert.equal(result.items.length,40);
});

test('one source failure is recorded without discarding another allowed source',async()=>{
  const rss=`<rss><channel><item><title>정치 뉴스</title><link>https://news.google.com/a</link><pubDate>Wed, 02 Sep 2026 01:00:00 GMT</pubDate><source>테스트뉴스</source></item></channel></rss>`;
  const fetchImpl=async url=>String(url).includes('api.searchad.naver.com')
    ? {ok:false,status:503,json:async()=>({})}
    : {ok:true,status:200,text:async()=>rss};
  const raw=await collectPoliticianRaw({id:'assembly-001',name:'김민석',party:'더불어민주당',jurisdiction:'서울 영등포구을'},{snapshotId:'s1'},{fetchImpl,env:credentials,now:()=>1700000000000,retryDelays:[]});
  assert.equal(raw.news.items.length,1);
  assert.equal(raw.searchAds,null);
  assert.equal(raw.sourceErrors.length,1);
  assert.equal(raw.sourceErrors[0].source,'NAVER_SEARCH_ADS');
  assert.equal(raw.officialProfile.name,'김민석');
  assert.doesNotMatch(JSON.stringify(raw),/access-license|secret-key|customer-1/);
});
