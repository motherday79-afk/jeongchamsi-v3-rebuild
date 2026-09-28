import {createPushService} from './push-service.js';
import {sendFcm,firebaseConfigured} from './push-fcm.js';
import {getUser} from './rebuild-store.js';
import {SCHEDULE_KEY} from './now-rank-schedule.js';
import {INTELLIGENCE_KEYS as K} from './intelligence-keys.js';
import {rebuildRedisCommand} from './redis-rest.js';
import {HUMAN_POLL_KEYS} from './human-poll-service.js';
import {QueueClient} from '@vercel/queue';
const queue=new QueueClient({region:'iad1'});
export async function enqueueCompletionPush(){
 if(process.env.VERCEL_ENV!=='production'||!firebaseConfigured())return;
 const events=await completionEvents(rebuildRedisCommand());
 if(events.length)await queue.send('completion-push',{events},{retentionSeconds:86400});
}
export const pushService=command=>createPushService({command,getUser:id=>getUser(command,id),send:firebaseConfigured()?sendFcm:undefined});
async function completionEvents(command){
 const read=async key=>JSON.parse(await command(['GET',key])||'null');
 const [rank,polls]=await Promise.all([read(SCHEDULE_KEY),read(HUMAN_POLL_KEYS.snapshot)]),events=[];
 const snapshot=await command(['GET',K.publicPointer]),version=snapshot?await read(K.version(snapshot)):null;
 if(version?.publishedAt)events.push({id:`rank:${snapshot}`,kind:'rank',at:Number(version.publishedAt)});
 else if(rank?.status==='COMPLETED')events.push({id:`rank:${rank.snapshotId}`,kind:'rank',at:rank.completedAt});
 events.push(...(polls?.notifications||[]));
 if(!polls?.notifications&&polls?.publication)events.push({id:`poll:${polls.publication.id}`,kind:'poll',at:polls.publication.at});
 return events;
}
export async function flushCompletionPush(command,queuedEvents){
 if(process.env.VERCEL_ENV!=='production'||!firebaseConfigured())return {configured:false,sent:0};
 const events=Array.isArray(queuedEvents)?queuedEvents:await completionEvents(command);
 return {configured:true,...await pushService(command).deliver(events)};
}
