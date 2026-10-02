import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {discoverGallup,discoverRealmeter,parseGallup,fetchOfficialHtml,htmlText} from './human-poll-sources.js';
import {documentUrl,fetchDocument,pdfPages} from './human-poll-documents.js';
import {parseNbsMetadata} from './human-poll-document-collector.js';
const VERSION='official-party-document-v1';
const names={democratic:'더불어민주당',ppp:'국민의힘',rebuilding:'조국혁신당',reform:'개혁신당',progressive:'진보당','basic-income':'기본소득당','social-democratic':'사회민주당',other:'기타 정당',none:'지지 정당 없음',undecided:'모름·무응답'};
const institutions={gallup:'한국갤럽',realmeter:'리얼미터',nbs:'NBS'};
const compact=s=>String(s).replace(/[\s\u0000]/g,'');
const fail=stage=>{throw Error('PARTY_POLL_'+stage);};
const hash=s=>createHash('sha256').update(s).digest('hex');
const date=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
export function parsePartyTable(provider,pages){
 let found;
 for(let i=0;i<pages.length;i++){
  const t=compact(pages[i]);
  const match=provider==='gallup'?t.includes('정당지지도(현재지지하는정당)')&&t.includes('가중적용'):provider==='realmeter'?t.includes('정당지지도')&&t.includes('잘모름')&&t.includes('민주당'):provider==='nbs'?/^(?:<표\d+>|\[표\d+\])정당지지도/.test(t.normalize('NFKC')):false;
  if(!match)continue;
  const line=pages[i].split('\n').find(s=>/^(?:[◈▣\s]*)전체(?:[◈▣\s]*)[\d(]/.test(s));if(!line)continue;
  const header=compact(pages[i].slice(0,pages[i].indexOf(line)));
  if(!['진보당','국민','조국','개혁'].every(s=>header.includes(s)))fail('TABLE_HEADER');
  // PDF text is row-ordered: these signatures bind the numeric column order to
  // the verified header layout. A changed layout must fail, not relabel values.
  const signature=provider==='gallup'?'사례수사례수더불어국민의조국개혁기본사회이외무당층없음응답':provider==='realmeter'?'더불어국민조국개혁기타구분진보당없음잘모름무당층조사가중값민주당의힘혁신당신당정당완료적용':'더불어국민의힘조국개혁신당진보당그외지지하는모름/계완료적용민주당혁신당다른정당이무응답';
  if(!header.includes(signature))fail('TABLE_HEADER_ORDER');
  const numbers=(line.match(/\d[\d,]*(?:\.\d+)?/g)||[]).map(n=>Number(n.replaceAll(',','')));
  let ids,values;
  if(provider==='gallup'){
   if(!['기본','소득당','사회','민주당','무당층','없음','거절'].every(s=>header.includes(s))||numbers.length!==13)fail('TABLE_COLUMNS');
   ids=['democratic','ppp','rebuilding','progressive','reform','basic-income','social-democratic','other','none','undecided'];values=[...numbers.slice(2,10),...numbers.slice(11,13)];
  }else if(provider==='realmeter'){
   if(!['없음','잘모름','무당층'].every(s=>header.includes(s))||numbers.length!==11)fail('TABLE_COLUMNS');
   ids=['democratic','ppp','rebuilding','progressive','reform','other','none','undecided'];values=numbers.slice(2,10);
  }else{
   if(!['정당이','없다','무응답'].every(s=>header.includes(s))||numbers.length!==11||numbers[10]!==100)fail('TABLE_COLUMNS');
   ids=['democratic','ppp','rebuilding','reform','progressive','other','none','undecided'];values=numbers.slice(2,10);
  }
  if(!Number.isInteger(numbers[0])||numbers[0]<1||values.some(x=>!Number.isFinite(x)||x<0||x>100)||Math.abs(values.reduce((a,b)=>a+b,0)-100)>2)fail('TABLE_VALUES');
  const result={sampleSize:numbers[0],parties:ids.map((id,j)=>({id,name:names[id],value:values[j]})),pages:[i+1]};
  if(found){if(JSON.stringify(found.parties)!==JSON.stringify(result.parties)||found.sampleSize!==result.sampleSize)fail('TABLE_CONFLICT');found.pages.push(i+1);}else found=result;
 }
 if(!found)fail('TABLE_MISSING');return found;
}
export function parsePartyMetadata(provider,html,url,pages=[],publishedDate){
 if(provider==='gallup'){
  const p=parseGallup(html,url);return Object.fromEntries(['publishedDate','startDate','endDate','sampleSize','method','marginOfError','responseRate','commissioner'].map(k=>[k,p[k]]));
 }
 if(provider==='nbs'){
  const meta=parseNbsMetadata(pages,publishedDate);const overview=pages.find(p=>compact(p).includes('조사개요'));const n=compact(overview||'').match(/표본크기([\d,]+)명/);if(!n)fail('NBS_SAMPLE');return {...meta,publishedDate,sampleSize:Number(n[1].replaceAll(',','')),method:'휴대전화 가상번호 · 전화면접조사',commissioner:'엠브레인퍼블릭·케이스탯리서치·코리아리서치·한국리서치 공동'};
 }
 const t=htmlText(html),pub=html.match(/<time\b[^>]*datetime=["'](20\d{2}-\d{2}-\d{2})T/i)||html.match(/article:published_time[^>]*content=["'](20\d{2}-\d{2}-\d{2})T/i);if(!pub)fail('PUBLISHED_DATE');
 const meta=t.match(/정당\s*지지도\s*조사는\s*(.{1,1800}?)(?=두\s*조사|통계보정|※)/)?.[1];if(!meta)fail('PARTY_METADATA');
 const range=meta.match(/(?:(20\d{2})년\s*)?(\d{1,2})월\s*(\d{1,2})일[^\d]{0,25}(?:부터|[~∼-])\s*(?:(\d{1,2})월\s*)?(\d{1,2})일/);if(!range)fail('SURVEY_DATES');
 const sample=meta.match(/전국\s*(?:만\s*)?18세\s*이상(?:\s*유권자)?\s*([\d,]+)명/),margin=meta.match(/표본오차[^±]{0,100}±\s*([\d.]+)%/),response=meta.match(/([\d.]+)%의\s*응답률/),method=t.match(/두\s*조사\s*모두\s*(.{1,100}?)\s*(?:방식으로|방식)/);
 if(!sample||!margin||!response||!method)fail('SURVEY_METADATA');const year=range[1]||pub[1].slice(0,4);
 return {publishedDate:pub[1],startDate:date(year,range[2],range[3]),endDate:date(year,range[4]||range[2],range[5]),sampleSize:Number(sample[1].replaceAll(',','')),marginOfError:Number(margin[1]),responseRate:Number(response[1]),method:method[1]+' 방식',commissioner:'에너지경제신문'};
}
async function ordinary(provider,options){
 const indexUrl=provider==='gallup'?'https://www.gallup.co.kr/gallupdb/report.asp':'http://www.realmeter.net/';
 const index=await fetchOfficialHtml(indexUrl,options),urls=(provider==='gallup'?discoverGallup:discoverRealmeter)(index);if(!urls.length)fail('INDEX');
 const sourceUrl=urls[0],html=await fetchOfficialHtml(sourceUrl,options),raw=[...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m=>m[1].replaceAll('&amp;','&')).find(u=>/\.pdf(?:$|[?#])/i.test(u));if(!raw)fail('PDF_LINK');
 const pdfUrl=documentUrl(raw,sourceUrl).href,bytes=await fetchDocument(pdfUrl,options),pages=await pdfPages(bytes),table=parsePartyTable(provider,pages),metadata=parsePartyMetadata(provider,html,sourceUrl,pages);
 return record(provider,sourceUrl,metadata,table,bytes,pdfUrl);
}
function record(provider,sourceUrl,meta,table,bytes,evidenceUrl){
 if(table.sampleSize!==meta.sampleSize)fail('SAMPLE_MISMATCH');
 const dates=[meta.startDate,meta.endDate,meta.publishedDate];if(dates.some(d=>!/^20\d{2}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)||meta.startDate>meta.endDate||meta.endDate>meta.publishedDate)fail('DATES');
 if(![meta.marginOfError,meta.responseRate].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=100))fail('METADATA');
 return {id:`${provider}-party-${hash(sourceUrl).slice(0,16)}`,topic:'party-support',institution:institutions[provider],sourceUrl,...meta,title:`${institutions[provider]} 정당 지지도`,question:'현재 지지하거나 더 호감이 가는 정당',results:{parties:table.parties},evidence:{url:evidenceUrl,pages:table.pages,note:'기관 공식 첨부 통계표의 전체 행. 없음과 모름·무응답을 분리하고 공표 반올림 값을 유지했습니다.'},provenance:{provider,parserVersion:VERSION,contentHash:hash(bytes)}};
}
async function nbs(options){
 const index=await fetchOfficialHtml('http://nbsurvey.kr/files',options),row=[...index.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]).find(r=>/files\?vid=\d+/.test(r)&&/전국지표조사\s*리포트/.test(htmlText(r)));if(!row)fail('NBS_INDEX');
 const sourceUrl=documentUrl(row.match(/href=["']([^"']*files\?vid=\d+)["']/)?.[1]).href,publishedDate=htmlText(row).match(/20\d{2}-\d{2}-\d{2}/)?.[0];if(!publishedDate)fail('NBS_DATE');
 const html=await fetchOfficialHtml(sourceUrl,options),nonce=html.match(/mb_options\["nonce2"\]\s*=\s*"([^"]+)"/)?.[1],file=html.match(/sendBoardFileData\((\d+),['"]([^'"]+\.zip)['"]\)/);if(!nonce||!file)fail('NBS_ZIP_LINK');
 const body=new URLSearchParams(nonce);for(const [k,v] of Object.entries({mode:'file',board_action:'file_download',board_name:'nbs_report',file_pid:file[1],file_name:file[2],action:'mb_board',admin_page:'false',hybrid_app:''}))body.set(k,v);
 const response=JSON.parse((await fetchDocument('http://nbsurvey.kr/wp-admin/admin-ajax.php',{...options,method:'POST',body})).toString());if(response.state!=='success'||typeof response.data?.file_path!=='string')fail('NBS_DOWNLOAD');
 const url=new URL('http://nbsurvey.kr/?mb_ext=file');url.searchParams.set('path',response.data.file_path);url.searchParams.set('file_name',file[2]);url.searchParams.set('type','download');
 const bytes=await fetchDocument(decodeURIComponent(url.href),options);let total=0;const files=unzipSync(new Uint8Array(bytes),{filter:entry=>{total+=entry.originalSize;return total<=32000000&&entry.originalSize<16000000&&/\.pdf$/i.test(entry.name);}});if(total>32000000)fail('ZIP_SIZE');
 for(const pdf of Object.values(files)){const pages=await pdfPages(pdf);if(!pages.some(p=>/^(?:<표\d+>|\[표\d+\])정당지지도/.test(compact(p).normalize('NFKC'))))continue;const table=parsePartyTable('nbs',pages),meta=parsePartyMetadata('nbs',html,sourceUrl,pages,publishedDate);return record('nbs',sourceUrl,meta,table,bytes,sourceUrl);}
 fail('NBS_TABLE');
}
export async function collectPartyPolls({fetch=globalThis.fetch,now=Date.now,providerIds=['gallup','realmeter','nbs']}={}){
 const checkedAt=new Date(typeof now==='function'?now():now).toISOString(),options={fetch,signal:AbortSignal.timeout(45000),timeoutMs:12000};
 const results=await Promise.all(Object.keys(institutions).filter(id=>providerIds.includes(id)).map(async id=>{try{const item=await(id==='nbs'?nbs(options):ordinary(id,options));if(item.publishedDate>checkedAt.slice(0,10))fail('FUTURE');return {item:{...item,fetchedAt:checkedAt},provider:{id,institution:institutions[id],state:'success',checkedAt,fetchedCount:1}};}catch(error){return {provider:{id,institution:institutions[id],state:'error',checkedAt,fetchedCount:0,error:'공식 정당 지지도 원문 검증에 실패하여 이전 자료를 유지합니다.',code:String(error?.message||'SOURCE_ERROR').slice(0,100)}};}}));
 return {items:results.flatMap(r=>r.item?[r.item]:[]).sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)),providers:results.map(r=>r.provider)};
}
