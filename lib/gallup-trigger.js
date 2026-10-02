import {createHash} from 'node:crypto';
export function gallupFingerprint(p){
 if(!p)return null;
 const rows=p.results?.parties||p.parties;
 const results=rows?[...rows].map(({id,value})=>({id,value})).sort((a,b)=>a.id.localeCompare(b.id)):
 Object.fromEntries(['positive','negative','undecided'].map(k=>[k,p.results?.overall?.[k]??null]));
 return createHash('sha256').update(JSON.stringify({publishedDate:p.publishedDate,startDate:p.startDate,endDate:p.endDate,results})).digest('hex');
}
export function latestGallup(items=[]){return items.filter(p=>p?.provenance?.provider==='gallup'||p?.provider==='gallup'||p?.institution==='한국갤럽').sort((a,b)=>String(b.publishedDate).localeCompare(String(a.publishedDate)))[0]||null;}
