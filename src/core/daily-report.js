export const DAILY_REPORT_VERSION='JCS_DAILY_REPORT_1';
export const reportDay=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'';};
export const shiftReportDay=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';};
export function makeDailyReport(person,report={},at=''){
 const topics=(report.diagnoses||[]).filter(t=>/^0[1-9]$/.test(t.id));
 const summary=report.diagnoses?.find(t=>t.id==='10')||{};
 const observedAt=at||report.reportAsOf||report.raw?.collectedAt||'';
 return {schema:DAILY_REPORT_VERSION,id:person.id,name:person.name,party:person.party||'',office:person.office||person.roleLabel||'',photo:person.photo?.url||person.photo?.localPath||'',date:reportDay(observedAt),observedAt,snapshot:report.snapshot||'',algorithmVersion:report.algorithmVersion||'',rank:report.rank||{},summary,topics,assessment:report.diagnosisSummary||{},news:(report.news||[]).map(n=>({title:n.title,url:n.url,source:n.source,date:n.publishedAt||n.date||''}))};
}
const valid=v=>typeof v==='number'&&Number.isFinite(v);
export function compareDailyReports(current,previous){
 if(!previous)return {ready:false,reason:'기록 축적 중'};
 if(previous.schema!==current.schema||previous.algorithmVersion!==current.algorithmVersion)return {ready:false,reason:'평가 기준이 변경되어 수치를 직접 비교하지 않습니다.'};
 const rows=(current.topics||[]).map(t=>{const p=previous.topics?.find(r=>r.id===t.id);return {id:t.id,title:t.title,before:p?.score??null,after:t.score??null,delta:valid(p?.score)&&valid(t.score)?Math.round((t.score-p.score)*10)/10:null,previousHeadline:p?.headline||'',headline:t.headline||''};});
 return {ready:true,from:previous.date,to:current.date,rows,rankDelta:valid(previous.rank?.overall)&&valid(current.rank?.overall)?previous.rank.overall-current.rank.overall:null};
}
