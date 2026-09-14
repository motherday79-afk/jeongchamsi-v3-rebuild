import test from 'node:test';
import assert from 'node:assert/strict';
import { setupPoliticianAutocomplete } from '../src/ui/interactions.js';
function fixture(search){
 const inputEvents={},resultEvents={},target={value:'old-id'},results={classList:{contains:()=>true},hidden:true,innerHTML:'',querySelectorAll:()=>[],addEventListener:(type,handler)=>resultEvents[type]=handler};
 const input={disabled:false,value:'검색',dataset:{politicianSelectMode:'value',politicianTarget:'[name=personId]'},nextElementSibling:results,closest:()=>({querySelector:()=>target}),dispatchEvent(){},addEventListener:(type,handler)=>inputEvents[type]=handler};
 setupPoliticianAutocomplete({querySelectorAll:()=>[input],addEventListener(){}},search);
 return {input,target,results,inputEvents,resultEvents};
}
test('a suggestion cannot modify an input disabled by a pending campaign save',async()=>{
 const f=fixture(async()=>({items:[{id:'new-id',name:'새 정치인'}]}));
 await f.inputEvents.input();f.input.disabled=true;
 f.resultEvents.click({target:{closest:()=>({dataset:{politicianSuggestion:'new-id'}})}});
 assert.equal(f.input.value,'검색');assert.equal(f.target.value,'old-id');
});
test('late autocomplete responses stay closed when the input becomes disabled',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve));
 const pending=f.inputEvents.input();f.input.disabled=true;finish({items:[{id:'new-id',name:'새 정치인'}]});await pending;
 assert.equal(f.results.hidden,true);assert.equal(f.target.value,'old-id');
});
