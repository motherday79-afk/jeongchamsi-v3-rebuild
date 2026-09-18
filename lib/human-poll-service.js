import {randomUUID} from 'node:crypto';
import {isAdmin} from '../src/core/ai-panel-model.js';

export const HUMAN_POLL_KEYS={snapshot:'jcsr2:human-polls:v1:snapshot',lock:'jcsr2:human-polls:v1:lock'};
export const HUMAN_POLL_COMMIT_LUA=`-- HUMAN_POLL_COMMIT_V1
if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
if (redis.call('GET',KEYS[2]) or '')~=ARGV[2] then return 0 end
redis.call('SET',KEYS[2],ARGV[3])
return 1`;
export const HUMAN_POLL_RELEASE_LUA=`-- HUMAN_POLL_RELEASE_V1
if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end
return 0`;
const providers=[{id:'gallup',institution:'한국갤럽'},{id:'realmeter',institution:'리얼미터'}];
const fail=code=>{throw new Error(`HUMAN_POLL_${code}`);};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v:null;
const text=(v,n=2000)=>typeof v==='string'?v.slice(0,n):'';
// Whitelist all public fields. Adapter diagnostics and raw source bodies never leave storage.
export function publicHumanPoll(p){
 if(!p||!/^[-\w:.]{1,200}$/.test(p.id||'')||!p.institution||!p.question||!date(p.startDate)||!date(p.endDate)||!date(p.publishedDate)||p.startDate>p.endDate||p.endDate>p.publishedDate||!Number.isInteger(p.sampleSize)||p.sampleSize<=0)return null;
 let source;try{source=new URL(p.sourceUrl);}catch{return null;}
 if(!['gallup.co.kr','www.gallup.co.kr','realmeter.net','www.realmeter.net'].includes(source.hostname)||!['https:','http:'].includes(source.protocol)||source.username||source.password)return null;
 const b=p.results?.overall;if(!b||![b.positive,b.negative].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100)||b.positive+b.negative>101)return null;
 if(b.undecided!=null&&(typeof b.undecided!=='number'||!Number.isFinite(b.undecided)||b.undecided<0||b.undecided>100||Math.abs(b.positive+b.negative+b.undecided-100)>1))return null;
 const out={id:p.id,institution:text(p.institution,200),sourceUrl:source.href,question:text(p.question),topic:'presidential-approval',comparable:false,startDate:p.startDate,endDate:p.endDate,publishedDate:p.publishedDate,sampleSize:p.sampleSize,results:{overall:{positive:b.positive,negative:b.negative,undecided:b.undecided??null,n:p.sampleSize}},fetchedAt:text(p.fetchedAt,40),provenance:{parserVersion:text(p.provenance?.parserVersion,100),contentHash:text(p.provenance?.contentHash,128),questionKind:text(p.provenance?.questionKind,100)}};
 out.provenance.provider=source.hostname.endsWith('gallup.co.kr')?'gallup':'realmeter';out.provenance.transport=source.protocol.slice(0,-1);
 for(const group of ['gender','age','region']){
  const entries=Object.entries(p.results[group]||{});if(entries.length>200)return null;
  out.results[group]={};
  for(const [name,bucket] of entries){
   if(!name||name.length>100||!bucket||typeof bucket!=='object')return null;
   const safe={};for(const key of ['positive','negative','undecided']){const value=bucket[key];if(value!=null&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100))return null;safe[key]=value??null;}
   if(Object.values(safe).every(v=>v!==null)&&Math.abs(safe.positive+safe.negative+safe.undecided-100)>1)return null;
   if(bucket.n!=null&&(!Number.isInteger(bucket.n)||bucket.n<0))return null;
   safe.n=bucket.n??null;Object.defineProperty(out.results[group],name,{value:safe,enumerable:true,writable:true,configurable:true});
  }
 }
 for(const key of ['title','commissioner','method','comparisonNote'])out[key]=text(p[key]);
 for(const key of ['responseRate','marginOfError'])out[key]=typeof p[key]==='number'&&Number.isFinite(p[key])&&p[key]>=0&&p[key]<=100?p[key]:null;
 return out;
}
const empty=()=>({items:[],providers:providers.map(p=>({...p,state:'pending',fetchedCount:0,checkedAt:null,lastSuccessAt:null})),lastCheckedAt:null,lastSuccessAt:null});
const parse=raw=>{if(!raw)return empty();try{const data=JSON.parse(raw);if(!Array.isArray(data.items)||!Array.isArray(data.providers))fail('STORAGE_FAILED');return data;}catch{fail('STORAGE_FAILED');}};
const bucketRegresses=(previous,next)=>['positive','negative','undecided','n'].some(key=>previous?.[key]!=null&&next?.[key]==null);
function incompleteRevision(previous,next){
 if(bucketRegresses(previous.results?.overall,next.results?.overall))return true;
 for(const group of ['gender','age','region'])for(const [key,bucket] of Object.entries(previous.results?.[group]||{}))if(!Object.hasOwn(next.results?.[group]||{},key)||bucketRegresses(bucket,next.results[group][key]))return true;
 return ['responseRate','marginOfError'].some(key=>previous[key]!=null&&next[key]==null)||['method','commissioner'].some(key=>previous[key]&&!next[key]);
}
export function createHumanPollService({command,fetch=globalThis.fetch,now=Date.now,idFor=randomUUID,collect=async options=>(await import('./human-poll-sources.js')).collectOfficialPolls(options)}={}){
 if(typeof command!=='function')fail('STORAGE_FAILED');
 const list=async()=>{const data=parse(await command(['GET',HUMAN_POLL_KEYS.snapshot]));return {ok:true,...data,items:data.items.map(publicHumanPoll).filter(Boolean)};};
 async function run(){
  const token=idFor();if(await command(['SET',HUMAN_POLL_KEYS.lock,token,'NX','EX',120])!=='OK')fail('BUSY');
  try{
   const raw=await command(['GET',HUMAN_POLL_KEYS.snapshot]),previous=parse(raw),checkedAt=new Date(now()).toISOString();
   let result;try{result=await collect({fetch,now,limit:4});}catch{result={items:[],providers:[]};}
   const candidates=(Array.isArray(result?.items)?result.items:[]).map(publicHumanPoll).filter(Boolean),incoming=[],regressed=new Set();
   const records=new Map(previous.items.map(p=>[p.id,p]));
   for(const item of candidates){const prior=records.get(item.id);if(prior&&incompleteRevision(prior,item)){regressed.add(item.provenance.provider);continue;}records.set(item.id,item);incoming.push(item);}
   const statuses=providers.map(provider=>{const current=result?.providers?.find(p=>p.id===provider.id),prior=previous.providers.find(p=>p.id===provider.id);const sourceItems=(result?.items||[]).filter(p=>{try{return new URL(p.sourceUrl).hostname.endsWith(provider.id==='gallup'?'gallup.co.kr':'realmeter.net');}catch{return false;}});const count=incoming.filter(p=>p.provenance.provider===provider.id).length;const success=count>0,partial=regressed.has(provider.id)||(success&&(current?.state!=='success'||sourceItems.length>count));return {...provider,state:partial?'partial':success?'success':'error',fetchedCount:count,checkedAt,lastSuccessAt:success?checkedAt:prior?.lastSuccessAt||null,...(!success||partial?{error:'SOURCE_UNAVAILABLE'}:{})};});
   const next={items:[...records.values()].sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||a.id.localeCompare(b.id)).slice(0,104),providers:statuses,lastCheckedAt:checkedAt,lastSuccessAt:incoming.length?checkedAt:previous.lastSuccessAt};
   if(Number(await command(['EVAL',HUMAN_POLL_COMMIT_LUA,'2',HUMAN_POLL_KEYS.lock,HUMAN_POLL_KEYS.snapshot,token,raw||'',JSON.stringify(next)]))!==1)fail('BUSY');
   return {ok:true,...next};
  }finally{await command(['EVAL',HUMAN_POLL_RELEASE_LUA,'1',HUMAN_POLL_KEYS.lock,token]);}
 }
 return {list,collect:async user=>{if(!isAdmin(user))fail('FORBIDDEN');return run();},collectScheduled:run};
}
