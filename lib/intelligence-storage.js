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
    ...draft,
    rankingInput:{searchTotal:pc+mobile,articleCount:newsItems.length,sourceCount:sources.size,latestPublishedAt:latest?new Date(latest).toISOString():'',searchStatus,newsStatus},
    raw:{searchAds:{volume:{pc,mobile,total:pc+mobile}},sourceErrors:Array.isArray(source?.sourceErrors)?source.sourceErrors:[]}
  };
}

export function buildCompactHistory(drafts,rankings){
  const byId=rankings?.byId||{};
  return {
    snapshot:String(rankings?.snapshot||''),generatedAt:String(rankings?.generatedAt||''),algorithm:String(rankings?.algorithm||''),weights:rankings?.weights||{},population:Number(rankings?.population||0),
    people:(Array.isArray(drafts)?drafts:[]).map(draft=>({
      id:String(draft?.id||''),rank:byId[draft?.id]||draft?.rank||null,signal:Number(draft?.signal?.index||0),
      core:(draft?.core||[]).map(item=>[item.label,item.score]),cohorts:(draft?.cohorts||[]).map(item=>[item.age,item.male,item.female]),
      support:dashboardMetrics(draft?.support),resilience:dashboardMetrics(draft?.resilience),media:dashboardMetrics(draft?.mediaScores)
    }))
  };
}

function dashboardMetrics(value){return Object.fromEntries(Object.entries(value||{}).filter(([,item])=>typeof item==='number'||typeof item==='string'));}
