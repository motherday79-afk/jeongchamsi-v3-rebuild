import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSearchPage} from '../src/views/search-page.js';
import {buildMediaIndex,analyzeMediaIndex} from '../lib/media-spread.js';
const at=Date.parse('2026-09-12T12:00:00Z');
const profiles=[{id:'assembly-001',name:'김민석',party:'더불어민주당'},{id:'basic-002',type:'basic',name:'다른시장',party:'국민의힘'}];
const index=buildMediaIndex(profiles.map(person=>({id:person.id,input:{collectedAt:new Date(at).toISOString(),news:{keywordCorpus:[[person.name+' 도시철도 환승 개편','연합뉴스','2026-09-11T10:00:00Z']],mediaCorpusVersion:1}}})),profiles);
function setup(){let calls=0,boardCalls=0;const politicians={mediaSpread:async input=>{calls++;return analyzeMediaIndex(index,{...input,now:at});},searchAll:async()=>({ok:true,items:profiles,total:2})},content={list:async()=>{boardCalls++;return [];},readDomain:async()=>({})};return {politicians,content,counts:()=>({calls,boardCalls})};}
test('politician search renders JCS SPREAD, profile detail, publisher selection and the two periods without irrelevant empty boards',async()=>{
 const s=setup(),html=await renderSearchPage({...s,query:'김민석'});
 assert.match(html,/JCS SPREAD/);assert.match(html,/정참 시선/);assert.match(html,/상세보기/);assert.match(html,/\/person\/assembly-001/);assert.match(html,/최신순/);assert.match(html,/누적순/);assert.match(html,/연합뉴스/);assert(!html.includes('관련 결과가 없습니다'));assert(!html.includes('24H'));assert.equal(s.counts().boardCalls,0);
});
test('filters keep the politician and publisher and cached requests do not repeat; another politician uses the same view',async()=>{
 const s=setup(),params={...s,query:'다른시장',personId:'basic-002',publisher:'연합뉴스',period:'cumulative'};
 const html=await renderSearchPage(params);await renderSearchPage(params);
 assert.match(html,/\/person\/basic-002/);assert.match(html,/person=basic-002/);assert.match(html,/publisher=/);assert.equal(s.counts().calls,1);
});
test('query and publisher text are escaped and API errors are retryable',async()=>{
 const s=setup(),html=await renderSearchPage({...s,query:'<script>alert(1)</script>'});assert(!html.includes('<script>'));
 let count=0;s.politicians.mediaSpread=async()=>{count++;return {ok:false};};
 const bad=await renderSearchPage({...s,query:'failure'});assert.match(bad,/다시/);await renderSearchPage({...s,query:'failure'});assert.equal(count,2);
});
