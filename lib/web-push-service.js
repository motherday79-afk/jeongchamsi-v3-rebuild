import webpush from 'web-push';
import {createHash,ECDH} from 'node:crypto';
import {GP} from './group-push-service.js';
const VAPID='jcs:web-push:v1:vapid',DAYS180=180*86400;
export const WEB_MEMBERS='jcs:web-push:v1:members';
const fail=code=>{throw new Error(code);};
const signed=u=>{if(!u?.id||u.status!=='active')fail('LOGIN_REQUIRED');};
const hash=v=>createHash('sha256').update(v).digest('hex');
const deviceKey=endpoint=>'web-'+hash(endpoint);
const pairs=v=>Array.isArray(v)?Array.from({length:v.length/2},(_,i)=>[v[i*2],v[i*2+1]]):Object.entries(v||{});
function endpointUrl(value){
 if(typeof value!=='string'||value.length>2048)fail('PUSH_INPUT_INVALID');
 let u;try{u=new URL(value);}catch{fail('PUSH_INPUT_INVALID');}
 const allowed=['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com'];
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!allowed.includes(u.hostname)||u.pathname==='/')fail('PUSH_INPUT_INVALID');
 return value;
}
export function validateSubscription(value){
 const endpoint=endpointUrl(value?.endpoint),keys=value?.keys;
 try{
  if(!/^[A-Za-z0-9_-]{86,88}={0,2}$/.test(keys?.p256dh||'')||!/^[A-Za-z0-9_-]{22}={0,2}$/.test(keys?.auth||''))throw Error();
  const pub=Buffer.from(keys.p256dh,'base64url');if(pub.length!==65||pub[0]!==4||Buffer.from(keys.auth,'base64url').length!==16)throw Error();
  ECDH.convertKey(pub,'prime256v1');
 }catch{fail('PUSH_INPUT_INVALID');}
 return {endpoint,keys:{p256dh:keys.p256dh,auth:keys.auth}};
}
export function createWebPushService({command,sendNotification=webpush.sendNotification.bind(webpush),now=Date.now}={}){
 async function vapid(){
  let raw=await command(['GET',VAPID]);
  if(!raw){await command(['SET',VAPID,JSON.stringify(webpush.generateVAPIDKeys()),'NX']);raw=await command(['GET',VAPID]);}
  if(!raw)fail('PUSH_NOT_CONFIGURED');return JSON.parse(raw);
 }
 async function settings(user){signed(user);return {ok:true,publicKey:(await vapid()).publicKey};}
 async function status(user,{endpoint}={}){
  signed(user);const key=deviceKey(endpointUrl(endpoint));
  return {ok:true,enabled:await command(['GET',GP.binding(key)])===user.id&&!!await command(['HGET',GP.devices(user.id),key])};
 }
 async function register(user,{subscription}={}){
  signed(user);const sub=validateSubscription(subscription),key=deviceKey(sub.endpoint);
  await vapid();
  const existing=pairs(await command(['HGETALL',GP.devices(user.id)]));
  if(!existing.some(([k])=>k===key)&&existing.length>=5){const oldest=existing.sort((a,b)=>JSON.parse(a[1]).at-JSON.parse(b[1]).at)[0];await command(['HDEL',GP.devices(user.id),oldest[0]]);}
  await command(['SET',GP.binding(key),user.id,'EX',String(DAYS180)]);
  await command(['HSET',GP.devices(user.id),key,JSON.stringify({kind:'web',subscription:sub,at:now()})]);
  await command(['EXPIRE',GP.devices(user.id),String(DAYS180)]);
  await command(['SADD',WEB_MEMBERS,user.id]);
  return {ok:true,enabled:true};
 }
 async function disable(user,{endpoint}={}){signed(user);await command(['HDEL',GP.devices(user.id),deviceKey(endpointUrl(endpoint))]);return {ok:true,enabled:false};}
 async function send(device,payload){
  const subscription=validateSubscription(device.subscription),keys=await vapid();
  try{return await sendNotification(subscription,JSON.stringify(payload),{vapidDetails:{subject:'https://www.jeongchamsi.com',...keys},TTL:3600,urgency:'high',timeout:8000});}
  catch(error){if([404,410].includes(error.statusCode))throw Object.assign(Error('PUSH_SUBSCRIPTION_EXPIRED'),{code:'UNREGISTERED'});throw Error('PUSH_SEND_FAILED');}
 }
 async function test(user,input){
  signed(user);if(!(await status(user,input)).enabled)fail('PUSH_NOT_REGISTERED');
  if(await command(['SET',`jcs:web-push:v1:test:${user.id}`,'1','NX','EX','30'])!=='OK')fail('PUSH_TEST_LIMIT');
  const key=deviceKey(input.endpoint),raw=await command(['HGET',GP.devices(user.id),key]);
  if(!raw||await command(['GET',GP.binding(key)])!==user.id)fail('PUSH_NOT_REGISTERED');
  try{await send(JSON.parse(raw),{title:'정참시 테스트 알림',body:'웹 푸시가 도착했습니다. 이제 이 브라우저에서 모임 소식을 받을 수 있습니다.',path:'/notifications',eventId:'test-'+now()});}
  catch(error){if(error.code==='UNREGISTERED')await command(['HDEL',GP.devices(user.id),key]);throw error;}
  return {ok:true,accepted:true};
 }
 return {settings,status,register,disable,test,send};
}
