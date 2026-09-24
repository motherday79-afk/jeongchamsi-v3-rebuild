// Sprite cells are 540x710; all five races place their soles near row 649.
// The floor, actor and ore use one coordinate calculation, not separate % bottoms.
export function stageGeometry(width,height,consoleTop,sceneTop=120){
 const narrow=width<=800;
 const floor=Math.min(height*.79,consoleTop-(narrow?42:38));
 const size=Math.max(100,Math.min(narrow?width*.70:width*.34,height*.48,550,(floor-sceneTop)/.92));
 const baseLeft=narrow?width*.13:Math.min(width*.30,width*.53-size*.65);
 // Move the miner into striking range without also moving the ore seam.
 const left=baseLeft+size*.14;
 return {floor,size,left,top:floor-size*649/540,oreLeft:baseLeft+size*.61,oreWidth:size*2.10,oreBottom:height-floor-12};
}
export function initStageLayout(root){
 const player=root.querySelector('[data-player-actor]'),ore=root.querySelector('[data-ore-rock]'),
 controls=root.querySelector('.mine-controls'),console=root.querySelector('.mine-console'),effects=root.querySelector('[data-effects]');
 let frame=0;
 function update(){frame=0;const r=root.getBoundingClientRect(),c=console.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const sign=root.querySelector('.jackpot-sign').getBoundingClientRect();
  const g=stageGeometry(r.width,r.height,c.top-r.top,r.width<=800?sign.bottom-r.top+12:120);
  Object.assign(player.style,{left:g.left+'px',top:g.top+'px',bottom:'auto',width:g.size+'px'});
  Object.assign(ore.style,{left:g.oreLeft+'px',top:'auto',bottom:g.oreBottom+'px',width:g.oreWidth+'px'});
  Object.assign(effects.style,{left:(g.left+g.size*.74)+'px',top:(g.floor-g.size*.08)+'px',bottom:'auto'});
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 const observer=new ResizeObserver(schedule);for(const el of [root,controls,console])observer.observe(el);
 window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule();
 return ()=>{observer.disconnect();window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
}
