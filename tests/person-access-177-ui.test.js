import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPoliticianDetail} from '../src/views/politicians.js';
import {renderPoliticianCompare} from '../src/views/politician-compare.js';
import {bindPersonRefresh,updateAnalysisAccess,watchAnalysisAccess} from '../src/ui/person-refresh.js';
import {createNavigation,isTransientAnalysisRoute} from '../src/core/navigation.js';
import {createAuthService} from '../src/core/auth.js';

const now=1_800_000_000_000;
const person=id=>({id,type:'assembly',name:`정치인 ${id}`,party:'무소속',jurisdiction:'서울',roleLabel:'국회의원'});
const diagnoses=marker=>Array.from({length:10},(_,index)=>({
 id:String(index+1).padStart(2,'0'),title:`진단 ${index+1}`,score:50+index,headline:`${marker} ${index+1}`,
 politicalMeaning:'정치적 의미',currentPosition:'현재 위치',percentile:'상위 10%',interpretation:'해석',sourceTypes:['공개자료'],
 display:{kind:index===0?'brand':'summary',nowSignal:marker,indicators:[],items:[],totalScore:55}
}));
const intelligence=(id,marker=id)=>({accessTier:'admin',analysisAccess:{personId:id,active:true,grantedAt:now-1000,expiresAt:now+86_400_000,serverNow:now},diagnoses:diagnoses(marker),prescriptions:[],rank:{overall:1,category:1}});
const paidResult=(id,marker=id)=>({ok:true,item:person(id),accessTier:'admin',analysisAccess:{personId:id,active:true,grantedAt:now-1000,expiresAt:now+86_400_000,serverNow:now},intelligence:intelligence(id,marker)});
const memberResult=(id,marker=id)=>({ok:true,item:person(id),accessTier:'member',analysisAccess:{personId:id,active:false,grantedAt:null,expiresAt:null,serverNow:now},intelligence:{accessTier:'member',diagnoses:diagnoses(marker).slice(0,6),rank:{overall:2}}});
const memberSession={authenticated:true,user:{id:'member-1',role:'member'}};

test('paid detail uses the full report without administrator controls and exposes both refresh entry points',async()=>{
 const result=paidResult('a','PAID_FULL');
 const html=await renderPoliticianDetail('a',{get:async()=>result},memberSession,{},result);
 assert.match(html,/data-paid-analysis="a"/);
 assert.match(html,/data-analysis-access/);
 assert.match(html,/24시간 심층 분석/);
 assert.equal((html.match(/data-member-refresh-open/g)||[]).length,1);
 assert.equal((html.match(/data-member-refresh="a"/g)||[]).length,2);
 assert.match(html,/data-diagnostic-topic="10"/);
 assert.doesNotMatch(html,/data-politician-photo-form/);
});

test('detail does not render a paid projection whose access expired during transport',async()=>{
 const result=paidResult('a','STALE_PAID_SECRET');result.analysisAccess.serverNow=result.analysisAccess.expiresAt;result.intelligence.analysisAccess.serverNow=result.intelligence.analysisAccess.expiresAt;
 const html=await renderPoliticianDetail('a',{get:async()=>result},memberSession,{},result);
 assert.doesNotMatch(html,/STALE_PAID_SECRET/);assert.doesNotMatch(html,/data-paid-analysis/);assert.doesNotMatch(html,/data-politician-photo-form/);
});

test('paid members can compare two, three, or four fully unlocked people with full report cells',async()=>{
 for(const count of [2,3,4]){
  const ids=Array.from({length:count},(_,index)=>String.fromCharCode(97+index));
  const html=await renderPoliticianCompare({getForCompare:async id=>paidResult(id),get:async id=>paidResult(id),search:async()=>({ok:true,items:[]})},`/compare?ids=${ids.join(',')}&run=1`,memberSession);
  assert.match(html,/data-compare-limit="4"/);
  assert.match(html,/jcs-compare-report-paid/);
  assert.match(html,/data-analysis-access/);
  assert.equal((html.match(/data-compare-matrix-profile="/g)||[]).length,count);
  assert.match(html,/data-comparison-topic="10"/);
 }
});

test('mixed unlocked and locked comparison blocks the full report and links every locked person to unlock',async()=>{
 const results={a:paidResult('a','OPEN_SECRET'),b:memberResult('b','LOCKED_MEMBER'),c:paidResult('c','OPEN_PEER')};
 const html=await renderPoliticianCompare({getForCompare:async id=>results[id],get:async id=>results[id],search:async()=>({ok:true,items:[]})},'/compare?ids=a,b,c&run=1',memberSession);
 assert.match(html,/data-compare-access-gate/);
 assert.match(html,/href="\/person\/b"/);
 assert.doesNotMatch(html,/jcs-compare-report-paid/);
 assert.doesNotMatch(html,/OPEN_SECRET/);
});

test('ordinary two-person member comparison remains available when neither person is unlocked',async()=>{
 const html=await renderPoliticianCompare({getForCompare:async id=>memberResult(id),get:async id=>memberResult(id),search:async()=>({ok:true,items:[]})},'/compare?ids=a,b&run=1',memberSession);
 assert.match(html,/data-compare-limit="2"/);
 assert.match(html,/jcs-compare-report-member/);
 assert.doesNotMatch(html,/data-compare-access-gate/);
});

test('comparison never renders a successful subset when one requested person fails',async()=>{
 const html=await renderPoliticianCompare({getForCompare:async id=>id==='b'?{ok:false,error:'LOAD_FAILED'}:paidResult(id,'MUST_NOT_RENDER'),get:async id=>paidResult(id),search:async()=>({ok:true,items:[]})},'/compare?ids=a,b&run=1',memberSession);
 assert.match(html,/data-compare-access-gate/);
 assert.match(html,/비교 데이터를 불러오지 못했습니다/);
 assert.doesNotMatch(html,/MUST_NOT_RENDER/);
});

test('successful paid refresh redraws detail immediately instead of waiting for a second button',async t=>{
 const originalSession=globalThis.sessionStorage,originalCrypto=globalThis.crypto,originalConfirm=globalThis.confirm;
 const values=new Map();globalThis.sessionStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:()=> 'request-177'}});globalThis.confirm=()=>true;
 t.after(()=>{if(originalSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=originalSession;if(originalCrypto===undefined)delete globalThis.crypto;else Object.defineProperty(globalThis,'crypto',{configurable:true,value:originalCrypto});if(originalConfirm===undefined)delete globalThis.confirm;else globalThis.confirm=originalConfirm;});
 const state={textContent:''},check={hidden:true,disabled:false},start={disabled:false,hidden:false,hasAttribute:name=>name==='data-member-refresh-start'},appended=[];
 const panel={dataset:{memberRefresh:'a',refreshUser:'member-1',personName:'정치인 a',fee:'100'},querySelector:selector=>selector==='[data-refresh-state]'?state:selector==='[data-member-refresh-check]'?check:start,append:node=>appended.push(node)};
 start.closest=selector=>selector==='[data-member-refresh]'?panel:selector.includes('[data-member-refresh-start]')?start:null;const handlers={},root={addEventListener:(type,fn)=>handlers[type]=fn};let redraws=0;
 bindPersonRefresh(root,{auth:{requestMemberRefresh:async()=>({ok:true,publishedAt:now,points:100,analysisAccess:{active:true,expiresAt:now+86_400_000,serverNow:now}})},onPublished:async()=>{redraws++;}});
 await handlers.click({preventDefault(){},target:start});
 assert.equal(redraws,1);
 assert.equal(appended.length,0);
});

test('top refresh action opens its prepared fee panel in place without scrolling',async()=>{
 const panel={dataset:{memberRefresh:'a',refreshPlacement:'top'},hidden:true,focus(){this.focused=true;}},opener={dataset:{memberRefreshOpen:'a'},attrs:{},setAttribute(name,value){this.attrs[name]=value;}};
 opener.closest=selector=>selector==='[data-member-refresh-open]'?opener:null;
 const handlers={},root={addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:()=>[panel]};
 bindPersonRefresh(root,{auth:{}});await handlers.click({preventDefault(){},target:opener});
 assert.equal(panel.hidden,false);assert.equal(opener.attrs['aria-expanded'],'true');assert.equal(panel.focused,true);
});

test('expiry hides paid markup before requesting a fresh projection',()=>{
 const label={textContent:''},status={dataset:{accessExpiresAt:'2000',accessServerNow:'1900',accessRenderedAt:'1000'},querySelector:()=>label},paid={innerHTML:'PAID SECRET'};
 const root={querySelectorAll:selector=>selector==='[data-analysis-access]'?[status]:selector==='[data-paid-analysis]'?[paid]:[]};let protectedBeforeRefresh=false;
 const expired=updateAnalysisAccess(root,{now:1200,onExpired:()=>{protectedBeforeRefresh=!paid.innerHTML.includes('PAID SECRET');}});
 assert.equal(expired,true);assert.equal(protectedBeforeRefresh,true);assert.match(paid.innerHTML,/열람 시간이 종료/);
});

test('visibility and pageshow recheck access using the server clock offset',t=>{
 const key=String(9_177_000+Math.floor(Math.random()*1000)),label={textContent:''},status={dataset:{accessExpiresAt:key,accessServerNow:String(Number(key)-100),accessRenderedAt:'1000'},querySelector:()=>label},paid={innerHTML:'PAID SECRET'},handlers={};
 const root={nodeType:9,visibilityState:'visible',addEventListener:(type,fn)=>handlers[type]=fn,querySelectorAll:selector=>selector==='[data-analysis-access]'?[status]:selector==='[data-paid-analysis]'?[paid]:[]};
 const oldAdd=globalThis.addEventListener,oldInterval=globalThis.setInterval,oldTimeout=globalThis.setTimeout;globalThis.addEventListener=(type,fn)=>handlers[type]=fn;globalThis.setInterval=()=>12;globalThis.setTimeout=()=>11;t.after(()=>{globalThis.addEventListener=oldAdd;globalThis.setInterval=oldInterval;globalThis.setTimeout=oldTimeout;});
 let refreshes=0;bindPersonRefresh(root,{auth:{},onPublished:()=>{refreshes++;}});status.dataset.accessRenderedAt=String(Date.now()-200);
 handlers.visibilitychange();assert.equal(refreshes,1);assert.doesNotMatch(paid.innerHTML,/PAID SECRET/);
 paid.innerHTML='PAID SECRET AGAIN';watchAnalysisAccess(root);handlers.pageshow({persisted:true});
 assert.equal(refreshes,2);assert.doesNotMatch(paid.innerHTML,/PAID SECRET AGAIN/);
});

test('access guard schedules the server-offset expiry deadline and clears it off protected routes',t=>{
 const originalTimeout=globalThis.setTimeout,originalInterval=globalThis.setInterval,originalClearTimeout=globalThis.clearTimeout,originalClearInterval=globalThis.clearInterval;let delay=null;const cleared=[];globalThis.clearTimeout=id=>cleared.push(['timeout',id]);globalThis.clearInterval=id=>cleared.push(['interval',id]);globalThis.setTimeout=(_fn,ms)=>{delay=ms;return 21;};globalThis.setInterval=()=>22;
 t.after(()=>{globalThis.setTimeout=originalTimeout;globalThis.setInterval=originalInterval;globalThis.clearTimeout=originalClearTimeout;globalThis.clearInterval=originalClearInterval;});
 const base=Date.now(),status={dataset:{accessExpiresAt:'5000',accessServerNow:'4000',accessRenderedAt:String(base)},querySelector:()=>null},root={querySelectorAll:selector=>selector==='[data-analysis-access]'?[status]:[]};
 watchAnalysisAccess(root);assert.ok(delay>=900&&delay<=1100);
 watchAnalysisAccess({querySelectorAll:()=>[]});assert.deepEqual(cleared.slice(-2),[['timeout',21],['interval',22]]);
});

test('person and compare history entries are reloaded instead of restoring paid HTML snapshots',()=>{
 assert.equal(isTransientAnalysisRoute('/person/a'),true);assert.equal(isTransientAnalysisRoute('/compare?ids=a,b'),true);assert.equal(isTransientAnalysisRoute('/now'),false);
 const listeners={},history={state:null,replaceState(state,_title,url){this.state=state;setUrl(url);},pushState(state,_title,url){this.state=state;setUrl(url);},scrollRestoration:'auto'},location={pathname:'/person/a',search:'',hash:''},setUrl=url=>{const parsed=new URL(url,'https://example.test');location.pathname=parsed.pathname;location.search=parsed.search;};
 const window={location,history,scrollX:0,scrollY:0,scrollTo(){},requestAnimationFrame:fn=>fn(),addEventListener:(type,fn)=>listeners[type]=fn};let screen='PAID SECRET',restores=0,requests=0;
 const navigation=createNavigation({window,readSnapshot:()=>isTransientAnalysisRoute(location.pathname+location.search)?'':screen,restoreSnapshot:markup=>{screen=markup;restores++;},onRoute:()=>{requests++;}});const state=navigation.start();navigation.cacheCurrent();
 screen='different';assert.equal(navigation.handlePop({state}),false);assert.equal(restores,0);assert.equal(requests,1);assert.equal(screen,'different');
});

test('visibility revalidation can bypass the short session cache',async t=>{
 const originalFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>({status:200,ok:true,json:async()=>({authenticated:true,user:{id:`member-${++calls}`,role:'member'}})});t.after(()=>{globalThis.fetch=originalFetch;});
 const auth=createAuthService(),first=await auth.session({fresh:true}),cached=await auth.session(),fresh=await auth.session({fresh:true});
 assert.equal(first.user.id,cached.user.id);assert.notEqual(fresh.user.id,cached.user.id);assert.equal(calls,2);
});

test('retrying the current comparison or detail requests fresh data without adding history',()=>{
 for(const path of ['/compare?ids=a%2Cb&run=1','/person/a','/now']){
  const url=new URL(path,'https://example.test'),location={pathname:url.pathname,search:url.search,hash:''};let pushes=0;const calls=[];
  const window={location,history:{state:null,replaceState(state){this.state=state;},pushState(){pushes++;}},scrollX:0,scrollY:0,addEventListener(){}};
  const navigation=createNavigation({window,readSnapshot:()=>'',onRoute:(route,options)=>calls.push({route,options})});navigation.start();navigation.navigate(path);
  assert.equal(pushes,0);assert.equal(calls.length,path==='/now'?0:1,'protected same-route retry must request a render');
  if(calls.length){assert.equal(calls[0].options.freshSession,true);assert.equal(calls[0].options.preserveScroll,true);}
 }
});
