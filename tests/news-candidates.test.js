import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchGoogleNews,googleNewsFingerprint} from '../lib/google-news.js';
import {compactIntelligenceDraft} from '../lib/intelligence-storage.js';
import {buildIntelligenceDraft} from '../lib/intelligence-analysis.js';
import {projectIntelligence} from '../lib/intelligence-access.js';

const now=()=>Date.parse('2026-09-06T12:00:00Z');
const person={id:'p1',name:'김민석'};
const article=(title,id)=>({title,source:'테스트뉴스',url:`https://example.com/${id}`,publishedAt:'2026-09-06T08:00:00Z'});
const rss=rows=>`<rss><channel>${rows.map(row=>`<item><title>${row.title}</title><source>${row.source}</source><link>${row.url}</link><pubDate>${row.publishedAt}</pubDate></item>`).join('')}</channel></rss>`;
const load=rows=>async()=>({ok:true,text:async()=>rss(rows)});

test('retains homonyms for curation without adding them to accepted articles or counts',async()=>{
 const political=article('김민석 총리 정책 발표',1),homonym=article('배우 김민석 드라마 출연',2),unrelated=article('다른 사람 인터뷰',3);
 const result=await fetchGoogleNews(person,{now,fetchImpl:load([political,homonym,homonym,unrelated])});
 assert.deepEqual(result.items.map(row=>row.url),[political.url]);
 assert.deepEqual(result.periodCounts,{h24:1,d7:1,d30:1});
 assert.deepEqual(result.candidates.map(row=>row.url),[political.url,homonym.url]);
 assert.equal(result.candidates[1].identity.status,'homonym');
});

test('legacy and curated exclusions remove candidates before optional original article reads',async()=>{
 const legacy=article('배우 김민석 드라마 출연',1),curated=article('김민석 근황 인터뷰',2),kept=article('김민석 총리 정책 발표',3),reads=[];
 const result=await fetchGoogleNews(person,{now,fetchImpl:load([legacy,curated,kept]),exclusions:[googleNewsFingerprint(legacy)],excludeArticle:item=>item.url===curated.url,inspectOriginalArticles:true,readArticleContext:async item=>{reads.push(item.url);return {status:'unavailable'};}});
 assert.deepEqual(reads,[]);
 assert.deepEqual(result.items.map(row=>row.url),[kept.url]);
 assert.deepEqual(result.candidates.map(row=>row.url),[kept.url]);
 assert.equal(result.identityAudit.manual,2);
});

test('candidate pool keeps at most 200 newest deduplicated articles',async()=>{
 let query=0;
 const result=await fetchGoogleNews(person,{now,fetchImpl:async()=>{const offset=query++*45;return {ok:true,text:async()=>rss(Array.from({length:45},(_,index)=>({...article(`김민석 소식 ${offset+index}`,offset+index),publishedAt:new Date(now()-(offset+index+1)*60000).toISOString()})))};}});
 assert.equal(result.items.length,225);
 assert.equal(result.candidates.length,200);
 assert.equal(result.candidates[0].url,'https://example.com/0');
 assert.equal(result.candidates.at(-1).url,'https://example.com/199');
});

test('compact input retains bounded candidate metadata separately from representative articles',()=>{
 const candidates=Array.from({length:205},(_,index)=>({...article(`배우 김민석 드라마 ${index}`,index),body:'private article body',identity:{status:'homonym',exclude:true}}));
 const stored=compactIntelligenceDraft({id:person.id,raw:{collectedAt:new Date(now()).toISOString(),news:{items:[article('김민석 총리 정책 발표','accepted')],candidates}}});
 assert.equal(stored.input.news.items.length,1);
 assert.equal(stored.input.news.candidates.length,200);
 assert.deepEqual(Object.keys(stored.input.news.candidates[0]).sort(),['identity','publishedAt','source','title','url']);
 assert.deepEqual(stored.input.news.candidates[0].identity,{exclude:true});
 assert.equal(stored.rankingInput.articleCount,1);
 assert.deepEqual(compactIntelligenceDraft({id:person.id,raw:stored.input}).input.news.candidates,stored.input.news.candidates);
});

test('compact candidates preserve identity decisions and original publisher fingerprints',()=>{
 const rows=[{...article('김민석 총리 정책 발표',1),source:'yna.co.kr',identity:{exclude:false,status:'matched'}},{...article('배우 김민석 드라마 출연',2),source:'MBC뉴스',sourceOriginal:'MBC',identity:{exclude:true,status:'homonym'}},article('김민석 소식',3)];
 const saved=compactIntelligenceDraft({raw:{news:{candidates:rows}}}).input.news.candidates;
 assert.equal(saved[0].source,'연합뉴스');
 assert.equal(saved[0].sourceOriginal,'yna.co.kr');
 assert.equal(saved[1].sourceOriginal,'MBC');
 assert.deepEqual(saved.map(row=>row.identity),[{exclude:false},{exclude:true},undefined]);
 assert.deepEqual(saved.map(googleNewsFingerprint),rows.map(googleNewsFingerprint));
});

test('public and member projections never expose the retained candidate pool',()=>{
 const homonym=article('배우 김민석 드라마 후보 전용','private-candidate');
 const report=buildIntelligenceDraft(person,{collectedAt:new Date(now()).toISOString(),news:{items:[article('김민석 총리 정책 발표','accepted')],candidates:[homonym]}},{peers:[person]});
 assert.equal(report.raw.news.candidates.length,1);
 for(const tier of ['public','member']){
  const output=JSON.stringify(projectIntelligence(report,tier,'detail'));
  assert.equal(output.includes('private-candidate'),false);
  assert.equal(output.includes('후보 전용'),false);
  assert.equal(output.includes('"candidates"'),false);
 }
});
