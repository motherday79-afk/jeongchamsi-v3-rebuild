import {RACES,equippedPick} from './pick-catalog.js?v=285';
export function minerSprite(state){
 const character=RACES[state.character]?state.character:'orc',tier=equippedPick(state).visual;
 return {character,tier,key:`${character}-${tier}`,url:`/assets/mine/races-285/${character}-${tier}.webp`};
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
