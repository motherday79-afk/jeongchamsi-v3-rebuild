const views=new Set(['valley','world','quests','raid','help','lottery','jackpot','characters','shop','admin','pick','worker','storage']);
// Each overlay is a real same-document history entry. Repainting is not navigation.
export function createMineNavigation({win=window,render,getScroll=()=>0}){
 const read=state=>{const n=state?.jcsMineNavigation;return n&&Array.isArray(n.trail)&&n.trail.every(v=>views.has(v))?n:{trail:[],scroll:0};};
 let current=read(win.history.state),moving=false;
 const url=()=>win.location.pathname+win.location.search;
 const save=n=>win.history.replaceState({...win.history.state,jcsMineNavigation:n},'',url()+(n.trail.length?'#'+n.trail.at(-1):''));
 save(current);
 const paint=()=>render(current.trail.at(-1)||'',current.scroll||0);
 const onPop=event=>{current=read(event.state);moving=false;paint();};
 win.addEventListener('popstate',onPop);
 return {
  current:()=>current.trail.at(-1)||'',
  restore:paint,
  go(view){
   if(moving||!views.has(view))return;
   if(current.trail.at(-1)===view){current={...current,scroll:getScroll()};paint();return;}
   current={...current,scroll:getScroll()};save(current);
   current={trail:[...current.trail,view],scroll:0};
   win.history.pushState({...win.history.state,jcsMineNavigation:current},'',url()+'#'+view);paint();
  },
  back(){if(moving)return;if(current.trail.length){moving=true;win.history.back();}},
  home(){if(moving)return;if(current.trail.length){moving=true;win.history.go(-current.trail.length);}else paint();},
  destroy(){win.removeEventListener('popstate',onPop);}
 };
}
