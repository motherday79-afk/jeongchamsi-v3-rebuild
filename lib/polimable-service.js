import {randomInt,randomUUID} from 'node:crypto';
import {createGameState,rollTurn,resolveChoice,useCard,cashOut,getRecordableScore,normalizeInitials,STRATEGY_CARDS} from './polimable-engine.js';

const SESSION_TTL=60*60*2;
const clean=value=>String(value??'').trim();
const parseJson=(value,fallback=null)=>{try{return value?JSON.parse(String(value)):fallback;}catch{return fallback;}};
const rngDefault=()=>({int:(min,max)=>randomInt(min,max+1),float:()=>randomInt(0,1_000_000)/1_000_000});
const sessionKey=id=>`polimable:session:${id}`;
const profileKey=id=>`polimable:profile:${id}`;
const kstDate=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(now);
function weekKey(now){const seoul=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Seoul'})),d=new Date(Date.UTC(seoul.getFullYear(),seoul.getMonth(),seoul.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1)),week=Math.ceil((((d-yearStart)/86400000)+1)/7);return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;}
const rankKeys=now=>({today:`polimable:rank:today:${kstDate(now)}`,week:`polimable:rank:week:${weekKey(now)}`,all:'polimable:rank:all'});
const reqId=value=>clean(value).slice(0,96);
function alreadyApplied(state,requestId){return !!requestId&&(Array.isArray(state.requestLedger)?state.requestLedger:[]).some(item=>item.id===requestId);}
function markApplied(state,requestId,action){if(!requestId)return state;state.requestLedger=[...(Array.isArray(state.requestLedger)?state.requestLedger:[]),{id:requestId,action,at:state.updatedAt}].slice(-12);return state;}

export function createPoliMarbleService({command,now=()=>new Date(),rngFactory=rngDefault,uuid=()=>randomUUID()}={}){
 if(typeof command!=='function')throw new Error('POLIMARBLE_STORAGE_REQUIRED');
 const save=state=>command(['SET',sessionKey(state.sessionId),JSON.stringify(state),'EX',String(SESSION_TTL)]).then(()=>state);
 const load=async id=>parseJson(await command(['GET',sessionKey(clean(id))]),null);
 async function owned(user,id){if(!user?.id)throw new Error('LOGIN_REQUIRED');const state=await load(id);if(!state)throw new Error('GAME_SESSION_NOT_FOUND');if(String(state.userId)!==String(user.id))throw new Error('GAME_SESSION_FORBIDDEN');return state;}
 async function upsertBest(key,userId,score){const current=Number(await command(['ZSCORE',key,String(userId)]));if(!Number.isFinite(current)||score>current)await command(['ZADD',key,String(score),String(userId)]);}
 async function record(user,initials,score){const stamp=now(),keys=rankKeys(stamp),profile={nickname:clean(user.nickname||user.id).slice(0,40),initials:normalizeInitials(initials)};await command(['SET',profileKey(user.id),JSON.stringify(profile)]);await Promise.all([upsertBest(keys.today,user.id,score),upsertBest(keys.week,user.id,score),upsertBest(keys.all,user.id,score)]);await Promise.all([command(['EXPIRE',keys.today,String(60*60*48)]),command(['EXPIRE',keys.week,String(60*60*24*14)])]);}
 async function leaderboard(scope='today',me=''){if(!['today','week','all'].includes(scope))throw new Error('INVALID_SCOPE');const key=rankKeys(now())[scope],rows=await command(['ZREVRANGE',key,'0','9','WITHSCORES'])||[],entries=[];for(let i=0;i<rows.length;i+=2){const userId=String(rows[i]),score=Number(rows[i+1]),p=parseJson(await command(['GET',profileKey(userId)]),{});entries.push({rank:entries.length+1,userId,score,initials:p?.initials||'JCS',nickname:p?.nickname||'',isMe:!!me&&userId===String(me)});}let mine=null;if(me){const scoreRaw=await command(['ZSCORE',key,String(me)]),score=Number(scoreRaw);if(scoreRaw!=null&&Number.isFinite(score)){const higher=Number(await command(['ZCOUNT',key,`(${score}`,'+inf']))||0,p=parseJson(await command(['GET',profileKey(me)]),{});mine={rank:higher+1,userId:String(me),score,initials:p?.initials||'JCS',nickname:p?.nickname||'',isMe:true};}}return {scope,entries,me:mine};}
 async function mutate(user,body,action,fn){const state=await owned(user,body?.sessionId),requestId=reqId(body?.requestId);if(alreadyApplied(state,requestId))return state;const next=fn(state);markApplied(next,requestId,action);return save(next);}
 return {
  async start(user,body={}){if(!user?.id)throw new Error('LOGIN_REQUIRED');const state=createGameState({sessionId:uuid(),userId:user.id,nickname:user.nickname||user.id,initials:normalizeInitials(user.nickname||user.id),now:now()});markApplied(state,reqId(body.requestId),'start');await save(state);return {state};},
  async resume(user,sessionId){const state=await owned(user,sessionId);return {state};},
  async roll(user,body={}){const state=await mutate(user,body,'roll',current=>rollTurn(current,rngFactory(),now()));return {state};},
  async choice(user,body={}){if(!['safe','risk'].includes(body.option))throw new Error('INVALID_CHOICE');const state=await mutate(user,body,'choice',current=>resolveChoice(current,body.option,rngFactory(),now()));return {state};},
  async card(user,body={}){if(!STRATEGY_CARDS[body.cardId])throw new Error('INVALID_CARD');const state=await mutate(user,body,'card',current=>useCard(current,body.cardId,now()));return {state};},
  async cashout(user,body={}){let state=await owned(user,body.sessionId),requestId=reqId(body.requestId);if(!alreadyApplied(state,requestId)){state.initials=normalizeInitials(body.initials||state.initials);if(state.status==='playing')state=cashOut(state,now());markApplied(state,requestId,'cashout');await save(state);}const score=getRecordableScore(state);if(score>0)await record(user,state.initials,score);return {state,recordedScore:score};},
  leaderboard
 };
}

export function polimableErrorStatus(error){const code=String(error?.message||error||'POLIMARBLE_FAILED');if(code==='LOGIN_REQUIRED')return 401;if(code==='GAME_SESSION_FORBIDDEN')return 403;if(code==='GAME_SESSION_NOT_FOUND')return 404;if(['INVALID_SCOPE','INVALID_CARD','INVALID_CHOICE','CARD_NOT_OWNED','CHOICE_REQUIRED','NO_PENDING_CHOICE','GAME_NOT_ACTIVE'].includes(code))return 400;return 503;}
