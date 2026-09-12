import {articlePublisher} from '../src/ui/intelligence-narratives.js';
import { createHash } from 'node:crypto';
const decodeXml=value=>String(value||'').replace(/^<!\[CDATA\[|\]\]>$/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim();
const tag=(xml,name)=>{const match=String(xml||'').match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return decodeXml(match?.[1]||'');};
const description=value=>decodeXml(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,360);
const DAY=86_400_000;
const normalized=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/[^0-9a-z가-힣]/g,'');

// Publisher display normalization must not change saved exclusions or collection-ledger identity.
export function googleNewsFingerprint(item={}){return `${normalized(item.title).slice(0,180)}::${normalized(item.sourceOriginal||item.source).slice(0,80)}`;}

export function parseGoogleNewsRss(xml,limit=20){
  const blocks=String(xml||'').match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  return blocks.slice(0,Math.min(50,Math.max(1,Number(limit)||20))).map(block=>{
    const sourceUrl=decodeXml(block.match(/<source\b[^>]*\burl\s*=\s*["']([^"']+)["']/i)?.[1]||'');
    const item={title:tag(block,'title'),description:description(tag(block,'description')),url:tag(block,'link'),publishedAt:tag(block,'pubDate'),source:tag(block,'source')||'Google 뉴스',...(sourceUrl?{sourceUrl}:{})};
    const publisher=articlePublisher(item);return publisher&&publisher!==item.source?{...item,sourceOriginal:item.source,source:publisher}:item;
  }).filter(item=>item.title&&item.url);
}

export async function fetchGoogleNews(person,options={}){
  const name=String(person?.name||'').trim();
  if(!name){const error=new Error('POLITICIAN_NAME_MISSING');error.code='POLITICIAN_NAME_MISSING';throw error;}
  const fetchImpl=options.fetchImpl||fetch,nowValue=Number((options.now||Date.now)()),windows=['1d','7d','30d'],today=koreanDay(nowValue),start=Date.parse(`${today}T00:00:00+09:00`)-30*DAY,ranges=Array.from({length:5},(_,index)=>({from:start+index*7*DAY,to:Math.min(start+(index+1)*7*DAY,Date.parse(`${today}T00:00:00+09:00`)+DAY)})).filter(row=>row.from<row.to),queries=ranges.map(row=>`${name} after:${koreanDay(row.from-DAY)} before:${koreanDay(row.to)}`),merged=[],coverage=[];
  const deadline=Date.now()+Math.max(1000,Number(options.totalTimeoutMs)||6000);
  async function collectQuery(queryIndex){
    const queryText=queries[queryIndex],remaining=deadline-Date.now();if(remaining<=0){const range=ranges[queryIndex];for(let stamp=range.from;stamp<range.to;stamp+=DAY)coverage.push({date:koreanDay(stamp),collected:false});return;}
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(remaining,Math.max(1000,Number(options.timeoutMs)||3500)));
    const query=new URLSearchParams({q:queryText,hl:'ko',gl:'KR',ceid:'KR:ko'}),url=`https://news.google.com/rss/search?${query}`;
    try{
      const response=await fetchImpl(url,{method:'GET',headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:controller.signal});
      if(!response?.ok){const error=new Error(`GOOGLE_NEWS_HTTP_${Number(response?.status)||0}`);error.code=error.message;error.status=Number(response?.status)||0;throw error;}
      const xml=await response.text();if(!/<rss(?:\s|>)/i.test(xml)||!/<channel(?:\s|>)/i.test(xml)||!/<\/channel>/i.test(xml))throw new Error('GOOGLE_NEWS_INVALID_RSS');
      const rows=parseGoogleNewsRss(xml,options.limit||50);merged.push(...rows);
      const currentRange=ranges[queryIndex];if(rows.length>=Math.min(50,options.limit||50)&&currentRange.to-currentRange.from>DAY){for(let from=currentRange.from;from<currentRange.to;from+=DAY){ranges.push({from,to:from+DAY});queries.push(`${name} after:${koreanDay(from-DAY)} before:${koreanDay(from+DAY)}`);}}
      const range=ranges[queryIndex];for(let stamp=range.from;stamp<range.to;stamp+=DAY)coverage.push({date:koreanDay(stamp),collected:true,truncated:rows.length>=Math.min(50,options.limit||50)});
    }catch(cause){
      const range=ranges[queryIndex];for(let stamp=range.from;stamp<range.to;stamp+=DAY)coverage.push({date:koreanDay(stamp),collected:false});
      return;
    }finally{clearTimeout(timer);}
  }
  for(let index=0;index<queries.length;index+=5)await Promise.all(queries.slice(index,index+5).map((_,offset)=>collectQuery(index+offset)));
  if(!coverage.some(row=>row.collected)){const error=new Error('GOOGLE_NEWS_RESULT_EMPTY');error.code='GOOGLE_NEWS_RESULT_EMPTY';throw error;}
  const resolvedCoverage=new Map();for(const row of coverage){if(row.collected||!resolvedCoverage.has(row.date))resolvedCoverage.set(row.date,row);}
  const nameKey=normalized(name),exclusions=new Set((options.exclusions||[]).map(String)),unique=new Map();let excludedCount=0;
  for(const item of merged){
    const stamp=Date.parse(item.publishedAt),age=nowValue-stamp;if(!Number.isFinite(stamp)||age<0||stamp<start)continue;
    const identity=normalized(`${item.title} ${item.description}`);if(!identity.includes(nameKey))continue;
    const fingerprint=googleNewsFingerprint(item);if(exclusions.has(fingerprint)||exclusions.has(`source:${item.title}`)){excludedCount+=1;continue;}
    if(!unique.has(fingerprint))unique.set(fingerprint,{...item,fingerprint});
  }
  const items=[...unique.values()].sort((left,right)=>Date.parse(right.publishedAt)-Date.parse(left.publishedAt));
  const count=days=>items.filter(item=>{const age=nowValue-Date.parse(item.publishedAt);return age>=0&&age<=days*DAY;}).length;
  return {provider:'GOOGLE_NEWS_RSS',personId:String(person?.id||''),query:queries[0],queries,coverage:[...resolvedCoverage.values()],queryBasis:'Google News RSS · 한국 날짜 기준 30일 전~오늘, 기간 분할 수집',collectedAt:new Date(nowValue).toISOString(),periodCounts:{h24:count(1),d7:count(7),d30:count(30)},excludedCount,items,source:{url:`https://news.google.com/search?q=${encodeURIComponent(`${name} when:30d`)}&hl=ko&gl=KR&ceid=KR:ko`,label:'Google News RSS'}};
}

export const koreanDay=value=>new Date(Number(value)+9*3600000).toISOString().slice(0,10);
// One bounded ledger per person. Fingerprints deduplicate repeated collection without retaining article bodies.
export function mergeNewsHistory(previous={},news={},referenceAt){
  const now=Date.parse(referenceAt),today=koreanDay(now),start=Date.parse(`${today}T00:00:00+09:00`)-30*DAY;
  const prior=new Map((previous.daily||[]).map(row=>[row.date,row]));
  const coverage=new Map((news.coverage||[]).map(row=>[row.date,row]));
  const incoming=new Map();for(const row of news.items||[]){const stamp=Date.parse(row.publishedAt||row.date);if(!Number.isFinite(stamp)||stamp>now||stamp<start)continue;const date=koreanDay(stamp),keys=incoming.get(date)||[];keys.push(createHash('sha256').update(row.fingerprint||googleNewsFingerprint(row)).digest('base64url').slice(0,16));incoming.set(date,keys);}
  return {version:1,daily:Array.from({length:31},(_,index)=>{const date=koreanDay(start+index*DAY),old=prior.get(date)||{},scan=coverage.get(date),all=[...new Set([...(old.keys||[]),...(incoming.get(date)||[])])].sort(),keys=all.slice(0,64),collected=old.collected===true||scan?.collected===true,overflow=old.overflow===true||all.length>64,truncated=overflow||(scan?.collected===true?scan.truncated===true:old.truncated===true);return {date,keys,collected,truncated,...(overflow?{overflow:true}:{}),count:keys.length?keys.length:collected&&!truncated?0:null};})};
}
