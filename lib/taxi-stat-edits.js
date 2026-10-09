export const taxiEditKey=id=>'jcs:taxi:v2:edits:'+id;
const counts=['rides','distanceMeters','completed','likedRides'];
export const TAXI_EDIT_FIELDS=[...counts,...counts.map(f=>'first:'+f),...Array.from({length:5},(_,i)=>['heard','likes','dropoffs','continued'].map(f=>'beat:'+i+':'+f)).flat()];
export const correctedTaxiValues=(values,edit)=>Object.fromEntries(Object.entries(values).map(([field,value])=>[field,Math.max(0,Number(value||0)+Number(edit?.offsets?.[field]||0))]));
export async function readTaxiEditor(command,id){
 const [raw,stored]=await Promise.all([command(['HMGET','jcs:taxi:v2:stats:'+id,...TAXI_EDIT_FIELDS]),command(['GET',taxiEditKey(id)])]);
 const edit=stored?JSON.parse(stored):{},values=correctedTaxiValues(Object.fromEntries(TAXI_EDIT_FIELDS.map((f,i)=>[f,Number(raw?.[i]||0)])),edit);
 return {ok:true,revision:edit.revision||0,values,adjusted:Object.keys(edit.offsets||{}).length>0};
}
export const TAXI_EDIT_LUA=`
local old=redis.call('GET',KEYS[1]);local state=old and cjson.decode(old) or {revision=0,offsets={}}
if tonumber(state.revision or 0)~=tonumber(ARGV[1]) then return 'CONFLICT' end
local changes=cjson.decode(ARGV[2]);local before=cjson.encode(state.offsets or {})
if ARGV[5]=='reset' then state.offsets={} else
 for field,value in pairs(changes) do
  state.offsets[field]=value-tonumber(redis.call('HGET',KEYS[2],field) or 0)
 end
end
local function value(field) return math.max(0,tonumber(redis.call('HGET',KEYS[2],field) or 0)+tonumber(state.offsets[field] or 0)) end
if ARGV[5]~='reset' then
 for _,prefix in ipairs({'','first:'}) do
  if value(prefix..'completed')>value(prefix..'rides') or value(prefix..'likedRides')>value(prefix..'rides') then return 'INVALID_TOTALS' end
 end
 for _,field in ipairs({'rides','distanceMeters','completed','likedRides'}) do if value('first:'..field)>value(field) then return 'INVALID_TOTALS' end end
 for i=0,4 do
  local prefix='beat:'..i..':'
  if value(prefix..'heard')>value('rides') or value(prefix..'likes')>value(prefix..'heard') or value(prefix..'dropoffs')+value(prefix..'continued')>value(prefix..'heard') then return 'INVALID_TOTALS' end
 end
end
state.revision=tonumber(state.revision or 0)+1;state.updatedAt=ARGV[3];state.updatedBy=ARGV[4]
redis.call('SET',KEYS[1],cjson.encode(state))
redis.call('LPUSH',KEYS[3],cjson.encode({at=ARGV[3],by=ARGV[4],before=cjson.decode(before),after=state.offsets,operation=ARGV[5]}))
redis.call('LTRIM',KEYS[3],0,49)
return 'OK'`;
export async function saveTaxiNumbers(command,id,input,user){
 if(!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('INVALID_REVISION');
 if(input.reset!==undefined&&typeof input.reset!=='boolean')throw Error('INVALID_FIELDS');
 const changes=input.changes;
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).length>28)throw Error('INVALID_FIELDS');
 for(const [field,value] of Object.entries(changes))if(!TAXI_EDIT_FIELDS.includes(field)||!Number.isSafeInteger(value)||value<0||value>1e12)throw Error('INVALID_NUMBER');
 if(!input.reset&&!Object.keys(changes).length)throw Error('INVALID_FIELDS');
 const result=await command(['EVAL',TAXI_EDIT_LUA,'3',taxiEditKey(id),'jcs:taxi:v2:stats:'+id,taxiEditKey(id)+':history',String(input.revision),JSON.stringify(changes),new Date().toISOString(),user.id,input.reset?'reset':'edit']);
 if(result==='CONFLICT')throw Error('EDIT_CONFLICT');if(result==='INVALID_TOTALS')throw Error('INVALID_TOTALS');if(result!=='OK')throw Error('SAVE_FAILED');return {ok:true};
}
