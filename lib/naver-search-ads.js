import crypto from 'node:crypto';

const REQUIRED_KEYS=Object.freeze(['NAVER_AD_ACCESS_LICENSE','NAVER_AD_SECRET_KEY','NAVER_AD_CUSTOMER_ID']);
const clean=value=>String(value??'').trim();

export function naverCredentialStatus(env=process.env){
  const missing=REQUIRED_KEYS.filter(key=>!clean(env?.[key]));
  return {configured:missing.length===0,missing};
}

export function createNaverSignature({timestamp,method='GET',uri='/keywordstool',secret}){
  const message=`${String(timestamp)}.${String(method).toUpperCase()}.${String(uri)}`;
  return crypto.createHmac('sha256',String(secret||'')).update(message,'utf8').digest('base64');
}

function volumeFact(raw){
  if(typeof raw==='number'&&Number.isFinite(raw))return {raw,value:Math.max(0,raw),range:null};
  const text=clean(raw);
  if(/^<\s*10$/.test(text))return {raw:text,value:null,range:{min:0,max:9}};
  const numeric=Number(text.replaceAll(',',''));
  if(Number.isFinite(numeric))return {raw,value:Math.max(0,numeric),range:null};
  return {raw:text||null,value:null,range:null};
}

async function fetchJson(url,options,fetchImpl,timeoutMs){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{...options,signal:controller.signal});
    if(!response?.ok){const error=new Error(`NAVER_SEARCH_ADS_HTTP_${Number(response?.status)||0}`);error.code=`NAVER_SEARCH_ADS_HTTP_${Number(response?.status)||0}`;error.status=Number(response?.status)||0;throw error;}
    return await response.json();
  }catch(cause){
    if(cause?.code)throw cause;
    const error=new Error(cause?.name==='AbortError'?'NAVER_SEARCH_ADS_TIMEOUT':'NAVER_SEARCH_ADS_NETWORK');error.code=error.message;throw error;
  }finally{clearTimeout(timer);}
}

export async function fetchNaverKeywordVolume(person,options={}){
  const env=options.env||process.env,status=naverCredentialStatus(env);
  if(!status.configured){const error=new Error('NAVER_CREDENTIALS_MISSING');error.code='NAVER_CREDENTIALS_MISSING';error.missing=status.missing;throw error;}
  const fetchImpl=options.fetchImpl||fetch,now=options.now||Date.now,timestamp=String(now()),uri='/keywordstool',method='GET';
  const keyword=clean(person?.name).replace(/\s+/g,'');
  if(!keyword){const error=new Error('POLITICIAN_NAME_MISSING');error.code='POLITICIAN_NAME_MISSING';throw error;}
  const query=new URLSearchParams({hintKeywords:keyword,showDetail:'1'}),url=`https://api.searchad.naver.com${uri}?${query}`;
  const headers={
    'Content-Type':'application/json; charset=UTF-8',
    'X-Timestamp':timestamp,
    'X-API-KEY':clean(env.NAVER_AD_ACCESS_LICENSE),
    'X-Customer':clean(env.NAVER_AD_CUSTOMER_ID),
    'X-Signature':createNaverSignature({timestamp,method,uri,secret:env.NAVER_AD_SECRET_KEY})
  };
  const data=await fetchJson(url,{method,headers},fetchImpl,Math.max(1000,Number(options.timeoutMs)||8000));
  const rows=Array.isArray(data?.keywordList)?data.keywordList:[],normalize=value=>clean(value).replace(/\s+/g,'').toLocaleLowerCase('ko-KR');
  const row=rows.find(item=>normalize(item?.relKeyword)===normalize(keyword))||rows[0];
  if(!row){const error=new Error('NAVER_KEYWORD_RESULT_EMPTY');error.code='NAVER_KEYWORD_RESULT_EMPTY';throw error;}
  const pc=volumeFact(row.monthlyPcQcCnt),mobile=volumeFact(row.monthlyMobileQcCnt);
  return {
    provider:'NAVER_SEARCH_ADS',personId:String(person?.id||''),keyword,collectedAt:new Date(Number(timestamp)).toISOString(),
    volume:{pc:pc.value,mobile:mobile.value,total:pc.value!==null&&mobile.value!==null?pc.value+mobile.value:null,pcRaw:pc.raw,mobileRaw:mobile.raw,...(pc.range?{pcRange:pc.range}:{}),...(mobile.range?{mobileRange:mobile.range}:{})},
    source:{method,endpoint:uri,url:'https://api.searchad.naver.com/keywordstool'}
  };
}
