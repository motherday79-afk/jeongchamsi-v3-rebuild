import {createRankScheduler,enqueueRank} from '../lib/now-rank-runtime.js';
import {startRankQueueRequest} from '../lib/now-rank-queue-worker.js';

export default async function handler(req,res){
  const result=await startRankQueueRequest(req,{createScheduler:createRankScheduler,enqueue:enqueueRank});
  res.statusCode=result.status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(result.data));
}
