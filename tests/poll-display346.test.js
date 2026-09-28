import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAiPanelHome,renderAiPanelPublic} from '../src/views/ai-panel-pages.js';
const human={items:['한국갤럽','리얼미터','NBS'].map(institution=>({institution,publishedDate:'2026-09-25',results:{overall:{positive:40,negative:55,undecided:5}}}))};
const r={id:'old',status:'published',week:'2026-W38',modes:['EXPOSED'],aggregates:{EXPOSED:{overall:{n:1000,positive:42.5,negative:50,undecided:7.5}}},humanPolls:human.items};
test('home shows actual JCS result with all three human providers and navigation',()=>{
 const h=renderAiPanelHome({item:r,human});
 assert.match(h,/42.5%/);assert.match(h,/data-ai-poll-scroll="1"/);assert.match(h,/data-ai-poll-track/);
 assert.equal((h.match(/class="ai-result human"/g)||[]).length,3);
 assert.equal((h.match(/class="ai-result synthetic"/g)||[]).length,1);
});
test('latest detail does not repeat historical human cards; archive remains available',()=>{
 const h=renderAiPanelPublic({list:{items:[r]},human});
 assert.equal((h.match(/class="ai-result human"/g)||[]).length,3);
 assert.match(h,/42.5%/);assert.match(h,/해당 회차 비교 보기/);
 const archive=renderAiPanelPublic({detail:{item:r},params:{id:r.id},human});
 assert.equal((archive.match(/class="ai-result human"/g)||[]).length,3);
});
