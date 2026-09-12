import {buildAttentionRecords,analyzeSearchAttention} from './search-attention.js';
import {mediaArticleKey} from './media-article-key.js';
import {analyzePublisherShare} from './publisher-share.js';
import { mediaLabel, publisherLabel, articlePublisher } from '../src/ui/intelligence-narratives.js';
import { searchPoliticianProfiles } from './politician-store.js';

const DAY=86400000;
const clean=value=>String(value??'').trim();
const normalized=value=>clean(value).normalize('NFKC').toLowerCase().replace(/[^가-힣a-z0-9]/g,'');
const ALIASES={'뉴스원':'뉴스1','news1':'뉴스1','news1.kr':'뉴스1','뉴스타파':'뉴스타파','newstapa.org':'뉴스타파','중앙일보':'중앙일보','thejoongang':'중앙일보','조선일보':'조선일보','동아일보':'동아일보','연합뉴스':'연합뉴스','yonhapnewsagency':'연합뉴스'};
export const MEDIA_INDEX_VERSION=3;
export function publisherName(value){const label=publisherLabel(value);if(!label)return '';return ALIASES[normalized(label)]||ALIASES[clean(label).toLowerCase()]||label;}
const specificWords=new Set('정치 정치인 정책 발표 예산 확보 추진 제안 강조 공개 요구 약속 방문 주도 논란 발언 의혹 기자 뉴스 속보 단독 종합 관련 대한 통해 위해 이번 오늘 최근 의원 국회의원 대표 보도 소식 계획 입장 밝혔다 말했다 대통령 총리 더불어민주당 국민의힘 민주당 정부 국민'.split(' '));
const tokensFor=(title,names)=>new Set((title.replace(/\[[^\]]*\]|【[^】]*】/g,' ').match(/[가-힣A-Za-z0-9]{2,}/g)||[]).map(word=>word.replace(/(?:에서는|에게는|으로|에서|에게|까지|부터|은|는|을|를|의)$/,'')).filter(word=>word.length>1&&!specificWords.has(word)&&!names.has(word)));

// Conservative title similarity; never group on the politician's name or generic political terms alone.
function clusterArticles(articles,profiles){
 const names=new Set(profiles.map(p=>p.name)),groups=[],inverted=new Map();
 const register=(group,id,person)=>{for(const token of [...group.tokens,'='+group.titleKey]){const key=person+'|'+token;if(!inverted.has(key))inverted.set(key,[]);inverted.get(key).push(id);}};
 for(let index=0;index<articles.length;index++){
  const row=articles[index],tokens=tokensFor(row.title,names),titleKey=normalized(row.title),candidates=new Set();
  // Partition candidates by mentioned person before comparing title tokens.
  // This avoids scanning all politicians' similarly worded stories for every article.
  for(const person of row.people)for(const word of [...tokens,'='+titleKey])for(const id of inverted.get(person+'|'+word)||[])if(row.stamp-groups[id].stamp<=7*DAY)candidates.add(id);
  const matches=[...candidates].filter(id=>{
   const group=groups[id];if(group.titleKey===titleKey)return true;
   const overlap=[...tokens].filter(word=>group.tokens.has(word)).length;
   return overlap>=3&&overlap/Math.max(tokens.size,group.tokens.size,1)>=.72;
  }).sort((a,b)=>groups[a].stamp-groups[b].stamp);
  let id=matches[0];
  if(id===undefined){id=groups.length;groups.push({titleKey,tokens,stamp:row.stamp,people:new Set(),articles:[]});}
  const group=groups[id];group.articles.push(index);for(const person of row.people)if(!group.people.has(person)){group.people.add(person);register(group,id,person);}
 }
 return groups.filter(g=>g.articles.length>1).map(g=>({title:articles[g.articles[0]].title,articles:g.articles}));
}

function observedNewsRows(news={},fallback=[]){
 const corpus=Array.isArray(news.keywordCorpus)?news.keywordCorpus.map(([title,source,publishedAt,articleKey,precision])=>({title,source,publishedAt,articleKey,timePrecision:precision===0||(!news.mediaCorpusVersion&&/T00:00:00(?:\.000)?Z$/.test(publishedAt))?'unknown':undefined})):[];
 return [...(news.items||fallback),...(news.evidenceItems||[]),...corpus];
}

export function buildMediaIndex(drafts=[],profiles=[]){
 const people=profiles.filter(p=>p?.id&&p.isVacant!==true).map(p=>Object.fromEntries(['id','name','type','party','jurisdiction','office','roleLabel','committee'].map(key=>[key,clean(p[key])]))),validIds=new Set(people.map(p=>p.id)),articles=new Map(),identities=new Map(),publishers=new Set(),coverage={};
 const attributions=new Map();
 // A stable article identity can connect an original publisher to its older title-only corpus row.
 // Conflicting publisher identities remain unresolved; headline similarity never assigns an owner.
 for(const draft of drafts){
  if(!validIds.has(draft?.id))continue;
  for(const item of observedNewsRows(draft?.input?.news||draft?.raw?.news||{},draft.news||[])){
   const publisher=publisherName(articlePublisher(item)),identity=clean(item.articleKey)||mediaArticleKey(item.url);if(!publisher||!identity)continue;
   if(!attributions.has(identity))attributions.set(identity,new Set());attributions.get(identity).add(publisher);
  }
 }
 for(const draft of drafts){
  if(!validIds.has(draft?.id))continue;
  const news=draft?.input?.news||draft?.raw?.news||{},at=draft?.input?.collectedAt||draft?.raw?.collectedAt||'';
  const complete=news.mediaCorpusVersion===1||!!draft?.raw?.news;
  coverage[draft.id]={at,legacy:!complete,truncated:(news.coverage||[]).some(row=>row.truncated||row.collected===false)};
  for(const source of news.sourceCounts||[]){const name=publisherName(source.name);if(name)publishers.add(name);}
  for(const item of observedNewsRows(news,draft.news||[])){
   const identity=clean(item.articleKey)||mediaArticleKey(item.url),candidates=attributions.get(identity),original=articlePublisher(item)|| (candidates?.size===1?[...candidates][0]:'');
   const title=clean(item.title).slice(0,280),source=publisherName(original),date=clean(item.publishedAt||item.date),stamp=Date.parse(date);
   if(!title)continue;if(source)publishers.add(source);if(!Number.isFinite(stamp))continue;
   const attribution=source||'unattributed:'+mediaLabel(item.source),key=attribution+'|'+normalized(title),timed=item.timePrecision!=='unknown'&&/(?:T|\s)\d{2}:\d{2}/.test(date)&&/(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)\s*$/i.test(date),url=/^https?:\/\//i.test(item.url||'')?String(item.url).slice(0,1000):'';
   const identityKey=identity?(source||'unattributed')+'|'+identity:'',sameTitle=articles.get(key)||[];
   const unidentified=sameTitle.filter(row=>!row.identity);
   let current=identityKey?identities.get(identityKey)|| (unidentified.length===1?unidentified[0]:null):sameTitle.length===1?sameTitle[0]:null;
   if(!identityKey&&sameTitle.length>1){const own=sameTitle.filter(row=>row.people.includes(draft.id));if(own.length===1)current=own[0];else continue;}
   if(current){
    if(!sameTitle.includes(current)){sameTitle.push(current);articles.set(key,sameTitle);}
    if(identityKey){current.identity=identityKey;identities.set(identityKey,current);}
    if(!current.people.includes(draft.id))current.people.push(draft.id);
    const sameDay=new Date(stamp).toISOString().slice(0,10)===new Date(current.stamp).toISOString().slice(0,10);
    if((!current.timed&&timed&&sameDay)||(stamp<current.stamp&&!(current.timed&&!timed&&sameDay))){current.stamp=stamp;current.timed=timed;}
    if(url&&!current.url)current.url=url;continue;
   }
   const row={title,source,stamp,timed,url,people:[draft.id],identity:identityKey};sameTitle.push(row);articles.set(key,sameTitle);if(identityKey)identities.set(identityKey,row);
  }
 }
 const rows=[...new Set([...articles.values()].flat())].map(({identity,...row})=>row).sort((a,b)=>a.stamp-b.stamp||a.source.localeCompare(b.source,'ko'));
 return {version:MEDIA_INDEX_VERSION,attention:buildAttentionRecords(drafts,people),people,articles:rows,issues:clusterArticles(rows,people),publishers:[...publishers].sort((a,b)=>a.localeCompare(b,'ko')),coverage};
}

const ranked=rows=>rows.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ko'));
export function analyzeMediaIndex(index,{query='',personId='',publisher='',period='latest',now=Date.now()}={}){
 const days=period==='cumulative'?30:7,end=Number(now),start=end-days*DAY,inside=row=>row.stamp>=start&&row.stamp<=end;
 const people=index.people||[],byId=new Map(people.map(p=>[p.id,p])),groups={assembly:people.filter(p=>!p.type||p.type==='assembly'),metropolitan:people.filter(p=>p.type==='metropolitan'),basic:people.filter(p=>p.type==='basic')};
 const matches=searchPoliticianProfiles(groups,query,Infinity),partyAlias={'민주당':'더불어민주당','국힘':'국민의힘','국민의 힘':'국민의힘'},party=partyAlias[clean(query)]||clean(query),isParty=people.some(p=>p.party===party),requested=byId.get(personId),exact=matches.filter(p=>p.name===clean(query));
 const person=requested||(!isParty?(exact.length===1?exact[0]:matches.length===1?matches[0]:null):null),targetPeople=person?[person]:isParty?people.filter(p=>p.party===party):[],targetIds=new Set(targetPeople.map(p=>p.id));
 const targetMatches=row=>row.people.some(id=>targetIds.has(id)),rows=index.articles.filter(inside),targetRows=rows.filter(row=>row.source&&targetMatches(row)),unattributedRows=rows.filter(row=>!row.source),outlets=new Map((index.publishers||[]).map(name=>[name,{name,count:0,total:0,firstCount:0,followupCount:0}]));
 for(const row of rows){const outlet=outlets.get(row.source);if(!outlet)continue;outlet.total++;if(targetMatches(row))outlet.count++;}
 const timelines=[];
 for(const issue of index.issues||[]){
  const all=issue.articles.map(i=>index.articles[i]).filter(row=>row.stamp<=end),timed=all.filter(row=>row.timed),first=timed[0];
  if(!first)continue;
  const uncertain=all.some(row=>(!row.timed||!row.source)&&row.stamp<=first.stamp),firstSources=uncertain?[]:[...new Set(timed.filter(row=>row.stamp===first.stamp).map(row=>row.source))],current=all.filter(inside);
  if(!current.length)continue;
  // At least two outlets or two independently titled reports; one article alone never implies a scoop.
  const sourceRows=new Map();for(const row of all){if(!row.source)continue;if(!sourceRows.has(row.source))sourceRows.set(row.source,[]);sourceRows.get(row.source).push(row);}
  const perSource={};
  for(const [source,sourceItems] of sourceRows){
   const inPeriod=sourceItems.filter(inside);if(!inPeriod.length)continue;
   const firstInPeriod=firstSources.includes(source)&&inside(first);
   const followups=sourceItems.slice(1).filter(row=>inside(row)&&row.timed&&sourceItems[0].timed&&row.stamp>sourceItems[0].stamp).length;
   const byPerson={};for(const id of new Set(sourceItems.flatMap(row=>row.people))){const mentions=sourceItems.filter(row=>row.people.includes(id));byPerson[id]={firstCount:Number(firstInPeriod&&mentions.some(row=>row.stamp===first.stamp)),followupCount:mentions.slice(1).filter(row=>inside(row)&&row.timed&&mentions[0].timed&&row.stamp>mentions[0].stamp).length};}
   perSource[source]={count:inPeriod.length,firstCount:Number(firstInPeriod),followupCount:followups,byPerson};
   if(current.some(targetMatches)){outlets.get(source).firstCount+=Number(firstInPeriod&&sourceItems.filter(row=>row.stamp===first.stamp).some(targetMatches));outlets.get(source).followupCount+=sourceItems.filter(targetMatches).slice(1).filter(row=>inside(row)&&row.timed&&sourceItems.filter(targetMatches)[0].timed&&row.stamp>sourceItems.filter(targetMatches)[0].stamp).length;}
  }
  const laterSources=[...new Set(timed.filter(row=>row.source&&row.stamp>first.stamp&&!firstSources.includes(row.source)).map(row=>row.source))];
  timelines.push({title:issue.title,firstAt:uncertain?'':new Date(first.stamp).toISOString(),firstSources,laterSources,people:[...new Set(all.flatMap(row=>row.people))],perSource,evidence:all.slice(0,8).map(row=>({title:row.title,source:row.source||'원언론사 미확인',date:new Date(row.stamp).toISOString(),url:row.url}))});
 }
 const directory=ranked([...outlets.values()]);
 const chosen=outlets.has(publisher)?publisher:directory.find(row=>row.count>0)?.name||directory.find(row=>row.total>0)?.name||directory[0]?.name||'';
 const selectedRows=rows.filter(row=>row.source&&row.source===chosen),subjectCounts=new Map(),subjectFirst=new Map(),subjectFollowup=new Map();
 for(const row of selectedRows)for(const id of row.people)subjectCounts.set(id,(subjectCounts.get(id)||0)+1);
 const selectedIssues=timelines.filter(row=>row.perSource[chosen]);
 for(const issue of selectedIssues)for(const id of issue.people){const relevant=issue.perSource[chosen].byPerson[id]||{firstCount:0,followupCount:0};subjectFirst.set(id,(subjectFirst.get(id)||0)+relevant.firstCount);subjectFollowup.set(id,(subjectFollowup.get(id)||0)+relevant.followupCount);}
 const subjects=ranked([...subjectCounts].map(([id,count])=>({...byId.get(id),count,share:selectedRows.length?Math.round(count/selectedRows.length*1000)/10:0,firstCount:subjectFirst.get(id)||0,followupCount:subjectFollowup.get(id)||0})));
 const selected={name:chosen,articleCount:selectedRows.length,people:subjects,firstCount:selectedIssues.reduce((sum,row)=>sum+row.perSource[chosen].firstCount,0),followupCount:selectedIssues.reduce((sum,row)=>sum+row.perSource[chosen].followupCount,0),issues:selectedIssues.map(({perSource,people,...row})=>({...row,count:perSource[chosen].count,firstCount:perSource[chosen].firstCount,followupCount:perSource[chosen].followupCount,people:people.map(id=>({id,name:byId.get(id)?.name||id}))})).sort((a,b)=>b.firstAt.localeCompare(a.firstAt)).slice(0,20)};
 selected.shareComparison=analyzePublisherShare(rows,people,{publisher:chosen,targetIds,targetName:person?.name||(isParty?party:''),targetKind:person?'person':isParty?'party':'none'});
 const coverage=Object.values(index.coverage||{}),dates=coverage.map(row=>Date.parse(row.at)).filter(Number.isFinite),targetCoverage=targetPeople.map(p=>index.coverage?.[p.id]).filter(Boolean);
 return {ok:true,attention:analyzeSearchAttention(index.attention||[],people,person?.id,{now:end}),period:days===30?'cumulative':'latest',days,from:new Date(start).toISOString(),to:new Date(end).toISOString(),matches,target:{kind:person?'person':isParty?'party':'none',name:person?.name|| (isParty?party:''),person:person||null,peopleCount:targetPeople.length,articleCount:targetRows.length,unattributedCount:unattributedRows.filter(targetMatches).length,publisherCount:directory.filter(row=>row.count>0).length},publishers:directory,selected,coverage:{unattributedCount:unattributedRows.length,people:coverage.length,totalPeople:people.length,legacy:coverage.some(row=>row.legacy),targetLegacy:targetCoverage.some(row=>row.legacy),truncated:coverage.some(row=>row.truncated),latestAt:dates.length?new Date(Math.max(...dates)).toISOString():'',earliestAt:dates.length?new Date(Math.min(...dates)).toISOString():''}};
}
