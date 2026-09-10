import { randomUUID } from 'node:crypto';
import { TARGET_KEYS } from './migration-service.js';
import { GENERATION_AGES } from '../src/core/participation-model.js';
import { COMMUNITY_CAS_LUA } from './community-service.js';
const clean=(value,max=200)=>String(value??'').trim().slice(0,max);
const clone=value=>JSON.parse(JSON.stringify(value||{}));
const stampId=(prefix,now)=>`${prefix}-${new Date(now).getTime().toString(36)}`;

function pollPost(data,input,user,now){
  const labels=String(input.options||'').split(/\r?\n|,/).map(value=>clean(value,80)).filter(Boolean).slice(0,10);
  if(!clean(input.title||input.question)||labels.length<2)throw new Error('POLL_TITLE_AND_OPTIONS_REQUIRED');
  return {id:stampId('poll',now),question:clean(input.title||input.question),title:clean(input.title||input.question),description:clean(input.body||input.description,2000),options:labels.map((label,index)=>({id:`option-${index+1}`,label,votes:0})),ownerId:user.id,author:clean(user.nickname||user.id,40),published:true,featured:input.applyToMain===true||String(input.applyToMain)==='true',createdAt:now,updatedAt:now};
}

function evaluationPost(data,input,user,now){
  const subjectId=clean(input.subjectId,80),slot=input.slot==='local'?'local':'assembly',title=clean(input.title,200);
  if(!subjectId||!title)throw new Error('EVALUATION_TITLE_AND_POLITICIAN_REQUIRED');
  return {id:stampId('evaluation',now),title,body:clean(input.body,5000),subjectId,slot,ownerId:user.id,author:clean(user.nickname||user.id,40),published:true,featured:false,createdAt:now,updatedAt:now};
}

function generationPost(data,input,user,now){
  const title=clean(input.title,200);
  const supplied=Array.isArray(input.candidateIds)?input.candidateIds:String(input.candidateIds||'').split(/\r?\n|,/);
  const candidateIds=[...new Set(supplied.map(value=>clean(value,80)).filter(Boolean))].slice(0,15);
  if(!title||candidateIds.length<2)throw new Error('GENERATION_TITLE_AND_CANDIDATES_REQUIRED');
  return {id:stampId('generation',now),title,body:clean(input.body,5000),candidateIds,results:{},ownerId:user.id,author:clean(user.nickname||user.id,40),published:true,featured:false,createdAt:now,updatedAt:now};
}

export function featureParticipationPost(domain,source,itemId,now=new Date().toISOString()){
  const data=clone(source),items=Array.isArray(data.items)?data.items:[],item=items.find(row=>String(row.id)===String(itemId));
  if(!item)throw new Error('PARTICIPATION_POST_NOT_FOUND');
  for(const row of items)if(domain==='polls'||domain==='generation'||row.slot===item.slot)row.featured=row.id===item.id;
  item.updatedAt=now;
  if(domain==='nationalEvaluation'){
    const previous=data.slots?.[item.slot];
    if(previous?.evaluationId&&previous.subjectId!==item.subjectId){
      const votes=data.results?.[previous.evaluationId]||{};
      data.history=[{...previous,...votes,closedAt:now},...(Array.isArray(data.history)?data.history:[])];
    }
    const evaluationId=`evaluation-${item.id}`;
    data.slots={...(data.slots||{}),[item.slot]:{slot:item.slot,evaluationId,subjectId:item.subjectId,itemId:item.id,enabled:true,closedAt:''}};
    data.results={...(data.results||{}),[evaluationId]:data.results?.[evaluationId]||{positive:0,neutral:0,negative:0}};
  }
  if(domain==='generation'){
    data.candidates=[...item.candidateIds];
    data.results=item.results&&typeof item.results==='object'?item.results:{};
    data.activeItemId=item.id;
  }
  return {data,item};
}

export function createParticipationPost(domain,source,input,user,now=new Date().toISOString()){
  if(!['polls','generation','nationalEvaluation'].includes(domain))throw new Error('INVALID_PARTICIPATION_DOMAIN');
  const data=clone(source),item=domain==='polls'?pollPost(data,input,user,now):domain==='generation'?generationPost(data,input,user,now):evaluationPost(data,input,user,now);
  data.items=[item,...(Array.isArray(data.items)?data.items:[])].slice(0,500);
  if(item.featured||input.applyToMain===true||String(input.applyToMain)==='true')return featureParticipationPost(domain,data,item.id,now);
  return {data,item};
}

export function editParticipationPost(domain,source,itemId,input={},remove=false,now=new Date().toISOString()){
  if(!['polls','generation','nationalEvaluation'].includes(domain))throw new Error('INVALID_PARTICIPATION_DOMAIN');
  const data=clone(source),item=(data.items||[]).find(row=>String(row.id)===String(itemId));if(!item)throw new Error('PARTICIPATION_POST_NOT_FOUND');
  if(remove){data.items=data.items.filter(row=>row!==item);if(domain==='generation'&&data.activeItemId===item.id){data.candidates=[];data.results={};data.activeItemId='';}if(domain==='nationalEvaluation')for(const [key,slot] of Object.entries(data.slots||{}))if(slot.itemId===item.id)delete data.slots[key];return {data,item:null};}
  const title=clean(input.title);if(!title)throw new Error('TITLE_REQUIRED');item.title=title;item.updatedAt=now;
  if(domain==='polls'){item.question=title;item.description=clean(input.body,2000);if(Array.isArray(input.optionLabels)&&input.optionLabels.length===item.options.length)item.options=item.options.map((row,index)=>({...row,label:clean(input.optionLabels[index],80)||row.label}));}
  else item.body=clean(input.body,5000);
  return {data,item};
}

export function setParticipationDemo(domain,source,itemId,input={}){
 if(!['polls','generation','nationalEvaluation'].includes(domain))throw new Error('INVALID_PARTICIPATION_DOMAIN');
 const data=clone(source),item=(data.items||[]).find(x=>String(x.id)===String(itemId)&&x.published!==false);
 if(!item)throw new Error('PARTICIPATION_POST_NOT_FOUND');
 if(input.enabled!==true){item.demo={...(item.demo||{}),enabled:false};return {data,item};}
 const count=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>100000000)throw new Error('INVALID_DEMO_COUNT');return n;};
 const keys=domain==='polls'?(item.options||[]).map(x=>x.id):domain==='generation'?item.candidateIds||[]:['positive','neutral','negative'];
 const read=row=>Object.fromEntries(keys.map(key=>[key,count(row?.[key]??0)]));
 const counts=domain==='generation'?Object.fromEntries(GENERATION_AGES.map(age=>[age,read(input.counts?.[age])])):read(input.counts);
 item.demo={enabled:true,counts};return {data,item};
}

// Both voting and admin changes compare-and-swap the same domain to avoid lost votes.
export async function mutateParticipation(command,keys,change){
 for(let attempt=0;attempt<8;attempt++){
  const raw=await Promise.all(keys.map(key=>command(['GET',key]).then(x=>x||'')));
  const data=raw.map(value=>{if(!value)return {};const parsed=JSON.parse(value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('CONTENT_STORAGE_INVALID');return parsed;});
  const result=change(data),next=data.map(JSON.stringify);
  if(Number(await command(['EVAL',COMMUNITY_CAS_LUA,String(keys.length),...keys,...raw,...next]))===1)return result;
 }
 throw new Error('CONTENT_CHANGED_RETRY');
}

export function saveGenerationCohort(source,input={},user={},now=new Date().toISOString()){
 const data=clone(source),age=input.age;if(!GENERATION_AGES.includes(age))throw new Error('INVALID_GENERATION_AGE');
 const ids=Array.isArray(input.candidateIds)?input.candidateIds:[];
 if(ids.length>15||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id||id.length>80))throw new Error('INVALID_GENERATION_CANDIDATES');
 const counts=Object.fromEntries(ids.map(id=>{const n=Number(input.counts?.[id]??0);if(!Number.isSafeInteger(n)||n<0||n>100000000)throw new Error('INVALID_DEMO_COUNT');return [id,n];}));
 data.items=Array.isArray(data.items)?data.items:[];
 let item=data.items.find(x=>x.published!==false&&x.featured)||data.items.find(x=>x.published!==false&&x.id===data.activeItemId);
 if(input.itemId&&input.itemId!==item?.id)throw new Error('GENERATION_ROUND_CHANGED');
 if(!item){item={id:stampId('generation',now),title:'세대의 선택, 대통령',candidateIds:data.candidates||[],results:clone(data.results),legacyVoting:true,published:true,featured:true,ownerId:user.id,createdAt:now};data.items.unshift(item);}
 item.candidatesByAge={...Object.fromEntries(GENERATION_AGES.map(a=>[a,[...(item.candidateIds||[])]])),...(item.candidatesByAge||{}),[age]:ids};
 item.candidateIds=[...new Set(Object.values(item.candidatesByAge).flat())];
 const flags={...Object.fromEntries(GENERATION_AGES.map(a=>[a,item.demo?.enabled===true])),...(item.demo?.enabledByAge||{}),[age]:input.enabled===true};
 item.demo={...(item.demo||{}),enabled:Object.values(flags).some(Boolean),enabledByAge:flags,counts:{...(item.demo?.counts||{}),[age]:counts}};
 item.updatedAt=now;data.activeItemId=item.id;data.candidates=item.candidateIds;data.candidatesByAge=item.candidatesByAge;data.results=item.results||{};
 return {data,item};
}

export const POINT_PACKAGES=Object.freeze([10000,30000,50000,100000,500000,1000000]);
export function pointBonus(amount,first){return first?20:amount>=1000000?20:amount>=500000?15:amount>=100000?10:0;}
const POINT_BANK='jcs:points:v1:bank',POINT_ORDERS='jcs:points:v1:orders',walletKey=id=>'jcs:points:v1:wallet:'+id;
export function createPointService({command,clock=()=>Date.now()}={}){
 const read=async k=>JSON.parse(await command(['GET',k])||'{}');
 const requireUser=u=>{if(!u?.id||u.status==='suspended')throw new Error('LOGIN_REQUIRED');};
 const admin=u=>{requireUser(u);if(u.role!=='admin')throw new Error('ADMIN_REQUIRED');};
 const requestId=x=>{const id=String(x||'');if(!/^[a-zA-Z0-9-]{12,80}$/.test(id))throw new Error('INVALID_REQUEST_ID');return id;};
 return {
 async wallet(user){requireUser(user);return {ok:true,wallet:await read(walletKey(user.id))};},
 async status(user){const bank=await read(POINT_BANK);if(!user?.id)return {ok:true,bank,packages:POINT_PACKAGES,serverNow:clock()};requireUser(user);const [wallet,orders]=await Promise.all([read(walletKey(user.id)),read(POINT_ORDERS)]);return {ok:true,bank,wallet,packages:POINT_PACKAGES,orders:(orders.items||[]).filter(o=>user.role==='admin'||o.userId===user.id).sort((a,b)=>b.createdAt-a.createdAt),serverNow:clock()};},
 async bank(user,input){admin(user);const bank={bank:clean(input.bank,60),account:clean(input.account,80),holder:clean(input.holder,60),updatedAt:clock()};if(!bank.bank||!bank.account||!bank.holder)throw new Error('BANK_REQUIRED');await mutateParticipation(command,[POINT_BANK],([data])=>{Object.assign(data,bank);return null;});return {ok:true};},
 async order(user,input){requireUser(user);const amount=Number(input.amount),token=requestId(input.requestId),depositor=clean(input.depositor,60);if(!POINT_PACKAGES.includes(amount)||!depositor)throw new Error('INVALID_ORDER');const id=randomUUID();return mutateParticipation(command,[POINT_BANK,POINT_ORDERS,walletKey(user.id)],([bank,orders,wallet])=>{orders.items||=[];const old=orders.items.find(o=>o.userId===user.id&&o.requestId===token);if(old)return {ok:true,order:old};if(!bank.bank||!bank.account||!bank.holder)throw new Error('BANK_REQUIRED');const rate=pointBonus(amount,!wallet.firstPaid),order={id,requestId:token,userId:user.id,nickname:clean(user.nickname,60),amount,depositor,bank:{...bank},status:'pending',quotedBonus:rate,createdAt:clock()};orders.items.push(order);return {ok:true,order};});},
 async review(user,input){admin(user);const snapshot=await read(POINT_ORDERS),found=(snapshot.items||[]).find(o=>o.id===input.id);if(!found)throw new Error('ORDER_NOT_FOUND');if(!['approve','reject'].includes(input.decision))throw new Error('INVALID_DECISION');return mutateParticipation(command,[POINT_ORDERS,walletKey(found.userId)],([orders,wallet])=>{const order=(orders.items||[]).find(o=>o.id===input.id);if(!order)throw new Error('ORDER_NOT_FOUND');if(order.status!=='pending')return {ok:true,order};if(input.decision==='reject'){order.status='rejected';order.reviewedAt=clock();order.reviewedBy=user.id;return {ok:true,order};}if(input.confirmed!==true)throw new Error('TRANSFER_CONFIRM_REQUIRED');const bonus=pointBonus(order.amount,!wallet.firstPaid),points=order.amount*(100+bonus)/100;wallet.balance=Number(wallet.balance||0)+points;wallet.firstPaid=true;wallet.ledger||=[];wallet.ledger.push({id:order.id,type:'charge',points,amount:order.amount,bonus,at:clock()});Object.assign(order,{status:'approved',bonus,points,reviewedAt:clock(),reviewedBy:user.id});return {ok:true,order};});},
 async cage(user,input){requireUser(user);const fee=Number(input.fee),token=requestId(input.requestId),title=clean(input.title,200),body=clean(input.body,20000);if(fee<50000||fee>100000||fee%10000!==0||!title||!body)throw new Error('INVALID_CAGE');const id='community-'+randomUUID();return mutateParticipation(command,[walletKey(user.id),TARGET_KEYS.content('community')],([wallet,data])=>{wallet.cageRequests||={};if(wallet.cageRequests[token])return {ok:true,id:wallet.cageRequests[token]};if(Number(wallet.balance||0)<fee)throw new Error('INSUFFICIENT_POINTS');const start=clock(),minutes=30+(fee-50000)/10000*6,post={id,title,body,ownerId:user.id,author:clean(user.nickname||user.id,60),published:true,cageEnabled:true,pinKind:'',likes:0,views:0,createdAt:new Date(start).toISOString(),updatedAt:new Date(start).toISOString(),cageStartsAt:start,cageEndsAt:start+minutes*60000,cageCost:fee};data.items=[post,...(data.items||[])];wallet.balance-=fee;wallet.cageRequests[token]=id;wallet.ledger||=[];wallet.ledger.push({id,type:'cage',points:-fee,at:start});return {ok:true,id,endsAt:post.cageEndsAt};});}
 };
}
