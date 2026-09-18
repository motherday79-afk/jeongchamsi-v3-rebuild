import test from 'node:test';
import assert from 'node:assert/strict';
import {bindAiPanelInteractions} from '../src/ui/ai-panel-interactions.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function harness(t,{operation='review',values={note:'검수 내용을 유지'},save=async()=>({ok:true,item:{id:'run1',version:8}})}={}){
 const listeners={},calls=[],saved=[],notice={textContent:''},buttons=[{disabled:false},{disabled:true}];
 const fields=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value}]));
 const form={dataset:{aiForm:operation,id:'run1',version:'7'},elements:{namedItem:key=>fields[key]},querySelector:selector=>selector==='[data-ai-form-state]'?notice:null,querySelectorAll:selector=>selector==='button'?buttons:[],closest:selector=>selector==='[data-ai-form]'||selector==='form'?form:null};
 const NativeFormData=globalThis.FormData;
 globalThis.FormData=class extends NativeFormData{constructor(target){super();for(const [key,field] of Object.entries(fields))this.append(key,field.value);assert.equal(target,form);}};
 t.after(()=>{globalThis.FormData=NativeFormData;});
 bindAiPanelInteractions({addEventListener:(name,fn)=>{listeners[name]=fn;}},{client:{collectHumanPolls:()=>{calls.push({operation:'collect'});return save();},save:payload=>{calls.push(payload);return save(payload);}},onSaved:(...args)=>saved.push(args)});
 const submit=()=>{const event={target:form,prevented:false,preventDefault(){this.prevented=true;}};const result=listeners.submit(event);assert.equal(event.prevented,true);return result;};
 const file={dataset:{aiJsonTarget:'sourcesJson'},files:[],closest:selector=>selector==='[data-ai-json-target]'?file:selector==='form'?form:null};
 return {fields,form,buttons,notice,calls,saved,submit,click:target=>listeners.click({target}),read:selected=>{file.files=selected?[selected]:[];return listeners.change({target:file});}};
}

test('collection uses dedicated method and refreshes without a run item',async t=>{const result={ok:true,items:[],providers:[]};const h=harness(t,{operation:'collect',values:{},save:async()=>result});await h.submit();assert.deepEqual(h.calls,[{operation:'collect'}]);assert.deepEqual(h.saved,[[result,'collect']]);});

test('import preserves decimal values and provenance but clears comparison confirmation',t=>{const keys=['id','institution','commissioner','title','startDate','endDate','publishedDate','sampleSize','method','responseRate','marginOfError','sourceUrl','question','comparisonNote','topic','fetchedAt','positive','negative','undecided','n','subgroupsJson','provenanceJson','comparable'];const h=harness(t,{operation:'human',values:Object.fromEntries(keys.map(k=>[k,'']))});h.fields.comparable.checked=true;const poll={id:'g1',institution:'한국갤럽',question:'대통령 직무수행 평가',provenance:{questionKind:'source-summary'},results:{overall:{positive:61.2,negative:29.8,undecided:null,n:1000}}};h.form.querySelector=selector=>selector==='[data-ai-import-source]'?{value:JSON.stringify(poll)}:h.notice;const button={closest:selector=>selector==='[data-ai-import]'?button:selector==='form'?h.form:null};h.click(button);assert.equal(h.fields.positive.value,61.2);assert.equal(h.fields.undecided.value,'');assert.equal(h.fields.comparable.checked,false);assert.deepEqual(JSON.parse(h.fields.provenanceJson.value),poll.provenance);assert.match(h.notice.textContent,/질문지 원문/);});

test('delegated submit suppresses duplicates while pending and preserves initially disabled buttons',async t=>{
 const request=deferred(),h=harness(t,{save:()=>request.promise});
 const first=h.submit();assert.equal(h.calls.length,1);assert.deepEqual(h.buttons.map(x=>x.disabled),[true,true]);
 await h.submit();assert.equal(h.calls.length,1);assert.equal(h.saved.length,0);
 const result={ok:true,item:{id:'run1',version:8}};request.resolve(result);await first;
 assert.deepEqual(h.calls[0],{operation:'review',id:'run1',version:7,input:{note:'검수 내용을 유지'}});
 assert.deepEqual(h.saved,[[result,'review']]);assert.deepEqual(h.buttons.map(x=>x.disabled),[false,true]);
 assert.match(h.notice.textContent,/저장했습니다/);
});

test('API conflict retains entered values, shows failure, and never invokes success callback',async t=>{
 const h=harness(t,{save:async()=>({ok:false,error:'AI_PANEL_CONFLICT'})});
 await h.submit();assert.equal(h.calls.length,1);assert.equal(h.fields.note.value,'검수 내용을 유지');
 assert.equal(h.saved.length,0);assert.match(h.notice.textContent,/다른 관리자가/);assert.doesNotMatch(h.notice.textContent,/저장했습니다/);
 assert.equal(h.form.dataset.version,'7');assert.deepEqual(h.buttons.map(x=>x.disabled),[false,true]);
});

test('JSON file read blocks submission until ready and submits imported content',async t=>{
 const reading=deferred(),h=harness(t,{operation:'environment',values:{mode:'EXPOSED',notes:'원래 메모',sourcesJson:'[]'}});
 const pending=h.read({size:100,text:()=>reading.promise});await h.submit();
 assert.equal(h.calls.length,0);assert.match(h.notice.textContent,/파일 읽기/);
 const rows=[{title:'출처',url:'https://example.org',publishedAt:null,containsPollNumbers:false}];
 reading.resolve(JSON.stringify(rows));await pending;await h.submit();
 assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0].input.sources,rows);assert.equal(h.fields.notes.value,'원래 메모');assert.equal(h.saved.length,1);
});

test('failed JSON file read prevents stale text submission until a valid replacement is selected',async t=>{
 const h=harness(t,{operation:'environment',values:{mode:'BLIND',notes:'유지',sourcesJson:'[]'}});
 await h.read({size:20,text:async()=>'{broken json'});assert.match(h.notice.textContent,/읽지 못했습니다/);
 await h.submit();assert.equal(h.calls.length,0);assert.equal(h.saved.length,0);assert.equal(h.fields.sourcesJson.value,'[]');
 await h.read({size:2,text:async()=>'[]'});await h.submit();assert.equal(h.calls.length,1);assert.equal(h.saved.length,1);
});

test('an older file read cannot overwrite a newer file selection',async t=>{
 const old=deferred(),h=harness(t,{operation:'environment',values:{mode:'EXPOSED',sourcesJson:'[]'}});
 const pending=h.read({size:50,text:()=>old.promise});
 const latest='[{"title":"latest"}]';await h.read({size:latest.length,text:async()=>latest});
 old.resolve('[{"title":"stale"}]');await pending;await h.submit();
 assert.equal(h.fields.sourcesJson.value,latest);assert.deepEqual(h.calls[0].input.sources,[{title:'latest'}]);
});
