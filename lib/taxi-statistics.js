import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(String(v)).digest('hex');
export const taxiStatsKey=id=>'jcs:taxi:v2:stats:'+id;
export const taxiPersonalKey=identityKey=>'jcs:taxi:v2:personal:'+hash(identityKey);
// Update the ride, all-rides totals, and first-encounter totals in one CAS transaction.
// Personal first-encounter markers survive the game's reset action.
export const TAXI_RECORD_LUA=`
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
if tonumber(ARGV[3])>0 then redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]) else redis.call('SET',KEYS[1],ARGV[2]) end
if ARGV[4]~='' then
 local data=cjson.decode(ARGV[4]);local first=redis.call('HSETNX',KEYS[3],data.personId..':seen','1')==1
 for field,value in pairs(data.counts) do
  redis.call('HINCRBY',KEYS[2],field,value)
  if first then redis.call('HINCRBY',KEYS[2],'first:'..field,value) end
 end
 redis.call('HINCRBY',KEYS[3],data.personId..':rides',1)
 redis.call('HINCRBY',KEYS[3],data.personId..':distanceMeters',data.counts.distanceMeters)
 if tonumber(ARGV[3])>0 then redis.call('EXPIRE',KEYS[3],ARGV[3]) end
end
return 1`;
export function taxiRideCounts(ride,personId){
 if(!ride||ride.status!=='completed'||!ride.heardCount)return null;
 const counts={rides:1,distanceMeters:Math.floor((ride.distanceMs??ride.activeMs)*.008),completed:ride.finishReason==='completed'?1:0,likedRides:ride.likedBeatIndexes.length?1:0};
 for(let i=0;i<ride.heardCount;i++){
  counts['beat:'+i+':heard']=1;
  if(ride.likedBeatIndexes.includes(i))counts['beat:'+i+':likes']=1;
  if(i<ride.beatIndex)counts['beat:'+i+':continued']=1;
  if(i===ride.beatIndex&&ride.finishReason==='dropoff')counts['beat:'+i+':dropoffs']=1;
 }
 return {personId,counts};
}
export async function readTaxiStats(command,person,identity){
 if(!person)return {ok:true,registered:false};
 const fields=['rides','distanceMeters','completed','likedRides'];
 const beatFields=person.beats.flatMap((_,i)=>['heard','likes','dropoffs','continued'].map(f=>'beat:'+i+':'+f));
 const all=[...fields,...fields.map(f=>'first:'+f),...beatFields];
 const [raw,mine]=await Promise.all([command(['HMGET',taxiStatsKey(person.personId),...all]),identity?command(['HMGET',taxiPersonalKey(identity.key),person.personId+':rides',person.personId+':distanceMeters']):null]);
 const values=Object.fromEntries(all.map((f,i)=>[f,Number(raw?.[i]||0)]));
 return {ok:true,registered:true,totals:Object.fromEntries(fields.map(f=>[f,values[f]])),first:Object.fromEntries(fields.map(f=>[f,values['first:'+f]])),beats:person.beats.map((b,i)=>({index:i,title:b.context,heard:values['beat:'+i+':heard'],likes:values['beat:'+i+':likes'],dropoffs:values['beat:'+i+':dropoffs'],continued:values['beat:'+i+':continued']})),my:mine?{rides:Number(mine[0]||0),distanceMeters:Number(mine[1]||0)}:null};
}
