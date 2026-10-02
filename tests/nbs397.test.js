import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {tableFromPages,isNbsApprovalPage} from '../lib/human-poll-documents.js';
import {parseNbsMetadata} from '../lib/human-poll-document-collector.js';
// NBS 189th report, released 2026-10-01, original statistical table PDF p8.
const page=fs.readFileSync(new URL('./fixtures/nbs-189-approval.txt',import.meta.url),'utf8');
test('NBS 189 angle-bracket table is recognized with all demographic rows',()=>{
 const table=tableFromPages('nbs',[page]);
 assert.equal(table.results.overall.positive,43);assert.equal(table.results.overall.negative,50);assert.equal(table.results.overall.undecided,7);assert.equal(table.results.overall.n,1000);
 assert.equal(Object.keys(table.results.gender).length,2);assert.equal(Object.keys(table.results.age).length,6);assert.equal(Object.keys(table.results.region).length,7);
});
test('survey dates come from survey overview, never NBS founding history',()=>{
 const pages=['전국지표조사는 2020년 7월 9일 ~ 7월 11일 1차 조사를 시작했다.', '[ 조사개요 ] 표본크기 1,000명 응답률 18.8% ( 총 5,307명과 통화하여 ) 표집오차는 ±3.1%p 2026년 09월 28일 ~ 09월 30일 (3일간)'];
 assert.deepEqual(parseNbsMetadata(pages,'2026-10-01'),{startDate:'2026-09-28',endDate:'2026-09-30',responseRate:18.8,marginOfError:3.1});
 assert.throws(()=>parseNbsMetadata([pages[0]],'2026-10-01'));
 assert.throws(()=>parseNbsMetadata([pages[1].replace('2026년','2020년')],'2026-10-01'));
});
test('table identification tolerates brackets and PDF nulls but not other questions',()=>{
 for(const title of ['[표 1] 국정운영 평가','<표 1> 국정운영 평가','〈표 1〉 국정운영 평가'])assert.equal(isNbsApprovalPage(title+'\0 T2 B2'),true);
 assert.equal(isNbsApprovalPage('<표 2> 국정운영 평가 T2 B2'),false);
 assert.equal(isNbsApprovalPage('<표 1> 국정운영 평가'),false);
});
