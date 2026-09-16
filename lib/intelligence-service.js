import {createRefreshBilling} from './refresh-billing.js';
import {randomUUID} from 'node:crypto';
import {mutateParticipation} from './participation-admin.js';
import {decodeStored,encodeStored} from './intelligence-repository.js';
import {publishOnePerson,atomicValues} from './person-publication.js';
import {INTELLIGENCE_KEYS as PERSON_KEYS} from './intelligence-keys.js';
import { createMediaSpreadService } from './media-spread-service.js';
import { mergeNewsHistory } from './google-news.js';
import { createIntelligenceRepository } from './intelligence-repository.js';
import { collectPoliticianRaw } from './intelligence-collectors.js';
import { buildIntelligenceDraft } from './intelligence-analysis.js';
import { validateIntelligenceDraft, validateSnapshot } from './intelligence-validation.js';
import { naverCredentialStatus } from './naver-search-ads.js';
import { POLITICIAN_TYPES, readPoliticianType } from './politician-store.js';
import { fetchOfficialPopulationContext, selectAgeSexForPerson } from './official-public-data.js';
import { fetchLatestGallupContext } from './gallup-public.js';
import { buildOperationalRankings, withOperationalRank, rankingChanges, keywordArticles } from './operational-ranking.js';
import { compactIntelligenceDraft, validateCompactSnapshot } from './intelligence-storage.js';
import { releaseMetadata } from '../src/core/release.js';
import { DEFAULT_RANKING_WEIGHTS, validateRankingWeights, sameRankingWeights } from '../src/core/ranking-weights.js';
import { createYouTubeChannelService } from './youtube-channel-service.js';
import { createAdminPoliticianService } from './admin-politician-service.js';

let keywordCache=null;
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
const DIAGNOSIS_EDITABLE=['headline','currentPosition','politicalMeaning','opportunity','risk','interpretation','pastRisks'];
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

function applyDiagnosisOverrides(base,patch){
  return mergeRows(base,patch,DIAGNOSIS_EDITABLE).map(row=>{
    if(!Array.isArray(row.pastRisks))return row;
    const {pastRisks,...diagnosis}=row;
    return {...diagnosis,display:{...(diagnosis.display||{}),pastRisks}};
  });
}

function applyAdminOverrides(draft,overrides={}){
  return {...draft,diagnoses:applyDiagnosisOverrides(draft?.diagnoses,overrides?.diagnoses),prescriptions:mergeRows(draft?.prescriptions,overrides?.prescriptions,PRESCRIPTION_EDITABLE)};
}

function diagnosisDisplay(report,id){return (Array.isArray(report?.diagnoses)?report.diagnoses:[]).find(row=>row.id===id)?.display||{};}
function competitorRow(report,profile,rankRow){
  const brand=diagnosisDisplay(report,'01'),media=diagnosisDisplay(report,'07'),risk=diagnosisDisplay(report,'06'),competitive=diagnosisDisplay(report,'05'),competitiveDiagnosis=(Array.isArray(report?.diagnoses)?report.diagnoses:[]).find(row=>row.id==='05'),ownRow=Array.isArray(competitive.people)?competitive.people.find(row=>row.id===report?.id)||competitive.people[0]:null,agendaRows=Array.isArray(media.agendaPenetration)?media.agendaPenetration:[],agendaTotal=agendaRows.reduce((sum,row)=>sum+(Number(row.articles)||0),0);
  return {
    id:report?.id,name:profile?.name||report?.id,party:profile?.party,office:profile?.office||profile?.roleLabel,region:profile?.jurisdiction||profile?.region,
    overallRank:rankRow?.rank??null,categoryRank:rankRow?.categoryRank??null,
    pc:Number.isFinite(Number(brand.search?.pc))?Number(brand.search.pc):null,mobile:Number.isFinite(Number(brand.search?.mobile))?Number(brand.search.mobile):null,
    newsCount:Number.isFinite(Number(media.articleCount))?Number(media.articleCount):null,sourceCount:Number.isFinite(Number(media.sourceCount))?Number(media.sourceCount):null,
    newsPeriods:Array.isArray(ownRow?.newsPeriods)?ownRow.newsPeriods:[],framePeriods:Array.isArray(ownRow?.framePeriods)?ownRow.framePeriods:[],
    frames:risk.frames&&typeof risk.frames==='object'?risk.frames:null,
    agendas:agendaRows.slice(0,3).map(row=>({label:row.label,share:agendaTotal?Math.round((Number(row.articles)||0)/agendaTotal*100):null,articles:Number(row.articles)||0,outlets:Number(row.outlets)||0})),
    election:ownRow?.election||null,
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
  const repository=createIntelligenceRepository(storageCommand,{now:options.now}),now=options.now||Date.now,env=options.env||process.env;
  const collectRaw=options.collectRaw||collectPoliticianRaw,analyze=options.analyze||buildIntelligenceDraft,validateDraft=options.validateDraft||validateIntelligenceDraft,validateAll=options.validateSnapshot||validateSnapshot,validateStored=options.validateStoredSnapshot||validateCompactSnapshot;
  const loadOfficialContext=options.officialContextProvider||(options.collectRaw?async()=>null:async()=>{const [population,gallup]=await Promise.all([fetchOfficialPopulationContext({fetchImpl:options.fetchImpl,timeoutMs:options.timeoutMs}).catch(()=>null),fetchLatestGallupContext({fetchImpl:options.fetchImpl,timeoutMs:options.timeoutMs}).catch(()=>null)]);return {population,gallup};});

  async function loadProfiles(){
    const rows=Array.isArray(options.profiles)?options.profiles:(await Promise.all(POLITICIAN_TYPES.map(type=>readPoliticianType(storageCommand,type)))).flat();
    return rows.filter(person=>person?.id&&person.isVacant!==true);
  }
  const youtubeChannels=options.youtubeChannels||createYouTubeChannelService({command:storageCommand,profilesProvider:loadProfiles,env,fetchImpl:options.fetchImpl,now,timeoutMs:options.timeoutMs});
  const adminPoliticians=options.adminPoliticians||createAdminPoliticianService({command:storageCommand,profilesProvider:loadProfiles,now});

  const refreshBilling=createRefreshBilling({command:storageCommand,now});
  function hydrateStoredDraft(stored,person,peers){
    if(!stored?.input)return stored||null;
    const input=stored.input,officialContext=input.officialContext||null,raw={
      personId:person.id,snapshotId:stored.snapshot,collectedAt:input.collectedAt||new Date(Number(now())).toISOString(),officialProfile:person,
      collectionProfile:input.collectionProfile||null,searchAds:input.searchAds||null,news:{...(input.news||{items:[]}),aggregate:{articleCount:Number(stored.rankingInput?.articleCount)||input.news?.items?.length||0,sourceCount:Number(stored.rankingInput?.sourceCount)||0}},youtube:input.youtube||null,officialContext,sourceErrors:Array.isArray(input.sourceErrors)?input.sourceErrors:[]
    };
    const generated=analyze(person,raw,{peers,ageSex:officialContext?.ageSex||null,source:officialContext?.source||null,gallup:officialContext?.gallup||null,officialElection:officialContext?.officialElection||null},stored.algorithmVersion||ALGORITHM_VERSION);
    return applyAdminOverrides(generated,stored.adminOverrides);
  }

  async function getRankingWeights(){
    const stored=await repository.getRankingWeights();
    return {...validateRankingWeights(stored??DEFAULT_RANKING_WEIGHTS),updatedAt:stored?.updatedAt||'',updatedBy:stored?.updatedBy||''};
  }
  async function saveRankingWeights(input={}){
    const weights=validateRankingWeights(input),rankingWeights={...weights,updatedAt:new Date(Number(now())).toISOString(),updatedBy:String(input.editorId||'admin').slice(0,24)};
    await repository.setRankingWeights(rankingWeights);
    return {rankingWeights};
  }
  async function status(){
    const [collection,publication,latestDraft,publicSnapshot,versions,youtube,rankingWeights]=await Promise.all([repository.readJob('collect'),repository.readJob('publish'),repository.getLatestDraftId(),repository.getPublicPointer(),repository.listVersions(),youtubeChannels.status(),getRankingWeights()]);
    const [validation,publicRankings]=await Promise.all([latestDraft?repository.getValidation(latestDraft):null,publicSnapshot?repository.getRankings(publicSnapshot):null]);
    const publicRankingWeights=publicRankings?validateRankingWeights(publicRankings.weights??DEFAULT_RANKING_WEIGHTS):null;
    return {refreshPolicy:await refreshBilling.policy(),rankingWeights,publicRankingWeights,release:releaseMetadata(env),sources:{naverSearchAds:naverCredentialStatus(env),youtubeDataApi:youtube.credentials,googleNews:{configured:true,mode:'RSS_WEB'},officialPublicData:{configured:true,mode:'PUBLIC_WEB'}},youtube,collection,publication,latestDraft,publicSnapshot,validation,versions};
  }

  async function startYouTubeDiscovery(){return youtubeChannels.startDiscovery();}
  async function runYouTubeDiscoveryStep(){return youtubeChannels.runDiscoveryStep();}
  async function saveYouTubeChannel(input={}){return youtubeChannels.saveMapping(input);}
  async function rediscoverYouTubeChannel(input={}){return youtubeChannels.rediscover(input.personId);}
  async function deleteYouTubeChannel(input={}){return youtubeChannels.deleteMapping(input.personId);}
  async function adminPoliticianStatus(query=''){return Promise.all([adminPoliticians.list(query),adminPoliticians.completeness(),adminPoliticians.audit()]).then(([list,completeness,audit])=>({list,completeness,audit}));}
  async function saveCollectionProfile(input={}){return adminPoliticians.saveCollectionProfile(input.personId,input.collectionProfile,input.editorId);}
  async function savePastRisks(input={}){return adminPoliticians.savePastRisks(input.personId,input.pastRisks,input.editorId||input.reviewedBy);}
  async function saveNewsExclusions(input={}){return adminPoliticians.saveNewsExclusions(input.personId,input.newsExclusions,input.editorId||input.reviewedBy);}

  async function preserveNewsHistory(personId,raw){
    if(!repository.getNewsHistory||!repository.putNewsHistory)return raw;
    raw.collectedAt=raw.collectedAt||new Date(Number(now())).toISOString();
    const previous=await repository.getNewsHistory(personId)||{},ledger=mergeNewsHistory(previous,raw.news||{},raw.collectedAt);
    await repository.putNewsHistory(personId,ledger);
    raw.historicalAggregates={...(raw.news?.historicalAggregates||{}),persistence:{daily:ledger.daily.map(({keys,...row})=>row)}};
    if(raw.news)raw.news={...raw.news,historicalAggregates:raw.historicalAggregates};return raw;
  }
  async function refreshPerson(input={},internal={}){
    const personId=String(input.personId||''),people=await loadProfiles(),person=people.find(row=>row.id===personId);if(!person)throw new Error('POLITICIAN_PROFILE_MISSING');
    if(!naverCredentialStatus(env).configured)throw Error('NAVER_CREDENTIALS_MISSING');
    const publication=await repository.readJob('publish');if(publication?.status==='RUNNING'||publication?.publicationPending)throw Error('PUBLICATION_BUSY');
    const basePublicSnapshot=await repository.getPublicPointer(),snapshotId=`person-${personId}`,refreshId=randomUUID(),editorial=await adminPoliticians.editorialInputs(personId);
    const previousRefresh=await mutateParticipation(storageCommand,[PERSON_KEYS.personRefresh(personId)],([record])=>{
      if((record.status==='COLLECTING'||['DRAFT','APPROVED'].includes(record.status)&&record.billingUserId)&&record.expiresAt>now())throw Error('PERSON_REFRESH_BUSY');
      Object.assign(record,{status:'COLLECTING',refreshId,expiresAt:now()+120000,personId});return {...record};
    });
    try{
      const youtubeRegistry=await youtubeChannels.registryForCollection();let officialContext=null;try{officialContext=await loadOfficialContext();}catch{}
      const population=officialContext?.population||officialContext,election=officialContext?.electionsByPerson?.[personId]||officialContext?.officialElection||null,context={snapshotId,peers:people,youtubeChannel:youtubeRegistry[personId]||null,newsExclusions:editorial.newsExclusions,collectionProfile:editorial.collectionProfile,officialContext:officialContext?{source:population?.source||null,ageSex:selectAgeSexForPerson(population,person),gallup:officialContext?.gallup||null,officialElection:election}:null};
      const collected=await collectRaw(person,context,{fetchImpl:options.fetchImpl,env,now,retryDelays:options.retryDelays,timeoutMs:options.timeoutMs||3500});
      if(!collected.searchAds||!collected.news||(collected.sourceErrors||[]).some(x=>/NAVER|GOOGLE/.test(x.source))||(collected.news.coverage||[]).some(x=>x.collected!==true))throw Error('PERSON_SOURCE_INCOMPLETE');
      const raw=await preserveNewsHistory(person.id,{...collected,collectionProfile:editorial.collectionProfile}),generated=analyze(person,raw,{peers:people,ageSex:context.officialContext?.ageSex||null,source:population?.source||null,gallup:officialContext?.gallup||null,officialElection:election},ALGORITHM_VERSION),draft=await adminPoliticians.applyToDraft(personId,{...generated,algorithmVersion:generated?.algorithmVersion||ALGORITHM_VERSION}),validation=validateDraft(draft);
      if(!validation.ok)throw Object.assign(Error('DRAFT_VALIDATION_FAILED'),{validation});
      const stored={...compactIntelligenceDraft(draft,{adminOverrides:editorial.pastRisks.length?{diagnoses:[{id:'01',pastRisks:editorial.pastRisks}]}:undefined}),refreshId};
      const record={personId,snapshotId,refreshId,basePublicSnapshot,lastPublishedAt:previousRefresh.lastPublishedAt||previousRefresh.publishedAt||0,expiresAt:now()+120000,...(internal.billing?{billingUserId:internal.billing.userId,billingRequestId:internal.billing.requestId}:{}),status:'DRAFT',createdAt:now(),createdBy:String(input.editorId||'admin'),collectionProfile:editorial.collectionProfile,newsExclusions:editorial.newsExclusions,validation};
      // Store data and readiness together, so no request can publish half of a revision.
      await mutateParticipation(storageCommand,[PERSON_KEYS.personRefresh(personId),PERSON_KEYS.draft(snapshotId,personId)],([current,data])=>{
        if(current.refreshId!==refreshId||current.status!=='COLLECTING'||current.expiresAt<now())throw Error('PERSON_REFRESH_CHANGED');
        for(const key of Object.keys(current))delete current[key];Object.assign(current,record);
        for(const key of Object.keys(data))delete data[key];Object.assign(data,stored);return null;
      });
      await adminPoliticians.log(input.editorId||'admin','PERSON_REFRESH',personId,{snapshotId}).catch(()=>{});
      return {refresh:record,draft,summary:{search:raw.searchAds,news:raw.news,previousRank:(await repository.getRankings(basePublicSnapshot))?.byId?.[personId]||null}};
    }catch(error){await mutateParticipation(storageCommand,[PERSON_KEYS.personRefresh(personId)],([record])=>{if(record.refreshId===refreshId&&record.status==='COLLECTING'){record.status='FAILED';record.error=error.message;}return null;}).catch(()=>{});throw error;}
  }
  async function approvePersonRefresh(input={}){
    return mutateParticipation(storageCommand,[PERSON_KEYS.personRefresh(String(input.personId||''))],([record])=>{
      if(record.status!=='DRAFT')throw Error('PERSON_REFRESH_NOT_READY');if(record.billingUserId)throw Error('PERSON_REFRESH_MEMBER_OWNED');
      Object.assign(record,{status:'APPROVED',approvedAt:now(),approvedBy:String(input.reviewedBy||input.editorId||'admin')});return {refresh:record};
    });
  }
  async function publishPersonRefresh(input={},internal={}){
    return publishOnePerson({command:storageCommand,repository,profiles:await loadProfiles(),personId:String(input.personId||''),refreshId:input.refreshId,now,billing:internal.billing});
  }
  const saveRefreshPolicy=input=>refreshBilling.save(input);
  async function personRefreshQuote(user,personId){if(!(await loadProfiles()).some(x=>x.id===personId))throw Error('POLITICIAN_PROFILE_MISSING');return refreshBilling.quote(user,personId);}
  const memberRefreshStatus=(user,requestId)=>refreshBilling.status(user,requestId);
  async function requestMemberRefresh(user,input={}){
    if(!user?.id||user.status==='suspended')throw Error('LOGIN_REQUIRED');
    const personId=String(input.personId||'');if(!(await loadProfiles()).some(x=>x.id===personId))throw Error('POLITICIAN_PROFILE_MISSING');
    if(!await repository.getPublicPointer())throw Error('PUBLIC_SNAPSHOT_REQUIRED');
    const begun=await refreshBilling.begin(user,{...input,personId});if(begun.existing)return begun.existing;
    try{const collected=await refreshPerson({personId,editorId:user.id},{billing:begun.billing});return await publishPersonRefresh({personId,refreshId:collected.refresh.refreshId},{billing:begun.billing});}
    catch(error){const completed=await refreshBilling.fail(user,input.requestId,error);if(completed)return completed;await mutateParticipation(storageCommand,[PERSON_KEYS.personRefresh(personId)],([record])=>{if(record.billingRequestId===input.requestId&&record.status!=='PUBLISHED')record.status='FAILED';return null;}).catch(()=>{});throw error;}
  }
  async function personRefreshStatus(input={}){
    const personId=String(input.personId||''),record=await repository.getPersonRefresh(personId);
    const draft=record&&['DRAFT','APPROVED','PUBLISHED'].includes(record.status)?(await repository.getDrafts(record.snapshotId,[personId]))[0]?.value:null;
    const pointer=await repository.getPublicPointer(),rank=pointer?(await repository.getRankings(pointer))?.byId?.[personId]:null;
    return {refresh:record,summary:draft?{search:draft.input.searchAds,news:draft.input.news,rank}:null};
  }

  async function startCollection(){
    const publication=await repository.readJob('publish');if(publication?.status==='RUNNING'||publication?.publicationPending)throw Error('PUBLICATION_BUSY');
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
    const batch=await repository.claimNextBatch('collect',10);
    if(batch.done)return {job:batch.job,batch:{start:batch.start,size:0,ids:[]},validation:batch.job?.snapshotId?await repository.getValidation(batch.job.snapshotId):null};
    await repository.updateVersion(batch.job.snapshotId,{status:'processing'});
    const people=await loadProfiles(),profileMap=new Map(people.map(person=>[person.id,person])),youtubeRegistry=await youtubeChannels.registryForCollection(),successIds=[],failures=[];
    let officialContext=null;try{officialContext=await loadOfficialContext();}catch{}
    const saved=new Map((await repository.getDrafts(batch.job.snapshotId,batch.ids)).map(row=>[row.personId,row.value]));
    await concurrentMap(batch.ids,5,async personId=>{
      const person=profileMap.get(personId);
      try{
        if(saved.get(personId)?.storageMode==='INPUT_ONLY_V5'&&saved.get(personId)?.id===personId&&saved.get(personId)?.snapshot===batch.job.snapshotId){successIds.push(personId);return;}
        if(!person)throw Object.assign(new Error('POLITICIAN_PROFILE_MISSING'),{code:'POLITICIAN_PROFILE_MISSING'});
        const population=officialContext?.population||officialContext;
        const editorial=await adminPoliticians.editorialInputs(person.id),election=officialContext?.electionsByPerson?.[person.id]||officialContext?.officialElection||null,context={snapshotId:batch.job.snapshotId,peers:people,youtubeChannel:youtubeRegistry[person.id]||null,newsExclusions:editorial.newsExclusions,collectionProfile:editorial.collectionProfile,officialContext:officialContext?{source:population?.source||null,ageSex:selectAgeSexForPerson(population,person),gallup:officialContext?.gallup||null,officialElection:election}:null};
        const raw=await preserveNewsHistory(person.id,await collectRaw(person,context,{fetchImpl:options.fetchImpl,env,now,retryDelays:options.retryDelays,timeoutMs:options.timeoutMs||3500}));
        const analyzedResult=analyze(person,raw,{peers:people,ageSex:context.officialContext?.ageSex||null,source:population?.source||null,gallup:officialContext?.gallup||null,officialElection:election},ALGORITHM_VERSION),base={...analyzedResult,algorithmVersion:analyzedResult?.algorithmVersion||ALGORITHM_VERSION},analyzed=await adminPoliticians.applyToDraft(person.id,base),validation=validateDraft(analyzed);
        if(!validation.ok)throw Object.assign(new Error('DRAFT_VALIDATION_FAILED'),{code:'DRAFT_VALIDATION_FAILED',validation});
        const draft=compactIntelligenceDraft(analyzed,{adminOverrides:editorial.pastRisks.length?{diagnoses:[{id:'01',pastRisks:editorial.pastRisks}]}:undefined});
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
    const rankingWeights=await getRankingWeights();
    const collection=await repository.readJob('collect'),draftId=collection?.snapshotId||await repository.getLatestDraftId();
    if(!draftId)return {ok:false,error:'COLLECTION_NOT_FOUND'};
    const profiles=await loadProfiles(),profileMap=new Map(profiles.map(person=>[person.id,person])),drafts=(await repository.getDrafts(draftId,collection?.ids||profiles.map(person=>person.id))).map(item=>item.value).filter(Boolean);
    const version=await repository.getVersion(draftId),sampleStored=drafts[0]||null,previewRankings=buildOperationalRankings(drafts,profileMap,draftId,now(),rankingWeights),hydratedMap=new Map(drafts.map(stored=>[stored.id,withOperationalRank(hydrateStoredDraft(stored,profileMap.get(stored.id)||stored?.raw?.officialProfile,profiles),previewRankings?.byId?.[stored.id]||null)])),sample=sampleStored?enrichCompetitorDiagnosis(hydratedMap.get(sampleStored.id),hydratedMap,profileMap,previewRankings):null;
    return {ok:true,rankingWeights,snapshotId:draftId,version,validation:await repository.getValidation(draftId),top30:previewRankings.overall,completed:drafts.length,total:collection?.total||profiles.length,reviewTargets:profiles.filter(person=>hydratedMap.has(person.id)).map(person=>({id:person.id,name:person.name})),reviewSample:sample?{personId:sample.id,news:(sample.news||[]).slice(0,10),eventClusters:sample.eventClusters||[],politicianType:sample.politicianType||null,diagnoses:sample.diagnoses||[],prescriptions:sample.prescriptions||[]}:null};
  }

  async function updateDraft(input={}){
    const collection=await repository.readJob('collect'),id=collection?.snapshotId||await repository.getLatestDraftId(),personId=String(input.personId||'');
    if(!id||!personId)throw new Error('DRAFT_NOT_FOUND');
    const version=await repository.getVersion(id);if(!version||!['draft','approved'].includes(version.status))throw new Error('DRAFT_NOT_EDITABLE');
    const current=(await repository.getDrafts(id,[personId]))[0]?.value;if(!current)throw new Error('DRAFT_NOT_FOUND');
    const profiles=await loadProfiles(),person=profiles.find(row=>row.id===personId);if(!person)throw new Error('POLITICIAN_PROFILE_MISSING');
    const hydrated=hydrateStoredDraft(current,person,profiles),draft={...hydrated,diagnoses:applyDiagnosisOverrides(hydrated.diagnoses,input.diagnoses),prescriptions:mergeRows(hydrated.prescriptions,input.prescriptions,PRESCRIPTION_EDITABLE)};
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
    const running=await repository.readJob('publish');if(running?.status==='RUNNING'||running?.publicationPending)return {job:running,resumed:true};
    const collection=await repository.readJob('collect');
    if(!collection||!publishable(collection.status))throw Error('COLLECTION_NOT_READY');
    const validation=await repository.getValidation(collection.snapshotId);if(!validation?.ok)throw Error('COLLECTION_VALIDATION_REQUIRED');
    const successfulIds=new Set(collection.successIds||[]),publishIds=(collection.ids||[]).filter(id=>successfulIds.has(id));if(!publishIds.length)throw Error('COLLECTION_NOT_READY');
    const rankingWeights=await getRankingWeights(),job=await repository.createJob('publish',collection.snapshotId,publishIds,{rankingWeights});
    const publicSnapshot=await repository.getPublicPointer();
    await repository.cleanupObsoleteSnapshots([job.snapshotId,publicSnapshot]);await repository.clearHistory();
    const version=await repository.getVersion(job.snapshotId);if(version?.status==='draft')await repository.updateVersion(job.snapshotId,{status:'approved',reviewStatus:'automatic',reviewedBy:'automatic-validation',approvedAt:now()});
    return {job,resumed:job.cursor>0};
  }

  async function finalizePublicationWork(job){
    if(job.status!=='COMPLETED')return null;
    const profiles=await loadProfiles(),profileMap=new Map(profiles.map(person=>[person.id,person])),rows=await repository.getDrafts(job.snapshotId,job.ids);
    const active=await repository.getPublicPointer();
    const expectedIds=[...job.ids];
    if(active&&active!==job.snapshotId){
      const previousRows=await repository.getDrafts(active,profiles.map(p=>p.id)),byId=new Map(rows.map(x=>[x.personId,x]));
      for(const previous of previousRows){const row=byId.get(previous.personId),newer=previous.value;if(newer?.personPublishedAt&&(!row||newer.personPublishedAt>Date.parse(row.value?.input?.collectedAt||''))){if(row)row.value=newer;else{rows.push(previous);expectedIds.push(previous.personId);}await repository.putDraft(job.snapshotId,previous.personId,newer);}}
    }
    const drafts=rows.map(item=>item.value).filter(Boolean),validation=validateStored(drafts,expectedIds);
    if(!validation.ok){await repository.setValidation(job.snapshotId,{...validation,publish:true});await repository.setJobError('publish','PUBLICATION_VALIDATION_FAILED');return {ok:false,validation};}
    const rankingWeights=validateRankingWeights(job.rankingWeights??DEFAULT_RANKING_WEIGHTS),rankings=buildOperationalRankings(drafts,profileMap,job.snapshotId,now(),rankingWeights);
    const previous=await repository.getPublicPointer(),previousVersion=previous?await repository.getVersion(previous):null,currentVersion=await repository.getVersion(job.snapshotId);
    const earlier=previous?await repository.getRankings(previous):null;rankings.rising=previous===job.snapshotId&&earlier?.rising&&sameRankingWeights(rankings.weights,earlier.weights)?earlier.rising:rankingChanges(rankings,earlier);
    const keys=[PERSON_KEYS.job('publish'),PERSON_KEYS.publicPointer,PERSON_KEYS.rankings(job.snapshotId),PERSON_KEYS.version(job.snapshotId)],before=await Promise.all(keys.map(key=>storageCommand(['GET',key]).then(v=>v||''))),currentJob=before[0]?JSON.parse(before[0]):{};
    if(currentJob.finalizeToken!==job.finalizeToken||currentJob.finalizeExpiresAt<now())throw Error('PUBLICATION_BUSY');
    const nextVersion={...currentVersion,status:'published',reviewStatus:'approved',publishedAt:now(),updatedAt:now(),replacedVersionId:previous||null,rankingWeights};
    const after=[JSON.stringify({...currentJob,publicationPending:true,finalizedAt:now()}),job.snapshotId,encodeStored(rankings),JSON.stringify(nextVersion)];
    if(!await atomicValues(storageCommand,keys,before,after))throw Error('PERSON_PUBLICATION_CHANGED_RETRY');
    const cleanupWarnings=[];
    try{if(previous!==job.snapshotId)await createMediaSpreadService({command:storageCommand,env,now}).preload(job.snapshotId,drafts,profiles);}catch(error){cleanupWarnings.push('MEDIA_INDEX_DEFERRED');}
    try{await repository.cleanupObsoleteSnapshots([job.snapshotId]);}catch(error){cleanupWarnings.push(String(error?.code||error?.message||'SNAPSHOT_CLEANUP_FAILED'));}
    try{await repository.clearHistory();}catch(error){cleanupWarnings.push(String(error?.code||error?.message||'HISTORY_CLEANUP_FAILED'));}
    return {ok:true,validation,cleanupWarnings,rankings:{overall:rankings.overall},history:{entries:(await repository.listVersions()).length,previous:previous||null}};
  }

  async function finalizePublication(job){
    if(job.status!=='COMPLETED')return null;
    const key=PERSON_KEYS.job('publish'),raw=String(await storageCommand(['GET',key])||''),current=raw?JSON.parse(raw):null;
    if(!current||current.id!==job.id)throw Error('PUBLICATION_BUSY');
    if(current.finalizedAt&&!current.publicationPending)return {ok:true,alreadyPublished:true};
    if(current.finalizedAt&&current.finalizeExpiresAt<=now()){if(!await atomicValues(storageCommand,[key],[raw],[JSON.stringify({...current,publicationPending:false,finalizeToken:''})]))throw Error('PUBLICATION_BUSY');return {ok:true,alreadyPublished:true};}
    if(current.finalizeToken&&current.finalizeExpiresAt>now())throw Error('PUBLICATION_BUSY');
    const claimed={...current,publicationPending:true,finalizeToken:randomUUID(),finalizeExpiresAt:now()+120000};
    if(!await atomicValues(storageCommand,[key],[raw],[JSON.stringify(claimed)]))throw Error('PUBLICATION_BUSY');
    try{return await finalizePublicationWork(claimed);}
    finally{const latestRaw=String(await storageCommand(['GET',key])||''),latest=latestRaw?JSON.parse(latestRaw):{};if(latest.finalizeToken===claimed.finalizeToken&&latest.publicationPending)await atomicValues(storageCommand,[key],[latestRaw],[JSON.stringify({...latest,publicationPending:latest.finalizedAt?false:true,finalizeToken:''})]).catch(()=>{});}
  }

  async function runPublishStep(){
    await repository.prepareDraftPointerPublication();
    const batch=await repository.claimNextBatch('publish');
    if(batch.done)return {job:batch.job,batch:{start:batch.start,size:0,ids:[]},finalized:await finalizePublication(batch.job)};
    await repository.compressDrafts(batch.job.snapshotId,batch.ids).catch(error=>{error.stage='수집 데이터 압축';throw error;});
    const drafts=await repository.getDrafts(batch.job.snapshotId,batch.ids),successIds=[],failures=[];
    for(const {personId,value} of drafts){
      try{if(!value)throw Object.assign(new Error('DRAFT_MISSING'),{code:'DRAFT_MISSING'});successIds.push(personId);}catch(error){failures.push(safeError({id:personId},Object.assign(error,{stage:'publish'}),now));}
    }
    const job=await repository.completeBatch('publish',{start:batch.start,successIds,failures}),finalized=terminal(job.status)?await finalizePublication(job):null;
    return {job,batch:{start:batch.start,size:batch.ids.length,ids:batch.ids},finalized};
  }

  async function getPublicRankings(options={}){const pointer=await repository.getPublicPointer();if(!pointer)return null;const result=await repository.getRankings(pointer);if(!result)return null;if(options.keywords&&!Array.isArray(result.keywordArticles)){const scope=env.JCS_REBUILD_REDIS_REDIS_URL||env.JCS_REBUILD_REDIS_URL||env.JCS_REBUILD_REDIS_REST_URL||'',key=scope+'|'+pointer+'|'+result.generatedAt;let pending=scope&&keywordCache?.key===key&&keywordCache.until>Date.now()?keywordCache.pending:null;if(!pending){pending=repository.getDrafts(pointer,Object.keys(result.byId||{})).then(rows=>keywordArticles(rows.map(row=>row.value).filter(Boolean)));if(scope){keywordCache={key,until:Date.now()+60000,pending};pending.catch(()=>{if(keywordCache?.pending===pending)keywordCache=null;});}}return {...result,keywordArticles:await pending};}if(!options.keywords){const {keywordArticles:unused,...compact}=result;return compact;}return result;}
  async function getPublicIntelligenceUnstable(personId,retry=false){
    const initial=retry?await storageCommand(['MGET',PERSON_KEYS.publicPointer,PERSON_KEYS.publicPersonOverride(personId)]):null;
    const [pointer,override]=initial?[String(initial[0]||''),initial[1]?decodeStored(initial[1]):null]:await Promise.all([repository.getPublicPointer(),repository.getPublicPersonOverride(personId)]);if(!pointer)return null;
    const draftPointer=override?.basePublicSnapshot===pointer?override.snapshotId:pointer;
    const [bundle,profiles]=await Promise.all([storageCommand(['MGET',PERSON_KEYS.publicPointer,PERSON_KEYS.publicPersonOverride(personId),PERSON_KEYS.rankings(pointer),PERSON_KEYS.draft(draftPointer,personId),PERSON_KEYS.mediaRevision]),loadProfiles()]);
    const parse=value=>value?decodeStored(value):null;
    if(String(bundle?.[0]||'')!==pointer||JSON.stringify(parse(bundle?.[1]))!==JSON.stringify(override))return {retry:true};
    const draft=parse(bundle?.[3]),rankings=parse(bundle?.[2]);if(!draft)return null;
    const profilesById=new Map(profiles.map(row=>[row.id,row])),person=profilesById.get(personId);if(!person)return null;
    const target=withOperationalRank(await adminPoliticians.applyToDraft(personId,hydrateStoredDraft(draft,person,profiles)),rankings?.byId?.[personId]||null),competitorIds=[...new Set((diagnosisDisplay(target,'05').people||[]).map(row=>row.id).filter(id=>id&&id!==personId))].slice(0,3),rivalStored=competitorIds.length?await repository.getDrafts(pointer,competitorIds):[],reportsById=new Map([[personId,target]]);
    for(const {personId:rivalId,value} of rivalStored){const profile=profilesById.get(rivalId);if(value&&profile)reportsById.set(rivalId,withOperationalRank(hydrateStoredDraft(value,profile,profiles),rankings?.byId?.[rivalId]||null));}
    return {report:enrichCompetitorDiagnosis(target,reportsById,profilesById,rankings),version:[bundle[0],bundle[4]]};
  }

  async function getPublicIntelligence(personId){
    for(let attempt=0;attempt<4;attempt++){
      const result=await getPublicIntelligenceUnstable(personId,attempt>0);if(!result)return null;if(result.retry)continue;
      const after=await storageCommand(['MGET',PERSON_KEYS.publicPointer,PERSON_KEYS.mediaRevision]);
      if(JSON.stringify(result.version)===JSON.stringify(after))return result.report;
    }
    throw Error('PERSON_PUBLICATION_CHANGED_RETRY');
  }
  return {saveRefreshPolicy,personRefreshQuote,memberRefreshStatus,requestMemberRefresh,loadProfiles,saveCollectionProfile,personRefreshStatus,saveRankingWeights,status,startCollection,retryCollectionFailures,runCollectionStep,preview,updateDraft,approveDraft,startPublish,runPublishStep,startYouTubeDiscovery,runYouTubeDiscoveryStep,saveYouTubeChannel,rediscoverYouTubeChannel,deleteYouTubeChannel,adminPoliticianStatus,savePastRisks,saveNewsExclusions,refreshPerson,approvePersonRefresh,publishPersonRefresh,getPublicRankings,getPublicIntelligence};
}
