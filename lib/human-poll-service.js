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
const providers=[{id:'gallup',institution:'한국갤럽'},{id:'realmeter',institution:'리얼미터'},{id:'nbs',institution:'NBS'}];
const fail=code=>{throw new Error(`HUMAN_POLL_${code}`);};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v?v:null;
const text=(v,n=2000)=>typeof v==='string'?v.slice(0,n):'';
// Whitelist all public fields. Adapter diagnostics and raw source bodies never leave storage.
export function publicHumanPoll(p){
 if(!p||!/^[-\w:.]{1,200}$/.test(p.id||'')||!p.institution||!p.question||!date(p.startDate)||!date(p.endDate)||!date(p.publishedDate)||p.startDate>p.endDate||p.endDate>p.publishedDate||!Number.isInteger(p.sampleSize)||p.sampleSize<=0)return null;
 let source;try{source=new URL(p.sourceUrl);}catch{return null;}
 if(!['gallup.co.kr','www.gallup.co.kr','realmeter.net','www.realmeter.net','ekn.kr','www.ekn.kr','m.ekn.kr','nbsurvey.kr','www.nbsurvey.kr','yna.co.kr','www.yna.co.kr','newsis.com','www.newsis.com','nwww.newsis.com','mobile.newsis.com','nesdc.go.kr','www.nesdc.go.kr','newdaily.co.kr','www.newdaily.co.kr','topstarnews.net','www.topstarnews.net','newspim.com','www.newspim.com'].includes(source.hostname)||!['https:','http:'].includes(source.protocol)||source.username||source.password)return null;
 const b=p.results?.overall;if(!b||![b.positive,b.negative].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100)||b.positive+b.negative>101)return null;
 if(b.undecided!=null&&(typeof b.undecided!=='number'||!Number.isFinite(b.undecided)||b.undecided<0||b.undecided>100||Math.abs(b.positive+b.negative+b.undecided-100)>1))return null;
 const out={id:p.id,institution:text(p.institution,200),sourceUrl:source.href,question:text(p.question),topic:'presidential-approval',comparable:false,startDate:p.startDate,endDate:p.endDate,publishedDate:p.publishedDate,sampleSize:p.sampleSize,results:{overall:{positive:b.positive,negative:b.negative,undecided:b.undecided??null,n:p.sampleSize}},fetchedAt:text(p.fetchedAt,40),provenance:{parserVersion:text(p.provenance?.parserVersion,100),contentHash:text(p.provenance?.contentHash,128),questionKind:text(p.provenance?.questionKind,100)}};
 out.provenance.provider=['gallup','realmeter','nbs'].includes(p.provenance?.provider)?p.provenance.provider:(source.hostname.endsWith('gallup.co.kr')?'gallup':source.hostname.includes('nbsurvey')||source.hostname.includes('yna.co.kr')||source.hostname.includes('newsis.com')?'nbs':'realmeter');out.provenance.transport=source.protocol.slice(0,-1);
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

const lineValue=(body,label)=>{const m=body.match(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:：]\\s*([^\\n]+)`,'i'));return m?m[1].trim():'';};
const pct=(body,label)=>{const v=lineValue(body,label).replace(/%P?|퍼센트포인트/gi,'').trim();if(!v)return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=100?n:null;};
const intValue=(body,label)=>{const v=lineValue(body,label).replace(/[,명\s]/g,'');const n=Number(v);return Number.isInteger(n)&&n>0?n:null;};
export function parseManualHumanPoll(input,{now=Date.now}={}){
 const body=String(input||'').replace(/\r/g,'').trim();if(!body||body.length>12000)fail('INPUT_INVALID');
 const institutionRaw=lineValue(body,'기관|조사기관');let provider,institution;
 if(/갤럽/i.test(institutionRaw)){provider='gallup';institution='한국갤럽';}else if(/리얼미터/i.test(institutionRaw)){provider='realmeter';institution='리얼미터';}else if(/NBS|전국지표조사/i.test(institutionRaw)){provider='nbs';institution='NBS';}else fail('INPUT_INVALID');
 const publishedDate=date(lineValue(body,'발표일|공개일'));let startDate=date(lineValue(body,'조사시작일|시작일')),endDate=date(lineValue(body,'조사종료일|종료일'));
 if(!startDate||!endDate){const range=lineValue(body,'조사기간').match(/(20\d{2}-\d{2}-\d{2})\s*[~∼～–-]+\s*(20\d{2}-\d{2}-\d{2})/);if(range){startDate=date(range[1]);endDate=date(range[2]);}}
 const sampleSize=intValue(body,'표본수|응답자수|N'),positive=pct(body,'긍정'),negative=pct(body,'부정'),undecided=pct(body,'유보|모름\/?무응답|모름·무응답');
 const sourceUrl=lineValue(body,'원문|출처URL|URL'),question=lineValue(body,'질문')||'대통령 직무수행 평가',method=lineValue(body,'조사방법|방법'),commissioner=lineValue(body,'의뢰기관|의뢰처'),responseRate=pct(body,'응답률'),marginOfError=pct(body,'표본오차');
 if(!publishedDate||!startDate||!endDate||!sampleSize||positive==null||negative==null||!sourceUrl)fail('INPUT_INVALID');
 let source;try{source=new URL(sourceUrl);}catch{fail('INPUT_INVALID');}
 const id=`manual-${provider}-${publishedDate}-${startDate}`;const fetchedAt=new Date(typeof now==='function'?now():now).toISOString();
 const poll=publicHumanPoll({id,institution,question,sourceUrl:source.href,startDate,endDate,publishedDate,sampleSize,method,commissioner,responseRate,marginOfError,results:{overall:{positive,negative,undecided,n:sampleSize},gender:{},age:{},region:{}},fetchedAt,comparisonNote:'관리자 붙여넣기로 등록한 HUMAN 조사입니다. 원문 질문·조사기간을 확인해 비교 적합성을 판단하세요.',provenance:{provider,parserVersion:'manual-paste-v1',contentHash:'manual',questionKind:'source-summary'}});if(!poll)fail('INPUT_INVALID');return poll;
}

const providerOf=p=>{const raw=String(p?.provenance?.provider||p?.institution||'');if(/갤럽|gallup/i.test(raw))return ['gallup','한국갤럽'];if(/리얼미터|realmeter/i.test(raw))return ['realmeter','리얼미터'];if(/NBS|전국지표조사/i.test(raw))return ['nbs','NBS'];return [null,null];};
const normalizeImportedPoll=(p,{now=Date.now,index=0}={})=>{
 if(!p||typeof p!=='object')fail('INPUT_INVALID');const [provider,institution]=providerOf(p);if(!provider)fail('INPUT_INVALID');
 const publishedDate=date(p.publishedDate),startDate=date(p.startDate),endDate=date(p.endDate),sampleSize=Number(p.sampleSize);if(!publishedDate||!startDate||!endDate||!Number.isInteger(sampleSize)||sampleSize<=0)fail('INPUT_INVALID');
 const sourceUrl=String(p.sourceUrl||'').trim(),question=String(p.question||'대통령 직무수행 평가').trim();if(!sourceUrl||!question)fail('INPUT_INVALID');
 const overall=p.results?.overall||{},positive=Number(overall.positive),negative=Number(overall.negative),undecided=overall.undecided==null?null:Number(overall.undecided);if(!Number.isFinite(positive)||!Number.isFinite(negative)||(undecided!=null&&!Number.isFinite(undecided)))fail('INPUT_INVALID');
 const fetchedAt=new Date(typeof now==='function'?now():now).toISOString(),id=String(p.id||`chatgpt-${provider}-${publishedDate}-${startDate}-${index+1}`);
 const poll=publicHumanPoll({
  ...p,id,institution,question,sourceUrl,startDate,endDate,publishedDate,sampleSize,fetchedAt,
  comparisonNote:p.comparisonNote||'JCS HUMAN POLL 조사·검증 후 관리자 붙여넣기로 등록한 HUMAN 조사입니다.',
  provenance:{provider,parserVersion:String(p.provenance?.parserVersion||'chatgpt-paste-v1'),contentHash:String(p.provenance?.contentHash||'chatgpt-verified'),questionKind:String(p.provenance?.questionKind||'source-summary')},
  results:{overall:{positive,negative,undecided,n:sampleSize},gender:p.results?.gender||{},age:p.results?.age||{},region:p.results?.region||{}}
 });if(!poll)fail('INPUT_INVALID');return poll;
};
export function parseManualHumanPollBatch(input,{now=Date.now}={}){
 const body=String(input||'').replace(/\r/g,'').trim();if(!body||body.length>240000)fail('INPUT_INVALID');
 if(body[0]==='{'||body[0]==='['){try{const parsed=JSON.parse(body),items=Array.isArray(parsed)?parsed:parsed?.polls;if(!Array.isArray(items)||!items.length||items.length>6)fail('INPUT_INVALID');return items.map((item,index)=>normalizeImportedPoll(item,{now,index}));}catch(error){if(String(error?.message||'').startsWith('HUMAN_POLL_'))throw error;fail('INPUT_INVALID');}}
 return [parseManualHumanPoll(body,{now})];
}
const empty=()=>({items:[],providers:providers.map(p=>({...p,state:'pending',fetchedCount:0,checkedAt:null,lastSuccessAt:null})),lastCheckedAt:null,lastSuccessAt:null});
const latestItems=items=>{const seen=new Set();return [...items].sort((a,b)=>String(b.publishedDate||'').localeCompare(String(a.publishedDate||''))).filter(item=>{const key=item?.institution||item?.provenance?.provider;if(!key||seen.has(key))return false;seen.add(key);return true;});};
const parse=raw=>{if(!raw)return empty();try{const data=JSON.parse(raw);if(!Array.isArray(data.items)||!Array.isArray(data.providers))fail('STORAGE_FAILED');return data;}catch{fail('STORAGE_FAILED');}};
const bucketRegresses=(previous,next)=>['positive','negative','undecided','n'].some(key=>previous?.[key]!=null&&next?.[key]==null);
function incompleteRevision(previous,next){
 if(bucketRegresses(previous.results?.overall,next.results?.overall))return true;
 for(const group of ['gender','age','region'])for(const [key,bucket] of Object.entries(previous.results?.[group]||{}))if(!Object.hasOwn(next.results?.[group]||{},key)||bucketRegresses(bucket,next.results[group][key]))return true;
 return ['responseRate','marginOfError'].some(key=>previous[key]!=null&&next[key]==null)||['method','commissioner'].some(key=>previous[key]&&!next[key]);
}
export function createHumanPollService({command,fetch=globalThis.fetch,now=Date.now,idFor=randomUUID,collect=async options=>(await import('./human-poll-sources.js')).collectOfficialPolls(options)}={}){
 if(typeof command!=='function')fail('STORAGE_FAILED');
 const list=async()=>{const data=parse(await command(['GET',HUMAN_POLL_KEYS.snapshot]));return {ok:true,...data,items:latestItems(data.items.map(publicHumanPoll).filter(Boolean))};};
 async function run(){
  const token=idFor();if(await command(['SET',HUMAN_POLL_KEYS.lock,token,'NX','EX',120])!=='OK')fail('BUSY');
  try{
   const raw=await command(['GET',HUMAN_POLL_KEYS.snapshot]),previous=parse(raw),checkedAt=new Date(now()).toISOString();
   let result;try{result=await collect({fetch,now,limit:1});}catch{result={items:[],providers:[]};}
   const candidates=(Array.isArray(result?.items)?result.items:[]).map(publicHumanPoll).filter(Boolean),incoming=[],regressed=new Set();
   const records=new Map(previous.items.map(p=>[p.id,p]));
   for(const item of candidates){const prior=records.get(item.id);if(prior&&incompleteRevision(prior,item)){regressed.add(item.provenance.provider);continue;}records.set(item.id,item);incoming.push(item);}
   const statuses=providers.map(provider=>{const current=result?.providers?.find(p=>p.id===provider.id),prior=previous.providers.find(p=>p.id===provider.id);const sourceItems=(result?.items||[]).filter(p=>p?.provenance?.provider===provider.id);const count=incoming.filter(p=>p.provenance.provider===provider.id).length;const success=count>0,partial=regressed.has(provider.id)||(success&&(current?.state!=='success'||sourceItems.length>count));return {...provider,state:partial?'partial':success?'success':'error',fetchedCount:count,checkedAt,lastSuccessAt:success?checkedAt:prior?.lastSuccessAt||null,...(!success||partial?{error:'SOURCE_UNAVAILABLE'}:{})};});
   const next={items:[...records.values()].sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||a.id.localeCompare(b.id)).slice(0,104),providers:statuses,lastCheckedAt:checkedAt,lastSuccessAt:incoming.length?checkedAt:previous.lastSuccessAt};
   if(Number(await command(['EVAL',HUMAN_POLL_COMMIT_LUA,'2',HUMAN_POLL_KEYS.lock,HUMAN_POLL_KEYS.snapshot,token,raw||'',JSON.stringify(next)]))!==1)fail('BUSY');
   return {ok:true,...next,items:latestItems(next.items)};
  }finally{await command(['EVAL',HUMAN_POLL_RELEASE_LUA,'1',HUMAN_POLL_KEYS.lock,token]);}
 }
 async function manual(user,input){
  requireAdminLocal(user);const token=idFor();if(await command(['SET',HUMAN_POLL_KEYS.lock,token,'NX','EX',120])!=='OK')fail('BUSY');
  try{
   const raw=await command(['GET',HUMAN_POLL_KEYS.snapshot]),previous=parse(raw),checkedAt=new Date(now()).toISOString(),polls=parseManualHumanPollBatch(input?.text,{now});const records=new Map(previous.items.map(p=>[p.id,p]));
   for(const poll of polls)records.set(poll.id,poll);
   const imported=new Map();for(const poll of polls)imported.set(poll.provenance.provider,(imported.get(poll.provenance.provider)||0)+1);
   const statuses=providers.map(provider=>{const prior=previous.providers.find(p=>p.id===provider.id),count=imported.get(provider.id)||0;return count?{...provider,state:'success',fetchedCount:count,checkedAt,lastSuccessAt:checkedAt}:{...provider,state:prior?.state||'pending',fetchedCount:prior?.fetchedCount||0,checkedAt:prior?.checkedAt||null,lastSuccessAt:prior?.lastSuccessAt||null,...(prior?.error?{error:prior.error}:{})};});
   const next={items:[...records.values()].sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||a.id.localeCompare(b.id)).slice(0,156),providers:statuses,lastCheckedAt:checkedAt,lastSuccessAt:checkedAt};
   if(Number(await command(['EVAL',HUMAN_POLL_COMMIT_LUA,'2',HUMAN_POLL_KEYS.lock,HUMAN_POLL_KEYS.snapshot,token,raw||'',JSON.stringify(next)]))!==1)fail('BUSY');return {ok:true,importedCount:polls.length,...next,items:latestItems(next.items)};
  }finally{await command(['EVAL',HUMAN_POLL_RELEASE_LUA,'1',HUMAN_POLL_KEYS.lock,token]);}
 }
 function requireAdminLocal(user){if(!isAdmin(user))fail('FORBIDDEN');}
 return {list,collect:async user=>{if(!isAdmin(user))fail('FORBIDDEN');return run();},collectScheduled:run,manual};
}
