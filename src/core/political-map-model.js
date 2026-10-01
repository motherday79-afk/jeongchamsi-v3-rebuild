// Registered profile counts, not votes, population, approval, or electoral forecasts.
export const POLITICAL_MAP_TYPES=Object.freeze(['assembly','metropolitan','basic']);
const REGION_ALIASES={
 서울:['서울특별시','서울'],부산:['부산광역시','부산'],대구:['대구광역시','대구'],인천:['인천광역시','인천'],
 대전:['대전광역시','대전'],울산:['울산광역시','울산'],세종:['세종특별자치시','세종'],경기:['경기도','경기'],
 강원:['강원특별자치도','강원도','강원'],충북:['충청북도','충북'],충남:['충청남도','충남'],전북:['전북특별자치도','전라북도','전북'],
 전남광주:['전남광주통합특별시','전남광주','광주광역시','광주','전라남도','전남'],경북:['경상북도','경북'],경남:['경상남도','경남'],제주:['제주특별자치도','제주도','제주'],
};
export const POLITICAL_MAP_REGIONS=Object.freeze([...Object.keys(REGION_ALIASES),'비례대표','미분류'].map(id=>Object.freeze({id,label:id==='전남광주'?'전남·광주':id})));
export function normalizeParty(value){
 const party=String(value||'').trim().replace(/\s+/g,'');
 return ({민주당:'더불어민주당',국힘:'국민의힘',국민의힘:'국민의힘',개혁신당:'개혁신당',무소속:'무소속'})[party]||party||'미분류';
}
export function normalizeRegion(person={}){
 const region=String(typeof person==='string'?person:person?.region||'').trim();
 const jurisdiction=String(typeof person==='object'?person?.jurisdiction||'':'').trim();
 if(/비례/.test(region+' '+jurisdiction))return '비례대표';
 for(const value of [region,jurisdiction]){
  for(const [id,aliases] of Object.entries(REGION_ALIASES)){
   if(aliases.some(alias=>value===alias||value.startsWith(alias+' ')))return id;
  }
 }
 return '미분류';
}
function aggregate(items){
 const byType=Object.fromEntries(POLITICAL_MAP_TYPES.map(type=>[type,0])),counts=new Map();let vacant=0;
 for(const person of items){
  byType[person.type]++;
  if(person.isVacant)vacant++;
  const party=person.isVacant?'공석':normalizeParty(person.party);
  counts.set(party,(counts.get(party)||0)+1);
 }
 const total=items.length;
 const parties=[...counts].map(([party,count])=>({party,count,share:total?count/total:0})).sort((a,b)=>b.count-a.count||a.party.localeCompare(b.party,'ko'));
 return {total,occupied:total-vacant,vacant,byType,parties};
}
export function politicalMapSummary(source,{type='all',region='all',party='all'}={}){
 const seen=new Set(),regionFilter=region==='all'?'all':normalizeRegion(region),partyFilter=party==='all'?'all':normalizeParty(party);
 const items=(Array.isArray(source)?source:[]).filter(person=>{
  if(!person?.id||!POLITICAL_MAP_TYPES.includes(person.type)||seen.has(String(person.id)))return false;
  seen.add(String(person.id));
  return (type==='all'||person.type===type)&&(regionFilter==='all'||normalizeRegion(person)===regionFilter)&&(partyFilter==='all'||(person.isVacant?'공석':normalizeParty(person.party))===partyFilter);
 });
 return {items,...aggregate(items),regions:POLITICAL_MAP_REGIONS.map(row=>({...row,...aggregate(items.filter(person=>normalizeRegion(person)===row.id))}))};
}
