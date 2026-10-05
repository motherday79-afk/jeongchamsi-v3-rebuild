export function swipeTabIndex(index,count,dx,dy){
 return Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.5?Math.max(0,Math.min(count-1,index+(dx<0?1:-1))):index;
}
export function bindComparisonBoard(root){
 if(!root||root.__comparisonBoardBound)return;root.__comparisonBoardBound=true;
 root.addEventListener('change',event=>{const select=event.target.closest('[data-election-metric]');if(!select)return;select.closest('[data-board-panel]').querySelectorAll('[data-election-view]').forEach(view=>{view.hidden=view.dataset.electionView!==select.value;});});
 function select(button){
  const board=button.closest('[data-compare-board]'),id=button.dataset.boardTab;if(!board)return;
  board.querySelectorAll('[data-board-tab]').forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  const old=board.querySelector('[data-board-panel]:not([hidden]) [data-board-scroll]'),left=old?.scrollLeft||0;
  board.querySelectorAll('[data-board-panel]').forEach(panel=>{panel.hidden=panel.dataset.boardPanel!==id;if(!panel.hidden){const scroll=panel.querySelector('[data-board-scroll]');if(scroll)scroll.scrollLeft=left;}});
  const nav=button.closest('[role="tablist"]');
  if(nav?.scrollTo&&button.offsetLeft!==undefined)nav.scrollTo({left:button.offsetLeft-nav.offsetLeft-(nav.clientWidth-button.offsetWidth)/2,behavior:'smooth'});
 }
 let gesture=null;
 root.addEventListener('touchstart',event=>{
  gesture=null;if(event.touches.length!==1||!globalThis.matchMedia?.('(max-width: 767px)').matches)return;
  const panel=event.target.closest('[data-board-panel]');if(!panel||event.target.closest('a,button,input,select'))return;
  const scroll=event.target.closest('[data-board-scroll]');
  // A wider chart owns its own horizontal scroll; never steal that gesture.
  if(scroll&&scroll.scrollWidth>scroll.clientWidth+2)return;
  gesture={panel,x:event.touches[0].clientX,y:event.touches[0].clientY};
 },{passive:true});
 root.addEventListener('touchend',event=>{
  const start=gesture;gesture=null;if(!start||!event.changedTouches.length)return;
  const board=start.panel.closest('[data-compare-board]'),tabs=[...board.querySelectorAll('[data-board-tab]')];
  const index=tabs.findIndex(t=>t.dataset.boardTab===start.panel.dataset.boardPanel),touch=event.changedTouches[0];
  const next=swipeTabIndex(index,tabs.length,touch.clientX-start.x,touch.clientY-start.y);
  if(next!==index&&tabs[next])select(tabs[next]);
 },{passive:true});
 root.addEventListener('touchcancel',()=>{gesture=null;},{passive:true});
 root.addEventListener('click',event=>{
  const tab=event.target.closest('[data-board-tab]');if(tab){select(tab);return;}
  const shift=event.target.closest('[data-board-shift]');if(!shift)return;
  const scroll=shift.closest('[data-compare-board]')?.querySelector('[data-board-panel]:not([hidden]) [data-board-scroll]');
  const width=scroll?.querySelector('.cb-person-col')?.getBoundingClientRect().width||240;
  scroll?.scrollBy({left:Number(shift.dataset.boardShift)*width,behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 });
 root.addEventListener('keydown',event=>{
  const tab=event.target.closest('[data-board-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=[...tab.closest('[role="tablist"]').querySelectorAll('[data-board-tab]')],index=tabs.indexOf(tab);
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  event.preventDefault();select(tabs[next]);tabs[next].focus();
 });
}
