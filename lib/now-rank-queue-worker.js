import {timingSafeEqual} from 'node:crypto';

export async function startRankQueueRequest(req,{secret=process.env.CRON_SECRET,environment=process.env.VERCEL_ENV,createScheduler,enqueue}){
  if(req.method!=='GET')return {status:405,data:{ok:false,error:'METHOD_NOT_ALLOWED'}};
  const expected=Buffer.from(`Bearer ${secret||''}`),actual=Buffer.from(String(req.headers?.authorization||''));
  if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return {status:401,data:{ok:false,error:'UNAUTHORIZED'}};
  if(environment!=='production')return {status:409,data:{ok:false,error:'PRODUCTION_ONLY'}};
  try{
    const ticket=await createScheduler().start();
    // Respond only after the independent queue has durably accepted the work.
    if(ticket)await enqueue(ticket);
    return {status:202,data:{ok:true,queued:!!ticket}};
  }catch(error){
    console.error('[now-rank-queue-start]',{code:error?.code||error?.name||'QUEUE_START_FAILED'});
    return {status:503,data:{ok:false,error:'QUEUE_START_FAILED'}};
  }
}

export async function processRankQueueMessage(input,{scheduler,enqueue}){
  if(!input||typeof input.runId!=='string'||!Number.isInteger(input.step)||input.step<0||input.step>2000)throw Error('INVALID_RANK_TICKET');
  // If a function ended after persisting progress but before enqueueing, replay
  // returns the stored next step. It never repeats the finished collection batch.
  const next=await scheduler.step(input,{recoverDelivery:true});
  if(next)await enqueue(next);
  // Throwing leaves the message unacknowledged so Vercel retries it independently.
}
