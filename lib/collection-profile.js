import {createHash} from 'node:crypto';

const clean=value=>String(value??'').normalize('NFKC').trim();
const key=value=>clean(value).replace(/\s+/g,'');
export const NAME_COLLECTION_PROFILE=Object.freeze({mode:'name',searchKeywords:[],newsRegions:[]});
export function validateCollectionProfile(input,person){
 if(input?.mode==='name')return {...NAME_COLLECTION_PROFILE};
 if(input?.mode!=='specified')throw Error('COLLECTION_PROFILE_INVALID');
 const list=(values,max)=>{if(!Array.isArray(values)||values.length<1||values.length>max)throw Error('COLLECTION_PROFILE_INVALID');const rows=[...new Set(values.map(key))];if(rows.some(x=>!x||x.length>40||!/^[가-힣a-zA-Z0-9]+$/.test(x)))throw Error('COLLECTION_PROFILE_INVALID');return rows;};
 const searchKeywords=list(input.searchKeywords,5),newsRegions=list(input.newsRegions,5),name=key(person?.name);
 if(!name||searchKeywords.some(x=>x===name||!x.includes(name)))throw Error('COLLECTION_PROFILE_INVALID');
 return {mode:'specified',searchKeywords,newsRegions};
}
export function collectionProfileFor(person,record={}){
 if(record.collectionProfile)return validateCollectionProfile(record.collectionProfile,person);
 if(person?.id==='assembly-211'&&person.name==='박지원'&&/전북|군산|김제|부안/.test(person.jurisdiction||person.region||''))return {mode:'specified',searchKeywords:['전북박지원','군산박지원','김제박지원','부안박지원'],newsRegions:['전북','군산','김제','부안']};
 return {...NAME_COLLECTION_PROFILE};
}
export function collectionScope(person,profile,exclusions=[]){
 return (profile?.mode==='specified'?'specified:':exclusions.length?'filtered:':'name:')+createHash('sha256').update(JSON.stringify({name:person.name,profile:profile||NAME_COLLECTION_PROFILE,exclusions:[...exclusions].sort()})).digest('hex').slice(0,24);
}
