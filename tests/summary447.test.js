import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSummaryTile,renderDailyReportBody} from '../src/views/daily-report.js';
const record={id:'me',topics:[{id:'01',display:{imageConsistency:{average:81}}},{id:'02',display:{cohorts:[{age:'20대',total:10},{age:'30대',total:50},{age:'40대',total:40}]}},{id:'03',display:{issues:[{label:'교통',count:20,share:80},{label:'복지',count:5,share:20}]}},{id:'04',display:{composition:[{key:'core',value:70},{key:'floating',value:50},{key:'exit',value:20}]}},{id:'05',display:{people:[{id:'me',name:'본인',competition:{index:80}},{id:'far',name:'먼 경쟁자',competition:{index:20}},{id:'near',name:'가까운 경쟁자',competition:{index:77}}]}},{id:'06',display:{lifecycle:[{title:'첫 이슈',daily:[{date:'2026-10-01',count:3},{date:'2026-10-02',count:null},{date:'2026-10-03',count:5}]},{title:'둘째 이슈',daily:[]}]}},{id:'07',display:{articleCount:100,sourceCount:12}},{id:'08',display:{foundations:[{label:'경력',value:90},{label:'지역',value:70},{label:'지지',value:30}]}},{id:'09',display:{initiative:{firstMover:5,joined:2}}}]};
test('nine summaries use bounded data selections and retain source values',()=>{
 const html=renderDailyReportBody(record);assert.equal((html.match(/data-summary-topic=/g)||[]).length,9);
 const age=renderSummaryTile('02',record);assert.match(age,/30대/);assert.match(age,/20대/);assert.doesNotMatch(age,/40대/);
 const local=renderSummaryTile('03',record);assert.match(local,/교통/);assert.doesNotMatch(local,/복지/);
 const rival=renderSummaryTile('05',record);assert.match(rival,/가까운 경쟁자/);assert.doesNotMatch(rival,/먼 경쟁자/);assert.match(rival,/차이 3점/);
 const issue=renderSummaryTile('06',record);assert.match(issue,/첫 이슈/);assert.doesNotMatch(issue,/둘째 이슈/);assert.equal((issue.match(/<polyline/g)||[]).length,2);
 const campaign=renderSummaryTile('08',record);assert.match(campaign,/경력/);assert.match(campaign,/지지/);assert.doesNotMatch(campaign,/지역/);
 assert.doesNotMatch(html,/NaN|undefined|dr-scenes/);
});
test('missing values remain missing and article titles cannot inject HTML',()=>{
 const missing=renderDailyReportBody({topics:[]});assert.equal((missing.match(/data-summary-topic=/g)||[]).length,9);assert.doesNotMatch(missing,/NaN|undefined/);
 const html=renderSummaryTile('06',{topics:[{id:'06',display:{lifecycle:[{title:'<script>alert(1)</script>',daily:[]}]}}]});assert.doesNotMatch(html,/<script>/);assert.match(html,/집계 자료 없음/);
});
