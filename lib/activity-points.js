import {createHash} from 'node:crypto';

// Deliberately independent of community/point services: both include these documents in their own CAS.
export const ACTIVITY_KEYS={policy:'jcs:points:v1:activity:policy',audit:'jcs:points:v1:activity:audit',record:id=>'jcs:points:v1:activity:member:'+id,wallet:id=>'jcs:points:v1:wallet:'+id};
export const ACTIVITY_DEFAULTS=Object.freeze({enabled:true,postPoints:100,commentPoints:50,dailyLimit:2000,postMinLength:50,commentMinLength:15,cooldownSeconds:30});
export const activityKeys=id=>[ACTIVITY_KEYS.policy,ACTIVITY_KEYS.record(id),ACTIVITY_KEYS.wallet(id),ACTIVITY_KEYS.audit];
const error=(code,status=400,extra={})=>{throw Object.assign(new Error(code),{status,...extra});};
const amount=value=>Math.max(0,Number(value)||0);
export const activityDay=at=>new Date(Number(at)+9*3600000).toISOString().slice(0,10);
export const activityPolicy=stored=>({...ACTIVITY_DEFAULTS,...stored.policy});
export function validateActivityPolicy(input){
 if(!input||typeof input!=='object'||Array.isArray(input))error('INVALID_ACTIVITY_POLICY');
 const out={};for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(ACTIVITY_DEFAULTS,key))error('INVALID_ACTIVITY_POLICY');
  if(key==='enabled'){if(typeof value!=='boolean')error('INVALID_ACTIVITY_POLICY');}
  else {const max=key==='cooldownSeconds'?3600:key.endsWith('MinLength')?10000:1000000;if(!Number.isSafeInteger(value)||value<0||value>max||(key.endsWith('MinLength')&&value<1))error('INVALID_ACTIVITY_POLICY');}
  out[key]=value;
 }return out;
}
export function activityStatus(policyDoc,record,wallet,at){const policy=activityPolicy(policyDoc),day=activityDay(at),earnedToday=amount(record.days?.[day]);return {policy,day,earnedToday,remainingToday:Math.max(0,policy.dailyLimit-earnedToday),debt:amount(wallet.activityDebt),credit:amount(wallet.activityCredit),restrictedUntil:Number(record.restrictedUntil)||0,restrictionReason:record.restrictionReason||''};}
function normalized(value){
 const decoded=String(value||'').normalize('NFKC').replace(/&#(x[0-9a-f]+|[0-9]+);?/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):'';}).replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi,s=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[s.toLowerCase()]));
 return decoded.normalize('NFKC').replace(/<[^>]*>/g,' ').replace(/(?:https?:\/\/|www\.)\S+/gi,' ').replace(/&[a-z][a-z0-9]+;/gi,' ').replace(/[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]/g,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
}
const hash=value=>createHash('sha256').update(value).digest('hex');
function repetitive(value){
 const chars=[...value];if(!chars.length)return false;
 const counts=new Map();for(const c of chars)counts.set(c,(counts.get(c)||0)+1);
 if(Math.max(...counts.values())/chars.length>0.6)return true;
 for(let width=1;width<=Math.min(24,Math.floor(chars.length/3));width++){
  let repeated=0;for(let i=width;i<chars.length;i++)if(chars[i]===chars[i-width])repeated++;
  if(repeated/(chars.length-width)>0.85)return true;
 }return false;
}
function token(input){if(!input)return '';if(typeof input!=='string'||!/^[a-zA-Z0-9_-]{12,100}$/.test(input))error('INVALID_REQUEST_ID');return input;}
export function activityRetry(record,{requestId,scope,body}){
 const key=token(requestId);if(!key)return null;const old=record.requests?.[key];if(!old)return null;
 if(old.signature!==hash(scope+'\n'+String(body||'')))error('INVALID_REQUEST_ID');return old;
}
export function awardActivity(docs,{user,kind,body,scope,contentId,requestId,requestBody=body,eligible=true,at}){
 const [policyDoc,record,wallet,audit]=docs,policy=activityPolicy(policyDoc),day=activityDay(at),eventId=scope+':'+contentId;
 if(!user?.id||user.status==='suspended')error('LOGIN_REQUIRED',401);
 if(user.role!=='admin'&&Number.isFinite(record.lastCreatedAt)&&at-record.lastCreatedAt<policy.cooldownSeconds*1000)error('ACTIVITY_RATE_LIMIT',429,{retryAfterSeconds:Math.ceil((policy.cooldownSeconds*1000-(at-record.lastCreatedAt))/1000)});
 const content=normalized(body),digest=hash(content);record.days||={};record.events||={};record.hashes||={};record.requests||={};
 const target=scope.startsWith('group:')?{groupId:scope.split(':')[1]}:{domain:scope.split(':')[0]};
 let reason=!eligible||user.role==='admin'?'ineligible':!policy.enabled||(kind==='post'?policy.postPoints:policy.commentPoints)===0?'disabled':Number(record.restrictedUntil)>at?'restricted':[...content].length<(kind==='post'?policy.postMinLength:policy.commentMinLength)?'minimum-length':repetitive(content)?'repetitive':Object.hasOwn(record.hashes,digest)?'duplicate':amount(record.days[day])>=policy.dailyLimit?'daily-limit':'awarded';
 const earned=reason==='awarded'?Math.min(kind==='post'?policy.postPoints:policy.commentPoints,Math.max(0,policy.dailyLimit-amount(record.days[day]))):0;
 const offset=Math.min(earned,amount(wallet.activityDebt)),credited=earned-offset;
 record.days[day]=amount(record.days[day])+earned;
 if(user.role!=='admin')record.lastCreatedAt=at;
 record.hashes[digest]=eventId;
 const receipt={status:earned>0?'credited':'excluded',reason,earned,credited,offset,earnedToday:record.days[day],dailyLimit:policy.dailyLimit,remainingToday:Math.max(0,policy.dailyLimit-record.days[day])};
 record.events[eventId]={eventId,contentId,scope,...target,kind,at,day,earned,credited,offset,reason,revoked:false,receipt};
 const key=token(requestId);if(key)record.requests[key]={signature:hash(scope+'\n'+String(requestBody||'')),contentId,eventId};
 if(earned){wallet.balance=amount(wallet.balance)+credited;wallet.activityCredit=amount(wallet.activityCredit)+credited;wallet.activityDebt=amount(wallet.activityDebt)-offset;wallet.ledger||=[];wallet.ledger.push({id:eventId,eventId,type:'activity',points:credited,earned,credited,offset,at,kind,scope,contentId});}
 if(['repetitive','duplicate','restricted'].includes(reason)){audit.suspects||=[];audit.suspects.unshift({userId:user.id,nickname:String(user.nickname||user.id).slice(0,60),eventId,contentId,kind,scope,...target,reason,at,earned});audit.suspects=audit.suspects.slice(0,200);}
 return receipt;
}
export function spendActivityCredit(wallet,points){wallet.activityCredit=Math.max(0,amount(wallet.activityCredit)-Math.min(points,amount(wallet.activityCredit)));}
export function revokeActivity(record,wallet,eventId,{at,reason,by,requestId=''}){
 const event=record.events?.[eventId];if(!event)return {revoked:false,recovered:0,debtAdded:0};if(event.revoked)return {revoked:false,recovered:0,debtAdded:0,event};
 const recovered=Math.min(amount(event.earned),amount(wallet.activityCredit),amount(wallet.balance)),debtAdded=amount(event.earned)-recovered;
 wallet.balance=amount(wallet.balance)-recovered;wallet.activityCredit=amount(wallet.activityCredit)-recovered;wallet.activityDebt=amount(wallet.activityDebt)+debtAdded;
 Object.assign(event,{revoked:true,revokedAt:at,revokeReason:reason,revokedBy:by});
 if(event.earned){wallet.ledger||=[];wallet.ledger.push({id:'revoke:'+eventId,eventId,type:'activity-revoke',points:-recovered,recovered,debtAdded,earned:event.earned,at,reason,by,requestId});}
 return {revoked:true,recovered,debtAdded,event};
}
export function revokeOwnActivity(docs,{user,scope,contentId,at}){return revokeActivity(docs[1],docs[2],scope+':'+contentId,{at,reason:'본인 작성물 삭제',by:user.id});}

// The caller enumerates only actor-owned content removed by its transaction.
export function revokeOwnActivities(docs,{user,targets,at}){
 const total={revoked:false,recovered:0,debtAdded:0,events:[]};
 for(const target of targets){const result=revokeOwnActivity(docs,{user,...target,at});total.revoked||=result.revoked;total.recovered+=result.recovered;total.debtAdded+=result.debtAdded;if(result.revoked&&result.event)total.events.push(result.event);}
 return total;
}
