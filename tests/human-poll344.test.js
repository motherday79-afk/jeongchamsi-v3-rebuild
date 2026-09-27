import test from 'node:test';
import assert from 'node:assert/strict';
import {VERIFIED_HUMAN_REPORTS,enrichHumanPoll,enrichHumanRun} from '../lib/human-poll-evidence.js';
import {publicHumanPoll} from '../lib/human-poll-service.js';
import {renderAiPanelPublic} from '../src/views/ai-panel-pages.js';
import {createAiPanelService} from '../lib/ai-panel-service.js';
import {createHumanPollService} from '../lib/human-poll-service.js';
const input=r=>({...r,id:'original',comparable:true,results:{overall:r.results.overall,gender:{},age:{},region:{}}});
test('official tables fill all published breakdowns and keep source rounding',()=>{
 for(const r of VERIFIED_HUMAN_REPORTS){const p=enrichHumanPoll(input(r));assert.equal(Object.keys(p.results.gender).length,2);assert.equal(Object.keys(p.results.age).length,6);assert.ok(Object.keys(p.results.region).length>=7);assert.ok(publicHumanPoll(p));assert.equal(p.id,'original');assert.equal(p.comparable,true);assert.ok(p.evidence.url);}
 const g=enrichHumanPoll(input(VERIFIED_HUMAN_REPORTS[0]));assert.equal(g.results.gender.남성.undecided,5);assert.equal(g.results.age['18~29'].weightedN,148);assert.equal(g.results.region.강원.positive,null);assert.equal(g.results.region.강원.n,32);assert.equal(g.results.region.강원.status.positive,'not_provided');
});
test('enrichment cannot mix another survey, topic, date, total or edited values',()=>{
 const p=input(VERIFIED_HUMAN_REPORTS[0]);
 for(const patch of [{endDate:'2026-09-10'},{publishedDate:'2026-09-25'},{sampleSize:1000},{topic:'party-support'},{results:{overall:{positive:61,negative:29,undecided:10}}}]){const other={...p,...patch};assert.deepEqual(enrichHumanPoll(other),other);}
 const original=structuredClone(p);enrichHumanPoll(p);assert.deepEqual(p,original);
});
test('AI responses and historical identity stay unchanged',()=>{
 const r={id:'run',humanPolls:VERIFIED_HUMAN_REPORTS.map(input),results:{EXPOSED:{responses:[{id:'p1',choice:'positive'}]}},aggregates:{EXPOSED:{overall:{n:1000}}},publishedAt:'2026-09-19'};const out=enrichHumanRun(r);assert.deepEqual(out.results,r.results);assert.deepEqual(out.aggregates,r.aggregates);assert.equal(out.publishedAt,r.publishedAt);assert.equal(r.humanPolls[0].results.gender.남성,undefined);
});
test('public snapshot and published comparison both receive the verified supplement',async()=>{
 const polls=VERIFIED_HUMAN_REPORTS.map(input);
 const human=createHumanPollService({command:async()=>JSON.stringify({items:polls,providers:[]})});assert.equal((await human.list()).items[0].results.gender.남성.positive,30);
 const summary={id:'run',status:'published',lockedAt:'2026-09-19',panelSize:1000,week:'2026-W38',runNumber:16,humanPolls:polls};
 const ai=createAiPanelService({command:async([op,key])=>op==='HVALS'&&key.endsWith(':runs')?[JSON.stringify(summary)]:[]});
 assert.equal((await ai.list(null)).items[0].humanPolls[2].results.gender.여성.positive,46);
});
test('comparison explains suppressed and incompatible regions with official evidence links',()=>{
 const item=enrichHumanRun({id:'r',status:'published',modes:['EXPOSED'],humanPolls:VERIFIED_HUMAN_REPORTS.map(input),aggregates:{EXPOSED:{overall:{n:1000,positive:40,negative:50,undecided:10},region:{'강원·제주':{n:40,positive:40,negative:50,undecided:10}}}}});
 const html=renderAiPanelPublic({list:{ok:true,items:[item]},detail:{ok:true,item},params:{id:'r'}});
 assert.match(html,/표본 50명 미만/);assert.match(html,/지역 구분 상이/);assert.match(html,/원본 통계표/);assert.match(html,/갤럽/);assert.doesNotMatch(html,/미확인<\/td>|미제공<\/td>/);
});
