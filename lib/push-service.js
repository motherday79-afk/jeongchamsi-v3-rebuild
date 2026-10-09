import {createHash,randomUUID} from 'node:crypto';
import {isAdmin} from '../src/core/ai-panel-model.js';
import {isSuperAdmin} from '../src/core/membership.js';
import {pushCopy} from './update-notifications.js';
const prefix='jcsr2:push:v1',devices=`${prefix}:devices`;
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const release="if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0";
export function createPushService({command,getUser,send,now=Date.now}={}){
 async function rows(){const raw=await command(['HGETALL',devices]);const pairs=Array.isArray(raw)?Array.from({length:raw.length/2},(_,i)=>[raw[i*2],raw[i*2+1]]):Object.entries(raw||{});return pairs.flatMap(([key,value])=>{try{return [{key,...JSON.parse(value)}];}catch{return [];}});}
 async function register(user,{token,enabled}={}){
  if(!isAdmin(user))throw Error('PUSH_FORBIDDEN');
  if(typeof token!=='string'||!/^[A-Za-z0-9_:\-]{80,4096}$/.test(token)||typeof enabled!=='boolean')throw Error('PUSH_INPUT_INVALID');
  const key=digest(token);
  if(!enabled){for(const row of await rows())if(row.key===key&&row.userId===user.id)await command(['HDEL',devices,key]);return {ok:true,enabled:false};}
  // Keep the original opt-in time during refreshes; refreshing must not swallow a queued event.
  const prior=(await rows()).find(r=>r.key===key&&r.userId===user.id);
  await command(['HSET',devices,key,JSON.stringify({userId:user.id,token,enabled:true,createdAt:prior?.createdAt??now(),updatedAt:now()})]);
  return {ok:true,enabled:true};
 }
 async function revoke(userId){for(const row of await rows())if(row.userId===userId)await command(['HDEL',devices,row.key]);}
 async function deliver(events){
  const stats={sent:0,failed:0};if(typeof send!=='function')return stats;
  for(const row of await rows()){
   const user=await getUser(row.userId);if(!row.enabled||!isAdmin(user)){await command(['HDEL',devices,row.key]);continue;}
   for(const event of events){
    if(event.kind==='signup'&&!isSuperAdmin(user))continue;
    const copy=pushCopy(event);
    if(!copy||!event.id||!Number.isFinite(event.at)||event.at<row.createdAt||now()-event.at>86400000||event.at>now()+60000)continue;
    const key=`${prefix}:sent:${row.key}:${digest(event.id)}`,lock=`${key}:lock`,nonce=randomUUID();
    if(await command(['GET',key])||!await command(['SET',lock,nonce,'NX','EX','120']))continue;
    try{
     if(await command(['GET',key]))continue;
     await send(row.token,{...copy,eventId:digest(event.id)});
     await command(['SET',key,'1','EX','172800']);stats.sent++;
    }catch(error){stats.failed++;if(error?.code==='UNREGISTERED')await command(['HDEL',devices,row.key]);}
    finally{await command(['EVAL',release,'1',lock,nonce]);}
   }
  }
  return stats;
 }
 return {register,revoke,deliver};
}
