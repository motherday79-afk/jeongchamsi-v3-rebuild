import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalRankings, rankingChanges } from '../lib/operational-ranking.js';
import { createIntelligenceService } from '../lib/intelligence-service.js';
import { createIntelligenceRepository } from '../lib/intelligence-repository.js';
import { INTELLIGENCE_KEYS as K } from '../lib/intelligence-keys.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { compactIntelligenceDraft } from '../lib/intelligence-storage.js';
import handler, { dispatchAdminIntelligence } from '../api/gateway.js';
import { issueSessionToken } from '../lib/session.js';
import { TARGET_KEYS } from '../lib/migration-service.js';
import { renderAdminStable } from '../src/views/stage1.js';
import { createAuthService } from '../src/core/auth.js';
import { bindRankingWeights, rankingWeightsReady } from '../src/ui/ranking-weights.js';
import * as rankingWeightsUI from '../src/ui/ranking-weights.js';

const now=()=>Date.parse('2026-09-15T12:00:00Z');
const profiles=[{id:'news',name:'뉴스 인물',type:'assembly',party:'무소속',office:'국회의원'},{id:'search',name:'검색 인물',type:'assembly',party:'무소속',office:'국회의원'}];
const profileMap=new Map(profiles.map(p=>[p.id,p]));
const drafts=profiles.map((p,index)=>compactIntelligenceDraft(buildIntelligenceDraft(p,{
 personId:p.id,snapshotId:'existing',collectedAt:new Date(now()).toISOString(),officialProfile:p,
 searchAds:{volume:{pc:index?900:10,mobile:index?900:10}},
 news:{items:Array.from({length:index?1:3},(_,i)=>({title:p.name+' 정책 제안 '+i,source:'매체'+i,url:'https://example.org/'+p.id+'/'+i,publishedAt:index?'2026-09-10T00:00:00Z':'2026-09-15T00:00:00Z'}))},sources:[],sourceErrors:[]
})));
function storage(){
 const values=new Map(),calls=[];
 const command=async args=>{calls.push(args);const [op,key,...rest]=args;
  if(op==='GET')return values.get(key)??null;
  if(op==='MGET')return [key,...rest].map(k=>values.get(k)??null);
  if(op==='SET'){values.set(key,rest[0]);return 'OK';}
  if(op==='DEL'){let count=0;for(const k of [key,...rest])count+=Number(values.delete(k));return count;}
  if(op==='SCAN'){const pattern=args[args.indexOf('MATCH')+1],prefix=pattern.replace(/\*$/,'');return ['0',[...values.keys()].filter(k=>k.startsWith(prefix))];}
  if(op==='EVAL'){const n=Number(args[2]),keys=args.slice(3,3+n),before=args.slice(3+n,3+n*2),after=args.slice(3+n*2);if(keys.some((k,i)=>(values.get(k)||'')!==before[i]))return 0;keys.forEach((k,i)=>values.set(k,after[i]));return 1;}
  throw Error('Unexpected storage command: '+op);
 };
 return {values,calls,command};
}
async function setup(){
 const db=storage(),repo=createIntelligenceRepository(db.command,{now});
 for(const draft of drafts)await repo.putDraft('existing',draft.id,draft);
 db.values.set(K.job('collect'),JSON.stringify({snapshotId:'existing',status:'COMPLETED',ids:profiles.map(p=>p.id),successIds:profiles.map(p=>p.id),total:2,completed:2}));
 db.values.set(K.latestDraft,'existing');
 await repo.setValidation('existing',{ok:true});await repo.putVersion({analysisVersion:'existing',status:'published'});await repo.setPublicPointer('existing');
 await repo.setRankings('existing',buildOperationalRankings(drafts,profileMap,'existing',now()));
 const service=()=>createIntelligenceService({command:db.command,now,profiles,env:{},youtubeChannels:{status:async()=>({credentials:{}})},collectRaw:async()=>{throw Error('Weight changes must not recollect');}});
 return {db,repo,service};
}

test('news/search presets and endpoints change ranking scores while the default stays 60/40',()=>{
 const original=structuredClone(drafts);
 for(const news of [0,30,50,60,70,100]){
  const ranks=buildOperationalRankings(drafts,profileMap,'existing',now(),{news,search:100-news});
  assert.equal(ranks.byId.news.score,news);assert.equal(ranks.byId.search.score,100-news);
  assert.equal(ranks.weights.newsArticles,news/3);assert.equal(ranks.weights.search,100-news);
 }
 assert.equal(buildOperationalRankings(drafts,profileMap,'existing',now()).byId.news.score,60);
 assert.deepEqual(drafts,original);
});

test('saved weights persist across services without changing collected data or the public rank',async()=>{
 const {db,repo,service}=await setup(),before=new Map(db.values);
 const initial=await service().status();assert.equal(initial.rankingWeights.news,60);
 const saved=await service().saveRankingWeights({news:70,search:30,editorId:'admin-one'});
 assert.equal(saved.rankingWeights.news,70);assert.equal(saved.rankingWeights.updatedBy,'admin-one');
 const status=await service().status();assert.equal(status.rankingWeights.search,30);assert.equal(status.publicRankingWeights.news,60);
 assert.equal((await repo.getRankings('existing')).byId.news.score,60);
 for(const draft of drafts)assert.equal(db.values.get(K.draft('existing',draft.id)),before.get(K.draft('existing',draft.id)));
});

test('invalid, incomplete and non-numeric ratios are rejected without writes',async()=>{
 const {db,service}=await setup();
 for(const input of [{},{news:70},{news:70,search:40},{news:-10,search:110},{news:65,search:35},{news:'70',search:30},{news:null,search:100},{news:true,search:99},{news:NaN,search:NaN}]){
  const before=new Map(db.values),result=await dispatchAdminIntelligence('admin/intelligence/ranking-weights','PATCH',service(),input);
  assert.equal(result.status,400,JSON.stringify(input));assert.equal(result.body.error,'RANKING_WEIGHTS_INVALID');assert.deepEqual(db.values,before);
 }
 assert.equal((await dispatchAdminIntelligence('admin/intelligence/ranking-weights','GET',service())).status,405);
});

test('preview uses saved weights and keeps the currently published ranks intact',async()=>{
 const {repo,service}=await setup(),s=service();await s.saveRankingWeights({news:70,search:30});
 const preview=await s.preview();assert.equal(preview.rankingWeights.news,70);assert.equal(preview.top30.find(p=>p.id==='news').score,70);
 assert.equal((await repo.getRankings('existing')).byId.news.score,60);
});

test('publication freezes weights on start, survives resume and reapplies new weights without recollection',async()=>{
 const {repo,service}=await setup(),s=service();await s.saveRankingWeights({news:70,search:30});
 const first=await s.startPublish();assert.equal(first.job.rankingWeights.news,70);
 await service().saveRankingWeights({news:50,search:50});
 const resumed=await service().startPublish();assert.equal(resumed.job.rankingWeights.news,70);
 const done=await service().runPublishStep();assert.equal(done.finalized.ok,true);
 assert.equal((await repo.getRankings('existing')).byId.news.score,70);
 assert.equal((await repo.getVersion('existing')).rankingWeights.news,70);
 await service().startPublish();await service().runPublishStep();
 assert.equal((await repo.getRankings('existing')).byId.news.score,50);
 assert.equal((await service().status()).publicRankingWeights.news,50);
});

test('legacy in-progress publications retain 60/40 when a new preference is saved',async()=>{
 const {repo,service}=await setup();await repo.createJob('publish','existing',profiles.map(p=>p.id));
 await service().saveRankingWeights({news:70,search:30});await service().runPublishStep();
 assert.equal((await repo.getRankings('existing')).byId.news.score,60);
});

test('storage failures cannot report a saved preference',async()=>{
 const {db,service}=await setup(),s=service();await s.saveRankingWeights({news:70,search:30});
 const before=new Map(db.values),failing=createIntelligenceService({command:async args=>{if(args[0]==='SET')throw Error('STORAGE_AUTH');return db.command(args);},profiles,env:{},now});
 await assert.rejects(failing.saveRankingWeights({news:50,search:50}),/STORAGE_AUTH/);assert.deepEqual(db.values,before);
});

test('admin pipeline shows saved, published and running ratios with the standard presets',async()=>{
 const {service}=await setup(),s=service();await s.saveRankingWeights({news:70,search:30});await s.startPublish();await s.saveRankingWeights({news:50,search:50});
 const html=await renderAdminStable({authenticated:true,user:{id:'admin',role:'admin'}},{intelligenceStatus:()=>s.status()},{tab:'pipeline'});
 assert.match(html,/data-ranking-weights-form/);assert.match(html,/value="50" selected/);
 for(const news of [50,60,70])assert.match(html,new RegExp('뉴스 '+news+'% · 검색 '+(100-news)+'%'));
 assert.match(html,/현재 공개[^<]*<[^>]*>뉴스 60% · 검색 40%/);assert.match(html,/게시 중[^<]*<[^>]*>뉴스 70% · 검색 30%/);
 assert.match(html,/전체 게시/);
 const denied=await renderAdminStable({authenticated:true,user:{role:'member'}},{},{tab:'pipeline'});assert.doesNotMatch(denied,/data-ranking-weights-form/);
});

test('changing weights cannot be presented as a rise in public interest',async()=>{
 const before=buildOperationalRankings(drafts,profileMap,'old',now(),{news:30,search:70});
 const after=buildOperationalRankings(drafts,profileMap,'new',now(),{news:70,search:30});
 const changes=rankingChanges(after,before);assert.deepEqual(changes.items,[]);assert.equal(changes.ready,false);
 const {repo,service}=await setup(),ranks=await repo.getRankings('existing');
 ranks.rising={ready:true,items:[{id:'search',change:3}]};await repo.setRankings('existing',ranks);
 await service().saveRankingWeights({news:70,search:30});await service().startPublish();await service().runPublishStep();
 assert.deepEqual((await repo.getRankings('existing')).rising.items,[]);
});

test('real admin endpoint enforces session role and records the authenticated actor and ratio',async()=>{
 const {db}=await setup(),savedFetch=globalThis.fetch;
 const keys=['JCS_REBUILD_SESSION_SECRET','JCS_REBUILD_REDIS_REST_URL','JCS_REBUILD_REDIS_REST_TOKEN','JCS_REBUILD_REDIS_REDIS_URL','JCS_REBUILD_REDIS_URL'],saved=new Map(keys.map(key=>[key,process.env[key]]));
 const secret='ranking-test-session-secret';
 process.env.JCS_REBUILD_SESSION_SECRET=secret;process.env.JCS_REBUILD_REDIS_REST_URL='https://ranking.fixture.invalid';process.env.JCS_REBUILD_REDIS_REST_TOKEN='fixture-only';delete process.env.JCS_REBUILD_REDIS_REDIS_URL;delete process.env.JCS_REBUILD_REDIS_URL;
 db.values.set(TARGET_KEYS.users,JSON.stringify({admin:{id:'admin',role:'admin'},member:{id:'member',role:'member'}}));
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://ranking.fixture.invalid');return {ok:true,status:200,json:async()=>({result:await db.command(JSON.parse(options.body))})};};
 async function request(actor,body={news:70,search:30,editorId:'forged'}){
  let result;const res={statusCode:0,setHeader(){},end(value){result=JSON.parse(value)}};
  await handler({method:'PATCH',url:'/api/v3/admin/intelligence/ranking-weights',headers:{host:'fixture.invalid',...(actor?{cookie:'jcsr2_session='+issueSessionToken(actor,secret)}:{})},body},res);
  return {status:res.statusCode,result};
 }
 try{
  for(const [actor,status] of [[null,401],['member',403]]){const before=new Map(db.values);assert.equal((await request(actor)).status,status);assert.deepEqual(db.values,before);}
  const result=await request('admin');assert.equal(result.status,200);assert.equal(result.result.rankingWeights.updatedBy,'admin');
  const audit=JSON.parse(db.values.get(TARGET_KEYS.adminAudit));assert.equal(audit.entries[0].action,'RANKING_WEIGHTS_UPDATE');assert.equal(audit.entries[0].actor,'admin');assert.equal(audit.entries[0].details.news,70);
 }finally{globalThis.fetch=savedFetch;for(const [key,value] of saved){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

function weightForm(){
 const state={textContent:''},select={value:'70',disabled:false,focus(){}},button={disabled:false},listeners={};
 const form={dataset:{savedNews:'60'},isConnected:true,elements:{news:select},querySelector:()=>state,querySelectorAll:()=>[select,button],closest:()=>form};
 const root={addEventListener:(name,handler)=>listeners[name]=handler,querySelector:selector=>selector==='[data-ranking-weights-form]'?form:state};
 return {root,form,select,button,state,submit:(target=form)=>listeners.submit({target,preventDefault(){}})};
}

test('real client saves once, prevents premature publication and refreshes the displayed setting',async()=>{
 const view=weightForm(),savedFetch=globalThis.fetch;let complete,calls=0,refreshes=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'/api/v3/admin/intelligence/ranking-weights');assert.equal(options.method,'PATCH');assert.equal(options.credentials,'same-origin');assert.deepEqual(JSON.parse(options.body),{news:70,search:30});return new Promise(resolve=>complete=()=>resolve({ok:true,status:200,json:async()=>({ok:true,rankingWeights:{news:70,search:30}})}));};
 try{
  bindRankingWeights(view.root,{auth:createAuthService(),onSaved:async()=>{refreshes++;}});
  assert.equal(rankingWeightsReady(view.root),false);
  const pending=view.submit();await view.submit();assert.equal(calls,1);assert.equal(view.select.disabled,true);assert.equal(rankingWeightsReady(view.root),false);
  complete();await pending;assert.equal(view.form.dataset.savedNews,'70');assert.equal(view.select.disabled,false);assert.equal(refreshes,1);assert.equal(rankingWeightsReady(view.root),true);assert.match(view.state.textContent,/전체 게시/);
 }finally{globalThis.fetch=savedFetch;}
});

test('failed saves leave the old setting in force and controls available for retry',async()=>{
 const view=weightForm();bindRankingWeights(view.root,{auth:{intelligenceSaveRankingWeights:async()=>({ok:false,error:'ADMIN_REQUIRED'})},onSaved:()=>assert.fail('must not refresh on failure')});
 await view.submit();assert.equal(view.form.dataset.savedNews,'60');assert.equal(view.select.disabled,false);assert.match(view.state.textContent,/관리자만/);assert.equal(rankingWeightsReady(view.root),false);
});

test('a late settings response cannot refresh a different route',async()=>{
 const view=weightForm();let resolve,refreshes=0;
 bindRankingWeights(view.root,{auth:{intelligenceSaveRankingWeights:()=>new Promise(done=>resolve=done)},onSaved:()=>{refreshes++;}});
 const pending=view.submit();view.form.isConnected=false;view.root.querySelector=()=>null;resolve({ok:true,rankingWeights:{news:70,search:30}});await pending;assert.equal(refreshes,0);
});

test('pipeline re-renders cannot remove a pending-save guard or leave the saved ratio stale',async()=>{
 const view=weightForm(),replacement=weightForm();replacement.select.value='60';let resolve,refreshes=0,calls=0;
 bindRankingWeights(view.root,{auth:{intelligenceSaveRankingWeights:()=>{calls++;return new Promise(done=>resolve=done);}},onSaved:()=>{refreshes++;}});
 const pending=view.submit();view.form.isConnected=false;view.root.querySelector=replacement.root.querySelector;
 assert.equal(rankingWeightsReady(view.root),false);await view.submit(replacement.form);assert.equal(calls,1);
 resolve({ok:true,rankingWeights:{news:70,search:30}});await pending;
 assert.equal(refreshes,1);assert.match(replacement.state.textContent,/뉴스 70%/);
});

test('publication progress displays captured weights without replacing unsaved settings',()=>{
 const view=weightForm(),label={textContent:''},mount={hidden:true,querySelector:()=>label};
 const root={querySelector:selector=>selector==='[data-ranking-weights-running]'?mount:view.root.querySelector(selector)};
 assert.equal(typeof rankingWeightsUI.updateRunningRankingWeights,'function');
 rankingWeightsUI.updateRunningRankingWeights(root,{status:'RUNNING',rankingWeights:{news:70,search:30}});
 assert.equal(mount.hidden,false);assert.equal(label.textContent,'뉴스 70% · 검색 30%');assert.equal(view.select.value,'70');
 rankingWeightsUI.updateRunningRankingWeights(root,{status:'COMPLETED'});assert.equal(mount.hidden,true);
});

test('zero-weight channels cannot determine the order of tied scores',()=>{
 const rows=[{id:'a',rankingInput:{searchTotal:10,articleCount:1,sourceCount:1,latestPublishedAt:'2026-09-01',newsStatus:'DIRECT',searchStatus:'DIRECT'}},{id:'b',rankingInput:{searchTotal:10,articleCount:9,sourceCount:9,latestPublishedAt:'2026-09-15',newsStatus:'DIRECT',searchStatus:'DIRECT'}}];
 assert.equal(buildOperationalRankings(rows,new Map(),'tie',now(),{news:0,search:100}).overall[0].id,'a');
 rows[1].rankingInput={...rows[0].rankingInput,searchTotal:900};
 assert.equal(buildOperationalRankings(rows,new Map(),'tie',now(),{news:100,search:0}).overall[0].id,'a');
});
