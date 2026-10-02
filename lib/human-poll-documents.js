import {createHash} from 'node:crypto';
const fail=()=>{throw Error('HUMAN_POLL_DOCUMENT_FORMAT');};
const compact=s=>String(s).replace(/[\s\u0000]/g,'');
export function isNbsApprovalPage(text){const t=compact(String(text).normalize('NFKC')).toUpperCase();return /(?:\[표1\]|<표1>|〈표1〉|【표1】)국정운영평가/.test(t)&&t.includes('T2')&&t.includes('B2');}
const aliases=[['overall','overall','전체'],['gender','남성','남성|남자'],['gender','여성','여성|여자'],['age','18~29','18[~∼–-]29세?'],...['30','40','50','60'].map(n=>['age',n+'대',`${n}(?:대|-${Number(n)+9}세)`]),['age','70대 이상','70(?:세|대)이상'],['region','서울','서울'],['region','인천·경기','인천[/·]?경기'],['region','대전·세종·충청','대전[/·]?세종[/·]?충청'],['region','강원·제주','강원[/·]?제주'],['region','강원','강원'],['region','부산·울산·경남','부산[/·]?울산[/·]?경남'],['region','대구·경북','대구[/·]?경북'],['region','광주·전라','전남광주[/·]?전북|광주[/·]?전라'],['region','제주','제주']];
function bucket(n,weightedN,values){
 const [positive,negative,undecided]=values;for(const v of values)if(v!==null&&(!Number.isFinite(v)||v<0||v>100))fail();
 if(values.every(v=>v!==null)&&Math.abs(positive+negative+undecided-100)>1.01)fail();
 return {n,weightedN,positive,negative,undecided,status:Object.fromEntries(Object.entries({n,weightedN,positive,negative,undecided}).map(([k,v])=>[k,v==null?'not_provided':'verified']))};
}
export function parseApprovalTable(provider,text){
 if(!/대통령직무수행평가|대통령국정수행평가|국정운영평가/.test(compact(text)))fail();
 const out={gender:{},age:{},region:{}};
 for(const raw of text.split('\n')){
  // Whitespace around slash is an artefact of PDF text positioning.
  const line=raw.replace(/\s*\/\s*/g,'/').replace(/([가-힣])\s+(?=[가-힣])/g,'$1');
  for(const [group,name,pattern] of aliases){
   const label=new RegExp(pattern.replaceAll('세','\\s*세').replaceAll('대','\\s*대').replaceAll('이상','\\s*이상'));
   const match=line.match(label);if(!match)continue;
   // No cross-tab intersections such as 30대 남성; only the main demographic rows.
   const prefix=compact(line.slice(0,match.index));if(/\d.*(?:대|세)/.test(prefix)&&group==='gender')continue;
   let tail=line.slice(match.index+match[0].length).replace(/^[\s◈▣]+/,'');
   const nums=tail.match(/\(?[\d,]+(?:\.\d+)?\)?%?|(?<!\S)-(?!\S)/g)||[];
   const values=nums.map(x=>x==='-'?null:Number(x.replace(/[(),%]/g,'')));
   const count=provider==='gallup'?7:provider==='nbs'?10:8;if(values.length<count)continue;
   const n=values[0],weightedN=provider==='realmeter'?null:values[1];if(!Number.isInteger(n)||n<1||weightedN!==null&&(!Number.isInteger(weightedN)||weightedN<1))continue;
   const v=provider==='gallup'?values.slice(2,5):provider==='nbs'?[values[7],values[8],values[6]]:values.slice(5,8);
   const b=bucket(n,weightedN,v);if(group==='overall'){if(out.overall&&JSON.stringify(out.overall)!==JSON.stringify(b))fail();out.overall=b;}else if(!out[group][name])out[group][name]=b;
   break;
  }
 }
 if(!out.overall||out.overall.positive==null||out.overall.negative==null)fail();return out;
}
export async function pdfPages(bytes){
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const doc=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true,isEvalSupported:false,stopAtErrors:true}).promise;
 try{
  if(doc.numPages>180)fail();const pages=[];
  for(let i=1;i<=Math.min(doc.numPages,24);i++){
   const page=await doc.getPage(i),rows=new Map();
   for(const item of (await page.getTextContent()).items){if(!item.str)continue;const y=Math.round(item.transform[5]/3)*3;const row=rows.get(y)||[];row.push({x:item.transform[4],s:item.str});rows.set(y,row);}
   pages.push([...rows].sort((a,b)=>b[0]-a[0]).map(([,row])=>row.sort((a,b)=>a.x-b.x).map(x=>x.s).join(' ')).join('\n'));
  }return pages;
 }finally{await doc.destroy();}
}
const hosts=new Set(['www.gallup.co.kr','gallup.co.kr','www.realmeter.net','realmeter.net','nbsurvey.kr','www.nbsurvey.kr']);
export function documentUrl(raw,base){const u=new URL(raw,base);if(!hosts.has(u.hostname)||!['http:','https:'].includes(u.protocol)||u.port||u.username||u.password)throw Error('HUMAN_POLL_DOCUMENT_URL');return u;}
export async function fetchDocument(raw,{fetch=globalThis.fetch,signal,method='GET',body}={}){
 let url=documentUrl(raw);for(let i=0;i<4;i++){
  const response=await fetch(url,{method,body,redirect:'manual',signal:signal||AbortSignal.timeout(15000),headers:{'User-Agent':'Mozilla/5.0 (compatible; JCS-PollCollector/2.0)'}});
  if([301,302,303,307,308].includes(response.status)){url=documentUrl(response.headers.get('location'),url);continue;}
  if(!response.ok)throw Error('HUMAN_POLL_DOCUMENT_HTTP');
  const reader=response.body?.getReader();if(!reader)fail();const chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16000000){await reader.cancel();fail();}chunks.push(value);}}finally{reader.releaseLock();}
  return Buffer.concat(chunks);
 }fail();
}
export function tableFromPages(provider,pages){
 let selected=pages.filter(text=>{
  const t=compact(text);return provider==='gallup'?t.includes('대통령직무수행평가')&&/전체.*?\d/.test(t)&&t.includes('가중적용'):provider==='nbs'?isNbsApprovalPage(text):t.includes('대통령국정수행평가')&&t.includes('잘모름')&&t.includes('전체');
 });
 if(provider!=='realmeter')selected=selected.slice(0,1);
 if(!selected.length)fail();const results=parseApprovalTable(provider,selected.join('\n'));
 if(Object.keys(results.gender).length!==2||Object.keys(results.age).length!==6||Object.keys(results.region).length<7)fail();
 return {results,pages:pages.map((_,i)=>selected.includes(pages[i])?i+1:null).filter(Boolean).join(', ')};
}
export function applyDocument(poll,provider,pages,url,bytes){
 const table=tableFromPages(provider,pages),overall=table.results.overall;
 if(overall.n!==poll.sampleSize||['positive','negative','undecided'].some(k=>poll.results.overall[k]!=null&&poll.results.overall[k]!==overall[k]))fail();
 return {...poll,results:table.results,evidence:{url,pages:table.pages,note:'발표기관의 원본 통계표에서 자동 추출·검증했습니다. 원문 반올림 및 기관별 비공개 기준을 유지합니다.'},provenance:{...poll.provenance,parserVersion:'official-document-v1',contentHash:createHash('sha256').update(bytes).digest('hex')}};
}
