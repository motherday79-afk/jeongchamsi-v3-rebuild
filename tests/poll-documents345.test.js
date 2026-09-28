import test from 'node:test';
import assert from 'node:assert/strict';
import {parseApprovalTable} from '../lib/human-poll-documents.js';
const g=`대통령 직무 수행 평가\n전체 1,002 1,002 37% 56% 7% 2% 5%\n성별 남성 499 496 30% 64% 5% 1% 4%\n여성 503 506 44% 48% 8% 2% 6%\n강원 32 30 - - - - -\n18~29세 126 148 33% 53% 15% 1% 14%`;
test('Gallup takes explicit overall/withheld cells without calculating missing rates',()=>{
 const r=parseApprovalTable('gallup',g);assert.equal(r.overall.n,1002);assert.equal(r.gender.남성.positive,30);assert.equal(r.region.강원.positive,null);assert.equal(r.region.강원.status.positive,'not_provided');assert.equal(r.age['18~29'].weightedN,148);
});
test('Realmeter uses aggregate columns, not very-positive column',()=>{
 const r=parseApprovalTable('realmeter',`대통령 국정수행 평가\n◈ 전체 ◈ (2515) 22.6 11.2 11.1 52.2 33.8 63.3 2.9\n남성 (1246) 20.2 10.6 12.7 54.2 30.8 66.9 2.3`);
 assert.equal(r.overall.positive,33.8);assert.equal(r.gender.남성.negative,66.9);assert.equal(r.overall.weightedN,null);
});
test('NBS uses T2/B2 and explicit unknown, retains original region grouping',()=>{
 const r=parseApprovalTable('nbs',`[표 1] 국정운영 평가\n▣ 전체 ▣ (1,002) (1,002) 16 27 21 27 9 43 48 100\n남자 (493) (496) 15 25 20 33 7 40 53 100\n강원 / 제주 (43) (41) 20 27 24 24 6 47 47 100`);
 assert.equal(r.overall.positive,43);assert.equal(r.overall.undecided,9);assert.equal(r.region['강원·제주'].n,43);
 assert.throws(()=>parseApprovalTable('nbs','정당지지도\n▣ 전체 ▣ (1002) (1002) 16 27 21 27 9 43 48 100'));
});
