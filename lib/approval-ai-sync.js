import {createHash,randomUUID} from 'node:crypto';
import {createAiPanelService,AI_PANEL_KEYS} from './ai-panel-service.js';
import {publicHumanPoll} from './human-poll-service.js';

export const AI_SYNC_KEY='jcsr2:approval-ai-sync:v1:snapshot';
const LOCK=AI_SYNC_KEY+':lock';
export const APPROVAL_AI_COMMIT_LUA=`-- APPROVAL_AI_COMMIT_V1
if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
if (redis.call('GET',KEYS[2]) or '')~=ARGV[2] then return 0 end
redis.call('SET',KEYS[2],ARGV[3])
return 1`;
export const APPROVAL_AI_RELEASE_LUA=`-- APPROVAL_AI_RELEASE_V1
if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end
return 0`;
const actor=Object.freeze({id:'scheduled-approval-ai-sync',role:'admin',membershipTier:'superadmin',status:'active'});
const MODEL='gallup-proportion-simulation-v1';
const METHOD='한국갤럽 공식 대통령 직무 평가의 긍정·부정·유보 비율을 합계 100으로 정규화하고 기존 합성패널 ID 1,000개에 SHA-256 고정 난수로 배정한 시뮬레이션입니다. 실제 응답자·독립 여론조사·LLM 응답이 아니며 API·실시간 모델 호출은 없습니다. 인구통계에 따른 정치 성향을 추론하지 않습니다. 세부 집계는 가상 배정 결과이며 공식 하위집단 추정치가 아닙니다.';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const parse=raw=>raw?JSON.parse(raw):null;
const isGallup=p=>p?.provenance?.provider==='gallup'||/갤럽|gallup/i.test(p?.institution||'');
const latest=items=>(items||[]).filter(isGallup).sort((a,b)=>String(b.publishedDate||'').localeCompare(String(a.publishedDate||''))||String(b.id).localeCompare(String(a.id)))[0];
// Ignore collection times, HTML hashes and editorial wording: these do not change the simulation input.
const fingerprint=p=>hash({sourceUrl:p.sourceUrl,startDate:p.startDate,endDate:p.endDate,publishedDate:p.publishedDate,overall:['positive','negative','undecided'].map(k=>p.results?.overall?.[k])});
function validSource(p,instant){
 if(p?.topic&&p.topic!=='presidential-approval')return null;
 const safe=publicHumanPoll(p);if(!safe)return null;
 const u=new URL(safe.sourceUrl),bucket=safe.results.overall;
 if(!['gallup.co.kr','www.gallup.co.kr'].includes(u.hostname)||Date.parse(safe.publishedDate)>instant||instant-Date.parse(safe.publishedDate)>45*86400000)return null;
 if(['positive','negative','undecided'].some(k=>!Number.isFinite(bucket[k])||bucket.status[k]!=='verified'))return null;
 return safe;
}
function weekOf(date){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear(),week=Math.ceil(((d-new Date(Date.UTC(year,0,1)))/86400000+1)/7);return `${year}-W${String(week).padStart(2,'0')}`;}
function responses(profiles,source,sourceFingerprint){
 const b=source.results.overall,total=b.positive+b.negative+b.undecided;
 return profiles.map(p=>{const draw=parseInt(hash([MODEL,sourceFingerprint,p.id]).slice(0,13),16)/0x10000000000000*total;return {id:p.id,choice:draw<b.positive?'positive':draw<b.positive+b.negative?'negative':'undecided',reason:'공식 갤럽 전체 비율에 따른 고정 난수 배정',explanation:'실제 개인의 의견이나 LLM 추론이 아닌 공식조사 비율 기반 합성 응답입니다.',factors:['공식 한국갤럽 전체 비율','인구통계 미사용']};});
}

/** Server-only scheduler entry point. Reuses stored synthetic profiles and preserves every prior run. */
export async function syncApprovalAi({command,polls,now=Date.now}={}){
 if(typeof command!=='function')throw Error('APPROVAL_AI_STORAGE_REQUIRED');
 const instant=typeof now==='function'?now():now,checkedAt=new Date(instant).toISOString(),token=randomUUID();
 if(await command(['SET',LOCK,token,'NX','PX','300000'])!=='OK')return {...parse(await command(['GET',AI_SYNC_KEY])),refreshState:'busy'};
 let raw='',previous={};
 try{
  raw=await command(['GET',AI_SYNC_KEY])||'';previous=parse(raw)||{};
  const save=async changes=>{const next={...previous,...changes,checkedAt};if(Number(await command(['EVAL',APPROVAL_AI_COMMIT_LUA,'2',LOCK,AI_SYNC_KEY,token,raw,JSON.stringify(next)]))!==1)throw Error('APPROVAL_AI_CONFLICT');return next;};
  const events=event=>[...(previous.notifications||[]),event].filter(e=>instant-e.at<86400000).slice(-100);
  const provider=polls?.providers?.find(p=>p.id==='gallup'),source=validSource(latest(polls?.items),instant);
  if(provider?.state!=='success'||!provider.checkedAt||!source)return await save({state:'pending',refreshState:'source_unavailable',stale:true,reason:'LATEST_VALID_GALLUP_REQUIRED'});
  const sourceFingerprint=fingerprint(source),identity={sourceFingerprint,sourcePollId:source.id,sourcePublishedDate:source.publishedDate};
  if(previous.sourcePublishedDate&&source.publishedDate<previous.sourcePublishedDate)return await save({refreshState:'source_unavailable',stale:true,reason:'GALLUP_SOURCE_REGRESSION'});
  if(previous.runId&&previous.sourceFingerprint===sourceFingerprint)return await save({state:'ready',refreshState:'unchanged',stale:false,reason:null});
  const runId='gallup-auto-'+sourceFingerprint.slice(0,40),service=createAiPanelService({command,now:()=>instant,idFor:()=>runId});
  try{
   const published=(await service.list(null)).items,current=published[0];
   if(!current)throw Error('EXISTING_PUBLIC_SYNTHETIC_PANEL_REQUIRED');
   const baseline=latest(current.humanPolls);
   if(!previous.sourceFingerprint&&baseline&&fingerprint(baseline)===sourceFingerprint)return await save({...identity,state:'ready',refreshState:'baseline',runId:current.id,lastSuccessAt:checkedAt,stale:false,reason:null,methodology:METHOD});
   if(baseline?.publishedDate>source.publishedDate)throw Error('GALLUP_SOURCE_REGRESSION');
   let run;
   try{run=(await service.get(runId,actor)).item;}catch(error){if(error.message!=='AI_PANEL_NOT_FOUND')throw error;}
   if(!run){
    const panel=(await service.panels(current.panelId,actor)).item;
    if(panel.isSample||panel.profiles?.length!==1000)throw Error('EXISTING_PUBLIC_SYNTHETIC_PANEL_REQUIRED');
    const week=weekOf(source.publishedDate),weekState=parse(await command(['GET',AI_PANEL_KEYS.week(week)]));
    run=(await service.save(actor,{operation:'create',input:{panelId:panel.id,week,basisDate:source.publishedDate,question:source.question,questionVersion:MODEL,personId:current.personId||'',modes:['EXPOSED'],...(weekState?.latestId?{sourceRunId:weekState.latestId,rerunReason:'한국갤럽 공식 원자료 신규 발표 또는 정정에 따른 자동 재실행'}:{})}})).item;
   }
   const mutate=async(operation,input)=>{run=(await service.save(actor,{operation,id:run.id,version:run.version,input})).item;};
   if(run.status!=='published'){
    if(!run.environments.EXPOSED)await mutate('environment',{mode:'EXPOSED',notes:METHOD+'\n원자료 지문: '+sourceFingerprint,sources:[{title:source.title||'한국갤럽 대통령 직무 평가',url:source.sourceUrl,publishedAt:source.publishedDate+'T00:00:00Z',containsPollNumbers:true}]});
    if(!run.results.EXPOSED)await mutate('responses',{mode:'EXPOSED',model:MODEL,executedAt:checkedAt,responses:responses(run.panel.profiles,source,sourceFingerprint)});
    const humanId='gallup-'+sourceFingerprint.slice(0,40);
    if(!run.humanPolls.some(p=>p.id===humanId))await mutate('human',{poll:{...source,id:humanId,comparable:true,comparisonNote:METHOD}});
    await mutate('finalize',{note:METHOD});
   }
   return await save({...identity,state:'ready',refreshState:'generated',runId:run.id,lastSuccessAt:checkedAt,stale:false,reason:null,methodology:METHOD,notifications:events({id:'approval-ai:'+run.id,kind:'approval-ai',state:'success',at:instant,runId:run.id})});
  }catch(error){
   const reason=String(error?.message||'APPROVAL_AI_FAILED').slice(0,200);
   return await save({state:'error',refreshState:'failed',stale:true,reason,attemptedSourceFingerprint:sourceFingerprint,notifications:events({id:'approval-ai:failure:'+sourceFingerprint,kind:'approval-ai',state:'failure',at:instant,reason})});
  }
 }finally{await command(['EVAL',APPROVAL_AI_RELEASE_LUA,'1',LOCK,token]);}
}
