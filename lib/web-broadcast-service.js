import {createHash,randomUUID} from 'node:crypto';
import {isSuperAdmin} from '../src/core/membership.js';
import {GP} from './group-push-service.js';
import {WEB_MEMBERS} from './web-push-service.js';
const prefix='jcs:web-broadcast:v1',TTL=90*86400;
const K={job:id=>`${prefix}:job:${id}`,receipts:id=>`${prefix}:receipt:${id}`,pending:`${prefix}:pending`,history:`${prefix}:history`,cooldown:`${prefix}:cooldown`};
const requireAdmin=u=>{if(!isSuperAdmin(u)||u.status!=='active')throw Error('PUSH_FORBIDDEN');};
const pairs=v=>Array.isArray(v)?Array.from({length:v.length/2},(_,i)=>[v[2*i],v[2*i+1]]):Object.entries(v||{});
const parse=v=>v?JSON.parse(v):null;
const COMMIT=`-- WEB_BROADCAST_COMMIT
if redis.call('EXISTS',KEYS[1])==1 then return 2 end
if redis.call('EXISTS',KEYS[4])==1 then return 0 end
redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[3])
redis.call('SADD',KEYS[2],ARGV[2]);redis.call('SADD',KEYS[3],ARGV[2])
redis.call('SET',KEYS[4],'1','EX','60');return 1`;
export function createWebBroadcastService({command,getUser,send,enqueue=async()=>{},now=Date.now}){
 const read=async k=>parse(await command(['GET',k]));
 async function devices(id){
  const u=await getUser(id);if(!u||u.status!=='active')return [];
  const list=[];for(const [k,v] of pairs(await command(['HGETALL',GP.devices(id)]))){const d=parse(v);if(d?.kind==='web'&&await command(['GET',GP.binding(k)])===id)list.push([k,d]);}
  return list;
 }
 async function audience(){
  const ids=await command(['SMEMBERS',WEB_MEMBERS])||[],eligible=[];
  for(let i=0;i<ids.length;i+=30){const batch=await Promise.all(ids.slice(i,i+30).map(async id=>(await devices(id)).length?id:null));eligible.push(...batch.filter(Boolean));}
  return eligible;
 }
 async function status(user){
  requireAdmin(user);const ids=await command(['SMEMBERS',K.history])||[],jobs=[];
  for(const id of ids){const j=await read(K.job(id));if(j)jobs.push(j);else await command(['SREM',K.history,id]);}
  const history=await Promise.all(jobs.sort((a,b)=>b.at-a.at).slice(0,20).map(async j=>{
   const receipts=await command(['HVALS',K.receipts(j.id)])||[];
   return {id:j.id,title:j.title,body:j.body,path:j.path,at:j.at,status:j.status,eligible:j.targets.length,accepted:receipts.filter(x=>x==='accepted').length,failed:receipts.filter(x=>x==='failed').length,skipped:receipts.filter(x=>x==='skipped').length};
  }));
  return {ok:true,eligible:(await audience()).length,history};
 }
 async function create(user,input){
  requireAdmin(user);
  if(typeof input.title!=='string'||!input.title.trim()||input.title.length>60||typeof input.body!=='string'||!input.body.trim()||input.body.length>300||!/^[-a-zA-Z0-9_]{8,100}$/.test(input.requestId||''))throw Error('PUSH_INPUT_INVALID');
  const path=String(input.path||'/');if(!path.startsWith('/')||path.startsWith('//')||/[\\\s\u0000-\u001f]/.test(path)||path.length>1000||/^\/(?:api|admin)(?:\/|\?|$)/.test(path))throw Error('PUSH_INPUT_INVALID');
  const id=createHash('sha256').update(user.id+':'+input.requestId).digest('hex');
  const previous=await read(K.job(id));if(previous){if(previous.status==='queued')try{await enqueue(id);}catch{}return {ok:true,id};}
  const targets=await audience();if(!targets.length)throw Error('PUSH_NO_RECIPIENTS');
  const job={id,title:input.title.trim(),body:input.body.trim(),path,targets,actorId:user.id,at:now(),status:'queued',cursor:0};
  const result=Number(await command(['EVAL',COMMIT,'4',K.job(id),K.pending,K.history,K.cooldown,JSON.stringify(job),id,String(TTL)]));
  if(result===0)throw Error('PUSH_BROADCAST_INTERVAL');
  try{await enqueue(id);}catch{/* Pending jobs survive queue outages. */}
  return {ok:true,id};
 }
 async function deliver(id){
  if(!/^[a-f0-9]{64}$/.test(id||''))return;
  const lock=K.job(id)+':lock',nonce=randomUUID();if(await command(['SET',lock,nonce,'NX','EX','170'])!=='OK')throw Error('PUSH_BUSY');
  try{
   const j=await read(K.job(id));if(!j||j.status!=='queued'){await command(['SREM',K.pending,id]);return;}
   const admin=await getUser(j.actorId);
   if(now()-j.at>86400000||!isSuperAdmin(admin)||admin.status!=='active'){j.status='cancelled';await command(['SET',K.job(id),JSON.stringify(j),'EX',String(TTL)]);await command(['SREM',K.pending,id]);return;}
   const receipt=async(k,v)=>{await command(['HSET',K.receipts(id),k,v]);await command(['EXPIRE',K.receipts(id),String(TTL)]);};
   const end=Math.min(j.cursor+5,j.targets.length);
   const results=await Promise.allSettled(j.targets.slice(j.cursor,end).map(async userId=>{
    const rows=await devices(userId);if(!rows.length){await receipt('user:'+userId,'skipped');return;}
    for(const [key,d] of rows){
     const previous=await command(['HGET',K.receipts(id),key]);
     if(['accepted','failed'].includes(previous))continue;
     if(await command(['GET',GP.binding(key)])!==userId||!await command(['HGET',GP.devices(userId),key])||(await getUser(userId))?.status!=='active'){await receipt(key,'skipped');continue;}
     try{await send(d,{title:j.title,body:j.body,path:j.path,eventId:id});await receipt(key,'accepted');}
     catch(e){
      if(e.code==='UNREGISTERED'){await command(['HDEL',GP.devices(userId),key]);await receipt(key,'failed');}
      else{const attempts=(/^retry:\d+$/.test(previous||'')?Number(previous.split(':')[1]):0)+1;await receipt(key,attempts>=5?'failed':`retry:${attempts}`);if(attempts<5)throw e;}
     }
    }
   }));
   if(results.some(r=>r.status==='rejected'))throw Error('PUSH_RETRY');
   j.cursor=end;j.status=end===j.targets.length?'complete':'queued';
   await command(['SET',K.job(id),JSON.stringify(j),'EX',String(TTL)]);
   if(j.status==='complete')await command(['SREM',K.pending,id]);else await enqueue(id);
  }finally{await command(['EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",'1',lock,nonce]);}
 }
 async function recover(){const ids=await command(['SMEMBERS',K.pending])||[];for(const id of ids.slice(0,100))await enqueue(id);return ids.length;}
 return {status,create,deliver,recover};
}
