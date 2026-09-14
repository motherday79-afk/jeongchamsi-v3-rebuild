import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from '../src/core/navigation.js';

test('leaving before compare loads never caches the previous home screen under compare',()=>{
 let screen='home',restored=0;const requested=[];
 const window={location:{pathname:'/',search:'',hash:''},scrollX:0,scrollY:0,scrollTo(){},addEventListener(){},history:{state:null,
  replaceState(state,_title,url){this.state=state;const parsed=new URL(url,'https://fixture.invalid');Object.assign(window.location,{pathname:parsed.pathname,search:parsed.search});},
  pushState(state,title,url){this.replaceState(state,title,url);}
 }};
 const navigation=createNavigation({window,readSnapshot:()=>screen,restoreSnapshot:markup=>{screen=markup;restored++;},onRoute:route=>requested.push(route)});
 navigation.start();navigation.cacheCurrent();
 navigation.navigate('/compare');const compareState=window.history.state;
 // The old home remains on screen while compare's response is in flight.
 navigation.navigate('/shop');screen='shop';navigation.cacheCurrent();
 window.history.replaceState(compareState,'','/compare');
 assert.equal(navigation.handlePop({state:compareState}),false);
 assert.equal(restored,0);assert.equal(requested.at(-1),'/compare');
 screen='loaded compare';navigation.cacheCurrent();
 navigation.navigate('/shop');screen='shop';navigation.cacheCurrent();
 window.history.replaceState(compareState,'','/compare');
 assert.equal(navigation.handlePop({state:compareState}),true);
 assert.equal(screen,'loaded compare');assert.equal(restored,1);
});
