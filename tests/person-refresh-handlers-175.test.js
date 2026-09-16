import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPersonRefresh,loadMemberRefresh} from '../src/ui/person-refresh.js';
function memberPanel(){
 const state={textContent:''},start={disabled:true},check={hidden:false,disabled:false,hasAttribute:()=>false};
 const panel={dataset:{memberRefresh:'assembly-211',refreshUser:'member',personName:'박지원'},hidden:true,isConnected:true,innerHTML:'',querySelector:selector=>selector==='[data-member-refresh-start]'?start:selector==='[data-member-refresh-check]'?check:state};
 check.closest=()=>panel;const handlers={},root={addEventListener:(kind,fn)=>handlers[kind]=fn,querySelectorAll:()=>[panel]};
 const click=()=>handlers.click({preventDefault(){},target:{closest:selector=>selector.includes('[data-member-refresh-check]')?check:null}});
 return {root,panel,state,start,check,click};
}
test('a known failed request clears pending state even when its saved error is a network error',async()=>{
 const original=globalThis.sessionStorage,values=new Map([['jcs-refresh:member:assembly-211',JSON.stringify({personId:'assembly-211',requestId:'test-request-12345',quotedFee:100})]]);
 globalThis.sessionStorage={getItem:k=>values.get(k),removeItem:k=>values.delete(k)};
 try{const view=memberPanel();bindPersonRefresh(view.root,{auth:{memberRefreshStatus:async()=>({ok:true,status:'FAILED',error:'STORAGE_NETWORK'})}});await view.click();assert.equal(values.size,0);assert.equal(view.start.disabled,false);assert.equal(view.check.hidden,true);}finally{if(original===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=original;}
});
test('pending request recovery remains visible if the price quote cannot be loaded',async()=>{
 const original=globalThis.sessionStorage;globalThis.sessionStorage={getItem:()=>JSON.stringify({requestId:'test-request-12345',quotedFee:100})};
 try{const view=memberPanel();await loadMemberRefresh(view.root,{personRefreshQuote:async()=>{throw Error('NETWORK');}});assert.equal(view.panel.hidden,false);assert.equal(view.panel.dataset.fee,'100');assert.equal(view.check.hidden,false);assert.equal(view.start.disabled,true);assert.match(view.state.textContent,/처리 상태/);}finally{if(original===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=original;}
});
test('keyword inputs remain disabled until their save finishes, preventing false clean state',async()=>{
 let finish;const gate=new Promise(r=>finish=r),state={textContent:''},button={disabled:false},mode={value:'specified'},keywords={value:'전북박지원'},regions={value:'전북'},fields=[mode,keywords,regions],form={dataset:{collectionProfileForm:'assembly-211',dirty:'true'},elements:{mode,searchKeywords:keywords,newsRegions:regions},hasAttribute:()=>false,querySelector:selector=>selector==='button[type="submit"]'?button:state,querySelectorAll:()=>fields};
 const handlers={},root={addEventListener:(kind,fn)=>handlers[kind]=fn};bindPersonRefresh(root,{auth:{saveCollectionProfile:async()=>{await gate;return {ok:true};}}});
 const pending=handlers.submit({preventDefault(){},target:{closest:()=>form}});assert.ok(fields.every(x=>x.disabled));assert.equal(button.disabled,true);finish();await pending;assert.ok(fields.every(x=>!x.disabled));assert.equal(form.dataset.dirty,undefined);
});
