export function bindComparisonBoard(root){
 if(!root||root.__comparisonBoardBound)return;root.__comparisonBoardBound=true;
 function select(button){
  const board=button.closest('[data-compare-board]'),id=button.dataset.boardTab;if(!board)return;
  board.querySelectorAll('[data-board-tab]').forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  const old=board.querySelector('[data-board-panel]:not([hidden]) [data-board-scroll]'),left=old?.scrollLeft||0;
  board.querySelectorAll('[data-board-panel]').forEach(panel=>{panel.hidden=panel.dataset.boardPanel!==id;if(!panel.hidden){const scroll=panel.querySelector('[data-board-scroll]');if(scroll)scroll.scrollLeft=left;}});
 }
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
