// JCS 0.0.31.228 · male2 character visual test only.
// No board-game rules are activated in this patch.
const TEST_STATES = [
  {name:'move', src:'/assets/polimable/characters/male2/male2-move.png'},
  {name:'win', src:'/assets/polimable/characters/male2/male2-win.png'},
  {name:'fail', src:'/assets/polimable/characters/male2/male2-fail.png'},
  {name:'emotion', src:'/assets/polimable/characters/male2/male2-emotion.png'}
];

export async function hydratePoliMarble(){
  bindPoliMarbleInteractions();
}

export function bindPoliMarbleInteractions(){
  const root=document.querySelector('[data-pm-root]');
  if(!root || root.dataset.characterBound==='1') return;
  const token=root.querySelector('[data-pm-character-token]');
  const tokenImg=root.querySelector('[data-pm-character-token-image]');
  const reaction=root.querySelector('[data-pm-character-reaction]');
  const reactionImg=root.querySelector('[data-pm-character-reaction-image]');
  if(!token || !tokenImg || !reaction || !reactionImg) return;
  root.dataset.characterBound='1';
  let i=0, timer=0;
  token.addEventListener('click',()=>{
    const state=TEST_STATES[i%TEST_STATES.length]; i+=1;
    clearTimeout(timer);
    reactionImg.src=state.src;
    reaction.dataset.state=state.name;
    reaction.setAttribute('aria-hidden','false');
    reaction.classList.remove('is-visible');
    void reaction.offsetWidth;
    reaction.classList.add('is-visible');
    token.classList.toggle('is-hop',state.name==='move');
    timer=setTimeout(()=>{
      reaction.classList.remove('is-visible');
      reaction.setAttribute('aria-hidden','true');
      token.classList.remove('is-hop');
    },1400);
  });
}
