import {pickAppearance} from './pick-design.js?v=281';
export const costumeDefaults=()=>({top:'classic',bottom:'classic',head:'classic',gloves:'classic',boots:'classic'});
export const costumeFor=(s,c=s.character)=>({...costumeDefaults(),...(s.costumes?.[c]||{})});
const root='/assets/mine/rig-281/';
const image=(c,name,x,y,w,h,extra='')=>`<image href="${root}${c}-${name}.webp" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" ${extra}/>`;
const angles=[[-34,-72,-35],[-90,-92,-78],[-132,-61,-119],[-154,-30,-145],[-58,-4,4],[2,-30,40],[-10,-53,18],[-27,-65,-18]];
function arm(c,costume,far=false){
 const elf=c==='elf',upper=elf?82:110,fore=elf?88:112,width=elf?55:c==='strong'?70:49;
 return `<g data-arm="${far?'far':'near'}">${image(c,'upper',-width/2,-9,width,upper+20)}<g data-forearm transform="translate(0 ${upper})">${image(c,'fore',-width/2,-9,width,fore+22)}<g data-grip transform="translate(0 ${fore-8})">${!far?'<g data-weapon></g>':''}${image(c,costume.gloves!=='none'?'glove':'hand',-width*.57,-27,width*1.14,55)}</g></g></g>`;
}
export function renderCharacter(el,s,frame=0){
 if(!el)return;
 const c=['strong','glamour','elf'].includes(s.character)?s.character:'strong',costume=costumeFor(s,c),signature=c+JSON.stringify(costume);
 if(el.dataset.rig!==signature){
  el.dataset.rig=signature;el.classList.add('miner-rig');el.dataset.character=c;
  const elf=c==='elf',woman=c==='glamour';
  const torso=elf?[176,300,198,154]:woman?[181,218,180,208]:[161,220,222,213];
  const legs=elf?[151,437,242,204]:[150,409,246,259];
  const head=elf?[113,100,291,231]:woman?[164,79,208,185]:[161,93,185,163];
  const headwear=elf?[109, 60,300,105]:woman?[164,43,215, 80]:[147,45,211,80];
  const topName=costume.top==='none'?'torso':costume.top==='alternate'?'top-alt':'top';
  const legName=costume.bottom==='none'?'legs':costume.bottom==='alternate'?'bottom-alt':'bottom';
  el.innerHTML=`<svg viewBox="0 0 540 710" aria-hidden="true"><g data-rig-body>
   <g data-far-mount opacity=".85">${arm(c,costume,true)}</g>
   ${image(c,'legs',...legs)}${costume.bottom!=='none'?image(c,legName,...(woman?[150,406,246,99]:[150,407,246,elf?181:218])):''}
   ${costume.boots!=='none'?image(c,'boots',... (elf?[145,571,252,90]:woman?[145,529,258,151]:[145,579,258,98])):''}
   <svg x="0" y="0" width="540" height="${elf?448:410}" viewBox="0 0 540 ${elf?448:410}" overflow="hidden">${c==='elf'||costume.top==='none'?image(c,'torso',...torso):''}${costume.top!=='none'?image(c,topName,...torso):''}</svg>
   <g data-rig-head>${image(c,'head',...head)}${costume.head!=='none'?image(c,'helmet',...headwear):''}</g>
   <g data-near-mount>${arm(c,costume)}</g>
  </g></svg>`;
 }
 const appearance=pickAppearance(s),weapon=el.querySelector('[data-weapon]');
 if(weapon.dataset.pick!==String(appearance.tier)){
  weapon.dataset.pick=String(appearance.tier);
  const size=c==='elf'?350:300;
  weapon.innerHTML=`<image href="${root}pick-${appearance.tier}.webp" x="${-size*.36}" y="${-size*.66}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
 }
 poseCharacter(el,frame);
}
export function poseCharacter(el,frame=0){
 if(!el?.dataset.rig)return;
 el.dataset.frame=String(frame);
 const c=el.dataset.character,elf=c==='elf',woman=c==='glamour',upper=elf?82:110;
 const [a,b,tool]=angles[frame]||angles[0];
 const shoulder=elf?[334,331]:woman?[332,263]:[343,268];
 const farShoulder=elf?[177,329]:[168,267];
 el.querySelector('[data-near-mount]').setAttribute('transform',`translate(${shoulder})`);
 el.querySelector('[data-far-mount]').setAttribute('transform',`translate(${farShoulder})`);
 for(const arm of el.querySelectorAll('[data-arm]')){
  const far=arm.dataset.arm==='far';
  arm.setAttribute('transform',`rotate(${far?10:a})`);
  arm.querySelector('[data-forearm]').setAttribute('transform',`translate(0 ${upper}) rotate(${far?-25:b})`);
 }
 el.querySelector('[data-weapon]').setAttribute('transform',`rotate(${tool+50-a-b})`);
 const tilt=[0,-1,-3,-4,0,3,2,1][frame]||0;
 el.querySelector('[data-rig-body]').setAttribute('transform',`rotate(${tilt} 267 650)`);
 el.querySelector('[data-rig-head]').setAttribute('transform',`rotate(${frame>=4&&frame<=6?7:0} 265 247)`);
}
