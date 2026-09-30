import test from 'node:test';
import assert from 'node:assert/strict';
import {siteHeader} from '../src/layout/site-shell.js';
import {setupLayoutNavigation} from '../src/ui/interactions.js';
test('shared PC/mobile header has no autocomplete and preserves the search submit form',()=>{
 const html=siteHeader();assert.match(html,/data-layout-search/);assert.match(html,/enterkeyhint="search"/);assert.match(html,/autocomplete="off"/);assert.doesNotMatch(html,/data-politician-autocomplete|data-politician-select-mode|politician-autocomplete-results/);
});
test('Enter submits names and parties unchanged to the SPREAD search event',()=>{
 const previous={window:globalThis.window,FormData:globalThis.FormData};const events=[];
 globalThis.window={dispatchEvent:e=>events.push(e)};globalThis.FormData=class{constructor(form){this.form=form}get(){return this.form.query}};
 try{for(const query of ['김민석','더불어 민주당']){let submit;const form={query,addEventListener:(name,fn)=>{submit=fn}};const root={querySelectorAll:()=>[],addEventListener:()=>{},querySelector:()=>form};setupLayoutNavigation(root);let prevented=false;submit({currentTarget:form,preventDefault:()=>{prevented=true}});assert.equal(prevented,true);assert.equal(events.at(-1).type,'jcs:layout-search');assert.equal(events.at(-1).detail.query,query)}}finally{globalThis.window=previous.window;globalThis.FormData=previous.FormData}
});
