import {createSelectionProbe,nextCondition} from './selection-core.mjs';

const KEY='jcs-selection-check-r2:report';
const report={tool:'JCS SELECTION CHECK R2',started:new Date().toISOString(),ua:navigator.userAgent,results:{},conditions:[],events:[]};
let host,shadow,probe,mode='preparing',ready=false,observer,timer;
const title=()=>document.querySelector('h2.itsme-signature-title');
const describe=e=>e?.nodeType===1?e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.getAttribute('class')?'.'+e.getAttribute('class').trim().replace(/\s+/g,'.'):''):null;
const viewport=()=>{const v=globalThis.visualViewport;return {width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visual:v?{width:v.width,height:v.height,scale:v.scale,offsetTop:v.offsetTop,offsetLeft:v.offsetLeft}:null};};
function safeUrl(value){if(!value)return null;try{const u=new URL(value,location.href);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:u.protocol+'[redacted]';}catch{return '[invalid]';}}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify(report));return true;}catch{return false;}}
function record(kind,detail={}){report.events.push({time:new Date().toISOString(),mode,kind,...detail});if(report.events.length>100)report.events.shift();save();}
function rect(e){if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}
function styles(e){if(!e)return null;const s=getComputedStyle(e);return Object.fromEntries(['user-select','-webkit-user-select','-webkit-touch-callout','pointer-events','touch-action','position','transform','zoom'].map(k=>[k,s.getPropertyValue(k)]));}
function caret(x,y){
 try{
  const p=document.caretPositionFromPoint?.(x,y),r=p?null:document.caretRangeFromPoint?.(x,y),n=p?.offsetNode||r?.startContainer;
  const e=n?.nodeType===1?n:n?.parentElement;
  return n?{element:describe(e),inTitle:!!e?.closest('h2.itsme-signature-title'),inFooter:!!e?.closest('footer,.site-footer'),offset:p?.offset??r?.startOffset}:null;
 }catch{return null;}
}
function summary(){
 if(report.results.selection==='yes')return '선택 제한만 해제해도 메일 앱이 열렸습니다. 이 설정만으로 원인이 설명되지는 않습니다.';
 if(report.results.original==='yes')return '선택 제한 해제 시 안 열림 / 같은 화면의 원래 설정에서 다시 열림. 본문 선택 제한과 증상의 관련성이 확인됐습니다. 최종 수정 후 재확인이 필요합니다.';
 if(report.results.original==='no')return '이번에는 원래 설정에서도 열리지 않았습니다. 이 결과만으로 선택 제한이 원인이라고 확정할 수 없습니다.';
 return '확인 중입니다.';
}
function textReport(){return report.tool+'\n'+summary()+'\n\n'+JSON.stringify(report,null,2);}
function setDisabled(value){for(const b of shadow.querySelectorAll('[data-answer],[data-find]'))b.disabled=value;}
function finish(){
 ready=false;mode='done';probe.restore();setDisabled(true);
 host.setAttribute('data-allow-copy','');
 shadow.querySelector('[data-phase]').textContent='확인 결과';
 shadow.querySelector('[data-status]').textContent=summary();
 shadow.querySelector('[data-copy]').hidden=false;
 shadow.querySelector('[data-report]').value=textReport();
}
function activate(next){
 ready=false;setDisabled(true);mode=next;
 if(mode==='selection')probe.enable();else probe.restore();
 shadow.querySelector('[data-phase]').textContent=mode==='selection'?'1 · 선택 제한만 해제':'2 · 원래 설정';
 shadow.querySelector('[data-status]').textContent=mode==='selection'?'디자인은 그대로입니다. 제목 찾기 → 제목을 짧게 5번 눌러 주세요.':'원래 설정으로 돌렸습니다. 같은 제목을 다시 짧게 눌러 주세요.';
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!title()){shadow.querySelector('[data-status]').textContent='메인 화면이 바뀌었습니다. 이 진단 주소를 다시 열어 주세요.';return;}
  title().scrollIntoView({block:'center',behavior:'instant'});
  requestAnimationFrame(()=>{
   const ancestors=[];for(let e=title();e;e=e.parentElement)ancestors.push({element:describe(e),...styles(e)});
   report.conditions.push({mode,viewport:viewport(),titleRect:rect(title()),ancestors,footerEmails:[...document.querySelectorAll('.footer-email')].map(e=>({rect:rect(e),style:styles(e)})),nativeSchemes:[...document.querySelectorAll('a[href]')].filter(a=>/^(mailto:|tel:|intent:)/i.test(a.getAttribute('href'))).map(a=>safeUrl(a.getAttribute('href')))});
   record('ready');ready=true;setDisabled(false);
  });
 }));
}
function mount(){
 host=document.createElement('aside');host.setAttribute('data-jcs-selection-host','');
 host.style.cssText='position:fixed!important;left:8px!important;right:8px!important;bottom:8px!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;max-width:560px!important;margin:auto!important;';
 shadow=host.attachShadow({mode:'open'});
 shadow.innerHTML=`<style>:host{font:13px/1.4 system-ui,sans-serif;color:#25222b}*{box-sizing:border-box}.box{pointer-events:auto;background:#fff;border:1px solid #c1afcf;border-radius:12px;padding:10px 12px;box-shadow:0 3px 15px #0002;-webkit-user-select:none;user-select:none}b{font-size:14px}p{margin:6px 0 9px;color:#625a68}nav{display:flex;gap:6px}button{font:700 12px/1.3 system-ui,sans-serif;padding:10px 7px;border:1px solid #d9cce4;border-radius:8px;color:#49275f;background:#f5effa;flex:1}button:disabled{opacity:.4}button[data-answer=yes]{background:#66318e;color:white}[hidden]{display:none!important}details{margin-top:8px}textarea{width:100%;height:130px;font:11px/1.5 monospace;-webkit-user-select:text;user-select:text}a{color:#653493}</style><section class="box"><b data-phase>선택 제한 확인 R2</b><p data-status>정참시 화면을 불러오는 중입니다…</p><nav><button type="button" data-find disabled>제목 찾기</button><button type="button" data-answer="yes" disabled>메일 앱 열림</button><button type="button" data-answer="no" disabled>안 열림</button></nav><button type="button" data-copy hidden>결과 복사</button><details hidden><summary>결과 직접 복사</summary><textarea readonly aria-label="진단 결과"></textarea></details></section>`;
 shadow.querySelector('textarea').setAttribute('data-report','');
 document.body.append(host);
 shadow.querySelector('[data-find]').addEventListener('click',()=>title()?.scrollIntoView({block:'center',behavior:'instant'}));
 for(const button of shadow.querySelectorAll('[data-answer]'))button.addEventListener('click',()=>{
  if(!ready)return;ready=false;
  report.results[mode]=button.dataset.answer;record('user-result',{value:button.dataset.answer,viewport:viewport()});
  const next=nextCondition(report.results);if(next==='done')finish();else activate(next);
 });
 shadow.querySelector('[data-copy]').addEventListener('click',async()=>{
  const value=textReport();shadow.querySelector('[data-report]').value=value;
  try{await navigator.clipboard.writeText(value);shadow.querySelector('[data-copy]').textContent='복사 완료 · 대화에 붙여넣기';}
  catch{const details=shadow.querySelector('details');details.hidden=false;details.open=true;shadow.querySelector('[data-report]').focus();shadow.querySelector('[data-report]').select();}
 });
}
function bind(){
 for(const type of ['pointerdown','pointerup','pointercancel','click','contextmenu'])document.addEventListener(type,e=>{
  if(!ready||e.composedPath().includes(host))return;
  const target=e.target?.nodeType===1?e.target:e.target?.parentElement;
  const x=Math.round(e.clientX||0),y=Math.round(e.clientY||0),isTitle=!!target?.closest('h2.itsme-signature-title');
  record(type,{target:describe(target),pointer:e.pointerType||'',isTitle,x,y,link:safeUrl(target?.closest('a[href]')?.getAttribute('href')),viewport:viewport(),overlap:document.elementsFromPoint(x,y).slice(0,6).map(describe),...(isTitle?{caret:caret(x,y),titleStyle:styles(title())}:{})});
 },{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>record('visibility',{state:document.visibilityState}),{passive:true});
 window.addEventListener('pagehide',()=>record('pagehide'),{passive:true});
}
function start(){
 mount();bind();
 const run=()=>{if(!title()||probe)return;observer?.disconnect();clearTimeout(timer);probe=createSelectionProbe(document);activate('selection');};
 observer=new MutationObserver(run);observer.observe(document.body,{childList:true,subtree:true});run();
 timer=setTimeout(()=>{if(!probe)shadow.querySelector('[data-status]').textContent='메인 화면 준비가 지연됩니다. 진단 주소를 다시 열어 주세요.';},45000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
