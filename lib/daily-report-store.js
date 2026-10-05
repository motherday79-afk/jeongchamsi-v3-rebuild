import {encodeStored,decodeStored,batchedMget} from './intelligence-repository.js';
import {reportDay,shiftReportDay,compareDailyReports} from '../src/core/daily-report.js';
export const dailyRecordKey=(snapshot,id)=>'jcs:daily-report:v1:record:'+encodeURIComponent(snapshot)+':'+encodeURIComponent(id);
export const dailyManifestKey=day=>'jcs:daily-report:v1:day:'+day;
const parse=v=>v?decodeStored(v):null;
export async function stageDailyReport(command,snapshot,record){
 if(!record?.id||record.topics?.length!==9||!record.observedAt)return false;
 await command(['SET',dailyRecordKey(snapshot,record.id),encodeStored(record)]);return true;
}
export function makeDailyManifest({snapshot,at,rankings,ids}){
 const date=reportDay(at);if(!date||!snapshot)throw Error('DAILY_REPORT_DATE_INVALID');
 // Only a fully successful publication can expose the staged daily reports.
 const value={date,snapshot,at,ids,rankings:Object.fromEntries((ids||[]).map(id=>[id,{overall:rankings?.byId?.[id]?.rank??null,category:rankings?.byId?.[id]?.categoryRank??null}]))};
 return value;
}
export async function readDailyReport(command,id,date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('DAILY_REPORT_DATE_INVALID');
 const manifest=parse(await command(['GET',dailyManifestKey(date)]));if(!manifest?.ids?.includes(id))return null;
 const record=parse(await command(['GET',dailyRecordKey(manifest.snapshot,id)]));
 return record?{...record,date:manifest.date,recordedAt:manifest.at,rank:manifest.rankings?.[id]||record.rank}:null;
}
export async function readDailyHistory(command,id,current,requestedDate='',now=Date.now()){
 const today=reportDay(now),date=requestedDate||current.date||today;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today)throw Error('DAILY_REPORT_DATE_INVALID');
 const days=Array.from({length:90},(_,i)=>shiftReportDay(today,-i));
 const manifests=(await batchedMget(command,days.map(dailyManifestKey))).map(parse);
 const dates=manifests.filter(m=>m?.ids?.includes(id)).map(m=>m.date);
 const selected=requestedDate?await readDailyReport(command,id,date):current;
 if(!selected)return {ok:true,dates,selected:null,comparisons:{}};
 const periods=[['24H',1],['7D',7],['30D',30]],comparisons={};
 await Promise.all(periods.map(async([label,n])=>{const previous=await readDailyReport(command,id,shiftReportDay(date,-n));comparisons[label]=compareDailyReports(selected,previous);}));
 return {ok:true,dates,selected,comparisons};
}
