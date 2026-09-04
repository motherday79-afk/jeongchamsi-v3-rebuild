import { INTELLIGENCE_KEYS } from './intelligence-keys.js';

export const MAX_POLITICIAN_BATCH=25;

const parseJson=(raw,fallback=null)=>{if(raw===null||raw===undefined||raw==='')return fallback;try{return typeof raw==='string'?JSON.parse(raw):raw;}catch{return fallback;}};
const clone=value=>JSON.parse(JSON.stringify(value));

export function chunkKeys(keys,size=MAX_POLITICIAN_BATCH){
  const batchSize=Math.floor(Number(size)||0);
  if(batchSize<1)throw new Error('BATCH_SIZE_INVALID');
  if(batchSize>MAX_POLITICIAN_BATCH)throw new Error('BATCH_SIZE_EXCEEDS_25');
  const rows=Array.isArray(keys)?keys:[];
  const chunks=[];
  for(let index=0;index<rows.length;index+=batchSize)chunks.push(rows.slice(index,index+batchSize));
  return chunks;
}

export async function batchedMget(command,keys,size=MAX_POLITICIAN_BATCH){
  const values=[];
  for(const chunk of chunkKeys(keys,size)){
    const result=await command(['MGET',...chunk]);
    values.push(...(Array.isArray(result)?result:Array(chunk.length).fill(null)));
  }
  return values;
}

export function createIntelligenceRepository(command,options={}){
  const now=typeof options.now==='function'?options.now:()=>Date.now();
  const read=async key=>parseJson(await command(['GET',key]),null);
  const write=async(key,value)=>{await command(['SET',key,JSON.stringify(value)]);return value;};
  async function scanKeys(pattern){
    const keys=[];let cursor='0';
    do{const result=await command(['SCAN',cursor,'MATCH',pattern,'COUNT','500']);cursor=String(result?.[0]||'0');keys.push(...(Array.isArray(result?.[1])?result[1].map(String):[]));}while(cursor!=='0');
    return [...new Set(keys)];
  }
  async function deleteKeys(keys){let removed=0;for(const chunk of chunkKeys([...new Set(keys)]))removed+=Number(await command(['DEL',...chunk])||0);return removed;}

  async function readJob(kind){return read(INTELLIGENCE_KEYS.job(kind));}

  async function createJob(kind,snapshotId,personIds){
    if(!['collect','publish'].includes(String(kind||'')))throw new Error('JOB_KIND_INVALID');
    const existing=await readJob(kind);
    if(existing?.status==='RUNNING')return existing;
    const ids=[...new Set((Array.isArray(personIds)?personIds:[]).map(String).filter(Boolean))];
    const timestamp=now();
    const job={
      id:`${kind}-${snapshotId}`,
      kind,
      snapshotId:String(snapshotId||''),
      status:ids.length?'RUNNING':'COMPLETED',
      ids,
      total:ids.length,
      cursor:0,
      completed:0,
      succeeded:0,
      failed:0,
      successIds:[],
      failures:[],
      activeBatch:null,
      createdAt:timestamp,
      updatedAt:timestamp,
      completedAt:ids.length?null:timestamp,
      storageMode:kind==='collect'?'VERSIONED_V3':null,
    };
    await write(INTELLIGENCE_KEYS.job(kind),job);
    if(kind==='collect')await command(['SET',INTELLIGENCE_KEYS.latestDraft,String(snapshotId||'')]);
    return clone(job);
  }

  async function claimNextBatch(kind){
    const job=await readJob(kind);
    if(!job)throw new Error('JOB_NOT_FOUND');
    if(job.status!=='RUNNING')return {done:true,start:job.cursor,ids:[],job};
    if(job.activeBatch?.ids?.length)return clone({...job.activeBatch,done:false,job});
    const start=Math.max(0,Number(job.cursor)||0),ids=job.ids.slice(start,start+MAX_POLITICIAN_BATCH);
    if(!ids.length){
      job.status=job.failed>0?'COMPLETED_WITH_ERRORS':'COMPLETED';
      job.completedAt=now();job.updatedAt=now();
      await write(INTELLIGENCE_KEYS.job(kind),job);
      return {done:true,start,ids:[],job:clone(job)};
    }
    job.activeBatch={start,ids,claimedAt:now()};job.updatedAt=now();
    await write(INTELLIGENCE_KEYS.job(kind),job);
    return clone({...job.activeBatch,done:false,job});
  }

  async function completeBatch(kind,result={}){
    const job=await readJob(kind);
    if(!job)throw new Error('JOB_NOT_FOUND');
    const active=job.activeBatch;
    if(!active||Number(result.start)!==Number(active.start))throw new Error('JOB_BATCH_MISMATCH');
    const activeSet=new Set(active.ids),successIds=[...new Set((result.successIds||[]).map(String))].filter(id=>activeSet.has(id));
    const failures=(result.failures||[]).filter(item=>activeSet.has(String(item?.personId||''))).map(item=>({
      personId:String(item.personId),stage:String(item.stage||'unknown'),code:String(item.code||'SOURCE_ERROR'),attempts:Math.max(1,Number(item.attempts)||1)
    }));
    const accounted=new Set([...successIds,...failures.map(item=>item.personId)]);
    for(const id of active.ids)if(!accounted.has(id))failures.push({personId:id,stage:'batch',code:'UNACCOUNTED_RESULT',attempts:1});
    job.successIds=[...new Set([...(job.successIds||[]),...successIds])];
    const priorFailures=new Map((job.failures||[]).map(item=>[item.personId,item]));
    for(const item of failures)priorFailures.set(item.personId,item);
    for(const id of successIds)priorFailures.delete(id);
    job.failures=[...priorFailures.values()];
    job.cursor=active.start+active.ids.length;
    job.completed=Math.min(job.total,job.cursor);
    job.succeeded=job.successIds.length;
    job.failed=job.failures.length;
    job.activeBatch=null;
    job.updatedAt=now();
    if(job.cursor>=job.total){job.status=job.failed?'COMPLETED_WITH_ERRORS':'COMPLETED';job.completedAt=now();}
    await write(INTELLIGENCE_KEYS.job(kind),job);
    return clone(job);
  }

  async function prepareDraftPointerPublication(){
    const job=await readJob('publish');
    if(!job)throw new Error('JOB_NOT_FOUND');
    if(job.storageMode==='DRAFT_POINTER')return clone(job);
    const ids=(job.ids||[]).map(String);
    for(const chunk of chunkKeys(ids))await command(['DEL',...chunk.map(personId=>INTELLIGENCE_KEYS.published(job.snapshotId,personId))]);
    const completedIds=ids.slice(0,Math.max(0,Number(job.cursor)||0));
    job.successIds=[...new Set([...(job.successIds||[]),...completedIds])];
    const completedSet=new Set(completedIds);
    job.failures=(job.failures||[]).filter(item=>!completedSet.has(String(item?.personId||'')));
    job.succeeded=job.successIds.length;
    job.failed=job.failures.length;
    job.activeBatch=null;
    job.storageMode='DRAFT_POINTER';
    job.updatedAt=now();
    await write(INTELLIGENCE_KEYS.job('publish'),job);
    return clone(job);
  }

  async function cleanupObsoleteSnapshots(protectedSnapshotIds=[]){
    const protectedIds=new Set((protectedSnapshotIds||[]).map(String).filter(Boolean));
    const keys=await scanKeys(`${INTELLIGENCE_KEYS.prefix}:*`),remove=[];
    for(const key of keys){
      let match=key.match(new RegExp(`^${INTELLIGENCE_KEYS.prefix}:draft:([^:]+):`));
      if(!match)match=key.match(new RegExp(`^${INTELLIGENCE_KEYS.prefix}:published:([^:]+):`));
      if(!match)match=key.match(new RegExp(`^${INTELLIGENCE_KEYS.prefix}:raw:([^:]+):`));
      if(!match)match=key.match(new RegExp(`^${INTELLIGENCE_KEYS.prefix}:(?:validation|rankings):([^:]+)$`));
      if(match&&!protectedIds.has(match[1]))remove.push(key);
    }
    return {removed:await deleteKeys(remove),scanned:keys.length};
  }

  async function prepareCompactCollection(){
    const job=await readJob('collect');
    if(!job||job.status!=='RUNNING')return job;

    // Redis capacity hotfix:
    // Every collection step first reclaims heavy payloads from snapshots that are
    // neither the currently published snapshot nor the in-progress collection.
    // Version/revision/history metadata is intentionally untouched.
    const publicSnapshot=await getPublicPointer();
    await cleanupObsoleteSnapshots([publicSnapshot,job.snapshotId]);

    if(job.storageMode==='VERSIONED_V3')return clone(job);
    if(job.snapshotId===publicSnapshot)throw new Error('ACTIVE_COLLECTION_IS_PUBLIC');
    const ids=(job.ids||[]).map(String),keys=[];
    for(const id of ids)keys.push(INTELLIGENCE_KEYS.draft(job.snapshotId,id),INTELLIGENCE_KEYS.published(job.snapshotId,id));
    keys.push(INTELLIGENCE_KEYS.validation(job.snapshotId),INTELLIGENCE_KEYS.rankings(job.snapshotId));
    await deleteKeys(keys);
    Object.assign(job,{cursor:0,completed:0,succeeded:0,failed:0,successIds:[],failures:[],activeBatch:null,completedAt:null,updatedAt:now(),storageMode:'VERSIONED_V3',recoveredFromLegacy:true});
    await write(INTELLIGENCE_KEYS.job('collect'),job);
    return clone(job);
  }

  async function clearHistory(){
    const keys=await scanKeys(`${INTELLIGENCE_KEYS.prefix}:history:*`);
    return {removed:await deleteKeys(keys),scanned:keys.length};
  }

  const putDraft=(snapshotId,personId,value)=>write(INTELLIGENCE_KEYS.draft(snapshotId,personId),value);
  const putPublished=(snapshotId,personId,value)=>write(INTELLIGENCE_KEYS.published(snapshotId,personId),value);
  async function getDrafts(snapshotId,personIds){
    const ids=(personIds||[]).map(String),values=await batchedMget(command,ids.map(id=>INTELLIGENCE_KEYS.draft(snapshotId,id)));
    return ids.map((personId,index)=>({personId,value:parseJson(values[index],null)}));
  }
  const getPublished=(snapshotId,personId)=>read(INTELLIGENCE_KEYS.published(snapshotId,personId));
  async function getPublishedBatch(snapshotId,personIds){
    const ids=(personIds||[]).map(String),values=await batchedMget(command,ids.map(id=>INTELLIGENCE_KEYS.published(snapshotId,id)));
    return ids.map((personId,index)=>({personId,value:parseJson(values[index],null)}));
  }
  const setPublicPointer=snapshotId=>command(['SET',INTELLIGENCE_KEYS.publicPointer,String(snapshotId||'')]);
  const getPublicPointer=async()=>String(await command(['GET',INTELLIGENCE_KEYS.publicPointer])||'');
  const setRankings=(snapshotId,value)=>write(INTELLIGENCE_KEYS.rankings(snapshotId),value);
  const getRankings=snapshotId=>read(INTELLIGENCE_KEYS.rankings(snapshotId));
  const setValidation=(snapshotId,value)=>write(INTELLIGENCE_KEYS.validation(snapshotId),value);
  const getValidation=snapshotId=>read(INTELLIGENCE_KEYS.validation(snapshotId));
  const getLatestDraftId=async()=>String(await command(['GET',INTELLIGENCE_KEYS.latestDraft])||'');
  async function putVersion(value={}){
    const id=String(value.analysisVersion||value.rawSnapshotId||'');if(!id)throw new Error('ANALYSIS_VERSION_REQUIRED');
    const current=await read(INTELLIGENCE_KEYS.version(id)),version={...(current||{}),...value,analysisVersion:id,updatedAt:now()};
    if(!version.generatedAt)version.generatedAt=now();
    await write(INTELLIGENCE_KEYS.version(id),version);
    const index=parseJson(await command(['GET',INTELLIGENCE_KEYS.versionIndex]),[]),ids=[id,...(Array.isArray(index)?index:[]).map(String).filter(item=>item!==id)];
    await write(INTELLIGENCE_KEYS.versionIndex,ids);
    return clone(version);
  }
  const getVersion=id=>read(INTELLIGENCE_KEYS.version(id));
  async function listVersions(){const ids=parseJson(await command(['GET',INTELLIGENCE_KEYS.versionIndex]),[]);const values=await batchedMget(command,(Array.isArray(ids)?ids:[]).map(id=>INTELLIGENCE_KEYS.version(id)));return values.map(value=>parseJson(value,null)).filter(Boolean);}
  async function updateVersion(id,patch={}){const current=await getVersion(id);if(!current)throw new Error('ANALYSIS_VERSION_NOT_FOUND');return putVersion({...current,...patch,analysisVersion:id});}
  const archiveVersion=(id,replacedByVersionId)=>updateVersion(id,{status:'archived',replacedByVersionId:String(replacedByVersionId||''),archivedAt:now()});
  async function appendRevision(id,value={}){const rows=parseJson(await command(['GET',INTELLIGENCE_KEYS.revisions(id)]),[]),revision={revisionId:`${id}-r${(Array.isArray(rows)?rows.length:0)+1}`,...value,editedAt:value.editedAt||now()};const next=[revision,...(Array.isArray(rows)?rows:[])];await write(INTELLIGENCE_KEYS.revisions(id),next);return clone(revision);}
  const getRevisions=async id=>parseJson(await command(['GET',INTELLIGENCE_KEYS.revisions(id)]),[]);
  return {createJob,readJob,claimNextBatch,completeBatch,prepareDraftPointerPublication,prepareCompactCollection,cleanupObsoleteSnapshots,clearHistory,putDraft,getDrafts,putPublished,getPublished,getPublishedBatch,setPublicPointer,getPublicPointer,setRankings,getRankings,setValidation,getValidation,getLatestDraftId,putVersion,getVersion,listVersions,updateVersion,archiveVersion,appendRevision,getRevisions};
}
