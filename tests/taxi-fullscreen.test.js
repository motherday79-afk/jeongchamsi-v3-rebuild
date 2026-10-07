import test from 'node:test';
import assert from 'node:assert/strict';
import {bindTaxiFullscreen} from '../taxi/fullscreen.js';
test('fullscreen supports native entry/exit and falls back when browser refuses',async()=>{
 const classes=new Set(),handlers={};let clicked;
 const button={addEventListener:(name,fn)=>clicked=fn,setAttribute(){}};
 const game={requestFullscreen:async()=>{document.fullscreenElement=game;}};
 globalThis.document={fullscreenElement:null,body:{classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)}},querySelector:()=>game,getElementById:()=>button,addEventListener:(key,fn)=>handlers[key]=fn,exitFullscreen:async()=>{document.fullscreenElement=null;}};
 bindTaxiFullscreen();await clicked();assert.equal(document.fullscreenElement,game);assert.equal(button.textContent,'전체화면 닫기');await clicked();assert.equal(document.fullscreenElement,null);
 game.requestFullscreen=async()=>{throw Error('unsupported');};await clicked();assert.ok(classes.has('taxi-fullscreen'));handlers.keydown({key:'Escape'});await Promise.resolve();assert.equal(classes.has('taxi-fullscreen'),false);
});
