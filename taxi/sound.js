import {passengerPose} from './passenger-motion.js?v=0.0.31.478';
import {playTaxiEffect} from './effects.js?v=0.0.31.473';

import {DialogueReader} from './dialogue-reader.js?v=0.0.31.470';
// Anonymous narration and discrete vehicle effects; no ambient audio.
export class TaxiSound {
  constructor(){
    this.reader=new DialogueReader();
    this.voice=new Audio();this.voice.preload='auto';this.voice.volume=.92;
    this.voiceOn=true;this.effectsOn=true;this.exitUntil=0;this.key='';this.phase='story';this.finished=false;this.elapsed=0;this.last=performance.now();
    try{const p=JSON.parse(localStorage.getItem('jcs-taxi-sound')||'null');if(p){this.voiceOn=p.voice!==false;this.effectsOn=p.effects!==false;}}catch{}
    this.voice.addEventListener('ended',()=>this.next());
    this.voice.addEventListener('error',()=>{this.failed=true;this.starting=false;this.status('음성을 불러오지 못했어요. 다시 듣기를 눌러 주세요.');});
  }
  status(text){document.querySelector('#audio-status').textContent=text;}
  save(){try{localStorage.setItem('jcs-taxi-sound',JSON.stringify({voice:this.voiceOn,effects:this.effectsOn}));}catch{}}
  stopEffects(){this.cancelEffect?.();this.cancelEffect=null;this.exitUntil=0;}
  effect(kind){this.stopEffects();if(document.hidden)return;if(kind==='exit')this.exitUntil=performance.now()+1450;try{if(this.ctx&&this.effectsOn)this.cancelEffect=playTaxiEffect(this.ctx,kind);}catch{/* Audio availability must not interrupt a saved ride action. */}}
  unlock(){
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(Context){
        this.ctx=new Context();
      }
    }
    if(this.ctx?.state==='suspended')void this.ctx.resume().catch(()=>{});
    if(!this.unlocked){
      this.unlocked=true;
      // Unlock this same media element on the user's start tap (mobile autoplay policy).
      if(!this.voice.src){this.voice.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';void this.voice.play().catch(()=>{});}
    }
    this.failed=false;
  }
  toggle(kind){this.unlock();if(kind==='effects'){this.effectsOn=!this.effectsOn;if(!this.effectsOn)this.stopEffects();}else {this.voiceOn=!this.voiceOn;if(!this.voiceOn)this.voice.pause();}this.save();this.buttons();}
  buttons(){for(const [id,on,label] of [['voice-toggle',this.voiceOn,'대사 음성'],['effects-toggle',this.effectsOn,'효과음']]){const b=document.getElementById(id);if(!b)continue;b.textContent=label+(on?' 켜짐':' 꺼짐');b.setAttribute('aria-pressed',String(on));}}
  load(url){this.voice.pause();this.voice.src=url;this.voice.load();this.failed=false;this.starting=false;}
  next(){if(!this.beat||!this.key)return;if(this.phase==='story'&&this.beat.comfort){this.phase='comfort';this.showComfort=true;this.load(this.beat.comfort.audioUrl);}else this.finished=true;}
  replay(){this.unlock();if(!this.beat)return;this.phase='story';this.finished=false;this.elapsed=0;this.showComfort=false;this.voiceOn=true;this.load(this.beat.audioUrl);this.save();}
  introReady(ride){
    if(ride?.phase!=='intro'||this.key!==ride.id+':intro:'+ride.beatIndex)return false;
    return this.finished||((!this.voiceOn||this.failed)&&this.elapsed>=Math.max(5000,(this.beat?.text?.length||0)*115));
  }
  update(ride,playing){
    const at=performance.now(),delta=Math.min(500,at-this.last);this.last=at;
    if(document.hidden)this.stopEffects();
    const key=ride?.status==='active'?ride.id+':'+(ride.phase||'story')+':'+ride.beatIndex:'';
    if(key!==this.key){this.key=key;this.voice.pause();this.beat=key?ride.beat:null;this.phase='story';this.finished=false;this.showComfort=false;this.elapsed=0;this.failed=false;if(this.beat?.audioUrl)this.load(this.beat.audioUrl);}
    this.playing=!!playing;
    if(!playing||!this.voiceOn||!key)this.voice.pause();
    if(playing&&key){
      if(!this.voiceOn||this.failed){this.elapsed+=delta;if(this.elapsed>Math.max(5000,(this.beat.text?.length||0)*115))this.showComfort=true;}
      if(this.voiceOn&&this.unlocked&&!this.finished&&!this.failed&&!this.starting&&this.voice.paused){
        this.starting=true;const current=this.key;
        void this.voice.play().then(()=>{this.starting=false;if(current!==this.key||!this.playing||!this.voiceOn)this.voice.pause();}).catch(()=>{this.starting=false;if(current===this.key){this.failed=true;this.status('대사 음성을 들으려면 다시 듣기를 눌러 주세요.');}});
      }
    }
    const passenger=document.querySelector('#passenger-body');
    if(passenger)passenger.dataset.pose=passengerPose({active:ride?.status==='active',playing:playing&&!document.hidden,speaking:this.voiceOn&&!this.voice.paused&&!this.finished&&!this.failed,intro:ride?.phase==='intro',seconds:this.voice.currentTime,cues:this.phase==='story'?this.reader.cues:[]});
    const gentle=document.querySelector('#gentle-line');if(gentle){gentle.hidden=!this.showComfort;gentle.textContent=this.beat?.comfort?.text||'';}
    if(!this.failed)this.status(playing&&this.voiceOn&&!this.finished?'승객의 이야기를 듣는 중':'편하게 생각하시고 선택하세요.');
    this.reader.setBeat(this.beat);
    this.reader.update({seconds:this.voice.currentTime,following:playing&&this.voiceOn&&!this.finished&&!this.failed&&!this.voice.paused,comfort:this.phase==='comfort'});
    this.buttons();
  }
}
