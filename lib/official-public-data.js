const SOURCE_URL='https://jumin.mois.go.kr/ageStatMonth.do';
const AGE_LABELS=['20대','30대','40대','50대','60대 이상'];
const decode=value=>String(value||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const number=value=>Number(String(value||'').replace(/[^0-9.-]/g,''))||0;
const share=(male,female)=>{const total=male+female;return total?{maleShare:Number((male/total*100).toFixed(2)),femaleShare:Number((female/total*100).toFixed(2))}:{maleShare:50,femaleShare:50};};

export function parseMoisAgeSex(html){
  const regions={};
  for(const match of String(html||'').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(item=>decode(item[1]));
    if(cells.length<41||!/^\d{10}$/.test(cells[0]))continue;
    const values=cells.slice(2).map(number),male=values.slice(15,26),female=values.slice(28,39);
    const groups=[[2],[3],[4],[5],[6,7,8,9,10]];
    regions[cells[1]]=AGE_LABELS.map((age,index)=>({age,...share(groups[index].reduce((sum,i)=>sum+male[i],0),groups[index].reduce((sum,i)=>sum+female[i],0))}));
  }
  if(!Object.keys(regions).length){const error=new Error('MOIS_POPULATION_TABLE_EMPTY');error.code=error.message;throw error;}
  return {regions,source:{provider:'MOIS_RESIDENT_POPULATION',title:'행정안전부 행정동별 연령별 인구현황',url:SOURCE_URL,collectedAt:new Date().toISOString()}};
}

const REGION_ALIASES={서울:'서울특별시',부산:'부산광역시',대구:'대구광역시',인천:'인천광역시',광주:'전남광주통합특별시',대전:'대전광역시',울산:'울산광역시',세종:'세종특별자치시',경기:'경기도',강원:'강원특별자치도',충북:'충청북도',충남:'충청남도',전북:'전북특별자치도',전남:'전남광주통합특별시',경북:'경상북도',경남:'경상남도',제주:'제주특별자치도'};
export function selectAgeSexForPerson(context,person){
  if(!context?.regions)return null;const raw=String(person?.region||person?.jurisdiction||''),key=Object.keys(REGION_ALIASES).find(name=>raw.includes(name)),region=REGION_ALIASES[key]||'전국';return context.regions[region]||context.regions['전국']||null;
}

export async function fetchOfficialPopulationContext(options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(1000,Number(options.timeoutMs)||7000));
  try{const response=await (options.fetchImpl||fetch)(SOURCE_URL,{headers:{Accept:'text/html'},signal:controller.signal});if(!response?.ok)throw Object.assign(new Error(`MOIS_POPULATION_HTTP_${Number(response?.status)||0}`),{code:`MOIS_POPULATION_HTTP_${Number(response?.status)||0}`});return parseMoisAgeSex(await response.text());}
  finally{clearTimeout(timer);}
}
