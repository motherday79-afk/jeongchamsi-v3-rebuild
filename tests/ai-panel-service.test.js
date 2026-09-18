import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiPanelService} from '../lib/ai-panel-service.js';
import {storage} from './helpers/ai-panel-storage.js';
const admin={id:'a',role:'admin',status:'active'},profiles=Array.from({length:10},(_,i)=>({id:`JCS-AI-${String(i+1).padStart(4,'0')}`,gender:'남성',age:'30대',region:'서울',politicalInterest:'중간',pollExposure:false}));
const setup=()=>{const db=storage();let i=0;return {db,service:createAiPanelService({command:db.command,idFor:()=>`id${++i}`})};};
test('admin must be active; drafts and samples never public; CAS conflict visible',async()=>{
 const {db,service}=setup(),input={name:'sample',isSample:true,profiles};
 await assert.rejects(service.save({...admin,status:'suspended'},{operation:'panel-create',input}),/FORBIDDEN/);
 const {item:panel}=await service.save(admin,{operation:'panel-create',input});
 const {item:run}=await service.save(admin,{operation:'create',input:{panelId:panel.id,week:'2026-W38',basisDate:'2026-09-19',question:'Q',questionVersion:'1',modes:['EXPOSED']}});
 assert.deepEqual((await service.list(null)).items,[]);await assert.rejects(service.get(run.id,null),/NOT_FOUND/);
 db.conflict();await assert.rejects(service.save(admin,{operation:'human',id:run.id,version:run.version,input:{poll:{id:'p',institution:'i',sourceUrl:'https://example.org',question:'Q',comparable:false,results:{overall:{positive:null,negative:null,undecided:null}}}}}),/CONFLICT/);
 assert.equal((await service.get(run.id,admin)).item.version,1);
});
test('rerun retains original record and uses next weekly run number',async()=>{
 const {service}=setup();const {item:p}=await service.save(admin,{operation:'panel-create',input:{name:'sample',isSample:true,profiles}});
 const input={panelId:p.id,week:'2026-W38',basisDate:'2026-09-19',question:'Q',questionVersion:'1',modes:['EXPOSED']};
 const {item:a}=await service.save(admin,{operation:'create',input});await assert.rejects(service.save(admin,{operation:'create',input}),/RERUN/);
 const {item:b}=await service.save(admin,{operation:'create',input:{...input,sourceRunId:a.id,rerunReason:'model correction'}});assert.equal(b.runNumber,2);assert.deepEqual((await service.get(a.id,admin)).item,a);
});
test('formal publication exposes sanitized snapshots; locked HUMAN append preserves AI and panel',async()=>{
 const {service}=setup(),formal=Array.from({length:1000},(_,i)=>({...profiles[i%10],id:`JCS-AI-${String(i+1).padStart(4,'0')}`,secret:'never public',systemPrompt:'secret'}));
 const {item:p}=await service.save(admin,{operation:'panel-create',input:{name:'formal',profiles:formal,population:{sourceUrl:'https://example.org/population',referenceDate:'2026-09-01'}}});
 let {item:r}=await service.save(admin,{operation:'create',input:{panelId:p.id,week:'2026-W38',basisDate:'2026-09-19',question:'Q',questionVersion:'v1',modes:['EXPOSED']}});
 const mutate=async(operation,input={})=>{r=(await service.save(admin,{id:r.id,version:r.version,operation,input})).item;};
 await mutate('environment',{mode:'EXPOSED',notes:'Environment entered',sources:[]});
 await mutate('responses',{mode:'EXPOSED',model:'human-entered model',executedAt:'2026-09-19T00:00:00Z',responses:formal.map(p=>({id:p.id,choice:'positive'}))});
 await mutate('review',{note:'internal review'});await mutate('lock');
 const frozen=JSON.stringify({results:r.results,panel:r.panel,environments:r.environments});
 const human={id:'poll1',institution:'institution',question:'Q',comparable:true,sourceUrl:'https://example.org/poll',results:{overall:{positive:45,negative:45,undecided:10}}};
 await mutate('human',{poll:human});await mutate('publish');await mutate('human',{poll:{...human,id:'poll2'}});
 assert.equal(JSON.stringify({results:r.results,panel:r.panel,environments:r.environments}),frozen);
 const publicRecord=(await service.get(r.id,null)).item;assert.equal(publicRecord.panel.profiles.length,1000);assert.equal(publicRecord.audit,undefined);assert.equal(publicRecord.lockedBy,undefined);assert.equal(publicRecord.panel.createdBy,undefined);assert.equal(publicRecord.panel.profiles[0].secret,undefined);assert.equal(publicRecord.panel.profiles[0].systemPrompt,undefined);
 assert.equal((await service.list(null)).items.length,1);assert.equal((await service.panels(p.id,null)).item.createdBy,undefined);
 const history=await service.history('JCS-AI-1000',{page:1});assert.equal(history.total,1);assert.equal(history.items[0].profile.id,'JCS-AI-1000');assert.equal(history.items[0].responses.EXPOSED.choice,'positive');assert.equal(history.items[0].responses.EXPOSED.id,'JCS-AI-1000');assert.equal(history.items[0].panelId,p.id);assert.equal(history.items[0].profile.secret,undefined);assert.equal(history.items[0].results,undefined);
 await assert.rejects(service.save(admin,{id:r.id,version:r.version,operation:'responses',input:{}}),/LOCKED/);
});
test('public individual history rejects invalid IDs/pages and excludes private runs',async()=>{
 const {service}=setup();const {item:p}=await service.save(admin,{operation:'panel-create',input:{name:'sample',isSample:true,profiles}});
 await service.save(admin,{operation:'create',input:{panelId:p.id,week:'2026-W38',basisDate:'2026-09-19',question:'Q',questionVersion:'1'}});
 assert.deepEqual(await service.history('JCS-AI-0001',{page:1}),{ok:true,items:[],page:1,total:0});
 for(const id of ['JCS-AI-0000','JCS-AI-1001','JCS-AI-10000','../secret'])await assert.rejects(service.history(id,{page:1}),/INPUT_INVALID/);
 for(const page of [0,-1,1.5,'1e2','1x',100001])await assert.rejects(service.history('JCS-AI-0001',{page}),/INPUT_INVALID/);
});
test('history paginates 20 newest runs and uses each historical profile snapshot',async()=>{
 const records=Array.from({length:23},(_,i)=>({id:`run${i}`,week:'2026-W38',runNumber:i+1,panelId:`panel${i}`,status:i===22?'draft':'published',isSample:i===21,lockedAt:'2026-09-19T00:00:00.000Z',panel:{version:1,profiles:Array.from({length:1000},(_,p)=>({id:`JCS-AI-${String(p+1).padStart(4,'0')}`,age:`snapshot${i}`}))},modes:['EXPOSED'],results:{EXPOSED:{responses:[{id:'JCS-AI-1000',choice:'positive',reason:`reason${i}`}]}}}));
 let reads=0;const service=createAiPanelService({command:async([operation,key])=>{
  if(operation==='HVALS')return records.map(({panel,results,...r})=>JSON.stringify({...r,panelSize:1000}));
  if(operation==='GET'){reads++;return JSON.stringify(records.find(r=>key.endsWith(`:${r.id}`)));}
  throw Error('Unexpected operation');
 }});
 const first=await service.history('JCS-AI-1000',{page:1});assert.equal(first.total,21);assert.equal(first.items.length,20);assert.equal(reads,20);assert.equal(first.items[0].runNumber,21);assert.equal(first.items[0].profile.age,'snapshot20');
 const second=await service.history('JCS-AI-1000',{page:2});assert.equal(second.items.length,1);assert.equal(second.items[0].responses.EXPOSED.reason,'reason0');assert.equal(reads,21);
});
test('concurrent weekly creates commit one run and counter atomically',async()=>{
 const {service}=setup();const {item:p}=await service.save(admin,{operation:'panel-create',input:{name:'sample',isSample:true,profiles}});
 const payload={operation:'create',input:{panelId:p.id,week:'2026-W38',basisDate:'2026-09-19',question:'Q',questionVersion:'1'}};
 const result=await Promise.allSettled([service.save(admin,payload),service.save(admin,payload)]);
 assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal((await service.list(admin,{view:'manage'})).runs.length,1);
});
