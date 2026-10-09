export const JOURNEY_STAGES=['dawn','noon','shower','sunset','night'];
const labels=['새벽 · 옅은 안개','점심 · 맑은 하늘','오후 · 소나기','저녁 · 비 갠 노을','밤 · 익숙한 야경'];
export function journeyStage(ride){return !ride||ride.phase==='intro'?0:Math.min(4,Math.max(0,Math.floor(Number(ride.beatIndex)||0)));}
export function updateTaxiJourney(scene,ride){
 const index=journeyStage(ride),stage=JOURNEY_STAGES[index];if(scene.dataset.journey===stage)return;
 if(!scene.querySelector('.journey-sky')){
  scene.querySelector('.sky').insertAdjacentHTML('afterbegin',JOURNEY_STAGES.slice(0,4).map(name=>`<i class="journey-sky journey-sky-${name}" aria-hidden="true"></i>`).join(''));
  scene.insertAdjacentHTML('beforeend','<div class="journey-mist" aria-hidden="true"></div><div class="journey-wet-road" aria-hidden="true"></div><span class="journey-weather"></span>');
 }
 scene.dataset.journey=stage;scene.querySelector('.journey-weather').textContent=labels[index];
}
