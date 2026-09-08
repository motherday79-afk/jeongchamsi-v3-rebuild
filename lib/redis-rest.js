const storageFailure=(cause)=>{
 const text=String(cause?.message||cause||''),code=/max.*(?:size|memory)|memory.*(?:limit|exceed)|storage.*(?:limit|exceed)|OOM|database.*(?:size|full)/i.test(text)?'STORAGE_CAPACITY':/(?:command|request|rate).*limit|too many requests/i.test(text)?'STORAGE_RATE_LIMIT':/bandwidth.*(?:limit|exceed)/i.test(text)?'STORAGE_BANDWIDTH_LIMIT':'STORAGE_REQUEST';
 const diagnostic={STORAGE_CAPACITY:'Redis 저장 용량 한도 초과',STORAGE_RATE_LIMIT:'Redis 요청량 한도 초과',STORAGE_BANDWIDTH_LIMIT:'Redis 전송량 한도 초과',STORAGE_REQUEST:'Redis 요청 실패 · 제공자 원인 미확인'}[code];
 return Object.assign(new Error(code),{code,diagnostic,cause});
};
function clean(v){return String(v||'').trim().replace(/\/+$/,'');}

let nativeClientState=null;

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
      if(!response.ok || body?.error){const e=storageFailure(new Error(body?.error||`REDIS_${response.status}`));if(response.status===401||response.status===403){e.code='STORAGE_AUTH';e.diagnostic='Redis 인증 실패';}if(response.status===429){e.code='STORAGE_RATE_LIMIT';e.diagnostic='Redis 요청량 한도 초과';}throw e;}
      return body.result;
    }finally{clearTimeout(timer);}
  };
}

export function createNativeRedisCommand(url,options={}){
  const connection=String(url||'').trim();
  if(!/^rediss?:\/\//i.test(connection)){
    const error=new Error('STORAGE_MISSING'); error.code='STORAGE_MISSING'; throw error;
  }
  return async function command(args){
    let activeClient=null;
    try{
      if(!nativeClientState || nativeClientState.url!==connection || !nativeClientState.client?.isOpen){
        const createClient=options.createClient||(await import('redis')).createClient;
        const client=createClient({url:connection,socket:{connectTimeout:5000,reconnectStrategy:retries=>retries>2?false:Math.min(100*retries,500)}});
        activeClient=client;
        client.on('error',()=>{});
        await client.connect();
        nativeClientState={url:connection,client};
      }else activeClient=nativeClientState.client;
      return await activeClient.sendCommand((Array.isArray(args)?args:[]).map(value=>String(value)));
    }catch(cause){
      if(nativeClientState?.url===connection)nativeClientState=null;
      try{activeClient?.destroy?.();}catch{}
      throw storageFailure(cause);
    }
  };
}

export function legacyRedisCommand(){
  return createRedisCommand(process.env.JCS_LEGACY_REDIS_REST_URL,process.env.JCS_LEGACY_REDIS_REST_TOKEN);
}

export function rebuildRedisCommand(){
  const nativeUrl=process.env.JCS_REBUILD_REDIS_REDIS_URL||process.env.JCS_REBUILD_REDIS_URL;
  if(nativeUrl) return createNativeRedisCommand(nativeUrl);
  return createRedisCommand(process.env.JCS_REBUILD_REDIS_REST_URL,process.env.JCS_REBUILD_REDIS_REST_TOKEN);
}
