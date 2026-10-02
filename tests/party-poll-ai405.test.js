import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {generatePartyEstimate} from '../lib/party-poll-ai.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const seed=JSON.parse(readFileSync(new URL('../data/party-polls-latest.json',import.meta.url))).items;
const panel=JSON.parse(readFileSync(new URL('../data/party-ai-panel.json',import.meta.url)));
const now=()=>Date.parse('2026-10-02T14:00:00Z');
const run=options=>generatePartyEstimate({items:seed,now,panel,...options});
test('offline simulation has 1000 auditable assignments and matching totals',async()=>{
 const result=await run({fetch:()=>{throw Error('network forbidden');},apiKey:''});
 assert.equal(result.state,'ready');assert.equal(result.audit.responses.length,1000);
 assert.equal(new Set(result.audit.responses.map(r=>r.profileId)).size,1000);
 assert.equal(hash(result.audit.responses),result.audit.responsesHash);
 for(const p of result.results.parties)assert.equal(p.value,result.audit.responses.filter(r=>r.partyId===p.id).length/10);
 assert.equal(Math.round(result.results.parties.reduce((n,p)=>n+p.value,0)*10),1000);
 assert.equal(result.sampleSize,undefined);assert.equal(result.marginOfError,undefined);
 assert.equal(result.basis.independentSurvey,false);assert.equal(result.basis.liveModelCalls,0);
 assert.match(result.methodology,/실제 여론조사 아님/);
});
test('deterministic across input order, retrieval time, and synthetic demographics',async()=>{
 const a=await run();const b=await run({items:[...seed].reverse().map(p=>({...p,fetchedAt:'later',results:{parties:[...p.results.parties].reverse()}})),panel:{...panel,gender:'unused'},now:()=>now()+1000});
 assert.deepEqual(a.results,b.results);assert.equal(a.sourceFingerprint,b.sourceFingerprint);assert.equal(a.audit.responsesHash,b.audit.responsesHash);
});
test('provider totals normalized before equal weighting and small parties collapse into other',async()=>{
 const result=await run();assert.equal(result.basis.sources.length,3);
 assert.equal(result.results.parties.some(p=>p.id==='basic-income'),false);
 for(const row of result.basis.baseline){const expected=result.basis.sources.reduce((n,s)=>n+s.normalizedParties.find(p=>p.id===row.id).value,0)/3;assert.ok(Math.abs(row.value-expected)<1e-8);}
 const gallup=result.basis.sources.find(s=>s.institution==='한국갤럽');assert.equal(gallup.collapsedPartyIds.includes('basic-income'),true);
});
test('missing required category excludes provider rather than imputing zero',async()=>{
 const incomplete={...seed[0],results:{parties:seed[0].results.parties.filter(p=>p.id!=='progressive')}};
 const result=await run({items:[incomplete,...seed.slice(1)]});assert.equal(result.basis.sources.length,2);assert.equal(result.basis.excludedSourcePollIds.includes(incomplete.id),true);
});
test('unchanged sources preserve original publication time',async()=>{
 const previous=await run();const result=await run({previous,now:()=>now()+86400000});assert.equal(result.generatedAt,previous.generatedAt);assert.equal(result.refreshState,'unchanged');
});
test('missing sources, expired sources, and invalid panel retain prior results labelled stale',async()=>{
 const previous=await run();for(const options of [{items:[]},{now:()=>now()+90*86400000},{panel:{profileIds:['bad']}}]){
 const result=await run({previous,...options});assert.equal(result.stale,true);assert.equal(result.publishedDate,previous.publishedDate);assert.deepEqual(result.results,previous.results);
 }
 assert.equal((await run({items:[],previous:null})).state,'pending');assert.equal((await run({panel:null})).state,'configuration_needed');
});
test('source value changes rebuild audited assignments',async()=>{
 const previous=await run();const items=structuredClone(seed);items[0].results.parties[0].value+=1;items[0].results.parties.find(p=>p.id==='none').value-=1;
 const result=await run({previous,items});assert.notEqual(result.sourceFingerprint,previous.sourceFingerprint);assert.notEqual(result.audit.responsesHash,previous.audit.responsesHash);
});
test('saved initial aggregate and separate audit reproduce from bundled source evidence',async()=>{
 const saved=JSON.parse(readFileSync(new URL('../data/party-ai-latest.json',import.meta.url)));
 const audit=JSON.parse(readFileSync(new URL('../data/party-ai-responses.json',import.meta.url)));
 const regenerated=await run({now:()=>Date.parse(saved.generatedAt)});
 assert.equal(audit.responses.length,1000);assert.equal(hash(audit.responses),saved.audit.responsesHash);
 assert.equal(regenerated.sourceFingerprint,saved.sourceFingerprint);assert.deepEqual(regenerated.results,saved.results);
 assert.equal(regenerated.audit.responsesHash,audit.responsesHash);
});
