import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMediaIndex,analyzeMediaIndex} from '../lib/media-spread.js';
import * as media from '../src/ui/intelligence-narratives.js';
import {parseGoogleNewsRss} from '../lib/google-news.js';
import {compactIntelligenceDraft} from '../lib/intelligence-storage.js';
const now=Date.parse('2026-09-13T12:00:00Z'),person={id:'assembly-001',name:'김민석',party:'더불어민주당'};
const article=(source,title='김민석 도심 환승요금 개편 청문회',publishedAt='2026-09-12T09:00:00Z',extra={})=>({source,title,publishedAt,...extra});
const draft=items=>({id:person.id,input:{collectedAt:new Date(now).toISOString(),news:{items,sourceCounts:[{name:'다음뉴스',count:99}],keywordCorpus:items.map(r=>[r.title,r.source,r.publishedAt]),mediaCorpusVersion:1}}});
test('Daum, Naver, Nate and Google distribution labels never appear as publishers',()=>{
 const rows=['v.daum.net','다음뉴스','다음 뉴스','https://v.daum.net/v/123','naver news','네이버뉴스','news.nate.com','Google 뉴스'].map((source,i)=>article(source,'김민석 배급 기사 '+i));rows.push(article('연합뉴스','김민석 정책 발표'));
 const result=analyzeMediaIndex(buildMediaIndex([draft(rows)],[person]),{query:person.name,now});
 assert.deepEqual(result.publishers.map(r=>r.name),['연합뉴스']);assert.equal(result.target.articleCount,1);assert.equal(result.target.unattributedCount,8);
});
test('verified original publisher wins over portal distribution URL; headline and unrelated URL do not guess publisher',()=>{
 assert.equal(typeof media.articlePublisher,'function');
 assert.equal(media.articlePublisher(article('다음뉴스','연합뉴스 보도 비판','2026-09-12',{url:'https://v.daum.net/v/123',publisher:{name:'동아일보'}})),'동아일보');
 assert.equal(media.articlePublisher(article('다음뉴스','연합뉴스 보도 비판','2026-09-12',{url:'https://v.daum.net/v/123'})),'');
 assert.equal(media.articlePublisher(article('다음뉴스',undefined,undefined,{sourceUrl:'https://www.yna.co.kr'})),'연합뉴스');
});
test('unattributed earlier portal article blocks a fabricated first-report winner',()=>{
 const rows=[article('v.daum.net',undefined,'2026-09-11T09:00:00Z'),article('연합뉴스',undefined,'2026-09-12T09:00:00Z')];
 const result=analyzeMediaIndex(buildMediaIndex([draft(rows)],[person]),{query:person.name,publisher:'연합뉴스',now});
 assert.equal(result.selected.firstCount,0);assert.deepEqual(result.selected.issues[0].firstSources,[]);
});
test('verified attribution survives compact storage and representative/corpus merge',()=>{
 const row=article('다음뉴스',undefined,undefined,{publisher:{name:'동아일보'},sourceUrl:'https://v.daum.net',url:'https://v.daum.net/v/123'});
 const saved=compactIntelligenceDraft({id:person.id,raw:{collectedAt:new Date(now).toISOString(),news:{items:[row]}}});
 const result=analyzeMediaIndex(buildMediaIndex([saved],[person]),{query:person.name,now});assert.deepEqual(result.publishers.map(r=>r.name),['동아일보']);assert.equal(result.target.articleCount,1);
});
test('RSS preserves authoritative source URL and resolves a known original publisher domain',()=>{
 const rows=parseGoogleNewsRss('<rss><channel><item><title>김민석 기사</title><link>https://v.daum.net/v/123</link><pubDate>Sat, 12 Sep 2026 09:00:00 GMT</pubDate><source url="https://www.yna.co.kr">Google 뉴스</source></item></channel></rss>');
 assert.equal(rows[0].sourceUrl,'https://www.yna.co.kr');assert.equal(rows[0].source,'연합뉴스');
});
test('all-portal datasets give no winning publisher and keep unresolved counts for both periods',()=>{
 const index=buildMediaIndex([draft([article('다음뉴스'),article('네이트뉴스','김민석 지난 기사','2026-08-23T09:00:00Z')])],[person]);
 const week=analyzeMediaIndex(index,{query:person.name,publisher:'다음뉴스',now}),month=analyzeMediaIndex(index,{query:person.name,period:'cumulative',now});
 assert.deepEqual(week.publishers,[]);assert.equal(week.selected.name,'');assert.equal(week.target.unattributedCount,1);assert.equal(month.target.unattributedCount,2);
});
test('screen discloses unresolved attribution instead of claiming no collected articles',async()=>{
 const {renderMediaSpread}=await import('../src/views/media-spread-view.js');
 const data=analyzeMediaIndex(buildMediaIndex([draft([article('다음뉴스')])],[person]),{query:person.name,now});const html=renderMediaSpread(data,{query:person.name});
 assert.match(html,/원언론사 미확인/);assert.match(html,/언론사 순위에서 제외/);assert(!html.includes('분석할 수 있는 공개 수집 기사가 없습니다'));
});
test('detail media concentration excludes portal names as well as portal domains',async()=>{
 const {buildIntelligenceDraft}=await import('../lib/intelligence-analysis.js');
 const result=buildIntelligenceDraft(person,{personId:person.id,collectedAt:new Date(now).toISOString(),news:{items:[article('다음뉴스'),article('연합뉴스','김민석 다른 기사')],sourceCounts:[{name:'다음뉴스',count:10,h24:10,d7:10,d30:10},{name:'연합뉴스',count:1,h24:1,d7:1,d30:1}]}},{peers:[]});
 const display=result.diagnoses.find(row=>row.id==='07').display;
 assert.deepEqual(display.allSources.map(row=>row.name),['연합뉴스']);
 assert(display.periods.every(row=>row.allSources.every(source=>source.name!=='다음뉴스')));
});
test('known original URL repairs matching legacy corpus identity without counting it twice',async()=>{
 const {mediaArticleKey}=await import('../lib/media-article-key.js');const url='https://www.yna.co.kr/view/AKR202609120001';
 const row=article('v.daum.net',undefined,undefined,{url}),record=draft([row]);record.input.news.keywordCorpus=[[row.title,row.source,row.publishedAt,mediaArticleKey(url),1]];
 const result=analyzeMediaIndex(buildMediaIndex([record],[person]),{query:person.name,now});
 assert.equal(result.target.articleCount,1);assert.equal(result.target.unattributedCount,0);
});
