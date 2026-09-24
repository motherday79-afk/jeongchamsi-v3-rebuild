import {pickAppearance} from './pick-design.js?v=282';
export function minerSprite(state){
 const character=['strong','glamour','elf'].includes(state.character)?state.character:'strong';
 const tier=pickAppearance(state).tier;
 return {character,tier,key:`${character}-${tier}`,url:tier===0?`/assets/mine/${character}-motion-277.webp`:`/assets/mine/${character}-pick-${tier}-282.webp`};
}
export function renderIntegratedMiner(el,state){
 const sprite=minerSprite(state);
 if(el.dataset.wantedMiner===sprite.key)return;
 el.dataset.wantedMiner=sprite.key;
 const image=new Image();image.onload=()=>{
  if(el.dataset.wantedMiner!==sprite.key)return;
  el.style.backgroundImage=`url("${sprite.url}")`;el.dataset.integratedMiner=sprite.key;
 };
 image.onerror=()=>{if(el.dataset.wantedMiner===sprite.key){delete el.dataset.wantedMiner;el.dataset.minerImageError=sprite.key;}};
 image.src=sprite.url;
}
