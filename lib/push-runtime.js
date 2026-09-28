import {createPushService} from './push-service.js';
import {sendFcm,firebaseConfigured} from './push-fcm.js';
import {getUser} from './rebuild-store.js';
import {SCHEDULE_KEY} from './now-rank-schedule.js';
import {INTELLIGENCE_KEYS as K} from './intelligence-keys.js';
import {rebuildRedisCommand} from './redis-rest.js';
import {HUMAN_POLL_KEYS} from './human-poll-service.js';
import {QueueClient} from '@vercel/queue';
import {operationEvent,watchdogProblems,watchdogRecovery} from './update-notifications.js';
import {randomUUID} from 'node:crypto';
const queue=new QueueClient({region:'iad1'});
export async function enqueueCompletionPush(extra=[]){
 if(process.env.VERCEL_ENV!=='production'||!firebaseConfigured())return;
 let stored=[];
 try{stored=await completionEvents(rebuildRedisCommand());}catch(error){if(!extra.length)throw error;}
 const events=[...stored,...extra];
 if(events.length)await queue.send('completion-push',{events},{retentionSeconds:86400});
}
export const pushService=command=>createPushService({command,getUser:id=>getUser(command,id),send:firebaseConfigured()?sendFcm:undefined});
async function completionEvents(command){
 const read=async key=>JSON.parse(await command(['GET',key])||'null');
 const [rank,polls]=await Promise.all([read(SCHEDULE_KEY),read(HUMAN_POLL_KEYS.snapshot)]),events=[];
 const snapshot=await command(['GET',K.publicPointer]),version=snapshot?await read(K.version(snapshot)):null;
 if(version?.publishedAt)events.push({id:`rank:${snapshot}`,kind:'rank',at:Number(version.publishedAt)});
 else if(rank?.status==='COMPLETED')events.push({id:`rank:${rank.snapshotId}`,kind:'rank',at:rank.completedAt});
 if(['FAILED','SKIPPED'].includes(rank?.status))events.push(operationEvent('rank',rank.status==='SKIPPED'?'skipped':'run',Number(rank.completedAt)));
 events.push(...(polls?.notifications||[]));
 events.push(...(polls?.operationNotifications||[]));
 if(!polls?.notifications&&polls?.publication)events.push({id:`poll:${polls.publication.id}`,kind:'poll',at:polls.publication.at});
 return events;
}
export async function monitorUpdatePush(command,{now=Date.now()}={}){
 const key='jcsr2:push:v1:watchdog',lock=key+':lock',token=randomUUID();
 if(await command(['SET',lock,token,'NX','EX','120'])!=='OK')return {busy:true};
 try{
 const read=async key=>JSON.parse(await command(['GET',key])||'null');
 const [rank,polls,previous]=await Promise.all([read(SCHEDULE_KEY),read(HUMAN_POLL_KEYS.snapshot),read(key)]);
 const problems=watchdogProblems({now,rank,polls}),recovery=watchdogRecovery(previous?.active,{now,rank,polls});
 const active=[...(previous?.active||[]).filter(e=>!recovery.some(r=>r.target===e.target)&&!problems.some(p=>p.target===e.target)),...problems];
 const events=[...(previous?.events||[]),...problems,...recovery].filter(e=>now-e.at<86400000).filter((e,i,a)=>a.findIndex(v=>v.id===e.id)===i);
 // Persist before delivery so transient FCM errors do not swallow operational events.
 await command(['SET',key,JSON.stringify({active,events,checkedAt:now})]);
 const all=[...await completionEvents(command),...events];
 if(all.length)await queue.send('completion-push',{events:all},{retentionSeconds:86400});
 return {queued:all.length,problems:problems.length};
 }finally{await command(['EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",'1',lock,token]);}
}
export async function flushCompletionPush(command,queuedEvents){
 if(process.env.VERCEL_ENV!=='production'||!firebaseConfigured())return {configured:false,sent:0};
 const events=Array.isArray(queuedEvents)?queuedEvents:await completionEvents(command);
 return {configured:true,...await pushService(command).deliver(events)};
}
