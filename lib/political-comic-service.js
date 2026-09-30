import {randomUUID} from 'node:crypto';
import {isSuperAdmin} from '../src/core/membership.js';
import {DMZ_EPISODE} from '../src/data/political-comic-seed.js';
const KEY='jcsr2:political-comics:v1';
const CAS=`-- JCS_COMIC_CAS_V1
if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end
redis.call('SET',KEYS[1],ARGV[2]); return 1`;
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
const text=(v,n)=>String(v??'').trim().slice(0,n);
const url=v=>{const s=text(v,1500);try{return new URL(s).protocol==='https:'?s:'';}catch{return '';}};
const image=v=>{const s=text(v,1500);return /^\/assets\/[a-zA-Z0-9_./-]+$/.test(s)?s:url(s);};
const authorize=user=>{if(!isSuperAdmin(user))fail('ADMIN_REQUIRED',403);};
function normalize(input){
 const title=text(input.title,100),picture=image(input.image);
 if(!title)fail('TITLE_REQUIRED');if(!picture)fail('IMAGE_REQUIRED');
 if(!Array.isArray(input.panels)||input.panels.length!==4)fail('FOUR_PANELS_REQUIRED');
 const panels=input.panels.map(p=>({title:text(p.title,80),text:text(p.text,600),alt:text(p.alt,300)}));
 if(panels.some(p=>!p.title||!p.text||!p.alt))fail('PANEL_TEXT_REQUIRED');
 const sources=(Array.isArray(input.sources)?input.sources:[]).slice(0,12).map(s=>({label:text(s.label,140),url:url(s.url)}));
 if(!sources.length||sources.some(s=>!s.label||!s.url))fail('SOURCE_REQUIRED');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||Number.isNaN(Date.parse(input.date)))fail('DATE_REQUIRED');
 return {format:input.format==='comic'?'comic':'illustration',title,image:picture,panels,sources,date:input.date,summary:text(input.summary,300),category:text(input.category,40),takeaway:text(input.takeaway,1000),published:input.published===true};
}
export function createComicService({command}={}){
 const decode=raw=>{if(!raw)return {items:[structuredClone(DMZ_EPISODE)]};try{const data=JSON.parse(raw);if(!Array.isArray(data.items))throw Error();data.items=data.items.map(p=>p.id===DMZ_EPISODE.id&&p.image==='/assets/webtoons/dmz-20260921.webp'?{...p,image:DMZ_EPISODE.image,format:'comic'}:p);return data;}catch{fail('COMIC_STORAGE_INVALID',503);}};
 return {
  async list({admin=false,user}={}){if(admin)authorize(user);const data=decode(await command(['GET',KEY]));return {ok:true,items:data.items.filter(p=>admin||p.published===true).sort((a,b)=>b.number-a.number)};},
  async save(input,user){authorize(user);const fields=normalize(input),newId=randomUUID();
   for(let i=0;i<6;i++){
    const raw=await command(['GET',KEY])||'',data=decode(raw),old=data.items.find(p=>p.id===input.id);
    if(input.id&&!old)fail('NOT_FOUND',404);
    if(old&&input.updatedAt!==old.updatedAt)fail('EDIT_CONFLICT',409);
    const item={...fields,id:old?.id||newId,number:old?.number||Math.max(0,...data.items.map(p=>p.number||0))+1,updatedAt:new Date().toISOString()};
    data.items=old?data.items.map(p=>p.id===old.id?item:p):[item,...data.items];
    if(Number(await command(['EVAL',CAS,'1',KEY,raw,JSON.stringify(data)]))===1)return item;
   }fail('SAVE_BUSY',409);
  }
 };
}
