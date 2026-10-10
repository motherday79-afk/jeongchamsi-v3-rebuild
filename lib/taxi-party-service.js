import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {audioUrl} from './taxi-audio.js';

const hash=x=>createHash('sha256').update(String(x)).digest('hex');
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
const parse=raw=>{if(raw==null)return null;try{return JSON.parse(raw);}catch{fail('STORAGE_UNAVAILABLE',503);}};
const PREFIX='jcs:taxi:party:v1:';
export const PARTY_COMFORT='기사님, 이 이야기는 어떠셨어요? 지금 들으신 정책과 다른 생각들도 함께 놓고 살펴보셔도 좋아요. 마음에 가장 가까운 이야기를 골라 주실래요? 제 이야기를 고르셔도 좋고, 다른 이야기에 마음이 가셔도 괜찮아요. 어느 쪽도 마음에 들지 않으시면 그렇게 말씀해 주세요. 선택을 마치면 다음 이야기도 나누고 싶어요. 물론 여기서 내려주셔도 괜찮고요. 저는 기사님의 선택을 존중하니까요.';
export const PARTY_INTRO='안녕하세요, 기사님. 오늘은 한 사람을 대신하는 것이 아니라, 한 정당의 정책 이야기를 들려드리러 탔어요. 어느 정당인지는 내릴 때 말씀드릴게요. 가는 동안 다섯 가지 이야기를 나누고, 다른 정당의 생각도 함께 살펴보면 어떨까요? 이름보다는 내용에 마음이 가는 쪽을 골라 주세요. 괜찮으시면 제 이야기를 한번 들어주시겠습니까?';
export const PARTY_CLOSING='기사님, 오늘 준비한 이야기는 여기까지예요. 끝까지 함께해 주셔서 고마워요. 마지막 이야기도 다른 생각들과 함께 살펴보고, 마음에 가장 가까운 쪽을 골라 주실래요? 어느 쪽도 마음에 들지 않으시면 그렇게 말씀해 주셔도 좋아요. 선택을 마치면 여기서 내려도 될까요? 내리기 전에 제가 어느 정당의 이야기를 들려드렸는지 말씀드릴게요. 천천히 생각하셔도 괜찮아요. 저는 기사님의 선택을 존중하니까요.';
// State CAS and research increments are committed together. Durable first-answer
// markers have no guest-state TTL and are deliberately untouched by reset.
export const PARTY_RECORD_LUA=`
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
local data=nil
if ARGV[4]~='' then data=cjson.decode(ARGV[4]) end
if data then
 local first=redis.call('HSETNX',KEYS[3],data.question..':'..data.kind,'1')==1
 for field,value in pairs(data.counts) do
  redis.call('HINCRBY',KEYS[2],field,value)
  if first then redis.call('HINCRBY',KEYS[2],'first:'..field,value) end
 end
end
if tonumber(ARGV[3])>0 then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]) else redis.call('SET',KEYS[1],ARGV[2]) end
return 1`;
const ACTIONS=['start','begin','compare','choose','listen','finish','dropoff','pause','resume','heartbeat','reset'];
function identity(user,token){
 if(user?.id){if(user.status&&user.status!=='active')fail('ACCOUNT_INACTIVE',403);return {key:PREFIX+'account:'+hash(user.id),ttl:0};}
 if(token!=null&&token!==''&&(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)))fail('INVALID_SESSION');
 const sessionToken=token||randomBytes(32).toString('hex');return {key:PREFIX+'guest:'+hash(sessionToken),sessionToken,ttl:90*86400};
}
function validate(b){
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['action','requestId','expectedVersion','choice'].includes(k))||!ACTIONS.includes(b.action)||!Number.isSafeInteger(b.expectedVersion)||b.expectedVersion<0)fail('INVALID_INPUT');
 if(typeof b.requestId!=='string'||!/^[a-zA-Z0-9_-]{12,100}$/.test(b.requestId))fail('INVALID_REQUEST_ID');
 if(b.action==='choose'?(typeof b.choice!=='string'||b.choice.length>64):b.choice!==undefined)fail('INVALID_INPUT');
 return hash(JSON.stringify([b.action,b.requestId,b.expectedVersion,b.choice]));
}
const empty=()=>({version:0,ride:null,history:[],deck:[],visits:{},receipts:[]});
function shuffle(a,random){const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const voice=p=>p||'M1';
function speech(text,v){const url=audioUrl(text,voice(v));return {text,audioUrl:url,timingsUrl:url.replace('.mp3','.json')};}
function accrue(r,at){if(!r.paused&&r.phase!=='intro'){r.activeMs+=Math.min(20000,Math.max(0,at-r.lastAt));r.distanceMs+=Math.max(0,at-Math.max(r.lastAt,at-20000,r.motionAt));}r.lastAt=at;}
function qkey(q){return q.id+'@'+q.version;}
export function createTaxiPartyService({command,now=Date.now,random=Math.random,parties,questions}={}){
 if(typeof command!=='function')fail('STORAGE_UNAVAILABLE',503);
 async function catalog(){
  const content=parties&&questions?{PARTY_CATALOG:parties,PARTY_QUESTIONS:questions}:await import('./taxi-party-content.js');
  const ps=content.PARTY_CATALOG,qs=content.PARTY_QUESTIONS;
  if(!ps?.length||!qs?.length||new Set(qs.map(q=>q.domain)).size<5||qs.some(q=>!q.version||q.options?.length!==4||ps.some(p=>!q.options.some(o=>o.partyId===p.id))))fail('CONTENT_UNAVAILABLE',503);
  return {ps,qs};
 }
 function viewRide(r,{ps,qs}){
  if(!r)return null;
  // Snapshot policy content in each ride: later catalog updates cannot rewrite
  // a passenger's ongoing statements or move a submitted answer to another version.
  const b=r.beats[r.beatIndex];
  const common={id:r.id,passengerKind:'party',status:r.status,startedAt:r.startedAt,activeMs:r.activeMs,distanceMeters:Math.floor(r.distanceMs*.008),metersPerSecond:8,boardingRemainingMs:Math.max(0,r.motionAt-r.lastAt),heardCount:r.heardCount,totalBeats:r.beats.length,beatIndex:r.beatIndex,likedBeatIndexes:[],paused:r.paused};
  if(r.status==='active'){
   const narration=b.options[0];return {...common,phase:r.phase,questionTitle:r.phase==='intro'?'':b.title,optionsShown:r.phase!=='intro'&&b.optionsShown,selectedChoice:r.phase!=='intro'?b.selectedChoice:null,
    ...(r.phase!=='intro'&&b.optionsShown?{options:b.options.map((o,i)=>({id:o.id,number:i+1,text:o.text}))}:{}),
    beat:r.phase==='intro'?{index:0,type:'game_intro',...speech(PARTY_INTRO,r.voice)}:{index:r.beatIndex,type:'paraphrase',...speech(narration.speech,r.voice),comfort:{kind:r.beatIndex===r.beats.length-1?'closing':'comfort',...speech(r.beatIndex===r.beats.length-1?PARTY_CLOSING:PARTY_COMFORT,r.voice)}}};
  }
  return {...common,endedAt:r.endedAt,finishReason:r.finishReason,firstRide:r.visitNumber===1,visitNumber:r.visitNumber,passenger:{id:r.partyId,name:r.partyName,partyLabel:''},beats:r.beats.map((b,index)=>({index,domain:b.domain,title:b.title,text:b.options[0].speech,context:b.context||b.title,selection:b.selectedChoice==='none'?{id:'none',partyId:null,partyName:'마음에 드는 정책이 없다',text:'마음에 드는 정책이 없다'}:b.selectedChoice?(()=>{const o=b.options.find(o=>o.id===b.selectedChoice);return {id:o.id,partyId:o.partyId,partyName:o.partyName,text:o.text};})():null,options:b.options.map((o,i)=>({id:o.id,number:i+1,partyName:o.partyName,text:o.text,sources:o.sources})),sources:b.options[0].sources}))};
 }
 function view(s,id,c,at,result){return {ok:true,serverNow:at,version:s.version,...(id.sessionToken?{sessionToken:id.sessionToken}:{}),ride:viewRide(s.ride,c),history:s.history.map(r=>viewRide(r,c)),...(result?{result}:{})};}
 async function get(user=null,token){const id=identity(user,token),c=await catalog(),s=parse(await command(['GET',id.key]))||empty();return view(s,id,c,now());}
 async function mutate(user,body,token){
  if(!user?.id&&!token)fail('INVALID_SESSION');const signature=validate(body),id=identity(user,token),c=await catalog();
  for(let attempt=0;attempt<12;attempt++){
   const raw=await command(['GET',id.key]),s=parse(raw)||empty(),at=now(),receipt=s.receipts.find(r=>r.id===body.requestId);
   if(receipt){if(receipt.signature!==signature)fail('REQUEST_ID_REUSED',409);return view(s,id,c,at,{action:receipt.action,replayed:true});}
   if(s.version!==body.expectedVersion)fail('VERSION_CHANGED',409);let record=null;
   if(body.action==='reset'){s.ride=null;s.history=[];s.deck=[];s.visits={};}
   else if(body.action==='start'){
    if(s.ride?.status==='active')fail('RIDE_ACTIVE',409);
    s.deck=s.deck.filter(pid=>c.ps.some(p=>p.id===pid));if(!s.deck.length)s.deck=shuffle(c.ps.map(p=>p.id),random);
    const partyId=s.deck.pop(),party=c.ps.find(p=>p.id===partyId),domains=shuffle([...new Set(c.qs.map(q=>q.domain))],random).slice(0,5);
    const beats=domains.map(domain=>{const choices=c.qs.filter(q=>q.domain===domain),q=choices[Math.floor(random()*choices.length)],narrator=q.options.find(o=>o.partyId===partyId),options=[narrator,...shuffle(q.options.filter(o=>o.partyId!==partyId),random)];return {id:q.id,version:q.version,domain:q.domain,title:q.title,context:q.context,options:options.map(o=>({...structuredClone(o),id:randomUUID(),partyName:c.ps.find(p=>p.id===o.partyId).name})),optionsShown:false,selectedChoice:null};});
    // Same voice for every party, so the voice cannot identify an affiliation.
    s.ride={id:randomUUID(),partyId,partyName:party.name,voice:'M1',status:'active',phase:'intro',startedAt:at,lastAt:at,motionAt:at+1000,activeMs:0,distanceMs:0,heardCount:0,beatIndex:0,paused:false,beats};
   }else{
    const r=s.ride;if(r?.status!=='active')fail('NO_ACTIVE_RIDE',409);const b=r.beats[r.beatIndex],action=body.action;
    if(r.paused&&['begin','compare','choose','listen','finish'].includes(action))fail('RIDE_PAUSED',409);
    if(r.phase==='intro'&&['compare','choose','listen','finish'].includes(action))fail('INTRO_REQUIRED',409);
    if(action==='begin'&&r.phase!=='intro')fail('STORY_STARTED',409);
    if(['listen','finish'].includes(action)&&b.selectedChoice===null)fail('CHOICE_REQUIRED',409);
    if(action==='finish'&&r.beatIndex!==r.beats.length-1)fail('NOT_LAST_BEAT',409);
    if(action==='choose'){
     if(!b.optionsShown)fail('OPTIONS_REQUIRED',409);if(b.selectedChoice!==null)fail('ALREADY_SELECTED',409);
     const selected=b.options.find(o=>o.id===body.choice);if(body.choice!=='none'&&!selected)fail('CHOICE_INVALID');
     b.selectedChoice=body.choice;const prefix=qkey(b)+':',counts={[prefix+'responses']:1};counts[prefix+(selected?'selected:'+selected.partyId:'none')]=1;record={kind:'answer',question:qkey(b),counts};
    }
    if(action==='compare'&&!b.optionsShown){b.optionsShown=true;record={kind:'shown',question:qkey(b),counts:Object.fromEntries(b.options.map(o=>[qkey(b)+':shown:'+o.partyId,1]))};}
    if(action==='resume')r.lastAt=at;else accrue(r,at);
    if(action==='pause')r.paused=true;if(action==='resume')r.paused=false;
    if(action==='begin'){r.phase='story';r.heardCount=1;r.motionAt=Math.max(r.motionAt,at);}
    if(action==='listen'&&r.beatIndex<r.beats.length-1){r.beatIndex++;r.heardCount++;}
    else if(['listen','finish','dropoff'].includes(action)){s.visits[r.partyId]=(s.visits[r.partyId]||0)+1;Object.assign(r,{status:'completed',endedAt:at,paused:true,finishReason:action==='dropoff'?'dropoff':'completed',visitNumber:s.visits[r.partyId]});s.history.unshift(structuredClone(r));s.history=s.history.slice(0,20);}
   }
   s.version++;s.receipts.push({id:body.requestId,signature,action:body.action});s.receipts=s.receipts.slice(-128);
   const saved=await command(['EVAL',PARTY_RECORD_LUA,'3',id.key,PREFIX+'stats',PREFIX+'first:'+hash(id.key),raw??'',JSON.stringify(s),String(id.ttl),record?JSON.stringify(record):'']);
   if(Number(saved)===1)return view(s,id,c,at,{action:body.action,replayed:false});
  }fail('VERSION_CHANGED',409);
 }
 async function stats(){
  const {ps,qs}=await catalog(),raw=await command(['HGETALL',PREFIX+'stats']),h=Array.isArray(raw)?Object.fromEntries(Array.from({length:raw.length/2},(_,i)=>[raw[i*2],raw[i*2+1]])):raw||{},n=f=>Math.max(0,Number(h[f])||0);
  const questions=qs.map(q=>{const key=qkey(q)+':';return {id:q.id,version:q.version,domain:q.domain,title:q.title,responses:n(key+'responses'),firstResponses:n('first:'+key+'responses'),none:n(key+'none'),firstNone:n('first:'+key+'none'),parties:ps.map(p=>({...p,selected:n(key+'selected:'+p.id),firstSelected:n('first:'+key+'selected:'+p.id),shown:n(key+'shown:'+p.id),firstShown:n('first:'+key+'shown:'+p.id)}))};});
  const totals=Object.fromEntries(['responses','firstResponses','none','firstNone'].map(f=>[f,questions.reduce((sum,q)=>sum+q[f],0)]));
  return {ok:true,version:[...new Set(qs.map(q=>q.version))].join(','),...totals,parties:ps.map(p=>({...p,...Object.fromEntries(['selected','firstSelected','shown','firstShown'].map(f=>[f,questions.reduce((sum,q)=>sum+q.parties.find(x=>x.id===p.id)[f],0)]))})),questions};
 }
 return {get,mutate,stats};
}
