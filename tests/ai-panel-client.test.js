import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiPanelClient} from '../src/core/ai-panel-client.js';
test('public and editing requests stay separate and transport failures are not success',async()=>{
 const calls=[];const client=createAiPanelClient({fetch:async(...args)=>{calls.push(args);return {ok:true,status:200,json:async()=>({ok:true})};}});
 await client.get('a');await client.get('a',{edit:true});await client.list({manage:true});await client.save({operation:'lock',id:'a',version:2,input:{}});
 assert.equal(new URL(calls[0][0],'https://test').searchParams.has('edit'),false);
 assert.equal(new URL(calls[1][0],'https://test').searchParams.get('edit'),'1');
 assert.match(calls[2][0],/view=manage/);assert.equal(JSON.parse(calls[3][1].body).version,2);
 const broken=createAiPanelClient({fetch:async()=>({ok:false,status:503,json:async()=>({ok:true})})});assert.equal((await broken.list()).ok,false);
});
