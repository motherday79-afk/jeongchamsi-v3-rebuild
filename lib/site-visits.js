const PREFIX='jcsr2:site-visits:';
export const visitDay=(date=new Date())=>new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
const RECORD=`local n=redis.call('INCR',KEYS[1]);redis.call('SET',KEYS[2],ARGV[1],'NX');redis.call('INCR',KEYS[3]);redis.call('SET',KEYS[4],ARGV[2],'NX');return n`;
export function createSiteVisits({command,now=()=>new Date()}){
 return {
  async today(record=false){const local=new Date(now().getTime()+9*3600000).toISOString(),date=local.slice(0,10),hour=local.slice(11,13);const count=record?await command(['EVAL',RECORD,'4',PREFIX+date,PREFIX+'started',PREFIX+'hour:'+date+':'+hour,PREFIX+'hour-started',date,local.slice(0,19)]):await command(['GET',PREFIX+date]);return {ok:true,date,count:Number(count||0)};},
  async history({from,to,day}={}){
   const today=visitDay(now());to=to||today;from=from||new Date(Date.parse(to+'T00:00:00Z')-29*86400000).toISOString().slice(0,10);
   const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
   day=day||to;
   if(!valid(from)||!valid(to)||!valid(day)||day>today||from>to||to>today||(Date.parse(to)-Date.parse(from))/86400000>365)throw Error('INVALID_DATE_RANGE');
   const dates=[];for(let t=Date.parse(from);t<=Date.parse(to);t+=86400000)dates.push(new Date(t).toISOString().slice(0,10));
   const hours=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
   const [values,startedAt,todayCount,hourValues]=await Promise.all([command(['MGET',...dates.map(d=>PREFIX+d)]),command(['GET',PREFIX+'started']),command(['GET',PREFIX+today]),command(['MGET',PREFIX+day,...hours.map(h=>PREFIX+'hour:'+day+':'+h),PREFIX+'hour-started'])]);
   const items=dates.map((date,i)=>({date,count:Number(values?.[i]||0),tracked:!!startedAt&&date>=startedAt})).reverse();
   const hourlyStartedAt=hourValues?.[25]||null;
   const hourly=hours.map((hour,i)=>({hour,count:Number(hourValues?.[i+1]||0),tracked:!!hourlyStartedAt&&day+'T'+hour>=hourlyStartedAt.slice(0,13)}));
   return {ok:true,today,todayCount:Number(todayCount||0),startedAt:startedAt||null,from,to,total:items.reduce((n,x)=>n+x.count,0),items,day,hourly,hourlyStartedAt,unallocated:Math.max(0,Number(hourValues?.[0]||0)-hourly.reduce((sum,h)=>sum+h.count,0))};
  }
 };
}
