import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebBroadcastService} from '../lib/web-broadcast-service.js';
import {GP} from '../lib/group-push-service.js';
import {WEB_MEMBERS} from '../lib/web-push-service.js';
export function fixture({broken=''}={}){
 const v=new Map(),h=new Map(),s=new Map(),sent=[],queued=[];
 const command=async([op,k,...a])=>{
  if(op==='GET')return v.get(k)||null;
  if(op==='SET'){if(a.includes('NX')&&v.has(k))return null;v.set(k,a[0]);return 'OK';}
  if(op==='DEL'){v.delete(k);h.delete(k);return 1;}
  if(op==='EXPIRE')return 1;
  if(op==='HGET')return h.get(k)?.[a[0]]||null;
  if(op==='HGETALL')return Object.entries(h.get(k)||{}).flat();
  if(op==='HVALS')return Object.values(h.get(k)||{});
  if(op==='HSET'){if(!h.has(k))h.set(k,{});h.get(k)[a[0]]=a[1];return 1;}
  if(op==='HDEL'){delete h.get(k)?.[a[0]];return 1;}
  if(op==='SADD'){if(!s.has(k))s.set(k,new Set());s.get(k).add(a[0]);return 1;}
  if(op==='SMEMBERS')return [...s.get(k)||[]];
  if(op==='SREM'){s.get(k)?.delete(a[0]);return 1;}
  if(op==='EVAL'){
   if(k.includes('WEB_BROADCAST_COMMIT')){const [,job,pending,history,cooldown,raw,id]=a;if(v.has(job))return 2;if(v.has(cooldown))return 0;v.set(job,raw);v.set(cooldown,'1');for(const key of [pending,history]){if(!s.has(key))s.set(key,new Set());s.get(key).add(id);}return 1;}
   const [,lock,nonce]=a;if(v.get(lock)===nonce)v.delete(lock);return 1;
  }
  throw Error(op);
 };
 s.set(WEB_MEMBERS,new Set(['one','two','suspended']));
 for(const id of s.get(WEB_MEMBERS)){h.set(GP.devices(id),{['web-'+id]:JSON.stringify({kind:'web',subscription:{endpoint:'https://fcm.googleapis.com/send/'+id},at:1})});v.set(GP.binding('web-'+id),id);}
 const service=createWebBroadcastService({command,getUser:async id=>({id,role:id==='admin'?'admin':'member',status:id==='suspended'?'suspended':'active'}),send:async(d,p)=>{if(broken&&d.subscription.endpoint.endsWith('/'+broken))throw Error('temporary-provider-error');sent.push({d,p});},enqueue:async id=>queued.push(id)});
 const admin={id:'admin',role:'admin',status:'active'},post=(requestId='req-384-1')=>service.create(admin,{title:'정참시 소식',body:'새 소식입니다',path:'/community',requestId});
 return {service,admin,post,sent,queued,v,h,command};
}
test('broadcast authorization is highest administrator only; URLs stay on our site',async()=>{
 const f=fixture();for(const u of [null,{id:'one',role:'member'},{id:'staff',role:'admin'}])await assert.rejects(f.service.status(u),/PUSH_FORBIDDEN/);
 for(const path of ['https://evil.com','//evil.com','/\\evil.com','/api/action'])await assert.rejects(f.service.create(f.admin,{title:'a',body:'b',path,requestId:'bad-path-384'}),/PUSH_INPUT_INVALID/);
});
test('broadcast snapshots active opt-in members; duplicate submissions do not send twice',async()=>{
 const f=fixture();assert.equal((await f.service.status(f.admin)).eligible,2);
 const first=await f.post(),second=await f.post();assert.equal(first.id,second.id);
 await f.service.deliver(first.id);await f.service.deliver(first.id);assert.equal(f.sent.length,2);
 const history=(await f.service.status(f.admin)).history;assert.equal(history[0].accepted,2);assert.equal(history[0].status,'complete');
});
test('opt-out before delivery is honored and queued notices do not leak after account switch',async()=>{
 const f=fixture(),job=await f.post();f.h.delete(GP.devices('one'));f.v.set(GP.binding('web-two'),'another');await f.service.deliver(job.id);assert.equal(f.sent.length,0);
});
test('one repeatedly failing browser does not prevent later chunks from receiving a broadcast',async()=>{
 const f=fixture({broken:'one'});
 for(const id of ['three','four','five','six']){await f.command(['SADD',WEB_MEMBERS,id]);f.h.set(GP.devices(id),{['web-'+id]:JSON.stringify({kind:'web',subscription:{endpoint:'https://fcm.googleapis.com/send/'+id},at:1})});f.v.set(GP.binding('web-'+id),id);}
 const job=await f.post();for(let i=0;i<4;i++)await assert.rejects(f.service.deliver(job.id),/PUSH_RETRY/);
 await f.service.deliver(job.id);await f.service.deliver(job.id);
 const row=(await f.service.status(f.admin)).history[0];assert.equal(row.status,'complete');assert.equal(row.failed,1);assert.equal(f.sent.length,5);
});
