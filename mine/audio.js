// One gain bus for every sound. Device media volume remains controlled by the OS.
const ASSETS='/assets/mine/media-313/';
const PICK_IDS=['rust','iron','silver','gold','mystic','dimension','dark','heaven','lightning','wind'];
export const pickSoundName=(visual,phase)=>`pick-${PICK_IDS.includes(visual)?visual:'rust'}-${phase==='swing'?'swing':'strike'}`;
const PICK_SOUNDS=PICK_IDS.flatMap(id=>['swing','strike'].map(phase=>pickSoundName(id,phase)));
const NAMES=['tap','strike','gain','upgrade','full','collect','scratch','loss','success','failure','equip','swing','map-open','bgm-mine','bgm-world','bgm-raid',...PICK_SOUNDS];
export const musicScene=panel=>['raid','eye','tower'].includes(panel)?'raid':['world','quests'].includes(panel)?'world':'mine';
export function createMineAudio({storage,createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),fetcher=(...args)=>fetch(...args),hidden=()=>document.hidden}={}){
 let enabled=true,ctx=null,bus=null,unlocked=false;
 try{storage=storage||localStorage;enabled=storage.getItem('jcs.mine.sound')!=='off';}catch{}
 const buffers=new Map(),loading=new Map(),voices=new Set(),listeners=new Set();
 let desiredScene=null,music=null,musicEpoch=0,cinemas=0;
 const musicSources=new Set();
 function ramp(gain,value,duration=.65){const p=gain.gain;if(p.cancelScheduledValues&&p.setValueAtTime&&p.linearRampToValueAtTime){p.cancelScheduledValues(ctx.currentTime);p.setValueAtTime(p.value,ctx.currentTime);p.linearRampToValueAtTime(value,ctx.currentTime+duration);}else p.value=value;}
 function stopAll(){musicEpoch++;for(const stop of [...voices])stop();for(const entry of [...musicSources]){try{entry.source.stop();}catch{}musicSources.delete(entry);}music=null;}
 async function syncMusic(){
  if(!desiredScene||!enabled||!unlocked||hidden()||ctx?.state!=='running'||music?.name===desiredScene)return;
  const scene=desiredScene,epoch=musicEpoch,buffer=await load('bgm-'+scene);
  if(!buffer||epoch!==musicEpoch||scene!==desiredScene||!enabled||hidden()||ctx?.state!=='running'||music?.name===scene)return;
  try{
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(bus);
   const previous=music,entry={name:scene,source,gain};music=entry;musicSources.add(entry);source.onended=()=>musicSources.delete(entry);source.start();ramp(gain,cinemas ? 0 : .85);
   if(previous){ramp(previous.gain,0);previous.source.stop(ctx.currentTime+.7);}
  }catch{music=null;}
 }
 function setScene(scene){if(!['mine','world','raid'].includes(scene))return Promise.resolve();if(desiredScene!==scene){desiredScene=scene;musicEpoch++;}return syncMusic();}
 function setEnabled(value){enabled=!!value;if(!enabled)stopAll();else void syncMusic();try{storage?.setItem('jcs.mine.sound',enabled?'on':'off');}catch{}for(const fn of listeners)fn(enabled);}
 async function load(name){
  if(!ctx||!NAMES.includes(name))return null;
  if(buffers.has(name))return buffers.get(name);
  if(!loading.has(name))loading.set(name,(async()=>{try{const r=await fetcher((name==='bgm-world'?'/assets/mine/media-339/':PICK_SOUNDS.includes(name)||['success','failure'].includes(name)?'/assets/mine/media-314/':ASSETS)+name+'.m4a');if(!r.ok)return null;const b=await ctx.decodeAudioData(await r.arrayBuffer());buffers.set(name,b);return b;}catch{return null;}finally{loading.delete(name);}})());
  return loading.get(name);
 }
 async function unlock(){
  try{if(!ctx){ctx=createContext();bus=ctx.createGain();bus.gain.value=1;
   const limiter=ctx.createDynamicsCompressor?.();
   if(limiter){limiter.threshold.value=-3;limiter.knee.value=3;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.15;bus.connect(limiter);limiter.connect(ctx.destination);}else bus.connect(ctx.destination);}await ctx.resume();unlocked=ctx.state==='running';if(unlocked){for(const name of NAMES.filter(n=>!n.startsWith('bgm-')))void load(name);await syncMusic();}}catch{unlocked=false;}
 }
 function play(name,{offset=0}={}){
  if(!enabled||!unlocked||hidden()||ctx?.state!=='running')return ()=>{};
  const buffer=buffers.get(name);if(!buffer){void load(name);return ()=>{};}
  if(offset>=buffer.duration)return ()=>{};
  while(voices.size>=8)voices.values().next().value();
  try{const source=ctx.createBufferSource();source.buffer=buffer;source.connect(bus);let stopped=false;
   const stop=()=>{if(stopped)return;stopped=true;voices.delete(stop);try{source.stop();}catch{}};
   source.onended=()=>{stopped=true;voices.delete(stop);};voices.add(stop);source.start(0,Math.max(0,offset));return stop;
  }catch{return ()=>{};}
 }
 function track(video,name){
  cinemas++;if(music)ramp(music.gain,0,.12);
  let release=null,disposed=false,buffering=false;
  const stop=()=>{release?.();release=null;};
  const sync=()=>{if(disposed||buffering||video.paused||video.ended||hidden()||!enabled){stop();return;}if(!release&&buffers.has(name)&&unlocked&&ctx.state==='running')release=play(name,{offset:video.currentTime});};
  const wait=()=>{buffering=true;stop();};const playing=()=>{buffering=false;sync();};const seek=()=>{stop();};
  const events={playing,timeupdate:sync,pause:stop,waiting:wait,seeking:seek,seeked:playing,ended:stop};
  for(const [event,fn] of Object.entries(events))video.addEventListener(event,fn);
  const onToggle=()=>{stop();sync();};listeners.add(onToggle);void load(name).then(sync);
  return ()=>{if(disposed)return;disposed=true;stop();cinemas=Math.max(0,cinemas-1);if(music)ramp(music.gain,cinemas ? 0 : .85,.9);listeners.delete(onToggle);for(const [event,fn] of Object.entries(events))video.removeEventListener(event,fn);};
 }
 function holdMusic(){cinemas++;if(music)ramp(music.gain,0,.1);let released=false;return ()=>{if(released)return;released=true;cinemas=Math.max(0,cinemas-1);if(music)ramp(music.gain,cinemas?0:.85,.5);};}
 return {holdMusic,unlock,load,play,track,stopAll,setEnabled,setScene,resumeMusic:syncMusic,get enabled(){return enabled;},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}};
}
export const soundButton=()=>'<button type="button" class="mine-sound-toggle" data-sound aria-label="음향 끄기" aria-pressed="true"><span aria-hidden="true">♫</span><small>소리 켜짐</small></button>';
