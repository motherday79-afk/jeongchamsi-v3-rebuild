// Opt-in, local-only observation. Observers never cancel a page event, open
// a URL, wrap browser APIs or send a report. The explicit probe below can
// temporarily use the site's existing copy exception, then restore it.
export function diagnosticDestination(raw,base){
  if(!raw)return '';
  try{
    const url=new URL(String(raw),base);
    if(!['http:','https:'].includes(url.protocol))return `${url.protocol}[주소 생략]`;
    if(url.origin!==new URL(base).origin)return url.origin;
    return url.pathname.slice(0,180);
  }catch{return '[주소 해석 불가]';}
}
const elementOf=node=>node?.nodeType===3?node.parentElement:node;
function describeElement(node,base){
  const el=elementOf(node),anchor=el?.closest?.('a[href],area[href]'),route=el?.closest?.('[data-layout-route]');
  return {
    element:el?.tagName?el.tagName.toLowerCase()+[...(el.classList||[])].slice(0,2).map(name=>'.'+name.slice(0,60)).join(''):'없음',
    link:diagnosticDestination(anchor?.getAttribute('href'),base),
    route:diagnosticDestination(route?.getAttribute('data-layout-route'),base)
  };
}
export function observeTapEvents(doc,win,onRecord){
  let active=true,lastPoint=null,sequence=0;
  const bindings=[],base=doc.baseURI||win.location.href;
  const page=()=>diagnosticDestination(win.location.href,base);
  const emit=row=>{if(!active)return;try{onRecord({...row,page:page()});}catch{/* Diagnostics must not break the page. */}};
  const bind=(target,type,handler)=>{const options={capture:true,passive:true};target.addEventListener(type,handler,options);bindings.push([target,type,handler,options]);};
  const observe=event=>{
    try{
      const target=elementOf(event.target);
      if(target?.closest?.('[data-jcs-tap-diagnostics]'))return;
      const id=++sequence;
      if(Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)&&(event.clientX||event.clientY))lastPoint={x:Math.round(event.clientX),y:Math.round(event.clientY)};
      const hitStack=lastPoint?[...(doc.elementsFromPoint?.(lastPoint.x,lastPoint.y)||[])].slice(0,6).map(el=>describeElement(el,base)):[];
      emit({id,type:event.type,...describeElement(target,base),point:lastPoint,pointer:event.pointerType||'',hitStack,...(event.type==='toggle'?{open:!!target.open}:{})});
      // A new task observes the completed event dispatch, including handlers
      // that run later during bubbling and the native details toggle.
      if(event.type==='click'||event.type==='contextmenu')setTimeout(()=>emit({id,type:event.type+'-end',prevented:event.defaultPrevented}),0);
    }catch{/* Only collect evidence that this browser can expose. */}
  };
  for(const type of ['pointerdown','pointerup','pointercancel','click','contextmenu','toggle'])bind(doc,type,observe);
  bind(win,'jcs:layout-route',event=>emit({type:'route',route:diagnosticDestination(event.detail?.route,base)}));
  for(const type of ['popstate','hashchange','pageshow','pagehide'])bind(win,type,()=>emit({type}));
  return ()=>{active=false;for(const [target,type,handler,options] of bindings)target.removeEventListener(type,handler,options);};
}

export function formatTapDiagnosticRecord(row){
    const lines=[`${row.id?'#'+row.id+' ':''}${row.type} · ${row.page}${row.condition?' · '+row.condition:''}`];
    if(row.element)lines.push(`대상 ${row.element}${row.pointer?' ('+row.pointer+')':''}`);
    if(['click','pointerdown','pointerup','pointercancel','contextmenu'].includes(row.type)){
      lines.push(`링크 ${row.link||'없음'} | 경로 ${row.route||'없음'}`);
      const hits=row.hitStack?.filter((hit,i,all)=>all.findIndex(other=>other.element===hit.element&&other.link===hit.link&&other.route===hit.route)===i).slice(0,4)||[];
      for(const hit of hits)lines.push(`겹침 ${hit.element} ${hit.link||hit.route||''}`);
    }
    if(row.type==='route')lines.push(`요청 ${row.route||'없음'}`);
    if(row.type==='click-end'||row.type==='contextmenu-end')lines.push(`기본 동작 취소 ${row.prevented?'예':'아니오'}`);
    if(row.type==='toggle')lines.push(`펼침 ${row.open?'예':'아니오'}`);
    return lines.join('\n');
  }

const panels=new WeakMap();
export function createCopyRestrictionProbe(app){
  const previous=app?.getAttribute('data-allow-copy')??null;let enabled=false;
  const restore=()=>{if(!app||!enabled)return;if(previous===null)app.removeAttribute('data-allow-copy');else app.setAttribute('data-allow-copy',previous);enabled=false;};
  return {set:value=>{if(!app)return false;if(value){app.setAttribute('data-allow-copy','');enabled=true;}else restore();return true;},restore,enabled:()=>enabled};
}
export function setupTapDiagnostics(doc=document,win=window){
  if(new URLSearchParams(win.location.search).get('jcs_tap_debug')!=='1')return null;
  if(panels.has(doc))return panels.get(doc);
  const host=doc.createElement('aside');host.setAttribute('data-jcs-tap-diagnostics','');host.setAttribute('data-allow-copy','');
  // Shadow styling prevents existing global button/typography rules from
  // changing this temporary panel or its hit area.
  host.style.cssText='position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:2147483647;width:min(380px,calc(100vw - 16px));pointer-events:none';
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>
    :host{font-family:system-ui,sans-serif;color:#18212a;font-size:13px;line-height:1.5}
    *{box-sizing:border-box}button{min-height:36px;padding:7px 11px;border:1px solid #bbb;border-radius:7px;background:white;color:#18212a;font:inherit;cursor:pointer}
    .bar{display:flex;gap:6px;align-items:center;pointer-events:none}.bar button{pointer-events:auto;box-shadow:0 2px 8px #0002}.count{font-variant-numeric:tabular-nums}
    .panel{margin-bottom:6px;padding:12px;border:1px solid #b9bac2;border-radius:10px;background:#fff;box-shadow:0 5px 24px #0003;pointer-events:auto}
    [hidden]{display:none!important}h2{font-size:15px;margin:0 0 5px}p{margin:4px 0 9px;font-size:12px;color:#4a515b}
    pre{font:11px/1.55 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:36vh;overflow:auto;margin:8px 0;-webkit-user-select:text;user-select:text}
    .actions{display:flex;flex-wrap:wrap;gap:6px}.notice{font-size:11px;margin-top:6px;color:#505762}
    [data-probe]{width:100%;text-align:left;margin-bottom:5px;background:#f4f0fb}[data-probe][aria-pressed=true]{border-color:#753bbd}
  </style><section class="panel" hidden><h2>정참시 터치 진단 R2</h2><p>원래 설정으로 한 번 확인한 뒤, 아래 시험을 켜고 같은 버튼을 다시 눌러 주세요.</p><button type="button" data-probe aria-pressed="false">복사 제한 제외 테스트 시작</button><pre data-allow-copy></pre><div class="actions"><button type="button" data-copy>결과 복사</button><button type="button" data-stop>진단 종료</button></div><div class="notice">시험은 현재 페이지에만 적용됩니다. 종료하면 원래 설정으로 돌아갑니다.</div></section><div class="bar"><button type="button" data-toggle aria-expanded="false">터치 진단 R2</button></div>`;
  const panel=shadow.querySelector('.panel'),output=shadow.querySelector('pre'),toggle=shadow.querySelector('[data-toggle]'),copy=shadow.querySelector('[data-copy]'),probeButton=shadow.querySelector('[data-probe]');
  const probe=createCopyRestrictionProbe(doc.getElementById('app'));
  const rows=[],browser=(win.navigator?.userAgent||'').match(/(?:SamsungBrowser|Chrome|Version|Firefox)\/[\d.]+/g)?.join(' ')||'브라우저 정보 없음';
  const heading=`JCS TAP 20260913 R2\n${browser}\n화면 ${win.innerWidth}×${win.innerHeight}`;

  let total=0;
  const condition=()=>probe.enabled()?'복사 제한 제외':'원래 설정';
  const repaint=()=>{output.textContent=heading+'\n현재 '+condition()+' · 기록 '+total+'\n\n'+(rows.length?[...rows].reverse().map(formatTapDiagnosticRecord).join('\n\n'):'아직 클릭 기록이 없습니다. 문제 버튼을 눌러 주세요.');};
  // Record in memory only. Do not mutate the DOM during a real page touch;
  // render the evidence when the user explicitly opens/copies the panel.
  const stop=observeTapEvents(doc,win,row=>{total++;rows.push({...row,condition:condition()});if(rows.length>20)rows.shift();});
  const close=()=>{stop();probe.restore();host.remove();panels.delete(doc);};
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));repaint();});
  shadow.querySelector('[data-stop]').addEventListener('click',close);
  probeButton.addEventListener('click',()=>{if(!probe.set(!probe.enabled())){probeButton.textContent='페이지를 불러온 뒤 다시 시도해 주세요';return;}probeButton.setAttribute('aria-pressed',String(probe.enabled()));probeButton.textContent=probe.enabled()?'원래 복사 제한으로 복원':'복사 제한 제외 테스트 시작';repaint();panel.hidden=true;toggle.setAttribute('aria-expanded','false');});
  copy.addEventListener('click',async()=>{repaint();try{await win.navigator.clipboard.writeText(output.textContent);copy.textContent='복사 완료';}catch{copy.textContent='화면을 캡처해 주세요';}});
  doc.body.append(host);repaint();panels.set(doc,host);return host;
}
