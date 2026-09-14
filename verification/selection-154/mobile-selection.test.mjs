import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const CSSOM=require('rrweb-cssom');
const {JSDOM}=require('jsdom');
const media=require('css-mediaquery');
const css=await fs.readFile(new URL('../../css/hotfix-31-36-main-shell-footer.css',import.meta.url),'utf8');

// JSDOM has no viewport layout engine. Resolve media conditions with the CSS
// media-query parser, then use its CSS cascade to evaluate the real body rules.
// This catches a wrong input-device condition, missed vendor property, or an
// override later in the actual stylesheet. It does not emulate Android intents.
function bodyPolicy(features){
 const dom=new JSDOM('<!doctype html><html><head></head><body><h2>제목</h2></body></html>');
 const rules=[];
 function walk(items){for(const r of items){
  if(r.media){if(media.match(r.media.mediaText,{type:'screen',...features}))walk(r.cssRules);}
  else if(r.selectorText){let matches=false;try{matches=dom.window.document.body.matches(r.selectorText);}catch{}
   if(matches)rules.push(r.cssText);
  }
 }}
 walk(CSSOM.parse(css).cssRules);
 const style=dom.window.document.createElement('style');style.textContent=rules.join('\n');dom.window.document.head.append(style);
 const standard=dom.window.getComputedStyle(dom.window.document.body).getPropertyValue('user-select');
 // JSDOM's computed style omits vendor aliases; resolve that alias from the
 // same matched declaration list rather than claiming device validation.
 let webkit='';for(const r of CSSOM.parse(style.textContent).cssRules){const v=r.style.getPropertyValue('-webkit-user-select');if(v)webkit=v;}
 dom.window.close();return {standard,webkit};
}
for(const width of ['368px','707px','1384px'])test('touch input permits body selection at width '+width,()=>{
 assert.deepEqual(bodyPolicy({width,hover:'none',pointer:'coarse','any-pointer':'coarse'}),{standard:'text',webkit:'text'});
});
test('touch device with a mouse still permits body selection',()=>{
 assert.deepEqual(bodyPolicy({width:'1384px',hover:'hover',pointer:'fine','any-pointer':'coarse'}),{standard:'text',webkit:'text'});
});
test('non-hover input gets the safe selection policy even without coarse-pointer reporting',()=>{
 assert.deepEqual(bodyPolicy({width:'400px',hover:'none',pointer:'none','any-pointer':'none'}),{standard:'text',webkit:'text'});
});
test('mouse-only desktop preserves its selection policy at narrow and wide widths',()=>{
 for(const width of ['368px','1440px'])assert.deepEqual(bodyPolicy({width,hover:'hover',pointer:'fine','any-pointer':'fine'}),{standard:'none',webkit:'none'});
});
