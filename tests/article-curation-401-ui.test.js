import test from 'node:test';
import assert from 'node:assert/strict';
import {canCurateArticles,articleSlots,filterArticleCandidates,availableArticleCandidates,articleDate} from '../src/ui/article-curation.js';
import {buildIntelligenceDraft} from '../lib/intelligence-analysis.js';
import {projectIntelligence} from '../lib/intelligence-access.js';
import {renderPoliticianDetail} from '../src/views/politicians.js';

test('editor authority requires active staff identity and never paid membership',()=>{
 for(const user of [null,{id:'p',role:'platinum'},{id:'p',role:'member'},{role:'admin'},{id:'p',role:'admin',status:'suspended'}])assert.equal(canCurateArticles(user),false);
 assert.equal(canCurateArticles({id:'staff',role:'admin'}),true);
 assert.equal(canCurateArticles({id:'admin',role:'admin',membershipTier:'superadmin'}),true);
});
test('candidate search uses all search words across title, publisher and date',()=>{
 const rows=[{key:'a',title:'민생 정책 발표',source:'연합뉴스',date:'2026-10-02'},{key:'b',title:'민생 경제',source:'KBS',date:'2026-10-01'}];
 assert.deepEqual(filterArticleCandidates(rows,'민생 10-02').map(row=>row.key),['a']);
 assert.deepEqual(filterArticleCandidates(rows,'kbs').map(row=>row.key),['b']);
 assert.equal(filterArticleCandidates(rows,'').length,2);
 assert.equal(new Set(articleSlots.map(row=>row.value)).size,30);
});
test('excluded snapshots disappear from editing candidates while recovery keeps them',()=>{
 const data={candidates:[{key:'a'},{key:'b'}],excluded:[{key:'a'}]};
 assert.deepEqual(availableArticleCandidates(data),[{key:'b'}]);
 assert.deepEqual(data.excluded,[{key:'a'}]);
 assert.deepEqual(availableArticleCandidates({...data,excluded:[]}),data.candidates);
 assert.equal(articleDate('Fri, 02 Oct 2026 00:00:00 GMT'),'2026. 10. 02.');
 assert.equal(articleDate(''),'날짜 미상');
});
test('rendered edit targets preserve rival identity and suppress paid/suspended controls',async()=>{
 const person={id:'assembly-031',type:'assembly',name:'김테스트',party:'테스트',office:'국회의원'};
 const raw={personId:person.id,snapshotId:'test',collectedAt:'2026-10-02T00:00:00Z',officialProfile:person,news:{items:[{title:'김테스트 정책',source:'뉴스',url:'https://example.com/a',publishedAt:'2026-10-01'}]},sourceErrors:[]};
 const report=buildIntelligenceDraft(person,raw,{peers:[{id:'assembly-032',name:'이경쟁',type:'assembly'}]});
 const result={ok:true,item:person,intelligence:projectIntelligence(report,'admin','detail')};
 const render=user=>renderPoliticianDetail(person.id,{}, {user},{},result);
 const html=await render({id:'staff',role:'admin'});
 const targets=[...html.matchAll(/data-article-editor="([^"]+)" data-article-slot="([^"]+)"/g)].map(match=>[match[1],match[2]]);
 for(const slot of ['brand:0','lifecycle:0','activity:0','headlines:0'])assert.ok(targets.some(([id,position])=>id===person.id&&position===slot),slot);
 assert.ok(targets.some(([id,slot])=>id==='assembly-032'&&slot==='competitor:30D:0'));
 for(const user of [null,{id:'paid',role:'platinum'},{id:'staff',role:'admin',status:'suspended'}])assert.equal((await render(user)).includes('data-article-editor='),false);
});
