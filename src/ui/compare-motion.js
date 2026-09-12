// Decorative geometry is local to the stage; no photos, controls, or hit targets
// are cloned into the effect layer.
const fracturePaths=`<path pathLength="1" d="m140 38-24 7-20-7-21 17-25-4-26 17m94-23-7-19-18-7m-18 36-9 21-27 7"/><path pathLength="1" d="m140 38 22 8 23-12 26 18 25-5 23 18m-74-31 5-17 24-10m-3 45 7 18 27 9"/><path pathLength="1" d="m140 38-7 16 14 9-10 22m3-47 8-17-13-12m12 54 21 2 10 18"/>`;
const groundMarkup=`<svg class="matchup-cracks" viewBox="0 0 280 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
 <path class="matchup-ground-shadow" d="m46 48 51-27 46 9 44-12 51 30-27 15 18 19-53-11-37 16-32-10-54 4 18-22z"/>
 <g class="matchup-ground-plates"><path d="m140 36-27-15-24 4-36 19 43-5 22 11z"/><path d="m145 35 18-14 29-3 42 25-44-6-23 14z"/><path d="m135 49-31-9-32 14-13 20 53-17 18 1z"/><path d="m152 47 29-9 30 16 23 20-48-13-18 3z"/><path d="m135 55-19 7-32 25 45-12 17 6 18-19z"/></g>
 <path class="matchup-ground-facets" d="m53 44 43-5 22 11 22-14-4 9-18 12-23-10-39 5zm114 7 23-14 44 6-4 8-39-5-22 13zm-83 36 45-12 17 6 18-19-3 12-15 14-18-6-43 12z"/>
 <path class="matchup-ground-bevel" d="m53 44 36-19 24-4 27 15-5 3-24-12-23 2-29 15zm110-23 29-3 42 25-9-1-35-19-28 5zm-91 33 32-14 31 9-6 3-25-6-29 15zm109-16 30 16 23 20-12-5-14-11-28-14zm-65 24 19-7 29 7-6 3-23-4-20 7z"/>
 <path class="matchup-ground-crater" d="m115 39 15-7 12 3 19-6 16 9-10 11-20-2-13 8-13-8-14-2z"/>
 <g class="matchup-crack-lines" fill="none" stroke-linecap="square" stroke-linejoin="miter"><g class="matchup-fracture-depth">${fracturePaths}</g><g class="matchup-fracture-edge" transform="translate(0 -1.3)">${fracturePaths}</g></g>
 </svg><i class="matchup-shock-ring"></i><i class="matchup-dust"></i>${Array.from({length:6},(_,index)=>`<i class="matchup-debris matchup-debris-${index}"></i>`).join('')}`;
const energyMarkup=side=>`<svg class="matchup-energy matchup-energy-${side}" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g${side==='right'?' transform="translate(300 0) scale(-1 1)"':''}><path class="matchup-energy-body" d="M0 35 76 43 58 29 146 46 124 28 213 48 199 34 300 50 215 66 231 53 147 71 165 54 60 70 83 56 0 66Z"/><path class="matchup-energy-filament" d="m0 50 82 2-15-12 103 15-19-15 70 13 79-3"/></g></svg>`;
const effectMarkup=`<div class="matchup-impact-arena">${[0,1].map(index=>`<div class="matchup-impact-side" data-side="${index}" data-phase="empty">${groundMarkup}</div>`).join('')}</div><div class="matchup-convergence">${energyMarkup('left')}${energyMarkup('right')}<i class="matchup-collision-core"></i><i class="matchup-collision-ring"></i></div>`;

export function createHomeCompareMotion(form,{
 matchMedia=globalThis.matchMedia?.bind(globalThis),
 MutationObserver=globalThis.MutationObserver,
 eventTarget=globalThis
}={}){
 const slots=[...form.querySelectorAll('[data-home-compare-slot]')],vs=form.querySelector('.matchup-vs');
 const effects=form.ownerDocument?.createElement('div');
 if(effects){effects.className='matchup-impact-stage';effects.setAttribute('aria-hidden','true');effects.innerHTML=effectMarkup;form.append(effects);}
 const impacts=[...effects?.querySelectorAll('.matchup-impact-side')||[]];
 const sides=slots.map((slot,index)=>({slot,person:slot.querySelector('[data-home-compare-preview]'),impact:impacts[index],id:'',phase:'empty',token:0,animations:new Set()}));
 const shared=new Set(),preference=matchMedia?.('(prefers-reduced-motion: reduce)');
 let sequence=0,disposed=false,observer;
 const still=()=>preference?.matches||sides.some(side=>typeof side.person?.animate!=='function');
 const cancel=animations=>{for(const animation of animations)animation.cancel();animations.clear();};
 const setPhase=(side,phase)=>{side.phase=phase;side.slot.dataset.compareArrival=phase;if(side.impact)side.impact.dataset.phase=phase;};
 const resetCollision=()=>{++sequence;cancel(shared);if(vs)vs.hidden=true;form.dataset.comparePhase='waiting';};
 const current=()=>{if(disposed)return false;if(form.isConnected===false){destroy();return false;}return true;};
 const ready=()=>sides.length===2&&sides.every(side=>side.id&&side.phase==='landed')&&sides[0].id!==sides[1].id;
 // WAAPI promises, including canceled ones, are always consumed. Completed
 // effects are canceled as well so no fill/animation handles remain attached.
 async function play(animations,node,frames,options){
  if(typeof node?.animate!=='function')return;
  let animation;
  try{animation=node.animate(frames,{fill:'both',easing:'linear',...options});animations.add(animation);await animation.finished;}
  catch{/* A canceled or unavailable animation never owns selection state. */}
  finally{if(animation){animations.delete(animation);animation.cancel();}}
 }
 function settleInstantly(){
  resetCollision();
  for(const side of sides){++side.token;cancel(side.animations);setPhase(side,side.id?'landed':'empty');}
  if(ready()){if(vs)vs.hidden=false;form.dataset.comparePhase='ready';}
 }
 async function converge(){
  if(!current()||!ready()||form.dataset.comparePhase!=='waiting')return;
  if(still()){if(vs)vs.hidden=false;form.dataset.comparePhase='ready';return;}
  const token=sequence;
  form.dataset.comparePhase='converging';
  await Promise.all(['left','right'].map(side=>play(shared,effects?.querySelector(`.matchup-energy-${side}`),[
   {opacity:0,clipPath:side==='left'?'inset(0 100% 0 0)':'inset(0 0 0 100%)',filter:'blur(3px)'},
   {opacity:1,offset:.42,filter:'blur(0px)'},
   {opacity:1,clipPath:'inset(0 0 0 0)',filter:'blur(0px)'}
  ],{duration:430,easing:'cubic-bezier(.58,0,.93,.5)'})));
  if(!current()||token!==sequence||!ready())return;
  form.dataset.comparePhase='revealing';if(vs)vs.hidden=false;
  await Promise.all([
   play(shared,vs,[
    {opacity:0,transform:'translate(-50%,65%) skew(-9deg) scale(.42)',filter:'blur(4px)'},
    {opacity:1,transform:'translate(-50%,-67%) skew(-9deg) scale(1.25)',filter:'blur(0px)',offset:.46},
    {opacity:1,transform:'translate(-50%,-44%) skew(-9deg) scale(.96)',offset:.69},
    {opacity:1,transform:'translate(-50%,-50%) skew(-9deg) scale(1)',filter:'blur(0px)'}
   ],{duration:670,easing:'cubic-bezier(.16,.78,.25,1)'}),
   play(shared,effects?.querySelector('.matchup-collision-core'),[
    {opacity:0,transform:'translate(-50%,-50%) scale(.15) rotate(-18deg)'},
    {opacity:.95,transform:'translate(-50%,-50%) scale(1.08) rotate(8deg)',offset:.2},
    {opacity:0,transform:'translate(-50%,-50%) scale(1.5) rotate(18deg)'}
   ],{duration:600,easing:'cubic-bezier(.12,.72,.22,1)'}),
   play(shared,effects?.querySelector('.matchup-collision-ring'),[
    {opacity:.85,transform:'translate(-50%,-50%) scale(.25)'},
    {opacity:.55,offset:.3},
    {opacity:0,transform:'translate(-50%,-50%) scale(1.8)'}
   ],{duration:650,easing:'cubic-bezier(.1,.7,.24,1)'})
  ]);
  if(current()&&token===sequence&&ready())form.dataset.comparePhase='ready';
 }
 async function arrive(side,index){
  const token=side.token,direction=index===0?-1:1;
  const live=()=>current()&&side.token===token;
  await play(side.animations,side.person,[
   {opacity:0,transform:`translate(${direction*42}px,-190px) rotate(${direction*7}deg) scale(.86)`},
   {opacity:1,offset:.16},
   {opacity:1,transform:'translate(0,5px) rotate(0deg) scale(1.08,.86)'}
  ],{duration:650,easing:'cubic-bezier(.55,.04,.95,.4)'});
  if(!live())return;
  setPhase(side,'impact');
  const layer=selector=>side.impact?.querySelector(selector);
  const debris=[...side.impact?.querySelectorAll('.matchup-debris')||[]];
  await Promise.all([
   play(side.animations,side.person,[
    {transform:'translate(0,5px) rotate(0deg) scale(1.08,.86)'},
    {transform:'translate(0,-10px) rotate(0deg) scale(.97,1.035)',offset:.19},
    {transform:'translate(-3px,2px) rotate(-.7deg) scale(1.025,.97)',offset:.34},
    {transform:'translate(2px,0) rotate(.4deg) scale(1)',offset:.46},
    {transform:'translate(0,0) rotate(0deg) scale(1)',offset:.74},
    {transform:'translate(0,0) rotate(0deg) scale(1)'}
   ],{duration:670,easing:'cubic-bezier(.18,.7,.3,1)'}),
   play(side.animations,layer('.matchup-cracks'),[
    {opacity:0,transform:'scale(.35,.2)'},
    {opacity:1,transform:'scale(1.04,1)',offset:.19},
    {opacity:.65,transform:'scale(1)',offset:.7},
    {opacity:.48,transform:'scale(1)'}
   ],{duration:650,easing:'cubic-bezier(.08,.76,.24,1)'}),
   play(side.animations,layer('.matchup-crack-lines'),[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:390,easing:'cubic-bezier(.12,.68,.25,1)'}),
   play(side.animations,layer('.matchup-shock-ring'),[
    {opacity:.95,transform:'translate(-50%,-50%) scale(.15,.3)'},
    {opacity:.75,offset:.17},
    {opacity:0,transform:'translate(-50%,-50%) scale(1.8,1.3)'}
   ],{duration:560,easing:'cubic-bezier(.08,.7,.25,1)'}),
   play(side.animations,layer('.matchup-dust'),[
    {opacity:0,transform:'translate(-50%,-50%) scale(.3)'},
    {opacity:.64,offset:.18},
    {opacity:0,transform:'translate(-50%,-70%) scale(1.55)'}
   ],{duration:650,easing:'ease-out'}),
   ...debris.map((piece,i)=>{const x=[-78,-51,-28,32,57,83][i],y=[-25,-43,-58,-53,-39,-24][i];return play(side.animations,piece,[
    {opacity:0,transform:'translate(0,0) rotate(0deg) scale(.35)'},
    {opacity:1,transform:`translate(${x*.7}px,${y}px) rotate(${x*2}deg) scale(1)`,offset:.38},
    {opacity:0,transform:`translate(${x}px,12px) rotate(${x*4}deg) scale(.55)`}
   ],{duration:560+(i%3)*40,easing:'cubic-bezier(.18,.65,.48,1)'});})
  ]);
  if(!live())return;
  setPhase(side,'landed');void converge();
 }
 function clear(index){
  const side=sides[index];if(!side||!current())return;
  ++side.token;cancel(side.animations);side.id='';setPhase(side,'empty');resetCollision();
 }
 function select(index,id){
  const side=sides[index],identity=String(id||'').trim();if(!side||!current())return;
  if(!identity){clear(index);return;}if(side.id===identity)return;
  ++side.token;cancel(side.animations);resetCollision();side.id=identity;
  if(still()){setPhase(side,'landed');void converge();return;}
  setPhase(side,'falling');void arrive(side,index);
 }
 function destroy(){
  if(disposed)return;disposed=true;resetCollision();
  for(const side of sides){++side.token;cancel(side.animations);}
  observer?.disconnect();preference?.removeEventListener?.('change',onPreference);
  eventTarget?.removeEventListener?.('pagehide',onPageHide);effects?.remove();
 }
 const onPreference=()=>{if(preference?.matches&&current())settleInstantly();};
 // A bfcache page remains interactive when restored; settle its work instead of
 // disposing the controller that the browser will bring back with that page.
 const onPageHide=event=>event?.persisted?settleInstantly():destroy();
 resetCollision();sides.forEach(side=>setPhase(side,'empty'));
 preference?.addEventListener?.('change',onPreference);eventTarget?.addEventListener?.('pagehide',onPageHide);
 if(MutationObserver&&form.ownerDocument?.documentElement){observer=new MutationObserver(()=>{if(form.isConnected===false)destroy();});observer.observe(form.ownerDocument.documentElement,{childList:true,subtree:true});}
 return {select,clear,destroy};
}
