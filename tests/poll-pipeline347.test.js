import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCollectedSnapshot,collectReliablePolls} from '../lib/human-poll-pipeline.js';
const now=()=>Date.parse('2026-09-28T08:00:00Z');
const poll=(provider='nbs')=>({id:provider+'-347',institution:provider==='nbs'?'NBS':'한국갤럽',sourceUrl:provider==='nbs'?'http://nbsurvey.kr/files?vid=189':'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1659',question:'대통령 국정운영 평가',startDate:'2026-09-07',endDate:'2026-09-09',publishedDate:'2026-09-10',sampleSize:1002,results:{overall:{positive:43,negative:48,undecided:9,n:1002}},fetchedAt:'2026-09-28T07:40:00Z',provenance:{provider}});
const snapshot=()=>({schema:'JCS_OFFICIAL_POLL_SNAPSHOT_V2',collectedAt:'2026-09-28T07:40:00Z',items:[poll()],providers:[{id:'nbs',state:'success',checkedAt:'2026-09-28T07:40:00Z',fetchedCount:1}]});
test('snapshot rejects stale, future, untrusted and inconsistent data',()=>{
 assert.equal(validateCollectedSnapshot(snapshot(),{now}).items.length,1);
 for(const collectedAt of ['2026-09-20T00:00:00Z','2026-09-29T00:00:00Z'])assert.throws(()=>validateCollectedSnapshot({...snapshot(),collectedAt},{now}));
 assert.throws(()=>validateCollectedSnapshot({...snapshot(),items:[{...poll(),sourceUrl:'http://evil.test/'}]},{now}));
 assert.throws(()=>validateCollectedSnapshot({...snapshot(),items:[{...poll(),publishedDate:'2026-10-01'}]},{now}));
 assert.throws(()=>validateCollectedSnapshot({...snapshot(),providers:[{id:'nbs',state:'error'}]},{now}));
});
test('fresh remote snapshot collects missing providers directly without refetching successful NBS',async()=>{
 let ids;const result=await collectReliablePolls({now,fetch:async()=>new Response(JSON.stringify(snapshot())),documents:async options=>{ids=options.providerIds;return {items:[poll('gallup')],providers:[{id:'gallup',state:'success'}]};},summaries:async()=>({items:[],providers:[]})});
 assert.deepEqual(ids,['gallup','realmeter']);assert.equal(result.items.length,2);assert.equal(result.providers.find(p=>p.id==='nbs').state,'success');
});
test('snapshot failure preserves direct collection and real commissioner fallback',async()=>{
 const r={...poll(),institution:'리얼미터',sourceUrl:'https://www.ekn.kr/web/view.php?key=1',provenance:{provider:'realmeter'}};
 const result=await collectReliablePolls({now,fetch:async()=>new Response('',{status:503}),documents:async()=>({items:[],providers:[]}),summaries:async()=>({items:[r],providers:[{id:'realmeter',state:'success'}]})});
 assert.equal(result.items.length,1);assert.equal(result.providers.find(p=>p.id==='nbs').state,'error');assert.equal(result.providers.find(p=>p.id==='realmeter').state,'success');
});
test('one failed adapter cannot discard already validated snapshot results',async()=>{
 const result=await collectReliablePolls({now,fetch:async()=>new Response(JSON.stringify(snapshot())),documents:async()=>{throw Error('network')},summaries:async()=>{throw Error('network')}});
 assert.equal(result.items.length,1);assert.equal(result.providers.find(p=>p.id==='nbs').state,'success');
});
