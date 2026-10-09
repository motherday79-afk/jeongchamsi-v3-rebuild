import {QueueClient} from '@vercel/queue';
import {createSignupPush} from './signup-push.js';
import {pushService} from './push-runtime.js';
import {readUsers} from './rebuild-store.js';
import {createWebPushService} from './web-push-service.js';
const queue=new QueueClient({region:'iad1'});
export const signupPushService=command=>createSignupPush({command,readUsers:()=>readUsers(command),nativeDeliver:events=>pushService(command).deliver(events),webSend:(device,payload)=>createWebPushService({command}).send(device,payload),enqueue:async id=>{
 if(process.env.VERCEL_ENV==='production')await queue.send('completion-push',{signupPushId:id},{retentionSeconds:86400});
}});
