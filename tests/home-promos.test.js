import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHomeCage, renderHomeLayout } from '../src/layout/home-layout.js';
import { cageDetail } from '../src/views/community-ui.js';

const old={id:'old',title:"'인사청문회' 게임을 시작해 볼까?",published:true,cageEnabled:true,createdAt:'2026-09-01'};
const fresh={id:'new',title:'새 의제 <script> & 시민 의견',published:true,cageEnabled:true,createdAt:'2026-09-14'};
const data={items:[old,fresh],featuredCageId:'old',cageStats:{old:{posts:{progressive:2,conservative:1}},new:{posts:{progressive:0,conservative:9}}}};

test('home cage is one complete link, including the header area, for administrators too',()=>{
 const html=renderHomeCage(data,{authenticated:true,user:{role:'admin'}}).trim();
 assert.match(html,/^<a\b[^>]*href="\/community\/old"/);
 assert.match(html,/<\/a>$/);
 assert.equal((html.match(/data-layout-route=/g)||[]).length,1);
 assert.doesNotMatch(html,/<button\b|<form\b|<header\b/);
});

test('changing the featured cage updates its real title, route and both percentages',()=>{
 const first=renderHomeCage(data),second=renderHomeCage({...data,featuredCageId:'new'});
 assert.match(first,/진보 67%, 보수 33%/);
 assert.match(second,/href="\/community\/new"/);
 assert.match(second,/새 의제 &lt;script&gt; &amp; 시민 의견/);
 assert.match(second,/진보 0%, 보수 100%/);
 assert.doesNotMatch(second,/<script>|진보 67%/);
});

test('empty or unpublished cages never display sample participation numbers',()=>{
 const html=renderHomeCage({items:[{...old,published:false}],featuredCageId:'old',cageStats:data.cageStats});
 assert.match(html,/href="\/community"/);
 assert.match(html,/다음 케이지를 준비 중입니다/);
 assert.match(html,/참여 전 · 집계 없음/);
 assert.doesNotMatch(html,/진보 67%|보수 33%/);
});

test('only an administrator can choose the featured cage within the cage detail',async()=>{
 const content={commentsFor:async()=>[],peekDomain:()=>data};
 const admin=await cageDetail(old,content,{authenticated:true,user:{id:'admin',role:'admin'}});
 const member=await cageDetail(old,content,{authenticated:true,user:{id:'member',role:'member'}});
 const guest=await cageDetail(old,content,{});
 assert.match(admin,/<form[^>]*data-home-cage-form/);
 assert.match(admin,/<option value="old" selected>/);
 assert.match(admin,/<option value="new"/);
 assert.doesNotMatch(member,/data-home-cage-form/);
 assert.doesNotMatch(guest,/data-home-cage-form/);
});

test('saving the main cage then going Back renders the newly selected cage',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {createNavigation}=await import('../src/core/navigation.js');
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const handler=source.slice(source.indexOf("const cageForm=event.target.closest('[data-home-cage-form]');"),source.indexOf('const participationEdit=event.target.closest'));
 const run=new (Object.getPrototypeOf(async function(){}).constructor)('event','auth','navigation','FormData',handler);
 let selected='old',screen='';
 const window={location:{pathname:'/',search:'',hash:''},scrollX:0,scrollY:0,scrollTo(){},addEventListener(){},history:{state:null,replaceState(state,_title,url){this.state=state;window.location.pathname=url;},pushState(state,_title,url){this.replaceState(state,_title,url);}}};
 const paint=()=>screen=renderHomeCage({...data,featuredCageId:selected});
 const navigation=createNavigation({window,readSnapshot:()=>screen,restoreSnapshot:html=>{screen=html;},onRoute:paint});
 const homeState=navigation.start();paint();navigation.navigate('/community/old');
 const state={textContent:''},form={querySelector:()=>state};
 await run({target:{closest:()=>form},preventDefault(){}},{saveHomeCage:async id=>{selected=id;return {ok:true};}},navigation,class{get(){return 'new';}});
 window.location.pathname='/';window.history.state=homeState;navigation.handlePop({state:homeState});
 assert.match(screen,/href="\/community\/new"/);
});
