import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMineAudio} from '../mine/audio.js';
function setup(saved='on'){
 const values=new Map([['jcs.mine.sound',saved]]),sources=[];let hidden=false;
 const ctx={state:'running',currentTime:0,destination:{},resume:async()=>{},decodeAudioData:async()=>({duration:5}),createGain:()=>({gain:{value:0},connect(){}}),createBufferSource:()=>{const s={connect(){},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(s);return s;}};
 const audio=createMineAudio({storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},createContext:()=>ctx,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),hidden:()=>hidden});
 return {audio,values,sources,hide:()=>hidden=true};
}
test('sound waits for gesture, remembers mute and stops active voices immediately',async()=>{
 const {audio,values,sources}=setup();audio.play('strike');assert.equal(sources.length,0);
 await audio.unlock();await audio.load('strike');audio.play('strike');assert.equal(sources.length,1);
 audio.setEnabled(false);assert.equal(sources[0].stopped,true);assert.equal(values.get('jcs.mine.sound'),'off');
 audio.play('strike');assert.equal(sources.length,1);
});
test('hidden pages cannot start sound and unavailable browser audio is harmless',async()=>{
 const {audio,hide,sources}=setup();await audio.unlock();await audio.load('strike');hide();audio.play('strike');assert.equal(sources.length,0);
 const broken=createMineAudio({storage:{getItem(){throw Error();}},createContext(){throw Error();}});await broken.unlock();assert.doesNotThrow(()=>broken.play('tap'));
});
test('cinema soundtrack follows playback, waits when buffering, and is removed on exit',async()=>{
 const {audio,sources}=setup();await audio.unlock();await audio.load('success');
 const video=new EventTarget();Object.assign(video,{paused:false,ended:false,currentTime:1});
 const release=audio.track(video,'success');video.dispatchEvent(new Event('playing'));assert.equal(sources.length,1);
 video.dispatchEvent(new Event('waiting'));assert.equal(sources[0].stopped,true);
 video.dispatchEvent(new Event('playing'));assert.equal(sources.length,2);
 release();assert.equal(sources[1].stopped,true);video.dispatchEvent(new Event('playing'));assert.equal(sources.length,2);
});
