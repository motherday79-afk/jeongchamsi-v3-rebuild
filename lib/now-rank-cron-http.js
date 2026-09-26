import {timingSafeEqual} from 'node:crypto';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const response=(status,data)=>({status,data});

export async function continueNowRank(ticket,{secret,fetchImpl=fetch,sleep=pause}={}){
  if(!secret)throw Error('CONTINUATION_AUTH_MISSING');
  for(let attempt=0;attempt<3;attempt++){
    try{
      const res=await fetchImpl('https://jeongchamsi-v3-rebuild.vercel.app/api/now-rank-cron',{
        method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},
        body:JSON.stringify(ticket),redirect:'error',signal:AbortSignal.timeout(6000)
      });
      if(res.status===202&&(await res.json())?.ok===true)return;
    }catch{}
    if(attempt<2)await sleep(250*(attempt+1));
  }
  throw Error('CONTINUATION_FAILED');
}

export async function nowRankCronRequest(req,{secret=process.env.CRON_SECRET,environment=process.env.VERCEL_ENV,createScheduler,waitUntil,fetchImpl=fetch,sleep=pause}={}){
  if(!['GET','POST'].includes(req.method))return response(405,{ok:false,error:'METHOD_NOT_ALLOWED'});
  const expected=Buffer.from(`Bearer ${secret||''}`),actual=Buffer.from(String(req.headers?.authorization||''));
  if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return response(401,{ok:false,error:'UNAUTHORIZED'});
  if(environment!=='production')return response(409,{ok:false,error:'PRODUCTION_ONLY'});
  try{
    let input;
    if(req.method==='POST'){
      if(Buffer.byteLength(typeof req.body==='string'?req.body:JSON.stringify(req.body||{}))>512)return response(400,{ok:false,error:'INVALID_TICKET'});
      try{input=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{}
      if(!/^[a-f0-9-]{36}$/.test(input?.runId||'')||!Number.isInteger(input?.step)||input.step<0||input.step>2000)return response(400,{ok:false,error:'INVALID_TICKET'});
      if(input.deliveryAttempt!==undefined&&(!Number.isInteger(input.deliveryAttempt)||input.deliveryAttempt<0||input.deliveryAttempt>30))return response(400,{ok:false,error:'INVALID_TICKET'});
    }
    const scheduler=createScheduler();
    const current=req.method==='GET'?await scheduler.start():input;
    if(current)waitUntil((async()=>{
      let next;
      for(let attempt=0;attempt<3;attempt++){
        try{next=await scheduler.step(current);break;}
        catch{
          if(attempt<2){await sleep(1000*(attempt+1));continue;}
          // A busy lease can belong to a rejected manual request, not necessarily
          // another scheduled worker. Re-deliver rather than silently losing work.
          if((current.deliveryAttempt||0)<30)next={...current,deliveryAttempt:(current.deliveryAttempt||0)+1};
          else {await scheduler.fail(current,'STEP_DELIVERY_EXHAUSTED').catch(()=>{});console.error('[now-rank-cron]',{error:'STEP_DELIVERY_EXHAUSTED'});}
        }
      }
      if(next){
        try{await continueNowRank(next,{secret,fetchImpl,sleep});}
        catch{await scheduler.fail(next,'CONTINUATION_FAILED').catch(()=>{});console.error('[now-rank-cron]',{error:'CONTINUATION_FAILED'});}
      }
    })());
    return response(202,{ok:true,scheduled:'12:00 Asia/Seoul',queued:!!current});
  }catch(error){return response(error?.message==='RANKING_BUSY'?409:503,{ok:false,error:error?.message==='RANKING_BUSY'?'RANKING_BUSY':'SCHEDULE_UNAVAILABLE'});}
}
