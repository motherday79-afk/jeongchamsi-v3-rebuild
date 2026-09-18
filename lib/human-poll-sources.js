import {createHash} from 'node:crypto';

const VERSION='official-html-v2';
const SOURCES=[{id:'gallup',institution:'한국갤럽',url:'https://www.gallup.co.kr/gallupdb/report.asp',discover:discoverGallup,parse:parseGallup},{id:'realmeter',institution:'리얼미터',url:'https://www.realmeter.net/',discover:discoverRealmeter,parse:parseRealmeter}];
const bad=()=>{throw Error('HUMAN_POLL_SOURCE_FORMAT');};
const hash=s=>createHash('sha256').update(s).digest('hex');
function allowed(raw){const u=new URL(raw),host=u.hostname.toLowerCase();const gallup=['www.gallup.co.kr','gallup.co.kr'].includes(host)&&u.protocol==='https:',realmeter=['www.realmeter.net','realmeter.net'].includes(host)&&['http:','https:'].includes(u.protocol);if(u.username||u.password||u.port||!(gallup||realmeter))throw Error('HUMAN_POLL_SOURCE_URL');return u;}
function entities(s){return s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';}).replace(/&(nbsp|amp|quot|apos|lt|gt|middot|plusmn|rarr);/g,(_,k)=>({nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',middot:'·',plusmn:'±',rarr:'→'})[k]);}
export const htmlText=s=>entities(String(s).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<!--[^]*?-->/g,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function date(y,m,d){const out=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(!/^20\d\d-\d\d-\d\d$/.test(out)||!Number.isFinite(Date.parse(out))||new Date(out).toISOString().slice(0,10)!==out)bad();return out;}
function needMatch(s,re){const m=s.match(re);if(!m)bad();return m;}
function number(s,re){const m=s.match(re);return m?Number(m[1].replaceAll(',','')):null;}
function overall(positive,negative,undecided,n){if(!Number.isInteger(n)||n<1||[positive,negative].some(x=>x===null)||[positive,negative,undecided].some(x=>x!==null&&(!Number.isFinite(x)||x<0||x>100))||positive+negative>101||(undecided!==null&&Math.abs(positive+negative+undecided-100)>1))bad();return {positive,negative,undecided,n};}
function base(html,url,provider,dates,n,results,method,extra={}){
 allowed(url);if(dates.startDate>dates.endDate||dates.endDate>dates.publishedDate)bad();
 return {id:provider==='gallup'?`gallup-${needMatch(url,/[?&]seqNo=(\d+)/)[1]}`:`realmeter-${hash(url).slice(0,20)}`,institution:provider==='gallup'?'한국갤럽':'리얼미터',title:`${provider==='gallup'?'한국갤럽':'리얼미터'} 대통령 직무수행 평가 (${dates.startDate}~${dates.endDate})`,topic:'presidential-approval',sourceUrl:url,question:'대통령 직무수행 평가',comparable:false,comparisonNote:'공식 보고서의 조사 주제입니다. 질문지 원문과 응답 척도·기간을 확인한 뒤 비교하세요.',...dates,sampleSize:n,method,results:{overall:results,gender:{},age:{},region:{}},provenance:{provider,parserVersion:VERSION,contentHash:hash(html),questionKind:'source-summary',transport:new URL(url).protocol.slice(0,-1)},...extra};
}
export function parseGallup(html,url){
 const t=htmlText(html),range=needMatch(t,/조사기간\s*:\s*(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})(?:일)?\s*[~∼～–-]\s*(?:(\d{1,2})월\s*)?(\d{1,2})일/);
 const pub=t.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(?:\([^)]*\))?\s*공개/)||html.match(/GallupKoreaDailyOpinion_\d+\((20\d{2})(\d{2})(\d{2})\)/);if(!pub)bad();
 const n=number(t,/조사대상\s*:\s*전국\s*만\s*18세\s*이상\s*([\d,]+)명/),scope=needMatch(t,/대통령\s*직무\s*수행\s*평가\s*:\s*긍정\s*([\d.]+)%\s*,\s*부정\s*([\d.]+)%/);
 const start=t.indexOf(scope[0]),body=t.slice(start).split(/정당\s*지지도\s*:/)[0].slice(0,2200),u=number(body,/([\d.]+)%\s*(?:는|가)?\s*의견을\s*유보/);
 const method=needMatch(t,/응답방식\s*:\s*(.{1,150}?)\s*[·/]?\s*조사대상/)[1];
 return base(html,url,'gallup',{startDate:date(range[1],range[2],range[3]),endDate:date(range[1],range[4]||range[2],range[5]),publishedDate:date(pub[1],pub[2],pub[3])},n,overall(Number(scope[1]),Number(scope[2]),u,n),method,{commissioner:'한국갤럽 자체 조사',responseRate:number(t,/응답률\s*:\s*([\d.]+)%/),marginOfError:number(t,/표본오차\s*:\s*±\s*([\d.]+)%/)});
}
export function parseRealmeter(html,url){
 const t=htmlText(html),pub=html.match(/<time\b[^>]*datetime=["'](20\d{2})-(\d{2})-(\d{2})T/i)||html.match(/article:published_time[^>]*content=["'](20\d{2})-(\d{2})-(\d{2})T/i);if(!pub)bad();
 const marker=t.search(/대통령\s*국정수행\s*평가/);if(marker<0)bad();const section=t.slice(marker,marker+9000),meta=(section.match(/대통령\s*국정수행\s*평가\s*조사는\s*(.{1,2200}?)(?=②|정당\s*지지도\s*조사는|정당\s*지지도)/)?.[1]||section.slice(0,3200));
 const range=meta.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]{0,35}(?:부터|[~∼～–-])\s*(?:(\d{1,2})월\s*)?(\d{1,2})일/)||section.match(/(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일[^\d]{0,35}(?:부터|[~∼～–-])\s*(?:(\d{1,2})월\s*)?(\d{1,2})일/);if(!range)bad();
 const n=number(meta,/전국\s*(?:만\s*)?18세\s*이상(?:\s*유권자)?\s*([\d,]+)명/)??number(section,/전국\s*(?:만\s*)?18세\s*이상(?:\s*유권자)?\s*([\d,]+)명/);
 const s=section.match(/(?:긍정(?:평가)?|잘함)\s*(?:은|이|는|:)??\s*([\d.]+)%[^]{0,700}?(?:부정(?:평가)?|잘못함)\s*(?:은|이|는|:)??\s*([\d.]+)%/);if(!s)bad();
 const body=section.split(/\[?\s*정당\s*지지도\s*\]?/)[0],u=number(body,/[‘'"“]?잘\s*모름[’'"”]?(?:\s*은|\s*이|\s*는|\s*:)??\s*([\d.]+)%/);
 const methodMatch=t.match(/(무선\s*\([^)]*\)\s*(?:ARS\s*)?자동응답\s*방식)/)||t.match(/(무선\s*\([^)]*\)\s*자동응답)/)||t.match(/((?:무선|유선)[^.!?]{0,100}(?:자동응답|ARS)[^.!?]{0,80})/);const method=methodMatch?methodMatch[1].trim():'자동응답 방식';
 const commissioner=(body.match(/([가-힣A-Za-z0-9· ]{2,50}?)\s*의뢰(?:로|를\s*받아|에\s*따라)/)?.[1]||'').trim();
 const p=base(html,url,'realmeter',{startDate:date(range[1],range[2],range[3]),endDate:date(range[1],range[4]||range[2],range[5]),publishedDate:date(pub[1],pub[2],pub[3])},n,overall(Number(s[1]),Number(s[2]),u,n),method,{commissioner,responseRate:number(meta,/([\d.]+)%의\s*응답률/)??number(meta,/응답률[^\d]{0,30}([\d.]+)%/),marginOfError:number(meta,/표본오차[^±]{0,140}±\s*([\d.]+)%/)});
 for(const [field,markerName,next] of [['region','권역별로','성별로'],['gender','성별로','연령대별로'],['age','연령대별로','이념성향별로']]){
  const subgroup=body.slice(body.indexOf('대통령 국정수행 평가 응답자 특성')).split(markerName)[1]?.split(next)[0]||'';
  for(const m of subgroup.matchAll(/([가-힣\d·\s]+)\([^)]*?→\s*([\d.]+)%\s*,\s*부정평가\s*([\d.]+)%\)/g)){const name=m[1].trim();if(name&&name.length<35){const positive=Number(m[2]),negative=Number(m[3]);if(positive<=100&&negative<=100&&positive+negative<=101)p.results[field][name]={positive,negative,undecided:null,n:null};}}
 }
 return p;
}
export function discoverGallup(html){const rows=[];for(const m of html.matchAll(/<a\b[^>]*onclick=["'][^>]*fn_viewContents\(['"](\d+)['"]\)[^>]*>([\s\S]*?)<\/a>/gi))if(/데일리\s*오피니언/.test(htmlText(m[2])))rows.push(`https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=${m[1]}`);return [...new Set(rows)];}
export function discoverRealmeter(html){const rows=[];for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){const label=htmlText(m[2]);if(!(/주간\s*(?:동향|집계|통계)/.test(label)&&/대통령|국정수행/.test(label)))continue;try{const u=allowed(new URL(entities(m[1]),'https://www.realmeter.net/'));if(/\.(?:pdf|jpe?g|png)(?:$|\?)/i.test(u.pathname))continue;u.hash='';rows.push(u.href);}catch{}}return [...new Set(rows)];}
export function parseRealmeterFeed(xml){
 if(!/<rss\b/i.test(xml))bad();const records=new Map();
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  try{
   const item=match[1],title=htmlText(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');
   if(!(/주간\s*(?:동향|집계|통계)/.test(title)&&/대통령|국정수행/.test(title)))continue;
   const raw=entities(item.match(/<link>([^<]+)<\/link>/i)?.[1]||'').trim();let url;
   try{url=allowed(raw);}catch{continue;}
   const stamp=Date.parse(item.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1]||'');if(!Number.isFinite(stamp))continue;
   const published=new Date(stamp+9*60*60*1000).toISOString().slice(0,10);
   const content=item.match(/<content:encoded>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content:encoded>/i)?.[1]||item.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/i)?.[1];if(!content)continue;
   const parsed=parseRealmeter(`<time datetime="${published}T00:00:00+09:00"></time>${content}`,url.href);parsed.provenance.contentHash=hash(content);records.set(parsed.id,parsed);
  }catch{}
 }
 if(!records.size)bad();return [...records.values()].sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate));
}
export async function fetchOfficialHtml(url,{fetch=globalThis.fetch,signal}={}){
 let u=allowed(url);const timeout=AbortSignal.timeout(12000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
 for(let i=0;i<4;i++){
  const res=await fetch(u.href,{redirect:'manual',signal:combined,credentials:'omit',headers:{Accept:'text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8','User-Agent':'Mozilla/5.0 (compatible; JCS-PollCollector/1.1)'}});
  if([301,302,303,307,308].includes(res.status)){const loc=res.headers.get('location');if(!loc)bad();u=allowed(new URL(loc,u).href);continue;}
  if(!res.ok)throw Error(`HUMAN_POLL_SOURCE_HTTP_${res.status}`);if(Number(res.headers.get('content-length'))>2*1024*1024)bad();
  const reader=res.body?.getReader();if(!reader)bad();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();bad();}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=Buffer.concat(chunks),charset=(res.headers.get('content-type')||'')+' '+bytes.subarray(0,700).toString('ascii');
  return new TextDecoder(/euc-kr|ks_c_5601|cp949/i.test(charset)?'euc-kr':'utf-8',{fatal:true}).decode(bytes);
 }throw Error('HUMAN_POLL_SOURCE_REDIRECT');
}
export async function collectOfficialPolls({fetch=globalThis.fetch,now=Date.now,limit=4}={}){
 const instant=new Date(typeof now==='function'?now():now).toISOString(),deadline=AbortSignal.timeout(24000);
 const diagnostic=(provider,stage,error)=>{const code=String(error?.cause?.code||error?.message||error?.name||'SOURCE_ERROR').replace(/[^a-zA-Z0-9_: .-]/g,'').slice(0,160);console.warn('HUMAN_POLL_SOURCE',JSON.stringify({provider,stage,code}));};
 const results=await Promise.all(SOURCES.map(async provider=>{
  let items=[],errors=0;const count=Math.max(1,Math.min(4,Number(limit)||4));
  if(provider.id==='realmeter')try{items=parseRealmeterFeed(await fetchOfficialHtml('https://www.realmeter.net/feed/',{fetch,signal:deadline})).slice(0,count).map(p=>{if(p.publishedDate>instant.slice(0,10))bad();return {...p,fetchedAt:instant};});}catch(error){diagnostic(provider.id,'feed',error);}
  if(!items.length)try{const index=await fetchOfficialHtml(provider.url,{fetch,signal:deadline}),urls=provider.discover(index).slice(0,count);if(!urls.length)bad();
   const fetched=await Promise.allSettled(urls.map(async url=>{const p=provider.parse(await fetchOfficialHtml(url,{fetch,signal:deadline}),url);if(p.publishedDate>instant.slice(0,10))bad();return {...p,fetchedAt:instant};}));
   items=fetched.filter(r=>r.status==='fulfilled').map(r=>r.value);errors=fetched.length-items.length;for(const r of fetched)if(r.status==='rejected')diagnostic(provider.id,'report',r.reason);
  }catch(error){errors++;diagnostic(provider.id,'index',error);}
  return {items,provider:{id:provider.id,institution:provider.institution,state:!items.length?'error':errors?'partial':'success',...(errors?{error:'공식 자료를 모두 확인하지 못했습니다. 이전 자료를 유지합니다.'}:{}),fetchedCount:items.length,checkedAt:instant}};
 }));
 return {items:results.flatMap(r=>r.items).sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)),providers:results.map(r=>r.provider)};
}
