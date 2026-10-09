import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {beatAudio,greetingAudio,GREETING_LINES} from './taxi-audio.js';
import {TAXI_RECORD_LUA,taxiRideCounts,taxiStatsKey,taxiPersonalKey,readTaxiStats} from './taxi-statistics.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
const parse=raw=>{if(raw===null||raw===undefined)return null;try{return JSON.parse(raw);}catch{fail('STORAGE_UNAVAILABLE',503);}};
export const TAXI_CAS_LUA=`
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
if tonumber(ARGV[3])>0 then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3])
else redis.call('SET',KEYS[1],ARGV[2]) end
return 1`;
export const TAXI_KEYS={account:id=>'jcs:taxi:v1:account:'+hash(String(id)),guest:token=>'jcs:taxi:v1:guest:'+hash(token)};
const ACTIONS=['start','begin','listen','like','dropoff','finish','pause','resume','heartbeat','reset'];
function identity(user,token){
  if(user?.id){if(user.status&&user.status!=='active')fail('ACCOUNT_INACTIVE',403);return {key:TAXI_KEYS.account(user.id),ttl:0};}
  if(token!==undefined&&token!==null&&token!==''&&(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)))fail('INVALID_SESSION');
  const sessionToken=token||randomBytes(32).toString('hex');return {key:TAXI_KEYS.guest(sessionToken),sessionToken,ttl:90*86400};
}
function validate(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','requestId','expectedVersion'].includes(k))||!ACTIONS.includes(body.action)||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<0)fail('INVALID_INPUT');
  if(typeof body.requestId!=='string'||!/^[a-zA-Z0-9_-]{12,100}$/.test(body.requestId))fail('INVALID_REQUEST_ID');
  return hash(JSON.stringify([body.action,body.expectedVersion,body.requestId]));
}
const empty=()=>({version:0,deck:[],visits:{},ride:null,history:[],receipts:[]});
function shuffle(values,random){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function event(ride,action,at){ride.events.push({at,action,beatIndex:ride.beatIndex});ride.events=ride.events.slice(-100);}
function accrue(ride,at){if(ride.distanceMs===undefined)ride.distanceMs=ride.activeMs;if(!ride.paused&&ride.phase!=='intro'){ride.activeMs+=Math.min(20000,Math.max(0,at-ride.lastAt));ride.distanceMs+=Math.max(0,at-Math.max(ride.lastAt,at-20000,ride.motionAt||0));}ride.lastAt=at;}
function viewRide(ride,catalog){
  if(!ride)return null;const p=catalog.find(p=>p.id===ride.passengerId);if(!p)fail('CONTENT_UNAVAILABLE',503);
  const common={id:ride.id,status:ride.status,startedAt:ride.startedAt,activeMs:ride.activeMs,distanceMeters:Math.floor((ride.distanceMs??ride.activeMs)*.008),metersPerSecond:8,boardingRemainingMs:Math.max(0,(ride.motionAt||0)-ride.lastAt),heardCount:ride.heardCount,totalBeats:p.beats.length,beatIndex:ride.beatIndex,likedBeatIndexes:ride.likedBeatIndexes,paused:ride.paused};
  if(ride.status==='active'){const beat=p.beats[ride.beatIndex];return {...common,phase:ride.phase||'story',beat:ride.phase==='intro'?greetingAudio(p,ride.greetingIndex):{index:ride.beatIndex,text:beat.text,type:beat.type,...beatAudio(p,ride.beatIndex)}};}
  return {...common,endedAt:ride.endedAt,finishReason:ride.finishReason,firstRide:ride.firstRide,visitNumber:ride.visitNumber,passenger:{id:p.id,personId:p.personId,name:p.name,partyLabel:p.partyLabel,photoUrl:p.photoUrl||null},beats:p.beats.map((b,index)=>({index,text:b.text,type:b.type,attribution:b.attribution||'발언',context:b.context,sources:b.sources})),events:ride.events};
}
function view(state,id,catalog,at,result){return {ok:true,serverNow:at,version:state.version,...(id.sessionToken?{sessionToken:id.sessionToken}:{}),ride:viewRide(state.ride,catalog),history:state.history.map(r=>viewRide(r,catalog)),...(result?{result}:{})};}
export function createTaxiService({command,now=Date.now,random=Math.random,passengers}={}){
  if(typeof command!=='function')fail('STORAGE_UNAVAILABLE',503);
  async function catalog(){const rows=passengers||(await import('./taxi-passengers.js')).TAXI_PASSENGERS;if(!Array.isArray(rows)||!rows.length||rows.some(p=>!p.id||!p.beats?.length))fail('CONTENT_UNAVAILABLE',503);return rows;}
  async function get(user=null,sessionToken){const id=identity(user,sessionToken),rows=await catalog(),state=parse(await command(['GET',id.key]))||empty();return view(state,id,rows,now());}
  async function mutate(user,body,sessionToken){
    if(!user?.id&&!sessionToken)fail('INVALID_SESSION');
    const signature=validate(body),id=identity(user,sessionToken),rows=await catalog();
    for(let attempt=0;attempt<12;attempt++){
      const raw=await command(['GET',id.key]),state=parse(raw)||empty(),at=now();
      const receipt=state.receipts.find(r=>r.id===body.requestId);
      if(receipt){if(receipt.signature!==signature)fail('REQUEST_ID_REUSED',409);return view(state,id,rows,at,{action:receipt.action,replayed:true});}
      if(state.version!==body.expectedVersion)fail('VERSION_CHANGED',409);
      let completedRide=null;
      if(body.action==='reset'){
        state.ride=null;state.history=[];state.visits={};state.deck=[];
      }else if(body.action==='start'){
        if(state.ride?.status==='active')fail('RIDE_ACTIVE',409);
        state.deck=state.deck.filter(pid=>rows.some(p=>p.id===pid));
        if(!state.deck.length)state.deck=shuffle(rows.map(p=>p.id),random);
        const passengerId=state.deck.pop();
        state.ride={id:randomUUID(),passengerId,status:'active',phase:'intro',greetingIndex:Math.floor(random()*GREETING_LINES.length),startedAt:at,lastAt:at,motionAt:at+1000,distanceMs:0,activeMs:0,heardCount:0,beatIndex:0,likedBeatIndexes:[],paused:false,events:[]};event(state.ride,'start',at);
      }else{
        const ride=state.ride;if(ride?.status!=='active')fail('NO_ACTIVE_RIDE',409);
        const passenger=rows.find(p=>p.id===ride.passengerId);if(!passenger)fail('CONTENT_UNAVAILABLE',503);
        if(ride.paused&&['begin','listen','like','finish'].includes(body.action))fail('RIDE_PAUSED',409);
        if(ride.phase==='intro'&&['listen','like','finish'].includes(body.action))fail('INTRO_REQUIRED',409);
        if(body.action==='begin'&&ride.phase!=='intro')fail('STORY_STARTED',409);
        if(body.action==='like'&&ride.likedBeatIndexes.includes(ride.beatIndex))fail('ALREADY_LIKED',409);
        if(body.action==='finish'&&ride.beatIndex!==passenger.beats.length-1)fail('NOT_LAST_BEAT',409);
        if(body.action==='resume')ride.lastAt=at;
        else accrue(ride,at);
        if(body.action==='pause')ride.paused=true;
        if(body.action==='resume')ride.paused=false;
        if(body.action==='begin'){ride.phase='story';ride.motionAt=Math.max(ride.motionAt||0,at);ride.heardCount=1;}
        if(body.action==='like')ride.likedBeatIndexes.push(ride.beatIndex);
        if(body.action!=='heartbeat')event(ride,body.action,at);
        if(body.action==='listen'&&ride.beatIndex<passenger.beats.length-1){ride.beatIndex++;ride.heardCount++;}
        else if(['listen','finish','dropoff'].includes(body.action)){
          const visitNumber=(state.visits[ride.passengerId]||0)+1;state.visits[ride.passengerId]=visitNumber;
          Object.assign(ride,{status:'completed',endedAt:at,finishReason:body.action==='dropoff'?'dropoff':'completed',firstRide:visitNumber===1,visitNumber,paused:true});
          state.history.unshift(structuredClone(ride));state.history=state.history.slice(0,100);
          completedRide=taxiRideCounts(ride,passenger.personId);
        }
      }
      state.version++;state.receipts.push({id:body.requestId,signature,action:body.action});state.receipts=state.receipts.slice(-128);
      const saved=completedRide?await command(['EVAL',TAXI_RECORD_LUA,'3',id.key,taxiStatsKey(completedRide.personId),taxiPersonalKey(id.key),raw??'',JSON.stringify(state),String(id.ttl),JSON.stringify(completedRide)]):await command(['EVAL',TAXI_CAS_LUA,'1',id.key,raw??'',JSON.stringify(state),String(id.ttl)]);
      if(Number(saved)===1)return view(state,id,rows,at,{action:body.action,replayed:false});
    }
    fail('VERSION_CHANGED',409);
  }
  async function stats(personId,user=null,sessionToken){const rows=await catalog();return readTaxiStats(command,rows.find(p=>p.personId===personId),user?.id||sessionToken?identity(user,sessionToken):null);}
  return {get,mutate,stats};
}
