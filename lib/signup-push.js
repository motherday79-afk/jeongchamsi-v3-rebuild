import {createHash,randomUUID} from 'node:crypto';
import {isSuperAdmin} from '../src/core/membership.js';
import {GP} from './group-push-service.js';
export const SIGNUP_PENDING='jcs:signup-push:v1:pending';
const key=id=>'jcs:signup-push:v1:event:'+id;
const hash=value=>createHash('sha256').update(value).digest('hex');
const pairs=value=>Array.isArray(value)?Array.from({length:value.length/2},(_,i)=>[value[i*2],value[i*2+1]]):Object.entries(value||{});
export function signupEvent(user){return {id:hash('signup:'+user.id+':'+user.createdAt),kind:'signup',at:Date.parse(user.createdAt),nickname:String(user.nickname||'새로운 시민').replace(/[\r\n\t]/g,' ').slice(0,40)};}
export function createSignupPush({command,enqueue,nativeDeliver,readUsers,webSend,now=Date.now}){
 async function publish(user){
  const event=signupEvent(user);if(!Number.isFinite(event.at))throw Error('SIGNUP_TIME_INVALID');
  await command(['SET',key(event.id),JSON.stringify(event),'EX','172800']);
  await command(['SADD',SIGNUP_PENDING,event.id]);
  await enqueue(event.id);
 }
 async function deliver(id){
  if(!/^[a-f0-9]{64}$/.test(id||''))return;
  const lock=key(id)+':lock',nonce=randomUUID();
  if(await command(['SET',lock,nonce,'NX','EX','170'])!=='OK')throw Error('SIGNUP_PUSH_BUSY');
  try{
   const raw=await command(['GET',key(id)]),event=raw?JSON.parse(raw):null;
   if(!event||now()-event.at>86400000){await command(['SREM',SIGNUP_PENDING,id]);return;}
   const outcome=await nativeDeliver([event]);if(outcome.failed)throw Error('SIGNUP_PUSH_RETRY');
   const users=await readUsers();
   for(const user of Object.values(users).filter(isSuperAdmin)){
    for(const [deviceId,value] of pairs(await command(['HGETALL',GP.devices(user.id)]))){
     let device;try{device=JSON.parse(value);}catch{continue;}
     if(device.kind!=='web'||device.at>event.at||await command(['GET',GP.binding(deviceId)])!==user.id)continue;
     const receipt=key(id)+':sent:'+deviceId;if(await command(['GET',receipt]))continue;
     if(!isSuperAdmin((await readUsers())[user.id])||!await command(['HGET',GP.devices(user.id),deviceId]))continue;
     try{await webSend(device,{title:'새로운 정참시민이 가입했습니다',body:event.nickname+'님이 정참시에 함께합니다.',path:'/admin?tab=members',eventId:id});}
     catch(error){if(error.code==='UNREGISTERED'){await command(['HDEL',GP.devices(user.id),deviceId]);continue;}throw error;}
     await command(['SET',receipt,'1','EX','172800']);
    }
   }
   await command(['SREM',SIGNUP_PENDING,id]);
  }finally{await command(['EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",'1',lock,nonce]);}
 }
 async function recover(){const ids=await command(['SMEMBERS',SIGNUP_PENDING])||[];for(const id of ids.slice(0,100))await enqueue(id);return ids.length;}
 return {publish,deliver,recover};
}
