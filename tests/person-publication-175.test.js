import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,profiles,rawFor} from './helpers/person-refresh-fixture.js';
import {INTELLIGENCE_KEYS as K} from '../lib/intelligence-keys.js';
const id='assembly-211';
test('one-person collection applies the pilot only to that identity and publication updates NOW ranks',async()=>{
 const {db,repo,service,collected}=await fixture(),other=db.values.get(K.draft('base','assembly-026'));
 const result=await service.refreshPerson({personId:id,editorId:'admin'});
 assert.equal(collected.length,1);assert.equal(collected[0].c.collectionProfile?.searchKeywords?.length,4);
 assert.equal((await repo.getRankings('base')).byId[id].rank,1);
 const published=await service.publishPersonRefresh({personId:id,refreshId:result.refresh.refreshId});
 assert.equal((await repo.getRankings('base')).byId[id].rank,3);
 assert.equal(db.values.get(K.draft('base','assembly-026')),other);assert.equal(collected.length,1);
 assert.equal(published.refresh.status,'PUBLISHED');
 assert.equal((await service.getPublicIntelligence(id)).raw.searchAds.volume.pc,1);
 await service.startPublish();await service.runPublishStep();
 assert.equal((await repo.getRankings('base')).byId[id].rank,3);
});
test('failed sources cannot replace a published person or be reported as a successful refresh',async()=>{
 const {repo,service}=await fixture({collectRaw:async p=>({...rawFor(p),searchAds:null,sourceErrors:[{source:'NAVER_SEARCH_ADS',code:'NETWORK'}]})});
 const before=await repo.getRankings('base');await assert.rejects(service.refreshPerson({personId:id}),/PERSON_SOURCE_INCOMPLETE/);
 assert.deepEqual(await repo.getRankings('base'),before);
});
test('a stale page cannot publish a different newly collected revision',async()=>{
 const {service}=await fixture();const first=await service.refreshPerson({personId:id}),second=await service.refreshPerson({personId:id});
 assert.notEqual(first.refresh.refreshId,second.refresh.refreshId);
 await assert.rejects(service.publishPersonRefresh({personId:id,refreshId:first.refresh.refreshId}),/PERSON_REFRESH_CHANGED/);
});
test('one-person publication is rejected during whole-snapshot publication',async()=>{
 const {service}=await fixture();await service.refreshPerson({personId:id});await service.startPublish();
 await assert.rejects(service.publishPersonRefresh({personId:id}),/PUBLICATION_BUSY/);
});
test('saving specified keywords rejects the ambiguous bare name',async()=>{
 const {service}=await fixture();assert.equal(typeof service.saveCollectionProfile,'function');
 await assert.rejects(service.saveCollectionProfile({personId:id,collectionProfile:{mode:'specified',searchKeywords:['박지원'],newsRegions:['전북']}}),/COLLECTION_PROFILE_INVALID/);
});
test('a successful zero-match regional news collection replaces old mixed news',async()=>{
 const {service,repo}=await fixture({collectRaw:async(p,c)=>({...rawFor(p,1),snapshotId:c.snapshotId,news:{items:[],coverage:[{date:'2026-09-16',collected:true,truncated:false}]}})});
 await service.refreshPerson({personId:id});await service.publishPersonRefresh({personId:id});
 assert.equal((await repo.getRankings('base')).byId[id].metrics.articleCount,0);
});
test('specified analysis retains the profile and labels confirmed search sums',async()=>{
 const {service,repo}=await fixture({collectRaw:async(p,c)=>({...rawFor(p),snapshotId:c.snapshotId,collectionProfile:c.collectionProfile,searchAds:{keywordMode:'specified',keywords:[],volume:{pc:null,mobile:null,total:null},confirmedVolume:{pc:30,mobile:90,total:120,complete:false}}})});
 const r=await service.refreshPerson({personId:id});await service.publishPersonRefresh({personId:id});
 const report=await service.getPublicIntelligence(id),search=report.diagnoses.find(x=>x.id==='01').display.search;
 assert.equal(search.pc,30);assert.equal(search.mobile,90);assert.match(search.basis,/지정 검색어/);
 assert.equal((await repo.getDrafts('base',[id]))[0].value.input.collectionProfile.mode,'specified');
 assert.match(report.sources[0].detail,/확인된/);
});
test('public detail reads a matching generation of metrics and rank across concurrent publication',async()=>{
 const f=await fixture();await f.service.refreshPerson({personId:id});
 const {createIntelligenceService}=await import('../lib/intelligence-service.js');let changed=false;
 const reader=createIntelligenceService({profiles,command:async args=>{
  if(!changed&&args[0]==='MGET'&&args.includes(K.draft('base',id))){changed=true;await f.service.publishPersonRefresh({personId:id});}
  return f.db.command(args);
 }});
 const result=await reader.getPublicIntelligence(id);assert.equal(result.raw.searchAds.volume.pc,1);assert.equal(result.rank.overall,3);
});
test('an older whole collection cannot overwrite a newer individually published input',async()=>{
 const {service,repo,db,drafts}=await fixture();
 for(const draft of drafts)await repo.putDraft('older',draft.id,{...draft,snapshot:'older',input:{...draft.input,collectedAt:'2026-09-15T00:00:00Z'}});
 await repo.putVersion({analysisVersion:'older',status:'draft'});await repo.setValidation('older',{ok:true});
 db.values.set(K.job('collect'),JSON.stringify({snapshotId:'older',status:'COMPLETED',ids:profiles.map(p=>p.id),successIds:profiles.map(p=>p.id)}));
 await service.refreshPerson({personId:id});await service.publishPersonRefresh({personId:id});
 await service.startPublish();await service.runPublishStep();
 assert.equal((await service.getPublicIntelligence(id)).raw.searchAds.volume.pc,1);assert.equal((await repo.getRankings('older')).byId[id].rank,3);
});
test('repeating a completed full publish step preserves an intervening individual publication',async()=>{
 const {service,repo}=await fixture();await service.startPublish();await service.runPublishStep();
 await service.refreshPerson({personId:id});await service.publishPersonRefresh({personId:id});
 const before=await repo.getRankings('base'),result=await service.runPublishStep();
 assert.equal(result.finalized.alreadyPublished,true);assert.deepEqual(await repo.getRankings('base'),before);
});
test('a failed whole-collection target retains its subsequently successful individual publication',async()=>{
 const {service,repo,db,drafts}=await fixture(),peers=profiles.filter(p=>p.id!==id).map(p=>p.id);
 for(const draft of drafts.filter(d=>d.id!==id))await repo.putDraft('partial',draft.id,draft);
 await repo.putVersion({analysisVersion:'partial',status:'draft'});await repo.setValidation('partial',{ok:true});
 db.values.set(K.job('collect'),JSON.stringify({snapshotId:'partial',status:'COMPLETED_WITH_ERRORS',ids:profiles.map(p=>p.id),successIds:peers,failures:[{personId:id}]}));
 await service.refreshPerson({personId:id});await service.publishPersonRefresh({personId:id});await service.startPublish();await service.runPublishStep();
 assert.equal((await service.getPublicIntelligence(id)).raw.searchAds.volume.pc,1);assert.equal((await repo.getRankings('partial')).population,3);
});
