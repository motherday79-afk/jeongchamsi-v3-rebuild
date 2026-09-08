import { renderPrescriptionReport } from '../views/prescription-visuals.js?v=0.0.31.44';
import { refreshFontScale, setupFontScaleControl } from './font-scale.js?v=0.0.31.44';

export function setupDrawer(root=document){
  const drawer=root.querySelector('[data-drawer]');
  const backdrop=root.querySelector('.drawer-backdrop');
  if(!drawer||!backdrop)return;
  const openButtons=[...root.querySelectorAll('[data-drawer-open]')];
  const open=()=>{drawer.hidden=false;backdrop.hidden=false;drawer.classList.add('is-open');backdrop.classList.add('is-open');drawer.setAttribute('aria-hidden','false');openButtons.forEach(el=>el.setAttribute('aria-expanded','true'));document.body.classList.add('drawer-open');};
  const close=()=>{drawer.classList.remove('is-open');backdrop.classList.remove('is-open');drawer.hidden=true;backdrop.hidden=true;drawer.setAttribute('aria-hidden','true');openButtons.forEach(el=>el.setAttribute('aria-expanded','false'));document.body.classList.remove('drawer-open');};
  openButtons.forEach(el=>el.addEventListener('click',open));
  root.querySelectorAll('[data-drawer-close]').forEach(el=>el.addEventListener('click',close));
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden)close();});
}
export function nowRankRangeLabel(page,pageSize,total){const count=Math.max(0,Number(total)||0),size=Math.max(1,Number(pageSize)||1),start=Math.min(count,Math.max(0,Number(page)||0)*size)+1,end=Math.min(count,start+size-1);return count?`${start}–${end} / ${count}`:'0 / 0';}
export function setupNowCarousel(root=document){
  const box=root.querySelector('[data-now-rank-carousel]');if(!box)return;
  for(const set of box.querySelectorAll('[data-now-rank-set]')){
    const pages=[...set.querySelectorAll('[data-now-rank-page]')];if(!pages.length)continue;let startIndex=0;
    const desktopSize=Number(set.dataset.pageSize)||10,total=Number(set.dataset.total)||pages.reduce((sum,row)=>sum+row.children.length,0),isMobile=()=>globalThis.matchMedia?.('(max-width:1024px), (hover:none) and (pointer:coarse)')?.matches===true;
    const paint=()=>{const mobile=isMobile();if(mobile){pages.forEach(page=>{page.hidden=false;[...page.children].forEach(card=>{card.hidden=false;});});set.dataset.page='0';return;}const containerIndex=Math.floor(startIndex/desktopSize);pages.forEach((page,index)=>{page.hidden=index!==containerIndex;[...page.children].forEach(card=>{card.hidden=false;});});set.dataset.page=String(containerIndex);const desktopStatus=set.querySelector('[data-now-rank-status="desktop"]');if(desktopStatus)desktopStatus.textContent=nowRankRangeLabel(containerIndex,desktopSize,total);};
    const move=direction=>{if(isMobile())return;const maxStart=Math.max(0,Math.ceil(total/desktopSize)-1)*desktopSize;startIndex=direction>0?(startIndex>=maxStart?0:startIndex+desktopSize):(startIndex<=0?maxStart:startIndex-desktopSize);paint();};
    set.querySelector('[data-now-rank-prev]')?.addEventListener('click',()=>move(-1));
    set.querySelector('[data-now-rank-next]')?.addEventListener('click',()=>move(1));
    globalThis.addEventListener?.('resize',paint);paint();
  }
}
export function serviceDockVisibleCount(width,total){
  const slots=Math.max(1,Math.floor((Math.max(0,Number(width)||0)-4+8)/84));
  return slots>=total?total:Math.max(0,slots-1);
}
export function setupLauncherExpansion(root=document){
  const toggle=root.querySelector('[data-launcher-toggle]'),panel=root.querySelector('[data-launcher-panel]');if(!toggle||!panel)return;
  const main=toggle.parentElement,extra=panel.querySelector('.service-dock-row-all');
  const primary=[...main.querySelectorAll('.service-dock-item')],additional=[...extra.querySelectorAll('.service-dock-item')],items=[...primary,...additional];
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'전체 서비스 접기':'전체 서비스 펼치기');const cue=toggle.querySelector('span');if(cue)cue.textContent=open?'−':'···';};
  const fit=()=>{
    const mobile=globalThis.matchMedia?.('(max-width:1024px), (hover:none) and (pointer:coarse)')?.matches===true;
    const count=mobile?primary.length:serviceDockVisibleCount(main.clientWidth,items.length);
    const focused=main.ownerDocument?.activeElement;
    items.forEach((item,index)=>{if(index<count)main.insertBefore(item,toggle);else extra.append(item);});
    toggle.hidden=count===items.length;
    if(toggle.hidden)setOpen(false);
    // Keep a focused shortcut visible when a resize sends it into the overflow panel.
    if(focused&&items.includes(focused)&&extra.contains(focused))setOpen(true);
  };
  toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setOpen(false);toggle.focus();}});
  let observer;
  if(globalThis.ResizeObserver){observer=new ResizeObserver(()=>{if(!main.isConnected){observer.disconnect();return;}fit();});observer.observe(main);}
  else globalThis.addEventListener?.('resize',fit);
  fit();
}
export function setupLayoutNavigation(root=document){
  root.querySelectorAll('a[data-layout-route]').forEach(link=>{const route=link.dataset.layoutRoute;if(route)link.setAttribute('href',route);});
  root.addEventListener('click',event=>{const target=event.target.closest('[data-layout-route]');if(!target)return;const route=target.dataset.layoutRoute;if(!route)return;event.preventDefault();window.dispatchEvent(new CustomEvent('jcs:layout-route',{detail:{route}}));});
  root.querySelector('[data-layout-search]')?.addEventListener('submit',event=>{event.preventDefault();const query=new FormData(event.currentTarget).get('q')||'';window.dispatchEvent(new CustomEvent('jcs:layout-search',{detail:{query:String(query)}}));});
}
export function compareSearchRoute(baseRoute='/compare',slot=1,query=''){
  const [pathname,raw='']=String(baseRoute||'/compare').split('?');
  const params=new URLSearchParams(raw),term=String(query||'').trim();
  params.delete('q');params.delete('slot');
  if(term){params.set('q',term);params.set('slot',String(Math.max(1,Number(slot)||1)));}
  const suffix=params.toString();
  return `${pathname||'/compare'}${suffix?`?${suffix}`:''}`;
}
export function setupCompareSearch(root=document){
  root.querySelectorAll('[data-compare-search-form]').forEach(form=>form.addEventListener('submit',event=>{
    event.preventDefault();
    const query=new FormData(form).get('q')||'';
    const route=compareSearchRoute(form.dataset.compareSearchBase||'/compare',form.dataset.compareSearchSlot||1,query);
    window.dispatchEvent(new CustomEvent('jcs:layout-route',{detail:{route}}));
  }));
}
export function setupPoliticianPhotoFallback(root=document){
  root.querySelectorAll('[data-politician-photo]').forEach(image=>image.addEventListener('error',()=>{
    const frame=image.closest('[data-politician-avatar]');
    if(frame){frame.classList.remove('has-photo');frame.classList.add('is-empty');}
    image.remove();
  },{once:true}));
}
const diagnosisInteractionRoots=new WeakSet();
const diagnosisPeriodLabels={'24H':'24시간 뉴스','7D':'7일 뉴스','30D':'30일 뉴스'};
function activateDiagnosisPeriod(origin,root){
  const button=origin?.closest?.('[data-jcs-period]');if(!button)return false;
  const group=button.closest?.('.jcs-periods')||origin.closest?.('.jcs-periods');if(!group)return false;
  const period=button.dataset.jcsPeriod||String(button.textContent||'').trim(),chapter=group.closest?.('[data-jcs-period-scope]')||group.closest?.('.jcs-chapter')||root;
  group.querySelectorAll('[data-jcs-period]').forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
  chapter.querySelectorAll('[data-jcs-period-value]').forEach(value=>{value.hidden=value.dataset.jcsPeriodValue!==period;});
  chapter.querySelectorAll('[data-jcs-period-panel]').forEach(panel=>{panel.hidden=panel.dataset.jcsPeriodPanel!==period;});
  const label=chapter.querySelector?.('[data-jcs-period-label]');if(label&&diagnosisPeriodLabels[period])label.textContent=diagnosisPeriodLabels[period];
  return true;
}
function toggleMediaList(origin){
  const toggle=origin?.closest?.('.jcs-media-toggle');if(!toggle)return false;
  const panel=toggle.closest?.('.jcs-media-period-panel')||toggle.closest?.('.jcs-open-section'),list=panel?.querySelector?.('.jcs-media-list');if(!list)return false;
  const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));list.hidden=expanded;toggle.innerHTML=expanded?'전체 목록 보기 <span>＋</span>':'전체 목록 접기 <span>−</span>';return true;
}
function toggleYouTubeVideos(origin){
  const button=origin?.closest?.('[data-jcs-youtube-more]');if(!button)return false;
  const root=button.closest('[data-jcs-youtube]'),expanded=button.getAttribute('aria-expanded')==='true';if(!root)return false;
  root.querySelectorAll('[data-jcs-youtube-extra]').forEach(row=>{row.hidden=expanded;});button.setAttribute('aria-expanded',String(!expanded));button.textContent=expanded?'최근 영상 더보기 ＋':'최근 영상 접기 −';return true;
}
export function togglePrescriptionDisclosure(origin){
  const button=origin?.closest?.('[data-prescription-disclosure]');if(!button)return false;
  const shell=button.closest?.('[data-prescription-shell]'),payload=shell?.querySelector?.('[data-prescription-payload]'),mount=shell?.querySelector?.('[data-prescription-mount]');if(!payload||!mount)return false;
  const expanded=button.getAttribute('aria-expanded')==='true';
  if(!expanded&&mount.dataset.prescriptionRendered!=='true'){
    try{const markup=renderPrescriptionReport(JSON.parse(payload.textContent||'{}'));if(!markup)return false;mount.innerHTML=markup;mount.dataset.prescriptionRendered='true';const documentRoot=shell?.ownerDocument||globalThis.document;if(documentRoot)refreshFontScale(documentRoot);}
    catch{return false;}
  }
  const open=!expanded;button.setAttribute('aria-expanded',String(open));button.textContent=open?'처방 전체 접기 −':'10개 처방 전체보기 ＋';mount.hidden=!open;return true;
}
export function setupDiagnosisInteractions(root=document){
  if(root&&typeof root.addEventListener==='function'){
    if(diagnosisInteractionRoots.has(root))return;
    diagnosisInteractionRoots.add(root);root.addEventListener('click',event=>{if(togglePrescriptionDisclosure(event.target))return;if(toggleYouTubeVideos(event.target))return;if(activateDiagnosisPeriod(event.target,root))return;toggleMediaList(event.target);});return;
  }
  root.querySelectorAll('.jcs-periods').forEach(group=>{
    if(group.dataset.jcsPeriodsReady==='true')return;
    group.dataset.jcsPeriodsReady='true';
    const buttons=[...group.querySelectorAll('button')],chapter=group.closest?.('.jcs-chapter')||root;
    buttons.forEach(button=>button.addEventListener('click',()=>{
      const period=button.dataset.jcsPeriod||String(button.textContent||'').trim();
      buttons.forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
      chapter.querySelectorAll('[data-jcs-period-value]').forEach(value=>{value.hidden=value.dataset.jcsPeriodValue!==period;});
      const label=chapter.querySelector?.('[data-jcs-period-label]');
      if(label&&diagnosisPeriodLabels[period])label.textContent=diagnosisPeriodLabels[period];
    }));
  });
  root.querySelectorAll('.jcs-media-toggle').forEach(toggle=>{
    if(toggle.dataset.jcsMediaToggleReady==='true')return;
    toggle.dataset.jcsMediaToggleReady='true';
    const list=(toggle.closest?.('.jcs-media-period-panel')||toggle.closest?.('.jcs-open-section'))?.querySelector?.('.jcs-media-list');
    if(!list)return;
    toggle.addEventListener('click',()=>{
      const expanded=toggle.getAttribute('aria-expanded')==='true';
      toggle.setAttribute('aria-expanded',String(!expanded));
      list.hidden=expanded;
      toggle.innerHTML=expanded?'전체 목록 보기 <span>＋</span>':'전체 목록 접기 <span>−</span>';
    });
  });
}
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export async function loadPoliticianSuggestions(query,search){const term=String(query||'').trim();if(!term||typeof search!=='function')return [];const response=await search(term,25);return response?.ok===false||!Array.isArray(response?.items)?[]:response.items.slice(0,25);}
export function politicianSuggestionMarkup(items=[]){return items.map(item=>{const src=String(item?.photo?.url||item?.photo?.localPath||''),initial=esc(String(item?.name||'?').slice(0,1)),avatar=src?`<span class="politician-autocomplete-avatar has-photo" data-politician-avatar style="--photo-position:${esc(item.photo?.focus||'50% 28%')}"><span class="politician-photo-initial">${initial}</span><img data-politician-photo src="${esc(src)}" alt=""></span>`:`<span class="politician-autocomplete-avatar is-empty" data-politician-avatar><span class="politician-photo-initial">${initial}</span></span>`;return `<button type="button" data-politician-suggestion="${esc(item.id)}">${avatar}<span><b>${esc(item.name)}</b><small>${esc([item.party,item.jurisdiction,item.office||item.roleLabel].filter(Boolean).join(' · '))}</small></span><em>선택</em></button>`;}).join('');}
function compareSelectionRoute(base,id){const [path,raw='']=String(base||'/compare').split('?'),params=new URLSearchParams(raw),ids=String(params.get('ids')||'').split(',').filter(Boolean);if(!ids.includes(id))ids.push(id);params.set('ids',ids.join(','));params.delete('q');params.delete('slot');params.delete('run');return `${path}?${params.toString()}`;}
export function politicianSuggestionSelection(mode,item,base=''){
  if(!item)return null;
  if(mode==='compare')return {route:compareSelectionRoute(base,item.id)};
  if(mode==='route')return {route:`/person/${encodeURIComponent(String(item.id||''))}`};
  if(mode==='admin'){const params=new URLSearchParams();params.set('tab','politicians');params.set('q',String(item.name||''));params.set('person',String(item.id||''));return {route:`/admin?${params.toString()}`};}
  return {value:String(item.name||''),targetId:String(item.id||'')};
}
export function setupPoliticianAutocomplete(root=document,search=null){
  if(typeof search!=='function')return;
  for(const input of root.querySelectorAll('[data-politician-autocomplete]')){
    if(input.dataset.autocompleteReady==='true')continue;input.dataset.autocompleteReady='true';
    const results=document.createElement('div');results.className='politician-autocomplete-results';results.hidden=true;input.insertAdjacentElement('afterend',results);let rows=[],active=-1,sequence=0;
    const close=()=>{results.hidden=true;active=-1;};
    const select=item=>{const selection=politicianSuggestionSelection(input.dataset.politicianSelectMode||'route',item,input.dataset.politicianBase);if(!selection)return;close();if(selection.route){window.dispatchEvent(new CustomEvent('jcs:layout-route',{detail:{route:selection.route}}));return;}input.value=selection.value;const target=input.dataset.politicianTarget?input.closest('form')?.querySelector(input.dataset.politicianTarget):null;if(target)target.value=selection.targetId;input.dispatchEvent(new Event('change',{bubbles:true}));};
    input.addEventListener('input',async()=>{const current=++sequence,term=input.value.trim();if(!term){rows=[];results.innerHTML='';close();return;}rows=await loadPoliticianSuggestions(term,search);if(current!==sequence)return;results.innerHTML=rows.length?politicianSuggestionMarkup(rows):'<p>검색 결과가 없습니다.</p>';results.hidden=false;setupPoliticianPhotoFallback(results);});
    input.addEventListener('keydown',event=>{if(results.hidden||!rows.length)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();active=(active+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;[...results.querySelectorAll('button')].forEach((button,index)=>button.classList.toggle('is-active',index===active));}else if(event.key==='Enter'&&active>=0){event.preventDefault();select(rows[active]);}else if(event.key==='Escape')close();});
    results.addEventListener('click',event=>{const button=event.target.closest('[data-politician-suggestion]');if(button)select(rows.find(item=>String(item.id)===button.dataset.politicianSuggestion));});
  }
}
export function setupLayoutInteractions(root=document,options={}){setupDrawer(root);setupLauncherExpansion(root);setupNowCarousel(root);setupLayoutNavigation(root);setupCompareSearch(root);setupPoliticianPhotoFallback(root);setupPoliticianAutocomplete(root,options.politicianSearch);setupDiagnosisInteractions(root);setupFontScaleControl(root);}
