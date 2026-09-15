import test from 'node:test';
import assert from 'node:assert/strict';
import { cageDetail } from '../src/views/community-ui.js';
import { renderHomeCage } from '../src/layout/home-layout.js';
import { siteHeader } from '../src/layout/site-shell.js';

const item={id:'cage-a',title:'시민의 새로운 의제',cageEnabled:true,published:true};
const content={commentsFor:async()=>[],peekDomain:()=>({items:[item]})};
const member={authenticated:true,user:{id:'member'}};
const join=html=>html.match(/<section class="jc-join-box"[^>]*>([\s\S]*?)<\/section>/)?.[0]||'';
for(const camp of ['progressive','conservative']) {
 test(`sidebar ${camp} route opens the checked camp and enabled writer`,async()=>{
  const banner=renderHomeCage({items:[item]});
  const route=banner.match(new RegExp(`href="([^"]*camp=${camp}[^"]*)"`))?.[1]?.replaceAll('&amp;','&');
  assert.ok(route);
  const form=join(await cageDetail(item,content,member,{},route));
  assert.match(form,new RegExp(`<input[^>]+value="${camp}"[^>]*checked`));
  assert.equal((form.match(/ checked/g)||[]).length,1);
  assert.match(form,/<div data-cage-fields><fieldset data-camp-body>/);
  assert.match(form,/data-cage-compose-entry/);
  assert.match(form,/name="cageParentId" value="cage-a"/);
 });
 test(`guest keeps ${camp} through the login link without a writable form`,async()=>{
  const form=join(await cageDetail(item,content,{}, {},`/community/cage-a?camp=${camp}&compose=1`));
  const login=form.match(/data-layout-route="([^"]+)"/)?.[1]?.replaceAll('&amp;','&');
  assert.equal(new URLSearchParams(login?.split('?')[1]).get('next'),`/community/cage-a?camp=${camp}&compose=1`);
  assert.doesNotMatch(form,/data-stage-form="board"|name="title"/);
 });
}
for(const suffix of ['', '?camp=progressive', '?camp=unknown&compose=1', '?camp=conservative&compose=0']) {
 test(`ordinary or invalid entry retains manual camp selection: ${suffix}`,async()=>{
  const form=join(await cageDetail(item,content,member,{},'/community/cage-a'+suffix));
  assert.doesNotMatch(form,/ checked|data-cage-compose-entry/);
  assert.match(form,/<div data-cage-fields hidden><fieldset data-camp-body disabled>/);
 });
}
test('an ended cage links to its record and never opens a writable form',async()=>{
 const closed={...item,cageEndsAt:1};
 const banner=renderHomeCage({items:[closed]});
 assert.match(banner,/href="\/community\/cage-a"/);
 assert.doesNotMatch(banner,/compose=1/);
 const form=join(await cageDetail(closed,content,member,{},'/community/cage-a?camp=progressive&compose=1'));
 assert.doesNotMatch(form,/data-stage-form="board"|data-cage-compose-entry/);
 assert.match(form,/종료/);
});
test('search logo is a non-submit reload button while the top-left slogan remains Home',()=>{
 const html=siteHeader();
 assert.match(html,/<button type="button" class="search-home" data-page-reload/);
 assert.match(html,/<a class="header-brand-home" href="\/" data-layout-route="\/"/);
});

test('login returns only to a valid cage composer, preserving both camp choices',async()=>{
 const { cageLoginReturn }=await import('../src/core/cage-entry.js');
 for(const camp of ['progressive','conservative']) {
  const next=`/community/cage-a?camp=${camp}&compose=1`;
  assert.equal(cageLoginReturn('/login?next='+encodeURIComponent(next)),next);
 }
 for(const next of ['https://example.com','//example.com','/admin','/community/cage-a?camp=wrong&compose=1','/community/cage-a?camp=progressive','/community/%ZZ?camp=progressive&compose=1']) {
  assert.equal(cageLoginReturn('/login?next='+encodeURIComponent(next)),'');
 }
});

test('successful login executes the actual application redirect with the selected camp',async()=>{
 const { readFile }=await import('node:fs/promises');
 const { cageLoginReturn }=await import('../src/core/cage-entry.js');
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(result?.status===401&&");
 const branch=source.slice(start,source.indexOf('if(result?.route)',start));
 const {groupLoginReturn}=await import('../src/core/group-routing.js');
 const execute=new Function('result','type','navigation','route','cageLoginReturn','groupLoginReturn',branch);
 const run=(...args)=>execute(...args,groupLoginReturn);
 for(const camp of ['progressive','conservative']){
  const next=`/community/cage-a?camp=${camp}&compose=1`,routes=[];
  run({ok:false,status:401,error:'INVALID_LOGIN'},'login',{navigate:r=>routes.push(r)},()=>'/login?next='+encodeURIComponent(next),cageLoginReturn);
  assert.deepEqual(routes,[]);
  run({ok:true},'login',{navigate:r=>routes.push(r)},()=>'/login?next='+encodeURIComponent(next),cageLoginReturn);
  assert.deepEqual(routes,[next]);
 }
 const routes=[];
 run({ok:true},'login',{navigate:r=>routes.push(r)},()=>'/login',cageLoginReturn);
 run({ok:false},'login',{navigate:r=>routes.push(r)},()=>'/login?next=x',cageLoginReturn);
 assert.deepEqual(routes,['/mypage']);
 const invited='/groups/group-one?invite=invite-token';
 run({ok:true},'login',{navigate:r=>routes.push(r)},()=>'/login?return='+encodeURIComponent(invited),cageLoginReturn);
 assert.deepEqual(routes,['/mypage',invited]);
});

test('direct entry focuses the opinion title or guest login, never an ordinary/disabled writer',async()=>{
 const { focusCageCompose }=await import('../src/ui/interactions.js');
 for(const guest of [false,true]) {
  const calls=[],target={disabled:false,closest:()=>null,focus:options=>calls.push(['focus',options])};
  const entry={scrollIntoView:options=>calls.push(['scroll',options]),querySelector:selector=>selector===(guest?'[data-layout-route]':'input[name="title"]')?target:null};
  focusCageCompose({querySelector:()=>entry});
  assert.deepEqual(calls,[['scroll',{block:'center'}],['focus',{preventScroll:true}]]);
 }
 focusCageCompose({querySelector:()=>null});
 focusCageCompose({querySelector:()=>({querySelector:()=>({disabled:true}),scrollIntoView(){assert.fail('disabled writer should not focus');}})});
});

test('saving a direct-entry opinion submits the selected camp and consumes composer parameters',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(type==='board'){const item=await content.create");
 const branch=source.slice(start,source.indexOf('\n',start));
 const stateStart=source.indexOf('function cageRouteState('),stateEnd=source.indexOf('function showCageFeedback',stateStart);
 const run=new (Object.getPrototypeOf(async function(){}).constructor)('content','data','window','route','form','render',`let renderSequence=0,cageFeedback=null,result;const type='board';${source.slice(stateStart,stateEnd)}${branch}return {result,cageFeedback};`);
 for(const camp of ['progressive','conservative']) {
  const input={cageParentId:'cage-a',camp,title:'제목',body:'의견'},saved=[];let location=`/community/cage-a?camp=${camp}&compose=1`,renders=0;
  const outcome=await run({create:async(domain,data)=>{saved.push({domain,data});return{id:'child'};}},input,{history:{state:{},replaceState(_state,_title,url){location=url;}}},()=>location,{dataset:{domain:'community'}},async()=>{renders++;});
  assert.deepEqual(saved,[{domain:'community',data:input}]);
  assert.equal(location,'/community/cage-a?page=1&mode=posts');
  assert.deepEqual(outcome.cageFeedback,{rootId:'cage-a',camp});assert.equal(renders,1);
 }
});

test('failed opinion submission keeps the chosen camp and does not navigate or reset',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(type==='board'){const item=await content.create"),branch=source.slice(start,source.indexOf('\n',start));
 const run=new (Object.getPrototypeOf(async function(){}).constructor)('content','data','form',`let result,cageFeedback=null;const type='board';${branch}return result;`);
 const data={cageParentId:'cage-a',camp:'progressive',title:'제목',body:'의견'};
 const result=await run({create:async()=>({error:'CAGE_CLOSED'})},data,{dataset:{domain:'community'}});
 assert.deepEqual(result,{ok:false,error:'CAGE_CLOSED'});assert.equal(data.camp,'progressive');assert.equal(data.body,'의견');
});
