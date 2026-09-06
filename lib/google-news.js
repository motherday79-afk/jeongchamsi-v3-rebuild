const decodeXml=value=>String(value||'').replace(/^<!\[CDATA\[|\]\]>$/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim();
const tag=(xml,name)=>{const match=String(xml||'').match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return decodeXml(match?.[1]||'');};
const description=value=>decodeXml(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,360);
const DAY=86_400_000;
const normalized=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[^0-9a-z가-힣]/g,'');

export function googleNewsFingerprint(item={}){return `${normalized(item.title).slice(0,180)}::${normalized(item.source).slice(0,80)}`;}

export function parseGoogleNewsRss(xml,limit=20){
  const blocks=String(xml||'').match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  return blocks.slice(0,Math.min(50,Math.max(1,Number(limit)||20))).map(block=>({
    title:tag(block,'title'),description:description(tag(block,'description')),url:tag(block,'link'),publishedAt:tag(block,'pubDate'),source:tag(block,'source')||'Google 뉴스'
  })).filter(item=>item.title&&item.url);
}

export async function fetchGoogleNews(person,options={}){
  const name=String(person?.name||'').trim();
  if(!name){const error=new Error('POLITICIAN_NAME_MISSING');error.code='POLITICIAN_NAME_MISSING';throw error;}
  const fetchImpl=options.fetchImpl||fetch,nowValue=Number((options.now||Date.now)()),windows=['1d','7d','30d'],queries=windows.map(window=>`${name} when:${window}`),merged=[];
  for(const queryText of queries){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(options.timeoutMs)||8000));
    const query=new URLSearchParams({q:queryText,hl:'ko',gl:'KR',ceid:'KR:ko'}),url=`https://news.google.com/rss/search?${query}`;
    try{
      const response=await fetchImpl(url,{method:'GET',headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:controller.signal});
      if(!response?.ok){const error=new Error(`GOOGLE_NEWS_HTTP_${Number(response?.status)||0}`);error.code=error.message;error.status=Number(response?.status)||0;throw error;}
      merged.push(...parseGoogleNewsRss(await response.text(),options.limit||50));
    }catch(cause){
      if(cause?.code)throw cause;
      const error=new Error(cause?.name==='AbortError'?'GOOGLE_NEWS_TIMEOUT':'GOOGLE_NEWS_NETWORK');error.code=error.message;throw error;
    }finally{clearTimeout(timer);}
  }
  if(!merged.length){const error=new Error('GOOGLE_NEWS_RESULT_EMPTY');error.code='GOOGLE_NEWS_RESULT_EMPTY';throw error;}
  const nameKey=normalized(name),exclusions=new Set((options.exclusions||[]).map(String)),unique=new Map();let excludedCount=0;
  for(const item of merged){
    const stamp=Date.parse(item.publishedAt),age=nowValue-stamp;if(!Number.isFinite(stamp)||age<0||age>30*DAY)continue;
    const identity=normalized(`${item.title} ${item.description}`);if(!identity.includes(nameKey))continue;
    const fingerprint=googleNewsFingerprint(item);if(exclusions.has(fingerprint)||exclusions.has(`source:${item.title}`)){excludedCount+=1;continue;}
    if(!unique.has(fingerprint))unique.set(fingerprint,{...item,fingerprint});
  }
  const items=[...unique.values()].sort((left,right)=>Date.parse(right.publishedAt)-Date.parse(left.publishedAt));
  const count=days=>items.filter(item=>{const age=nowValue-Date.parse(item.publishedAt);return age>=0&&age<=days*DAY;}).length;
  return {provider:'GOOGLE_NEWS_RSS',personId:String(person?.id||''),query:queries[2],queries,queryBasis:'Google News RSS · 최근 1일/7일/30일',collectedAt:new Date(nowValue).toISOString(),periodCounts:{h24:count(1),d7:count(7),d30:count(30)},excludedCount,items,source:{url:`https://news.google.com/search?q=${encodeURIComponent(`${name} when:30d`)}&hl=ko&gl=KR&ceid=KR:ko`,label:'Google News RSS'}};
}
