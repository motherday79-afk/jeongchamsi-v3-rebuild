import {snapshotDocument,removePresentation,safeUrl,interpret} from './core.mjs';

const PREFIX='jcs-touch-check-r1:', REPORT=PREFIX+'report', SNAPSHOT=PREFIX+'snapshot';
const names={base:'A · 원래 화면',static:'B · 클릭 기능 제외',plain:'C · 스타일 제외'};
const landing=document.documentElement.dataset.touchCheck==='landing';
const staticPage=document.documentElement.dataset.touchCheck==='static';
let mode=staticPage?'static':new URLSearchParams(location.search).get('jcs_touch_check');
let host,shadow,ready=false,attempt;
let data;
try{data=JSON.parse(sessionStorage.getItem(REPORT)||'null');}catch{}
if(!data||data.tool!=='JCS TOUCH CHECK R1')data={tool:'JCS TOUCH CHECK R1',results:{},attempts:[]};
const store=()=>{try{sessionStorage.setItem(REPORT,JSON.stringify(data));return true;}catch{return false;}};
const redact=s=>String(s||'').replace(/[\w.+%-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]').slice(0,1000);
const describe=e=>e?.nodeType===1?e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.getAttribute('class')?'.'+e.getAttribute('class').trim().replace(/\s+/g,'.'):''):null;
function record(kind,detail={}){
 if(!attempt)return;
 attempt.events.push({time:new Date().toISOString(),kind,...detail});
 if(attempt.events.length>70)attempt.events.shift();
 store();
}
function textReport(){
 const summary=Object.keys(names).map(k=>names[k]+': '+({yes:'메일 앱 열림',no:'안 열림'}[data.results[k]]||'미확인')).join('\n');
 return data.tool+'\n'+summary+'\n'+interpret(data.results)+'\n\n'+JSON.stringify(data,null,2);
}
function fillLanding(){
 for(const key of Object.keys(names)){
  document.querySelector('[data-result="'+key+'"]').textContent=({yes:'메일 앱 열림',no:'안 열림'}[data.results[key]]||'미확인');
 }
 document.querySelector('[data-interpret]').textContent=interpret(data.results);
 document.querySelector('[data-report]').value=textReport();
 document.querySelector('[data-copy]').addEventListener('click',async()=>{
  const field=document.querySelector('[data-report]');
  try{await navigator.clipboard.writeText(field.value);document.querySelector('[data-copy-state]').textContent='복사했습니다. 이 대화에 붙여넣어 주세요.';}
  catch{field.closest('details').open=true;field.focus();field.select();document.querySelector('[data-copy-state]').textContent='아래 내용을 길게 눌러 복사해 주세요.';}
 });
 document.querySelector('[data-reset]').addEventListener('click',()=>{
  if(!confirm('이 진단의 결과만 초기화할까요?'))return;
  sessionStorage.removeItem(REPORT);sessionStorage.removeItem(SNAPSHOT);location.reload();
 });
}
function setStatus(message){if(shadow)shadow.querySelector('[data-status]').textContent=message;}
function mountBar(){
 host=document.createElement('aside');host.setAttribute('data-jcs-check-host','');
 host.style.cssText='position:fixed!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;max-width:560px!important;margin:auto!important;';
 shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>:host{font:13px/1.45 system-ui,sans-serif;color:#222}*{box-sizing:border-box}.box{pointer-events:auto;border:1px solid #b7a7c8;border-radius:12px;background:#fff;box-shadow:0 3px 18px #0002;padding:10px 12px}.top,.buttons{display:flex;align-items:center;gap:8px}.top{justify-content:space-between}.top b{font-size:13px}a{color:#682ba2;text-decoration:underline}p{margin:5px 0 8px;color:#605767;font-size:12px}.buttons button{flex:1;border:1px solid #d7cde2;border-radius:7px;background:#f6f2fa;color:#34263f;padding:9px 4px;font-size:12px;font-weight:700}button:disabled{opacity:.4}.buttons button[data-answer=yes]{background:#612c91;color:white}</style><div class="box"><div class="top"><b></b><a href="/jcs-touch-check/index.html">결과 목록</a></div><p data-status>정참시 화면을 불러오는 중입니다…</p><div class="buttons"><button type="button" data-find disabled>제목 찾기</button><button type="button" data-answer="yes" disabled>메일 앱 열림</button><button type="button" data-answer="no" disabled>안 열림</button></div></div>`;
 shadow.querySelector('b').textContent=names[mode]||'진단 준비';
 document.body.append(host);
 shadow.querySelector('[data-find]').addEventListener('click',()=>document.querySelector('h2.itsme-signature-title')?.scrollIntoView({block:'center',behavior:'instant'}));
 for(const button of shadow.querySelectorAll('[data-answer]'))button.addEventListener('click',()=>{
  if(!ready)return;
  data.results[mode]=button.dataset.answer;
  attempt.outcome=button.dataset.answer;record('user-result',{value:button.dataset.answer});
  if(!store()){setStatus('결과 저장이 차단됐습니다. A/B/C와 열림 여부를 직접 적어 보내 주세요.');return;}
  location.href='/jcs-touch-check/index.html';
 });
}
function begin(){
 if(mode==='base'){
  data.results={};
  try{sessionStorage.removeItem(SNAPSHOT);}catch{}
 }
 attempt={mode,started:new Date().toISOString(),ua:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},path:location.pathname,events:[]};
 data.attempts.push(attempt);if(data.attempts.length>9)data.attempts.shift();store();
 for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>{
  if(e.composedPath().includes(host))return;
  const target=e.target?.nodeType===1?e.target:e.target?.parentElement;
  record(type,{target:describe(target),pointer:e.pointerType||'',x:Math.round(e.clientX||0),y:Math.round(e.clientY||0),isItsmeTitle:!!target?.closest('h2.itsme-signature-title'),link:target?.closest('a[href]')?safeUrl(target.closest('a[href]').getAttribute('href'),location.href):null,route:target?.closest('[data-layout-route]')?.getAttribute('data-layout-route')||null,overlap:document.elementsFromPoint(e.clientX||0,e.clientY||0).slice(0,6).map(describe)});
 },{capture:true,passive:true});
 window.addEventListener('pagehide',()=>record('pagehide'),{passive:true});
 document.addEventListener('visibilitychange',()=>record('visibility',{state:document.visibilityState}),{passive:true});
 window.addEventListener('error',e=>record('error',{message:redact(e.message),file:safeUrl(e.filename,location.href),line:e.lineno}),{passive:true});
 // Observe invocation without cancelling, redirecting or changing arguments.
 for(const [owner,key] of [[window,'open'],[navigator,'share']]){
  const original=owner[key];if(typeof original!=='function')continue;
  try{owner[key]=function(...args){record('external-api',{api:key,url:args[0]?.url?safeUrl(args[0].url,location.href):typeof args[0]==='string'?safeUrl(args[0],location.href):null,stack:redact(new Error().stack)});return Reflect.apply(original,this,args);};}catch{}
 }
}
function finish(){
 if(ready||!document.querySelector('h2.itsme-signature-title'))return;
 if(mode==='base'){
  try{sessionStorage.setItem(SNAPSHOT,JSON.stringify({saved:new Date().toISOString(),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},html:snapshotDocument(document)}));}
  catch{setStatus('정적 화면을 저장하지 못했습니다. A 결과만 알려 주세요.');record('snapshot-failed');}
 }
 if(mode==='plain'){
  removePresentation(document);
  let scheduled=false;
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;removePresentation(document);});});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','rel']});
 }
 attempt.entryScripts=[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean);
 attempt.nativeSchemes=[...document.querySelectorAll('a[href]')].map(e=>e.getAttribute('href')).filter(h=>/^(mailto:|intent:|tel:)/i.test(h)).map(h=>safeUrl(h,location.href));
 record('ready');ready=true;
 for(const b of shadow.querySelectorAll('button'))b.disabled=false;
 setStatus('‘제목 찾기’ → ‘나는 이렇게 제안합니다’를 누른 뒤 결과를 기록하세요.');
}
async function restoreStatic(){
 let saved;
 try{saved=JSON.parse(sessionStorage.getItem(SNAPSHOT)||'null');}catch{}
 if(!saved?.html){mountBar();setStatus('A · 원래 화면을 먼저 열어 주세요. 저장된 화면이 없습니다.');return;}
 const parsed=new DOMParser().parseFromString(saved.html,'text/html');
 document.replaceChild(document.importNode(parsed.documentElement,true),document.documentElement);
 history.replaceState(null,'','/?jcs_touch_check=static');
 mountBar();begin();attempt.snapshotSaved=saved.saved;attempt.snapshotViewport=saved.viewport;
 finish();
 if(saved.viewport.width!==innerWidth)setStatus('A와 화면 너비가 다릅니다. A와 같은 펼침 상태로 맞춘 뒤 제목을 눌러 주세요.');
}
if(landing){fillLanding();}
else if(staticPage){restoreStatic().catch(()=>{if(!host)mountBar();setStatus('저장된 화면을 열지 못했습니다. 결과 목록에서 A부터 다시 열어 주세요.');});}
else if(['base','plain'].includes(mode)){
 const start=()=>{mountBar();begin();const observer=new MutationObserver(()=>{if(document.querySelector('h2.itsme-signature-title')){observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(finish));}});observer.observe(document.body,{subtree:true,childList:true});if(document.querySelector('h2.itsme-signature-title')){observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(finish));}setTimeout(()=>{if(!ready)setStatus('화면 준비가 지연되고 있습니다. 결과 목록으로 돌아가 A부터 다시 열어 주세요.');},45000);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
