import test from 'node:test';
import assert from 'node:assert/strict';
import {mountEye} from '../mine/eye.js';
function element(){return {hidden:false,disabled:false,textContent:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];}};}
for(const won of [true,false])test(`terminal ${won?'success':'failure'} cannot restart the game`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const oldWindow=globalThis.window;globalThis.window={innerWidth:1000,addEventListener(){},removeEventListener(){}};
 const nodes=new Map();let click;const host={querySelector:s=>{if(!nodes.has(s))nodes.set(s,element());return nodes.get(s);},addEventListener:(n,fn)=>click=fn,removeEventListener(){}};
 const board=host.querySelector('.eye-board');Object.defineProperty(board,'innerHTML',{set(){board.children=Array.from({length:20},(_,i)=>Object.assign(element(),{dataset:{eyeCard:String(i)}}));}});
 let requests=0;const start=host.querySelector('[data-eye-start]');let cleanup;
 const tap=node=>click({target:{closest:s=>s==='[data-eye-start]'&&node===start&&!node['data-panel']?node:s==='[data-eye-card]'&&node!==start?node:null}});
 try{cleanup=mountEye(host,{accept(){},audio:{play(){},unlock:async()=>{}},request:async()=>({ok:true,result:{eye:++requests===1?{id:'run',round:3,found:won?2:0,targets:[0],swaps:[],done:false}:{id:'run',round:3,found:won?3:0,done:true,won,last:[{slot:0,treasure:won},{slot:1,treasure:false}]}}})});
 tap(start);await Promise.resolve();await Promise.resolve();t.mock.timers.tick(3000);await Promise.resolve();t.mock.timers.tick(400);await Promise.resolve();tap(board.children[0]);tap(board.children[1]);await Promise.resolve();await Promise.resolve();
 assert.equal(start.textContent,'월드맵으로');assert.equal(start['data-panel'],'world');tap(start);await Promise.resolve();assert.equal(requests,2);
 }finally{cleanup?.();globalThis.window=oldWindow;}
});
