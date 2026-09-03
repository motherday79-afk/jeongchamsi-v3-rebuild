import test from 'node:test';
import assert from 'node:assert/strict';

function fakeWindow(){
  const listeners={};
  const stack=[{url:'#/',state:null}],win={
    location:{hash:'#/',href:'https://example.test/#/'},scrollX:0,scrollY:0,
    history:{
      state:null,
      replaceState(state,_title,url){this.state=structuredClone(state);stack[stack.length-1]={state:this.state,url};win.location.hash=String(url).slice(String(url).indexOf('#'));},
      pushState(state,_title,url){this.state=structuredClone(state);stack.push({state:this.state,url});win.location.hash=String(url).slice(String(url).indexOf('#'));}
    },
    addEventListener(type,fn){listeners[type]=fn;},
    requestAnimationFrame(fn){fn();},
    scrollTo(x,y){this.scrollX=x;this.scrollY=y;}
  };
  return {win,stack,pop(index){const entry=stack[index];win.history.state=structuredClone(entry.state);win.location.hash=String(entry.url).slice(String(entry.url).indexOf('#'));listeners.popstate({state:win.history.state});}};
}

test('navigation records the current snapshot and restores it immediately on browser Back',async()=>{
  const {createNavigation}=await import('../src/core/navigation.js');
  const browser=fakeWindow();
  let markup='<main>home</main>',painted='',rebound=0,renders=[];
  const navigation=createNavigation({
    window:browser.win,
    readSnapshot:()=>markup,
    restoreSnapshot:value=>{painted=value;},
    rebind:()=>{rebound+=1;},
    onRoute:route=>{renders.push(route);}
  });
  navigation.start();
  assert.equal(browser.win.history.scrollRestoration,'manual');
  browser.win.scrollX=7;browser.win.scrollY=480;
  navigation.navigate('/person/assembly-001?tab=record');
  markup='<main>person</main>';
  navigation.cacheCurrent();
  browser.pop(0);
  assert.equal(painted,'<main>home</main>');
  assert.equal(rebound,1);
  assert.deepEqual([browser.win.scrollX,browser.win.scrollY],[7,480]);
  assert.deepEqual(renders,['/person/assembly-001?tab=record']);
});

test('navigation keeps query strings and renders uncached browser entries',async()=>{
  const {createNavigation}=await import('../src/core/navigation.js');
  const browser=fakeWindow();let markup='home';const renders=[];
  const navigation=createNavigation({window:browser.win,readSnapshot:()=>markup,restoreSnapshot:()=>{},rebind:()=>{},onRoute:route=>renders.push(route)});
  navigation.start();
  navigation.navigate('/search?q=%EA%B9%80%EB%AF%BC%EC%84%9D');
  assert.equal(browser.win.location.hash,'#/search?q=%EA%B9%80%EB%AF%BC%EC%84%9D');
  assert.equal(navigation.route(),'/search?q=김민석');
  browser.win.history.state={__jcsNav:true,key:'external',route:'/compare?ids=a,b&run=1',x:0,y:0};
  browser.win.location.hash='#/compare?ids=a,b&run=1';
  browser.win.addEventListener;
  navigation.handlePop({state:browser.win.history.state});
  assert.equal(renders.at(-1),'/compare?ids=a,b&run=1');
});

test('navigation does not crash on a malformed percent-encoded hash',async()=>{
  const {createNavigation}=await import('../src/core/navigation.js');
  const browser=fakeWindow();browser.win.location.hash='#/search?q=%E0%A4%A';
  const navigation=createNavigation({window:browser.win,readSnapshot:()=>'',restoreSnapshot:()=>{},rebind:()=>{},onRoute:()=>{}});
  assert.doesNotThrow(()=>navigation.start());
  assert.equal(navigation.route(),'/search?q=%E0%A4%A');
});
