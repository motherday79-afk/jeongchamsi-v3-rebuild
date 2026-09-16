import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderGroupDetail,renderGroupCreate} from '../src/views/group-pages.js';
import {groupMutationFromForm,bindGroupInteractions} from '../src/ui/group-interactions.js';

const detail=(viewer={},more={})=>({id:'g 1',version:3,name:'동네 모임',category:'social',status:'approved',description:'함께 만나요',region:'서울',ownerName:'가온',rules:'서로 존중',viewer:{role:'member',userId:'u',membershipStatus:'active',canRead:true,canWrite:true,canManage:false,canEditSettings:false,...viewer},posts:[],events:[],...more});

test('every detail state keeps an accessible groups directory link and content tabs',()=>{
 for(const item of [detail(),detail({canRead:false,canWrite:false}),detail({canRead:true},{isExample:true})]){
  const html=renderGroupDetail(item,{},'gallery');
  assert.match(html,/class="group-back-link"[^>]*href="\/groups"[^>]*>모임 목록으로<\/a>/);
  for(const tab of ['tab=posts','tab=gallery','tab=events'])assert.match(html,new RegExp(tab));
 }
});

test('posts render notice-first compact rows with expandable detail and a collapsed composer',()=>{
 const html=renderGroupDetail(detail({}, {posts:[
  {id:'p1',kind:'post',title:'일반글',body:'일반 본문',authorName:'하람',createdAt:'2026-09-14T01:00:00Z',comments:[],images:[]},
  {id:'p2',kind:'notice',title:'공지글',body:'공지 본문',authorName:'가온',createdAt:'2026-09-15T01:00:00Z',comments:[{id:'c',authorName:'새봄',body:'확인'}],images:[]}
 ]}));
 assert.match(html,/class="group-composer"[\s\S]*<summary>글쓰기<\/summary>/);
 assert.ok(html.indexOf('공지글')<html.indexOf('일반글'));
 assert.match(html,/group-post-meta[\s\S]*가온[\s\S]*2026[\s\S]*댓글 1/);
 assert.match(html,/class="group-post-detail"[\s\S]*공지 본문/);
 assert.match(html,/data-group-composer-cancel/);
});

test('gallery uses photo-first cards with expandable descriptions and gallery-only composer',()=>{
 const html=renderGroupDetail(detail({}, {posts:[{id:'photo',kind:'gallery',title:'산책',body:'강변 풍경',authorName:'가온',createdAt:'2026-09-15T01:00:00Z',images:[{id:'i',url:'/api/v3/groups?id=g&imageId=i'}],comments:[]}]}),{},'gallery');
 assert.match(html,/class="group-composer group-gallery-composer"[\s\S]*<summary>사진 올리기<\/summary>/);
 assert.match(html,/name="kind" value="gallery"/);
 assert.doesNotMatch(html,/<select name="kind">/);
 assert.match(html,/class="group-gallery-card"[\s\S]*<summary[\s\S]*group-gallery-image[\s\S]*<h3>산책<\/h3>[\s\S]*강변 풍경/);
});

test('events are chronological, show time place and attendance, and accept optional Korea end time',()=>{
 const html=renderGroupDetail(detail({canManage:true},{events:[
  {id:'late',title:'저녁',startsAt:'2026-10-02T09:00:00Z',place:'광장',yesCount:2,noCount:1},
  {id:'early',title:'아침',startsAt:'2026-10-01T00:00:00Z',endsAt:'2026-10-01T01:00:00Z',place:'공원',yesCount:4,noCount:0}
 ]}),{},'events');
 assert.ok(html.indexOf('아침')<html.indexOf('저녁'));
 assert.match(html,/class="group-composer group-event-composer"[\s\S]*<summary>일정 등록<\/summary>/);
 assert.match(html,/type="datetime-local" name="endsAt"/);
 assert.match(html,/공원[\s\S]*참석 4[\s\S]*불참 0/);
 const data=new FormData();for(const [k,v] of [['operation','event'],['title','일정'],['body','내용'],['startsAt','2026-10-01T09:30'],['endsAt','2026-10-01T11:00'],['place','서울']])data.set(k,v);
 assert.equal(groupMutationFromForm(data).input.endsAt,'2026-10-01T02:00:00.000Z');
 data.set('endsAt','');assert.equal(groupMutationFromForm(data).input.endsAt,'');
});

test('create and settings explain cover upload timing and image treatment',()=>{
 assert.match(renderGroupCreate({authenticated:true,user:{id:'u'}}),/모임을 만든 뒤 설정에서 대표 이미지를 올릴 수 있습니다/);
 const html=renderGroupDetail(detail({canManage:true,canEditSettings:true}),{},'settings');
 assert.match(html,/권장 1200×400px · JPG·PNG·WebP · 최대 2MB · 중앙 기준 자르기/);
});

test('composer cancel closes its details without resetting the form',()=>{
 const listeners={},form={reset(){throw Error('must not reset')}},panel={open:true},button={closest:s=>s==='[data-group-composer-cancel]'?button:s==='details'?panel:s==='form'?form:null};
 const root={addEventListener:(name,handler)=>listeners[name]=handler};bindGroupInteractions(root,{client:{}});
 listeners.click({target:button});assert.equal(panel.open,false);
});

test('groups stylesheet provides distinct compact, gallery, event and mobile layouts',()=>{
 const css=readFileSync(new URL('../css/groups-171.css',import.meta.url),'utf8');
 for(const token of ['.group-post-row','.group-gallery-card','.group-event-list','.group-composer','@media(max-width:760px)'])assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(css,/\.group-detail \[data-group-post-form\],\.group-detail \[data-group-event-form\]\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.group-event-times\{[^}]*grid-column:1\/-1/);
 assert.match(css,/@media\(max-width:760px\)\{[\s\S]*\.group-detail \[data-group-post-form\],\.group-detail \[data-group-event-form\],\.group-event-times\{grid-template-columns:1fr\}/);
 assert.match(css,/\.group-gallery>figure:has\(\.group-gallery-card\[open\]\)\{grid-column:1\/-1/);
 assert.match(css,/\.group-gallery \.group-gallery-detail \.group-gallery-full>img\{[^}]*aspect-ratio:auto/);
 assert.match(css,/\.group-gallery-card\[open\]>summary \.group-gallery-image\{max-width:240px/);
});

test('empty post and event tabs explain that no content has been added',()=>{
 assert.match(renderGroupDetail(detail(),{},'posts'),/아직 작성된 글이 없습니다/);
 assert.match(renderGroupDetail(detail({canManage:true}),{},'events'),/등록된 일정이 없습니다/);
});
