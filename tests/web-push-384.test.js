import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,randomBytes} from 'node:crypto';
import {createWebPushService,validateSubscription} from '../lib/web-push-service.js';
import {webPushRequest} from '../lib/web-push-http.js';
import {GP,createGroupPushService} from '../lib/group-push-service.js';
const subscription=(host='fcm.googleapis.com')=>{const e=createECDH('prime256v1');e.generateKeys();return {endpoint:`https://${host}/send/example123`,keys:{p256dh:e.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};};
function fixture(){
 const values=new Map(),hashes=new Map(),sent=[],sets=new Map();
 const command=async([op,k,...a])=>{
  if(op==='GET')return values.get(k)||null;
  if(op==='SET'){if(a.includes('NX')&&values.has(k))return null;values.set(k,a[0]);return 'OK';}
  if(op==='HGET')return hashes.get(k)?.[a[0]]||null;
  if(op==='HGETALL')return Object.entries(hashes.get(k)||{}).flat();
  if(op==='HSET'){if(!hashes.has(k))hashes.set(k,{});hashes.get(k)[a[0]]=a[1];return 1;}
  if(op==='HDEL'){if(hashes.has(k))delete hashes.get(k)[a[0]];return 1;}
  if(op==='DEL'){values.delete(k);hashes.delete(k);return 1;}
  if(op==='EXPIRE')return 1;
  if(op==='SADD'){if(!sets.has(k))sets.set(k,new Set());sets.get(k).add(a[0]);return 1;}
  throw Error(op);
 };
 const service=createWebPushService({command,sendNotification:async(s,p,o)=>{sent.push({s,p:JSON.parse(p),o});return {statusCode:201};}});
 return {service,values,hashes,sent,command};
}
const user={id:'member-1',status:'active'};
test('push endpoints reject arbitrary URLs and invalid encryption keys',()=>{
 for(const host of ['127.0.0.1','evil.com','fcm.googleapis.com.evil.com'])assert.throws(()=>validateSubscription(subscription(host)),/PUSH_INPUT_INVALID/);
 for(const host of ['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com'])assert.equal(validateSubscription(subscription(host)).endpoint.startsWith('https:'),true);
 assert.throws(()=>validateSubscription({...subscription(),keys:{auth:'a',p256dh:'b'}}),/PUSH_INPUT_INVALID/);
});
test('VAPID identity persists across requests and concurrent initialization',async()=>{
 const f=fixture(),keys=await Promise.all([f.service.settings(user),f.service.settings(user),createWebPushService({command:f.command}).settings(user)]);
 assert.equal(new Set(keys.map(k=>k.publicKey)).size,1);assert.equal(keys[0].privateKey,undefined);
});
test('self-test uses registered current-account device only and rate limits repetitions',async()=>{
 const f=fixture(),s=subscription();await f.service.register(user,{subscription:s});
 await assert.rejects(f.service.test({id:'other',status:'active'},{endpoint:s.endpoint}),/PUSH_NOT_REGISTERED/);
 await f.service.test(user,{endpoint:s.endpoint});assert.equal(f.sent.length,1);assert.match(f.sent[0].p.title,/테스트/);assert.ok(f.sent[0].o.vapidDetails.privateKey);
 await assert.rejects(f.service.test(user,{endpoint:s.endpoint}),/PUSH_TEST_LIMIT/);
});
test('switching account and logout invalidate previous recipient binding',async()=>{
 const f=fixture(),s=subscription();await f.service.register(user,{subscription:s});
 await f.service.register({id:'other',status:'active'},{subscription:s});
 assert.equal((await f.service.status(user,{endpoint:s.endpoint})).enabled,false);
 await f.service.disable(user,{endpoint:s.endpoint});assert.equal((await f.service.status({id:'other',status:'active'},{endpoint:s.endpoint})).enabled,true);
 await createGroupPushService({command:f.command}).revoke('other');
 assert.equal((await f.service.status({id:'other',status:'active'},{endpoint:s.endpoint})).enabled,false);
});
test('expired subscriptions are pruned and reported without success',async()=>{
 const f=fixture(),s=subscription();await f.service.register(user,{subscription:s});
 const svc=createWebPushService({command:f.command,sendNotification:async()=>{throw {statusCode:410};}});
 await assert.rejects(svc.test(user,{endpoint:s.endpoint}),/PUSH_SUBSCRIPTION_EXPIRED/);
 assert.equal((await svc.status(user,{endpoint:s.endpoint})).enabled,false);
});
test('API requires active login and same-origin POST, refuses arbitrary operations',async()=>{
 const f=fixture(),url=new URL('https://www.jeongchamsi.com/api/v3/push/web');
 assert.equal((await webPushRequest({method:'GET',headers:{}},{service:f.service,url,user:null})).status,401);
 assert.equal((await webPushRequest({method:'POST',headers:{origin:'https://evil.com'},body:{operation:'test'}},{service:f.service,url,user})).status,403);
 assert.equal((await webPushRequest({method:'POST',headers:{origin:url.origin},body:{operation:'unknown'}},{service:f.service,url,user})).status,400);
});
