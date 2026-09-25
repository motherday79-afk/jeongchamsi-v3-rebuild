import test from 'node:test';
import assert from 'node:assert/strict';
import {createMineNavigation} from '../mine/navigation.js';
function browser(){
 const entries=[{site:'main'},null];let index=1;const handlers=new Map();
 const win={location:{pathname:'/mine',search:''},addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:name=>handlers.delete(name)};
 win.history={get state(){return entries[index];},replaceState(s){entries[index]=structuredClone(s);},pushState(s){entries.splice(++index);entries.push(structuredClone(s));},back(){this.go(-1);},go(delta){index+=delta;handlers.get('popstate')?.({state:entries[index]});}};
 return {win,entries,index:()=>index};
}
test('world map and raid backtrack one screen at a time; forward and reload restore location',()=>{
 const b=browser(),seen=[];let nav=createMineNavigation({win:b.win,render:view=>seen.push(view)});
 nav.go('world');nav.go('raid');nav.back();assert.equal(nav.current(),'world');nav.back();assert.equal(nav.current(),'');assert.equal(b.index(),1);
 b.win.history.go(1);assert.equal(nav.current(),'world');nav.destroy();nav=createMineNavigation({win:b.win,render:view=>seen.push(view)});nav.restore();assert.equal(seen.at(-1),'world');
 nav.home();assert.equal(b.index(),1);b.win.history.back();assert.equal(b.index(),0);
});
test('all menu pages return to the previous screen, repaint does not add a history entry',()=>{
 for(const view of ['pick','worker','storage','shop','characters','help','admin','jackpot','lottery']){
  const b=browser(),nav=createMineNavigation({win:b.win,render:()=>{}});nav.go(view);nav.go(view);nav.go(view);assert.equal(b.entries.length,3);nav.back();assert.equal(b.index(),1);assert.equal(nav.current(),'');
 }
});
test('return restores previous panel scroll and home skips the complete local trail',()=>{
 const b=browser(),seen=[];let scroll=0;const nav=createMineNavigation({win:b.win,render:(view,y)=>seen.push([view,y]),getScroll:()=>scroll});
 nav.go('shop');scroll=230;nav.go('help');nav.back();assert.deepEqual(seen.at(-1),['shop',230]);nav.go('world');nav.go('raid');nav.home();assert.equal(b.index(),1);
});
