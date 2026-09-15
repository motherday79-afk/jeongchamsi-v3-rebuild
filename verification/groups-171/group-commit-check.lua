local values={};local index={};local sets={}
redis={call=function(op,key,a,b)
 if op=='GET' then return values[key] end
 if op=='SET' then values[key]=a;return 'OK' end
 if op=='HSET' then index[a]=b;return 1 end
 if op=='SADD' then sets[key]=sets[key] or {};sets[key][a]=true;return 1 end
 if op=='SREM' then if sets[key] then sets[key][a]=nil end;return 1 end
 error('unexpected Redis command '..op)
end}
local commit=assert(load([==[
local before=redis.call('GET',KEYS[1]) or ''
if before~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2])
redis.call('HSET',KEYS[2],ARGV[4],ARGV[3])
for i=3,#KEYS do
 if ARGV[i+2]=='1' then redis.call('SADD',KEYS[i],ARGV[4])
 else redis.call('SREM',KEYS[i],ARGV[4]) end
end
return 1]==]))
KEYS={'group','index','owner','reader'}
ARGV={'','{"version":1,"posts":[]}','{"id":"g"}','g','1','1'}
assert(commit()==1)
assert(values.group=='{"version":1,"posts":[]}')
assert(sets.owner.g and sets.reader.g)
ARGV={'{"version":1,"posts":[]}','{"version":2,"posts":[1]}','{"id":"g","updated":true}','g','1','0'}
assert(commit()==1)
assert(sets.owner.g and not sets.reader.g)
local winner=values.group;local summary=index.g
ARGV={'{"version":1,"posts":[]}','stale overwrite','stale summary','g','0','1'}
assert(commit()==0)
assert(values.group==winner and index.g==summary and sets.owner.g and not sets.reader.g)
print('Actual GROUP_COMMIT_LUA: create, JSON arrays, membership index removal, stale-CAS rejection passed')
