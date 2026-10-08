import {playTaxiEffect} from './effects.js?v=0.0.31.473';

import {DialogueReader} from './dialogue-reader.js?v=0.0.31.470';
// Prerecorded anonymous narration; rain is synthesized locally and never records the microphone.
export class TaxiSound {
  constructor(){
    this.reader=new DialogueReader();
    this.voice=new Audio();this.voice.preload='auto';this.voice.volume=.92;
    this.rainOn=true;this.voiceOn=true;this.effectsOn=true;this.exitUntil=0;this.key='';this.phase='story';this.finished=false;this.elapsed=0;this.last=performance.now();
    try{const p=JSON.parse(localStorage.getItem('jcs-taxi-sound')||'null');if(p){this.rainOn=p.rain!==false;this.voiceOn=p.voice!==false;this.effectsOn=p.effects!==false;}}catch{}
    this.voice.addEventListener('ended',()=>this.next());
    this.voice.addEventListener('error',()=>{this.failed=true;this.starting=false;this.status('음성을 불러오지 못했어요. 다시 듣기를 눌러 주세요.');});
  }
  status(text){document.querySelector('#audio-status').textContent=text;}
  save(){try{localStorage.setItem('jcs-taxi-sound',JSON.stringify({rain:this.rainOn,voice:this.voiceOn,effects:this.effectsOn}));}catch{}}
  stopEffects(){this.cancelEffect?.();this.cancelEffect=null;this.exitUntil=0;}
  effect(kind){this.stopEffects();if(document.hidden)return;if(kind==='exit')this.exitUntil=performance.now()+1450;try{if(this.ctx&&this.effectsOn)this.cancelEffect=playTaxiEffect(this.ctx,kind);}catch{/* Audio availability must not interrupt a saved ride action. */}}
  unlock(){
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(Context){
        this.ctx=new Context();const c=this.ctx;
        this.rainGain=c.createGain();this.rainGain.gain.value=0;this.rainGain.connect(c.destination);
        // A long seamless noise bed plus irregular, short roof/window droplets.
        const bed=c.createBuffer(2,c.sampleRate*12,c.sampleRate);
        for(let ch=0;ch<2;ch++){const a=bed.getChannelData(ch);let brown=0;for(let i=0;i<a.length;i++){brown=(brown+.035*(Math.random()*2-1))/1.025;a[i]=brown;}}
        const source=c.createBufferSource();source.buffer=bed;source.loop=true;
        const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=4300;source.connect(filter);filter.connect(this.rainGain);source.start();
        const drops=c.createBuffer(2,c.sampleRate*13,c.sampleRate);
        for(let ch=0;ch<2;ch++){const a=drops.getChannelData(ch);for(let start=0;start<a.length;start+=Math.floor(c.sampleRate*(.018+Math.random()*.14))){const length=Math.floor(c.sampleRate*.027);const amp=.09+Math.random()*.18;for(let i=0;i<length&&start+i<a.length;i++)a[start+i]+=(Math.random()*2-1)*amp*Math.exp(-i/(length*.14));}}
        const patter=c.createBufferSource();patter.buffer=drops;patter.loop=true;const roof=c.createBiquadFilter();roof.type='lowpass';roof.frequency.value=2600;patter.connect(roof);roof.connect(this.rainGain);patter.start();
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
  toggle(kind){this.unlock();if(kind==='rain')this.rainOn=!this.rainOn;else if(kind==='effects'){this.effectsOn=!this.effectsOn;if(!this.effectsOn)this.stopEffects();}else {this.voiceOn=!this.voiceOn;if(!this.voiceOn)this.voice.pause();}this.save();this.buttons();}
  buttons(){for(const [id,on,label] of [['rain-toggle',this.rainOn,'빗소리'],['voice-toggle',this.voiceOn,'대사 음성'],['effects-toggle',this.effectsOn,'효과음']]){const b=document.getElementById(id);if(!b)continue;b.textContent=label+(on?' 켜짐':' 꺼짐');b.setAttribute('aria-pressed',String(on));}}
  load(url){this.voice.pause();this.voice.src=url;this.voice.load();this.failed=false;this.starting=false;}
  next(){if(!this.beat||!this.key)return;if(this.phase==='story'&&this.beat.comfort){this.phase='comfort';this.showComfort=true;this.load(this.beat.comfort.audioUrl);}else this.finished=true;}
  replay(){this.unlock();if(!this.beat)return;this.phase='story';this.finished=false;this.elapsed=0;this.showComfort=false;this.voiceOn=true;this.load(this.beat.audioUrl);this.save();}
  updateRain(talking){
    if(!this.rainGain)return;
    // Ambience belongs to the visible taxi scene, including quiet decision time.
    const audible=!document.hidden&&this.rainOn&&this.unlocked;
    this.rainGain.gain.setTargetAtTime(audible?(talking?.70:.95):0,this.ctx.currentTime,.45);
    const now=performance.now();
    if(audible&&['suspended','interrupted'].includes(this.ctx.state)&&!this.rainResuming&&now>=(this.rainResumeAfter||0)){
      this.rainResuming=true;this.rainResumeAfter=now+5000;
      void this.ctx.resume().catch(()=>{}).finally(()=>{this.rainResuming=false;});
    }
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
    this.updateRain(playing&&this.voiceOn&&!this.voice.paused&&!this.finished&&!this.failed);
    const gentle=document.querySelector('#gentle-line');if(gentle){gentle.hidden=!this.showComfort;gentle.textContent=this.beat?.comfort?.text||'';}
    if(!this.failed)this.status(playing&&this.voiceOn&&!this.finished?'승객의 이야기를 듣는 중':'빗소리와 함께, 편하게 선택하세요.');
    this.reader.setBeat(this.beat);
    this.reader.update({seconds:this.voice.currentTime,following:playing&&this.voiceOn&&!this.finished&&!this.failed&&!this.voice.paused,comfort:this.phase==='comfort'});
    this.buttons();
  }
}
