import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const VERSION='deterministic-synthetic-panel-v1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const CATEGORIES=[['democratic','더불어민주당'],['ppp','국민의힘'],['rebuilding','조국혁신당'],['reform','개혁신당'],['progressive','진보당'],['other','기타 정당'],['none','지지 정당 없음'],['undecided','모름·무응답']].map(([id,name])=>({id,name}));
const HOSTS=new Set(['gallup.co.kr','www.gallup.co.kr','realmeter.net','www.realmeter.net','nbsurvey.kr','www.nbsurvey.kr','ekn.kr','www.ekn.kr']);
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function loadPanel(){try{return JSON.parse(readFileSync(new URL('../data/party-ai-panel.json',import.meta.url),'utf8'));}catch{return null;}}
const validRows=rows=>Array.isArray(rows)&&rows.length>=2&&rows.length<=30&&new Set(rows.map(p=>p?.id)).size===rows.length&&rows.every(p=>typeof p?.id==='string'&&/^[-a-z0-9]{1,64}$/.test(p.id)&&typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=100);
const sum=rows=>rows.reduce((n,p)=>n+p.value,0);
function fallback(previous,state,reason,checkedAt){
 if(previous?.state==='ready'&&previous.topic==='party-support'&&validDate(previous.publishedDate)&&validRows(previous.results?.parties)&&Math.abs(sum(previous.results.parties)-100)<0.001)return {...previous,stale:true,refreshState:state,reason,checkedAt};
 return {state,topic:'party-support',institution:'JCS AI',reason,checkedAt,stale:false};
}
function sourceRows(items,instant){
 const latest=new Map(),excluded=[];
 for(const p of Array.isArray(items)?items:[]){
  if(p?.topic!=='party-support'||!['gallup','realmeter','nbs'].includes(p.provenance?.provider)||!validDate(p.publishedDate)||Date.parse(p.publishedDate)>instant||instant-Date.parse(p.publishedDate)>45*86400000||!validRows(p.results?.parties)||Math.abs(sum(p.results.parties)-100)>2){if(p?.id)excluded.push(p.id);continue;}
  let url;try{url=new URL(p.sourceUrl);}catch{excluded.push(p.id);continue;}
  if(!HOSTS.has(url.hostname)||!['http:','https:'].includes(url.protocol)||url.username||url.password){excluded.push(p.id);continue;}
  // Require each shared category; absent named parties must never become invented zeroes.
  if(CATEGORIES.some(c=>!p.results.parties.some(r=>r.id===c.id))){excluded.push(p.id);continue;}
  const parties=p.results.parties.map(({id,value})=>({id,value})).sort((a,b)=>a.id.localeCompare(b.id));
  const collapsed=parties.filter(p=>!CATEGORIES.some(c=>c.id===p.id));
  const normalizedParties=CATEGORIES.map(c=>({...c,value:(parties.find(p=>p.id===c.id).value+(c.id==='other'?sum(collapsed):0))*100/sum(parties)}));
  const source={id:p.id,provider:p.provenance.provider,institution:p.institution,sourceUrl:url.href,publishedDate:p.publishedDate,startDate:p.startDate||null,endDate:p.endDate||null,method:p.method||null,parties,collapsedPartyIds:collapsed.map(p=>p.id),normalizedParties};
  const old=latest.get(source.provider);if(!old||source.publishedDate>old.publishedDate||(source.publishedDate===old.publishedDate&&String(source.id)>String(old.id)))latest.set(source.provider,source);
 }
 return {sources:[...latest.values()].sort((a,b)=>a.provider.localeCompare(b.provider)),excludedSourcePollIds:excluded.sort()};
}

/** Offline source-conditioned simulation. No LLM calls, real respondents or demographic preference inference. */
export async function generatePartyEstimate({items=[],previous=null,now=Date.now,panel=loadPanel()}={}){
 const instant=typeof now==='function'?now():now,checkedAt=new Date(instant).toISOString();
 const ids=Array.isArray(panel?.profileIds)?[...panel.profileIds].sort():[];
 if(ids.length!==1000||new Set(ids).size!==1000||ids.some(id=>typeof id!=='string'||!/^JCS-AI-\d{4}$/.test(id))||typeof panel?.panelId!=='string')return fallback(previous,'configuration_needed','SYNTHETIC_PANEL_REQUIRED',checkedAt);
 const {sources,excludedSourcePollIds}=sourceRows(items,instant);
 if(!sources.length)return fallback(previous,'pending','INSUFFICIENT_RECENT_PARTY_SOURCES',checkedAt);
 const panelHash=hash({panelId:panel.panelId,profileIds:ids});
 const sourceFingerprint=hash({version:VERSION,panelHash,sources});
 if(previous?.state==='ready'&&previous.model===VERSION&&previous.sourceFingerprint===sourceFingerprint&&validRows(previous.results?.parties)&&Math.abs(sum(previous.results.parties)-100)<0.001)return {...previous,stale:false,refreshState:'unchanged',reason:null,checkedAt};
 const baseline=CATEGORIES.map(c=>({...c,value:sources.reduce((total,s)=>total+s.normalizedParties.find(p=>p.id===c.id).value,0)/sources.length}));
 const responses=ids.map(profileId=>{
  // 52-bit SHA-256 fraction yields reproducible independent category draws for these synthetic IDs.
  const draw=parseInt(hash([VERSION,sourceFingerprint,profileId]).slice(0,13),16)/0x10000000000000*100;
  let cumulative=0;const chosen=baseline.find(p=>(cumulative+=p.value)>draw)||baseline.at(-1);
  return {profileId,partyId:chosen.id};
 });
 const parties=CATEGORIES.map(c=>({...c,value:responses.filter(r=>r.partyId===c.id).length/10}));
 const responsesHash=hash(responses);
 const methodology='공식조사 기반 가상패널 시뮬레이션 · 실제 여론조사 아님. 최근 45일 이내 기관별 최신 정당 지지도에서 소수 정당을 기타로 합치고, 공표 반올림 합계를 100으로 정규화한 뒤 기관별 동일 비중으로 평균했습니다. 필수 범주가 누락된 기관은 제외하며 누락값을 0으로 추정하지 않습니다. 기존 AI 합성패널 ID 1,000개에 SHA-256 기반 고정 난수로 정당 범주를 배정한 규칙 기반 결과입니다. 인구통계·대통령 평가 응답은 사용하지 않았고, 1,000회 LLM 실행이나 독립 조사·통계적 추정을 의미하지 않습니다. API·실시간 모델 호출은 없습니다.';
 return {state:'ready',topic:'party-support',institution:'JCS AI',id:`jcs-ai-party-${sourceFingerprint.slice(0,20)}`,publishedDate:new Date(instant+9*3600000).toISOString().slice(0,10),generatedAt:checkedAt,checkedAt,stale:false,refreshState:'generated',label:'가상패널 시뮬레이션',results:{parties},model:VERSION,methodology,sourceFingerprint,sourcePollIds:sources.map(p=>p.id),syntheticPanelSize:1000,
  basis:{kind:'source-conditioned-synthetic-panel',version:VERSION,independentSurvey:false,liveModelCalls:0,weighting:'equal-provider-after-normalizing-published-totals',assignment:'sha256-first-52-bits-categorical',sourceCount:sources.length,latestSourceDate:sources.map(s=>s.publishedDate).sort().at(-1),excludedSourcePollIds,baseline,sources},
  audit:{panelId:panel.panelId,panelHash,sourceRunId:panel.sourceRunId||null,responseCount:responses.length,responsesHash,responses}
 };
}
