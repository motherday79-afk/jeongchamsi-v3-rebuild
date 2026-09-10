const NAV_FLAG='__jcsNav';
const key=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const decodeRoute=raw=>{try{return decodeURIComponent(raw);}catch{return raw;}};
export const routeFromLocation=location=>{
  const hash=String(location?.hash||'');
  const raw=hash.startsWith('#/')?hash.slice(1):`${String(location?.pathname||'/')||'/'}${String(location?.search||'')}`;
  return decodeRoute(raw||'/');
};
const routePath=route=>{const value=String(route||'/');return value.startsWith('/')?value:`/${value}`;};
const ADMIN_TABS=new Set(['operations','members','politicians','pipeline','site','keywords','participation']);
export function adminRouteState(route='/admin'){
  const params=new URLSearchParams(String(route).split('?')[1]||''),tab=params.get('tab')||'operations';
  return {tab:ADMIN_TABS.has(tab)?tab:'operations',q:String(params.get('q')||''),person:String(params.get('person')||'')};
}
export function adminRouteWith(route='/admin',updates={}){
  const state={...adminRouteState(route),...updates},params=new URLSearchParams();
  if(state.tab&&state.tab!=='operations')params.set('tab',ADMIN_TABS.has(state.tab)?state.tab:'operations');
  if(String(state.q||'').trim())params.set('q',String(state.q).trim());
  if(String(state.person||'').trim())params.set('person',String(state.person).trim());
  const query=params.toString();return `/admin${query?`?${query}`:''}`;
}
export function shareableUrlForRoute(route,origin='https://www.jeongchamsi.com'){
  const url=new URL(routePath(route),origin);
  if(url.pathname==='/compare'){
    const ids=[...new Set(String(url.searchParams.get('ids')||'').split(',').filter(Boolean))].slice(0,2);
    url.search='';if(ids.length)url.searchParams.set('ids',ids.join(','));
  }
  return url.href;
}

export async function sharePost({domain,id,title='정참시 게시글'},capabilities=globalThis.navigator,origin=globalThis.location?.origin||'https://www.jeongchamsi.com'){
  if(!['community','itsme','columns','news'].includes(domain)||!String(id||''))throw new Error('SHARE_UNAVAILABLE');
  const url=shareableUrlForRoute(`/${domain==='columns'?'column':domain}/${encodeURIComponent(id)}`,origin);
  if(typeof capabilities?.share==='function'){
    try{await capabilities.share({title:String(title),url});return {status:'shared',url};}
    catch(error){if(error?.name==='AbortError')return {status:'cancelled',url};}
  }
  try{if(typeof capabilities?.clipboard?.writeText==='function'){await capabilities.clipboard.writeText(url);return {status:'copied',url};}}catch{}
  return {status:'manual',url};
}

export function createNavigation({window,readSnapshot,restoreSnapshot,rebind,onRoute}){
  const snapshots=new Map();
  const currentRoute=()=>routeFromLocation(window.location);
  const stateFor=(route,previous={})=>({...(previous||{}),[NAV_FLAG]:true,key:previous?.key||key(),route,x:Number(previous?.x||0),y:Number(previous?.y||0)});
  const state=()=>stateFor(currentRoute(),window.history.state?.[NAV_FLAG]?window.history.state:{});
  const record=()=>{
    const current={...state(),route:currentRoute(),x:Number(window.scrollX||0),y:Number(window.scrollY||0)};
    const markup=readSnapshot?.();if(markup)snapshots.set(current.key,{markup,route:current.route,x:current.x,y:current.y});
    window.history.replaceState(current,'',routePath(current.route));
    return current;
  };
  const cacheCurrent=()=>record();
  const handlePop=event=>{
    const current=stateFor(currentRoute(),event?.state?.[NAV_FLAG]?event.state:{});
    if(!event?.state?.[NAV_FLAG])window.history.replaceState(current,'',routePath(current.route));
    const cached=snapshots.get(current.key);
    if(cached){
      restoreSnapshot?.(cached.markup);rebind?.();
      (window.requestAnimationFrame||((fn)=>fn()))(()=>window.scrollTo(Number(cached.x||0),Number(cached.y||0)));
      return true;
    }
    onRoute?.(current.route,{restored:false,preserveScroll:true});
    return false;
  };
  const navigate=route=>{
    const target=String(route||'/').startsWith('/')?String(route||'/'):`/${route}`;
    if(target===currentRoute())return;
    record();
    const next=stateFor(target,{});
    window.history.pushState(next,'',target);
    onRoute?.(target,{restored:false,preserveScroll:false});
  };
  const start=()=>{window.history.scrollRestoration='manual';const current=state();window.history.replaceState(current,'',routePath(current.route));window.addEventListener('popstate',handlePop);return current;};
  return {start,navigate,record,cacheCurrent,handlePop,route:currentRoute};
}
