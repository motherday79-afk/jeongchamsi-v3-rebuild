// JCS 0.0.31.230 · dice action test + existing male2 visual test.
// IMPORTANT: Dice result is NOT connected to character movement or game rules yet.
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
  if(!root) return;
  bindCharacterTest(root);
  bindDiceTest(root);
}

function bindCharacterTest(root){
  if(root.dataset.characterBound==='1') return;
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

function bindDiceTest(root){
  if(root.dataset.diceBound==='1') return;
  const button=root.querySelector('[data-pm-dice-roll]');
  const flight=root.querySelector('[data-pm-dice-flight]');
  const flightDice=[...root.querySelectorAll('[data-pm-die-flight]')];
  const dockDice=[...root.querySelectorAll('[data-pm-die-dock]')];
  const result=root.querySelector('[data-pm-dice-result]');
  const resultTitle=root.querySelector('[data-pm-dice-result-title]');
  const resultSub=root.querySelector('[data-pm-dice-result-sub]');
  if(!button || !flight || flightDice.length!==2 || dockDice.length!==2 || !result || !resultTitle || !resultSub) return;

  root.dataset.diceBound='1';
  let rolling=false;

  button.addEventListener('click',async()=>{
    if(rolling) return;
    rolling=true;
    button.disabled=true;
    button.classList.add('is-rolling');
    result.classList.remove('is-visible','is-double');
    result.setAttribute('aria-hidden','true');
    flight.setAttribute('aria-hidden','false');
    flight.classList.remove('is-rolling','is-landed');
    void flight.offsetWidth;
    flight.classList.add('is-rolling');

    const final=[fairDie(),fairDie()];
    const started=performance.now();
    while(performance.now()-started<880){
      setDieFace(flightDice[0],fairDie());
      setDieFace(flightDice[1],fairDie());
      await wait(72);
    }
    setDieFace(flightDice[0],final[0]);
    setDieFace(flightDice[1],final[1]);
    flight.classList.remove('is-rolling');
    flight.classList.add('is-landed');
    await wait(360);

    dockDice.forEach((die,i)=>setDieFace(die,final[i]));
    const total=final[0]+final[1];
    const isDouble=final[0]===final[1];
    root.dataset.lastDice=`${final[0]},${final[1]}`;
    root.dataset.lastDiceTotal=String(total);
    root.dataset.lastDiceDouble=isDouble?'1':'0';
    window.dispatchEvent(new CustomEvent('polimable:dice-result',{detail:{dice:final,total,double:isDouble}}));

    resultTitle.textContent=isDouble?'DOUBLE!':`합계 ${total}`;
    resultSub.textContent=isDouble?`${final[0]} + ${final[1]} · 합계 ${total}`:`${final[0]} + ${final[1]}`;
    result.classList.toggle('is-double',isDouble);
    result.setAttribute('aria-hidden','false');
    result.classList.add('is-visible');
    await wait(760);

    flight.setAttribute('aria-hidden','true');
    flight.classList.remove('is-landed');
    button.disabled=false;
    button.classList.remove('is-rolling');
    rolling=false;
  });
}

function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

function fairDie(){
  if(globalThis.crypto?.getRandomValues){
    const a=new Uint8Array(1); let x=255;
    while(x>=252){globalThis.crypto.getRandomValues(a);x=a[0];}
    return x%6+1;
  }
  return Math.floor(Math.random()*6)+1;
}

function setDieFace(el,value){
  const face=Math.max(1,Math.min(6,Number(value)||1));
  el.dataset.face=String(face);
  el.setAttribute('aria-label',`주사위 ${face}`);
}
