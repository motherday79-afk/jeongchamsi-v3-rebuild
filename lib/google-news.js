const decodeXml=value=>String(value||'').replace(/^<!\[CDATA\[|\]\]>$/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim();
const tag=(xml,name)=>{const match=String(xml||'').match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return decodeXml(match?.[1]||'');};
const description=value=>decodeXml(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,360);

export function parseGoogleNewsRss(xml,limit=20){
  const blocks=String(xml||'').match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  return blocks.slice(0,Math.min(50,Math.max(1,Number(limit)||20))).map(block=>({
    title:tag(block,'title'),description:description(tag(block,'description')),url:tag(block,'link'),publishedAt:tag(block,'pubDate'),source:tag(block,'source')||'Google 뉴스'
  })).filter(item=>item.title&&item.url);
}

export async function fetchGoogleNews(person,options={}){
  const name=String(person?.name||'').trim();
  if(!name){const error=new Error('POLITICIAN_NAME_MISSING');error.code='POLITICIAN_NAME_MISSING';throw error;}
  const fetchImpl=options.fetchImpl||fetch,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(options.timeoutMs)||8000));
  const query=new URLSearchParams({q:`"${name}" 정치`,hl:'ko',gl:'KR',ceid:'KR:ko'}),url=`https://news.google.com/rss/search?${query}`;
  try{
    const response=await fetchImpl(url,{method:'GET',headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:controller.signal});
    if(!response?.ok){const error=new Error(`GOOGLE_NEWS_HTTP_${Number(response?.status)||0}`);error.code=error.message;error.status=Number(response?.status)||0;throw error;}
    const items=parseGoogleNewsRss(await response.text(),options.limit||40);
    if(!items.length){const error=new Error('GOOGLE_NEWS_RESULT_EMPTY');error.code='GOOGLE_NEWS_RESULT_EMPTY';throw error;}
    return {provider:'GOOGLE_NEWS_RSS',personId:String(person?.id||''),query:`"${name}" 정치`,collectedAt:new Date(Number((options.now||Date.now)())).toISOString(),items,source:{url:`https://news.google.com/search?q=${encodeURIComponent(name)}&hl=ko&gl=KR&ceid=KR:ko`}};
  }catch(cause){
    if(cause?.code)throw cause;
    const error=new Error(cause?.name==='AbortError'?'GOOGLE_NEWS_TIMEOUT':'GOOGLE_NEWS_NETWORK');error.code=error.message;throw error;
  }finally{clearTimeout(timer);}
}
