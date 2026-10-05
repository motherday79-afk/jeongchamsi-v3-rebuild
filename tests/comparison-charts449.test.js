import test from 'node:test';
import assert from 'node:assert/strict';
import {renderComparisonBoard} from '../src/views/comparison-board.js';
import {searchData,mediaData,activityData} from '../src/views/comparison-charts.js';

const entry=(id,pc=30,mobile=70,articles=12,sources=4,total=10,first=3)=>({
 item:{id,name:'정치인 '+id,party:'같은 정당'},
 intelligence:{rank:{overall:Number(id)+1},diagnoses:[
  {id:'01',title:'브랜드',score:75,display:{kind:'brand',search:{pc,mobile}}},
  {id:'06',title:'이슈·위기',score:85,display:{kind:'risk'}},
  {id:'07',title:'언론',score:50,display:{kind:'media',articleCount:articles,sourceCount:sources}},
  {id:'09',title:'활동',score:65,display:{kind:'action',activityCount:total,initiative:{firstMover:first}}}
 ]}
});

test('five tabs use distinct graphics and retain stable person identities for two to four people',()=>{
 for(const count of [2,3,4]){
  const entries=Array.from({length:count},(_,i)=>entry(String(i)));
  const html=renderComparisonBoard(entries);
  for(const kind of ['rank','search','media','activity','diagnosis']) assert.match(html,new RegExp('data-compare-chart="'+kind+'"'));
  assert.equal((html.match(/data-board-person=/g)||[]).length,count);
  assert.doesNotMatch(html,/class="(?:election-bar|cb-meter)"|data-election-metric|NaN|Infinity/);
  assert.match(html,/href="\/person\/0"/);
  assert.match(html,/data-risk="true"/);
 }
});

test('search stacks keep true zero, complete totals and one common scale',()=>{
 const data=searchData([entry('0',0,0),entry('1',30,70),entry('2',null,20)]);
 assert.deepEqual(data.rows.map(r=>r.total),[0,100,null]);
 assert.equal(data.max,100);
 assert.equal(data.rows[2].mobile,20);
 assert.equal(searchData([entry('0',-1,20)]).rows[0].total,null);
});

test('media points require both axes and preserve coincident points without moving values',()=>{
 const data=mediaData([entry('0'),entry('1'),entry('2',0,0,null,6),entry('3',0,0,0,0)]);
 assert.deepEqual(data.points.map(p=>p.indices),[[0,1],[3]]);
 assert.deepEqual(data.points.map(p=>[p.articles,p.sources]),[[12,4],[0,0]]);
 assert.equal(data.rows[2].sources,6);
 assert.equal(data.rows[2].articles,null);
 const html=renderComparisonBoard([entry('0'),entry('1')]);
 assert.match(html,/1·2/);
 assert.match(html,/기사 12건 · 매체 4개/);
});

test('activity rings do not invent missing proportions or convert bad totals',()=>{
 const data=activityData([entry('0'),entry('1',0,0,0,0,0,0),entry('2',0,0,0,0,2,3),entry('3',0,0,0,0,10,null)]);
 assert.deepEqual(data.map(r=>r.remaining),[7,0,null,null]);
 assert.deepEqual(data.map(r=>r.share),[.3,null,null,null]);
 assert.equal(data[2].total,2);
 assert.equal(data[3].first,null);
});

test('missing data is distinct from zero and arbitrary text is escaped',()=>{
 const e=entry('0',null,null,null,null,null,null);
 e.item.name='<img onerror=alert(1)>';
 e.intelligence.rank.overall=null;
 e.intelligence.diagnoses[0].score=null;
 e.intelligence.prescriptions=[{title:'PRIVATE_STRATEGY'}];
 const html=renderComparisonBoard([e,entry('1')]);
 assert.match(html,/자료 없음/);
 assert.match(html,/&lt;img onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img onerror|PRIVATE_STRATEGY|NaN|Infinity/);
 assert.match(html,/높을수록 위험/);
});
