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
export function setupLayoutNavigation(root=document){
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
export function setupLayoutInteractions(root=document){setupDrawer(root);setupNowCarousel(root);setupLayoutNavigation(root);setupCompareSearch(root);}
