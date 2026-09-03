import { createIntelligenceRepository } from './intelligence-repository.js';
import { collectPoliticianRaw } from './intelligence-collectors.js';
import { buildIntelligenceDraft } from './intelligence-analysis.js';
import { validateIntelligenceDraft, validateSnapshot } from './intelligence-validation.js';
import { naverCredentialStatus } from './naver-search-ads.js';
import { POLITICIAN_TYPES, readPoliticianType } from './politician-store.js';
import { fetchOfficialPopulationContext, selectAgeSexForPerson } from './official-public-data.js';
import { fetchLatestGallupContext } from './gallup-public.js';
import { buildOperationalRankings, withOperationalRank } from './operational-ranking.js';
import { compactIntelligenceDraft, validateCompactSnapshot } from './intelligence-storage.js';

const ALGORITHM_VERSION='JCS_INTELLIGENCE_V2';
const terminal=status=>['COMPLETED','COMPLETED_WITH_ERRORS','FAILED'].includes(String(status||''));
const safeError=(personId,error)=>({personId:String(personId),stage:String(error?.stage||'collection'),code:String(error?.code||error?.message||'COLLECTION_FAILED').slice(0,100),attempts:Math.max(1,Number(error?.attempts)||1)});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));
const transientStorageError=error=>['STORAGE_REQUEST','STORAGE_NETWORK'].includes(String(error?.code||error?.message||''));

async function concurrentMap(items,limit,worker){
  const results=[];
  for(let start=0;start<items.length;start+=limit)results.push(...await Promise.all(items.slice(start,start+limit).map(worker)));
  return results;
}

function snapshotId(now){return `jcs-${new Date(Number(now())).toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`;}
export function createIntelligenceService(options={}){
  const command=options.command;
  if(typeof command!=='function')throw new Error('STORAGE_COMMAND_REQUIRED');
  const storageRetryDelays=Array.isArray(options.storageRetryDelays)&&options.storageRetryDelays.length?options.storageRetryDelays:[0,250,750];
  const storageCommand=async args=>{
    let lastError=null;
    for(let attempt=0;attempt<storageRetryDelays.length;attempt+=1){
      if(attempt>0)await (options.sleep||sleep)(storageRetryDelays[attempt]);
      try{return await command(args);}catch(error){lastError=error;if(!transientStorageError(error))throw error;}
    }
    throw lastError;
  };
  const repository=createIntelligenceRepository(storageCommand,{now:options.now}),now=options.now||Date.now,env=options.env||process.env;
  const collectRaw=options.collectRaw||collectPoliticianRaw,analyze=options.analyze||buildIntelligenceDraft,validateDraft=options.validateDraft||validateIntelligenceDraft,validateAll=options.validateSnapshot||validateSnapshot,validateStored=options.validateStoredSnapshot||validateCompactSnapshot;
  const loadOfficialContext=options.officialContextProvider||(options.collectRaw?async()=>null:async()=>{const [population,gallup]=await Promise.all([fetchOfficialPopulationContext({fetchImpl:options.fetchImpl,timeoutMs:options.timeoutMs}).catch(()=>null),fetchLatestGallupContext({fetchImpl:options.fetchImpl,timeoutMs:options.timeoutMs}).catch(()=>null)]);return {population,gallup};});

  async function loadProfiles(){
    const rows=Array.isArray(options.profiles)?options.profiles:(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(storageCommand,type)))).flat();
    return rows.filter(person=>person?.id&&person.isVacant!==true);
  }

  async function status(){
    const [collection,publication,latestDraft,publicSnapshot]=await Promise.all([repository.readJob('collect'),repository.readJob('publish'),repository.getLatestDraftId(),repository.getPublicPointer()]);
    const validation=latestDraft?await repository.getValidation(latestDraft):null;
    return {sources:{naverSearchAds:naverCredentialStatus(env),googleNews:{configured:true,mode:'RSS_WEB'},officialPublicData:{configured:true,mode:'PUBLIC_WEB'}},collection,publication,latestDraft,publicSnapshot,validation};
  }

  async function startCollection(){
    const credentials=naverCredentialStatus(env);if(!credentials.configured)throw Object.assign(new Error('NAVER_CREDENTIALS_MISSING'),{code:'NAVER_CREDENTIALS_MISSING',missing:credentials.missing});
    const current=await repository.readJob('collect');
    await repository.clearHistory();
    if(current?.status==='RUNNING')return {job:current,resumed:true};
    const publicSnapshot=await repository.getPublicPointer();
    await repository.cleanupObsoleteSnapshots([publicSnapshot]);
    const people=await loadProfiles(),id=snapshotId(now),job=await repository.createJob('collect',id,people.map(person=>person.id));
    return {job,resumed:false};
  }

  async function runCollectionStep(){
    const credentials=naverCredentialStatus(env);if(!credentials.configured)throw Object.assign(new Error('NAVER_CREDENTIALS_MISSING'),{code:'NAVER_CREDENTIALS_MISSING',missing:credentials.missing});
    await repository.prepareCompactCollection();
    const batch=await repository.claimNextBatch('collect');
    if(batch.done)return {job:batch.job,batch:{start:batch.start,size:0,ids:[]},validation:batch.job?.snapshotId?await repository.getValidation(batch.job.snapshotId):null};
    const people=await loadProfiles(),profileMap=new Map(people.map(person=>[person.id,person])),successIds=[],failures=[];
    let officialContext=null;try{officialContext=await loadOfficialContext();}catch{}
    await concurrentMap(batch.ids,5,async personId=>{
      const person=profileMap.get(personId);
      try{
        if(!person)throw Object.assign(new Error('POLITICIAN_PROFILE_MISSING'),{code:'POLITICIAN_PROFILE_MISSING'});
        const population=officialContext?.population||officialContext;
        const context={snapshotId:batch.job.snapshotId,peers:people,officialContext:officialContext?{source:population?.source||null,ageSex:selectAgeSexForPerson(population,person),gallup:officialContext?.gallup||null}:null};
        const raw=await collectRaw(person,context,{fetchImpl:options.fetchImpl,env,now,retryDelays:options.retryDelays,timeoutMs:options.timeoutMs||3500});
        const analyzed=analyze(person,raw,{peers:people,ageSex:context.officialContext?.ageSex||null,source:population?.source||null,gallup:officialContext?.gallup||null},ALGORITHM_VERSION),validation=validateDraft(analyzed);
        if(!validation.ok)throw Object.assign(new Error('DRAFT_VALIDATION_FAILED'),{code:'DRAFT_VALIDATION_FAILED',validation});
        const draft=compactIntelligenceDraft(analyzed);
        await repository.putDraft(batch.job.snapshotId,personId,draft);successIds.push(personId);
      }catch(error){failures.push(safeError(personId,error));}
    });
    const job=await repository.completeBatch('collect',{start:batch.start,successIds,failures});
    let validation=null;
    if(terminal(job.status)){
      const drafts=(await repository.getDrafts(job.snapshotId,job.ids)).map(item=>item.value).filter(Boolean);
      validation=validateStored(drafts,job.ids);await repository.setValidation(job.snapshotId,validation);
    }
    return {job,batch:{start:batch.start,size:batch.ids.length,ids:batch.ids},validation};
  }

  async function preview(){
    const collection=await repository.readJob('collect'),draftId=collection?.snapshotId||await repository.getLatestDraftId();
    if(!draftId)return {ok:false,error:'COLLECTION_NOT_FOUND'};
    const profiles=await loadProfiles(),profileMap=new Map(profiles.map(person=>[person.id,person])),drafts=(await repository.getDrafts(draftId,collection?.ids||profiles.map(person=>person.id))).map(item=>item.value).filter(Boolean);
    return {ok:true,snapshotId:draftId,validation:await repository.getValidation(draftId),top30:buildOperationalRankings(drafts,profileMap,draftId,now()).overall,completed:drafts.length,total:collection?.total||profiles.length};
  }

  async function startPublish(){
    const collection=await repository.readJob('collect');
    if(!collection||collection.status!=='COMPLETED')throw new Error('COLLECTION_NOT_READY');
    const validation=await repository.getValidation(collection.snapshotId);
    if(!validation?.ok)throw new Error('COLLECTION_VALIDATION_REQUIRED');
    const job=await repository.createJob('publish',collection.snapshotId,collection.ids);
    return {job,resumed:job.cursor>0};
  }

  async function finalizePublication(job){
    if(job.status!=='COMPLETED')return null;
    const profiles=await loadProfiles(),profileMap=new Map(profiles.map(person=>[person.id,person])),rows=await repository.getDrafts(job.snapshotId,job.ids),drafts=rows.map(item=>item.value).filter(Boolean),validation=validateStored(drafts,job.ids);
    if(!validation.ok){await repository.setValidation(job.snapshotId,{...validation,publish:true});return {ok:false,validation};}
    const rankings=buildOperationalRankings(drafts,profileMap,job.snapshotId,now());
    await repository.setRankings(job.snapshotId,rankings);
    await repository.setPublicPointer(job.snapshotId);
    const cleanup=await repository.cleanupObsoleteSnapshots([job.snapshotId]);
    const history=await repository.clearHistory();
    return {ok:true,validation,rankings:{overall:rankings.overall},cleanup,history:{entries:0,removed:history.removed}};
  }

  async function runPublishStep(){
    await repository.prepareDraftPointerPublication();
    const batch=await repository.claimNextBatch('publish');
    if(batch.done)return {job:batch.job,batch:{start:batch.start,size:0,ids:[]},finalized:await finalizePublication(batch.job)};
    const drafts=await repository.getDrafts(batch.job.snapshotId,batch.ids),successIds=[],failures=[];
    for(const {personId,value} of drafts){
      try{if(!value)throw Object.assign(new Error('DRAFT_MISSING'),{code:'DRAFT_MISSING'});successIds.push(personId);}catch(error){failures.push(safeError(personId,Object.assign(error,{stage:'publish'})));}
    }
    const job=await repository.completeBatch('publish',{start:batch.start,successIds,failures}),finalized=terminal(job.status)?await finalizePublication(job):null;
    return {job,batch:{start:batch.start,size:batch.ids.length,ids:batch.ids},finalized};
  }

  async function getPublicRankings(){const pointer=await repository.getPublicPointer();return pointer?repository.getRankings(pointer):null;}
  async function getPublicIntelligence(personId){
    const pointer=await repository.getPublicPointer();if(!pointer)return null;
    const [draft,rankings]=await Promise.all([repository.getDrafts(pointer,[personId]).then(rows=>rows[0]?.value||null),repository.getRankings(pointer)]);if(!draft)return null;
    return withOperationalRank(draft,rankings?.byId?.[personId]||null);
  }

  return {status,startCollection,runCollectionStep,preview,startPublish,runPublishStep,getPublicRankings,getPublicIntelligence};
}
