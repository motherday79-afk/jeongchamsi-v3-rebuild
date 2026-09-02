const TERMINAL=new Set(['COMPLETED','COMPLETED_WITH_ERRORS','FAILED']);

export async function runIntelligenceAction(auth,kind,options={}){
  if(!['collect','publish'].includes(kind))throw new Error('INTELLIGENCE_JOB_KIND_INVALID');
  const start=()=>kind==='collect'?auth.intelligenceCollectStart():auth.intelligencePublishStart();
  const step=()=>kind==='collect'?auth.intelligenceCollectStep():auth.intelligencePublishStep();
  let job=null;
  if(!options.resume){const started=await start();if(!started?.ok)throw new Error(started?.error||'INTELLIGENCE_START_FAILED');job=started.job;options.onProgress?.(job);}
  for(let count=0;count<100;count++){
    if(job&&TERMINAL.has(job.status))return job;
    const result=await step();if(!result?.ok)throw new Error(result?.error||'INTELLIGENCE_STEP_FAILED');job=result.job;options.onProgress?.(job);
    if(job&&TERMINAL.has(job.status))return job;
  }
  throw new Error('INTELLIGENCE_STEP_LIMIT_EXCEEDED');
}
