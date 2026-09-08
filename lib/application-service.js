import { TARGET_KEYS } from './migration-service.js';

const clean=(value,limit=200)=>String(value??'').trim().slice(0,limit);
const clone=value=>JSON.parse(JSON.stringify(value));
const normalizeName=value=>clean(value,40).replace(/\s+/g,'').toLocaleLowerCase('ko-KR');
const ACTIVE_REQUEST_STATUSES=new Set(['received','in_progress','waiting']);
const REQUEST_STATUSES=new Set([...ACTIVE_REQUEST_STATUSES,'approved','rejected']);

async function read(command,key){const raw=await command(['GET',key]);if(!raw)return {items:[]};try{const value=JSON.parse(raw);return {items:Array.isArray(value?.items)?value.items:[]};}catch{return {items:[]};}}
async function write(command,key,value){await command(['SET',key,JSON.stringify(value)]);return value;}

export function createApplicationService({command,now=()=>new Date()}={}){
  if(typeof command!=='function')throw new Error('APPLICATION_STORAGE_REQUIRED');
  const stamp=()=>{const value=now();return (value instanceof Date?value:new Date(value)).toISOString();};
  const makeId=prefix=>`${prefix}-${Date.parse(stamp()).toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  return {
    async createPoliticianRequest(user,input={}){
      if(!user?.id)return {ok:false,error:'LOGIN_REQUIRED'};
      const name=clean(input.name,40),normalizedName=normalizeName(name);if(normalizedName.length<2)return {ok:false,error:'POLITICIAN_NAME_REQUIRED'};
      const data=await read(command,TARGET_KEYS.politicianRequests),existing=data.items.find(item=>item.normalizedName===normalizedName&&ACTIVE_REQUEST_STATUSES.has(item.status));
      if(existing)return {ok:true,duplicate:true,item:clone(existing)};
      const createdAt=stamp(),item={id:makeId('politician-request'),name,normalizedName,status:'received',requesterId:clean(user.id,24),requesterNickname:clean(user.nickname||user.id,40),createdAt,updatedAt:createdAt};
      data.items=[item,...data.items].slice(0,1000);await write(command,TARGET_KEYS.politicianRequests,data);return {ok:true,item:clone(item)};
    },
    async listPoliticianRequests(user){
      if(!user?.id)return {ok:false,error:'LOGIN_REQUIRED',items:[]};
      const data=await read(command,TARGET_KEYS.politicianRequests),admin=user.role==='admin';
      return {ok:true,items:data.items.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(item=>admin?clone(item):({id:item.id,name:item.name,status:item.status,createdAt:item.createdAt,updatedAt:item.updatedAt}))};
    },
    async updatePoliticianRequest(user,id,status){
      if(user?.role!=='admin')return {ok:false,error:'ADMIN_REQUIRED'};const next=clean(status,20);if(!REQUEST_STATUSES.has(next))return {ok:false,error:'INVALID_REQUEST_STATUS'};
      const data=await read(command,TARGET_KEYS.politicianRequests),item=data.items.find(row=>row.id===clean(id,100));if(!item)return {ok:false,error:'REQUEST_NOT_FOUND'};
      item.status=next;item.updatedAt=stamp();item.updatedBy=clean(user.id,24);await write(command,TARGET_KEYS.politicianRequests,data);return {ok:true,item:clone(item)};
    },
    async createPartnerApplication(user,input={}){
      const name=clean(input.name,80),contact=clean(input.contact,160),message=clean(input.message,4000);if(!name||!contact||!message)return {ok:false,error:'PARTNER_FIELDS_REQUIRED'};
      const createdAt=stamp(),item={id:makeId('partner-application'),name,contact,message,ownerId:clean(user?.id,24),visibility:'private',status:'received',createdAt,updatedAt:createdAt};
      const data=await read(command,TARGET_KEYS.partnerApplications);data.items=[item,...data.items].slice(0,1000);await write(command,TARGET_KEYS.partnerApplications,data);return {ok:true,item:{id:item.id,status:item.status,createdAt:item.createdAt}};
    },
    async listPartnerApplications(user){
      if(user?.role!=='admin')return {ok:false,error:'ADMIN_REQUIRED',items:[]};const data=await read(command,TARGET_KEYS.partnerApplications);return {ok:true,items:data.items.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(clone)};
    }
  };
}
