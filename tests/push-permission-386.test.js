import test from 'node:test';
import assert from 'node:assert/strict';
import {pushPermission,waitPushStep} from '../src/core/push-permission.js';
import fs from 'node:fs';
import vm from 'node:vm';
test('already allowed permission does not open another browser prompt',async()=>{
 let calls=0;assert.equal(await pushPermission({permission:'granted',requestPermission(){calls++;}}),'granted');assert.equal(calls,0);
});
test('browser prompt is invoked synchronously during the click, with promise and callback support',async()=>{
 let invoked=false;const pending=pushPermission({permission:'default',requestPermission(callback){invoked=true;queueMicrotask(()=>callback('granted'));}},{timeoutMs:100});assert.equal(invoked,true);assert.equal(await pending,'granted');
 assert.equal(await pushPermission({permission:'default',requestPermission:()=>Promise.resolve('denied')}),'denied');
});
test('unanswered browser prompt and hung subscription terminate with stage-specific errors',async()=>{
 await assert.rejects(pushPermission({permission:'default',requestPermission:()=>new Promise(()=>{})},{timeoutMs:5}),/PUSH_PERMISSION_TIMEOUT/);
 await assert.rejects(waitPushStep(new Promise(()=>{}),'PUSH_SUBSCRIBE_TIMEOUT',5),/PUSH_SUBSCRIBE_TIMEOUT/);
});
test('late browser reply after a timeout cannot complete another operation',async()=>{
 let answer;const pending=pushPermission({permission:'default',requestPermission(cb){answer=cb;}},{timeoutMs:5});await assert.rejects(pending,/PUSH_PERMISSION_TIMEOUT/);answer('granted');assert.equal(await waitPushStep(Promise.resolve('next'),'TIMEOUT',20),'next');
});
test('Samsung subscription stall shows its actual stage and restores the enable button',async()=>{
 const fields=new Map();const field=key=>{if(!fields.has(key))fields.set(key,{textContent:'',dataset:{},handlers:{},addEventListener(e,fn){this.handlers[e]=fn;}});return fields.get(key);};
 const root={querySelector:field},notification={permission:'granted',requestPermission(){throw Error('must not prompt again');}};
 const registration={pushManager:{getSubscription:async()=>null,subscribe:()=>new Promise(()=>{})}};
 const source=fs.readFileSync(new URL('../src/ui/web-push-settings.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
 const context={document:{querySelector:()=>root},navigator:{userAgent:'SamsungBrowser Android',serviceWorker:{register:async()=>registration,ready:Promise.resolve(registration)}},Notification:notification,window:{PushManager:{},Notification:notification},isSecureContext:true,matchMedia:()=>({matches:false}),fetch:async()=>({ok:true,json:async()=>({ok:true,publicKey:'AQID'})}),AbortController,setTimeout,clearTimeout,DOMException,Uint8Array,atob,Error,pushPermission,waitPushStep:(p,code)=>waitPushStep(p,code,10)};
 vm.runInNewContext(source,context);await new Promise(r=>setTimeout(r,0));
 assert.equal(field('[data-push-enable]').disabled,false);
 const clicking=field('[data-push-enable]').handlers.click();await new Promise(r=>setTimeout(r,0));
 assert.match(field('[data-push-result]').textContent,/푸시 서비스에 기기를 등록/);await clicking;
 assert.match(field('[data-push-result]').textContent,/기기 등록 시간 초과/);assert.equal(field('[data-push-enable]').disabled,false);assert.match(field('[data-push-status]').textContent,/권한은 허용됨/);
});
