import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {bindHomeInstall} from '../src/ui/home-install.js';
test('installation request is retained before the main application loads and cleared on installation',()=>{
 const events={},changes=[];const window={addEventListener:(k,f)=>events[k]=f,dispatchEvent:e=>changes.push(e.type)};
 vm.runInNewContext(fs.readFileSync(new URL('../install-bootstrap.js',import.meta.url),'utf8'),{window,CustomEvent:class{constructor(type){this.type=type;}}});
 let prevented=false;const request={preventDefault(){prevented=true;},prompt(){}};events.beforeinstallprompt(request);
 assert.equal(prevented,true);assert.equal(window.jcsInstall.event,request);assert.equal(changes[0],'jcs:install-ready');
 events.appinstalled();assert.equal(window.jcsInstall.event,null);assert.equal(window.jcsInstall.installed,true);
});
test('ready install offer opens immediately from click without an instruction dialog',async()=>{
 const originalWindow=globalThis.window,originalMatch=globalThis.matchMedia;
 let clicked,opened=0;const button={disabled:false,querySelector:()=>null};
 globalThis.window={jcsInstall:{event:{prompt(){opened++;return Promise.resolve({outcome:'accepted'});}},installed:false},addEventListener(){}};globalThis.matchMedia=()=>({matches:false});
 try{bindHomeInstall({addEventListener:(name,fn)=>{clicked=fn;}});clicked({target:{closest:()=>button}});assert.equal(opened,1);assert.equal(button.disabled,true);assert.equal(window.jcsInstall.event,null);await new Promise(r=>setTimeout(r,0));assert.equal(button.disabled,false);}finally{globalThis.window=originalWindow;globalThis.matchMedia=originalMatch;}
});
