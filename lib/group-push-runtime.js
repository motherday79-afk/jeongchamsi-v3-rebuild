import {QueueClient} from '@vercel/queue';
import {createGroupPushService} from './group-push-service.js';
import {sendFcm,firebaseConfigured} from './push-fcm.js';
import {getUser} from './rebuild-store.js';
const queue=new QueueClient({region:'iad1'});
export const groupPushService=command=>createGroupPushService({command,getUser:id=>getUser(command,id),configured:firebaseConfigured(),send:firebaseConfigured()?sendFcm:undefined,enqueue:async id=>{if(process.env.VERCEL_ENV==='production')await queue.send('completion-push',{groupPushId:id},{retentionSeconds:86400});}});
