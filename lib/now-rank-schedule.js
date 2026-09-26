import {randomUUID} from 'node:crypto';
import {INTELLIGENCE_KEYS as K} from './intelligence-keys.js';

export const SCHEDULE_KEY=`${K.prefix}:scheduled-refresh:latest`;
export const MUTATION_LOCK=`${K.prefix}:scheduled-refresh:mutex`;
const MAX_AGE=6*60*60*1000, MAX_STEPS=2000;
const RELEASE="if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end";
const read=async(command,key)=>JSON.parse(await command(['GET',key])||'null');
export const kstDate=timestamp=>new Date(Number(timestamp)+9*3600000).toISOString().slice(0,10);
const ticket=state=>state?.status==='RUNNING'?{runId:state.runId,step:state.step}:null;

// Shared by scheduled steps and manual full-ranking mutations. A lease outlives
// the function's 60-second limit, so a terminated worker cannot race its successor.
export async function withRankingMutation(command,work,{scheduled=false,now=Date.now}={}){
  const token=randomUUID();
  if(!await command(['SET',MUTATION_LOCK,token,'NX','EX','90']))throw Error('RANKING_BUSY');
  try{
    if(!scheduled){
      const current=await read(command,SCHEDULE_KEY);
      if(current?.status==='RUNNING'&&now()-current.startedAt<MAX_AGE)throw Error('SCHEDULED_REFRESH_RUNNING');
    }
    return await work();
  }finally{await command(['EVAL',RELEASE,'1',MUTATION_LOCK,token]);}
}

export async function readNowRankSchedule(command,now=Date.now){
  const latest=await read(command,SCHEDULE_KEY);
  return {timeZone:'Asia/Seoul',startTime:'12:00',cron:'0 3 * * *',latest:latest?{
    date:latest.date,status:latest.status,phase:latest.phase,startedAt:latest.startedAt,
    updatedAt:latest.updatedAt,completedAt:latest.completedAt||null,error:latest.error||null,
    completed:latest.completed||0,total:latest.total||0,
    stalled:latest.status==='RUNNING'&&now()-latest.updatedAt>180000
  }:null};
}

export function createNowRankSchedule({command,createService,now=Date.now}){
  const save=async state=>{state.updatedAt=now();await command(['SET',SCHEDULE_KEY,JSON.stringify(state)]);return state;};
  const jobs=async()=>Promise.all(['collect','publish'].map(kind=>read(command,K.job(kind))));
  const finish=async(state,status,error=null)=>{
    // If the snapshot was atomically committed before a transport/storage error,
    // report completion instead of falsely claiming the old snapshot is live.
    if(state.snapshotId&&await command(['GET',K.publicPointer])===state.snapshotId)status='COMPLETED';
    if(status!=='COMPLETED'&&state.snapshotId){
      for(const kind of ['collect','publish']){
        const job=await read(command,K.job(kind));
        if(job?.snapshotId===state.snapshotId&&(job.status==='RUNNING'||job.publicationPending)){
          await command(['SET',K.job(kind),JSON.stringify({...job,status:'FAILED',publicationPending:false,activeBatch:null,updatedAt:now(),lastError:error||'SCHEDULED_REFRESH_FAILED'})]);
        }
      }
    }
    Object.assign(state,{status,error:status==='COMPLETED'?null:error,completedAt:now()});
    await save(state);
    await command(['SET',`${K.prefix}:scheduled-refresh:day:${state.date}`,JSON.stringify(state),'EX',String(30*86400)]);
    return null;
  };
  async function start(){
    return withRankingMutation(command,async()=>{
      const date=kstDate(now()),previous=await read(command,SCHEDULE_KEY);
      if(previous?.date===date)return ticket(previous);
      if(previous?.status==='RUNNING')await finish(previous,'FAILED','SCHEDULE_EXPIRED');
      const state={date,runId:randomUUID(),step:0,status:'RUNNING',phase:'STARTING',startedAt:now(),updatedAt:now(),retries:0,errors:0,snapshotId:null};
      const [collection,publication]=await jobs();
      if(collection?.status==='RUNNING'||publication?.status==='RUNNING'||publication?.publicationPending)return finish(state,'SKIPPED','MANUAL_REFRESH_RUNNING');
      await save(state);return ticket(state);
    },{scheduled:true,now});
  }
  async function step(input){
    return withRankingMutation(command,async()=>{
      const state=await read(command,SCHEDULE_KEY);
      if(state?.status!=='RUNNING'||input?.runId!==state.runId||input?.step!==state.step)return null;
      if(now()-state.startedAt>=MAX_AGE||state.step>=MAX_STEPS)return finish(state,'FAILED','SCHEDULE_LIMIT_REACHED');
      const service=createService();
      try{
        if(state.phase==='STARTING'){
          const [collection,publication]=await jobs();
          if(publication?.status==='RUNNING'||publication?.publicationPending)return finish(state,'SKIPPED','MANUAL_REFRESH_RUNNING');
          // Recover a start whose result was persisted before the function ended.
          const owned=collection?.status==='RUNNING'&&collection.createdAt>=state.startedAt;
          if(collection?.status==='RUNNING'&&!owned)return finish(state,'SKIPPED','MANUAL_REFRESH_RUNNING');
          const {job}=owned?{job:collection}:await service.startCollection();
          state.snapshotId=job.snapshotId;state.total=job.total;state.phase='COLLECTING';
        }else if(state.phase==='COLLECTING'){
          const [collection]=await jobs();
          if(collection?.snapshotId!==state.snapshotId)return finish(state,'FAILED','COLLECTION_CHANGED');
          const {job}=await service.runCollectionStep();
          state.completed=job.completed||0;state.total=job.total;
          if(job.status==='COMPLETED_WITH_ERRORS'&&state.retries<1){
            state.retries++;await save(state);
            await service.retryCollectionFailures();
          }else if(job.status==='COMPLETED'){
            const validation=await read(command,K.validation(state.snapshotId));
            if(!validation?.ok||job.failed||!job.total)return finish(state,'FAILED','COLLECTION_VALIDATION_FAILED');
            state.phase='START_PUBLISH';
          }else if(job.status!=='RUNNING')return finish(state,'FAILED','COLLECTION_INCOMPLETE');
        }else if(state.phase==='START_PUBLISH'){
          const [collection]=await jobs();
          if(collection?.snapshotId!==state.snapshotId||collection.status!=='COMPLETED'||collection.failed)return finish(state,'FAILED','COLLECTION_CHANGED');
          const {job}=await service.startPublish();
          if(job.snapshotId!==state.snapshotId)return finish(state,'FAILED','PUBLICATION_CHANGED');
          state.phase='PUBLISHING';
        }else if(state.phase==='PUBLISHING'){
          const [,publication]=await jobs();
          if(publication?.snapshotId!==state.snapshotId)return finish(state,'FAILED','PUBLICATION_CHANGED');
          const result=await service.runPublishStep();
          if(result.job.status==='COMPLETED'&&result.finalized?.ok)return finish(state,'COMPLETED');
          if(result.job.status!=='RUNNING')return finish(state,'FAILED','PUBLICATION_VALIDATION_FAILED');
        }else return finish(state,'FAILED','INVALID_PHASE');
        state.errors=0;state.step++;await save(state);return ticket(state);
      }catch(error){
        state.errors++;state.error=String(error?.code||error?.message||'REFRESH_FAILED').slice(0,100);
        if(state.errors>=3)return finish(state,'FAILED',state.error);
        state.step++;await save(state);return ticket(state);
      }
    },{scheduled:true,now});
  }
  async function fail(input,error){
    return withRankingMutation(command,async()=>{
      const state=await read(command,SCHEDULE_KEY);
      if(state?.status==='RUNNING'&&state.runId===input?.runId&&state.step===input?.step)return finish(state,'FAILED',error);
      return null;
    },{scheduled:true,now});
  }
  return {start,step,fail};
}
