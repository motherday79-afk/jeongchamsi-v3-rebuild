import {QueueClient} from '@vercel/queue';
import {rebuildRedisCommand} from './redis-rest.js';
import {createIntelligenceService} from './intelligence-service.js';
import {createNowRankSchedule} from './now-rank-schedule.js';

export const rankQueue=new QueueClient({region:'iad1'});
export function createRankScheduler(){
  const command=rebuildRedisCommand();
  return createNowRankSchedule({command,createService:()=>createIntelligenceService({command,requireRankingSources:true,timeoutMs:2500,retryDelays:[0,250]})});
}
export async function enqueueRank(ticket){
  await rankQueue.send('now-rank-refresh',ticket,{idempotencyKey:`${ticket.runId}-${ticket.step}`,retentionSeconds:21600});
}
