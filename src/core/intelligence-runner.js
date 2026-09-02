const TERMINAL=new Set(['COMPLETED','COMPLETED_WITH_ERRORS','FAILED']);
const TRANSIENT_STORAGE_ERRORS=new Set(['STORAGE_REQUEST','STORAGE_NETWORK']);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));

export function createIntelligenceAutoResumeGuard(){
  const attempted=new Set();
  return {
    claim(kind){const key=String(kind||'');if(!key||attempted.has(key))return false;attempted.add(key);return true;},
    mark(kind){const key=String(kind||'');if(key)attempted.add(key);},
  };
}

async function runStepWithRetry(step,options){
  const delays=Array.isArray(options.retryDelays)&&options.retryDelays.length?options.retryDelays:[0,1000,2500];
  let lastError='INTELLIGENCE_STEP_FAILED';
  for(let attempt=0;attempt<delays.length;attempt+=1){
    if(attempt>0)await (options.sleep||sleep)(delays[attempt]);
    const result=await step();
    if(result?.ok)return result;
    lastError=String(result?.error||'INTELLIGENCE_STEP_FAILED');
    if(!TRANSIENT_STORAGE_ERRORS.has(lastError))break;
  }
  throw new Error(lastError);
}

export async function runIntelligenceAction(auth,kind,options={}){
  if(!['collect','publish'].includes(kind))throw new Error('INTELLIGENCE_JOB_KIND_INVALID');
  const start=()=>kind==='collect'?auth.intelligenceCollectStart():auth.intelligencePublishStart();
  const step=()=>kind==='collect'?auth.intelligenceCollectStep():auth.intelligencePublishStep();
  let job=null;
  if(!options.resume){const started=await start();if(!started?.ok)throw new Error(started?.error||'INTELLIGENCE_START_FAILED');job=started.job;options.onProgress?.(job);}
  for(let count=0;count<100;count++){
    if(job&&TERMINAL.has(job.status))return job;
    const result=await runStepWithRetry(step,options);job=result.job;options.onProgress?.(job);
    if(job&&TERMINAL.has(job.status))return job;
  }
  throw new Error('INTELLIGENCE_STEP_LIMIT_EXCEEDED');
}
