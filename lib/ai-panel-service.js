import {randomUUID} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createPanel,createRun,mutateRun,publicRun,publicPanel,runSummary,isPublicRun,isAdmin,validId,isObject,fail} from '../src/core/ai-panel-model.js';
export const AI_PANEL_KEYS={panels:'jcsr2:ai-panel:v1:panels',runs:'jcsr2:ai-panel:v1:runs',publications:'jcsr2:ai-panel:v1:publications',panel:id=>`jcsr2:ai-panel:v1:panel:${id}`,run:id=>`jcsr2:ai-panel:v1:run:${id}`,publication:id=>`jcsr2:ai-panel:v1:publication:${id}`,week:week=>`jcsr2:ai-panel:v1:week:${week}`};
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

export const AI_PANEL_DELETE_LUA=`-- AI_PANEL_DELETE_V1
if redis.call('EXISTS',KEYS[1])==0 then return -1 end
if (redis.call('GET',KEYS[5]) or '')~=ARGV[2] then return 0 end
redis.call('DEL',KEYS[1])
redis.call('HDEL',KEYS[2],ARGV[1])
redis.call('DEL',KEYS[3])
redis.call('HDEL',KEYS[4],ARGV[1])
if ARGV[3]=='' then redis.call('DEL',KEYS[5]) else redis.call('SET',KEYS[5],ARGV[3]) end
return 1`;
export const AI_PANEL_PUBLISH_LUA=`-- AI_PANEL_PUBLISH_V1
local summary=redis.call('HGET',KEYS[1],ARGV[1])
if not summary then return -1 end
local current=cjson.decode(summary)
if tonumber(current.version)~=tonumber(ARGV[2]) then return 0 end
if redis.call('EXISTS',KEYS[2])==1 then return 2 end
redis.call('SET',KEYS[2],ARGV[3])
redis.call('HSET',KEYS[3],ARGV[1],ARGV[4])
return 1`;
export const AI_PANEL_MAX_BYTES=4*1024*1024;
const requireAdmin=user=>{if(!isAdmin(user))fail('FORBIDDEN');};
const COMPRESSED_PREFIX='jcs-gz-v1:';
const encodeRecord=item=>{
 const json=JSON.stringify(item);
 if(Buffer.byteLength(json)>AI_PANEL_MAX_BYTES)fail('LIMIT_REACHED');
 try{
  const compressed=gzipSync(Buffer.from(json,'utf8'),{level:6});
  const packed=COMPRESSED_PREFIX+compressed.toString('base64');
  return Buffer.byteLength(packed)<Buffer.byteLength(json)?packed:json;
 }catch{fail('STORAGE_FAILED');}
};
const decodeRecord=raw=>{
 if(raw==null)return null;
 if(typeof raw!=='string')return raw;
 if(!raw.startsWith(COMPRESSED_PREFIX))return raw;
 try{return gunzipSync(Buffer.from(raw.slice(COMPRESSED_PREFIX.length),'base64')).toString('utf8');}catch{fail('STORAGE_FAILED');}
};
const parse=raw=>{try{const decoded=decodeRecord(raw);return decoded==null?null:JSON.parse(decoded);}catch(error){if(String(error?.message||'').startsWith('AI_PANEL_'))throw error;fail('STORAGE_FAILED');}};
export function createAiPanelService({command,now=Date.now,idFor=randomUUID}={}){
 if(typeof command!=='function')fail('STORAGE_FAILED');
 async function stored(id,kind='run'){if(!validId(id))fail('NOT_FOUND');const raw=await command(['GET',AI_PANEL_KEYS[kind](id)]),item=parse(raw);if(!item)fail('NOT_FOUND');return {raw,item};}
 async function indexed(kind){return (await command(['HVALS',AI_PANEL_KEYS[kind]])||[]).map(parse).filter(Boolean);}
 async function publication(id){const raw=await command(['GET',AI_PANEL_KEYS.publication(id)]);return parse(raw);}
 const overlayPublication=(item,pub)=>pub?{...structuredClone(item),status:'published',lockedAt:pub.lockedAt,publishedAt:pub.publishedAt,lockedBy:pub.publishedBy||item.lockedBy}:item;
 async function publishedRows(){const [legacy,pubs]=await Promise.all([indexed('runs'),indexed('publications')]);const rows=new Map();for(const row of legacy)if(row.status==='published'&&!row.isSample&&row.lockedAt&&row.panelSize===1000)rows.set(row.id,row);for(const row of pubs)if(row.status==='published'&&!row.isSample&&row.lockedAt&&row.panelSize===1000)rows.set(row.id,row);return [...rows.values()].sort(sortRuns);}
 async function managedRows(){const [runs,pubs]=await Promise.all([indexed('runs'),indexed('publications')]);const byId=new Map(pubs.map(row=>[row.id,row]));return runs.map(row=>byId.get(row.id)||row).sort(sortRuns);}
 async function commit(kind,raw,item,weekState){const value=encodeRecord(item);const keys=[AI_PANEL_KEYS[kind](item.id),AI_PANEL_KEYS[kind==='run'?'runs':'panels']];if(weekState)keys.push(AI_PANEL_KEYS.week(item.week));const summary=kind==='run'?runSummary(item):{id:item.id,name:item.name,version:item.version,isSample:item.isSample,profileCount:item.profiles.length,population:item.population,createdAt:item.createdAt};const args=[raw||'',value,JSON.stringify(summary),item.id];if(weekState)args.push(weekState.raw||'',JSON.stringify(weekState.next));if(Number(await command(['EVAL',AI_PANEL_COMMIT_LUA,String(keys.length),...keys,...args]))!==1)fail('CONFLICT');}
 async function publishSmall(previous,user,input,instant){const existing=await publication(previous.item.id);if(existing)return {ok:true,item:overlayPublication(previous.item,existing),alreadyPublished:true};if(isPublicRun(previous.item))return {ok:true,item:previous.item,alreadyPublished:true};const candidate=mutateRun(previous.item,'finalize',input,{now:instant,user});const pub={id:previous.item.id,runVersion:previous.item.version,lockedAt:candidate.lockedAt,publishedAt:candidate.publishedAt,publishedBy:user.id,status:'published'};const item=overlayPublication(previous.item,pub),summary=runSummary(item);const result=Number(await command(['EVAL',AI_PANEL_PUBLISH_LUA,'3',AI_PANEL_KEYS.runs,AI_PANEL_KEYS.publication(previous.item.id),AI_PANEL_KEYS.publications,previous.item.id,String(previous.item.version),JSON.stringify(pub),JSON.stringify(summary)]));if(result===0)fail('CONFLICT');if(result===-1)fail('NOT_FOUND');if(result===2){const raced=await publication(previous.item.id);if(!raced)fail('STORAGE_FAILED');return {ok:true,item:overlayPublication(previous.item,raced),alreadyPublished:true};}if(result!==1)fail('STORAGE_FAILED');return {ok:true,item};}
 async function get(id,user){const {item}=await stored(id);const effective=overlayPublication(item,await publication(id));return {ok:true,item:isAdmin(user)?effective:publicRun(effective)};}
 async function panels(id,user){if(isAdmin(user)){if(id)return {ok:true,item:(await stored(id,'panel')).item};return {ok:true,panels:await indexed('panels')};}if(!validId(id))fail('NOT_FOUND');const published=await publishedRows();for(const row of published){if(row.panelId!==id)continue;const {item}=await stored(row.id);const effective=overlayPublication(item,await publication(row.id));if(isPublicRun(effective))return {ok:true,item:publicPanel(effective.panel)};}fail('NOT_FOUND');}
 async function list(user,{view}={}){if(view==='manage'){requireAdmin(user);return {ok:true,panels:await indexed('panels'),runs:await managedRows()};}return {ok:true,items:await publishedRows()};}
 async function history(panelId,{page=1}={}){
  if(typeof panelId!=='string'||!/^JCS-AI-(?:0\d{3}|1000)$/.test(panelId)||panelId==='JCS-AI-0000'||!/^\d{1,6}$/.test(String(page))||!Number.isSafeInteger(Number(page))||Number(page)<1||Number(page)>100000)fail('INPUT_INVALID');
  const current=Number(page),rows=await publishedRows();
  const selected=rows.slice((current-1)*20,current*20);
  // Read only this page. Recheck the full record before returning a narrow projection.
  const items=(await Promise.all(selected.map(async row=>{
   const {item}=await stored(row.id),r=isPublicRun(item)?item:overlayPublication(item,await publication(row.id));if(!isPublicRun(r))return null;
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
  const previous=await stored(id);if(!Number.isInteger(version)||version!==previous.item.version)fail('CONFLICT');
  if(operation==='delete'){
   const weekKey=AI_PANEL_KEYS.week(previous.item.week),weekRaw=await command(['GET',weekKey]),weekState=parse(weekRaw);const summaries=await indexed('runs');
   let nextState=weekState;if(weekState?.latestId===id){const replacement=summaries.filter(row=>row.id!==id&&row.week===previous.item.week).sort(sortRuns)[0];nextState=replacement?{runNumber:replacement.runNumber,latestId:replacement.id}:null;}
   const result=Number(await command(['EVAL',AI_PANEL_DELETE_LUA,'5',AI_PANEL_KEYS.run(id),AI_PANEL_KEYS.runs,AI_PANEL_KEYS.publication(id),AI_PANEL_KEYS.publications,weekKey,id,weekRaw||'',nextState?JSON.stringify(nextState):'']));if(result===0)fail('CONFLICT');if(result===-1)fail('NOT_FOUND');if(result!==1)fail('STORAGE_FAILED');return {ok:true,deletedId:id,week:previous.item.week};
  }
  if(operation==='finalize')return publishSmall(previous,user,input,instant);
  const pub=await publication(id);if(pub&&operation!=='human')fail('LOCKED');
  const item=mutateRun(previous.item,operation,input,ctx);await commit('run',previous.raw,item);
  if(pub&&operation==='human'){const effective=overlayPublication(item,pub),summary=runSummary(effective);await command(['HSET',AI_PANEL_KEYS.publications,id,JSON.stringify(summary)]);return {ok:true,item:effective};}
  return {ok:true,item};
 }
 return {get,list,panels,history,save};
}
const sortRuns=(a,b)=>b.week.localeCompare(a.week)||b.runNumber-a.runNumber;
