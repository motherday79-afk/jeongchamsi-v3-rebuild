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
      if(!response.ok || body?.error){const e=new Error(body?.error||`REDIS_${response.status}`);e.code=response.status===401||response.status===403?'STORAGE_AUTH':'STORAGE_REQUEST';throw e;}
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
      const error=new Error('STORAGE_REQUEST'); error.code='STORAGE_REQUEST'; error.cause=cause; throw error;
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
