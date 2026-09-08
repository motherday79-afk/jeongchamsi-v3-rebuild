const TYPES=['assembly','metropolitan','basic'];
const WEIGHTS=Object.freeze({search:40,news:60,newsArticles:20,newsSources:20,newsRecency:20});
const finite=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const round1=value=>Math.round((Number(value)||0)*10)/10;
const text=value=>String(value||'').trim();

function searchVolume(searchAds){
  const volume=searchAds?.volume;
  if(!volume||typeof volume!=='object')return {total:0,status:'MISSING'};
  const pc=finite(volume.pc),mobile=finite(volume.mobile);
  return {total:pc+mobile,status:'DIRECT'};
}

function newsSignals(news){
  if(!news||typeof news!=='object')return {articles:0,sources:0,recency:0,latestPublishedAt:'',status:'MISSING'};
  const items=Array.isArray(news.items)?news.items:[];
  const sources=new Set(items.map(item=>text(item?.source)).filter(Boolean));
  const timestamps=items.map(item=>Date.parse(item?.publishedAt||'')).filter(Number.isFinite);
  const recency=timestamps.length?Math.max(...timestamps):0;
  return {articles:items.length,sources:sources.size,recency,latestPublishedAt:recency?new Date(recency).toISOString():'',status:'DIRECT'};
}

function percentileValues(values){
  const rows=values.map((value,index)=>({value:Number(value)||0,index})).sort((a,b)=>a.value-b.value||a.index-b.index),scores=Array(values.length).fill(0);
  if(rows.length===1){scores[rows[0].index]=100;return scores;}
  for(let start=0;start<rows.length;){
    let end=start;
    while(end+1<rows.length&&rows[end+1].value===rows[start].value)end+=1;
    const score=rows.length>1?((start+end)/2)/(rows.length-1)*100:100;
    for(let index=start;index<=end;index+=1)scores[rows[index].index]=score;
    start=end+1;
  }
  return scores;
}

function extract(draft,profile={}){
  const compactInput=draft?.rankingInput,search=compactInput?{total:finite(compactInput.searchTotal),status:compactInput.searchStatus==='DIRECT'?'DIRECT':'MISSING'}:searchVolume(draft?.raw?.searchAds),news=compactInput?{articles:finite(compactInput.articleCount),sources:finite(compactInput.sourceCount),recency:Date.parse(compactInput.latestPublishedAt||'')||0,latestPublishedAt:text(compactInput.latestPublishedAt),status:compactInput.newsStatus==='DIRECT'?'DIRECT':'MISSING'}:newsSignals(draft?.raw?.news);
  return {
    id:text(draft?.id),
    name:text(profile?.name||draft?.id),
    type:TYPES.includes(profile?.type)?profile.type:'assembly',
    party:text(profile?.party),
    jurisdiction:text(profile?.jurisdiction),
    searchTotal:search.total,
    searchRaw:Math.log1p(search.total),
    articleCount:news.articles,
    articleRaw:Math.log1p(news.articles),
    sourceCount:news.sources,
    sourceRaw:news.sources,
    recencyRaw:news.recency,
    latestPublishedAt:news.latestPublishedAt,
    sourceStatus:{search:search.status,news:news.status},
  };
}

function compareRows(a,b){
  return b.score-a.score||b.newsScore-a.newsScore||b.searchScore-a.searchScore||b.metrics.sourceCount-a.metrics.sourceCount||b.metrics.searchTotal-a.metrics.searchTotal||a.id.localeCompare(b.id);
}

function compact(row){
  return {
    id:row.id,name:row.name,type:row.type,party:row.party,jurisdiction:row.jurisdiction,
    score:row.score,searchScore:row.searchScore,newsScore:row.newsScore,
    metrics:row.metrics,sourceStatus:row.sourceStatus,
  };
}

export function buildOperationalRankings(drafts,profileMap,snapshot,generatedAt=Date.now()){
  const extracted=(Array.isArray(drafts)?drafts:[]).map(draft=>extract(draft,profileMap?.get?.(draft?.id)||{})).filter(row=>row.id);
  const searchPercentiles=percentileValues(extracted.map(row=>row.searchRaw));
  const articlePercentiles=percentileValues(extracted.map(row=>row.articleRaw));
  const sourcePercentiles=percentileValues(extracted.map(row=>row.sourceRaw));
  const recencyPercentiles=percentileValues(extracted.map(row=>row.recencyRaw));
  const scored=extracted.map((row,index)=>{
    const searchScore=row.sourceStatus.search==='DIRECT'?round1(searchPercentiles[index]):0;
    const articleScore=row.sourceStatus.news==='DIRECT'?round1(articlePercentiles[index]):0;
    const sourceScore=row.sourceStatus.news==='DIRECT'?round1(sourcePercentiles[index]):0;
    const recencyScore=row.sourceStatus.news==='DIRECT'?round1(recencyPercentiles[index]):0;
    const newsScore=round1((articleScore+sourceScore+recencyScore)/3);
    const score=round1(searchScore*.4+articleScore*.2+sourceScore*.2+recencyScore*.2);
    return {...row,score,searchScore,newsScore,metrics:{searchTotal:row.searchTotal,articleCount:row.articleCount,sourceCount:row.sourceCount,latestPublishedAt:row.latestPublishedAt}};
  }).sort(compareRows);
  const categories=Object.fromEntries(TYPES.map(type=>[type,[]])),byId={};
  for(const type of TYPES){
    categories[type]=scored.filter(row=>row.type===type).map((row,index)=>({...compact(row),categoryRank:index+1}));
  }
  const ranked=scored.map((row,index)=>{
    const rank=index+1,categoryRank=categories[row.type].findIndex(item=>item.id===row.id)+1,full={...compact(row),rank,categoryRank};
    byId[row.id]={rank,categoryRank,score:row.score,searchScore:row.searchScore,newsScore:row.newsScore,type:row.type,metrics:row.metrics,sourceStatus:row.sourceStatus};
    return full;
  });
  return {snapshot:text(snapshot),generatedAt:new Date(Number(generatedAt)).toISOString(),algorithm:'JCS_NOW_OPERATING_V1',weights:{...WEIGHTS},population:ranked.length,overall:ranked.slice(0,100),categories,byId};
}

export function withOperationalRank(draft,rankRow){
  if(!draft)return null;
  if(!rankRow)return {...draft,rank:{overall:null,category:null,temporary:false}};
  return {...draft,signal:{...(draft.signal||{}),index:rankRow.score},rank:{overall:rankRow.rank,category:rankRow.categoryRank,temporary:false}};
}

export function rankingChanges(current,previous){
 if(!previous?.byId||previous.snapshot===current.snapshot)return {items:[],previousAt:previous?.generatedAt||'',ready:false};
 const items=Object.entries(current.byId||{}).map(([id,row])=>({id,rank:row.rank,previousRank:previous.byId[id]?.rank||null,change:previous.byId[id]?.rank?previous.byId[id].rank-row.rank:null})).filter(row=>row.change>0).sort((a,b)=>b.change-a.change||a.rank-b.rank).slice(0,100).map((row,index)=>({...row,risingRank:index+1}));
 return {items,previousAt:previous.generatedAt,ready:true};
}
export function keywordArticles(drafts=[]){
 const rows=new Map();for(const draft of drafts){const news=draft?.input?.news||draft?.raw?.news||{},links=new Map((news.items||[]).map(item=>[String(item.title||'').trim(),String(item.url||'')]));
 // Older snapshots do not carry a complete corpus; wait for a new collection rather than invent comparisons from ten examples.
 const items=Array.isArray(news.keywordCorpus)?news.keywordCorpus.map(([title,source,date])=>({title,source,date,url:links.get(title)||''})):draft?.raw?.news?.items||[];
 for(const item of items){const title=String(item.title||'').trim().slice(0,280),source=String(item.source||'').trim().slice(0,100),key=title.replace(/\s+/g,'')+'|'+source;if(!title)continue;const url=/^https?:\/\//.test(item.url||'')?String(item.url).slice(0,1000):'';
 const found=rows.get(key);if(found){if(!found.people.includes(draft.id)&&found.people.length<12)found.people.push(draft.id);if(!found.url&&url)found.url=url;continue;}rows.set(key,{title,source,url,date:String(item.publishedAt||item.date||''),people:[draft.id]});
 }}return [...rows.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
export function politicalKeywords(articles=[],rules={},referenceAt=Date.now(),names=[]){
 const now=Number.isFinite(Date.parse(referenceAt))?Date.parse(referenceAt):Number(referenceAt),day=86400000,blocked=new Set(['관련','대한','통해','위해','이번','오늘','기자','뉴스','정치','의원','국회의원','대표','최근','대한민국','한국','위원회','밝혔다','말했다','있는','없는','한다','했다','하고','것으로','대해서','일','것','등',...names]),hidden=new Set(rules.hidden||[]),aliases=rules.aliases||{},groups=new Map();
 for(const article of articles){const age=now-Date.parse(article.date);if(!Number.isFinite(age)||age<0||age>14*day)continue;
 const terms=[...new Set((article.title.match(/[가-힣]{2,10}/g)||[]).map(word=>word.replace(/(?:에서는|에게는|으로|에서|에게|까지|부터|은|는|을|를|의)$/,'')).filter(word=>word.length>=2&&!blocked.has(word)&&!/(했다|한다|됐다|라고|있다|없다|이다)$/.test(word)).map(word=>String(aliases[word]||word)))];
 for(const term of terms){if(hidden.has(term))continue;const row=groups.get(term)||{key:term,label:String(rules.labels?.[term]||term),recent:0,previous:0,sources:new Set(),people:new Set(),articles:[]};if(age<=7*day){row.recent++;if(article.source)row.sources.add(article.source);for(const id of article.people)row.people.add(id);if(article.url&&row.articles.length<10)row.articles.push(article);}else row.previous++;groups.set(term,row);}
 }
 const pinned=rules.pinned||[];return [...groups.values()].filter(row=>row.recent>0).map(row=>({...row,change:row.recent-row.previous,sourceCount:row.sources.size,sources:undefined,people:[...row.people].slice(0,12),pinned:pinned.includes(row.key),score:row.recent+Math.max(0,row.recent-row.previous)*2+row.sources.size*2})).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.score-a.score||a.key.localeCompare(b.key,'ko')).slice(0,50);
}
