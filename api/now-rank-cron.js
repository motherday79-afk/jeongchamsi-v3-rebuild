import {waitUntil} from '@vercel/functions';
import {rebuildRedisCommand} from '../lib/redis-rest.js';
import {createIntelligenceService} from '../lib/intelligence-service.js';
import {createNowRankSchedule} from '../lib/now-rank-schedule.js';
import {nowRankCronRequest} from '../lib/now-rank-cron-http.js';

export default async function handler(req,res){
  const result=await nowRankCronRequest(req,{waitUntil,createScheduler:()=>{
    const command=rebuildRedisCommand();
    return createNowRankSchedule({command,createService:()=>createIntelligenceService({command,requireRankingSources:true,timeoutMs:2500,retryDelays:[0,250]})});
  }});
  res.statusCode=result.status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(result.data));
}
