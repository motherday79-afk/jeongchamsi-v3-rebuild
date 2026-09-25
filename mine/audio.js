// One gain bus for every sound. Device media volume remains controlled by the OS.
const ASSETS='/assets/mine/media-311/';
const NAMES=['tap','strike','gain','upgrade','full','collect','scratch','loss','success','failure'];
export function createMineAudio({storage,createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),fetcher=(...args)=>fetch(...args),hidden=()=>document.hidden}={}){
 let enabled=true,ctx=null,bus=null,unlocked=false;
 try{storage=storage||localStorage;enabled=storage.getItem('jcs.mine.sound')!=='off';}catch{}
 const buffers=new Map(),loading=new Map(),voices=new Set(),listeners=new Set();
 function stopAll(){for(const stop of [...voices])stop();}
 function setEnabled(value){enabled=!!value;if(!enabled)stopAll();try{storage?.setItem('jcs.mine.sound',enabled?'on':'off');}catch{}for(const fn of listeners)fn(enabled);}
 async function load(name){
  if(!ctx||!NAMES.includes(name))return null;
  if(buffers.has(name))return buffers.get(name);
  if(!loading.has(name))loading.set(name,(async()=>{try{const r=await fetcher(ASSETS+name+'.m4a');if(!r.ok)return null;const b=await ctx.decodeAudioData(await r.arrayBuffer());buffers.set(name,b);return b;}catch{return null;}finally{loading.delete(name);}})());
  return loading.get(name);
 }
 async function unlock(){
  try{if(!ctx){ctx=createContext();bus=ctx.createGain();bus.gain.value=.65;bus.connect(ctx.destination);}await ctx.resume();unlocked=ctx.state==='running';if(unlocked)for(const name of NAMES)void load(name);}catch{unlocked=false;}
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
  let release=null,disposed=false,buffering=false;
  const stop=()=>{release?.();release=null;};
  const sync=()=>{if(disposed||buffering||video.paused||video.ended||hidden()||!enabled){stop();return;}if(!release&&buffers.has(name)&&unlocked&&ctx.state==='running')release=play(name,{offset:video.currentTime});};
  const wait=()=>{buffering=true;stop();};const playing=()=>{buffering=false;sync();};const seek=()=>{stop();};
  const events={playing,timeupdate:sync,pause:stop,waiting:wait,seeking:seek,seeked:playing,ended:stop};
  for(const [event,fn] of Object.entries(events))video.addEventListener(event,fn);
  const onToggle=()=>{stop();sync();};listeners.add(onToggle);void load(name).then(sync);
  return ()=>{disposed=true;stop();listeners.delete(onToggle);for(const [event,fn] of Object.entries(events))video.removeEventListener(event,fn);};
 }
 return {unlock,load,play,track,stopAll,setEnabled,get enabled(){return enabled;},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}};
}
export const soundButton=()=>'<button type="button" class="mine-sound-toggle" data-sound aria-label="음향 끄기" aria-pressed="true"><span aria-hidden="true">♫</span><small>소리 켜짐</small></button>';
