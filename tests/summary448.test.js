import test from 'node:test';
import assert from 'node:assert/strict';
import {dial,lollipops,localShare,dumbbell,columns,activitySplit} from '../src/views/summary-charts.js';
import {renderDailyReportBody} from '../src/views/daily-report.js';
test('requested title and removal apply to latest and archived report rendering',()=>{const html=renderDailyReportBody({topics:[]});assert.match(html,/>핵심요약</);assert.doesNotMatch(html,/판단 근거|핵심 요약|1–9 핵심/);assert.equal((html.match(/data-summary-topic=/g)||[]).length,9);});
test('different charts keep the supplied measurements and missing values',()=>{
 assert.match(dial(81),/stroke-dasharray="81 100"/);assert.match(dial(null),/집계 자료 없음/);
 assert.match(lollipops([{label:'30대',value:45}]),/--sc-value:45%/);
 assert.match(localShare({label:'교통',count:10,share:40}),/--sc-value:40%/);
 assert.match(dumbbell([{label:'A',value:80},{label:'B',value:20}]),/80점/);
 assert.match(columns([{label:'경력',value:90}]),/height:90%/);
 assert.match(activitySplit(3,1),/width:75%/);assert.match(activitySplit(0,0),/>—</);assert.match(activitySplit(null,1),/집계 자료 없음/);
 assert.doesNotMatch(localShare({label:'<script>',count:1,share:20}),/<script>/);
});
