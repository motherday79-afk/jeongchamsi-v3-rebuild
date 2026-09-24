export function pickAppearance(s){
 const tier=s.tool==='trial'||s.paidPicks?.includes(s.tool)?2:s.pick>=14?3:s.pick>=7?2:s.pick>=2?1:0;
 return {tier,name:['철 곡괭이','강화 은빛 곡괭이','황금 곡괭이','자수정 곡괭이'][tier],image:'/assets/mine/pick-tier-'+tier+'-278.webp',color:['#b69c77','#86dfff','#ffc954','#c399ff'][tier]};
}
// Socket positions in the registered 540x710 animation cells. Decoration follows
// the actual tool each frame rather than tinting the miner or floating nearby.
const sockets={
 strong:[[445,463,0],[144,313,25],[163,255,35],[172,175,0],[450,545,10],[452,615,10],[442,572,10],[385,508,0]],
 glamour:[[387,352,10],[124,293,25],[143,206,30],[135,157,0],[467,544,30],[433,604,30],[430,542,20],[372,420,0]],
 elf:[[437,588,0],[57,326,35],[95,280,35],[63,182,25],[490,591,30],[423,626,20],[391,601,25],[370,611,20]]
};
export function renderPickDecoration(el,s,frame){
 if(!el)return;const appearance=pickAppearance(s);el.toggleAttribute('hidden',appearance.tier===0);
 if(!appearance.tier)return;
 if(el.dataset.tier!==String(appearance.tier)){
  el.dataset.tier=appearance.tier;
  const metal=appearance.tier===1?'#dcefff':'#f8cb65',gem=appearance.color;
  el.innerHTML=`<defs><linearGradient id="pick-metal"><stop stop-color="#fff9df"/><stop offset=".45" stop-color="${metal}"/><stop offset="1" stop-color="#866437"/></linearGradient><radialGradient id="pick-gem"><stop stop-color="#fff"/><stop offset=".4" stop-color="${gem}"/><stop offset="1" stop-color="${appearance.tier===1?'#167caa':appearance.tier===2?'#aa5c0b':'#582594'}"/></radialGradient></defs><g data-socket><path d="M-20-19L0-30L20-19L22 17L0 29L-22 17Z" fill="url(#pick-metal)" stroke="#51331b" stroke-width="2"/><path d="M0-21L14-11L12 12L0 21L-13 12L-15-10Z" fill="url(#pick-gem)" stroke="#fff0b4" stroke-width="2"/><path d="M-13-10L0-2L14-11M0-21V-2L12 12M0-2L-13 12" fill="none" stroke="#ffffff88" stroke-width="1.5"/>${appearance.tier===3?'<path d="M-20-8L-32-20L-27 6L-20 12M20-8L32-20L27 6L20 12" fill="#bc8ff9" stroke="#ffe4a4" stroke-width="2"/>':''}</g>`;
 }
 const [x,y,rotation]=(sockets[s.character]||sockets.strong)[frame]||sockets.strong[0];
 el.querySelector('[data-socket]').setAttribute('transform',`translate(${x} ${y}) rotate(${rotation})`);
}
