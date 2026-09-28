import {QueueClient} from '@vercel/queue';
import {flushCompletionPush} from '../lib/push-runtime.js';
import {rebuildRedisCommand} from '../lib/redis-rest.js';
const queue=new QueueClient({region:'iad1'});
export default queue.handleNodeCallback(async input=>{
 const result=await flushCompletionPush(rebuildRedisCommand(),input?.events);
 if(result.failed)throw Error('PUSH_RETRY');
},{visibilityTimeoutSeconds:120,retry:()=>({afterSeconds:60})});
