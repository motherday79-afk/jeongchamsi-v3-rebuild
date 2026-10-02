import {createHash} from 'node:crypto';
import {mutateParticipation} from './participation-admin.js';
import {analyzeNewsHeadlines} from './intelligence-headlines.js';
import {publisherLabel,buildIssueLifecycle} from '../src/ui/intelligence-narratives.js';

const list=value=>Array.isArray(value)?value:[];
const text=(value,max=1000)=>String(value??'').trim().slice(0,max);
const clone=value=>structuredClone(value);
const hash=value=>createHash('sha256').update(value).digest('hex');
function canonicalUrl(value){try{const url=new URL(text(value,3000));if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return '';url.protocol='https:';url.hash='';url.hostname=url.hostname.replace(/^www\./,'');for(const key of [...url.searchParams.keys()])if(/^(utm_.+|fbclid|gclid|ref|referrer|oc)$/i.test(key))url.searchParams.delete(key);url.searchParams.sort();url.pathname=url.pathname.replace(/\/$/,'')||'/';return url.href;}catch{return '';}}
const titleAlias=value=>text(value).normalize('NFKC').toLowerCase().replace(/\[[^\]]*\]|【[^】]*】/g,'').replace(/\s*[-|｜]\s*[^-|｜]{2,30}$/,'').replace(/[^\p{L}\p{N}]/gu,'');
function aliases(item){const title=titleAlias(item?.title||item?.evidenceTitle),source=titleAlias(publisherLabel(item?.source||item?.evidenceSource)||item?.source||item?.evidenceSource);return [...new Set([canonicalUrl(item?.url||item?.evidenceUrl),canonicalUrl(item?.originalUrl)].filter(Boolean).map(url=>'url:'+url).concat(title&&source?['title:'+source+':'+title]:[]))];}
export function articleKey(item){const alias=aliases(item)[0];return alias?'article-'+hash(alias):'';}
const same=(a,b)=>{const keys=new Set(aliases(a));return aliases(b).some(key=>keys.has(key));};
export function normalizeArticleCandidates(items){const result=[],seen=new Set();for(const item of list(items)){const title=text(item?.title||item?.evidenceTitle,500),url=canonicalUrl(item?.url||item?.evidenceUrl);if(!title||!url)continue;const row={key:articleKey({...item,title,url}),title,url,source:text(item.source||item.evidenceSource,120),date:text(item.date||item.publishedAt,50)};const keys=aliases(row);if(!keys.some(key=>seen.has(key))){result.push(row);keys.forEach(key=>seen.add(key));}}return result;}
const empty=personId=>({version:1,personId,placements:{},snapshots:{},excluded:[],updatedAt:''});
const slotValid=slot=>typeof slot==='string'&&/^(headlines:[0-9]|brand:0|competitor:(24H|7D|30D):[0-2]|lifecycle:[0-4]|activity:[0-4])$/.test(slot);
const lane=slot=>slot.slice(0,slot.lastIndexOf(':'));
function stateOf(value,personId=''){return {...empty(personId),...value,placements:{...(value?.placements||{})},snapshots:{...(value?.snapshots||{})},excluded:list(value?.excluded)};}
const excluded=(item,state)=>state.excluded.some(row=>same(row,item));
function exclusionMatcher(state){const blocked=new Set(state.excluded.flatMap(aliases));return item=>blocked.size>0&&aliases(item).some(key=>blocked.has(key));}
function cleanTree(value,state,match=exclusionMatcher(state)){if(Array.isArray(value))return value.map(row=>cleanTree(row,state,match)).filter(row=>row!==undefined);if(!value||typeof value!=='object')return value;const evidence=value.evidenceUrl?{title:value.evidenceTitle||value.title,url:value.evidenceUrl,source:value.evidenceSource||value.source}:null;
 if((value.url&&match(value))||(!value.url&&value.title&&value.source&&match(value))||(evidence&&match(evidence)&&!value.kind&&!value.nowSignal&&!value.indicators))return undefined;
 const out={};for(const [key,child] of Object.entries(value)){if(evidence&&match(evidence)&&['evidenceUrl','evidenceTitle','evidenceSource','nowSignal'].includes(key))continue;const next=cleanTree(child,state,match);if(next!==undefined)out[key]=next;}return out;}
function selectLane(name,count,automatic,state,all){const pins=Array.from({length:count},(_,i)=>{const key=state.placements[`${name}:${i}`];return key?all.find(row=>row.key===key||same(row,state.snapshots[key])):null;}),result=[],reserved=pins.filter(Boolean);for(let i=0;i<count;i++){const row=pins[i]||automatic.find(row=>!reserved.some(pin=>same(pin,row))&&!result.some(saved=>same(saved,row)));if(row)result.push(row);}return result;}

export function createArticleCurationService({command,now=Date.now}={}){
 if(typeof command!=='function')throw Error('STORAGE_COMMAND_REQUIRED');
 const storageKey=id=>{if(typeof id!=='string'||!id.trim()||id.length>160)throw Error('PERSON_ID_INVALID');return `jcs:v3:article-curation:${encodeURIComponent(id)}`;};
 async function read(personId){const raw=await command(['GET',storageKey(personId)]);return stateOf(raw?JSON.parse(raw):{},personId);}
 async function mutate(personId,input={},candidates=[],actor=''){
  const {operation,slot}=input;if(!['exclude','place','automatic','restore'].includes(operation))throw Error('CURATION_OPERATION_INVALID');if(['place','automatic'].includes(operation)&&!slotValid(slot))throw Error('CURATION_SLOT_INVALID');
  return mutateParticipation(command,[storageKey(personId)],([doc])=>{const state=stateOf(doc,personId),pool=[...normalizeArticleCandidates(candidates),...normalizeArticleCandidates(Object.values(state.snapshots)),...normalizeArticleCandidates(state.excluded)],article=pool.find(row=>row.key===input.articleKey),stamp=new Date(Number(now())).toISOString();
   if(operation!=='automatic'&&!article)throw Error('CURATION_ARTICLE_NOT_FOUND');
   if(operation==='automatic')delete state.placements[slot];
   if(operation==='place'){if(excluded(article,state))throw Error('CURATION_ARTICLE_EXCLUDED');for(const [key,value] of Object.entries(state.placements))if(lane(key)===lane(slot)&&same(state.snapshots[value]||{key:value},article))delete state.placements[key];state.snapshots[article.key]=article;state.placements[slot]=article.key;}
   if(operation==='exclude'){state.excluded=state.excluded.filter(row=>!same(row,article));state.excluded.push({...article,excludedAt:stamp,excludedBy:text(typeof actor==='object'?actor.id:actor,100)});for(const [key,value] of Object.entries(state.placements))if(same(state.snapshots[value],article))delete state.placements[key];state.snapshots[article.key]=article;}
   if(operation==='restore'){state.excluded=state.excluded.filter(row=>!same(row,article));state.snapshots[article.key]={...article,restoredAt:stamp};}
   state.updatedAt=stamp;Object.assign(doc,state);return state;
  });
 }
 function filter(items,input){const state=stateOf(input);const blocked=new Set(state.excluded.flatMap(aliases));return blocked.size?list(items).filter(row=>!aliases(row).some(key=>blocked.has(key))):list(items);}
 function editorData(person,candidates,input){const state=stateOf(input);return {ok:true,person:{id:person.id,name:person.name},candidates:normalizeArticleCandidates(filter([...list(candidates),...Object.values(state.snapshots)],state)),placements:{...state.placements},excluded:clone(state.excluded)};}
 function apply(report,input){if(!report)return report;const state=stateOf(input,report.id);if(state.personId&&report.id&&state.personId!==report.id)return clone(report);
  const person=report.raw?.officialProfile||report.person||{id:report.id,name:report.name},rawItems=list(report.raw?.news?.items),automatic=normalizeArticleCandidates(filter([...list(report.news),...rawItems,...list(report.raw?.news?.candidates).filter(row=>row?.identity?.exclude!==true),...Object.values(state.snapshots).filter(row=>row.restoredAt)],state)),all=normalizeArticleCandidates(filter([...automatic,...Object.values(state.snapshots)],state)),enriched=analyzeNewsHeadlines(person,all,{all:true}).items,rich=row=>({...enriched.find(item=>same(item,row)),...row}),pick=(name,count,rows=automatic)=>selectLane(name,count,rows,state,all).map(rich),out=cleanTree(clone(report),state)||{};
  const preferred=(rows,fallback=automatic)=>normalizeArticleCandidates(filter([...rows,...fallback],state)).map(row=>({...rows.find(previous=>same(previous,row)),...row}));
  out.news=pick('headlines',10);if(out.newsNarrative)out.newsNarrative.items=out.news;
  for(const diagnosis of list(out.diagnoses)){const display=diagnosis.display;if(!display)continue;
   const excludedTitle=value=>!!titleAlias(value)&&state.excluded.some(article=>titleAlias(article.title)===titleAlias(value));
   if(excludedTitle(display.nowSignal))display.nowSignal=pick(diagnosis.id==='06'?'lifecycle':'headlines',1)[0]?.title||'';
   for(const observation of list(display.issueObservations)){if(!excludedTitle(observation.title))continue;observation.title=list(observation.outlets).find(row=>row.title&&!excludedTitle(row.title))?.title||'기사 제외 후 집계';observation.firstSources=[];if('firstAt' in observation)observation.firstAt='';}
   if(diagnosis.id==='01'||display.kind==='brand'){const original={title:display.evidenceTitle,url:display.evidenceUrl,source:display.evidenceSource},row=pick('brand',1,preferred([original]))[0],signal=!state.placements['brand:0']&&row&&same(row,original)?display.nowSignal:row?.title;Object.assign(display,{nowSignal:signal||'',evidenceTitle:row?.title||'',evidenceUrl:row?.url||'',evidenceSource:row?.source||''});}
   if(diagnosis.id==='05'||display.kind==='competitor'){for(const row of list(display.people)){if(String(row.id)!==String(report.id))continue;row.framePeriods=['24H','7D','30D'].map(label=>{const previous=list(row.framePeriods).find(period=>period.label===label)||{label},end=Date.parse(report.raw?.collectedAt||report.updatedAt||'')||Math.max(0,...automatic.map(item=>Date.parse(item.date)||0)),days=label==='24H'?1:label==='7D'?7:30,within=automatic.filter(item=>{const date=Date.parse(item.date);return Number.isFinite(date)&&date<=end&&end-date<=days*86400000;});return {...previous,items:pick('competitor:'+label,3,preferred(list(previous.items),within))};});}}
   if(diagnosis.id==='06'||display.kind==='risk'){const issues=list(display.lifecycle).filter(issue=>!state.excluded.some(article=>titleAlias(article.title)===titleAlias(issue.title))),matches=issues.map(issue=>automatic.find(article=>same(issue,article)||titleAlias(issue.title)===titleAlias(article.title))||{...issue,source:issue.source||'이슈 관측'}),rows=pick('lifecycle',5,[...matches,...automatic.filter(article=>!matches.some(issue=>same(issue,article)||titleAlias(issue.title)===titleAlias(article.title)))]);display.lifecycle=rows.map(row=>{const previous=issues.find(issue=>same(issue,row)||titleAlias(issue.title)===titleAlias(row.title)),built=previous?null:buildIssueLifecycle(person,[row],report.raw?.collectedAt)[0];return {...(previous||built),...row};});}
   if(diagnosis.id==='09'||display.kind==='action'){const existing=list(display.activities);display.activities=pick('activity',5,preferred(existing)).map(row=>({...row,...existing.find(item=>same(item,row)),evidenceUrl:row.url,category:existing.find(item=>same(item,row))?.category||(/정책|공약|법안|예산|발의|추진/.test(row.title)?'정책·의제 선점':/방문|참석|현장|행사/.test(row.title)?'현장·행사 참여':'발언·논평')}));}
  }
  return out;
 }
 return {read,mutate,editorData,apply,filter};
}
