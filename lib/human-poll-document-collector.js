import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {discoverGallup,discoverRealmeter,parseGallup,parseRealmeter,fetchOfficialHtml,htmlText} from './human-poll-sources.js';
import {documentUrl,fetchDocument,pdfPages,applyDocument,tableFromPages} from './human-poll-documents.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(stage='format')=>{throw Error('HUMAN_POLL_DOCUMENT_'+stage);};
const links=html=>[...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m=>m[1].replaceAll('&amp;','&'));
const date=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
async function ordinary(provider,options){
 const gallup=provider==='gallup',indexUrl=gallup?'https://www.gallup.co.kr/gallupdb/report.asp':'http://www.realmeter.net/';
 const html=await fetchOfficialHtml(indexUrl,options),urls=(gallup?discoverGallup(html):discoverRealmeter(html));
 if(!urls.length){console.warn('HUMAN_POLL_INDEX',{provider,length:html.length,preview:htmlText(html).slice(0,300)});fail('index');}
 // The first current report must validate. Never silently substitute an older report after a format failure.
 const sourceUrl=urls[0],report=await fetchOfficialHtml(sourceUrl,options),poll=(gallup?parseGallup:parseRealmeter)(report,sourceUrl);
 const url=links(report).find(u=>/\.pdf(?:$|[?#])/i.test(u));if(!url)fail('pdf-link');
 const pdfUrl=documentUrl(url,sourceUrl).href,bytes=await fetchDocument(pdfUrl,options),pages=await pdfPages(bytes);
 return applyDocument(poll,provider,pages,pdfUrl,bytes);
}
async function nbs(options){
 const index=await fetchOfficialHtml('http://nbsurvey.kr/files',options);
 const rows=[...index.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
 const row=rows.find(r=>/files\?vid=\d+/.test(r)&&/전국지표조사\s*리포트/.test(htmlText(r)));if(!row){console.warn('HUMAN_POLL_INDEX',{provider:'nbs',length:index.length,preview:htmlText(index).slice(0,300)});fail('nbs-index');}
 const sourceUrl=documentUrl(row.match(/href=["']([^"']*files\?vid=\d+)["']/)?.[1]).href,publishedDate=htmlText(row).match(/20\d{2}-\d{2}-\d{2}/)?.[0];if(!publishedDate)fail();
 const report=await fetchOfficialHtml(sourceUrl,options),nonce=report.match(/mb_options\["nonce2"\]\s*=\s*"([^"]+)"/)?.[1],file=report.match(/sendBoardFileData\((\d+),['"]([^'"]+\.zip)['"]\)/);if(!nonce||!file)fail();
 const body=new URLSearchParams(nonce);for(const [key,value] of Object.entries({mode:'file',board_action:'file_download',board_name:'nbs_report',file_pid:file[1],file_name:file[2],action:'mb_board',admin_page:'false',hybrid_app:''}))body.set(key,value);
 const response=JSON.parse((await fetchDocument('http://nbsurvey.kr/wp-admin/admin-ajax.php',{...options,method:'POST',body})).toString());if(response.state!=='success'||typeof response.data?.file_path!=='string')fail();
 const url=new URL('http://nbsurvey.kr/?mb_ext=file');url.searchParams.set('path',response.data.file_path);url.searchParams.set('file_name',file[2]);url.searchParams.set('type','download');
 const bytes=await fetchDocument(decodeURIComponent(url.href),options);let total=0;
 const files=unzipSync(new Uint8Array(bytes),{filter:entry=>{total+=entry.originalSize;return total<=32000000&&entry.originalSize<16000000&&/\.pdf$/i.test(entry.name);}});if(total>32000000)fail();
 let pages;
 for(const pdf of Object.values(files)){const candidate=await pdfPages(pdf);if(candidate.some(p=>/\[표1\]국정운영평가/.test(p.replace(/\s/g,''))&&p.includes('T2'))){pages=candidate;break;}}
 if(!pages)fail();const table=tableFromPages('nbs',pages),text=pages.join('\n').replace(/\u0000/g,'').replace(/\s+/g,' ');
 const range=text.match(/(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*[~∼-]\s*(?:(\d{1,2})\s*월\s*)?(\d{1,2})\s*일/);if(!range)fail();
 const responseRate=Number(text.match(/([\d.]+)%\s*\(\s*총\s*[\d,]+\s*명과\s*통화/)?.[1]),marginOfError=Number(text.match(/표집오차는\s*±\s*([\d.]+)%/)?.[1]);if(!Number.isFinite(responseRate)||!Number.isFinite(marginOfError))fail();
 return {id:'nbs-document-'+sourceUrl.match(/vid=(\d+)/)[1],institution:'NBS',topic:'presidential-approval',sourceUrl,publishedDate,startDate:date(range[1],range[2],range[3]),endDate:date(range[1],range[4]||range[2],range[5]),sampleSize:table.results.overall.n,results:table.results,question:'대통령 국정운영 평가',title:htmlText(row).match(/전국지표조사.*?\)/)?.[0]||'NBS 대통령 국정운영 평가',commissioner:'엠브레인퍼블릭·케이스탯리서치·코리아리서치·한국리서치 공동',method:'휴대전화 가상번호 · 전화면접조사',responseRate,marginOfError,evidence:{url:sourceUrl,pages:table.pages,note:'첨부 ZIP의 원본 통계표에서 자동 추출·검증했습니다.'},provenance:{provider:'nbs',parserVersion:'official-document-v1',contentHash:hash(bytes),questionKind:'source-summary'}};
}
export async function collectDocumentPolls({fetch=globalThis.fetch,now=Date.now}={}){
 const checkedAt=new Date(now()).toISOString(),options={fetch,signal:AbortSignal.timeout(45000),timeoutMs:12000};
 const results=await Promise.all(['gallup','realmeter','nbs'].map(async id=>{
  try{const poll=await(id==='nbs'?nbs(options):ordinary(id,options));if(poll.publishedDate>checkedAt.slice(0,10)||poll.endDate>poll.publishedDate)fail();return {item:{...poll,fetchedAt:checkedAt},provider:{id,state:'success',checkedAt,fetchedCount:1}};}
  catch(error){console.warn('HUMAN_POLL_DOCUMENT',{provider:id,code:String(error?.message||'SOURCE_ERROR').slice(0,80)});return {provider:{id,state:'error',checkedAt,fetchedCount:0}};}
 }));return {items:results.flatMap(r=>r.item?[r.item]:[]),providers:results.map(r=>r.provider)};
}
