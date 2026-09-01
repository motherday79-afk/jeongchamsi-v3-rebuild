function clean(v){return String(v||'').trim().replace(/\/+$/,'');}

export function createRedisCommand(url,token){
  const base=clean(url), auth=clean(token);
  if(!/^https:\/\//i.test(base) || !auth){
    const error=new Error('STORAGE_MISSING'); error.code='STORAGE_MISSING'; throw error;
  }
  return async function command(args){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try{
      let response;
      try{
        response=await fetch(base,{method:'POST',headers:{Authorization:`Bearer ${auth}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:controller.signal});
      }catch(cause){const e=new Error('STORAGE_NETWORK');e.code='STORAGE_NETWORK';e.cause=cause;throw e;}
      const body=await response.json().catch(()=>({}));
      if(!response.ok || body?.error){const e=new Error(body?.error||`REDIS_${response.status}`);e.code=response.status===401||response.status===403?'STORAGE_AUTH':'STORAGE_REQUEST';throw e;}
      return body.result;
    }finally{clearTimeout(timer);}
  };
}

export function legacyRedisCommand(){
  return createRedisCommand(process.env.JCS_LEGACY_REDIS_REST_URL,process.env.JCS_LEGACY_REDIS_REST_TOKEN);
}

export function rebuildRedisCommand(){
  return createRedisCommand(process.env.JCS_REBUILD_REDIS_REST_URL,process.env.JCS_REBUILD_REDIS_REST_TOKEN);
}
