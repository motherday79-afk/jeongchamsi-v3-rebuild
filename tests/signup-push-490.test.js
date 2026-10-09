import test from 'node:test';
import assert from 'node:assert/strict';
import {createSignupPush,signupEvent,SIGNUP_PENDING} from '../lib/signup-push.js';
import {createPushService} from '../lib/push-service.js';
import {GP} from '../lib/group-push-service.js';
function memory(){const strings=new Map(),hashes=new Map(),sets=new Map();return async([op,key,...a])=>{
 if(op==='GET')return strings.get(key)||null;
 if(op==='SET'){if(a.includes('NX')&&strings.has(key))return null;strings.set(key,a[0]);return 'OK';}
 if(op==='HSET'){const h=hashes.get(key)||{};h[a[0]]=a[1];hashes.set(key,h);return 1;}
 if(op==='HGET')return (hashes.get(key)||{})[a[0]]||null;
 if(op==='HGETALL')return Object.entries(hashes.get(key)||{}).flat();
 if(op==='HDEL'){delete (hashes.get(key)||{})[a[0]];return 1;}
 if(op==='SADD'){const s=sets.get(key)||new Set();s.add(a[0]);sets.set(key,s);return 1;}
 if(op==='SMEMBERS')return [...(sets.get(key)||[])];
 if(op==='SREM')return sets.get(key)?.delete(a[0]);
 if(op==='EVAL'){if(strings.get(a[1])===a[2])strings.delete(a[1]);return 1;}
 throw Error(op);
};}
const owner={id:'admin',role:'admin',status:'active'},staff={id:'staff',role:'admin',status:'active'},member={id:'new-member',nickname:'새 시민',createdAt:'2026-10-10T00:00:00Z'},at=Date.parse(member.createdAt);
test('native signup reaches only superadmins and retries do not duplicate accepted sends',async()=>{
 const command=memory(),users={admin:owner,staff},sent=[];
 let now=at-1000;const service=createPushService({command,getUser:async id=>users[id],now:()=>now,send:async(t,p)=>sent.push(p)});
 await service.register(owner,{token:'a'.repeat(100),enabled:true});await service.register({...staff,membershipTier:'superadmin'},{token:'b'.repeat(100),enabled:true});now=at;
 await service.deliver([signupEvent(member)]);await service.deliver([signupEvent(member)]);
 assert.equal(sent.length,1);assert.equal(sent[0].path,'/admin?tab=members');assert.match(sent[0].body,/새 시민/);
});
test('durable signup job recovers from queue failure and web recipients are owner-only',async()=>{
 const command=memory(),users={admin:owner,staff},sent=[];let queueDown=true;
 const service=createSignupPush({command,readUsers:async()=>users,now:()=>at,nativeDeliver:async()=>({sent:0,failed:0}),enqueue:async()=>{if(queueDown)throw Error('offline');},webSend:async(d,p)=>sent.push(p)});
 for(const u of [owner,staff]){await command(['HSET',GP.devices(u.id),'web-'+u.id,JSON.stringify({kind:'web',at:at-1000})]);await command(['SET',GP.binding('web-'+u.id),u.id]);}
 await assert.rejects(service.publish(member),/offline/);assert.equal((await command(['SMEMBERS',SIGNUP_PENDING])).length,1);
 queueDown=false;assert.equal(await service.recover(),1);
 await service.deliver(signupEvent(member).id);await service.deliver(signupEvent(member).id);
 assert.equal(sent.length,1);assert.equal((await command(['SMEMBERS',SIGNUP_PENDING])).length,0);
});
