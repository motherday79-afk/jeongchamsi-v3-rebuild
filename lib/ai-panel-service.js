import {randomUUID} from 'node:crypto';
import {createPanel,createRun,mutateRun,publicRun,publicPanel,runSummary,isPublicRun,isAdmin,validId,isObject,fail} from '../src/core/ai-panel-model.js';
export const AI_PANEL_KEYS={panels:'jcsr2:ai-panel:v1:panels',runs:'jcsr2:ai-panel:v1:runs',panel:id=>`jcsr2:ai-panel:v1:panel:${id}`,run:id=>`jcsr2:ai-panel:v1:run:${id}`,week:week=>`jcsr2:ai-panel:v1:week:${week}`};
// Compare the original JSON bytes; never re-encode records in Redis cjson.
export const AI_PANEL_COMMIT_LUA=`-- AI_PANEL_COMMIT_V1
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
if #KEYS==3 and (redis.call('GET',KEYS[3]) or '')~=ARGV[5] then return 0 end
local t=redis.call('TYPE',KEYS[2]).ok
if t~='none' and t~='hash' then return redis.error_reply('AI_PANEL_STORAGE_FAILED') end
redis.call('SET',KEYS[1],ARGV[2])
redis.call('HSET',KEYS[2],ARGV[4],ARGV[3])
if #KEYS==3 then redis.call('SET',KEYS[3],ARGV[6]) end
return 1`;
export const AI_PANEL_MAX_BYTES=4*1024*1024;
const requireAdmin=user=>{if(!isAdmin(user))fail('FORBIDDEN');};
const parse=raw=>{try{return raw==null?null:JSON.parse(raw);}catch{fail('STORAGE_FAILED');}};
export function createAiPanelService({command,now=Date.now,idFor=randomUUID}={}){
 if(typeof command!=='function')fail('STORAGE_FAILED');
 async function stored(id,kind='run'){if(!validId(id))fail('NOT_FOUND');const raw=await command(['GET',AI_PANEL_KEYS[kind](id)]),item=parse(raw);if(!item)fail('NOT_FOUND');return {raw,item};}
 async function indexed(kind){return (await command(['HVALS',AI_PANEL_KEYS[kind]])||[]).map(parse).filter(Boolean);}
 async function commit(kind,raw,item,weekState){const value=JSON.stringify(item);if(Buffer.byteLength(value)>AI_PANEL_MAX_BYTES)fail('LIMIT_REACHED');const keys=[AI_PANEL_KEYS[kind](item.id),AI_PANEL_KEYS[kind==='run'?'runs':'panels']];if(weekState)keys.push(AI_PANEL_KEYS.week(item.week));const summary=kind==='run'?runSummary(item):{id:item.id,name:item.name,version:item.version,isSample:item.isSample,profileCount:item.profiles.length,population:item.population,createdAt:item.createdAt};const args=[raw||'',value,JSON.stringify(summary),item.id];if(weekState)args.push(weekState.raw||'',JSON.stringify(weekState.next));if(Number(await command(['EVAL',AI_PANEL_COMMIT_LUA,String(keys.length),...keys,...args]))!==1)fail('CONFLICT');}
 async function get(id,user){const {item}=await stored(id);return {ok:true,item:isAdmin(user)?item:publicRun(item)};}
 async function panels(id,user){if(isAdmin(user)){if(id)return {ok:true,item:(await stored(id,'panel')).item};return {ok:true,panels:await indexed('panels')};}if(!validId(id))fail('NOT_FOUND');const published=(await indexed('runs')).filter(r=>r.status==='published'&&!r.isSample&&r.lockedAt&&r.panelSize===1000);for(const row of published){if(row.panelId!==id)continue;const {item}=await stored(row.id);if(isPublicRun(item))return {ok:true,item:publicPanel(item.panel)};}fail('NOT_FOUND');}
 async function list(user,{view}={}){if(view==='manage'){requireAdmin(user);return {ok:true,panels:await indexed('panels'),runs:(await indexed('runs')).sort(sortRuns)};}const rows=(await indexed('runs')).filter(r=>r.status==='published'&&!r.isSample&&r.lockedAt&&r.panelSize===1000).sort(sortRuns);return {ok:true,items:rows};}
 async function history(panelId,{page=1}={}){
  if(typeof panelId!=='string'||!/^JCS-AI-(?:0\d{3}|1000)$/.test(panelId)||panelId==='JCS-AI-0000'||!/^\d{1,6}$/.test(String(page))||!Number.isSafeInteger(Number(page))||Number(page)<1||Number(page)>100000)fail('INPUT_INVALID');
  const current=Number(page),rows=(await indexed('runs')).filter(r=>r.status==='published'&&!r.isSample&&r.lockedAt&&r.panelSize===1000).sort(sortRuns);
  const selected=rows.slice((current-1)*20,current*20);
  // Read only this page. Recheck the full record before returning a narrow projection.
  const items=(await Promise.all(selected.map(async row=>{
   const {item:r}=await stored(row.id);if(!isPublicRun(r))return null;
   const profile=r.panel.profiles.find(p=>p.id===panelId);if(!profile)return null;
   const responses=Object.fromEntries(r.modes.flatMap(mode=>{const response=r.results[mode]?.responses.find(p=>p.id===panelId);return response?[[mode,structuredClone(response)]]:[];}));
   return {id:r.id,week:r.week,runNumber:r.runNumber,panelId:r.panelId,panelVersion:r.panel.version,profile:structuredClone(profile),responses,disclosure:r.disclosure};
  }))).filter(Boolean);
  return {ok:true,items,page:current,total:rows.length};
 }
 async function save(user,payload={}){
  requireAdmin(user);if(!isObject(payload)||!isObject(payload.input||{}))fail('INPUT_INVALID');if(Buffer.byteLength(JSON.stringify(payload))>AI_PANEL_MAX_BYTES)fail('LIMIT_REACHED');const {operation,id,version,input={}}=payload,instant=new Date(now()).toISOString(),ctx={now:instant,user};
  if(operation==='panel-create'){if(id)fail('INPUT_INVALID');const item=createPanel(input,{...ctx,id:idFor()});await commit('panel','',item);return {ok:true,item};}
  if(operation==='create'){
   if(id||!/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(input.week))fail('INPUT_INVALID');const panel=(await stored(input.panelId,'panel')).item;
   const raw=await command(['GET',AI_PANEL_KEYS.week(input.week)]),state=parse(raw);let source=null;
   let normalizedInput=input;
   if(input.sourceRunId){
    source=(await stored(input.sourceRunId)).item;
    if(source.week!==input.week)fail('RERUN_REQUIRED');
    const rerunReason=typeof input.rerunReason==='string'&&input.rerunReason.trim()?input.rerunReason.trim():'관리자 동일 주차 재실행';
    normalizedInput={...input,rerunReason};
   }
   if(state&&!source)fail('RERUN_REQUIRED');if(!state&&source)fail('STORAGE_FAILED');
   const item=createRun(normalizedInput,{...ctx,id:idFor(),panel,runNumber:(state?.runNumber||0)+1});await commit('run','',item,{raw,next:{runNumber:item.runNumber,latestId:item.id}});return {ok:true,item};
  }
  const previous=await stored(id);if(!Number.isInteger(version)||version!==previous.item.version)fail('CONFLICT');const item=mutateRun(previous.item,operation,input,ctx);await commit('run',previous.raw,item);return {ok:true,item};
 }
 return {get,list,panels,history,save};
}
const sortRuns=(a,b)=>b.week.localeCompare(a.week)||b.runNumber-a.runNumber;
