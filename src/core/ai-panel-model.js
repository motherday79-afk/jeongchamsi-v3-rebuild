// AI synthetic responses are not observations of human respondents.
export const AI_DISCLOSURE='AI 합성 응답이며 실제 인간 여론조사가 아닙니다.';
export const AI_CHOICES=['very-positive','positive','negative','very-negative','undecided'];
export const fail=code=>{throw new Error(`AI_PANEL_${code}`);};
export const isObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
export const isAdmin=u=>!!u?.id&&u.role==='admin'&&u.status==='active';
const str=(v,max=2000,required=false)=>{if(v==null&&!required)return '';if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('INPUT_INVALID');return v.trim();};
const url=v=>{const s=str(v,2000,true);try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)fail('INPUT_INVALID');}catch{fail('INPUT_INVALID');}return s;};
const date=v=>{const s=str(v,10,true);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)fail('INPUT_INVALID');return s;};
const timestamp=v=>{const s=str(v,100,true);if(!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(s)||!Number.isFinite(Date.parse(s)))fail('INPUT_INVALID');date(s.slice(0,10));return new Date(s).toISOString();};
const profileFields=['gender','age','region','politicalInterest','pollExposure','occupation','education','income','household','housing','newsConsumption','politicalNewsExposure','criteria','axes'];
function profile(p){
 if(!isObject(p)||!/^JCS-AI-\d{4}$/.test(p.id))fail('PROFILE_INVALID');
 for(const k of ['gender','age','region','politicalInterest'])if(typeof p[k]!=='string'||!p[k].trim())fail('PROFILE_INVALID');
 if(typeof p.pollExposure!=='boolean'&&(typeof p.pollExposure!=='string'||!p.pollExposure.trim()))fail('PROFILE_INVALID');
 const out={id:p.id};
 for(const k of profileFields){
  if(p[k]===undefined)continue;const v=p[k];
  if(k==='axes'){
   if(!isObject(v)||!Object.keys(v).length||Object.keys(v).length>30||Object.values(v).some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>100)||Math.abs(Object.values(v).reduce((a,b)=>a+b,0)-100)>0.01)fail('PROFILE_INVALID');
   out[k]=Object.fromEntries(Object.entries(v).map(([key,value])=>[str(key,100,true),value]));
  }else if(typeof v==='string')out[k]=str(v,1000);
  else if(typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))out[k]=v;
  else if(k==='criteria'&&Array.isArray(v)&&v.length<=30)out[k]=v.map(x=>str(x,200,true));
  else fail('PROFILE_INVALID');
 }
 return out;
}
export function createPanel(input,{id,now,user}){
 if(!isObject(input)||!validId(id)||!Array.isArray(input.profiles))fail('INPUT_INVALID');const isSample=input.isSample===true,n=input.profiles.length;
 if(isSample?![10,100].includes(n):n!==1000)fail('PANEL_SIZE_INVALID');
 const profiles=input.profiles.map(profile).sort((a,b)=>a.id.localeCompare(b.id));if(profiles.some((p,i)=>p.id!==`JCS-AI-${String(i+1).padStart(4,'0')}`))fail('PROFILE_INVALID');
 const p=input.population||{};if(!isObject(p))fail('INPUT_INVALID');if(!isSample&&(!p.sourceUrl||!p.referenceDate))fail('POPULATION_REQUIRED');
 return {id,version:1,name:str(input.name,160,true),isSample,population:{sourceUrl:p.sourceUrl?url(p.sourceUrl):'',referenceDate:p.referenceDate?date(p.referenceDate):'',notes:str(p.notes,4000)},profiles,createdAt:now,createdBy:user.id,disclosure:AI_DISCLOSURE};
}
export function createRun(input,{id,now,user,panel,runNumber}){
 if(!isObject(input)||!validId(id)||!/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(input.week))fail('INPUT_INVALID');
 const modes=input.modes||['EXPOSED'];if(!Array.isArray(modes)||!modes.length||modes.length>2||new Set(modes).size!==modes.length||modes.some(m=>!['BLIND','EXPOSED'].includes(m)))fail('INPUT_INVALID');
 if(input.isSample!==undefined&&input.isSample!==panel.isSample)fail('PANEL_SIZE_INVALID');
 return {id,version:1,week:input.week,runNumber,basisDate:date(input.basisDate),question:str(input.question,2000,true),questionVersion:str(input.questionVersion,100,true),panelId:panel.id,panel:structuredClone(panel),isSample:panel.isSample,modes:[...modes],personId:str(input.personId,100),sourceRunId:input.sourceRunId||null,rerunReason:str(input.rerunReason,2000),environments:{},results:{},aggregates:{},humanPolls:[],status:'draft',lockedAt:null,publishedAt:null,createdAt:now,updatedAt:now,audit:[{operation:'create',actorId:user.id,at:now}],disclosure:AI_DISCLOSURE};
}
const bucket=responses=>{const n=responses.length,counts=Object.fromEntries(AI_CHOICES.map(c=>[c,responses.filter(r=>r.choice===c).length])),percent=Object.fromEntries(AI_CHOICES.map(c=>[c,n?counts[c]*100/n:null]));return {n,counts,percent,positive:n?(counts.positive+counts['very-positive'])*100/n:null,negative:n?(counts.negative+counts['very-negative'])*100/n:null,undecided:percent.undecided};};
export function aggregateResponses(profiles,responses){const indexed=new Map(responses.map(r=>[r.id,r])),out={overall:bucket(responses)};for(const field of ['gender','age','region']){const groups=new Map();for(const p of profiles){const key=String(p[field]??'미입력');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(indexed.get(p.id));}out[field]=Object.fromEntries([...groups].map(([k,v])=>[k,bucket(v)]));}return out;}
function humanBucket(v){if(!isObject(v))fail('HUMAN_INVALID');const out={};for(const k of ['positive','negative','undecided']){const x=v[k];if(x!=null&&(typeof x!=='number'||!Number.isFinite(x)||x<0||x>100))fail('HUMAN_INVALID');out[k]=x??null;}if(Object.values(out).every(x=>x!==null)&&Math.abs(out.positive+out.negative+out.undecided-100)>1)fail('HUMAN_INVALID');if(v.n!=null&&(!Number.isInteger(v.n)||v.n<0))fail('HUMAN_INVALID');out.n=v.n??null;return out;}
function humanPoll(p){if(!isObject(p)||!validId(p.id)||!isObject(p.results)||typeof p.comparable!=='boolean')fail('HUMAN_INVALID');const out={id:p.id,comparable:p.comparable,institution:str(p.institution,200,true),sourceUrl:url(p.sourceUrl),question:str(p.question,2000,true)};for(const k of ['commissioner','title','method','comparisonNote'])out[k]=str(p[k],2000);for(const k of ['startDate','endDate','publishedDate'])out[k]=p[k]?date(p[k]):null;if(out.startDate&&out.endDate&&out.startDate>out.endDate)fail('HUMAN_INVALID');for(const k of ['sampleSize','responseRate','marginOfError']){const v=p[k];if(v!=null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||(k==='sampleSize'?!Number.isInteger(v):v>100)))fail('HUMAN_INVALID');out[k]=v??null;}if(p.topic)out.topic=str(p.topic,100);if(p.fetchedAt)out.fetchedAt=timestamp(p.fetchedAt);if(p.provenance!=null){if(!isObject(p.provenance))fail('HUMAN_INVALID');out.provenance={};for(const k of ['parserVersion','contentHash','questionKind'])if(p.provenance[k]!=null)out.provenance[k]=str(p.provenance[k],200);if(out.provenance.questionKind&&!['source-summary','verbatim'].includes(out.provenance.questionKind))fail('HUMAN_INVALID');}out.results={overall:humanBucket(p.results.overall)};for(const k of ['gender','age','region']){const v=p.results[k]||{};if(!isObject(v)||Object.keys(v).length>200)fail('HUMAN_INVALID');out.results[k]=Object.fromEntries(Object.entries(v).map(([name,b])=>[str(name,100,true),humanBucket(b)]));}return out;}
export function mutateRun(previous,operation,input,{now,user}){
 if(!isObject(input))fail('INPUT_INVALID');const locked=['locked','published'].includes(previous.status);
 if(locked&&!['human','publish'].includes(operation))fail('LOCKED');const r=structuredClone(previous);
 const mode=()=>{if(!r.modes.includes(input.mode))fail('MODE_INVALID');return input.mode;};
 if(operation==='environment'){
  const m=mode(),sources=input.sources||[];if(!Array.isArray(sources)||sources.length>100)fail('INPUT_INVALID');r.environments[m]={notes:str(input.notes,20000),sources:sources.map(s=>{if(!isObject(s)||typeof s.containsPollNumbers!=='boolean')fail('INPUT_INVALID');if(m==='BLIND'&&s.containsPollNumbers)fail('BLIND_POLL_LEAKAGE');return {title:str(s.title,500,true),url:url(s.url),publishedAt:s.publishedAt?timestamp(s.publishedAt):null,containsPollNumbers:s.containsPollNumbers};})};
  // Any setting change invalidates imported responses and the prior review.
  delete r.results[m];delete r.aggregates[m];r.status='draft';
 }else if(operation==='responses'){
  const m=mode(),rows=input.responses;if(!r.environments[m])fail('ENVIRONMENT_REQUIRED');if(!Array.isArray(rows)||rows.length!==r.panel.profiles.length)fail('RESPONSES_INVALID');const ids=new Set(r.panel.profiles.map(p=>p.id)),seen=new Set();const responses=rows.map(x=>{if(!isObject(x)||!ids.has(x.id)||seen.has(x.id)||!AI_CHOICES.includes(x.choice))fail('RESPONSES_INVALID');seen.add(x.id);if(x.factors!=null&&(!Array.isArray(x.factors)||x.factors.length>30))fail('RESPONSES_INVALID');return {id:x.id,choice:x.choice,reason:str(x.reason,2000),explanation:str(x.explanation,4000),factors:(x.factors||[]).map(f=>str(f,500,true))};});
  const executedAt=timestamp(input.executedAt);r.results[m]={model:str(input.model,300,true),executedAt,responses};r.aggregates[m]=aggregateResponses(r.panel.profiles,responses);r.status='draft';
 }else if(operation==='human'){const p=humanPoll(input.poll);if(r.humanPolls.some(x=>x.id===p.id))fail('HUMAN_DUPLICATE');if(r.humanPolls.length>=100)fail('LIMIT_REACHED');r.humanPolls.push(p);if(!locked)r.status='draft';
 }else if(operation==='review'){if(!r.modes.every(m=>r.environments[m]))fail('ENVIRONMENT_REQUIRED');if(!r.modes.every(m=>r.results[m]))fail('RESPONSES_REQUIRED');r.status='reviewed';r.reviewNote=str(input.note,4000);
 }else if(operation==='lock'){if(r.status!=='reviewed')fail('REVIEW_REQUIRED');r.status='locked';r.lockedAt=now;r.lockedBy=user.id;
 }else if(operation==='publish'){if(r.status!=='locked'||r.isSample||r.panel.profiles.length!==1000)fail('PUBLISH_INVALID');if(!r.humanPolls.some(p=>p.comparable&&[p.results.overall.positive,p.results.overall.negative,p.results.overall.undecided].every(v=>v!==null)))fail('HUMAN_REQUIRED');r.status='published';r.publishedAt=now;
 }else fail('OPERATION_INVALID');
 r.version++;r.updatedAt=now;r.audit.push({operation,actorId:user.id,at:now});return r;
}
export const isPublicRun=r=>r?.status==='published'&&!!r.lockedAt&&!r.isSample&&r.panel?.profiles?.length===1000;
export function publicPanel(p){const {createdBy,...safe}=p;return structuredClone(safe);}
export function publicRun(r){if(!isPublicRun(r))fail('NOT_FOUND');const out=structuredClone(r);delete out.audit;delete out.lockedBy;delete out.reviewNote;out.panel=publicPanel(r.panel);return out;}
export function runSummary(r){const {panel,results,environments,audit,...rest}=r;delete rest.lockedBy;delete rest.reviewNote;return {...rest,panelName:panel.name,panelSize:panel.profiles.length,models:Object.fromEntries(Object.entries(results).map(([m,v])=>[m,v.model])),disclosure:AI_DISCLOSURE};}
