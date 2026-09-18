import test from 'node:test';import assert from 'node:assert/strict';
import {loadAiPanelPage} from '../src/core/ai-panel-routing.js';
test('search chooses matching profile for both visible detail and history',async()=>{
 const profiles=[{id:'JCS-AI-0001',age:'30대'},{id:'JCS-AI-1000',age:'40대'}],calls=[];
 const item={id:'r',status:'published',modes:['EXPOSED'],panel:{profiles}};
 const client={list:async()=>({ok:true,items:[item]}),get:async()=>({ok:true,item}),history:async id=>{calls.push(id);return {ok:true,items:[]};}};
 const html=await loadAiPanelPage({params:new URLSearchParams({tab:'panels',q:'1000'}),client});assert.match(html,/<h2>JCS-AI-1000/);assert.deepEqual(calls,['JCS-AI-1000']);
});
test('ordinary accounts cannot initiate administration reads',async()=>{
 let called=false;await loadAiPanelPage({admin:true,session:{authenticated:true,user:{role:'member',status:'active'}},client:{list:async()=>{called=true;}}});assert.equal(called,false);
});
