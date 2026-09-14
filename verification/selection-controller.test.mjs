import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import {JSDOM,VirtualConsole} from 'jsdom';

const markup='<!doctype html><html><head><style>body{user-select:none}h2{color:purple}</style></head><body><div id="app"><h2 class="itsme-signature-title">나는 이렇게 제안합니다</h2><a href="/itsme">게시판</a></div></body></html>';
async function load(){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(markup,{url:'https://www.jeongchamsi.com/?jcs_selection_check=r2',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 // These APIs require a layout engine. This test covers controller transitions,
 // preserving the app's listeners, and diagnostic event payloads, not hit-testing.
 dom.window.document.elementsFromPoint=()=>[];
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const ctx=dom.getInternalVMContext();
 const core=new vm.SourceTextModule(await fs.readFile(new URL('../jcs-touch-check/selection-core.mjs',import.meta.url),'utf8'),{context:ctx});
 const main=new vm.SourceTextModule(await fs.readFile(new URL('../jcs-touch-check/selection.mjs',import.meta.url),'utf8'),{context:ctx});
 await core.link(()=>{});await main.link(()=>core);await main.evaluate();
 return {dom,errors,bar:()=>dom.window.document.querySelector('[data-jcs-selection-host]')?.shadowRoot};
}
async function until(fn){for(let i=0;i<50;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('diagnostic did not reach the expected state');}

test('records a normal click without cancelling it, then restores the original policy for the countercheck',async()=>{
 const {dom,errors,bar}=await load();
 try{
  await until(()=>bar()?.querySelector('[data-answer=no]')?.disabled===false);
  assert.equal(dom.window.getComputedStyle(dom.window.document.body).userSelect,'text');
  assert.equal(dom.window.document.querySelector('style').textContent,'body{user-select:none}h2{color:purple}');
  let calls=0;const h2=dom.window.document.querySelector('h2');h2.addEventListener('click',()=>calls++);
  const e=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});h2.dispatchEvent(e);
  assert.equal(calls,1);assert.equal(e.defaultPrevented,false);
  bar().querySelector('[data-answer=no]').click();
  await until(()=>bar()?.querySelector('[data-phase]')?.textContent.includes('원래 설정')&&bar().querySelector('[data-answer=yes]').disabled===false);
  assert.equal(dom.window.getComputedStyle(dom.window.document.body).userSelect,'none');
  bar().querySelector('[data-answer=yes]').click();
  await until(()=>bar()?.querySelector('[data-copy]')?.hidden===false);
  const data=JSON.parse(dom.window.sessionStorage.getItem('jcs-selection-check-r2:report'));
  assert.deepEqual(data.results,{selection:'no',original:'yes'});
  const click=data.events.find(x=>x.kind==='click'&&x.isTitle);
  assert.equal(click.link,null);assert.equal(click.mode,'selection');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('a failed selection-only trial ends without claiming a fix and returns original body policy',async()=>{
 const {dom,errors,bar}=await load();
 try{
  await until(()=>bar()?.querySelector('[data-answer=yes]')?.disabled===false);
  bar().querySelector('[data-answer=yes]').click();
  await until(()=>bar()?.querySelector('[data-copy]')?.hidden===false);
  assert.equal(dom.window.getComputedStyle(dom.window.document.body).userSelect,'none');
  const data=JSON.parse(dom.window.sessionStorage.getItem('jcs-selection-check-r2:report'));
  assert.deepEqual(data.results,{selection:'yes'});
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
