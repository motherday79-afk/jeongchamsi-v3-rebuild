import {mutateParticipation} from './participation-admin.js';
import {INTELLIGENCE_KEYS as K} from './intelligence-keys.js';
import {personAnalysisAccess,paidResultWithAccess} from './person-analysis-access.js';
export const REFRESH_POLICY_KEY='jcs:person-refresh:policy';
const defaultPolicy={enabled:false,fee:0,cooldownMinutes:10};
const walletKey=user=>'jcs:points:v1:wallet:'+user.id;
const login=user=>{if(!user?.id||user.status==='suspended')throw Error('LOGIN_REQUIRED');};
const token=id=>{if(!/^[a-zA-Z0-9-]{12,80}$/.test(String(id||'')))throw Error('INVALID_REQUEST_ID');return id;};
const paid=(wallet,id)=>wallet.ledger?.find(x=>x.type==='person-refresh'&&x.requestId===id);
export function createRefreshBilling({command,now=Date.now}){
 const read=async key=>JSON.parse(await command(['GET',key])||'{}');
 async function policy(){return {...defaultPolicy,...await read(REFRESH_POLICY_KEY)};}
 async function save(input={}){
  const {enabled,fee,cooldownMinutes}=input;
  if(typeof enabled!=='boolean'||!Number.isSafeInteger(fee)||fee<0||fee>1000000||(enabled&&fee===0)||!Number.isInteger(cooldownMinutes)||cooldownMinutes<1||cooldownMinutes>1440)throw Error('REFRESH_POLICY_INVALID');
  const value={enabled,fee,cooldownMinutes,updatedAt:now(),updatedBy:String(input.editorId||'admin')};await command(['SET',REFRESH_POLICY_KEY,JSON.stringify(value)]);return {refreshPolicy:value};
 }
 async function quote(user,personId){
  login(user);const [settings,wallet,record]=await Promise.all([policy(),read(walletKey(user)),read(K.personRefresh(personId))]);
  const last=record.lastPublishedAt||record.publishedAt||0;
  return {ok:true,...settings,personId,balance:Number(wallet.balance||0),lastRefreshedAt:last||null,nextAvailableAt:last?last+settings.cooldownMinutes*60000:null,analysisAccess:personAnalysisAccess(wallet,personId,now())};
 }
 async function status(user,requestId){
  login(user);token(requestId);const wallet=await read(walletKey(user)),done=paid(wallet,requestId);
  if(done)return paidResultWithAccess(done.result,wallet,now());
  const request=wallet.refreshRequests?.[requestId];return request?{ok:true,requestId,personId:request.personId,status:request.status==='RUNNING'&&request.expiresAt<now()?'EXPIRED':request.status,error:request.error||null}:{ok:false,error:'REFRESH_REQUEST_NOT_FOUND'};
 }
 async function begin(user,input){
  login(user);const requestId=token(input.requestId),personId=input.personId;
  return mutateParticipation(command,[walletKey(user),REFRESH_POLICY_KEY,K.personRefresh(personId)],([wallet,stored,person])=>{
   const done=paid(wallet,requestId);if(done){if(done.personId!==personId)throw Error('INVALID_REQUEST_ID');return {existing:paidResultWithAccess(done.result,wallet,now())};}
   wallet.refreshRequests||={};const existing=wallet.refreshRequests[requestId];
   if(existing?.personId&&existing.personId!==personId)throw Error('INVALID_REQUEST_ID');
   if(existing?.status==='RUNNING'&&existing.expiresAt>now())return {existing:{ok:true,status:'RUNNING',personId,requestId}};
   const settings={...defaultPolicy,...stored};if(!settings.enabled)throw Error('REFRESH_DISABLED');
   if(input.quotedFee!==settings.fee)throw Error('REFRESH_PRICE_CHANGED');
   if(Number(wallet.balance||0)<settings.fee)throw Error('INSUFFICIENT_POINTS');
   if(Object.values(wallet.refreshRequests).some(x=>x.status==='RUNNING'&&x.expiresAt>now()))throw Error('PERSON_REFRESH_BUSY');
   const last=person.lastPublishedAt||person.publishedAt||0;if(last&&last+settings.cooldownMinutes*60000>now())throw Error('REFRESH_RECENT');
   if(person.status==='COLLECTING'&&person.expiresAt>now())throw Error('PERSON_REFRESH_BUSY');
   for(const [id,row] of Object.entries(wallet.refreshRequests))if(row.status!=='RUNNING'||row.expiresAt<=now())delete wallet.refreshRequests[id];
   wallet.refreshRequests[requestId]={personId,fee:settings.fee,status:'RUNNING',expiresAt:now()+120000};
   return {billing:{userId:user.id,requestId,fee:settings.fee}};
  });
 }
 async function fail(user,requestId,error){
  return mutateParticipation(command,[walletKey(user)],([wallet])=>{
   const done=paid(wallet,requestId);if(done)return paidResultWithAccess(done.result,wallet,now());
   const row=wallet.refreshRequests?.[requestId];if(row){row.status='FAILED';row.error=String(error?.message||error).slice(0,100);}
   return null;
  });
 }
 return {policy,save,quote,status,begin,fail};
}
