import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeParty,normalizeRegion,politicalMapSummary} from '../src/core/political-map-model.js';
import {POLITICIAN_SEED} from '../lib/politician-seed.generated.js';

const rows=[
 {id:'assembly-001',type:'assembly',name:'가',region:'광주',party:'민주당'},
 {id:'assembly-002',type:'assembly',name:'나',region:'전남',party:'더불어민주당'},
 {id:'metropolitan-001',type:'metropolitan',region:'전남광주통합특별시',party:'국힘'},
 {id:'basic-001',type:'basic',region:'전라남도',party:'국민의힘',isVacant:true},
 {id:'assembly-003',type:'assembly',region:'전국',jurisdiction:'비례대표',party:'무소속'},
 {id:'basic-002',type:'basic',region:'불명',party:''},
 {id:'nonincumbent-001',type:'nonincumbent',region:'서울',party:'국민의힘'},
];
test('canonical regions merge Gwangju and Jeonnam, retain proportional and unknown separately',()=>{
 assert.equal(normalizeRegion(rows[0]),'전남광주');
 assert.equal(normalizeRegion(rows[2]),'전남광주');
 assert.equal(normalizeRegion(rows[3]),'전남광주');
 assert.equal(normalizeRegion(rows[4]),'비례대표');
 assert.equal(normalizeRegion(rows[5]),'미분류');
 assert.equal(normalizeRegion({jurisdiction:'강원특별자치도 춘천시'}),'강원');
 assert.equal(normalizeParty(' 국민의 힘 '),'국민의힘');
 assert.equal(normalizeParty('새정당'),'새정당');
});
test('aggregation counts each registered slot once, excludes nonincumbents and isolates vacancies',()=>{
 const summary=politicalMapSummary([...rows,rows[0]]);
 assert.equal(summary.total,6);
 assert.equal(summary.occupied,5);
 assert.equal(summary.vacant,1);
 assert.deepEqual(summary.byType,{assembly:3,metropolitan:1,basic:2});
 const merged=summary.regions.find(row=>row.id==='전남광주');
 assert.equal(merged.total,4);
 assert.equal(merged.parties.find(row=>row.party==='더불어민주당').count,2);
 assert.equal(merged.parties.find(row=>row.party==='국민의힘').count,1);
 assert.equal(merged.parties.find(row=>row.party==='공석').count,1);
 assert.equal(summary.parties.reduce((sum,row)=>sum+row.count,0),6);
 assert.equal(summary.regions.reduce((sum,row)=>sum+row.total,0),6);
});
test('combined filters apply to list and every total; empty result stays valid',()=>{
 const summary=politicalMapSummary(rows,{type:'assembly',region:'전남광주',party:'민주당'});
 assert.equal(summary.total,2);
 assert.equal(summary.items.length,2);
 assert.equal(summary.parties[0].share,1);
 assert.equal(politicalMapSummary(rows,{region:'서울'}).total,0);
 assert.equal(politicalMapSummary(null).total,0);
});
test('registered seed conserves all 543 slots across categories and geography',()=>{
 const items=Object.values(POLITICIAN_SEED.profiles).flat();
 const summary=politicalMapSummary(items);
 assert.deepEqual(summary.byType,{assembly:300,metropolitan:16,basic:227});
 assert.equal(summary.total,543);
 assert.equal(summary.regions.reduce((sum,row)=>sum+row.total,0),543);
 assert.equal(summary.regions.find(row=>row.id==='미분류').total,0);
 assert.ok(summary.regions.find(row=>row.id==='비례대표').total>0);
 assert.equal(politicalMapSummary(items,{type:'metropolitan',region:'전남광주'}).total,1);
});
