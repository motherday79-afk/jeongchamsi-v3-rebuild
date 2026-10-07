import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TAXI_PASSENGERS} from '../lib/taxi-passengers.js';
import {beatAudio} from '../lib/taxi-audio.js';
import {splitDialogue,sentenceAt,DialogueReader} from '../taxi/dialogue-reader.js';
test('sixty long dialogues have 30-60 second narration and matching sentence timestamps',()=>{
 for(const p of TAXI_PASSENGERS)for(let i=0;i<p.beats.length;i++){
  const b=p.beats[i],audio=beatAudio(p,i),sentences=splitDialogue(b.text),cues=JSON.parse(fs.readFileSync(new URL('..'+audio.timingsUrl,import.meta.url),'utf8'));
  assert.ok(cues.length>=5,b.id);const end=cues.at(-1).start+cues.at(-1).duration;assert.ok(end>=30&&end<=60,`${b.id}: ${end}`);
  assert.equal(cues.map(c=>c.text).join('').replace(/\s/g,''),b.text.replace(/\s/g,''),b.id);
  for(let n=0;n<cues.length;n++){assert.ok(n===0||cues[n].start>=cues[n-1].start);const at=sentenceAt(cues,cues[n].start+.1,sentences);assert.equal(sentences[at].text.replace(/\s/g,''),cues[n].text.replace(/\s/g,''),b.id);}
 }
});
test('reader follows active sentence then releases manual scrolling without repositioning',()=>{
 const classes=new Set(),calls=[];const spans=[0,1].map(n=>({classList:{toggle(){}},getBoundingClientRect:()=>({top:100+n*140})}));
 const box={scrollTop:0,classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)},setAttribute(){},querySelectorAll:()=>spans,querySelector:()=>null,getBoundingClientRect:()=>({top:100}),scrollTo:arg=>calls.push(arg)};
 const hint={};globalThis.document={querySelector:key=>key==='#dialogue-scroll'?box:hint};
 const r=new DialogueReader();r.sentences=splitDialogue('처음 이야기예요. 다음 이야기예요.');r.cues=[{start:0,text:'처음 이야기예요.'},{start:5,text:'다음 이야기예요.'}];
 r.update({seconds:6,following:true});assert.ok(classes.has('auto-follow'));assert.equal(calls.at(-1).top,128);
 const count=calls.length;r.update({seconds:10,following:false});assert.equal(classes.has('auto-follow'),false);assert.equal(calls.length,count);assert.match(hint.textContent,/위아래/);
});
