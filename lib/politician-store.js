import { GOVERNMENT_PHOTOS } from '../src/data/government-photos.js';
import { TARGET_KEYS } from './migration-service.js';
import { applyPoliticianRoleUpdates } from './politician-role-updates.js';
import { NON_INCUMBENT_POLITICIANS, NON_INCUMBENT_PHOTOS } from './non-incumbent-politicians.js';
import { GOVERNMENT_POLITICIANS } from '../src/data/government-people.js';

export const POLITICIAN_TYPES=Object.freeze(['assembly','metropolitan','basic','nonincumbent','government']);
export const POLITICIAN_COUNTS=Object.freeze({assembly:300,metropolitan:16,basic:227,nonincumbent:NON_INCUMBENT_POLITICIANS.length,government:GOVERNMENT_POLITICIANS.length,total:543+NON_INCUMBENT_POLITICIANS.length+GOVERNMENT_POLITICIANS.length});

const parse=(raw,fallback)=>{if(!raw)return fallback;try{return JSON.parse(raw);}catch{return fallback;}};
export const cleanPoliticianType=value=>POLITICIAN_TYPES.includes(String(value||''))?String(value):'';

export function searchPoliticianProfiles(groups,query,limit=20){
  const raw=String(query||'').trim().toLocaleLowerCase('ko-KR');
  const needle=({'민주당':'더불어민주당','국힘':'국민의힘','국민의 힘':'국민의힘'})[raw]||raw;
  if(!needle)return [];
  const cap=limit===Infinity?Infinity:Math.min(50,Math.max(1,Number(limit)||20));
  const rows=POLITICIAN_TYPES.flatMap(type=>Array.isArray(groups?.[type])?groups[type]:[]);
  return rows.filter(item=>[
    item?.name,item?.party,item?.jurisdiction,item?.office,item?.roleLabel,item?.committee,item?.primaryRole?.title,item?.secondaryRole,...(item?.currentRoles||[]).map(role=>role?.title)
  ].some(value=>String(value||'').toLocaleLowerCase('ko-KR').includes(needle))).slice(0,cap);
}

export async function readPoliticianType(command,type){
  const safe=cleanPoliticianType(type);if(!safe)return [];
  const data=parse(await command(['GET',TARGET_KEYS.politicians(safe)]),{items:safe==='nonincumbent'?NON_INCUMBENT_POLITICIANS:[]});
  if(safe==='government'){
    const stored=new Map((Array.isArray(data?.items)?data.items:[]).map(person=>[person.id,person]));
    return GOVERNMENT_POLITICIANS.map(person=>applyPoliticianRoleUpdates({...person,...stored.get(person.id),id:person.id,name:person.name,type:'government'}));
  }
  return Array.isArray(data?.items)?data.items.map(applyPoliticianRoleUpdates):[];
}
export async function readPoliticianPhotos(command){
  const [data,overrides]=await Promise.all([command(['GET',TARGET_KEYS.politicianPhotos]),command(['GET',TARGET_KEYS.politicianPhotoOverrides])].map(async pending=>parse(await pending,{items:{}})));
  const base=data?.items&&typeof data.items==='object'&&!Array.isArray(data.items)?data.items:{},extra=overrides?.items&&typeof overrides.items==='object'&&!Array.isArray(overrides.items)?overrides.items:{};
  const photos={...NON_INCUMBENT_PHOTOS,...base,...extra};
  for(const [id,photo] of Object.entries(GOVERNMENT_PHOTOS))if(!photos[id]?.url&&!photos[id]?.localPath)photos[id]=photo;
  return photos;
}
export async function getPolitician(command,id){
  const match=String(id||'').match(/^(assembly|metropolitan|basic|nonincumbent|government)-\d{3}$/);if(!match)return null;
  const items=await readPoliticianType(command,match[1]);return items.find(item=>String(item.id)===String(id))||null;
}
