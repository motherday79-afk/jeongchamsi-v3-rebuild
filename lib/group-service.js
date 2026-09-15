import { randomUUID } from 'node:crypto';
import { put, get as getBlob, del } from '@vercel/blob';
import { createGroup, mutateGroup, groupSummary, groupDetail, groupViewer, groupMember, canReadGroupImage } from '../src/core/group-model.js';
import { GROUP_EXAMPLES, groupExample } from '../src/data/group-examples.js';

export const GROUP_KEYS={index:'jcsr2:groups:v1:index',item:id=>`jcsr2:groups:v1:item:${id}`,user:id=>`jcsr2:groups:v1:user:${id}`};
// Preserve JS JSON verbatim: Redis cjson changes empty arrays into objects.
export const GROUP_COMMIT_LUA=`
local before=redis.call('GET',KEYS[1]) or ''
if before~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2])
redis.call('HSET',KEYS[2],ARGV[4],ARGV[3])
for i=3,#KEYS do
 if ARGV[i+2]=='1' then redis.call('SADD',KEYS[i],ARGV[4])
 else redis.call('SREM',KEYS[i],ARGV[4]) end
end
return 1`;
const fail=code=>{throw new Error(code);};
const signed=user=>{if(!user?.id)fail('LOGIN_REQUIRED');};
const admin=user=>!!user?.id&&user.role==='admin';
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const parse=raw=>{if(raw==null)return null;try{return JSON.parse(raw);}catch{fail('GROUP_STORAGE_FAILED');}};
const relatedIds=g=>new Set(g?[g.ownerId,...g.members.filter(m=>['pending','active'].includes(m.status)).map(m=>m.userId)]:[]);
const imageUrl=(id,imageId)=>`/api/v3/groups?id=${encodeURIComponent(id)}&imageId=${encodeURIComponent(imageId)}`;
const MAX_DOCUMENT_BYTES=1048576;

export function createGroupService({command,now=Date.now,idFor=randomUUID,examples=true,putImpl=put,getImpl=getBlob,delImpl=del,env=process.env}={}){
 if(typeof command!=='function')fail('GROUP_STORAGE_FAILED');
 const sample=id=>examples?groupExample(id):null;
 async function stored(id){if(!validId(id))fail('GROUP_NOT_FOUND');const raw=await command(['GET',GROUP_KEYS.item(id)]);const item=parse(raw);if(!item)fail('GROUP_NOT_FOUND');return {raw,item};}
 async function commit(previous,raw,next){
  const serialized=JSON.stringify(next);if(Buffer.byteLength(serialized)>MAX_DOCUMENT_BYTES)fail('GROUP_LIMIT_REACHED');
  const before=relatedIds(previous),after=relatedIds(next),users=[...new Set([...before,...after])];
  const keys=[GROUP_KEYS.item(next.id),GROUP_KEYS.index,...users.map(GROUP_KEYS.user)];
  const summary=groupSummary(next,null);
  const result=await command(['EVAL',GROUP_COMMIT_LUA,String(keys.length),...keys,raw||'',serialized,JSON.stringify(summary),next.id,...users.map(id=>after.has(id)?'1':'0')]);
  if(Number(result)!==1)fail('GROUP_CONFLICT');
 }
 async function get(id,user,{invite=''}={}){const item=sample(id)||(await stored(id)).item;return {ok:true,item:groupDetail(item,user,{invite})};}
 async function list(user,{view='browse',category='all',q='',page=1}={}){
  if(!['browse','mine','manage'].includes(view))view='browse';
  if(view==='mine')signed(user);if(view==='manage'&&!admin(user))fail('GROUP_FORBIDDEN');
  const matches=row=>(category==='all'||row.category===category)&&`${row.name} ${row.description} ${row.region}`.toLocaleLowerCase('ko-KR').includes(String(q).trim().slice(0,120).toLocaleLowerCase('ko-KR'));
  let rows=[],notifications=[];
  if(view==='mine'){
   const ids=(await command(['SMEMBERS',GROUP_KEYS.user(user.id)])||[]).filter(validId);
   const records=ids.length?(await command(['MGET',...ids.map(GROUP_KEYS.item)])).map(parse).filter(Boolean):[];
   const own=records.filter(g=>!g.isExample&&!sample(g.id)&&(g.ownerId===user.id||['pending','active'].includes(groupMember(g,user)?.status)));
   rows=own.map(g=>groupSummary(g,user));
   notifications=own.filter(g=>{const v=groupViewer(g,user);return g.status==='approved'&&v.canRead&&v.notify&&g.lastActivityAt>v.lastSeenAt;}).map(g=>({groupId:g.id,groupName:g.name,title:'새 모임 활동이 있습니다.',createdAt:g.lastActivityAt})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20);
  }else{
   rows=(await command(['HVALS',GROUP_KEYS.index])||[]).map(parse).filter(row=>row&&!row.isExample&&!sample(row.id));
   if(view==='browse')rows=rows.filter(row=>row.status==='approved'&&['public','members'].includes(row.visibility));
  }
  rows=rows.filter(matches).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))||a.id.localeCompare(b.id));
  const total=rows.length,pages=Math.max(1,Math.ceil(total/12)),currentPage=Math.min(pages,Math.max(1,Math.floor(Number(page)||1))),offset=(currentPage-1)*12;
  const demos=examples&&view==='browse'?GROUP_EXAMPLES.map(g=>groupSummary(g,user)).filter(matches):[];
  return {ok:true,items:rows.slice(offset,offset+12),examples:currentPage===1?demos:[],total,page:currentPage,hasMore:offset+12<total,notifications,exampleCount:demos.length};
 }
 async function save(user,payload={}){
  signed(user);if(!object(payload)||!object(payload.input===undefined?{}:payload.input))fail('GROUP_INPUT_INVALID');
  const {id='',version=0,operation,input={},invite=''}=payload;
  if(sample(id))fail('GROUP_EXAMPLE_READ_ONLY');
  if(!id&&operation!=='create'||id&&operation==='create')fail('GROUP_INPUT_INVALID');
  const instant=new Date(now()).toISOString();
  if(!id){const item=createGroup(input,{id:idFor(),user,now:instant,inviteToken:idFor()});await commit(null,'',item);return {ok:true,item:groupDetail(item,user)};}
  const previous=await stored(id);
  // Authorization projection precedes version errors, preventing existence probes of private groups.
  if(operation!=='leave'||!groupViewer(previous.item,user).canLeave)groupDetail(previous.item,user,{invite});
  if(!Number.isInteger(version)||version!==previous.item.version)fail('GROUP_CONFLICT');
  const next=mutateGroup(previous.item,user,{operation,input,now:instant,idFor,inviteToken:idFor(),invite});
  await commit(previous.item,previous.raw,next);
  // A departing user may lose access to the detail, but still needs an acknowledgement.
  if(operation==='leave')return {ok:true,item:{id:next.id,version:next.version,left:true}};
  return {ok:true,item:groupDetail(next,user,{invite})};
 }
 const mediaOptions=()=>{const token=env.JCS_GROUPS_BLOB_READ_WRITE_TOKEN;if(!token)fail('GROUP_MEDIA_NOT_CONFIGURED');return {access:'private',token};};
 async function upload(user,payload={}){
  signed(user);if(!object(payload))fail('GROUP_INPUT_INVALID');const {id,purpose,contentType,base64}=payload;
  if(sample(id))fail('GROUP_EXAMPLE_READ_ONLY');
  const {raw,item}=await stored(id),viewer=groupViewer(item,user);
  if(!['cover','gallery'].includes(purpose))fail('GROUP_IMAGE_INVALID');
  if(purpose==='cover'?(!viewer.canEditSettings||item.status==='closed'):!viewer.canWrite)fail('GROUP_FORBIDDEN');
  const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  if(!Object.hasOwn(extensions,contentType))fail('GROUP_IMAGE_INVALID');
  if(typeof base64!=='string'||!base64.length||base64.length>2796204||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))fail('GROUP_IMAGE_INVALID');
  const bytes=Buffer.from(base64,'base64'),extension=extensions[contentType];if(bytes.length>2097152)fail('GROUP_IMAGE_TOO_LARGE');
  const valid=extension==='png'?bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):extension==='jpg'?bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(!valid)fail('GROUP_IMAGE_INVALID');if(item.assets.length>=500)fail('GROUP_LIMIT_REACHED');
  const opts=mediaOptions(),imageId=idFor(),pathname=`groups/${id}/${imageId}.${extension}`,createdAt=new Date(now()).toISOString();
  const uploaded=await putImpl(pathname,bytes,{...opts,contentType,addRandomSuffix:false,allowOverwrite:false});
  if(uploaded?.pathname!==pathname)fail('GROUP_STORAGE_FAILED');
  const next=structuredClone(item);next.assets.push({id:imageId,pathname,purpose,contentType,createdBy:user.id,createdAt});next.version++;next.updatedAt=createdAt;
  try{await commit(item,raw,next);}catch(error){
   // A network failure after EVAL can mean it committed. Delete only on a proven conflict/limit.
   if(['GROUP_CONFLICT','GROUP_LIMIT_REACHED'].includes(error.message)){try{await delImpl(pathname,{token:opts.token});}catch{/* keep original error; no existing asset is touched */}}
   throw error;
  }
  return {ok:true,image:{id:imageId,url:imageUrl(id,imageId)},version:next.version};
 }
 async function image(id,imageId,user){
  if(!validId(imageId)||sample(id))fail('GROUP_NOT_FOUND');const {item}=await stored(id),asset=item.assets.find(a=>a.id===imageId);
  if(!canReadGroupImage(item,user,asset))fail('GROUP_NOT_FOUND');
  const result=await getImpl(asset.pathname,{...mediaOptions(),useCache:false});
  if(!result||result.statusCode!==200||!result.stream)fail('GROUP_NOT_FOUND');
  return {stream:result.stream,contentType:asset.contentType};
 }
 return {get,list,save,upload,image};
}
