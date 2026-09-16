import test from 'node:test';
import assert from 'node:assert/strict';
import {bindGroupInteractions} from '../src/ui/group-interactions.js';

// Exercise the real delegated handlers; only browser DOM and remote storage are doubles.
function harness(t, upload, {gallery=false, existing=''}={}) {
 const listeners={},state={textContent:''},detail={dataset:{groupId:'g',groupVersion:'3'}};
 const target={name:gallery?'imageIds':'coverImageId',value:existing},remove={checked:false};
 const saveButton={disabled:false},saved=[],routes=[];
 const form={dataset:{},isConnected:true,matches:()=>false,
  querySelector:s=>s==='[data-group-state]'?state:s==='[name=imageIds],[name=coverImageId]'?target:s==='[name=removeCover]'?remove:null,
  querySelectorAll:()=>[saveButton,input]};
 const input={value:'selected.png',disabled:false,files:[{name:'selected.png'}],dataset:{purpose:gallery?'gallery':'cover'},closest:s=>s==='[data-group-upload]'?input:s==='form'?form:null};
 const root={addEventListener:(n,fn)=>listeners[n]=fn,querySelector:()=>detail};
 const oldFD=globalThis.FormData,oldLocation=globalThis.location;
 globalThis.FormData=class {constructor(){this.data=new Map([['operation',gallery?'post':'settings'],['kind',gallery?'gallery':'post'],['name','기존 모임'],['description','기존 소개'],['category','social'],['visibility','public'],[target.name,target.value],['removeCover',remove.checked?'on':'']]);}get(k){return this.data.get(k)??null;}};
 globalThis.location={pathname:'/groups/g',search:'?tab=settings'};
 t.after(()=>{globalThis.FormData=oldFD;globalThis.location=oldLocation;});
 bindGroupInteractions(root,{client:{upload,save:async payload=>{saved.push(payload);return {ok:true,item:{id:'g',version:5}};}},onSaved:async(_,route)=>routes.push(route)});
 return {state,target,remove,saveButton,input,detail,saved,routes,form,
  upload:()=>listeners.change({target:input}),submit:()=>listeners.submit({target:{closest:()=>form},preventDefault(){}})};
}

test('failed cover upload blocks settings save and preserves the storage error',async t=>{
 const h=harness(t,async()=>({ok:false,error:'GROUP_MEDIA_NOT_CONFIGURED'}));
 await h.upload();const error=h.state.textContent;await h.submit();
 assert.equal(h.saved.length,0);assert.equal(h.routes.length,0);
 assert.match(error,/이미지 저장소/);assert.equal(h.state.textContent,error);
 assert.equal(h.input.disabled,false);assert.equal(h.input.value,'');
});

test('upload in progress prevents settings save until the image ID and version arrive',async t=>{
 let finish;const h=harness(t,()=>new Promise(resolve=>finish=resolve));
 const pending=h.upload();await h.submit();assert.equal(h.saved.length,0);assert.equal(h.saveButton.disabled,true);
 assert.match(h.state.textContent,/업로드|올리고/);
 finish({ok:true,image:{id:'cover-new'},version:4});await pending;
 assert.match(h.state.textContent,/저장.*눌러|저장.*완료해/);
 await h.submit();assert.equal(h.saved[0].input.coverImageId,'cover-new');assert.equal(h.saved[0].version,4);
});

test('retry after a rejected or thrown upload can save the new cover without removing it',async t=>{
 let attempt=0;const h=harness(t,async()=>{if(++attempt===1)throw Error('offline');return {ok:true,image:{id:'retried'},version:4};});
 h.remove.checked=true;await h.upload();await h.submit();assert.equal(h.saved.length,0);
 await h.upload();assert.equal(h.remove.checked,false);await h.submit();assert.equal(h.saved[0].input.coverImageId,'retried');
});

test('a failed replacement cannot silently save an earlier successful cover',async t=>{
 let attempt=0;const h=harness(t,async()=>++attempt===1?{ok:true,image:{id:'first'},version:4}:{ok:false,error:'GROUP_STORAGE_FAILED'});
 await h.upload();await h.upload();await h.submit();assert.equal(h.saved.length,0);assert.equal(h.target.value,'first');
});

test('partial gallery failure preserves uploaded images but cannot announce a completed save',async t=>{
 let attempt=0;const h=harness(t,async()=>++attempt===1?{ok:true,image:{id:'one'},version:4}:{ok:false,error:'GROUP_STORAGE_FAILED'},{gallery:true});
 h.input.files=[{name:'one.png'},{name:'two.png'}];await h.upload();await h.submit();
 assert.equal(h.saved.length,0);assert.equal(h.target.value,'one');assert.equal(h.detail.dataset.groupVersion,'4');
});

test('over-limit selection blocks saving previously attached gallery images as if selection succeeded',async t=>{
 const h=harness(t,async()=>{throw Error('must reject before upload');},{gallery:true,existing:'1,2,3,4,5,6'});
 await h.upload();await h.submit();assert.equal(h.saved.length,0);assert.match(h.state.textContent,/6장/);
});

test('ordinary settings save without choosing a new image still works',async t=>{
 const h=harness(t,async()=>{throw Error('no upload expected');});await h.submit();assert.equal(h.saved.length,1);assert.equal(h.routes.length,1);
});
