import {rankQueue,createRankScheduler,enqueueRank} from '../lib/now-rank-runtime.js';
import {processRankQueueMessage} from '../lib/now-rank-queue-worker.js';

export default rankQueue.handleNodeCallback(async input=>{
  if(process.env.VERCEL_ENV!=='production')return;
  await processRankQueueMessage(input,{scheduler:createRankScheduler(),enqueue:enqueueRank});
},{visibilityTimeoutSeconds:120,retry:()=>({afterSeconds:30})});
