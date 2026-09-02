import { fetchNaverKeywordVolume } from './naver-search-ads.js';
import { fetchGoogleNews } from './google-news.js';

const PROFILE_FIELDS=['id','type','roleLabel','name','party','region','jurisdiction','terms','committee','termStart','termEnd','office','electionLabel','source','isVacant'];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));
const retryable=error=>error?.status===429||error?.status>=500||/TIMEOUT|NETWORK/.test(String(error?.code||error?.message||''));
const safeError=(source,error,attempts)=>({source,code:String(error?.code||error?.message||'SOURCE_ERROR').slice(0,100),attempts});

async function withRetry(source,operation,delays=[0,250,750]){
  let lastError=null,attempts=0;
  const schedule=Array.isArray(delays)?delays:[0,250,750];
  for(let index=0;index<Math.max(1,schedule.length);index+=1){
    attempts=index+1;
    if(index>0)await sleep(schedule[index]);
    try{return {value:await operation(),error:null,attempts};}catch(error){lastError=error;if(!retryable(error))break;}
  }
  return {value:null,error:safeError(source,lastError,attempts),attempts};
}

export async function collectPoliticianRaw(person,context={},options={}){
  const shared={fetchImpl:options.fetchImpl||fetch,env:options.env||process.env,now:options.now||Date.now,timeoutMs:options.timeoutMs};
  const delays=options.retryDelays===undefined?[0,250,750]:options.retryDelays;
  const [searchAds,news]=await Promise.all([
    withRetry('NAVER_SEARCH_ADS',()=>fetchNaverKeywordVolume(person,shared),delays),
    withRetry('GOOGLE_NEWS',()=>fetchGoogleNews(person,shared),delays)
  ]);
  const officialProfile=Object.fromEntries(PROFILE_FIELDS.filter(key=>person?.[key]!==undefined).map(key=>[key,person[key]]));
  return {
    personId:String(person?.id||''),snapshotId:String(context?.snapshotId||''),collectedAt:new Date(Number((options.now||Date.now)())).toISOString(),
    officialProfile,
    searchAds:searchAds.value,
    news:news.value,
    officialContext:context?.officialContext||null,
    sources:[searchAds.value?.source,news.value?.source,{type:'OFFICIAL_PROFILE',label:String(person?.source||'정참시 공식 프로필')}].filter(Boolean),
    sourceErrors:[searchAds.error,news.error].filter(Boolean)
  };
}

