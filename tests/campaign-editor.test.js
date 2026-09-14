import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignClient } from '../src/core/campaign-client.js';
import { renderCampaignEditor } from '../src/views/campaign-editor.js';
import { campaignInputFromFormData, campaignErrorMessage, campaignProfilePatch, campaignTargetRoute, bindCampaignInteractions } from '../src/ui/campaign-interactions.js';

test('campaign editor is guarded for guests and ordinary members',()=>{
  const guest=renderCampaignEditor(null,{});
  const member=renderCampaignEditor(null,{authenticated:true,user:{role:'member'}});
  const staleAdmin=renderCampaignEditor(null,{authenticated:false,user:{role:'admin'}});
  assert.match(guest,/관리자만 캠페인을 등록하고 편집할 수 있습니다/);
  assert.doesNotMatch(guest,/data-campaign-form/);
  assert.doesNotMatch(member,/data-campaign-form/);
  assert.doesNotMatch(staleAdmin,/data-campaign-form/);
});

test('campaign editor applies model length limits, publication hints, and safe photo previews',()=>{
  const html=renderCampaignEditor({draft:{personId:'p-1',name:'A',photoUrl:'javascript:alert(1)',policies:[{}],sources:[{}]}},{authenticated:true,user:{role:'admin'}});
  assert.match(html,/name="headline"[^>]*maxlength="120"/);
  assert.match(html,/name="whyBody"[^>]*maxlength="5000"/);
  assert.match(html,/name="policies\[0\]\.body"[^>]*maxlength="3000"/);
  assert.match(html,/name="sources\[0\]\.label"[^>]*maxlength="180"/);
  assert.match(html,/게시 필수/);
  assert.doesNotMatch(html,/src="javascript:/);
});

test('selecting another politician replaces the complete linked identity',()=>{
  assert.deepEqual(campaignProfilePatch({id:'p-2',name:'B',party:'새정당',roleLabel:'시장',jurisdiction:'서울',photo:'https://example.com/b.webp'}),{
    personId:'p-2',name:'B',party:'새정당',office:'시장',region:'서울',photoUrl:'https://example.com/b.webp'
  });
  assert.deepEqual(campaignProfilePatch({id:'p-3',name:'C',photo:{localPath:'/images/c.webp'}}),{
    personId:'p-3',name:'C',party:'',office:'',region:'',photoUrl:'/images/c.webp'
  });
});

test('linked identity fields are replaced on selection and cleared on manual name edits',()=>{
  const listeners={},attrs=()=>{const values=new Set();return {value:'',setAttribute:key=>values.add(key),removeAttribute:key=>values.delete(key),has:key=>values.has(key)};};
  const fields=Object.fromEntries(['personId','name','party','office','region','photoUrl'].map(key=>[key,attrs()])),preview={innerHTML:''};
  const form={dataset:{},querySelector(selector){const match=selector.match(/\[name="([^"]+)"\]/);return match?fields[match[1]]:selector==='[data-campaign-photo-preview]'?preview:null;},querySelectorAll(selector){return selector==='[data-campaign-linked-profile]'?Object.values(fields).filter(field=>field.has('data-campaign-linked-profile')):[];}};
  const root={addEventListener(type,handler){listeners[type]=handler;}};bindCampaignInteractions(root,{client:{}});
  const selectedTarget={closest:()=>form};listeners['jcs:politician-selected']({target:selectedTarget,detail:{item:{id:'p-2',name:'B',party:'새정당',office:'시장',region:'서울',photo:{url:'https://example.com/b.webp'}}}});
  assert.equal(fields.personId.value,'p-2');assert.equal(fields.party.value,'새정당');assert.match(preview.innerHTML,/https:\/\/example.com\/b.webp/);
  const nameTarget={closest:selector=>selector==='[data-campaign-linked-profile]'?null:selector.includes('[name="name"]')?nameTarget:form};listeners.input({target:nameTarget});
  assert.equal(fields.personId.value,'');assert.equal(fields.party.value,'');assert.equal(fields.photoUrl.value,'');assert.equal(preview.innerHTML,'');
});

test('upload state locks form identity, blocks submit, and ignores duplicate upload events',async()=>{
  const listeners={},pending=[];const button={disabled:false},state={textContent:''},url={value:'old',disabled:false,removeAttribute(){}},preview={innerHTML:''};
  let controls=[];const form={dataset:{},querySelector(selector){return {'[data-campaign-state]':state,'[data-campaign-photo-url]':url,'[data-campaign-photo-preview]':preview}[selector]||null;},querySelectorAll:selector=>selector==='button[type="submit"]'?[button]:selector==='input,textarea,select,button'?controls:[]};
  const fileA={},fileB={},upload={files:[fileA],disabled:false,closest:()=>form};
  controls=[button,url,upload];
  const root={addEventListener(type,handler){listeners[type]=handler;}};bindCampaignInteractions(root,{client:{upload:file=>new Promise(resolve=>pending.push({file,resolve})),save:()=>assert.fail('save must not run during upload')}});
  const first=listeners.change({target:{closest:()=>upload}});assert.equal(button.disabled,true);
  let prevented=false;await listeners.submit({target:{closest:()=>form},preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.match(state.textContent,/업로드가 끝난 뒤/);
  upload.files=[fileB];await listeners.change({target:{closest:()=>upload}});assert.equal(pending.length,1);
  pending[0].resolve({ok:true,url:'https://example.com/new.webp'});await first;
  assert.equal(url.value,'https://example.com/new.webp');assert.match(preview.innerHTML,/new\.webp/);assert.equal(button.disabled,false);assert.equal(upload.disabled,false);
});

test('save snapshots values before locking all controls and restores exact disabled states',async()=>{
  const OriginalFormData=globalThis.FormData,listeners={},headline={name:'headline',value:'처음',disabled:false},id={name:'id',value:'draft-1',disabled:false},version={name:'version',value:'2',disabled:false},button={disabled:false,dataset:{campaignOperation:'save'}},preDisabled={disabled:true},state={textContent:''};
  const controls=[headline,id,version,button,preDisabled];let resolveSave,saved,onSavedRoute='unset';
  const form={dataset:{},isConnected:true,querySelector(selector){if(selector==='[data-campaign-state]')return state;const match=selector.match(/\[name="([^"]+)"\]/);return match?controls.find(field=>field.name===match[1]):null;},querySelectorAll(selector){return selector==='button[type="submit"]'?[button]:selector==='input,textarea,select,button'?controls:[];}};
  class SnapshotFormData{constructor(){this.values=new Map(controls.filter(x=>x.name).map(x=>[x.name,x.value]));}get(key){return this.values.get(key)||null;}keys(){return this.values.keys();}}
  globalThis.FormData=SnapshotFormData;
  try{
    const root={addEventListener(type,handler){listeners[type]=handler;}};bindCampaignInteractions(root,{client:{save:input=>{saved=input;return new Promise(resolve=>resolveSave=resolve);}},onSaved:(_result,route)=>{onSavedRoute=route;}});
    const pending=listeners.submit({target:{closest:()=>form},submitter:button,preventDefault(){}});
    assert.equal(headline.disabled,true);assert.equal(button.disabled,true);assert.equal(preDisabled.disabled,true);
    headline.value='대기 중 수정';resolveSave({ok:true,item:{id:'draft-1',version:3,state:'draft'}});await pending;
    assert.equal(saved.input.headline,'처음');assert.equal(headline.disabled,false);assert.equal(button.disabled,false);assert.equal(preDisabled.disabled,true);assert.equal(onSavedRoute,null);
  }finally{globalThis.FormData=OriginalFormData;}
});

test('campaign errors explain current model and upload failure codes',()=>{
  const cases={CAMPAIGN_REQUIRED:/필수/,DATE_INVALID:/날짜/,POLICY_REQUIRED:/정책/,FIELD_TOO_LONG:/글자 수/,TOO_LARGE:/전체 내용/,URL_INVALID:/URL/,VIDEO_INVALID:/YouTube/,POLICY_INVALID:/정책/,SOURCE_INVALID:/출처/,DISCLOSURE_REQUIRED:/제작 관계/,DELETE_PUBLISHED:/게시된 캠페인/,IMAGE_TYPE:/JPG/,IMAGE_UPLOAD_FAILED:/업로드/,PHOTO_STORAGE_NOT_CONFIGURED:/저장소/};
  for(const [error,pattern] of Object.entries(cases))assert.match(campaignErrorMessage({error}),pattern,error);
});

test('campaign editor renders escaped draft values and campaign-only controls for administrators',()=>{
  const record={id:'c-1',version:4,draft:{headline:'<script>alert(1)</script>',name:'홍길동',policies:[{title:'주거',body:'공급 확대'}],sources:[{label:'공식 자료',url:'https://example.com'}],productionRelation:'commissioned',featured:true},published:null};
  const html=renderCampaignEditor(record,{authenticated:true,user:{role:'admin'}});
  assert.match(html,/data-campaign-form/);
  assert.match(html,/name="version" value="4"/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>alert/);
  assert.match(html,/data-politician-autocomplete[^>]*data-politician-select-mode="value"[^>]*data-politician-target="\[name=personId\]"/);
  assert.match(html,/name="policies\[0\]\.title"[^>]*value="주거"/);
  assert.match(html,/name="sources\[0\]\.url"[^>]*value="https:\/\/example.com"/);
  assert.match(html,/name="featured"[^>]*checked/);
  assert.match(html,/대표 캠페인은 캠페인 게시판 안에서만/);
  assert.doesNotMatch(html,/data-(?:home-)?banner|name="(?:bank|account|funding|payment)/);
});

test('scheduled publication returns to management and ended records retain Hide without End',()=>{
  assert.equal(campaignTargetRoute('publish',{id:'future',state:'scheduled'},true),'/campaigns?view=manage');
  assert.equal(campaignTargetRoute('publish',{id:'live',state:'current'},true),'/campaigns/live');
  const html=renderCampaignEditor({id:'ended',version:3,published:{headline:'게시됨'},draft:{},endedAt:'2026-09-15T00:00:00Z'},{authenticated:true,user:{role:'admin'}});
  assert.match(html,/data-campaign-operation="hide"/);
  assert.doesNotMatch(html,/data-campaign-operation="end"/);
});

test('campaign input serialization keeps incomplete drafts and structured rows',()=>{
  const data=new FormData();
  data.set('headline','  아직 작성 중  ');data.set('personId','p-1');data.set('name','홍길동');
  data.set('policies[0].title','교통');data.set('policies[0].body','광역망');
  data.set('policies[2].title','');data.set('policies[2].body','본문만');
  data.set('sources[0].label','보도자료');data.set('sources[0].url','https://example.com/source');
  data.set('featured','true');data.set('productionRelation','editorial');
  const input=campaignInputFromFormData(data);
  assert.equal(input.headline,'아직 작성 중');
  assert.equal(input.personId,'p-1');
  assert.deepEqual(input.policies,[{title:'교통',body:'광역망'},{title:'',body:'본문만'}]);
  assert.deepEqual(input.sources,[{label:'보도자료',url:'https://example.com/source'}]);
  assert.equal(input.featured,true);
  assert.equal(input.intro,'');
});

test('campaign client sends uncached reads and versioned JSON mutations',async()=>{
  const calls=[];
  const fetch=async(url,options={})=>{calls.push([url,options]);return {ok:true,status:200,json:async()=>({ok:true,item:{id:'c-1'}})};};
  const client=createCampaignClient({fetch});
  await client.list({view:'archive',page:2});
  await client.get('a/b',{edit:true});
  await client.save({id:'',version:0,operation:'save',input:{headline:'초안'}});
  assert.deepEqual(calls[0],['/api/v3/campaigns?view=archive&page=2',{credentials:'same-origin',cache:'no-store'}]);
  assert.equal(calls[1][0],'/api/v3/campaigns?id=a%2Fb&edit=1');
  assert.equal(calls[1][1].cache,'no-store');
  assert.equal(calls[2][0],'/api/v3/campaigns');
  assert.equal(calls[2][1].method,'POST');
  assert.equal(calls[2][1].credentials,'same-origin');
  assert.equal(calls[2][1].headers['Content-Type'],'application/json');
  assert.deepEqual(JSON.parse(calls[2][1].body),{id:'',version:0,operation:'save',input:{headline:'초안'}});
});

test('campaign client uploads approved image metadata and exposes server errors',async()=>{
  let request;
  const bytes=new Uint8Array([0xff,0xd8,0xff,0xdb]);
  const file={type:'image/jpeg',size:bytes.length,arrayBuffer:async()=>bytes.buffer};
  const client=createCampaignClient({fetch:async(url,options)=>{request={url,options};return {ok:false,status:409,json:async()=>({ok:false,error:'CAMPAIGN_CONFLICT'})};}});
  const result=await client.upload(file);
  assert.equal(request.url,'/api/v3/campaigns?image=1');
  assert.deepEqual(JSON.parse(request.options.body),{contentType:'image/jpeg',base64:'/9j/2w=='});
  assert.deepEqual(result,{status:409,ok:false,error:'CAMPAIGN_CONFLICT'});
  assert.match(campaignErrorMessage(result),/다른 관리자가 먼저 수정/);
});

test('campaign upload rejects unsupported or oversized files before fetch',async()=>{
  let calls=0;const client=createCampaignClient({fetch:async()=>{calls++;}});
  assert.deepEqual(await client.upload({type:'image/gif',size:4}),{ok:false,error:'CAMPAIGN_IMAGE_TYPE_INVALID'});
  assert.deepEqual(await client.upload({type:'image/png',size:2*1024*1024+1}),{ok:false,error:'CAMPAIGN_IMAGE_TOO_LARGE'});
  assert.equal(calls,0);
});

test('a detached editor save invalidates cache without navigating the active page',async()=>{
 const OriginalFormData=globalThis.FormData,listeners={},state={textContent:''};let resolveSave,callback;
 const form={dataset:{},isConnected:true,querySelector:selector=>selector==='[data-campaign-state]'?state:null,querySelectorAll:()=>[]};
 class EmptyFormData{get(){return null;}keys(){return [][Symbol.iterator]();}}
 globalThis.FormData=EmptyFormData;
 try{
  bindCampaignInteractions({addEventListener:(type,handler)=>listeners[type]=handler},{client:{save:()=>new Promise(resolve=>resolveSave=resolve)},onSaved:(result,route)=>{callback={result,route};}});
  const pending=listeners.submit({target:{closest:()=>form},submitter:{dataset:{campaignOperation:'publish'}},preventDefault(){}});
  form.isConnected=false;resolveSave({ok:true,item:{id:'old',version:1,state:'current'}});await pending;
  assert.equal(callback.result.ok,true);assert.equal(callback.route,null);
 }finally{globalThis.FormData=OriginalFormData;}
});
