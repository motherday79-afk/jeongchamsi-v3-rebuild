import test from 'node:test';
import assert from 'node:assert/strict';
import {compactIntelligenceDraft} from '../lib/intelligence-storage.js';
const at=Date.parse('2026-09-12T12:00:00Z'),day=86400000;
const profiles=[{id:'assembly-001',name:'김민석',party:'더불어민주당'},{id:'assembly-002',name:'홍길동',party:'더불어민주당'},{id:'assembly-003',name:'이정치',party:'국민의힘'}];
const item=(title,source,age)=>({title,source,publishedAt:new Date(at-age*day).toISOString()});
const draft=(id,items)=>({id,input:{collectedAt:new Date(at).toISOString(),news:{keywordCorpus:items.map(x=>[x.title,x.source,x.publishedAt]),mediaCorpusVersion:1,items}}});
const load=()=>import('../lib/media-spread.js').catch(()=>({}));
test('new storage retains article identity beyond fourteen days, without a duplicate corpus',()=>{
 const items=Array.from({length:31},(_,i)=>item('고유 정책 기사 '+i,'연합뉴스',i+.1));
 const compact=compactIntelligenceDraft({id:profiles[0].id,raw:{collectedAt:new Date(at).toISOString(),news:{items}}});
 assert.equal(compact.input.news.keywordCorpus.length,30);
 assert.equal(compact.input.news.mediaCorpusVersion,1);
});
test('rolling periods, publisher aliases, party deduplication and other publisher subjects',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load();assert.equal(typeof buildMediaIndex,'function');
 const shared=item('김민석 홍길동 전기요금 개편 청문회','yna.co.kr',1);
 const index=buildMediaIndex([draft(profiles[0].id,[shared,item('오래된 기사','동아일보',20),item('범위 밖','YTN',31),item('미래 기사','YTN',-1)]),draft(profiles[1].id,[{...shared,source:'연합뉴스'}]),draft(profiles[2].id,[item('이정치 지역 철도 공사','MBC',2)])],profiles);
 const week=analyzeMediaIndex(index,{query:'김민석',now:at});
 assert.equal(week.target.articleCount,1);assert.equal(week.period,'latest');
 assert(week.publishers.some(x=>x.name==='MBC뉴스'));
 const party=analyzeMediaIndex(index,{query:'민주당',period:'cumulative',now:at});
 assert.equal(party.target.articleCount,2);
 const other=analyzeMediaIndex(index,{query:'김민석',publisher:'MBC뉴스',now:at});
 assert.equal(other.selected.people[0].name,'이정치');
});
test('first reporting ties and followups use specific issues and do not recrown later outlets in a short window',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load();assert.equal(typeof buildMediaIndex,'function');
 const title='김민석 해오름 도시철도 환승요금 개편 청문회';
 const index=buildMediaIndex([draft(profiles[0].id,[item(title,'연합뉴스',8),item(title,'뉴스1',8),item(title+' 후속점검','동아일보',2),item(title+' 시행점검','동아일보',1),item('김민석 농촌 돌봄 방문','동아일보',1)])],profiles);
 const recent=analyzeMediaIndex(index,{query:'김민석',publisher:'동아일보',now:at});
 assert.equal(recent.selected.firstCount,0);
 assert.equal(recent.selected.followupCount,1);
 assert.equal(recent.selected.issues[0].firstSources.length,2);
 assert.equal(recent.selected.issues.length,1);
 const month=analyzeMediaIndex(index,{query:'김민석',publisher:'연합뉴스',period:'cumulative',now:at});
 assert.equal(month.selected.firstCount,1);
 assert(month.selected.issues[0].laterSources.includes('동아일보'));
});
test('first and followup subject counts only credit people in that publishers actual reports',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load();
 const title='해오름 도시철도 환승요금 개편 청문회';
 const index=buildMediaIndex([draft(profiles[0].id,[item(title,'연합뉴스',3)]),draft(profiles[1].id,[item(title+' 후속점검','동아일보',2),item(title+' 시행점검','동아일보',1)])],profiles);
 const result=analyzeMediaIndex(index,{query:'홍길동',publisher:'연합뉴스',now:at});
 assert(!result.selected.people.some(x=>x.id===profiles[1].id));
 assert.equal(result.publishers.find(x=>x.name==='연합뉴스').firstCount,0);
});
test('unknown clock times must not produce an unqualified earliest outlet',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load();
 const title='김민석 해오름 도시철도 환승요금 개편 청문회';
 const index=buildMediaIndex([draft(profiles[0].id,[{title,source:'연합뉴스',publishedAt:'2026-09-10'},item(title+' 후속점검','동아일보',1)])],profiles);
 const result=analyzeMediaIndex(index,{query:'김민석',publisher:'동아일보',now:at});
 assert.equal(result.selected.firstCount,0);
});
test('the same URL with an updated headline counts once, including duplicated compact evidence',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load();
 const one={...item('김민석 도심 철도 착공', '연합뉴스',2),url:'https://example.org/article/123'},two={...item('김민석 도심 철도 착공식 참석', '연합뉴스',1),url:one.url};
 const index=buildMediaIndex([draft(profiles[0].id,[one,two])],profiles);
 assert.equal(analyzeMediaIndex(index,{query:'김민석',now:at}).target.articleCount,1);
});
test('editing a hydrated compact draft preserves its existing corpus and does not relabel legacy as complete',()=>{
 const items=Array.from({length:25},(_,i)=>item('고유 저장 기사 '+i,'연합뉴스',i+.1));
 const first=compactIntelligenceDraft({id:profiles[0].id,raw:{collectedAt:new Date(at).toISOString(),news:{items}}});
 const edited=compactIntelligenceDraft({id:profiles[0].id,raw:{...first.input,news:{...first.input.news,aggregate:{articleCount:25,sourceCount:1}}}});
 assert.equal(edited.input.news.keywordCorpus.length,25);assert.equal(edited.input.news.sourceCounts[0].count,25);
 const legacy=structuredClone(first);delete legacy.input.news.mediaCorpusVersion;
 const oldEdited=compactIntelligenceDraft({id:profiles[0].id,raw:legacy.input});assert.notEqual(oldEdited.input.news.mediaCorpusVersion,1);
});
test('legacy midnight timestamps are uncertain unless original representative evidence restores the clock',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load();const title='김민석 해오름 도시철도 환승요금 개편 청문회';
 const old={id:profiles[0].id,input:{collectedAt:new Date(at).toISOString(),news:{keywordCorpus:[[title,'연합뉴스','2026-09-10T00:00:00.000Z'],[title+' 후속점검','동아일보','2026-09-11T12:00:00.000Z']]}}};
 const unknown=analyzeMediaIndex(buildMediaIndex([old],profiles),{query:'김민석',publisher:'연합뉴스',now:at});assert.equal(unknown.selected.firstCount,0);
 old.input.news.items=[{title,source:'연합뉴스',publishedAt:'2026-09-10T09:00:00Z'}];
 const known=analyzeMediaIndex(buildMediaIndex([old],profiles),{query:'김민석',publisher:'연합뉴스',now:at});assert.equal(known.selected.firstCount,1);assert.equal(known.selected.issues[0].firstAt,'2026-09-10T09:00:00.000Z');
});
test('unknown baseline does not generate publisher followups and precision survives compaction',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load(),title='김민석 해오름 도시철도 환승요금 개편 청문회';
 const first={...item(title,'연합뉴스',2),timePrecision:'unknown'},next=item(title+' 후속점검','연합뉴스',1);
 const saved=compactIntelligenceDraft({id:profiles[0].id,raw:{collectedAt:new Date(at).toISOString(),news:{items:[first,next]}}});
 const result=analyzeMediaIndex(buildMediaIndex([saved],profiles),{query:'김민석',publisher:'연합뉴스',now:at});assert.equal(result.selected.followupCount,0);assert.equal(result.selected.firstCount,0);
});
test('different stable article identities with identical headlines stay separate in party aggregation and storage',async()=>{
 const {buildMediaIndex,analyzeMediaIndex}=await load();const title='김민석 홍길동 해오름 도시철도 협약';
 const a={id:profiles[0].id,input:{news:{keywordCorpus:[[title,'연합뉴스','2026-09-10T10:00:00Z','distinct-a']]}}},b={id:profiles[1].id,input:{news:{keywordCorpus:[[title,'연합뉴스','2026-09-11T10:00:00Z','distinct-b']]}}};
 const result=analyzeMediaIndex(buildMediaIndex([a,b],profiles),{query:'민주당',now:at});assert.equal(result.target.articleCount,2);
 const saved=compactIntelligenceDraft({id:profiles[0].id,raw:{collectedAt:new Date(at).toISOString(),news:{items:[{...item(title,'연합뉴스',1),url:'https://example.org/1'},{...item(title,'연합뉴스',2),url:'https://example.org/2'}]}}});assert.equal(saved.input.news.keywordCorpus.length,2);
});
test('collector object-shaped period counts remain the stored three-bucket array',()=>{
 const saved=compactIntelligenceDraft({id:profiles[0].id,raw:{collectedAt:new Date(at).toISOString(),news:{items:[item('최근 기사','연합뉴스',1),item('지난 기사','연합뉴스',20)],periodCounts:{h24:1,d7:1,d30:2}}}});
 assert(Array.isArray(saved.input.news.periodCounts));assert.equal(saved.input.news.periodCounts.find(x=>x.label==='30D').value,2);
});
