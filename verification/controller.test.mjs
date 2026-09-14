import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import {JSDOM,VirtualConsole} from 'jsdom';

const main=await fs.readFile(new URL('../jcs-touch-check/check.mjs',import.meta.url),'utf8');
const core=await fs.readFile(new URL('../jcs-touch-check/core.mjs',import.meta.url),'utf8');
const markup='<!doctype html><html lang="ko"><head><style>h2{color:purple}</style></head><body class="original-body"><div id="app"><h2 class="itsme-signature-title" style="color:purple">나는 이렇게 제안합니다</h2><a href="mailto:contact@example.com">문의</a></div></body></html>';
async function load(html,query,storage={}){
 const errors=[]; const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://www.jeongchamsi.com/'+query,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 for(const [k,v] of Object.entries(storage))dom.window.sessionStorage.setItem(k,v);
 // JSDOM has no layout engine. Geometry is not part of this controller test.
 dom.window.document.elementsFromPoint=()=>[];
 const ctx=dom.getInternalVMContext();const cm=new vm.SourceTextModule(core,{context:ctx,identifier:'core.mjs'});
 const mod=new vm.SourceTextModule(main,{context:ctx,identifier:'check.mjs'});
 await cm.link(()=>{});await mod.link(()=>cm);await mod.evaluate();
 return {dom,errors};
}
async function waitFor(fn){for(let i=0;i<40;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('controller did not become ready');}
test('baseline creates a static snapshot and records title taps without cancelling them',async()=>{
 const {dom,errors}=await load(markup,'?jcs_touch_check=base');
 try{
  await waitFor(()=>dom.window.sessionStorage.getItem('jcs-touch-check-r1:snapshot'));
  const title=dom.window.document.querySelector('h2');let nativeClickCount=0;
  title.addEventListener('click',()=>nativeClickCount++);
  const event=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});title.dispatchEvent(event);
  assert.equal(nativeClickCount,1);assert.equal(event.defaultPrevented,false);
  const report=JSON.parse(dom.window.sessionStorage.getItem('jcs-touch-check-r1:report'));
  assert.equal(report.attempts[0].events.at(-1).isItsmeTitle,true);
  assert.equal(report.attempts[0].events.at(-1).link,null);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
test('static case restores complete original body attributes in a fresh document without app handlers',async()=>{
 const first=await load(markup,'?jcs_touch_check=base');let stored;
 try{await waitFor(()=>first.dom.window.sessionStorage.getItem('jcs-touch-check-r1:snapshot'));stored=first.dom.window.sessionStorage.getItem('jcs-touch-check-r1:snapshot');}finally{first.dom.window.close();}
 const {dom,errors}=await load('<!doctype html><html data-touch-check="static"><head></head><body>loading</body></html>','jcs-touch-check/static.html',{'jcs-touch-check-r1:snapshot':stored});
 try{
  await waitFor(()=>dom.window.document.querySelector('[data-jcs-check-host]')?.shadowRoot.querySelector('[data-answer=yes]')?.disabled===false);
  assert.equal(dom.window.document.body.className,'original-body');
  assert.equal(dom.window.document.querySelectorAll('script').length,0);
  assert.equal(dom.window.document.querySelector('a').getAttribute('href'),'mailto:contact@example.com');
  assert.equal(dom.window.document.querySelector('h2').style.color,'purple');
  assert.equal(dom.window.location.pathname,'/');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
test('plain case continues to strip newly inserted styles while preserving live title listeners',async()=>{
 const {dom,errors}=await load(markup,'?jcs_touch_check=plain');
 try{
  await waitFor(()=>dom.window.document.querySelector('[data-jcs-check-host]')?.shadowRoot.querySelector('[data-answer=yes]')?.disabled===false);
  let clicks=0;dom.window.document.querySelector('h2').addEventListener('click',()=>clicks++);
  const style=dom.window.document.createElement('style');style.textContent='h2{color:red}';dom.window.document.head.append(style);
  await waitFor(()=>!dom.window.document.querySelector('style'));
  dom.window.document.querySelector('h2').click();assert.equal(clicks,1);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});
