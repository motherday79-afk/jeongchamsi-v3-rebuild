import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMediaIndex,analyzeMediaIndex} from '../lib/media-spread.js';
import {compactIntelligenceDraft} from '../lib/intelligence-storage.js';

const NOW=Date.parse('2026-09-12T12:00:00Z'),at=new Date(NOW).toISOString();
const people=Array.from({length:7},(_,i)=>({id:`p${i+1}`,name:`정치인${i+1}`,type:i===6?'metropolitan':'assembly',party:'정당'}));
const counts=[[10,900],[11,1200],[50,910],[50,100],[9,890],[2,50],[10000,10000]];
function draft(person,newsCount,searchCount){return {id:person.id,input:{collectedAt:at,searchAds:{volume:{pc:searchCount/10,mobile:searchCount*9/10,total:searchCount}},news:{collectedAt:at,mediaCorpusVersion:1,items:[{title:person.name+' 주거 정책 발표',source:'연합뉴스',publishedAt:'2026-09-11T12:00:00Z',url:`https://news.example/${person.id}`}],periodCounts:[{label:'24H',value:1},{label:'7D',value:1},{label:'30D',value:newsCount}],coverage:[{date:'2026-09-12',collected:true,truncated:false}]}}};}
const drafts=()=>people.map((p,i)=>draft(p,...counts[i]));
const analyze=(rows=drafts(),id='p1',profiles=people,options={})=>analyzeMediaIndex(buildMediaIndex(rows,profiles),{personId:id,query:profiles.find(p=>p.id===id)?.name,now:NOW,...options}).attention;

test('searched politician gets monthly counts, tied cohort ranks and all four relative positions',()=>{
 const result=analyze();assert.ok(result,'monthly attention must be returned');
 assert.equal(result.status,'ready');assert.equal(result.cohort.size,6);assert.equal(result.cohort.label,'국회의원');
 assert.equal(result.target.newsCount,10);assert.equal(result.target.searchCount,900);
 assert.equal(result.target.newsRank,4);assert.equal(result.target.searchRank,3);
 assert.equal(result.target.x,40);assert.equal(result.target.y,60);assert.equal(result.category,'search');
 assert.equal(analyze(drafts(),'p2').category,'both');
 const news=analyze(drafts(),'p4');assert.equal(news.category,'news');assert.equal(news.target.newsRank,1);assert.equal(news.target.newsTied,true);
 assert.equal(analyze(drafts(),'p6').category,'quiet');assert.equal(result.points.some(p=>p.id==='p7'),false);
});
test('publisher tabs and publisher selection cannot change the monthly comparison',()=>{
 const latest=analyze(),cumulative=analyze(drafts(),'p1',people,{period:'cumulative',publisher:'연합뉴스'});
 assert.ok(latest);assert.deepEqual(latest,cumulative);
 assert.equal(analyzeMediaIndex(buildMediaIndex(drafts(),people),{query:'정당',now:NOW}).attention,null);
});
test('recommendations satisfy their count relationship and do not compare to another job group',()=>{
 const result=analyze();assert.ok(result);
 assert.deepEqual(result.peers.map(row=>[row.kind,row.person.id]),[['more-search','p2'],['more-news','p3'],['similar','p5']]);
});
test('missing, bounded, legacy ambiguous zero and stale source values never turn into a low-interest classification',()=>{
 for(const mutate of [
  row=>{row.input.searchAds.volume.pc=null;row.input.searchAds.volume.pcRange={min:0,max:9};},
  row=>{row.input.searchAds=null;},
  row=>{row.input.searchAds.volume.pc=0;},
  row=>{row.input.searchAds.collectedAt='2026-09-01T12:00:00Z';},
  row=>{row.input.news.periodCounts[2].value=null;},
  row=>{row.input.collectedAt='2026-08-01T12:00:00Z';row.input.news.collectedAt='2026-08-01T12:00:00Z';},
  row=>{row.input.searchAds.keyword='다른 이름';}
 ]){const rows=drafts();mutate(rows[0]);assert.equal(analyze(rows),null);}
});
test('known exact zero remains valid, while too few or completely tied observations do not get an extreme label',()=>{
 let rows=drafts();rows[0].input.searchAds={volumePrecision:1,volume:{pc:0,mobile:0,total:0}};
 const zero=analyze(rows);assert.ok(zero);assert.equal(zero.target.searchCount,0);assert.equal(zero.target.searchRank,6);
 const small=analyze(drafts().slice(0,2),'p1',people.slice(0,2));assert.equal(small.status,'insufficient');assert.deepEqual(small.points,[]);assert.equal(small.target.newsRank,undefined);
 rows=people.slice(0,6).map(p=>draft(p,10,900));const tied=analyze(rows);assert.equal(tied.category,'balanced');assert.equal(tied.target.x,50);assert.equal(tied.target.y,50);assert.equal(tied.target.newsRank,1);assert.equal(tied.target.newsTied,true);
});
test('different collection batches and duplicate name keywords are excluded from the cohort',()=>{
 const rows=drafts();rows[1].input.collectedAt='2026-09-08T12:00:00Z';rows[1].input.news.collectedAt='2026-09-08T12:00:00Z';
 assert.equal(analyze(rows).cohort.size,5);
 const duplicate=[...people,{id:'duplicate',name:'정치인1',type:'basic'}];assert.equal(analyze(drafts(),'p1',duplicate),null);
});
test('search precision, actual collection time and monthly count survive compaction without changing operational ranking inputs',()=>{
 const compact=compactIntelligenceDraft({id:'p1',raw:{collectedAt:at,searchAds:{provider:'NAVER_SEARCH_ADS',keyword:'정치인1',collectedAt:'2026-09-12T11:59:00Z',volume:{pc:null,mobile:100,total:null,pcRaw:'< 10',pcRange:{min:0,max:9}}},news:{items:[]}}});
 assert.equal(compact.input.searchAds.volume.pc,null);assert.equal(compact.input.searchAds.volume.total,null);
 assert.deepEqual(compact.input.searchAds.volume.pcRange,{min:0,max:9});assert.equal(compact.input.searchAds.collectedAt,'2026-09-12T11:59:00Z');assert.equal(compact.rankingInput.searchTotal,100);
 const twice=compactIntelligenceDraft({id:'p1',raw:compact.input});assert.deepEqual(twice.input.searchAds,compact.input.searchAds);
});
test('failed news collection stays missing after the existing hydration and recompaction shape, while a covered zero remains observed',()=>{
 const failed=compactIntelligenceDraft({id:'p1',raw:{collectedAt:at,searchAds:{provider:'NAVER_SEARCH_ADS',keyword:'정치인1',collectedAt:at,volume:{pc:10,mobile:100}},news:null,sourceErrors:[{source:'GOOGLE_NEWS',code:'GOOGLE_NEWS_RESULT_EMPTY'}]}});
 assert.equal(failed.rankingInput.newsStatus,'MISSING');
 const hydratedRaw={collectedAt:failed.input.collectedAt,searchAds:failed.input.searchAds,news:{...failed.input.news,aggregate:{articleCount:failed.rankingInput.articleCount,sourceCount:failed.rankingInput.sourceCount}},sourceErrors:failed.input.sourceErrors};
 const edited=compactIntelligenceDraft({id:'p1',raw:hydratedRaw});
 assert.equal(edited.rankingInput.newsStatus,'DIRECT');
 assert.equal(edited.input.sourceErrors[0].code,'GOOGLE_NEWS_RESULT_EMPTY');
 assert.equal(analyze([edited,...drafts().slice(1)]),null);

 const covered=[draft(people[0],0,110),...drafts().slice(1)];
 const observed=analyze(covered);assert.ok(observed);assert.equal(observed.status,'ready');assert.equal(observed.target.newsCount,0);
});
test('a tied midpoint axis gets precise middle wording instead of an unearned high or low claim',()=>{
 const sameNews=people.slice(0,4).map((person,index)=>draft(person,10,(index+1)*100));
 const newsMiddleSearchHigh=analyze(sameNews,'p4',people.slice(0,4));
 assert.equal(newsMiddleSearchHigh.category,'balanced');assert.equal(newsMiddleSearchHigh.target.x,50);assert.equal(newsMiddleSearchHigh.target.y,100);
 assert.equal(newsMiddleSearchHigh.target.newsRank,1);assert.equal(newsMiddleSearchHigh.target.newsTied,true);assert.equal(newsMiddleSearchHigh.target.searchRank,1);
 assert.equal(newsMiddleSearchHigh.headline,'보도는 비교군의 중간에 있고 검색은 중간보다 높은 위치입니다');
 assert.doesNotMatch(newsMiddleSearchHigh.headline,/모두에서 두드러지는/);

 const sameSearch=people.slice(0,4).map((person,index)=>draft(person,(index+1)*10,100));
 const newsHighSearchMiddle=analyze(sameSearch,'p4',people.slice(0,4));
 assert.equal(newsHighSearchMiddle.category,'balanced');assert.equal(newsHighSearchMiddle.target.x,100);assert.equal(newsHighSearchMiddle.target.y,50);
 assert.equal(newsHighSearchMiddle.target.newsRank,1);assert.equal(newsHighSearchMiddle.target.searchRank,1);assert.equal(newsHighSearchMiddle.target.searchTied,true);
 assert.equal(newsHighSearchMiddle.headline,'검색은 비교군의 중간에 있고 보도는 중간보다 높은 위치입니다');
 assert.doesNotMatch(newsHighSearchMiddle.headline,/모두에서 두드러지는/);

 const newsMiddleSearchLow=analyze(sameNews,'p1',people.slice(0,4));
 assert.equal(newsMiddleSearchLow.category,'balanced');assert.equal(newsMiddleSearchLow.target.x,50);assert.equal(newsMiddleSearchLow.target.y,0);
 assert.equal(newsMiddleSearchLow.headline,'보도는 비교군의 중간에 있고 검색은 중간보다 낮은 위치입니다');
 assert.doesNotMatch(newsMiddleSearchLow.headline,/모두 비교군의 중간보다 낮은/);
});
