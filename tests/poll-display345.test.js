import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAiPanelPublic,renderAiPanelHome} from '../src/views/ai-panel-pages.js';
const human={items:[{institution:'한국갤럽',publishedDate:'2026-09-25',results:{overall:{positive:40,negative:55,undecided:5},gender:{남성:{n:500,positive:41,negative:54,undecided:5}}}}]};
test('current HUMAN results render independently of older AI comparisons',()=>{
 const r={id:'old',status:'published',week:'old-week',modes:['EXPOSED'],aggregates:{EXPOSED:{}},humanPolls:[]};
 const html=renderAiPanelPublic({list:{items:[r]},human});
 assert.match(html,/기관별 최신/);assert.match(html,/2026-09-25/);assert.match(html,/41%/);assert.match(html,/확정된 AI 비교/);
 const home=renderAiPanelHome({item:r,human});assert.match(home,/2026-09-25/);assert.doesNotMatch(home,/data-layout-route="\/ai-panel\?id=old/);
});
