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

  return {createJob,readJob,claimNextBatch,completeBatch,putDraft,getDrafts,putPublished,getPublished,getPublishedBatch,setPublicPointer,getPublicPointer,setRankings,getRankings,setValidation,getValidation,getLatestDraftId};
}
