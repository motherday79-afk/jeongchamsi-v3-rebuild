const finite=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const text=value=>String(value||'').trim();

export function compactIntelligenceDraft(draft){
  const source=draft?.raw||{},volume=source?.searchAds?.volume||{};
  const searchStatus=source?.searchAds&&typeof source.searchAds==='object'?'DIRECT':'MISSING';
  const newsStatus=source?.news&&typeof source.news==='object'?'DIRECT':'MISSING';
  const pc=finite(volume.pc),mobile=finite(volume.mobile),newsItems=Array.isArray(source?.news?.items)?source.news.items:(Array.isArray(draft?.news)?draft.news:[]);
  const sources=new Set(newsItems.map(item=>text(item?.source)).filter(Boolean));
  const timestamps=newsItems.map(item=>Date.parse(item?.publishedAt||item?.date||'')).filter(Number.isFinite);
  const latest=Math.max(0,...timestamps);
  return {
    id:text(draft?.id),snapshot:text(draft?.snapshot),algorithmVersion:text(draft?.algorithmVersion),interpretationLabel:text(draft?.interpretationLabel),mode:text(draft?.mode),currentRole:text(draft?.currentRole),
    primaryRole:draft?.primaryRole||null,secondaryRole:text(draft?.secondaryRole),currentRoles:Array.isArray(draft?.currentRoles)?draft.currentRoles:[],roleHistory:Array.isArray(draft?.roleHistory)?draft.roleHistory:[],
    rank:draft?.rank||{overall:null,category:null,temporary:false},signal:draft?.signal||null,
    activities:Array.isArray(draft?.activities)?draft.activities:[],achievements:Array.isArray(draft?.achievements)?draft.achievements:[],policies:Array.isArray(draft?.policies)?draft.policies:[],
    news:(Array.isArray(draft?.news)?draft.news:[]).slice(0,10),sources:(Array.isArray(draft?.sources)?draft.sources:[]).slice(0,8),related:(Array.isArray(draft?.related)?draft.related:[]).slice(0,4),
    rankingInput:{searchTotal:pc+mobile,articleCount:newsItems.length,sourceCount:sources.size,latestPublishedAt:latest?new Date(latest).toISOString():'',searchStatus,newsStatus},
    raw:{searchAds:{volume:{pc,mobile,total:pc+mobile}},sourceErrors:Array.isArray(source?.sourceErrors)?source.sourceErrors:[]}
  };
}

export function validateCompactSnapshot(drafts,expectedIds=[]){
  const rows=Array.isArray(drafts)?drafts:[],expected=[...new Set((expectedIds||[]).map(String))],ids=rows.map(row=>text(row?.id)),seen=new Set(),duplicateIds=[];
  for(const id of ids){if(seen.has(id))duplicateIds.push(id);seen.add(id);}
  const expectedSet=new Set(expected),missingIds=expected.filter(id=>!seen.has(id)),unexpectedIds=ids.filter(id=>!expectedSet.has(id));
  const invalid=rows.filter(row=>!row?.id||!row?.snapshot||!row?.rankingInput).map(row=>({id:text(row?.id),errors:['COMPACT_RECORD_INVALID']}));
  return {ok:rows.length===expected.length&&!missingIds.length&&!duplicateIds.length&&!unexpectedIds.length&&!invalid.length,total:rows.length,expected:expected.length,missingIds,duplicateIds:[...new Set(duplicateIds)],unexpectedIds:[...new Set(unexpectedIds)],invalid,storageMode:'LATEST_ONLY_V3'};
}
