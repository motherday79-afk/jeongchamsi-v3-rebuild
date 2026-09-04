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
export function setupNowCarousel(root=document){
  const box=root.querySelector('[data-now-rank-carousel]');if(!box)return;
  const pages=[...box.querySelectorAll('[data-now-rank-page]')];let page=0;
  const show=n=>{page=(n+pages.length)%pages.length;pages.forEach((x,i)=>x.hidden=i!==page);box.dataset.page=String(page);const status=box.querySelector('[data-now-rank-status]');if(status)status.textContent=`${page+1} / ${pages.length}`;};
  box.querySelector('[data-now-rank-prev]')?.addEventListener('click',()=>show(page-1));
  box.querySelector('[data-now-rank-next]')?.addEventListener('click',()=>show(page+1));
}
export function setupLauncherExpansion(root=document){
  const toggle=root.querySelector('[data-launcher-toggle]'),panel=root.querySelector('[data-launcher-panel]');if(!toggle||!panel)return;
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));const cue=toggle.querySelector('span');if(cue)cue.textContent=open?'−':'＋';};
  toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setOpen(false);toggle.focus();}});
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
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export async function loadPoliticianSuggestions(query,search){const term=String(query||'').trim();if(!term||typeof search!=='function')return [];const response=await search(term,25);return response?.ok===false||!Array.isArray(response?.items)?[]:response.items.slice(0,25);}
export function politicianSuggestionMarkup(items=[]){return items.map(item=>{const src=String(item?.photo?.localPath||''),initial=esc(String(item?.name||'?').slice(0,1)),avatar=src?`<span class="politician-autocomplete-avatar has-photo" data-politician-avatar style="--photo-position:${esc(item.photo?.focus||'50% 28%')}"><span class="politician-photo-initial">${initial}</span><img data-politician-photo src="${esc(src)}" alt=""></span>`:`<span class="politician-autocomplete-avatar is-empty" data-politician-avatar><span class="politician-photo-initial">${initial}</span></span>`;return `<button type="button" data-politician-suggestion="${esc(item.id)}">${avatar}<span><b>${esc(item.name)}</b><small>${esc([item.party,item.jurisdiction,item.office||item.roleLabel].filter(Boolean).join(' · '))}</small></span><em>선택</em></button>`;}).join('');}
function compareSelectionRoute(base,id){const [path,raw='']=String(base||'/compare').split('?'),params=new URLSearchParams(raw),ids=String(params.get('ids')||'').split(',').filter(Boolean);if(!ids.includes(id))ids.push(id);params.set('ids',ids.join(','));params.delete('q');params.delete('slot');params.delete('run');return `${path}?${params.toString()}`;}
export function setupPoliticianAutocomplete(root=document,search=null){
  if(typeof search!=='function')return;
  for(const input of root.querySelectorAll('[data-politician-autocomplete]')){
    if(input.dataset.autocompleteReady==='true')continue;input.dataset.autocompleteReady='true';
    const results=document.createElement('div');results.className='politician-autocomplete-results';results.hidden=true;input.insertAdjacentElement('afterend',results);let rows=[],active=-1,sequence=0;
    const close=()=>{results.hidden=true;active=-1;};
    const select=item=>{if(!item)return;const mode=input.dataset.politicianSelectMode||'route';if(mode==='compare'){window.dispatchEvent(new CustomEvent('jcs:layout-route',{detail:{route:compareSelectionRoute(input.dataset.politicianBase,item.id)}}));return;}input.value=item.name||'';const target=input.dataset.politicianTarget?input.closest('form')?.querySelector(input.dataset.politicianTarget):null;if(target)target.value=item.id||'';close();input.dispatchEvent(new Event('change',{bubbles:true}));};
    input.addEventListener('input',async()=>{const current=++sequence,term=input.value.trim();if(!term){rows=[];results.innerHTML='';close();return;}rows=await loadPoliticianSuggestions(term,search);if(current!==sequence)return;results.innerHTML=rows.length?politicianSuggestionMarkup(rows):'<p>검색 결과가 없습니다.</p>';results.hidden=false;setupPoliticianPhotoFallback(results);});
    input.addEventListener('keydown',event=>{if(results.hidden||!rows.length)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();active=(active+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;[...results.querySelectorAll('button')].forEach((button,index)=>button.classList.toggle('is-active',index===active));}else if(event.key==='Enter'&&active>=0){event.preventDefault();select(rows[active]);}else if(event.key==='Escape')close();});
    results.addEventListener('click',event=>{const button=event.target.closest('[data-politician-suggestion]');if(button)select(rows.find(item=>String(item.id)===button.dataset.politicianSuggestion));});
  }
}
export function setupLayoutInteractions(root=document,options={}){setupDrawer(root);setupLauncherExpansion(root);setupNowCarousel(root);setupLayoutNavigation(root);setupCompareSearch(root);setupPoliticianPhotoFallback(root);setupPoliticianAutocomplete(root,options.politicianSearch);}
