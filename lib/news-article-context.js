// Optional, bounded public-page evidence. Failure never removes a news candidate.
const publishers=['khan.co.kr','yna.co.kr','yonhapnewstv.co.kr','newsis.com','news1.kr','joongang.co.kr','chosun.com','donga.com','hani.co.kr','hankookilbo.com','seoul.co.kr','segye.com','kmib.co.kr','munhwa.com','ohmynews.com','pressian.com','nocutnews.co.kr','ytn.co.kr','imbc.com','sbs.co.kr','kbs.co.kr','jtbc.co.kr','mbn.co.kr','tvchosun.com','mk.co.kr','hankyung.com','edaily.co.kr','mt.co.kr','asiae.co.kr','fnnews.com','sedaily.com','heraldcorp.com','kwnews.co.kr','kyeongin.com','kyeonggi.com','busan.com','imaeil.com','idomin.com','news.naver.com','n.news.naver.com'];
export function isAllowedArticleUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.hostname==='news.google.com'||publishers.some(host=>u.hostname===host||u.hostname.endsWith('.'+host)));}catch{return false;}
}
const plain=value=>String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g,s=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[s])).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):' ';}).replace(/\s+/g,' ').trim();
function mainBlock(html){
 const opening=html.match(/<(div|section|article)\b[^>]*(?:id|class)=["'][^"']*\b(?:story-news|articleBody|article-body|articleWrap|newsct_article|article_view|article_txt|article-content)\b[^"']*["'][^>]*>/i);
 if(!opening)return html.match(/<article\b(?![^>]*story-summary)[^>]*>([\s\S]*?)<\/article>/i)?.[1]||'';
 const start=opening.index+opening[0].length,rest=html.slice(start),tags=new RegExp(`<\\/?${opening[1]}\\b[^>]*>`,'gi');let depth=1;
 for(const tag of rest.matchAll(tags)){depth+=tag[0].startsWith('</')?-1:1;if(depth===0)return rest.slice(0,tag.index);}
 return '';
}
export function extractArticleContext(html=''){
 const cleaned=String(html).slice(0,800000).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
 const article=mainBlock(cleaned);
 // Never read captions from global sidebars / recommended stories when the main scope is unknown.
 const scope=article||'',found=[];
 for(const pattern of [/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi,/<(?:div|p|span|em|dd)\b[^>]*(?:class|id)=["'][^"']*(?:caption|photo[_-]?desc|img[_-]?desc)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|span|em|dd)>/gi]){
  for(const match of scope.matchAll(pattern)){const caption=plain(match[1]).slice(0,600);if(caption&&!found.includes(caption))found.push(caption);if(found.length>=8)break;}
 }
 let body=article?plain(article).slice(0,6000):'';
 // Structured articleBody avoids navigation / recommended-story text on publishers without <article>.
 if(!body)for(const match of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const queue=[JSON.parse(match[1])];for(let i=0;i<queue.length&&i<40;i++){const item=queue[i];if(item&&typeof item==='object'){if(typeof item.articleBody==='string'){body=plain(item.articleBody).slice(0,6000);break;}queue.push(...Object.values(item).filter(x=>x&&typeof x==='object'));}}}catch{}
  if(body)break;
 }
 return {body,captions:found.slice(0,8)};
}
async function boundedText(response){
 if(!response.body?.getReader){const text=await response.text();if(text.length>800000)throw Error('PAGE_TOO_LARGE');return text;}
 const reader=response.body.getReader(),chunks=[];let bytes=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>800000)throw Error('PAGE_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks).toString('utf8');
}
export async function readArticleContext(item,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(100,Math.min(2500,Number(options.timeoutMs)||1800))),fetchImpl=options.fetchImpl||fetch;
 const request=async(url,init={})=>{
  let current=url;
  for(let hop=0;hop<4;hop++){
   if(!isAllowedArticleUrl(current))throw Error('UNSUPPORTED_ORIGIN');
   const response=await fetchImpl(current,{...init,redirect:'manual',signal:controller.signal});
   if([301,302,303,307,308].includes(response.status)){const location=response.headers?.get('location');if(!location)throw Error('REDIRECT_EMPTY');current=new URL(location,current).href;continue;}
   if(!response.ok)throw Error(`HTTP_${response.status}`);
   return {url:current,text:await boundedText(response)};
  }
  throw Error('REDIRECT_LIMIT');
 };
 try{
  let result=await request(item.originalUrl||item.url);
  if(new URL(result.url).hostname==='news.google.com'){
   const id=new URL(result.url).pathname.match(/\/(?:articles|read)\/([A-Za-z0-9_-]+)$/)?.[1],signature=result.text.match(/data-n-a-sg="([^"]+)"/)?.[1],stamp=Number(result.text.match(/data-n-a-ts="(\d+)"/)?.[1]);
   if(!id||!signature||!stamp)throw Error('ORIGINAL_URL_UNAVAILABLE');
   // Public redirect protocol; if Google changes it or rate-limits, leave the candidate untouched.
   const context=[['en-US','US',['FINANCE_TOP_INDICES','WEB_TEST_1_0_0'],null,null,1,1,'US:en',null,180,null,null,null,null,null,0,null,null,[1608992183,723341000]],'en-US','US',1,[2,3,4,8],1,0,'655000234',0,0,null,0];
   const payload=[[['Fbv4je',JSON.stringify(['garturlreq',context,id,stamp,signature]),null,'generic']]];
   const rpc=await request('https://news.google.com/_/DotsSplashUi/data/batchexecute',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'f.req':JSON.stringify(payload)})});
   let original='';for(const line of rpc.text.split('\n')){try{const rows=JSON.parse(line);for(const row of rows){if(row?.[1]!=='Fbv4je')continue;const value=JSON.parse(row[2]);if(value[0]==='garturlres')original=value[1];}}catch{}}
   if(!original||new URL(original).hostname==='news.google.com')throw Error('ORIGINAL_URL_UNAVAILABLE');
   result=await request(original);
  }
  const extracted=extractArticleContext(result.text);
  return {status:extracted.body||extracted.captions.length?'read':'empty',originalUrl:result.url,...extracted};
 }catch(error){return {status:'unavailable',reason:controller.signal.aborted?'TIME_LIMIT':String(error.message).slice(0,60),body:'',captions:[]};}
 finally{clearTimeout(timer);}
}
