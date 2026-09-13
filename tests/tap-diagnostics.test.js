import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticDestination, observeTapEvents, setupTapDiagnostics, formatTapDiagnosticRecord } from '../src/ui/tap-diagnostics.js';

const base='https://www.jeongchamsi.com/';
test('reports internal destinations without recording searches or credentials',()=>{
  assert.equal(diagnosticDestination('/person/metropolitan-001?q=secret#private',base),'/person/metropolitan-001');
  assert.equal(diagnosticDestination('/search?q=secret',base),'/search');
  assert.equal(diagnosticDestination('https://user:secret@external.example/private?token=secret',base),'https://external.example');
  assert.equal(diagnosticDestination('mailto:private@example.com?body=secret',base),'mailto:[주소 생략]');
  assert.equal(diagnosticDestination('tel:01012345678',base),'tel:[주소 생략]');
  assert.equal(diagnosticDestination('intent://private#Intent;S.token=secret;end',base),'intent:[주소 생략]');
});

// DOM boundaries: real EventTarget dispatch and real production observers.
class Node extends EventTarget {
  constructor(tag,attrs={},parent=null){super();this.nodeType=1;this.tagName=tag.toUpperCase();this.attrs=attrs;this.parentElement=parent;this.classList=(attrs.class||'').split(' ').filter(Boolean);this.attributes=Object.keys(attrs).map(name=>({name}));this.open=false;}
  getAttribute(name){return this.attrs[name]??null;}
  closest(selector){for(let node=this;node;node=node.parentElement){if(selector==='a[href],area[href]'&&['A','AREA'].includes(node.tagName)&&node.attrs.href!=null)return node;if(selector==='[data-layout-route]'&&node.attrs['data-layout-route']!=null)return node;if(selector==='[data-jcs-tap-diagnostics]'&&node.attrs['data-jcs-tap-diagnostics']!=null)return node;if(selector==='details'&&node.tagName==='DETAILS')return node;}return null;}
}
function harness(){
 const doc=new EventTarget(),win=new EventTarget(),rows=[];
 doc.baseURI=base;doc.elementsFromPoint=()=>[];
 win.location=new URL(base);win.innerWidth=412;win.innerHeight=915;win.navigator={userAgent:'SamsungBrowser/28.0 test'};
 const stop=observeTapEvents(doc,win,row=>rows.push(row));
 const fire=(type,node,extra={})=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'target',{value:node});Object.defineProperty(e,'composedPath',{value:()=>[node,doc,win]});for(const [k,v] of Object.entries(extra))Object.defineProperty(e,k,{value:v});doc.dispatchEvent(e);return e;};
 return {doc,win,rows,stop,fire};
}
test('captures a tap and overlapping link without cancelling native or application actions',async()=>{
 const h=harness(),mail=new Node('a',{href:'mailto:private@example.com'}),card=new Node('article',{'data-layout-route':'/person/metropolitan-001',class:'rank-top-card'});
 h.doc.elementsFromPoint=()=>[mail,card];
 const event=h.fire('click',mail,{clientX:80,clientY:300});
 await Promise.resolve();
 assert.equal(event.defaultPrevented,false);
 assert.equal(h.rows[0].link,'mailto:[주소 생략]');
 assert.ok(h.rows[0].hitStack.some(row=>row.route==='/person/metropolitan-001'));
 assert.equal(h.rows[0].type,'click');h.stop();
});
test('distinguishes a native disclosure from a link and reports its toggle',()=>{
 const h=harness(),details=new Node('details'),summary=new Node('summary',{},details);
 h.fire('pointerup',summary,{clientX:50,clientY:240,pointerType:'touch'});
 details.open=true;h.fire('toggle',details);
 assert.equal(h.rows[0].link,'');assert.equal(h.rows[0].route,'');
 assert.equal(h.rows[1].type,'toggle');assert.equal(h.rows[1].open,true);h.stop();
});
test('records application route requests and the page following a click',async()=>{
 const h=harness(),card=new Node('article',{'data-layout-route':'/person/metropolitan-001'});
 h.fire('click',card);
 const event=new Event('jcs:layout-route');Object.defineProperty(event,'detail',{value:{route:'/person/metropolitan-001?q=secret'}});h.win.dispatchEvent(event);
 h.win.location=new URL('/person/metropolitan-001',base);await new Promise(resolve=>setTimeout(resolve,0));
 assert.ok(h.rows.some(row=>row.type==='route'&&row.route==='/person/metropolitan-001'));
 assert.ok(h.rows.some(row=>row.type==='click-end'&&row.page==='/person/metropolitan-001'));h.stop();
});
test('ignores diagnostic controls and releases all listeners when closed',()=>{
 const h=harness(),panel=new Node('section',{'data-jcs-tap-diagnostics':''}),control=new Node('button',{},panel);
 h.fire('click',control);assert.equal(h.rows.length,0);h.stop();
 h.fire('pointerup',new Node('button'));assert.equal(h.rows.length,0);
});
test('a failing diagnostic sink never blocks the click',()=>{
 const h=harness();h.stop();
 const stop=observeTapEvents(h.doc,h.win,()=>{throw new Error('panel failure');});
 const event=h.fire('click',new Node('button'));assert.equal(event.defaultPrevented,false);stop();
});
test('ordinary visits do not inspect the DOM or attach diagnostics',()=>{
 const forbidden=new Proxy({},{get(){throw new Error('ordinary visits must stay untouched');}});
 assert.equal(setupTapDiagnostics(forbidden,{location:new URL(base)}),null);
});
test('a cancelled touch still exposes the link and overlap in the visible report',()=>{
 const h=harness(),mail=new Node('a',{href:'mailto:private@example.com'}),card=new Node('article',{'data-layout-route':'/person/metropolitan-001'});
 h.doc.elementsFromPoint=()=>[mail,card];
 h.fire('pointerdown',mail,{clientX:80,clientY:300,pointerType:'touch'});
 h.fire('pointercancel',mail,{clientX:80,clientY:300,pointerType:'touch'});
 for(const row of h.rows){const report=formatTapDiagnosticRecord(row);assert.ok(report.includes('mailto:[주소 생략]'));assert.ok(report.includes('/person/metropolitan-001'));assert.ok(!report.includes('private@example.com'));}
 h.stop();
});
