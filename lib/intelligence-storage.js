const finite=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const text=value=>String(value||'').trim();
const boundedText=(value,limit)=>text(value).slice(0,limit);

function compactNews(items){
  return (Array.isArray(items)?items:[]).slice(0,10).map(item=>({
    title:boundedText(item?.title,280),description:boundedText(item?.description,360),source:boundedText(item?.source,100),url:boundedText(item?.url,1000),publishedAt:boundedText(item?.publishedAt||item?.date,40)
  })).filter(item=>item.title||item.source);
}

function compactEvidenceNews(items,profile={}){
  const jurisdiction=text(profile?.jurisdiction),region=text(profile?.region),placeTerms=[jurisdiction,jurisdiction.replace(/\s+/g,''),region,region.replace(/\s+/g,'')].filter(value=>value.length>=2);
  const evidencePattern=/정책|공약|법안|입법|예산|사업|착공|준공|개통|시행|집행|선거|총선|대선|당선|낙선|득표|후보|지역구|지역\s*(?:현안|민심|주민|현장)/;
  const seen=new Set(),rows=[];
  for(const item of Array.isArray(items)?items:[]){
    const title=text(item?.title),url=text(item?.url),key=url||title;
    if(!key||seen.has(key)||(!evidencePattern.test(title)&&!placeTerms.some(term=>title.includes(term))))continue;
    seen.add(key);rows.push({title:boundedText(title,280),source:boundedText(item?.source,100),url:boundedText(url,1000),publishedAt:boundedText(item?.publishedAt||item?.date,40)});
    if(rows.length===8)break;
  }
  return rows;
}

function compactSourceCounts(items,referenceAt){
  const rows=Array.isArray(items)?items:[],requested=Date.parse(referenceAt||''),dated=rows.map(item=>Date.parse(item?.publishedAt||item?.date||'')).filter(Number.isFinite),reference=Number.isFinite(requested)?requested:Math.max(0,...dated),counts=new Map();
  for(const item of rows){
    const name=boundedText(item?.source,100);if(!name)continue;
    const current=counts.get(name)||{name,count:0,h24:0,d7:0,d30:0},stamp=Date.parse(item?.publishedAt||item?.date||''),age=reference-stamp;
    current.count+=1;
    if(reference&&Number.isFinite(stamp)&&age>=0){if(age<=86400000)current.h24+=1;if(age<=7*86400000)current.d7+=1;if(age<=30*86400000)current.d30+=1;}
    counts.set(name,current);
  }
  return [...counts.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ko')).slice(0,50);
}

function compactPeriodCounts(items,referenceAt){
  const rows=Array.isArray(items)?items:[],requested=Date.parse(referenceAt||''),dated=rows.map(item=>Date.parse(item?.publishedAt||item?.date||'')).filter(Number.isFinite),reference=Number.isFinite(requested)?requested:Math.max(0,...dated);
  const within=days=>rows.filter(item=>{const stamp=Date.parse(item?.publishedAt||item?.date||''),age=reference-stamp;return reference&&Number.isFinite(stamp)&&age>=0&&age<=days*86400000;}).length;
  return [{label:'24H',value:within(1)},{label:'7D',value:within(7)},{label:'30D',value:within(30)}];
}

function compactOfficialContext(value){
  const context=value&&typeof value==='object'?value:{},ageSex=(Array.isArray(context.ageSex)?context.ageSex:[]).slice(0,5).map(item=>({
    age:boundedText(item?.age,20),maleShare:finite(item?.maleShare),femaleShare:finite(item?.femaleShare)
  })).filter(item=>item.age);
  const elections=(Array.isArray(context?.officialElection?.elections)?context.officialElection.elections:[]).slice(0,4).map(row=>({year:boundedText(row?.year||row?.date,20),election:boundedText(row?.election||row?.name,100),result:boundedText(row?.result,30),voteRate:Number.isFinite(Number(row?.voteRate))?Number(row.voteRate):null,opponent:boundedText(row?.opponent,60),opponentRate:Number.isFinite(Number(row?.opponentRate))?Number(row.opponentRate):null,margin:Number.isFinite(Number(row?.margin))?Number(row.margin):null,regions:(Array.isArray(row?.regions)?row.regions:[]).slice(0,20).map(region=>({name:boundedText(region?.name||region?.region,60),voteRate:Number.isFinite(Number(region?.voteRate))?Number(region.voteRate):null,opponentRate:Number.isFinite(Number(region?.opponentRate))?Number(region.opponentRate):null,margin:Number.isFinite(Number(region?.margin))?Number(region.margin):null,status:boundedText(region?.status,20)}))})).filter(row=>row.election);
  const partySupport=Object.fromEntries(Object.entries(context?.gallup?.partySupport||{}).slice(0,12).filter(([,score])=>Number.isFinite(Number(score))).map(([party,score])=>[boundedText(party,80),finite(score)]));
  const source=context?.source&&typeof context.source==='object'?{title:boundedText(context.source.title,160),url:boundedText(context.source.url,1000)}:null;
  const gallupSource=context?.gallup?.source&&typeof context.gallup.source==='object'?{title:boundedText(context.gallup.source.title,160),url:boundedText(context.gallup.source.url,1000)}:null;
  const result={};
  if(ageSex.length)result.ageSex=ageSex;
  if(elections.length)result.officialElection={elections};
  if(Object.keys(partySupport).length||gallupSource)result.gallup={...(Object.keys(partySupport).length?{partySupport}:{}),...(gallupSource?{source:gallupSource}:{})};
  if(source)result.source=source;
  return Object.keys(result).length?result:null;
}

function compactSourceErrors(errors){
  return (Array.isArray(errors)?errors:[]).slice(0,4).map(item=>({
    source:boundedText(item?.source,80),code:boundedText(item?.code,120),attempts:Math.max(1,Number(item?.attempts)||1)
  })).filter(item=>item.source||item.code);
}

function compactPastRisks(items){
  return (Array.isArray(items)?items:[]).slice(0,5).map(item=>({
    tag:boundedText(item?.tag,40),title:boundedText(item?.title,280),url:boundedText(item?.url,1000),date:boundedText(item?.date,40)
  })).filter(item=>item.tag&&item.title&&item.url);
}

function compactOverrides(value){
  const input=value&&typeof value==='object'?value:{},diagnoses=(Array.isArray(input.diagnoses)?input.diagnoses:[]).map(row=>({
    id:boundedText(row?.id,4),...Object.fromEntries(['headline','currentPosition','politicalMeaning','opportunity','risk','interpretation'].filter(key=>row?.[key]!==undefined).map(key=>[key,key==='interpretation'?(Array.isArray(row[key])?row[key].map(item=>boundedText(item,500)).slice(0,4):[]):boundedText(row[key],1200)])),...(row?.pastRisks!==undefined?{pastRisks:compactPastRisks(row.pastRisks)}:{})
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
  const pc=finite(volume.pc),mobile=finite(volume.mobile),rawNewsItems=Array.isArray(source?.news?.items)?source.news.items:[],newsItems=compactNews(rawNewsItems),sourceCounts=compactSourceCounts(rawNewsItems,source?.collectedAt),periodCounts=compactPeriodCounts(rawNewsItems,source?.collectedAt),representativeKeys=new Set(newsItems.map(item=>item.url||item.title)),evidenceItems=compactEvidenceNews(rawNewsItems,source?.officialProfile).filter(item=>!representativeKeys.has(item.url||item.title));
  const sources=new Set(rawNewsItems.map(item=>text(item?.source)).filter(Boolean));
  const timestamps=newsItems.map(item=>Date.parse(item.publishedAt||'')).filter(Number.isFinite),latest=Math.max(0,...timestamps),overrides=compactOverrides(options.adminOverrides||draft?.adminOverrides);
  return {
    storageMode:'INPUT_ONLY_V5',id:text(draft?.id),snapshot:text(draft?.snapshot),algorithmVersion:text(draft?.algorithmVersion),
    input:{collectedAt:text(source?.collectedAt),searchAds:searchStatus==='DIRECT'?{volume:{pc,mobile,total:pc+mobile}}:null,news:{items:newsItems,periodCounts,...(sourceCounts.length?{sourceCounts}:{}),...(evidenceItems.length?{evidenceItems}: {})},officialContext:compactOfficialContext(source?.officialContext),sourceErrors:compactSourceErrors(source?.sourceErrors)},
    rankingInput:{searchTotal:pc+mobile,articleCount:rawNewsItems.length,sourceCount:sources.size,latestPublishedAt:latest?new Date(latest).toISOString():'',searchStatus,newsStatus},
    ...(overrides?{adminOverrides:overrides}:{})
  };
}

export function validateCompactSnapshot(drafts,expectedIds=[]){
  const rows=Array.isArray(drafts)?drafts:[],expected=[...new Set((expectedIds||[]).map(String))],ids=rows.map(row=>text(row?.id)),seen=new Set(),duplicateIds=[];
  for(const id of ids){if(seen.has(id))duplicateIds.push(id);seen.add(id);}
  const expectedSet=new Set(expected),missingIds=expected.filter(id=>!seen.has(id)),unexpectedIds=ids.filter(id=>!expectedSet.has(id));
  const invalid=rows.filter(row=>row?.storageMode!=='INPUT_ONLY_V5'||!row?.id||!row?.snapshot||!row?.input||!row?.rankingInput||!Array.isArray(row?.input?.news?.items)).map(row=>({id:text(row?.id),errors:['COMPACT_INPUT_INVALID']}));
  return {ok:rows.length===expected.length&&!missingIds.length&&!duplicateIds.length&&!unexpectedIds.length&&!invalid.length,total:rows.length,expected:expected.length,missingIds,duplicateIds:[...new Set(duplicateIds)],unexpectedIds:[...new Set(unexpectedIds)],invalid,storageMode:'INPUT_ONLY_V5'};
}
