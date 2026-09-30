import test from 'node:test';
import assert from 'node:assert/strict';
import {renderHomeLayout} from '../src/layout/home-layout.js';
const base={rank:[],columns:[],community:[],session:{},polls:{items:[{id:'poll-1',question:'어떤 선택을 하시겠습니까?',featured:true,options:[{votes:5},{votes:3}]}]}};
test('citizen choice appears once at the end of the sidebar after the mine',()=>{
 const html=renderHomeLayout(base),main=html.split('<main class="main-column">')[1].split('</main>')[0],side=html.split('<aside class="side-column">')[1].split('</aside>')[0];
 assert.doesNotMatch(main,/id="poll"/);assert.equal((html.match(/citizen-choice-banner/g)||[]).length,1);
 assert.ok(side.indexOf('citizen-choice-banner')>side.indexOf('mine-home-banner'));assert.match(side,/8표 참여/);assert.match(side,/href="\/poll\?pollId=poll-1"/);
});
test('closed and unpublished polls are not promoted as active votes',()=>{
 const html=renderHomeLayout({...base,polls:{items:[{id:'hidden',published:false,question:'HIDDEN'},{id:'closed',closedAt:'2026-10-01',question:'CLOSED'}]}});
 assert.doesNotMatch(html,/HIDDEN|CLOSED/);assert.match(html,/지난 투표 결과 보기/);
});
