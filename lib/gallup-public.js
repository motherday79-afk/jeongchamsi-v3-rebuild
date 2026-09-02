const LIST_URL='https://www.gallup.co.kr/gallupdb/report.asp';
const BASE_URL='https://www.gallup.co.kr/gallupdb/';
const textOf=html=>String(html||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const percent=(text,label)=>{const match=text.match(new RegExp(`${label}\\s*(\\d+(?:\\.\\d+)?)%`));return match?Number(match[1]):null;};

export function findLatestGallupReportUrl(html){const match=String(html||'').match(/reportContent\.asp\?seqNo=(\d+)/i);if(!match)throw Object.assign(new Error('GALLUP_REPORT_LINK_NOT_FOUND'),{code:'GALLUP_REPORT_LINK_NOT_FOUND'});return `${BASE_URL}reportContent.asp?seqNo=${match[1]}`;}
export function parseGallupReport(html,url=''){
  const text=textOf(html),partySupport={};
  for(const party of ['더불어민주당','국민의힘','개혁신당','조국혁신당','진보당']){const value=percent(text,party);if(value!==null)partySupport[party]=value;}
  if(!Object.keys(partySupport).length)throw Object.assign(new Error('GALLUP_PARTY_SUPPORT_NOT_FOUND'),{code:'GALLUP_PARTY_SUPPORT_NOT_FOUND'});
  const centristText=text.match(/중도층에서는([^.]*)/)?.[1]||'',centrist={};for(const party of ['더불어민주당','국민의힘','개혁신당','조국혁신당']){const value=percent(centristText,party);if(value!==null)centrist[party]=value;}
  return {provider:'GALLUP_KOREA_PUBLIC',partySupport,centrist,undecided:percent(text,'무당(?:\\(無黨\\)층)?')??null,source:{title:(text.match(/데일리 오피니언 제\d+호[^조]*/)?.[0]||'한국갤럽 데일리 오피니언').trim(),url,provider:'GALLUP_KOREA',collectedAt:new Date().toISOString()}};
}
async function fetchText(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(options.timeoutMs)||7000));try{const response=await (options.fetchImpl||fetch)(url,{headers:{Accept:'text/html'},signal:controller.signal});if(!response?.ok)throw Object.assign(new Error(`GALLUP_HTTP_${Number(response?.status)||0}`),{code:`GALLUP_HTTP_${Number(response?.status)||0}`});return response.text();}finally{clearTimeout(timer);}}
export async function fetchLatestGallupContext(options={}){const list=await fetchText(LIST_URL,options),url=findLatestGallupReportUrl(list);return parseGallupReport(await fetchText(url,options),url);}
