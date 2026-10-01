import {createHash,randomUUID} from 'node:crypto';
import {isSuperAdmin} from '../src/core/membership.js';
const prefix='jcs:group-push:v1',TTL=90*86400;
export const GP={state:id=>`${prefix}:group:${id}`,job:id=>`${prefix}:job:${id}`,devices:id=>`${prefix}:devices:${id}`,binding:id=>`${prefix}:binding:${id}`,receipts:id=>`${prefix}:receipts:${id}`,pending:`${prefix}:pending`};
const hash=v=>createHash('sha256').update(String(v)).digest('hex');
const fail=code=>{throw new Error(code);};
const signed=u=>{if(!u?.id||u.status==='suspended')fail('LOGIN_REQUIRED');};
const parse=v=>v?JSON.parse(v):null;
const valid=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
const groupKey=id=>`jcsr2:groups:v1:item:${id}`;
const active=(g,u)=>g.members?.find(m=>m.userId===u&&m.status==='active');
const policy=s=>({daily:2,monthly:20,disabled:false,...s.policy});
const date=at=>new Date(at+9*3600000).toISOString().slice(0,10);
export function groupPushUsage(state={},at=Date.now()){
 const day=date(at),history=state.history||[],p=policy(state),today=history.filter(h=>date(h.at)===day).length,month=history.filter(h=>date(h.at).slice(0,7)===day.slice(0,7)).length;
 return {...p,today,month,nextAt:history.length?Math.max(...history.map(h=>h.at))+1800000:0};
}
export const GP_COMMIT=`-- GROUP_PUSH_COMMIT_V1
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] or (redis.call('GET',KEYS[2]) or '')~=ARGV[2] then return 0 end
redis.call('SET',KEYS[2],ARGV[3])
if ARGV[4]~='' then redis.call('SET',KEYS[3],ARGV[4],'EX',ARGV[6]);redis.call('SADD',KEYS[4],ARGV[5]) end
return 1`;
export function createGroupPushService({command,getUser,send,enqueue=async()=>{},configured=true,now=Date.now}={}){
 const read=async key=>parse(await command(['GET',key]));
 async function group(id){if(!valid(id))fail('GROUP_NOT_FOUND');const raw=await command(['GET',groupKey(id)]),g=parse(raw);if(!g||g.isExample)fail('GROUP_NOT_FOUND');return {g,raw};}
 async function register(user,{token,enabled}={}){
  signed(user);if(typeof token!=='string'||!/^[A-Za-z0-9_:\-]{80,4096}$/.test(token)||typeof enabled!=='boolean')fail('PUSH_INPUT_INVALID');
  const key=hash(token),binding=GP.binding(key);
  if(!enabled){await command(['HDEL',GP.devices(user.id),key]);return {ok:true,enabled:false};}
  const existing=await command(['HGETALL',GP.devices(user.id)]),pairs=Array.isArray(existing)?Array.from({length:existing.length/2},(_,i)=>[existing[2*i],existing[2*i+1]]):Object.entries(existing||{});
  if(!pairs.some(([k])=>k===key)&&pairs.length>=5){const oldest=pairs.sort((a,b)=>(parse(a[1])?.at||0)-(parse(b[1])?.at||0))[0];await command(['HDEL',GP.devices(user.id),oldest[0]]);}
  await command(['SET',binding,user.id,'EX',String(180*86400)]);
  await command(['HSET',GP.devices(user.id),key,JSON.stringify({token,at:now()})]);await command(['EXPIRE',GP.devices(user.id),String(180*86400)]);
  return {ok:true,enabled:true};
 }
 async function revoke(userId){await command(['DEL',GP.devices(userId)]);}
 async function status(id,user){
  const {g}=await group(id);if(!user?.id||(!active(g,user.id)&&!isSuperAdmin(user)))return null;
  const s=await read(GP.state(id))||{},manage=g.ownerId===user.id||isSuperAdmin(user),history=(s.history||[]).filter(h=>now()-h.at<TTL*1000).slice(-20).reverse();
  const messages=await Promise.all(history.map(async h=>{const job=await read(GP.job(h.id));if(!job)return null;if(manage&&job.status==='queued')try{await enqueue(job.id);}catch{}const row={id:h.id,title:job.title,body:job.body,at:h.at};if(manage){const values=await command(['HVALS',GP.receipts(h.id)])||[];row.delivery={status:job.status,eligible:job.targets.length,accepted:values.filter(v=>v==='accepted').length,noDevice:values.filter(v=>v==='no-device').length,skipped:values.filter(v=>v==='skipped').length,failed:values.filter(v=>v==='failed').length};}return row;}));
  return {canSend:manage&&g.status==='approved',canSetPolicy:isSuperAdmin(user),usage:manage?groupPushUsage(s,now()):null,configured,messages:messages.filter(Boolean)};
 }
 async function save(id,user,input={},operation='send'){
  signed(user);if(!valid(input.requestId)&&operation==='send')fail('GROUP_INPUT_INVALID');
  for(let attempt=0;attempt<8;attempt++){
   const {g,raw}=await group(id);if(g.status!=='approved')fail('GROUP_REVIEW_REQUIRED');
   if(g.ownerId!==user.id&&!isSuperAdmin(user))fail('GROUP_FORBIDDEN');
   const old=await command(['GET',GP.state(id)])||'',s=parse(old)||{history:[]};s.history=(s.history||[]).filter(h=>now()-h.at<TTL*1000);
   let job=null;
   if(operation==='policy'){
    if(!isSuperAdmin(user))fail('GROUP_FORBIDDEN');
    if(!Number.isInteger(input.daily)||input.daily<1||input.daily>20||!Number.isInteger(input.monthly)||input.monthly<1||input.monthly>200||typeof input.disabled!=='boolean')fail('GROUP_INPUT_INVALID');
    s.policy={daily:input.daily,monthly:input.monthly,disabled:input.disabled};s.policyUpdated={by:user.id,at:now()};
   }else{
    const idempotent=hash(`${id}:${user.id}:${input.requestId}`),previous=s.history.find(h=>h.id===idempotent);
    if(previous){try{await enqueue(previous.id);}catch{}return {ok:true,id:previous.id};}
    const u=groupPushUsage(s,now());if(u.disabled)fail('GROUP_PUSH_DISABLED');if(u.today>=u.daily||u.month>=u.monthly)fail('GROUP_PUSH_LIMIT');if(u.nextAt>now())fail('GROUP_PUSH_INTERVAL');
    if(typeof input.title!=='string'||!input.title.trim()||input.title.length>60||typeof input.body!=='string'||!input.body.trim()||input.body.length>300)fail('GROUP_INPUT_INVALID');
    const targets=[...new Set(g.members.filter(m=>m.status==='active'&&m.notify!==false).map(m=>m.userId))];
    job={id:idempotent,groupId:id,groupName:g.name,title:input.title.trim(),body:input.body.trim(),at:now(),actorId:user.id,targets,cursor:0,status:targets.length?'queued':'complete'};
    s.history.push({id:job.id,at:job.at});
   }
   const result=await command(['EVAL',GP_COMMIT,'4',groupKey(id),GP.state(id),GP.job(job?.id||'policy'),GP.pending,raw,old,JSON.stringify(s),job?JSON.stringify(job):'',job?.id||'',String(TTL)]);
   if(Number(result)!==1)continue;
   if(job)try{await enqueue(job.id);}catch{/* durable pending set is retried by the watchdog */}
   return {ok:true,id:job?.id||''};
  }
  fail('GROUP_CONFLICT');
 }
 async function message(id,user){
  signed(user);if(!/^[a-f0-9]{64}$/.test(id||''))fail('GROUP_NOT_FOUND');const job=await read(GP.job(id));if(!job||now()-job.at>86400000||!job.targets.includes(user.id))fail('GROUP_NOT_FOUND');
  const {g}=await group(job.groupId),m=active(g,user.id);if(policy(await read(GP.state(job.groupId))||{}).disabled)fail('GROUP_FORBIDDEN');if(g.status!=='approved'||!m||m.notify===false)fail('GROUP_FORBIDDEN');
  return {ok:true,title:`${g.name} · ${job.title}`,body:job.body,path:`/groups/${job.groupId}?tab=notifications`,userId:user.id};
 }
 async function deliver(id){
  if(!/^[a-f0-9]{64}$/.test(id||''))return;
  const lock=GP.job(id)+':lock',nonce=randomUUID();if(await command(['SET',lock,nonce,'NX','EX','170'])!=='OK')throw Error('GROUP_PUSH_BUSY');
  try{
   const job=await read(GP.job(id));if(!job){await command(['SREM',GP.pending,id]);return;}
   if(['complete','expired','cancelled'].includes(job.status)){await command(['SREM',GP.pending,id]);return;}
   const stopped=policy(await read(GP.state(job.groupId))||{}).disabled;
   if(stopped||now()-job.at>86400000){job.status=stopped?'cancelled':'expired';await command(['SET',GP.job(id),JSON.stringify(job),'EX',String(TTL)]);await command(['SREM',GP.pending,id]);return;}
   const g=await read(groupKey(job.groupId)),end=Math.min(job.cursor+5,job.targets.length);
   const receipt=async(k,v)=>{await command(['HSET',GP.receipts(id),k,v]);await command(['EXPIRE',GP.receipts(id),String(TTL)]);};
   const outcomes=await Promise.allSettled(job.targets.slice(job.cursor,end).map(async userId=>{
    const m=g&&active(g,userId),u=await getUser(userId);
    if(!g||g.status!=='approved'||!m||m.notify===false||!u||u.status==='suspended'){await receipt(`user:${userId}`,'skipped');return;}
    const raw=await command(['HGETALL',GP.devices(userId)]),pairs=Array.isArray(raw)?Array.from({length:raw.length/2},(_,i)=>[raw[2*i],raw[2*i+1]]):Object.entries(raw||{});
    const devices=[];for(const [k,v] of pairs)if(await command(['GET',GP.binding(k)])===userId)devices.push([k,parse(v)]);
    if(!devices.length){await receipt(`user:${userId}`,'no-device');return;}
    if(typeof send!=='function')throw Error('PUSH_NOT_CONFIGURED');
    for(const [key,device] of devices){
     const previous=await command(['HGET',GP.receipts(id),key]);if(['accepted','failed'].includes(previous))continue;
     // Re-check membership before each device, including retried chunks.
     const latest=await read(groupKey(job.groupId)),member=latest&&active(latest,userId);
     if(!latest||latest.status!=='approved'||!member||member.notify===false||await command(['GET',GP.binding(key)])!==userId||!await command(['HGET',GP.devices(userId),key])){await receipt(key,'skipped');continue;}
     try{await send(device.kind==='web'?device:device.token,{eventId:id,path:`/groups/${job.groupId}?tab=notifications`,...(device.kind==='web'?{title:`${latest.name} · ${job.title}`,body:job.body}:{})});await receipt(key,'accepted');}
     catch(error){if(error.code==='UNREGISTERED'){await command(['HDEL',GP.devices(userId),key]);await receipt(key,'failed');}else throw error;}
    }
   }));
   const rejected=outcomes.find(r=>r.status==='rejected');if(rejected)throw rejected.reason;
   job.cursor=end;job.status=end===job.targets.length?'complete':'queued';await command(['SET',GP.job(id),JSON.stringify(job),'EX',String(TTL)]);
   if(job.status==='complete')await command(['SREM',GP.pending,id]);else await enqueue(id);
  }finally{await command(['EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",'1',lock,nonce]);}
 }
 async function recover(){const pending=await command(['SMEMBERS',GP.pending])||[];for(const id of pending.slice(0,100))await enqueue(id);return pending.length;}
 return {register,revoke,status,save,message,deliver,recover};
}
