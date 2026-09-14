import test from 'node:test';
import assert from 'node:assert/strict';
import { setupNowCarousel, setupLayoutNavigation, setupDetail47Interactions } from '../src/ui/interactions.js';

// DOM listener tables are deliberately not cloned; cached HTML restores only
// attributes. This is the boundary used by createNavigation's innerHTML restore.
function node(dataset={}) {
  return {dataset:{...dataset},lists:{},queries:{},listeners:new Map(),children:[],
    querySelector(selector){return this.queries[selector]||null;},
    querySelectorAll(selector){return this.lists[selector]||[];},
    addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);},
    setAttribute(name,value){(this.attrs??={})[name]=value;},
    fire(type,extra={}){const event={target:this,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};for(const fn of this.listeners.get(type)||[])fn(event);return event;}
  };
}
function carousel(restored=false) {
  const root=node(),box=node(),set=node({pageSize:'10',total:'2'}),track=node(restored?{freeScrollReady:'true'}:{}),page=node();
  page.children=[node(),node()];
  root.queries['[data-now-rank-carousel]']=box;box.lists['[data-now-rank-set]']=[set];
  set.lists['[data-now-rank-page]']=[page];set.queries['.now-rank-pages']=track;
  return {root,track};
}
function mobile(t) {
  const previous=Object.getOwnPropertyDescriptor(globalThis,'matchMedia');
  globalThis.matchMedia=()=>({matches:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'matchMedia',previous);else delete globalThis.matchMedia;});
}
for(const restored of [false,true]) {
  test(`${restored?'restored':'fresh'} NOW track suppresses navigation at the end of a drag`,t=>{
    mobile(t);const {root,track}=carousel(restored);setupNowCarousel(root);
    track.fire('pointerdown',{clientX:300,clientY:200});
    track.fire('pointermove',{clientX:140,clientY:200});track.fire('pointerup');
    const click=track.fire('click');assert.equal(click.prevented,true);assert.equal(click.stopped,true);
  });
}
test('rebinding the same live track neither duplicates guards nor blocks ordinary taps',t=>{
  mobile(t);const {root,track}=carousel(true);setupNowCarousel(root);setupNowCarousel(root);
  track.fire('pointerdown',{clientX:40,clientY:20});track.fire('pointerup');
  assert.equal(track.fire('click').prevented,undefined);
  assert.equal(track.listeners.get('pointerdown')?.length,1);
});
test('a restored internal card still emits only its internal route',t=>{
  const root=node(),card=node({layoutRoute:'/person/metropolitan-001'}),events=[];
  card.closest=selector=>selector==='[data-layout-route]'?card:null;
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  globalThis.window={dispatchEvent:event=>events.push(event)};
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;});
  setupLayoutNavigation(root);setupLayoutNavigation(root);
  const event=root.fire('click',{target:card});
  assert.equal(event.prevented,true);assert.deepEqual(events.map(e=>e.detail.route),['/person/metropolitan-001']);
});
test('restored local-topic buttons update evidence instead of keeping stale selection',()=>{
  const root=node(),block=node({detail47Ready:'true'}),a=node({lifeTopic:'0'}),b=node({lifeTopic:'1'}),first=node({lifeEvidence:'0'}),second=node({lifeEvidence:'1'});
  root.lists['.jcs-local-47']=[block];block.lists['[data-life-topic]']=[a,b];block.lists['[data-life-evidence]']=[first,second];
  b.closest=()=>b;setupDetail47Interactions(root);setupDetail47Interactions(root);
  block.fire('click',{target:b});assert.equal(first.hidden,true);assert.equal(second.hidden,false);assert.equal(b.attrs['aria-pressed'],'true');
  assert.equal(block.listeners.get('click').length,1);
});
test('restored lifecycle select switches the visible panel',()=>{
  const root=node(),block=node({detail47Ready:'true'}),select=node(),first=node({lifePanel:'24H'}),second=node({lifePanel:'7D'});
  root.lists['.jcs-lifecycle-47']=[block];block.queries['[data-life-select]']=select;block.lists['[data-life-panel]']=[first,second];
  setupDetail47Interactions(root);select.value='7D';select.fire('change');
  assert.equal(first.hidden,true);assert.equal(second.hidden,false);
});

test('search logo reloads the current page once after navigation rebinding',t=>{
 const root=node(),logo=node(),events=[];let reloads=0;
 logo.closest=selector=>selector==='[data-page-reload]'?logo:null;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 globalThis.window={location:{pathname:'/search',search:'?q=test',reload(){reloads++;}},dispatchEvent:event=>events.push(event)};
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;});
 setupLayoutNavigation(root);setupLayoutNavigation(root);
 const event=root.fire('click',{target:logo});
 assert.equal(event.prevented,true);assert.equal(reloads,1);assert.equal(events.length,0);
 assert.equal(globalThis.window.location.pathname,'/search');
 assert.equal(globalThis.window.location.search,'?q=test');
});
