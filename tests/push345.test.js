import test from 'node:test';
import assert from 'node:assert/strict';
import {createPushService} from '../lib/push-service.js';

function memory(){const strings=new Map(),hashes=new Map();return async([op,key,...args])=>{
 if(op==='GET')return strings.get(key)||null;
 if(op==='SET'){if(args.includes('NX')&&strings.has(key))return null;strings.set(key,args[0]);return 'OK';}
 if(op==='DEL')return strings.delete(key)?1:0;
 if(op==='HSET'){const h=hashes.get(key)||{};h[args[0]]=args[1];hashes.set(key,h);return 1;}
 if(op==='HGETALL')return Object.entries(hashes.get(key)||{}).flat();
 if(op==='HDEL'){delete (hashes.get(key)||{})[args[0]];return 1;}
 if(op==='EVAL'){if(strings.get(args[1])===args[2])strings.delete(args[1]);return 1;}
 throw Error(op);
};}
const admin={id:'owner',role:'admin',status:'active'},token='a'.repeat(140);
test('only active administrator can register and tokens stay private',async()=>{
 const service=createPushService({command:memory(),getUser:async()=>admin});
 await assert.rejects(service.register({id:'member',role:'member'},{token,enabled:true}),/FORBIDDEN/);
 assert.deepEqual(await service.register(admin,{token,enabled:true}),{ok:true,enabled:true});
});
test('same completion sends once, unchanged poll emits nothing, role removal prevents delivery',async()=>{
 let time=1000,user=admin;const sent=[],command=memory();
 const service=createPushService({command,now:()=>time,getUser:async()=>user,send:async(t,p)=>sent.push(p)});
 await service.register(admin,{token,enabled:true});time=2000;
 const event={id:'rank:one',kind:'rank',at:time};
 await service.deliver([event]);await service.deliver([event]);assert.equal(sent.length,1);
 user={...admin,role:'member'};await service.deliver([{...event,id:'rank:two'}]);assert.equal(sent.length,1);
});
test('failed send is retried and opted-out device does not receive later events',async()=>{
 let time=1000,calls=0;const service=createPushService({command:memory(),now:()=>time,getUser:async()=>admin,send:async()=>{if(++calls===1)throw Error('offline');}});
 await service.register(admin,{token,enabled:true});time=2000;const event={id:'poll:one',kind:'poll',at:time};
 await service.deliver([event]);await service.deliver([event]);assert.equal(calls,2);
 await service.register(admin,{token,enabled:false});await service.deliver([{...event,id:'poll:two'}]);assert.equal(calls,2);
});
test('newly registered device is not sent stale pre-registration completions',async()=>{
 let calls=0;const service=createPushService({command:memory(),now:()=>2000,getUser:async()=>admin,send:async()=>calls++});
 await service.register(admin,{token,enabled:true});await service.deliver([{id:'rank:old',kind:'rank',at:1000}]);assert.equal(calls,0);
});
