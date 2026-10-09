import {QueueClient} from '@vercel/queue';
import {groupPushService} from '../lib/group-push-runtime.js';
import {signupPushService} from '../lib/signup-push-runtime.js';
import {webBroadcastService} from '../lib/web-broadcast-runtime.js';
import {flushCompletionPush} from '../lib/push-runtime.js';
import {rebuildRedisCommand} from '../lib/redis-rest.js';
const queue=new QueueClient({region:'iad1'});
export default queue.handleNodeCallback(async input=>{
 if(input?.signupPushId){await signupPushService(rebuildRedisCommand()).deliver(input.signupPushId);return;}
 if(input?.webBroadcastId){await webBroadcastService(rebuildRedisCommand()).deliver(input.webBroadcastId);return;}
 if(input?.groupPushId){await groupPushService(rebuildRedisCommand()).deliver(input.groupPushId);return;}
 const result=await flushCompletionPush(rebuildRedisCommand(),input?.events);
 if(result.failed)throw Error('PUSH_RETRY');
},{visibilityTimeoutSeconds:180,retry:()=>({afterSeconds:60})});
