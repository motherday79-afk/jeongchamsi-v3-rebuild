import {QueueClient} from '@vercel/queue';
import {createWebBroadcastService} from './web-broadcast-service.js';
import {createWebPushService} from './web-push-service.js';
import {getUser} from './rebuild-store.js';
const queue=new QueueClient({region:'iad1'});
export const webBroadcastService=command=>createWebBroadcastService({command,getUser:id=>getUser(command,id),send:(d,p)=>createWebPushService({command}).send(d,p),enqueue:async id=>{
 if(process.env.VERCEL_ENV==='production')await queue.send('completion-push',{webBroadcastId:id},{retentionSeconds:86400});
}});
