import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setupHomeCompare } from '../src/ui/interactions.js';
import { renderHomeLayout } from '../src/layout/home-layout.js';
import { HOME_FIXTURE } from '../src/fixtures/home.js';
import { createHomeCompareMotion } from '../src/ui/compare-motion.js';

// DOM and WAAPI are browser boundaries. Promises are completed explicitly so a
// stale animation can finish after cancellation, just as an already-queued task can.
function stage({reduced=false,waapi=true,initialize=true}={}){
 const animations=[],pageListeners=new Map(),mediaListeners=new Map();
 const node=(name)=>({name,dataset:{},hidden:false,isConnected:true,children:[],attrs:{},
  setAttribute(key,value){this.attrs[key]=String(value);},
  append(child){this.children.push(child);},remove(){this.removed=true;},
  querySelector(selector){return this.queries?.[selector]||null;},
  querySelectorAll(selector){return this.lists?.[selector]||[];},
  ...(waapi?{animate(frames,options){let finish,reject;const finished=new Promise((resolve,no)=>{finish=resolve;reject=no;});const animation={node:this,frames,options,finished,done:false,canceled:false,finish(){this.done=true;finish();},cancel(){this.canceled=true;reject(new Error('canceled'));}};animations.push(animation);return animation;}}:{})
 });
 const slots=[0,1].map(index=>{const slot=node(`slot${index}`);slot.queries={'[data-home-compare-preview]':node(`person${index}`)};return slot;});
 const sides=[0,1].map(index=>{const side=node(`impact${index}`);side.queries=Object.fromEntries(['.matchup-cracks','.matchup-crack-lines','.matchup-shock-ring','.matchup-dust'].map(key=>[key,node(`${key}${index}`)]));side.lists={'.matchup-debris':Array.from({length:6},(_,i)=>node(`debris${index}-${i}`))};return side;});
 const effects=node('effects');effects.lists={'.matchup-impact-side':sides};effects.queries=Object.fromEntries(['.matchup-energy-left','.matchup-energy-right','.matchup-collision-core','.matchup-collision-ring'].map(key=>[key,node(key)]));
 const vs=node('vs'),form=node('form');
 form.queries={'.matchup-vs':vs};form.lists={'[data-home-compare-slot]':slots};
 const media={matches:reduced,addEventListener:(key,fn)=>mediaListeners.set(key,fn),removeEventListener:(key)=>mediaListeners.delete(key)};
 let observerCallback,disconnected=false;
 class Observer{constructor(fn){observerCallback=fn;}observe(){}disconnect(){disconnected=true;}}
 form.ownerDocument={createElement:()=>effects,documentElement:{}};
 const controller=initialize?createHomeCompareMotion(form,{matchMedia:()=>media,MutationObserver:Observer,eventTarget:{addEventListener:(key,fn)=>pageListeners.set(key,fn),removeEventListener:key=>pageListeners.delete(key)}}):null;
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
 const active=()=>animations.filter(a=>!a.done&&!a.canceled);
 const finish=async(predicate=()=>true)=>{for(const a of active().filter(predicate))a.finish();await flush();};
 const person=index=>slots[index].queries['[data-home-compare-preview]'];
 const land=async(index)=>{await finish(a=>a.node===person(index));await finish(a=>a.node===person(index)||a.node.name.endsWith(String(index))||a.node.name.startsWith(`debris${index}-`));};
 return {form,slots,vs,effects,sides,controller,animations,active,finish,flush,person,land,pageListeners,mediaListeners,
  reduce(){media.matches=true;mediaListeners.get('change')?.();},
  async detach(){form.isConnected=false;observerCallback?.();await flush();},
  disconnected:()=>disconnected};
}

test('an empty stage and a single landed politician never reveal VS',async()=>{
 const s=stage();assert.equal(s.vs.hidden,true);assert.equal(s.active().length,0);
 s.controller.select(0,'a');assert.equal(s.slots[0].dataset.compareArrival,'falling');
 await s.land(0);
 assert.equal(s.slots[0].dataset.compareArrival,'landed');assert.equal(s.vs.hidden,true);
 assert.equal(s.form.dataset.comparePhase,'waiting');assert.equal(s.active().length,0);
});

test('a descending entrant makes ground contact before cracks and recoil start',async()=>{
 const s=stage();s.controller.select(0,'a');
 const drop=s.active().find(a=>a.node===s.person(0));
 assert.ok(drop,'selection starts a descent');
 assert.match(drop.frames[0].transform,/translate\([^,]+,\s*-\d+px\)/);
 assert.equal(s.active().some(a=>a.node.name==='.matchup-cracks0'),false);
 await s.finish(a=>a===drop);
 assert.equal(s.slots[0].dataset.compareArrival,'impact');
 assert.ok(s.active().some(a=>a.node.name==='.matchup-cracks0'));
 assert.ok(s.active().some(a=>a.node.name==='debris0-0'));
 assert.equal(s.vs.hidden,true);
 await s.land(0);
 assert.equal(s.slots[0].dataset.compareArrival,'landed');
});

test('right-first and fast double selections wait for both current landings',async()=>{
 const s=stage();s.controller.select(1,'b');s.controller.select(0,'a');
 await s.land(1);
 assert.equal(s.slots[1].dataset.compareArrival,'landed');assert.equal(s.slots[0].dataset.compareArrival,'falling');
 assert.equal(s.form.dataset.comparePhase,'waiting');assert.equal(s.vs.hidden,true);
 await s.land(0);
 assert.equal(s.form.dataset.comparePhase,'converging');assert.equal(s.vs.hidden,true);
 assert.ok(s.active().some(a=>a.node.name==='.matchup-energy-left'));
 assert.ok(s.active().some(a=>a.node.name==='.matchup-energy-right'));
 await s.finish(a=>a.node.name==='.matchup-energy-left');
 assert.equal(s.vs.hidden,true,'one energy stream finishing is not a collision');
 await s.finish(a=>a.node.name==='.matchup-energy-right');
 assert.equal(s.form.dataset.comparePhase,'revealing');assert.equal(s.vs.hidden,false);
 assert.ok(s.active().some(a=>a.node===s.vs));
 await s.finish();
 assert.equal(s.form.dataset.comparePhase,'ready');assert.equal(s.active().length,0);
});

test('selecting the same current identity leaves its arrival running once',async()=>{
 const s=stage();s.controller.select(0,'a');const initial=s.animations.length;
 assert.equal(initial,1,'the first selection starts one entrant');
 s.controller.select(0,'a');assert.equal(s.animations.length,initial);
 assert.equal(s.animations.some(a=>a.canceled),false);
 await s.land(0);s.controller.select(0,'a');assert.equal(s.active().length,0);
});

test('replacing an airborne entrant cancels only that side and ignores its stale finish',async()=>{
 const s=stage();s.controller.select(0,'a');s.controller.select(1,'b');
 const old=s.active().find(a=>a.node===s.person(0));
 const right=s.active().find(a=>a.node===s.person(1));
 s.controller.select(0,'c');assert.equal(old.canceled,true);assert.equal(right.canceled,false);
 old.finish();await s.flush();assert.equal(s.slots[0].dataset.compareArrival,'falling');
 await s.land(1);assert.equal(s.vs.hidden,true);
 await s.land(0);assert.equal(s.form.dataset.comparePhase,'converging');
});

test('clearing during convergence cancels obsolete energy and keeps VS hidden',async()=>{
 const s=stage();s.controller.select(0,'a');s.controller.select(1,'b');await s.land(0);await s.land(1);
 const energy=s.active();s.controller.clear(1);
 assert.equal(s.slots[1].dataset.compareArrival,'empty');assert.equal(s.slots[0].dataset.compareArrival,'landed');
 assert.equal(s.sides[1].dataset.phase,'empty');assert.equal(s.vs.hidden,true);
 for(const a of energy){assert.equal(a.canceled,true);a.finish();}await s.flush();
 assert.equal(s.form.dataset.comparePhase,'waiting');assert.equal(s.vs.hidden,true);assert.equal(s.active().length,0);
});

test('replacement during the VS rise removes the stale reveal and restarts after landing',async()=>{
 const s=stage();s.controller.select(0,'a');s.controller.select(1,'b');await s.land(0);await s.land(1);await s.finish();
 assert.equal(s.vs.hidden,false);const reveal=s.active();
 s.controller.select(1,'c');assert.equal(s.vs.hidden,true);
 for(const a of reveal)a.finish();await s.flush();assert.equal(s.vs.hidden,true);
 await s.land(1);assert.equal(s.form.dataset.comparePhase,'converging');
 await s.finish();await s.finish();assert.equal(s.form.dataset.comparePhase,'ready');
});

for(const mode of [{reduced:true},{waapi:false}])test(`${mode.reduced?'reduced motion':'no animation API'} keeps stable selections and reveals only a complete pair`,()=>{
 const s=stage(mode);s.controller.select(1,'b');assert.equal(s.vs.hidden,true);assert.equal(s.slots[1].dataset.compareArrival,'landed');
 s.controller.select(0,'a');assert.equal(s.vs.hidden,false);assert.equal(s.form.dataset.comparePhase,'ready');assert.equal(s.animations.length,0);
 s.controller.clear(0);assert.equal(s.vs.hidden,true);
});

test('enabling reduced motion cancels current animations and settles selected profiles',async()=>{
 const s=stage();s.controller.select(0,'a');s.controller.select(1,'b');s.reduce();await s.flush();
 assert.deepEqual(s.slots.map(slot=>slot.dataset.compareArrival),['landed','landed']);
 assert.equal(s.vs.hidden,false);assert.equal(s.form.dataset.comparePhase,'ready');assert.equal(s.active().length,0);
});

test('detaching the stage cancels work, removes decoration, and disconnects lifecycle listeners',async()=>{
 const s=stage();s.controller.select(0,'a');const old=s.active()[0];await s.detach();
 assert.equal(s.active().length,0);assert.equal(s.effects.removed,true);assert.equal(s.disconnected(),true);
 assert.equal(s.pageListeners.size,0);assert.equal(s.mediaListeners.size,0);
 old.finish();await s.flush();assert.equal(s.vs.hidden,true);
 s.controller.select(1,'b');assert.equal(s.active().length,0);
});

test('pagehide cancels a current collision and leaves no live animation handles',async()=>{
 const s=stage();s.controller.select(0,'a');s.controller.select(1,'b');await s.land(0);await s.land(1);
 s.pageListeners.get('pagehide')();await s.flush();assert.equal(s.active().length,0);assert.equal(s.vs.hidden,true);
});


test('the rendered home stage starts with empty IDs and VS hidden before JavaScript runs',()=>{
 const html=renderHomeLayout(HOME_FIXTURE),form=html.match(/<form class="home-compare-form[\s\S]+?<\/form>/)?.[0];
 assert.ok(form);assert.match(form,/<span class="matchup-vs"[^>]*\shidden(?:\s|>)/);
 assert.equal((form.match(/value="" data-home-compare-id/g)||[]).length,2);
});

function picker(){
 const s=stage({initialize:false}),handlers={},state={textContent:''},submit={disabled:true};
 const changes=s.slots.map(()=>({attrs:{},setAttribute(key,value){this.attrs[key]=value;},hasAttribute:()=>false}));
 const inputs=s.slots.map(slot=>({value:'',attrs:{},focus(){this.focused=true;},select(){this.selected=true;},setAttribute(key,value){this.attrs[key]=value;},closest:selector=>selector==='[data-home-compare-search]'?inputs[s.slots.indexOf(slot)]:slot}));
 const ids=s.slots.map(()=>({value:''})),panels=s.slots.map((_,index)=>({hidden:true,querySelector:()=>inputs[index]}));
 s.slots.forEach((slot,index)=>{changes[index].closest=()=>slot;slot.lists={'[data-home-compare-change]':[changes[index]]};Object.assign(slot.queries,{'[data-home-compare-id]':ids[index],'[data-home-compare-search]':inputs[index],'[data-home-compare-search-panel]':panels[index],'[data-home-compare-change]':changes[index]});});
 Object.assign(s.form.queries,{'[data-home-compare-state]':state,'[type=submit]':submit});
 s.form.addEventListener=(name,handler)=>{handlers[name]=handler;};
 setupHomeCompare({querySelectorAll:()=>[s.form]});
 const select=(index,id)=>{ids[index].value=id;inputs[index].value=`이름 ${id}`;handlers['jcs:politician-selected']({target:inputs[index],detail:{item:{id,name:`이름 ${id}`,party:'정당'}}});};
 return {...s,handlers,state,submit,ids,inputs,panels,select,open:index=>handlers.click({target:{closest:()=>changes[index]}})};
}

test('picker selections enable and submit the current pair while both arrivals are still moving',t=>{
 const previous=globalThis.window,events=[];globalThis.window={dispatchEvent:event=>events.push(event)};
 t.after(()=>{globalThis.window=previous;});
 const s=picker();assert.equal(s.vs.hidden,true);assert.equal(s.submit.disabled,true);
 s.select(1,'b');assert.equal(s.submit.disabled,true);
 s.select(0,'a');assert.equal(s.submit.disabled,false);
 assert.deepEqual(s.slots.map(slot=>slot.dataset.compareArrival),['falling','falling']);
 assert.equal(s.vs.hidden,true);s.handlers.submit({preventDefault(){}});
 assert.equal(events[0].detail.route,'/compare?ids=a%2Cb&run=1');
 assert.deepEqual(s.panels.map(panel=>panel.hidden),[true,true]);
});

test('picker typing clears the current side and rejects a duplicate without blocking further selection',async()=>{
 const s=picker();s.select(0,'a');s.select(1,'b');
 s.inputs[0].value='c';s.handlers.input({target:s.inputs[0]});await s.flush();
 assert.equal(s.ids[0].value,'');assert.equal(s.submit.disabled,true);assert.equal(s.vs.hidden,true);
 assert.equal(s.slots[0].dataset.compareArrival,'empty');
 s.select(0,'b');assert.equal(s.ids[0].value,'');assert.match(s.state.textContent,/서로 다른/);
 s.select(0,'c');assert.equal(s.submit.disabled,false);assert.equal(s.slots[0].dataset.compareArrival,'falling');
});


test('the mirrored gold geometry reveals from the outer right toward the collision point',async()=>{
 const s=stage();s.controller.select(0,'a');s.controller.select(1,'b');await s.land(0);await s.land(1);
 const right=s.active().find(a=>a.node.name==='.matchup-energy-right');
 assert.equal(right.frames[0].clipPath,'inset(0 0 0 100%)');
 assert.match(s.effects.innerHTML,/<svg class="matchup-energy matchup-energy-right"[^>]*><g transform="translate\(300 0\) scale\(-1 1\)">/);
});

test('opening a picker focuses search and closes the other floating panel',()=>{
 const s=picker();s.open(0);assert.equal(s.panels[0].hidden,false);assert.equal(s.inputs[0].focused,true);
 s.open(1);assert.deepEqual(s.panels.map(panel=>panel.hidden),[true,false]);assert.equal(s.inputs[1].selected,true);
 s.open(1);assert.deepEqual(s.panels.map(panel=>panel.hidden),[true,true]);
});


// This intentionally models the simple descendant selectors and width media
// queries used by the home card. It checks authored cascade values, not browser
// layout, painting, hit testing, or support for newer CSS features.
function comparisonCascade(width,open){
 const base=new URL('../',import.meta.url),index=fs.readFileSync(new URL('index.html',base),'utf8');
 const links=[...index.matchAll(/href="(\/css\/[^"?]+)(?:\?[^" ]*)?"/g)].map(match=>match[1].slice(1));
 const element=(classes,parent,id='')=>({classes:classes.split(' '),parent,id});
 const page=element('product-home-wrap',null),layout=element('home-balanced-layout',page);
 const module=element('module compare-operating-module',layout,'compare'),form=element('home-compare-form home-compare-matchup',module);
 const slots=element('home-compare-slots',form),slot=element('home-compare-slot',slots);
 const nodes={module,form,effects:element('matchup-impact-stage',form),entrant:element('matchup-entrant-clip',slot)},values={};
 const mediaMatches=query=>[...query.matchAll(/(min|max)-width\s*:\s*([\d.]+)px/g)].every(([,bound,value])=>bound==='min'?width>=Number(value):width<=Number(value));
 const simple=(node,part)=>{
  if(!/^(?:[.#][\w-]+)+$/.test(part))return false;
  return [...part.matchAll(/([.#])([\w-]+)/g)].every(([,kind,name])=>kind==='#'?node.id===name:node.classes.includes(name));
 };
 const matches=(node,selector)=>{
  const condition=':has([data-home-compare-search-panel]:not([hidden]))';
  if(selector.includes(condition)){if(!open)return false;selector=selector.replaceAll(condition,'');}
  const parts=selector.trim().split(/\s+/);let current=node;
  if(!simple(current,parts.pop()))return false;
  while(parts.length){const part=parts.pop();current=current.parent;while(current&&!simple(current,part))current=current.parent;if(!current)return false;}
  return true;
 };
 let order=0;
 const apply=(header,body)=>{
  for(const selector of header.split(','))for(const [name,node] of Object.entries(nodes))if(matches(node,selector)){
   const specificity=(selector.match(/#/g)||[]).length*100+(selector.match(/\.[\w-]+|\[[^\]]+\]/g)||[]).length*10;
   for(const [,property,value,important] of body.matchAll(/(?:^|;)\s*(overflow|height|z-index)\s*:\s*([^;!]+)\s*(!important)?/g)){
    const key=`${name}.${property}`,rank=(important?10000:0)+specificity,previous=values[key];
    if(!previous||rank>previous.rank||rank===previous.rank&&order>=previous.order)values[key]={value:value.trim(),rank,order};
   }
  }
  ++order;
 };
 const walk=text=>{
  let cursor=0;
  while(cursor<text.length){const start=text.indexOf('{',cursor);if(start<0)break;let depth=1,end=start+1;while(end<text.length&&depth){if(text[end]==='{')depth++;else if(text[end]==='}')depth--;end++;}
   const header=text.slice(cursor,start).trim(),body=text.slice(start+1,end-1);cursor=end;
   if(header.startsWith('@media')){if(mediaMatches(header))walk(body);}else if(header.startsWith('@supports'))walk(body);else if(!header.startsWith('@'))apply(header,body);
  }
 };
 for(const file of links)walk(fs.readFileSync(new URL(file,base),'utf8').replace(/\/\*[\s\S]*?\*\//g,''));
 return Object.fromEntries(Object.entries(values).map(([key,row])=>[key,row.value]));
}

test('mobile comparison overrides ancestor clipping while keeping the stage and local effect clips',()=>{
 for(const width of [320,390,600])for(const open of [false,true]){
  const style=comparisonCascade(width,open);
  assert.equal(style['module.overflow'],'visible',`the ${width}px module must not crop its picker`);
  assert.equal(style['form.height'],'252px',`the ${width}px stage stays fixed while search is ${open?'open':'closed'}`);
  assert.equal(style['effects.overflow'],'hidden');assert.equal(style['entrant.overflow'],'hidden');
  if(open)assert.ok(Number(style['module.z-index'])>Number(style['form.z-index']||0),'open results sit above following cards');
 }
});
