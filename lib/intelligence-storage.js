const finite=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const text=value=>String(value||'').trim();
const boundedText=(value,limit)=>text(value).slice(0,limit);

function compactNews(items){
  return (Array.isArray(items)?items:[]).slice(0,10).map(item=>({
    title:boundedText(item?.title,280),description:boundedText(item?.description,360),source:boundedText(item?.source,100),url:boundedText(item?.url,1000),publishedAt:boundedText(item?.publishedAt||item?.date,40)
  })).filter(item=>item.title||item.source);
}

function compactOfficialContext(value){
  const context=value&&typeof value==='object'?value:{},ageSex=(Array.isArray(context.ageSex)?context.ageSex:[]).slice(0,5).map(item=>({
    age:boundedText(item?.age,20),maleShare:finite(item?.maleShare),femaleShare:finite(item?.femaleShare)
  })).filter(item=>item.age);
  const partySupport=Object.fromEntries(Object.entries(context?.gallup?.partySupport||{}).slice(0,12).filter(([,score])=>Number.isFinite(Number(score))).map(([party,score])=>[boundedText(party,80),finite(score)]));
  const source=context?.source&&typeof context.source==='object'?{title:boundedText(context.source.title,160),url:boundedText(context.source.url,1000)}:null;
  const gallupSource=context?.gallup?.source&&typeof context.gallup.source==='object'?{title:boundedText(context.gallup.source.title,160),url:boundedText(context.gallup.source.url,1000)}:null;
  const result={};
  if(ageSex.length)result.ageSex=ageSex;
  if(Object.keys(partySupport).length||gallupSource)result.gallup={...(Object.keys(partySupport).length?{partySupport}:{}),...(gallupSource?{source:gallupSource}:{})};
  if(source)result.source=source;
  return Object.keys(result).length?result:null;
}

function compactSourceErrors(errors){
  return (Array.isArray(errors)?errors:[]).slice(0,4).map(item=>({
    source:boundedText(item?.source,80),code:boundedText(item?.code,120),attempts:Math.max(1,Number(item?.attempts)||1)
  })).filter(item=>item.source||item.code);
}

function compactOverrides(value){
  const input=value&&typeof value==='object'?value:{},diagnoses=(Array.isArray(input.diagnoses)?input.diagnoses:[]).map(row=>({
    id:boundedText(row?.id,4),...Object.fromEntries(['headline','currentPosition','politicalMeaning','opportunity','risk','interpretation'].filter(key=>row?.[key]!==undefined).map(key=>[key,key==='interpretation'?(Array.isArray(row[key])?row[key].map(item=>boundedText(item,500)).slice(0,4):[]):boundedText(row[key],1200)]))
  })).filter(row=>row.id),prescriptions=(Array.isArray(input.prescriptions)?input.prescriptions:[]).map(row=>({
    id:boundedText(row?.id,4),...Object.fromEntries(['strategicJudgment','recommendedActions','actions','targetGroups','target','messageDirection'].filter(key=>row?.[key]!==undefined).map(key=>[key,Array.isArray(row[key])?row[key].map(item=>boundedText(item,500)).slice(0,4):boundedText(row[key],1200)]))
  })).filter(row=>row.id),result={};
  if(diagnoses.length)result.diagnoses=diagnoses;
  if(prescriptions.length)result.prescriptions=prescriptions;
  return Object.keys(result).length?result:null;
}

export function compactIntelligenceDraft(draft,options={}){
  const source=draft?.raw||{},volume=source?.searchAds?.volume||{};
  const searchStatus=source?.searchAds&&typeof source.searchAds==='object'?'DIRECT':'MISSING';
  const newsStatus=source?.news&&typeof source.news==='object'?'DIRECT':'MISSING';
  const pc=finite(volume.pc),mobile=finite(volume.mobile),rawNewsItems=Array.isArray(source?.news?.items)?source.news.items:[],newsItems=compactNews(rawNewsItems);
  const sources=new Set(rawNewsItems.map(item=>text(item?.source)).filter(Boolean));
  const timestamps=newsItems.map(item=>Date.parse(item.publishedAt||'')).filter(Number.isFinite),latest=Math.max(0,...timestamps),overrides=compactOverrides(options.adminOverrides||draft?.adminOverrides);
  return {
    storageMode:'INPUT_ONLY_V4',id:text(draft?.id),snapshot:text(draft?.snapshot),algorithmVersion:text(draft?.algorithmVersion),
    input:{searchAds:searchStatus==='DIRECT'?{volume:{pc,mobile,total:pc+mobile}}:null,news:{items:newsItems},officialContext:compactOfficialContext(source?.officialContext),sourceErrors:compactSourceErrors(source?.sourceErrors)},
    rankingInput:{searchTotal:pc+mobile,articleCount:rawNewsItems.length,sourceCount:sources.size,latestPublishedAt:latest?new Date(latest).toISOString():'',searchStatus,newsStatus},
    ...(overrides?{adminOverrides:overrides}:{})
  };
}

export function validateCompactSnapshot(drafts,expectedIds=[]){
  const rows=Array.isArray(drafts)?drafts:[],expected=[...new Set((expectedIds||[]).map(String))],ids=rows.map(row=>text(row?.id)),seen=new Set(),duplicateIds=[];
  for(const id of ids){if(seen.has(id))duplicateIds.push(id);seen.add(id);}
  const expectedSet=new Set(expected),missingIds=expected.filter(id=>!seen.has(id)),unexpectedIds=ids.filter(id=>!expectedSet.has(id));
  const invalid=rows.filter(row=>row?.storageMode!=='INPUT_ONLY_V4'||!row?.id||!row?.snapshot||!row?.input||!row?.rankingInput||!Array.isArray(row?.input?.news?.items)).map(row=>({id:text(row?.id),errors:['COMPACT_INPUT_INVALID']}));
  return {ok:rows.length===expected.length&&!missingIds.length&&!duplicateIds.length&&!unexpectedIds.length&&!invalid.length,total:rows.length,expected:expected.length,missingIds,duplicateIds:[...new Set(duplicateIds)],unexpectedIds:[...new Set(unexpectedIds)],invalid,storageMode:'INPUT_ONLY_V4'};
}
