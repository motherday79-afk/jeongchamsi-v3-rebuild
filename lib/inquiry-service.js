import { TARGET_KEYS } from './migration-service.js';

const text=(value,max)=>String(value??'').trim().slice(0,max);
const parse=raw=>{try{return raw?JSON.parse(raw):null;}catch{return null;}};
const canRead=(item,user)=>!!item&&item.deleted!==true&&(item.visibility==='public'||String(item.ownerId||'')===String(user?.id||'')||user?.role==='admin');

export function createInquiryService({command,now=()=>new Date(),randomId=()=>Math.random().toString(36).slice(2,8)}){
  if(typeof command!=='function')throw new Error('INQUIRY_STORAGE_REQUIRED');
  const readOne=async id=>parse(await command(['GET',TARGET_KEYS.inquiry(id)]));
  const readIds=async ids=>{
    if(!ids.length)return [];
    const raws=await command(['MGET',...ids.map(TARGET_KEYS.inquiry)]);
    return (Array.isArray(raws)?raws:[]).map(parse).filter(Boolean);
  };
  return {
    async create(user,input={}){
      if(!user?.id)return {ok:false,error:'LOGIN_REQUIRED'};
      const title=text(input.title,200),body=text(input.body,20000),visibility=input.visibility==='private'?'private':'public';
      if(!title||!body)return {ok:false,error:'INQUIRY_REQUIRED'};
      const date=now(),createdAt=date instanceof Date?date.toISOString():new Date(date).toISOString(),score=Date.parse(createdAt)||Date.now(),id=`inquiry-${score.toString(36)}-${text(randomId(),20)}`;
      const item={id,title,body,visibility,ownerId:String(user.id),author:text(user.nickname||user.id,40),createdAt,updatedAt:createdAt,answer:null};
      await command(['SET',TARGET_KEYS.inquiry(id),JSON.stringify(item)]);
      await command(['ZADD',TARGET_KEYS.inquiryIndexAll,String(score),id]);
      await command(['ZADD',TARGET_KEYS.inquiryIndexUser(user.id),String(score),id]);
      if(visibility==='public')await command(['ZADD',TARGET_KEYS.inquiryIndexPublic,String(score),id]);
      return {ok:true,item};
    },
    async list(user,{offset=0,limit=50}={}){
      const indices=user?.role==='admin'?[TARGET_KEYS.inquiryIndexAll]:user?.id?[TARGET_KEYS.inquiryIndexPublic,TARGET_KEYS.inquiryIndexUser(user.id)]:[TARGET_KEYS.inquiryIndexPublic];
      const batches=await Promise.all(indices.map(key=>command(['ZREVRANGE',key,'0','499']))),ids=[...new Set(batches.flat().map(String))],items=(await readIds(ids)).filter(item=>canRead(item,user)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
      const start=Math.max(0,Number(offset)||0),cap=Math.min(100,Math.max(1,Number(limit)||50));
      return {ok:true,total:items.length,items:items.slice(start,start+cap)};
    },
    async get(id,user){
      const item=await readOne(text(id,80));
      if(!item||item.deleted)return {ok:false,error:'INQUIRY_NOT_FOUND'};
      return canRead(item,user)?{ok:true,item}:{ok:false,error:'INQUIRY_FORBIDDEN'};
    },
    async edit(id,user,input={},remove=false){
      if(!user?.id)return {ok:false,error:'LOGIN_REQUIRED'};
      const item=await readOne(text(id,80));if(!item||item.deleted)return {ok:false,error:'INQUIRY_NOT_FOUND'};
      if(user.role!=='admin'&&String(user.id)!==String(item.ownerId))return {ok:false,error:'INQUIRY_FORBIDDEN'};
      if(remove)item.deleted=true;
      else {const title=text(input.title,200),body=text(input.body,20000);if(!title||!body)return {ok:false,error:'INQUIRY_REQUIRED'};item.title=title;item.body=body;}
      item.updatedAt=new Date(now()).toISOString();await command(['SET',TARGET_KEYS.inquiry(item.id),JSON.stringify(item)]);return {ok:true,item:remove?null:item};
    },
    async reply(id,user,body){
      if(user?.role!=='admin')return {ok:false,error:'ADMIN_REQUIRED'};
      const item=await readOne(text(id,80)),message=text(body,20000);
      if(!item||item.deleted)return {ok:false,error:'INQUIRY_NOT_FOUND'};
      if(!message)return {ok:false,error:'INQUIRY_ANSWER_REQUIRED'};
      const date=now(),createdAt=date instanceof Date?date.toISOString():new Date(date).toISOString();
      item.answer={body:message,author:text(user.nickname||user.id,40),ownerId:String(user.id),createdAt};item.updatedAt=createdAt;
      await command(['SET',TARGET_KEYS.inquiry(item.id),JSON.stringify(item)]);
      return {ok:true,item};
    }
  };
}
