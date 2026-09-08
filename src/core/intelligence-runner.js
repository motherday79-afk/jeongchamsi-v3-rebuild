const TERMINAL=new Set(['COMPLETED','COMPLETED_WITH_ERRORS','FAILED']);
const TRANSIENT_STORAGE_ERRORS=new Set(['STORAGE_REQUEST','STORAGE_NETWORK']);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));

export function createIntelligenceAutoResumeGuard(){
  const attempted=new Set();
  return {
    claim(kind){const key=String(kind||'');if(!key||attempted.has(key))return false;attempted.add(key);return true;},
    release(kind){attempted.delete(String(kind||''));},
    mark(kind){const key=String(kind||'');if(key)attempted.add(key);},
  };
}

async function runStepWithRetry(step,options){
  const delays=Array.isArray(options.retryDelays)&&options.retryDelays.length?options.retryDelays:[0,1000,2500];
  let lastError='INTELLIGENCE_STEP_FAILED',lastDetail='';
  for(let attempt=0;attempt<delays.length;attempt+=1){
    if(attempt>0)await (options.sleep||sleep)(delays[attempt]);
    if(options.shouldContinue?.()===false)throw new Error('INTELLIGENCE_VIEW_PAUSED');
    let result;try{result=await step();}catch(error){if(!(error instanceof TypeError)&&!TRANSIENT_STORAGE_ERRORS.has(error?.code))throw error;result={ok:false,error:'STORAGE_NETWORK'};}
    if(result?.ok)return result;
    lastError=String(result?.error||'INTELLIGENCE_STEP_FAILED');lastDetail=[result?.stage,result?.diagnostic].filter(Boolean).join(' · ');
    if(['STORAGE_CAPACITY','STORAGE_RATE_LIMIT','STORAGE_BANDWIDTH_LIMIT','STORAGE_AUTH'].includes(lastError)||(!TRANSIENT_STORAGE_ERRORS.has(lastError)&&!(Number(result?.status)>=500)))break;
  }
  throw new Error([lastDetail,lastError].filter(Boolean).join(' · '));
}

export async function runIntelligenceAction(auth,kind,options={}){
  if(!['collect','publish'].includes(kind))throw new Error('INTELLIGENCE_JOB_KIND_INVALID');
  const start=()=>kind==='collect'?auth.intelligenceCollectStart():auth.intelligencePublishStart();
  const step=()=>kind==='collect'?auth.intelligenceCollectStep():auth.intelligencePublishStep();
  let job=null;
  if(!options.resume){const started=await start();if(!started?.ok)throw new Error([started?.stage,started?.diagnostic,started?.error||'INTELLIGENCE_START_FAILED'].filter(Boolean).join(' · '));job=started.job;options.onProgress?.(job);}
  for(let count=0;count<100;count++){
    if(job&&TERMINAL.has(job.status))return job;
    if(options.shouldContinue?.()===false)throw new Error('INTELLIGENCE_VIEW_PAUSED');
    const result=await runStepWithRetry(step,options);job=result.job;options.onProgress?.(job);
    if(kind==='publish'&&result?.finalized?.ok===false)throw new Error('PUBLICATION_FINALIZE_FAILED');
    if(job&&TERMINAL.has(job.status))return job;
  }
  throw new Error('INTELLIGENCE_STEP_LIMIT_EXCEEDED');
}
