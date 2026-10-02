import test from 'node:test';
import assert from 'node:assert/strict';
import {pushCopy} from '../lib/update-notifications.js';
import {renderAiPanelPublic} from '../src/views/ai-panel-pages.js';
test('AI completion and failure alerts name the correct topic',()=>{
 assert.match(pushCopy({kind:'approval-ai',state:'success'}).title,/JCS AI 대통령 직무평가가 업데이트/);
 assert.match(pushCopy({kind:'approval-ai',state:'failure'}).title,/직무평가 업데이트 실패/);
 assert.match(pushCopy({kind:'failure',target:'party-ai'}).title,/정당 지지도 업데이트 실패/);
 assert.equal(pushCopy({kind:'failure',target:'party-ai'}).path,'/ai-panel?topic=party-support');
});
test('generated approval is disclosed as simulated rather than independent AI responses',()=>{
 const item={id:'auto',status:'published',questionVersion:'gallup-proportion-simulation-v1',modes:['EXPOSED'],aggregates:{EXPOSED:{overall:{positive:40,negative:50,undecided:10,n:1000}}}};
 const h=renderAiPanelPublic({list:{items:[item]},detail:{item},human:{items:[{institution:'한국갤럽',results:{overall:{positive:40,negative:50,undecided:10}}}]},params:{}});
 assert.match(h,/실제 응답자 조사나 독립적인 AI 예측·LLM 응답이 아닙니다/);
 assert.match(h,/새 갤럽 자료 확인 후 JCS AI 함께 갱신/);
});
