import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeReport,renderDailyReportBody,renderReportComparison} from '../src/views/daily-report.js';
test('summary is one conclusion with one strength and focus, not nine sections',()=>{
 const record={topics:[{id:'07',score:80},{id:'03',score:30},{id:'06',score:20}]};
 assert.match(summarizeReport(record).sentence,/언론 보도.*지역 기반/);
 const html=renderDailyReportBody(record);assert.equal((html.match(/class="dr-stat"/g)||[]).length,3);assert.doesNotMatch(html,/dr-scenes|dr-context|dr-visual/);
});
test('high risk is a concern, never rewarded as a strength',()=>{
 const result=summarizeReport({topics:[{id:'01',score:60},{id:'06',score:90},{id:'09',score:40}]});
 assert.match(result.weak,/위험도/);assert.doesNotMatch(result.strong,/위험도/);
});
test('major changes show only the two largest movements and rank',()=>{
 const html=renderReportComparison({ready:true,rankDelta:2,rows:[{id:'01',delta:1},{id:'02',delta:-5},{id:'03',delta:8}]});
 assert.match(html,/2계단 상승/);assert.match(html,/세대·성별/);assert.match(html,/지역 기반/);assert.doesNotMatch(html,/이미지와 인지도/);
});
