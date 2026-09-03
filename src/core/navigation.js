const NAV_FLAG='__jcsNav';
const key=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const hashRoute=window=>{const raw=String(window.location.hash||'#/').replace(/^#/,'')||'/';try{return decodeURIComponent(raw);}catch{return raw;}};

export function createNavigation({window,readSnapshot,restoreSnapshot,rebind,onRoute}){
  const snapshots=new Map();
  const stateFor=(route,previous={})=>({...(previous||{}),[NAV_FLAG]:true,key:previous?.key||key(),route,x:Number(previous?.x||0),y:Number(previous?.y||0)});
  const state=()=>stateFor(hashRoute(window),window.history.state?.[NAV_FLAG]?window.history.state:{});
  const record=()=>{
    const current={...state(),route:hashRoute(window),x:Number(window.scrollX||0),y:Number(window.scrollY||0)};
    const markup=readSnapshot?.();if(markup)snapshots.set(current.key,{markup,route:current.route,x:current.x,y:current.y});
    window.history.replaceState(current,'',window.location.hash||`#${current.route}`);
    return current;
  };
  const cacheCurrent=()=>record();
  const handlePop=event=>{
    const current=stateFor(hashRoute(window),event?.state?.[NAV_FLAG]?event.state:{});
    if(!event?.state?.[NAV_FLAG])window.history.replaceState(current,'',window.location.hash||`#${current.route}`);
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
    if(target===hashRoute(window))return;
    record();
    const next=stateFor(target,{});
    window.history.pushState(next,'',`#${target}`);
    onRoute?.(target,{restored:false,preserveScroll:false});
  };
  const start=()=>{window.history.scrollRestoration='manual';const current=state();window.history.replaceState(current,'',window.location.hash||`#${current.route}`);window.addEventListener('popstate',handlePop);return current;};
  return {start,navigate,record,cacheCurrent,handlePop,route:()=>hashRoute(window)};
}
