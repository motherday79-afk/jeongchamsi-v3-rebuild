const PREFIX='jcsr2:site-visits:';
export const visitDay=(date=new Date())=>new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
const RECORD=`local n=redis.call('INCR',KEYS[1]);redis.call('SET',KEYS[2],ARGV[1],'NX');return n`;
export function createSiteVisits({command,now=()=>new Date()}){
 return {
  async today(record=false){const date=visitDay(now());const count=record?await command(['EVAL',RECORD,'2',PREFIX+date,PREFIX+'started',date]):await command(['GET',PREFIX+date]);return {ok:true,date,count:Number(count||0)};},
  async history({from,to}={}){
   const today=visitDay(now());to=to||today;from=from||new Date(Date.parse(to+'T00:00:00Z')-29*86400000).toISOString().slice(0,10);
   const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
   if(!valid(from)||!valid(to)||from>to||to>today||(Date.parse(to)-Date.parse(from))/86400000>365)throw Error('INVALID_DATE_RANGE');
   const dates=[];for(let t=Date.parse(from);t<=Date.parse(to);t+=86400000)dates.push(new Date(t).toISOString().slice(0,10));
   const [values,startedAt,todayCount]=await Promise.all([command(['MGET',...dates.map(d=>PREFIX+d)]),command(['GET',PREFIX+'started']),command(['GET',PREFIX+today])]);
   const items=dates.map((date,i)=>({date,count:Number(values?.[i]||0),tracked:!!startedAt&&date>=startedAt})).reverse();
   return {ok:true,today,todayCount:Number(todayCount||0),startedAt:startedAt||null,from,to,total:items.reduce((n,x)=>n+x.count,0),items};
  }
 };
}
