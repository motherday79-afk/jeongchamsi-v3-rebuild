// JCS 0.0.31.245 · POLIMARBLE AUDIO CONTROLLER
// BGM + lightweight SFX. Audio starts only after a user gesture, per browser autoplay policy.

const STORAGE_KEY='jcs:polimable:audio-enabled';
const BGM_URL='/assets/polimable/audio/polimable-bgm-purple-gold.mp3';
const SFX=Object.freeze({
  diceRoll:{url:'/assets/polimable/audio/sfx-dice-roll.wav',volume:.46,pool:2},
  diceLand:{url:'/assets/polimable/audio/sfx-dice-land.wav',volume:.48,pool:2},
  step:{url:'/assets/polimable/audio/sfx-step.wav',volume:.16,pool:4},
  land:{url:'/assets/polimable/audio/sfx-land.wav',volume:.32,pool:2},
  purchase:{url:'/assets/polimable/audio/sfx-purchase.wav',volume:.46,pool:2},
  gain:{url:'/assets/polimable/audio/sfx-gain.wav',volume:.40,pool:2},
  loss:{url:'/assets/polimable/audio/sfx-loss.wav',volume:.38,pool:2},
  double:{url:'/assets/polimable/audio/sfx-double.wav',volume:.56,pool:2},
  start:{url:'/assets/polimable/audio/sfx-start.wav',volume:.52,pool:2}
});

function readEnabled(){
  try{return localStorage.getItem(STORAGE_KEY)!=='0';}catch{return true;}
}
function storeEnabled(enabled){
  try{localStorage.setItem(STORAGE_KEY,enabled?'1':'0');}catch{}
}
function safePlay(audio){
  if(!audio)return;
  try{
    const promise=audio.play();
    if(promise?.catch)promise.catch(()=>{});
  }catch{}
}

export function createPoliMarbleAudio(root){
  let enabled=readEnabled();
  let unlocked=false;
  let destroyed=false;
  let bgm=null;
  let toggle=null;
  const pools=new Map();

  function ensureBgm(){
    if(bgm)return bgm;
    bgm=new Audio(BGM_URL);
    bgm.loop=true;
    bgm.preload='auto';
    bgm.volume=.34;
    return bgm;
  }

  function makePool(name){
    if(pools.has(name))return pools.get(name);
    const cfg=SFX[name];
    if(!cfg)return [];
    const list=Array.from({length:cfg.pool||2},()=>{
      const a=new Audio(cfg.url);
      a.preload='auto';
      a.volume=cfg.volume;
      return a;
    });
    pools.set(name,list);
    return list;
  }

  function updateToggle(){
    if(!toggle)return;
    toggle.textContent=enabled?'🔊':'🔇';
    toggle.classList.toggle('is-muted',!enabled);
    toggle.setAttribute('aria-label',enabled?'폴리마블 소리 끄기':'폴리마블 소리 켜기');
    toggle.setAttribute('aria-pressed',enabled?'false':'true');
    toggle.title=enabled?'소리 끄기':'소리 켜기';
  }

  function startBgm(){
    if(destroyed||!enabled||!unlocked)return;
    const a=ensureBgm();
    if(a.paused)safePlay(a);
  }

  function pauseBgm(){
    if(!bgm)return;
    try{bgm.pause();}catch{}
  }

  function unlock(){
    if(destroyed)return;
    unlocked=true;
    startBgm();
  }

  function play(name){
    if(destroyed||!enabled)return;
    if(!unlocked)unlock();
    const list=makePool(name);
    if(!list.length)return;
    const audio=list.find(a=>a.paused||a.ended)||list[0];
    try{audio.currentTime=0;}catch{}
    safePlay(audio);
  }

  function setEnabled(next){
    enabled=Boolean(next);
    storeEnabled(enabled);
    updateToggle();
    if(enabled){unlocked=true;startBgm();}
    else{
      pauseBgm();
      for(const list of pools.values())for(const a of list){try{a.pause();a.currentTime=0;}catch{}}
    }
  }

  function toggleSound(){setEnabled(!enabled);}

  function onFirstGesture(ev){
    if(ev.target?.closest?.('[data-pm-sound-toggle]'))return;
    unlock();
  }

  function onVisibility(){
    if(document.hidden)pauseBgm();
    else startBgm();
  }

  let observer=null;
  function destroy(){
    if(destroyed)return;
    destroyed=true;
    pauseBgm();
    root?.removeEventListener('pointerdown',onFirstGesture,true);
    document.removeEventListener('visibilitychange',onVisibility);
    observer?.disconnect();
  }

  function init(){
    toggle=root?.querySelector?.('[data-pm-sound-toggle]')||null;
    updateToggle();
    toggle?.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();toggleSound();});
    root?.addEventListener('pointerdown',onFirstGesture,true);
    document.addEventListener('visibilitychange',onVisibility);
    if(document.body&&typeof MutationObserver!=='undefined'){
      observer=new MutationObserver(()=>{if(root&&!root.isConnected)destroy();});
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }

  return Object.freeze({init,play,unlock,setEnabled,toggle:toggleSound,isEnabled:()=>enabled,destroy});
}
