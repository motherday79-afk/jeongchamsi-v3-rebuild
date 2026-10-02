import test from 'node:test';
import assert from 'node:assert/strict';
import {homeInstallGuide,renderMyDeviceMenu} from '../src/ui/home-install.js';
test('installation instructions match Safari, Samsung Internet and Chrome',()=>{
 assert.match(homeInstallGuide({userAgent:'iPhone Safari'}),/공유/);
 assert.match(homeInstallGuide({userAgent:'SamsungBrowser Android'}),/현재 페이지 추가/);
 assert.match(homeInstallGuide({userAgent:'Chrome Android'}),/⋮/);
 assert.match(homeInstallGuide({userAgent:'KAKAOTALK Android'}),/다른 브라우저/);
 assert.match(homeInstallGuide({standalone:true}),/이미 홈 화면/);
});
test('My Page puts notification and install actions together with separate accessible controls',()=>{
 const html=renderMyDeviceMenu();assert.match(html,/href="\/notifications"/);assert.match(html,/<button[^>]+data-home-install/);assert.match(html,/홈 화면에 정참시 추가/);assert.doesNotMatch(html,/<a[^>]*>[\s\S]*<button[\s\S]*<\/a>/);
});
test('existing update-push APKs retain their native notification settings after web push rollout',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 try{
  for(const version of [345,348,382,383]){
   Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:`Android JCSAndroid/1.1.${version}`}});
   assert.match(renderMyDeviceMenu(),/href="jcs-push:\/\/settings"/,`APK ${version}`);
  }
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Android Chrome SamsungBrowser'}});
  assert.match(renderMyDeviceMenu(),/href="\/notifications"/);
 }finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
});
