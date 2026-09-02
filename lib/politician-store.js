import { TARGET_KEYS } from './migration-service.js';

export const POLITICIAN_TYPES=Object.freeze(['assembly','metropolitan','basic']);
export const POLITICIAN_COUNTS=Object.freeze({assembly:300,metropolitan:16,basic:227,total:543});

const parse=(raw,fallback)=>{if(!raw)return fallback;try{return JSON.parse(raw);}catch{return fallback;}};
export const cleanPoliticianType=value=>POLITICIAN_TYPES.includes(String(value||''))?String(value):'';

export function searchPoliticianProfiles(groups,query,limit=20){
  const needle=String(query||'').trim().toLocaleLowerCase('ko-KR');
  if(!needle)return [];
  const cap=Math.min(50,Math.max(1,Number(limit)||20));
  const rows=POLITICIAN_TYPES.flatMap(type=>Array.isArray(groups?.[type])?groups[type]:[]);
  return rows.filter(item=>[
    item?.name,item?.party,item?.jurisdiction,item?.office,item?.roleLabel,item?.committee
  ].some(value=>String(value||'').toLocaleLowerCase('ko-KR').includes(needle))).slice(0,cap);
}

export async function readPoliticianType(command,type){
  const safe=cleanPoliticianType(type);if(!safe)return [];
  const data=parse(await command(['GET',TARGET_KEYS.politicians(safe)]),{items:[]});
  return Array.isArray(data?.items)?data.items:[];
}
export async function readPoliticianPhotos(command){
  const data=parse(await command(['GET',TARGET_KEYS.politicianPhotos]),{items:{}});
  return data?.items&&typeof data.items==='object'&&!Array.isArray(data.items)?data.items:{};
}
export async function getPolitician(command,id){
  const match=String(id||'').match(/^(assembly|metropolitan|basic)-\d{3}$/);if(!match)return null;
  const items=await readPoliticianType(command,match[1]);return items.find(item=>String(item.id)===String(id))||null;
}
