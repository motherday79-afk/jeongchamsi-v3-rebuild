export function setupDrawer(root=document){
  const drawer=root.querySelector('[data-drawer]');
  const backdrop=root.querySelector('.drawer-backdrop');
  if(!drawer||!backdrop)return;
  const open=()=>{drawer.hidden=false;backdrop.hidden=false;drawer.setAttribute('aria-hidden','false');};
  const close=()=>{drawer.hidden=true;backdrop.hidden=true;drawer.setAttribute('aria-hidden','true');};
  root.querySelectorAll('[data-drawer-open]').forEach(el=>el.addEventListener('click',open));
  root.querySelectorAll('[data-drawer-close]').forEach(el=>el.addEventListener('click',close));
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
export function setupLayoutInteractions(root=document){setupDrawer(root);setupNowCarousel(root);setupLayoutNavigation(root);}
