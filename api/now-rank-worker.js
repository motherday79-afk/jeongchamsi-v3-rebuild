import {rankQueue,createRankScheduler,enqueueRank} from '../lib/now-rank-runtime.js';
import {processRankQueueMessage} from '../lib/now-rank-queue-worker.js';
import {flushCompletionPush} from '../lib/push-runtime.js';
import {rebuildRedisCommand} from '../lib/redis-rest.js';

export default rankQueue.handleNodeCallback(async input=>{
  if(process.env.VERCEL_ENV!=='production')return;
  const result=await processRankQueueMessage(input,{scheduler:createRankScheduler(),enqueue:enqueueRank});
  if(result.complete){const push=await flushCompletionPush(rebuildRedisCommand());if(push.failed)throw Error('PUSH_RETRY');}
},{visibilityTimeoutSeconds:120,retry:()=>({afterSeconds:30})});
