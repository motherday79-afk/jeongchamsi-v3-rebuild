import {WEAPON_ANCHORS} from './weapon-anchors.js?v=290';
// Body centers exclude the pickaxe and transparent sprite margins.
const BODY_CENTER={orc:.46,elf:.44,dwarf:.46,human:.44,goblin:.45};
// A mineral-bearing point on the front toe of the 1600x768 ore seam.
const ORE_CONTACT={x:250,y:610};
export function stageGeometry(width,height,consoleTop,sceneTop=120,minerKey='orc-rust'){
 const narrow=width<=800;
 const floor=Math.min(height*.79,consoleTop-(narrow?42:38));
 const size=Math.max(100,Math.min(narrow?width*.70:width*.34,height*.48,550,(floor-sceneTop)/.92));
 const [race,tier]=minerKey.split('-'),left=width/2-size*(BODY_CENTER[race]||.46);
 const top=floor-size*649/540,impact=WEAPON_ANCHORS[minerKey]?.[5]||WEAPON_ANCHORS['orc-rust'][5];
 // Match pick-effects.js's final impact point, including the heavenly glow offset.
 const hitX=left+impact.head[0]*size/540,hitY=top+(impact.head[1]+(tier==='heaven'?28:18))*size/540;
 const oreWidth=size*2.10,oreScale=oreWidth/1600;
 return {floor,size,left,top,hitX,hitY,oreLeft:hitX-ORE_CONTACT.x*oreScale,oreWidth,
  oreBottom:height-(hitY+(768-ORE_CONTACT.y)*oreScale)};
}
export function initStageLayout(root){
 const player=root.querySelector('[data-player-actor]'),sprite=root.querySelector('[data-player]'),ore=root.querySelector('[data-ore-rock]'),
 controls=root.querySelector('.mine-controls'),console=root.querySelector('.mine-console'),effects=root.querySelector('[data-effects]'),dock=root.querySelector('.mine-dock');
 let frame=0;
 function update(){frame=0;const r=root.getBoundingClientRect(),c=console.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const sign=root.querySelector('.jackpot-sign').getBoundingClientRect();
  const g=stageGeometry(r.width,r.height,c.top-r.top,r.width<=800?sign.bottom-r.top+12:120,sprite.dataset.integratedMiner||'orc-rust');
  const dockRect=dock.getBoundingClientRect();
  root.style.setProperty('--dock-right-edge',Math.max(0,r.right-dockRect.right)+'px');
  Object.assign(player.style,{left:g.left+'px',top:g.top+'px',bottom:'auto',width:g.size+'px'});
  Object.assign(ore.style,{left:g.oreLeft+'px',top:'auto',bottom:g.oreBottom+'px',width:g.oreWidth+'px'});
  Object.assign(effects.style,{left:g.hitX+'px',top:g.hitY+'px',bottom:'auto'});
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 const observer=new ResizeObserver(schedule);for(const el of [root,controls,console,dock])observer.observe(el);
 // Equipment/race changes reposition once; animation frames never move the seam.
 const equipmentObserver=new MutationObserver(schedule);
 equipmentObserver.observe(sprite,{attributes:true,attributeFilter:['data-integrated-miner']});
 window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule();
 return ()=>{observer.disconnect();equipmentObserver.disconnect();window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
}
