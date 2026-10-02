import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyNewsIdentity} from '../lib/news-identity.js';
import {fetchGoogleNews,mergeNewsHistory} from '../lib/google-news.js';
import {compactIntelligenceDraft} from '../lib/intelligence-storage.js';

const person={id:'test-politician',name:'김민석',type:'assembly',party:'더불어민주당',jurisdiction:'서울 영등포구'};
const judge=(title,description='',profile=person)=>classifyNewsIdentity(profile,{title,description});
test('missing district and party never exclude a name-only article',()=>{
 assert.equal(judge('김민석, 새로운 구상 공개').status,'uncertain');
 assert.equal(judge('김민석, 새로운 구상 공개').exclude,false);
});
test('an attached occupation AND a matching subject establish a homonym',()=>{
 assert.equal(judge('배우 김민석, 새 드라마 출연').exclude,true);
 assert.equal(judge('김민석 선수, 스피드스케이팅 금메달').exclude,true);
 assert.equal(judge('김민석 선수 근황').exclude,false);
 assert.equal(judge('김민석, 배우 지원 방안 발표').exclude,false);
 assert.equal(judge('김민석, 드라마 촬영장 방문').exclude,false);
});
test('political identity in a mixed article preserves the article',()=>{
 assert.equal(judge('김민석 의원, 배우 김민석과 드라마 제작 현장 방문').status,'matched');
 assert.equal(judge('김민석 국무총리, 배우들과 영화 관람').exclude,false);
 assert.equal(judge('배우 김민석, 새 드라마 출연','김민석 의원이 제작 지원 정책을 설명했다.').exclude,false);
});
test('former occupations in the known profile are not negative identity evidence',()=>{
 assert.equal(judge('배우 김민석, 드라마 출연 시절 회상','',{...person,roleHistory:['배우 출신']} ).exclude,false);
});
test('unrelated occupations elsewhere and partial-name matches are not homonyms',()=>{
 assert.equal(judge('김민석, 쇼트트랙 선수 박지원과 금메달 축하').exclude,false);
 assert.equal(judge('배우 김민석영, 새 드라마 출연').status,'uncertain');
});
test('Korean particles, companions and party-qualified roles preserve recall',()=>{
 for(const title of ['김민석도 정책 발표','김민석에게 쏠린 관심','김민석부터 달라져야','김민석 가수와 영화 관람','김민석 배우의 드라마 제작 지원 논의','김민석 배우 지원 방안 발표, 드라마 제작 논의','김민석 더불어민주당 의원, 배우 김민석 드라마 현장 방문'])assert.equal(judge(title).exclude,false,title);
});
test('broad acquisition, unique audit counts and history reset work together',async()=>{
 const titles=['김민석 새로운 구상 공개','김민석 의원 정책 발표','배우 김민석 새 드라마 출연'];
 const xml='<rss><channel>'+titles.map((title,i)=>`<item><title>${title}</title><link>https://example.org/${i}</link><pubDate>Fri, 02 Oct 2026 01:00:00 GMT</pubDate></item>`).join('')+'</channel></rss>';
 const queries=[],now=()=>Date.parse('2026-10-02T10:00:00Z');
 const result=await fetchGoogleNews(person,{now,collectionProfile:{mode:'specified',newsRegions:['영등포'],searchKeywords:['김민석의원']},fetchImpl:async url=>{queries.push(new URL(url).searchParams.get('q'));return {ok:true,text:async()=>xml};}});
 assert.equal(result.items.length,2);assert.equal(result.excludedCount,1);
 assert.ok(queries.every(q=>!q.includes('영등포')));
 assert.equal(result.identityAudit.candidates,3);assert.equal(result.identityAudit.uncertain,1);
 assert.equal(result.identityAudit.excluded[0].title,titles[2]);
 const ledger=mergeNewsHistory({scope:'name:old',daily:[{date:'2026-10-02',keys:['old-homonym'],count:1}]},result,new Date(now()).toISOString());
 assert.equal(ledger.daily.find(row=>row.date==='2026-10-02').count,2);
 const saved=compactIntelligenceDraft({id:person.id,raw:{news:result,collectedAt:new Date(now()).toISOString()}});
 assert.equal(saved.input.news.identityAudit.homonyms,1);
 assert.equal(saved.input.news.identityAudit.uncertain,1);
 assert.equal(saved.rankingInput.articleCount,2);
 assert.ok(saved.input.news.keywordCorpus.every(row=>!row[0].includes('배우')));
});
test('audit samples remain bounded in persistent storage',()=>{
 const audit={version:'identity-v1',candidates:100,homonyms:50,excluded:Array.from({length:20},()=>({title:'a'.repeat(1000),url:'b'.repeat(2000),reason:'NAMED_SPORT_AND_TOPIC'}))};
 const saved=compactIntelligenceDraft({raw:{news:{items:[],identityAudit:audit}}}).input.news.identityAudit;
 assert.equal(saved.excluded.length,5);assert.equal(saved.homonyms,50);assert.equal(saved.excluded[0].title.length,160);
});
test('original captions can rescue a suspected homonym without extra reads for every article',async()=>{
 const titles=['배우 김민석, 새 드라마 출연','김민석은 새 방안을 논의','김민석 현장 방문','김민석 정책 발표'];
 const xml='<rss><channel>'+titles.map((title,i)=>`<item><title>${title}</title><link>https://www.khan.co.kr/article/${i}</link><pubDate>Fri, 02 Oct 2026 01:00:00 GMT</pubDate></item>`).join('')+'</channel></rss>';
 let reads=0;
 const result=await fetchGoogleNews(person,{now:()=>Date.parse('2026-10-02T10:00:00Z'),inspectOriginalArticles:true,fetchImpl:async()=>({ok:true,text:async()=>xml}),readArticleContext:async()=>{reads++;return {status:'read',body:'',captions:['김민석 더불어민주당 의원이 배우들과 이야기를 나누고 있다.']};}});
 assert.equal(reads,2);assert.equal(result.items.length,4);assert.equal(result.identityAudit.captionMatches,2);assert.equal(result.identityAudit.originalPages.read,2);
 const saved=compactIntelligenceDraft({raw:{news:result}}).input.news.identityAudit;
 assert.equal(saved.originalPages.read,2);assert.equal(saved.captionMatches,2);
 const conflicting=await fetchGoogleNews(person,{now:()=>Date.parse('2026-10-02T10:00:00Z'),inspectOriginalArticles:true,fetchImpl:async()=>({ok:true,text:async()=>xml}),readArticleContext:async()=>({status:'read',body:'',captions:['배우 김민석, 새 드라마 출연']})});
 assert.equal(conflicting.items.length,3,'unverified HTML may not create new exclusions');
});
