const DAY=86400000;
const BATCH_WINDOW=2*DAY;
const exact=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const clean=value=>String(value??'').trim();
const nameKey=value=>clean(value).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const kind=person=>person.type||'assembly';
const iso=stamp=>new Date(stamp).toISOString();

// Retain uncertainty rather than converting '< 10' / null into a zero observation.
export function compactSearchMetrics(source,referenceAt){
 if(!source||typeof source!=='object')return null;
 const v=source.volume||{},pc=exact(v.pc)?v.pc:null,mobile=exact(v.mobile)?v.mobile:null;
 const volume={pc,mobile,total:pc!==null&&mobile!==null?pc+mobile:null};
 for(const key of ['pcRaw','mobileRaw'])if(v[key]!==undefined)volume[key]=typeof v[key]==='number'?v[key]:clean(v[key]).slice(0,30);
 for(const key of ['pcRange','mobileRange'])if(v[key]&&exact(v[key].min)&&exact(v[key].max))volume[key]={min:v[key].min,max:v[key].max};
 return {volume,collectedAt:clean(source.collectedAt||referenceAt),...(source.keyword?{keyword:clean(source.keyword).slice(0,100)}:{}),...(source.volumePrecision===1||source.provider==='NAVER_SEARCH_ADS'?{volumePrecision:1}:{}),...(source.keywordMatched!==undefined?{keywordMatched:source.keywordMatched===true}:{})};
}

export function buildAttentionRecords(drafts=[],profiles=[]){
 const byId=new Map(profiles.map(p=>[p.id,p])),records=new Map();
 for(const draft of drafts){
  const person=byId.get(draft?.id);if(!person)continue;
  const input=draft.input||draft.raw||{},search=input.searchAds,news=input.news;
  if(!search||!news||search.keywordMatched===false||(search.keyword&&nameKey(search.keyword)!==nameKey(person.name)))continue;
  const v=search.volume||{},pc=v.pc,mobile=v.mobile;
  if(!exact(pc)||!exact(mobile)||!exact(pc+mobile)||v.pcRange||v.mobileRange||/^\s*</.test(v.pcRaw||'')||/^\s*</.test(v.mobileRaw||''))continue;
  // Old compact snapshots discarded bounded-count precision. Their zero component cannot be trusted as exact.
  if((pc===0||mobile===0)&&search.volumePrecision!==1&&search.provider!=='NAVER_SEARCH_ADS')continue;
  const buckets=news.periodCounts;
  let newsCount=Array.isArray(buckets)?buckets.find(row=>row.label==='30D')?.value:buckets?.d30;
  if(!exact(newsCount)&&!draft.input&&Array.isArray(news.items)&&news.provider==='GOOGLE_NEWS_RSS'){
   const end=Date.parse(news.collectedAt||input.collectedAt||'');
   newsCount=news.items.filter(row=>{const time=Date.parse(row.publishedAt||row.date||'');return time<=end&&time>=end-30*DAY;}).length;
  }
  const coverage=Array.isArray(news.coverage)?news.coverage:[];
  const completeCoverage=coverage.length>0&&coverage.every(row=>row.collected===true&&row.truncated!==true);
  if(!exact(newsCount)||(newsCount===0&&!completeCoverage))continue;
  const searchStamp=Date.parse(search.collectedAt||input.collectedAt||''),newsStamp=Date.parse(news.collectedAt||input.collectedAt||'');
  if(!Number.isFinite(searchStamp)||!Number.isFinite(newsStamp)||Math.abs(searchStamp-newsStamp)>BATCH_WINDOW)continue;
  records.set(person.id,{id:person.id,newsCount,searchCount:pc+mobile,pc,mobile,newsAt:iso(newsStamp),searchAt:iso(searchStamp),referenceAt:iso(Math.max(searchStamp,newsStamp)),partial:coverage.length===0||coverage.some(row=>row.collected!==true||row.truncated===true)});
 }
 return [...records.values()];
}

function rankRows(rows,field){
 const sorted=[...rows].sort((a,b)=>b[field]-a[field]),result=new Map();
 for(let i=0;i<sorted.length;){let end=i+1;while(end<sorted.length&&sorted[end][field]===sorted[i][field])end++;
  const tied=end-i,position=sorted.length<2?50:(sorted.length-end+(tied-1)/2)/(sorted.length-1)*100;
  for(let j=i;j<end;j++)result.set(sorted[j].id,{rank:i+1,tied:tied>1,position:Math.round(position*100)/100});
  i=end;
 }
 return result;
}
function suggestions(rows,target){
 const near=(a,b,min)=>Math.abs(a-b)<=Math.max(min,b*.25),rest=rows.filter(row=>row.id!==target.id),used=new Set(),result=[];
 const candidates=[
  {kind:'more-search',label:'보도량은 비슷한데 검색이 많은',items:rest.filter(row=>near(row.newsCount,target.newsCount,2)&&row.searchCount>target.searchCount).sort((a,b)=>Math.abs(a.newsCount-target.newsCount)-Math.abs(b.newsCount-target.newsCount)||b.searchCount-a.searchCount)},
  {kind:'more-news',label:'검색량은 비슷한데 보도가 많은',items:rest.filter(row=>near(row.searchCount,target.searchCount,10)&&row.newsCount>target.newsCount).sort((a,b)=>Math.abs(a.searchCount-target.searchCount)-Math.abs(b.searchCount-target.searchCount)||b.newsCount-a.newsCount)},
  {kind:'similar',label:'보도와 검색이 모두 비슷한',items:rest.filter(row=>near(row.newsCount,target.newsCount,2)&&near(row.searchCount,target.searchCount,10)).sort((a,b)=>(Math.abs(a.x-target.x)+Math.abs(a.y-target.y))-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y)))}
 ];
 for(const group of candidates){const person=group.items.find(row=>!used.has(row.id));if(person){used.add(person.id);result.push({kind:group.kind,label:group.label,person});}}
 return result;
}

export function analyzeSearchAttention(records=[],people=[],personId,{now=Date.now()}={}){
 if(!personId)return null;
 const byId=new Map(people.map(p=>[p.id,p])),names=new Map();
 for(const person of people){const key=nameKey(person.name);names.set(key,(names.get(key)||0)+1);}
 const person=byId.get(personId),reference=records.find(row=>row.id===personId);
 if(!person||!reference||names.get(nameKey(person.name))>1)return null;
 const current=Number(now);
 const fresh=row=>{const stamps=[Date.parse(row.searchAt),Date.parse(row.newsAt)];return stamps.every(stamp=>Number.isFinite(stamp)&&stamp<=current&&stamp>=current-30*DAY);};
 if(!fresh(reference))return null;
 const eligible=records.filter(row=>{
  const p=byId.get(row.id);return p&&kind(p)===kind(person)&&names.get(nameKey(p.name))===1&&fresh(row)&&Math.abs(Date.parse(row.searchAt)-Date.parse(reference.searchAt))<=BATCH_WINDOW&&Math.abs(Date.parse(row.newsAt)-Date.parse(reference.newsAt))<=BATCH_WINDOW;
 }).map(row=>({...row,name:byId.get(row.id).name,type:kind(person),party:byId.get(row.id).party||''}));
 const dates=eligible.flatMap(row=>[Date.parse(row.searchAt),Date.parse(row.newsAt)]),cohort={label:({assembly:'국회의원',metropolitan:'광역단체장',basic:'기초단체장'})[kind(person)]||'같은 분류의 정치인',size:eligible.length,from:iso(Math.min(...dates)),to:iso(Math.max(...dates)),partial:eligible.some(row=>row.partial)};
 const target=eligible.find(row=>row.id===personId);
 if(!target)return null;
 if(eligible.length<4)return {status:'insufficient',target,cohort,headline:'확인된 보도량과 검색량을 먼저 살펴보세요',points:[],peers:[]};
 const newsRanks=rankRows(eligible,'newsCount'),searchRanks=rankRows(eligible,'searchCount');
 const ranked=eligible.map(row=>{const n=newsRanks.get(row.id),s=searchRanks.get(row.id);return {...row,newsRank:n.rank,searchRank:s.rank,newsTied:n.tied,searchTied:s.tied,x:n.position,y:s.position};});
 const selected=ranked.find(row=>row.id===personId),x=selected.x,y=selected.y;
 const category=x===50||y===50?'balanced':x>50&&y>50?'both':x<50&&y>50?'search':x>50&&y<50?'news':'quiet';
 const headlines={both:'보도와 검색 모두에서 두드러지는 인물입니다',search:'보도보다 검색에서 더 두드러지는 인물입니다',news:'검색보다 보도에서 더 두드러지는 인물입니다',quiet:'보도와 검색 모두 비교군의 중간보다 낮은 위치입니다',balanced:'보도와 검색 모두 비교군의 중간에 위치합니다'};
 const headline=x===50&&y!==50?`보도는 비교군의 중간에 있고 검색은 중간보다 ${y>50?'높은':'낮은'} 위치입니다`:y===50&&x!==50?`검색은 비교군의 중간에 있고 보도는 중간보다 ${x>50?'높은':'낮은'} 위치입니다`:headlines[category];
 return {status:'ready',target:selected,category,headline,cohort,points:ranked.map(({id,name,newsCount,searchCount,newsRank,searchRank,x,y})=>({id,name,newsCount,searchCount,newsRank,searchRank,x,y})),peers:suggestions(ranked,selected)};
}
