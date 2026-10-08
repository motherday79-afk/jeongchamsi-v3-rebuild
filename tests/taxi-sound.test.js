import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TaxiSound} from '../taxi/sound.js';
import {TAXI_PASSENGERS} from '../lib/taxi-passengers.js';
import {beatAudio,taxiVoice,greetingAudio,GREETING_LINES} from '../lib/taxi-audio.js';
test('every intro voice is present for both genders',()=>{for(const p of [TAXI_PASSENGERS[0],TAXI_PASSENGERS[1]])for(let i=0;i<GREETING_LINES.length;i++)assert.ok(fs.statSync(new URL('..'+greetingAudio(p,i).audioUrl,import.meta.url)).size>1000);});

test('courtesy follows first and final stories with distinct closing remarks',()=>{
 for(const p of TAXI_PASSENGERS){
  const first=beatAudio(p,0).comfort,last=beatAudio(p,p.beats.length-1).comfort;
  assert.equal(first.kind,'comfort');assert.equal(last.kind,'closing');assert.notEqual(first.text,last.text);
  for(let i=1;i<p.beats.length-1;i++)assert.equal(beatAudio(p,i).comfort,undefined);
  for(const line of [first,last]){
   const cues=JSON.parse(fs.readFileSync(new URL('..'+line.audioUrl.replace('.mp3','.json'),import.meta.url),'utf8'));
   const end=cues.at(-1).start+cues.at(-1).duration;
   assert.ok(end>=10&&end<=18,`${p.id} ${line.kind}: ${end}`);
   assert.equal(cues.map(c=>c.text).join('').replace(/\s/g,''),line.text.replace(/\s/g,''));
  }
 }
});
test('every dialogue and comfort has a prerecorded MP3; voices match the curated passenger roster',()=>{
 const women=new Set(['나경원','김선민','이소영','용혜인']);
 for(const p of TAXI_PASSENGERS){assert.equal(taxiVoice(p),women.has(p.name)?'F1':'M1');for(let i=0;i<p.beats.length;i++){const b=beatAudio(p,i);for(const url of [b.audioUrl,b.comfort?.audioUrl].filter(Boolean)){const buffer=fs.readFileSync(new URL('..'+url,import.meta.url));assert.ok(buffer.length>1000);assert.ok(buffer.subarray(0,3).toString()==='ID3'||buffer[0]===255);}}}
});
test('narration advances to comfort once, pauses and cancels at passenger/beat changes',async()=>{
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true,setAttribute(){}});return nodes.get(id);};
 globalThis.document={hidden:false,querySelector:node,getElementById:node};
 globalThis.localStorage={getItem:()=>null,setItem(){}};
 globalThis.Audio=class {paused=true;src='';handlers={};addEventListener(k,fn){this.handlers[k]=fn;}load(){}pause(){this.paused=true;}async play(){this.paused=false;}};
 const s=new TaxiSound();s.unlocked=true;
 const ride={id:'one',status:'active',beatIndex:0,beat:{text:'첫 이야기',audioUrl:'/first.mp3',comfort:{text:'천천히 선택해 주세요.',audioUrl:'/gentle.mp3'}}};
 s.update(ride,true);await Promise.resolve();assert.equal(s.voice.paused,false);
 s.update(ride,false);assert.equal(s.voice.paused,true);
 s.update(ride,true);await Promise.resolve();s.voice.handlers.ended();assert.equal(s.voice.src,'/gentle.mp3');assert.equal(s.showComfort,true);
 s.voice.handlers.ended();s.update(ride,true);assert.equal(s.finished,true);
 s.update({...ride,beatIndex:1,beat:{text:'다음',audioUrl:'/second.mp3'}},true);await Promise.resolve();assert.equal(s.showComfort,false);assert.equal(s.voice.src,'/second.mp3');
 s.update({status:'completed'},false);assert.equal(s.voice.paused,true);assert.equal(s.beat,null);
});

test('rain stays audible while choosing or stopped, recovers interruption, and respects mute and hidden page',async()=>{
 globalThis.document={hidden:false};
 const gains=[];let resumes=0;
 const s=Object.create(TaxiSound.prototype);
 Object.assign(s,{rainOn:true,unlocked:true,ctx:{state:'running',currentTime:1,resume:async()=>{resumes++;}},rainGain:{gain:{setTargetAtTime:v=>gains.push(v)}}});
 s.updateRain(false);assert.equal(gains.at(-1),.95);
 s.updateRain(true);assert.equal(gains.at(-1),.42);
 s.updateRain(false);assert.equal(gains.at(-1),.95);
 s.ctx.state='interrupted';s.updateRain(false);await Promise.resolve();assert.equal(resumes,1);
 s.rainOn=false;s.updateRain(false);assert.equal(gains.at(-1),0);
 s.rainOn=true;document.hidden=true;s.updateRain(false);assert.equal(gains.at(-1),0);assert.equal(resumes,1);
 document.hidden=false;
});
