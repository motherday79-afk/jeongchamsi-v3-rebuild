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
import { releaseMetadata } from '../src/core/release.js';

const ALGORITHM_VERSION='JCS_INTELLIGENCE_V3';
const terminal=status=>['COMPLETED','COMPLETED_WITH_ERRORS','FAILED'].includes(String(status||''));
const publishable=status=>['COMPLETED','COMPLETED_WITH_ERRORS'].includes(String(status||''));
const safeError=(person,error,now=Date.now)=>({personId:String(person?.id||person||''),name:String(person?.name||person?.id||person||'').slice(0,60),stage:String(error?.stage||'collection').slice(0,60),code:String(error?.code||error?.message||'COLLECTION_FAILED').slice(0,100),details:String(error?.validation?.errors?.slice?.(0,3)?.join(' · ')||error?.cause?.message||error?.message||'').slice(0,240),at:new Date(Number(now())).toISOString(),attempts:Math.max(1,Number(error?.attempts)||1),retryable:error?.retryable!==false&&!['POLITICIAN_PROFILE_MISSING'].includes(String(error?.code||''))});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));
const transientStorageError=error=>['STORAGE_REQUEST','STORAGE_NETWORK'].includes(String(error?.code||error?.message||''));

async function concurrentMap(items,limit,worker){
  const results=[];
  for(let start=0;start<items.length;start+=limit)results.push(...await Promise.all(items.slice(start,start+limit).map(worker)));
  return results;
}

function snapshotId(now){return `jcs-${new Date(Number(now())).toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}`;}
const DIAGNOSIS_EDITABLE=['headline','currentPosition','politicalMeaning','opportunity','risk','interpretation'];
const PRESCRIPTION_EDITABLE=['strategicJudgment','recommendedActions','actions','targetGroups','target','messageDirection'];

function mergeRows(base,patch,allowed){
  const edits=new Map((Array.isArray(patch)?patch:[]).map(row=>[String(row?.id||''),row]));
  return (Array.isArray(base)?base:[]).map(row=>{
    const edit=edits.get(String(row?.id||''));
    return edit?{...row,...Object.fromEntries(allowed.filter(key=>edit[key]!==undefined).map(key=>[key,edit[key]]))}:row;
  });
}

function mergeOverrides(base,patch,allowed){
  const rows=new Map((Array.isArray(base)?base:[]).map(row=>[String(row?.id||''),{...row}]));
  for(const edit of Array.isArray(patch)?patch:[]){
    const id=String(edit?.id||'');if(!id)continue;
    rows.set(id,{...(rows.get(id)||{id}),...Object.fromEntries(allowed.filter(key=>edit[key]!==undefined).map(key=>[key,edit[key]]))});
  }
  return [...rows.values()].filter(row=>row.id);
}

function applyAdminOverrides(draft,overrides={}){
  return {...draft,diagnoses:mergeRows(draft?.diagnoses,overrides?.diagnoses,DIAGNOSIS_EDITABLE),prescriptions:mergeRows(draft?.prescriptions,overrides?.prescriptions,PRESCRIPTION_EDITABLE)};
}

function diagnosisDisplay(report,id){return (Array.isArray(report?.diagnoses)?report.diagnoses:[]).find(row=>row.id===id)?.display||{};}
function competitorRow(report,profile,rankRow){
  const media=diagnosisDisplay(report,'07'),risk=diagnosisDisplay(report,'06'),campaign=diagnosisDisplay(report,'08'),competitiveDiagnosis=(Array.isArray(report?.diagnoses)?report.diagnoses:[]).find(row=>row.id==='05'),agendaRows=Array.isArray(media.agendaPenetration)?media.agendaPenetration:[],agendaTotal=agendaRows.reduce((sum,row)=>sum+(Number(row.articles)||0),0);
  return {
    id:report?.id,name:profile?.name||report?.id,party:profile?.party,office:profile?.office||profile?.roleLabel,region:profile?.jurisdiction||profile?.region,
    overallRank:rankRow?.rank??null,categoryRank:rankRow?.categoryRank??null,
    pc:Number.isFinite(Number(media.search?.pc))?Number(media.search.pc):null,mobile:Number.isFinite(Number(media.search?.mobile))?Number(media.search.mobile):null,
    newsCount:Number.isFinite(Number(media.articleCount))?Number(media.articleCount):null,sourceCount:Number.isFinite(Number(media.sourceCount))?Number(media.sourceCount):null,
    frames:risk.frames&&typeof risk.frames==='object'?risk.frames:null,
    agendas:agendaRows.slice(0,3).map(row=>({label:row.label,share:agendaTotal?Math.round((Number(row.articles)||0)/agendaTotal*100):null,articles:Number(row.articles)||0,outlets:Number(row.outlets)||0})),
    election:Array.isArray(campaign.elections)?campaign.elections.find(row=>row.voteRate!==null)||campaign.elections[0]||null:null,
    competition:{index:Number.isFinite(Number(competitiveDiagnosis?.score))?Number(competitiveDiagnosis.score):0,basis:'동일 JCS 경쟁 분석'}
  };
}
function enrichCompetitorDiagnosis(report,reportsById,profilesById,rankings){
  if(!report)return report;
  const diagnoses=(Array.isArray(report.diagnoses)?report.diagnoses:[]).map(topic=>{
    if(topic.id!=='05'||!Array.isArray(topic.display?.people))return topic;
    const people=topic.display.people.map(row=>{
      const rival=reportsById.get(row.id);return rival?competitorRow(rival,profilesById.get(row.id),rankings?.byId?.[row.id]):row;
    });
    const subjectIndex=Number(people[0]?.competition?.index)||0;for(const row of people)if(row.competition)row.competition.gap=Math.round(((Number(row.competition.index)||0)-subjectIndex)*10)/10;
    return {...topic,display:{...topic.display,people}};
  });
  return {...report,diagnoses};
}

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
  const repository=createIntelligenceRepository(storageCommand,{now:options.now}),now=options.now||Date.now,env=options.env||process.env,requireReviewApproval=options.requireReviewApproval!==false;
  const collectRaw=options.collectRaw||collectPoliticianRaw,analyze=options.analyze||buildIntelligenceDraft,validateDraft=options.validateDraft||validateIntelligenceDraft,validateAll=options.validateSnapshot||validateSnapshot,validateStored=options.validateStoredSnapshot||validateCompactSnapshot;
  const loadOfficialContext=options.officialContextProvider||(options.collectRaw?async()=>null:async()=>{const [population,gallup]=await Promise.all([fetchOfficialPopulationContext({fetchImpl:options.fetchImpl,timeoutMs:options.timeoutMs}).catch(()=>null),fetchLatestGallupContext({fetchImpl:options.fetchImpl,timeoutMs:options.timeoutMs}).catch(()=>null)]);return {population,gallup};});

  async function loadProfiles(){
    const rows=Array.isArray(options.profiles)?options.profiles:(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(storageCommand,type)))).flat();
    return rows.filter(person=>person?.id&&person.isVacant!==true);
  }

  function hydrateStoredDraft(stored,person,peers){
    if(!stored?.input)return stored||null;
    const input=stored.input,officialContext=input.officialContext||null,raw={
      personId:person.id,snapshotId:stored.snapshot,collectedAt:new Date(Number(now())).toISOString(),officialProfile:person,
      searchAds:input.searchAds||null,news:{...(input.news||{items:[]}),aggregate:{articleCount:Number(stored.rankingInput?.articleCount)||input.news?.items?.length||0,sourceCount:Number(stored.rankingInput?.sourceCount)||0}},officialContext,sourceErrors:Array.isArray(input.sourceErrors)?input.sourceErrors:[]
    };
    const generated=analyze(person,raw,{peers,ageSex:officialContext?.ageSex||null,source:officialContext?.source||null,gallup:officialContext?.gallup||null,officialElection:officialContext?.officialElection||null},stored.algorithmVersion||ALGORITHM_VERSION);
    return applyAdminOverrides(generated,stored.adminOverrides);
  }

  async function status(){
    const [collection,publication,latestDraft,publicSnapshot,versions]=await Promise.all([repository.readJob('collect'),repository.readJob('publish'),repository.getLatestDraftId(),repository.getPublicPointer(),repository.listVersions()]);
    const validation=latestDraft?await repository.getValidation(latestDraft):null;
    return {release:releaseMetadata(env),sources:{naverSearchAds:naverCredentialStatus(env),googleNews:{configured:true,mode:'RSS_WEB'},officialPublicData:{configured:true,mode:'PUBLIC_WEB'}},collection,publication,latestDraft,publicSnapshot,validation,versions};
  }

  async function startCollection(){
    const credentials=naverCredentialStatus(env);if(!credentials.configured)throw Object.assign(new Error('NAVER_CREDENTIALS_MISSING'),{code:'NAVER_CREDENTIALS_MISSING',missing:credentials.missing});
    const current=await repository.readJob('collect');
    if(current?.status==='RUNNING'){
      const restarted=current.storageMode!=='INPUT_ONLY_V5',job=restarted?await repository.prepareCompactCollection():current;
      return {job,resumed:!restarted,restarted};
    }
    const publicSnapshot=await repository.getPublicPointer();
    await repository.cleanupObsoleteSnapshots([publicSnapshot]);
    await repository.clearHistory();
    const people=await loadProfiles(),id=snapshotId(now),job=await repository.createJob('collect',id,people.map(person=>person.id));
    await repository.putVersion({rawSnapshotId:id,analysisVersion:id,algorithmVersion:ALGORITHM_VERSION,generatedAt:now(),generatedBy:'admin-refresh',sourceRange:{from:new Date(Number(now())).toISOString(),to:new Date(Number(now())).toISOString()},newsIds:[],eventClusters:[],politicianTypes:[],validationReport:null,reviewStatus:'pending',status:'collecting',publishedAt:null,replacedVersionId:null});
    return {job,resumed:false};
  }

  async function retryCollectionFailures(){return {job:await repository.prepareFailedRetry('collect')};}

  async function runCollectionStep(){
    const credentials=naverCredentialStatus(env);if(!credentials.configured)throw Object.assign(new Error('NAVER_CREDENTIALS_MISSING'),{code:'NAVER_CREDENTIALS_MISSING',missing:credentials.missing});
    await repository.prepareCompactCollection();
    const batch=await repository.claimNextBatch('collect');
    if(batch.done)return {job:batch.job,batch:{start:batch.start,size:0,ids:[]},validation:batch.job?.snapshotId?await repository.getValidation(batch.job.snapshotId):null};
    await repository.updateVersion(batch.job.snapshotId,{status:'processing'});
    const people=await loadProfiles(),profileMap=new Map(people.map(person=>[person.id,person])),successIds=[],failures=[];
    let officialContext=null;try{officialContext=await loadOfficialContext();}catch{}
    await concurrentMap(batch.ids,5,async personId=>{
      const person=profileMap.get(personId);
      try{
        if(!person)throw Object.assign(new Error('POLITICIAN_PROFILE_MISSING'),{code:'POLITICIAN_PROFILE_MISSING'});
        const population=officialContext?.population||officialContext;
        const election=officialContext?.electionsByPerson?.[person.id]||officialContext?.officialElection||null,context={snapshotId:batch.job.snapshotId,peers:people,officialContext:officialContext?{source:population?.source||null,ageSex:selectAgeSexForPerson(population,person),gallup:officialContext?.gallup||null,officialElection:election}:null};
        const raw=await collectRaw(person,context,{fetchImpl:options.fetchImpl,env,now,retryDelays:options.retryDelays,timeoutMs:options.timeoutMs||3500});
        const analyzedResult=analyze(person,raw,{peers:people,ageSex:context.officialContext?.ageSex||null,source:population?.source||null,gallup:officialContext?.gallup||null,officialElection:election},ALGORITHM_VERSION),analyzed={...analyzedResult,algorithmVersion:analyzedResult?.algorithmVersion||ALGORITHM_VERSION},validation=validateDraft(analyzed);
        if(!validation.ok)throw Object.assign(new Error('DRAFT_VALIDATION_FAILED'),{code:'DRAFT_VALIDATION_FAILED',validation});
        const draft=compactIntelligenceDraft(analyzed);
        await repository.putDraft(batch.job.snapshotId,personId,draft);successIds.push(personId);
      }catch(error){failures.push(safeError(person||{id:personId},error,now));}
    });
    const job=await repository.completeBatch('collect',{start:batch.start,successIds,failures});
    let validation=null;
    if(terminal(job.status)){
      const successfulIds=new Set(job.successIds||[]),publishIds=(job.ids||[]).filter(personId=>successfulIds.has(personId));
      const drafts=(await repository.getDrafts(job.snapshotId,publishIds)).map(item=>item.value).filter(Boolean);
      await repository.updateVersion(job.snapshotId,{status:'validating'});
      validation=publishIds.length?validateStored(drafts,publishIds):{ok:false,total:0,expected:0,errors:['NO_SUCCESSFUL_COLLECTIONS']};await repository.setValidation(job.snapshotId,validation);
      const newsCount=drafts.reduce((sum,draft)=>sum+(draft.input?.news?.items?.length||0),0);
      await repository.updateVersion(job.snapshotId,{status:validation.ok?'draft':'failed',reviewStatus:validation.ok?'pending':'blocked',validationReport:validation,newsIds:[],newsCount,eventClusters:[],politicianTypes:[],sourceFailures:job.failures||[],publishableCount:publishIds.length,failedAt:validation.ok?null:now()});
    }
    return {job,batch:{start:batch.start,size:batch.ids.length,ids:batch.ids},validation};
  }

  async function preview(){
    const collection=await repository.readJob('collect'),draftId=collection?.snapshotId||await repository.getLatestDraftId();
    if(!draftId)return {ok:false,error:'COLLECTION_NOT_FOUND'};
    const profiles=await loadProfiles(),profileMap=new Map(profiles.map(person=>[person.id,person])),drafts=(await repository.getDrafts(draftId,collection?.ids||profiles.map(person=>person.id))).map(item=>item.value).filter(Boolean);
    const version=await repository.getVersion(draftId),sampleStored=drafts[0]||null,previewRankings=buildOperationalRankings(drafts,profileMap,draftId,now()),hydratedMap=new Map(drafts.map(stored=>[stored.id,withOperationalRank(hydrateStoredDraft(stored,profileMap.get(stored.id)||stored?.raw?.officialProfile,profiles),previewRankings?.byId?.[stored.id]||null)])),sample=sampleStored?enrichCompetitorDiagnosis(hydratedMap.get(sampleStored.id),hydratedMap,profileMap,previewRankings):null;
    return {ok:true,snapshotId:draftId,version,validation:await repository.getValidation(draftId),top30:previewRankings.overall,completed:drafts.length,total:collection?.total||profiles.length,reviewSample:sample?{personId:sample.id,news:(sample.news||[]).slice(0,10),eventClusters:sample.eventClusters||[],politicianType:sample.politicianType||null,diagnoses:sample.diagnoses||[],prescriptions:sample.prescriptions||[]}:null};
  }

  async function updateDraft(input={}){
    const collection=await repository.readJob('collect'),id=collection?.snapshotId||await repository.getLatestDraftId(),personId=String(input.personId||'');
    if(!id||!personId)throw new Error('DRAFT_NOT_FOUND');
    const version=await repository.getVersion(id);if(!version||!['draft','approved'].includes(version.status))throw new Error('DRAFT_NOT_EDITABLE');
    const current=(await repository.getDrafts(id,[personId]))[0]?.value;if(!current)throw new Error('DRAFT_NOT_FOUND');
    const profiles=await loadProfiles(),person=profiles.find(row=>row.id===personId);if(!person)throw new Error('POLITICIAN_PROFILE_MISSING');
    const hydrated=hydrateStoredDraft(current,person,profiles),draft={...hydrated,diagnoses:mergeRows(hydrated.diagnoses,input.diagnoses,DIAGNOSIS_EDITABLE),prescriptions:mergeRows(hydrated.prescriptions,input.prescriptions,PRESCRIPTION_EDITABLE)};
    const validation=validateDraft(draft);if(!validation.ok)throw Object.assign(new Error('DRAFT_VALIDATION_FAILED'),{validation});
    const adminOverrides={diagnoses:mergeOverrides(current.adminOverrides?.diagnoses,input.diagnoses,DIAGNOSIS_EDITABLE),prescriptions:mergeOverrides(current.adminOverrides?.prescriptions,input.prescriptions,PRESCRIPTION_EDITABLE)};
    await repository.putDraft(id,personId,compactIntelligenceDraft(draft,{adminOverrides}));await repository.appendRevision(id,{personId,editorId:String(input.editorId||'admin'),fields:[...(input.diagnoses||[]).map(row=>`diagnoses.${row.id}`),...(input.prescriptions||[]).map(row=>`prescriptions.${row.id}`)]});
    await repository.updateVersion(id,{status:'draft',reviewStatus:'changes_pending'});return {draft,validation};
  }

  async function approveDraft(input={}){
    const collection=await repository.readJob('collect'),id=collection?.snapshotId||await repository.getLatestDraftId();if(!id)throw new Error('DRAFT_NOT_FOUND');
    const validation=await repository.getValidation(id),version=await repository.getVersion(id);if(!validation?.ok||!version||!['draft','approved'].includes(version.status))throw new Error('COLLECTION_VALIDATION_REQUIRED');
    return {version:await repository.updateVersion(id,{status:'approved',reviewStatus:'approved',reviewedBy:String(input.reviewedBy||'admin'),approvedAt:now()})};
  }

  async function startPublish(){
    const collection=await repository.readJob('collect');
    if(!collection||!publishable(collection.status))throw new Error('COLLECTION_NOT_READY');
    const validation=await repository.getValidation(collection.snapshotId);
    if(!validation?.ok)throw new Error('COLLECTION_VALIDATION_REQUIRED');
    const version=await repository.getVersion(collection.snapshotId);
    if(requireReviewApproval&&version?.status!=='approved')throw new Error('DRAFT_APPROVAL_REQUIRED');
    if(!requireReviewApproval&&version?.status==='draft')await repository.updateVersion(collection.snapshotId,{status:'approved',reviewStatus:'approved',reviewedBy:'automatic-test-flow',approvedAt:now()});
    const publicSnapshot=await repository.getPublicPointer();
    await repository.cleanupObsoleteSnapshots([collection.snapshotId,publicSnapshot]);
    await repository.clearHistory();
    const successfulIds=new Set(collection.successIds||[]),publishIds=(collection.ids||[]).filter(personId=>successfulIds.has(personId));
    if(!publishIds.length)throw new Error('COLLECTION_NOT_READY');
    const job=await repository.createJob('publish',collection.snapshotId,publishIds);
    return {job,resumed:job.cursor>0};
  }

  async function finalizePublication(job){
    if(job.status!=='COMPLETED')return null;
    const profiles=await loadProfiles(),profileMap=new Map(profiles.map(person=>[person.id,person])),rows=await repository.getDrafts(job.snapshotId,job.ids),drafts=rows.map(item=>item.value).filter(Boolean),validation=validateStored(drafts,job.ids);
    if(!validation.ok){await repository.setValidation(job.snapshotId,{...validation,publish:true});await repository.setJobError('publish','PUBLICATION_VALIDATION_FAILED');return {ok:false,validation};}
    const rankings=buildOperationalRankings(drafts,profileMap,job.snapshotId,now());
    const previous=await repository.getPublicPointer(),previousVersion=previous?await repository.getVersion(previous):null,currentVersion=await repository.getVersion(job.snapshotId);
    try{
      await repository.setRankings(job.snapshotId,rankings);
      await repository.updateVersion(job.snapshotId,{status:'published',reviewStatus:'approved',publishedAt:now(),replacedVersionId:previous||null});
      if(previousVersion&&previous!==job.snapshotId)await repository.archiveVersion(previous,job.snapshotId);
      await repository.setPublicPointer(job.snapshotId);
    }catch(error){
      if(currentVersion)await repository.putVersion(currentVersion).catch(()=>{});
      if(previousVersion)await repository.putVersion(previousVersion).catch(()=>{});
      await repository.setJobError('publish',error).catch(()=>{});
      throw error;
    }
    const cleanupWarnings=[];
    try{await repository.cleanupObsoleteSnapshots([job.snapshotId]);}catch(error){cleanupWarnings.push(String(error?.code||error?.message||'SNAPSHOT_CLEANUP_FAILED'));}
    try{await repository.clearHistory();}catch(error){cleanupWarnings.push(String(error?.code||error?.message||'HISTORY_CLEANUP_FAILED'));}
    return {ok:true,validation,cleanupWarnings,rankings:{overall:rankings.overall},history:{entries:(await repository.listVersions()).length,previous:previous||null}};
  }

  async function runPublishStep(){
    await repository.prepareDraftPointerPublication();
    const batch=await repository.claimNextBatch('publish');
    if(batch.done)return {job:batch.job,batch:{start:batch.start,size:0,ids:[]},finalized:await finalizePublication(batch.job)};
    const drafts=await repository.getDrafts(batch.job.snapshotId,batch.ids),successIds=[],failures=[];
    for(const {personId,value} of drafts){
      try{if(!value)throw Object.assign(new Error('DRAFT_MISSING'),{code:'DRAFT_MISSING'});successIds.push(personId);}catch(error){failures.push(safeError({id:personId},Object.assign(error,{stage:'publish'}),now));}
    }
    const job=await repository.completeBatch('publish',{start:batch.start,successIds,failures}),finalized=terminal(job.status)?await finalizePublication(job):null;
    return {job,batch:{start:batch.start,size:batch.ids.length,ids:batch.ids},finalized};
  }

  async function getPublicRankings(){const pointer=await repository.getPublicPointer();return pointer?repository.getRankings(pointer):null;}
  async function getPublicIntelligence(personId){
    const pointer=await repository.getPublicPointer();if(!pointer)return null;
    const [draft,rankings,profiles]=await Promise.all([repository.getDrafts(pointer,[personId]).then(rows=>rows[0]?.value||null),repository.getRankings(pointer),loadProfiles()]);if(!draft)return null;
    const profilesById=new Map(profiles.map(row=>[row.id,row])),person=profilesById.get(personId);if(!person)return null;
    const target=withOperationalRank(hydrateStoredDraft(draft,person,profiles),rankings?.byId?.[personId]||null),competitorIds=[...new Set((diagnosisDisplay(target,'05').people||[]).map(row=>row.id).filter(id=>id&&id!==personId))].slice(0,3),rivalStored=competitorIds.length?await repository.getDrafts(pointer,competitorIds):[],reportsById=new Map([[personId,target]]);
    for(const {personId:rivalId,value} of rivalStored){const profile=profilesById.get(rivalId);if(value&&profile)reportsById.set(rivalId,withOperationalRank(hydrateStoredDraft(value,profile,profiles),rankings?.byId?.[rivalId]||null));}
    return enrichCompetitorDiagnosis(target,reportsById,profilesById,rankings);
  }

  return {status,startCollection,retryCollectionFailures,runCollectionStep,preview,updateDraft,approveDraft,startPublish,runPublishStep,getPublicRankings,getPublicIntelligence};
}
