import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { campaignState, campaignSummary, prepareCampaignMutation, publicCampaign } from '../src/core/campaign-model.js';
import { politicianPhotoStorageStatus } from './politician-photo-service.js';
import { CAMPAIGN_EXAMPLES, campaignExample } from '../src/data/campaign-examples.js';

export const CAMPAIGN_KEYS={index:'jcsr2:campaigns:v1:index',sequence:'jcsr2:campaigns:v1:sequence',item:id=>'jcsr2:campaigns:v1:item:'+id,history:id=>'jcsr2:campaigns:v1:history:'+id};
const fail=code=>{throw new Error(code);};
const admin=user=>{if(!user?.id||user.role!=='admin')fail('ADMIN_REQUIRED');};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id);
const parse=raw=>{if(raw===null||raw===undefined)return null;try{return JSON.parse(raw);}catch{fail('CAMPAIGN_STORAGE_INVALID');}};
export const CAMPAIGN_COMMIT_LUA=`
local before=redis.call('GET',KEYS[1]) or ''
if before~=ARGV[1] then return cjson.encode({ok=false,error='CAMPAIGN_CONFLICT'}) end
if ARGV[2]=='delete' then
 redis.call('DEL',KEYS[1]);redis.call('HDEL',KEYS[2],ARGV[5]);return cjson.encode({ok=true,deleted=true})
end
local doc=cjson.decode(ARGV[3]);local docRaw=ARGV[3];local summaryRaw=ARGV[4];local historyRaw=ARGV[6]
if ARGV[2]=='publish' and doc.isExample~=true and (doc.number==nil or doc.number==cjson.null) then
 local number=redis.call('INCR',KEYS[3]);local replacement='"number":'..number
 docRaw=string.gsub(docRaw,'"number":null',replacement,1)
 summaryRaw=string.gsub(summaryRaw,'"number":null',replacement,1)
 historyRaw=string.gsub(historyRaw,'"number":null',replacement,1)
end
if ARGV[2]=='publish' then
 redis.call('RPUSH',KEYS[4],historyRaw)
end
redis.call('SET',KEYS[1],docRaw);redis.call('HSET',KEYS[2],doc.id,summaryRaw)
return '{"ok":true,"item":'..docRaw..'}'`;

export function createCampaignService({command,now=Date.now,putImpl=put,env=process.env,examples=true}={}){
  if(typeof command!=='function')fail('CAMPAIGN_STORAGE_MISSING');
  async function get(id,user,{edit=false}={}){
    if(edit)admin(user);if(!validId(id))fail('CAMPAIGN_NOT_FOUND');
    let record=parse(await command(['GET',CAMPAIGN_KEYS.item(id)]))||(examples?campaignExample(id):null);const sample=examples?campaignExample(id):null;if(record&&sample)record={...record,isExample:true,exampleNumber:sample.exampleNumber,number:null,draft:{...record.draft,support:sample.draft.support,funding:sample.draft.funding},published:record.published?{...record.published,support:sample.published.support,funding:sample.published.funding}:record.published};
    if(!record)fail('CAMPAIGN_NOT_FOUND');
    const item=edit?{...record,state:campaignState(record,now())}:publicCampaign(record,now());
    if(!item)fail('CAMPAIGN_NOT_FOUND');return {ok:true,item};
  }
  async function list(user,{view='current',page=1,category='all'}={}){
    if(!['current','archive','manage'].includes(view))view='current';if(view==='manage')admin(user);
    const instant=now(),stored=(await command(['HVALS',CAMPAIGN_KEYS.index])||[]).map(parse).filter(Boolean),overrides=new Map(stored.map(row=>[row.id,row]));
    let rows=examples?[...CAMPAIGN_EXAMPLES.map(row=>{const saved=overrides.get(row.id);return saved?{...saved,isExample:true,exampleNumber:row.exampleNumber,number:null,draft:{...saved.draft,support:row.draft.support,funding:row.draft.funding},published:saved.published?{...saved.published,support:row.published.support,funding:row.published.funding}:saved.published}:row;}),...stored.filter(row=>!campaignExample(row.id))]:stored;
    if(['politics','culture','business'].includes(category))rows=rows.filter(row=>{const content=view==='manage'?row.draft:(row.published||row.draft);return content?.category===category||(category==='politics'&&!content?.category);});
    const visible=rows.map(row=>campaignSummary(row,instant)).filter(Boolean);
    const current=visible.filter(row=>row.state==='current').sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))||Number(b.number)-Number(a.number));
    const archive=visible.filter(row=>row.state==='archive').sort((a,b)=>String(b.endDate).localeCompare(String(a.endDate))||Number(b.number)-Number(a.number));
    const counts={current:current.length,archive:archive.length};
    const selected=current.find(row=>row.featured)||null;
    const all=view==='manage'?rows.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(row=>({...row.draft,id:row.id,number:row.number,version:row.version,state:campaignState(row,instant),updatedAt:row.updatedAt,isExample:row.isExample===true,exampleNumber:row.exampleNumber})):view==='archive'?archive:current.filter(row=>row.id!==selected?.id);
    const pageSize=12,pages=Math.max(1,Math.ceil(all.length/pageSize)),currentPage=Math.min(pages,Math.max(1,Math.floor(Number(page)||1))),offset=(currentPage-1)*pageSize;
    return {ok:true,items:all.slice(offset,offset+pageSize),featured:view==='current'&&currentPage===1?selected:null,counts,total:view==='current'?current.length:all.length,page:currentPage,pageSize,hasMore:offset+pageSize<all.length};
  }
  async function save(user,{id='',version=0,operation='save',input={}}={}){
    admin(user);if(id&&!validId(id))fail('CAMPAIGN_NOT_FOUND');
    const existing=id?await command(['GET',CAMPAIGN_KEYS.item(id)]):null,base=id&&examples?campaignExample(id):null;
    if(id&&!existing&&!base)fail('CAMPAIGN_NOT_FOUND');
    const saved=parse(existing),previous=saved&&base?{...saved,isExample:true,exampleNumber:base.exampleNumber,number:null,draft:{...saved.draft,support:base.draft.support,funding:base.draft.funding},published:saved.published?{...saved.published,support:base.published.support,funding:base.published.funding}:saved.published}:saved||base,key=id||randomUUID(),instant=now();
    const mutationInput=base&&['save','publish'].includes(operation)?Object.fromEntries(Object.entries(input||{}).filter(([key])=>!['support','funding'].includes(key))):input;
    let record=prepareCampaignMutation(previous,mutationInput,{id:key,operation,version,actor:user.id,now:instant});if(record&&base){record.draft.support=base.draft.support;record.draft.funding=base.draft.funding;if(record.published){record.published.support=base.published.support;record.published.funding=base.published.funding;}}
    const summary=record?campaignSummary(record,instant,true):null;
    // Keep the JSON serialized by JS: Redis cjson re-encodes empty arrays as objects.
    const history=record?{id:key,number:record.number,version:record.version,publishedAt:record.publishedAt,content:record.published}:null;
    const result=parse(await command(['EVAL',CAMPAIGN_COMMIT_LUA,'4',CAMPAIGN_KEYS.item(key),CAMPAIGN_KEYS.index,CAMPAIGN_KEYS.sequence,CAMPAIGN_KEYS.history(key),existing||'',operation,JSON.stringify(record),JSON.stringify(summary),key,JSON.stringify(history)]));
    if(!result?.ok)fail(result?.error||'CAMPAIGN_STORAGE_INVALID');
    return result.deleted?{ok:true,deleted:true,item:{id:key}}:{ok:true,item:{...result.item,state:campaignState(result.item,instant)}};
  }
  async function upload(user,{contentType='',base64=''}={}){
    admin(user);
    const type=String(contentType).toLowerCase(),extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'},extension=extensions[type];
    if(!extension)fail('CAMPAIGN_IMAGE_TYPE_INVALID');
    if(typeof base64!=='string'||!base64.length||base64.length>2800000||!/^[-A-Za-z0-9+/=]+$/.test(base64))fail('CAMPAIGN_IMAGE_INVALID');
    const bytes=Buffer.from(base64,'base64');if(bytes.length>2097152)fail('CAMPAIGN_IMAGE_TOO_LARGE');
    const valid=extension==='jpg'?bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255:extension==='png'?bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
    if(!valid)fail('CAMPAIGN_IMAGE_INVALID');
    if(putImpl===put&&!politicianPhotoStorageStatus(env).configured)fail('PHOTO_STORAGE_NOT_CONFIGURED');
    const result=await putImpl(`campaigns/portraits/${randomUUID()}.${extension}`,bytes,{access:'public',contentType:type,addRandomSuffix:true,...(env.BLOB_READ_WRITE_TOKEN?{token:env.BLOB_READ_WRITE_TOKEN}:{})});
    if(!String(result?.url||'').startsWith('https://'))fail('CAMPAIGN_IMAGE_UPLOAD_FAILED');
    return {ok:true,url:result.url};
  }
  return {get,list,save,upload};
}
