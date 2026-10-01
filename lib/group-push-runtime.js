import {QueueClient} from '@vercel/queue';
import {createGroupPushService} from './group-push-service.js';
import {sendFcm,firebaseConfigured} from './push-fcm.js';
import {getUser} from './rebuild-store.js';
import {createWebPushService} from './web-push-service.js';
const queue=new QueueClient({region:'iad1'});
export const groupPushService=command=>createGroupPushService({command,getUser:id=>getUser(command,id),configured:true,send:async(device,payload)=>{
 if(device?.kind==='web')return createWebPushService({command}).send(device,payload);
 if(!firebaseConfigured())throw Error('PUSH_NOT_CONFIGURED');
 return sendFcm(device,payload);
},enqueue:async id=>{if(process.env.VERCEL_ENV==='production')await queue.send('completion-push',{groupPushId:id},{retentionSeconds:86400});}});
