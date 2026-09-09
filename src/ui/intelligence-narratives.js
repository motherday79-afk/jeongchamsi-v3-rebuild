const clean=value=>String(value||'').trim();

export function buildRoleNarratives(input={}){
  const signal=clean(input.signalLabel)||'정치 관심 신호';
  const issue=clean(signal.split('·')[0])||'현재 이슈';
  const audience=clean(input.audienceLabel)||'관심 구조';
  const strongest=clean(input.strongestLabel)||'핵심 지표';
  const weakest=clean(input.weakestLabel)||'보완 지표';
  const transition=clean(input.transitionLabel)||'전환력';
  const rank=Number.isFinite(Number(input.rank))?`전체 ${Number(input.rank)}위의 `:'';
  return {
    publicSignal:`${issue} 이슈를 중심으로 ${audience} 흐름이 형성된 ${signal} 국면입니다.`,
    memberDiagnosis:`현재 경쟁력의 핵심은 ${issue} 이슈를 ${audience}로 연결하는 데 있습니다. ${strongest}은 유지하되 ${weakest}을 보완해 ${transition}을 높이는 전략이 필요합니다.`,
    adminDecision:`관리 우선순위는 ${rank}${issue} 서사를 방어하면서 ${weakest} 병목을 개선하는 것입니다. ${strongest} 자산을 ${transition}으로 연결할 실행 순서를 먼저 설계해야 합니다.`,
  };
}

const MEDIA_NAMES=Object.freeze({'v.daum.net':'다음뉴스','news.daum.net':'다음뉴스','yna.co.kr':'연합뉴스','newspim.com':'뉴스핌','biz.chosun.com':'조선비즈','chosun.com':'조선일보','ohmynews.com':'오마이뉴스','ohmynews':'오마이뉴스','mt.co.kr':'머니투데이','hidomin.com':'경북도민일보','cpbc news':'가톨릭평화신문','news.nate.com':'네이트뉴스','news.sbs.co.kr':'SBS뉴스','chosunbiz':'조선비즈','edaily.co.kr':'이데일리','kyongbuk.co.kr':'경북일보','newsis.com':'뉴시스','newsis':'뉴시스','donga.com':'동아일보','joongang.co.kr':'중앙일보','joins.com':'중앙일보','hani.co.kr':'한겨레','khan.co.kr':'경향신문','kbs':'KBS뉴스','kbs news':'KBS뉴스','kbs 뉴스':'KBS뉴스','kbs.co.kr':'KBS뉴스','mbc':'MBC뉴스','mbc news':'MBC뉴스','mbc 뉴스':'MBC뉴스','imbc.com':'MBC뉴스','sbs':'SBS뉴스','sbs news':'SBS뉴스','sbs 뉴스':'SBS뉴스','sbs.co.kr':'SBS뉴스','ytn':'YTN','ytn.co.kr':'YTN','yonhap':'연합뉴스'});
export function mediaLabel(value){const original=String(value||'').trim(),name=original.toLowerCase().replace(/\s+/g,' ');if(MEDIA_NAMES[name])return MEDIA_NAMES[name];let host=name;try{host=new URL(/^https?:\/\//i.test(name)?name:'https://'+name).hostname;}catch{return original;}host=host.replace(/^www\./,'');if(MEDIA_NAMES[host])return MEDIA_NAMES[host];const domain=Object.keys(MEDIA_NAMES).filter(key=>key.includes('.')).sort((a,b)=>b.length-a.length).find(key=>host.endsWith('.'+key));return domain?MEDIA_NAMES[domain]:original;}

export const MAJOR_OUTLET_NAMES=Object.freeze(['조선일보','중앙일보','동아일보','한겨레','경향신문','KBS뉴스','MBC뉴스','SBS뉴스','YTN','연합뉴스']);

// Separate specific title anchors from generic political vocabulary; do not group by politician alone.
const MEDIA_GENERIC=new Set('정치 정치인 정책 발표 예산 확보 추진 제안 강조 공개 요구 약속 방문 주도 논란 발언 의혹 기자 뉴스 속보 단독 종합 관련 대한 통해 위해 이번 오늘 최근 의원 국회의원 대표 보도 소식 계획 입장 밝혔다 말했다'.split(' '));
const mediaTitle=value=>String(value||'').replace(/\[[^\]]*\]|【[^】]*】/g,' ').replace(/\s*[-|｜]\s*[^-|｜]{2,30}$/,'').replace(/\s+/g,' ').trim();
const mediaTokens=(title,name)=>new Set(title.replaceAll(name||'\u0000',' ').match(/[가-힣A-Za-z0-9]{2,}/g)?.map(word=>word.replace(/(?:에서는|에게는|으로|에서|에게|까지|부터|은|는|을|를)$/,'')).filter(word=>word.length>1&&!MEDIA_GENERIC.has(word))||[]);
export function buildMediaObservations(person,items=[],referenceAt,options={}){
 const reference=Date.parse(referenceAt||''),day=86400000,groups=[],seen=new Set();
 const rows=(Array.isArray(items)?items:[]).map(item=>{const raw=String(item.publishedAt||item.date||''),stamp=Date.parse(raw),timed=item.timePrecision!=='unknown'&&/(?:T|\s)\d{2}:\d{2}/.test(raw)&&/(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)\s*$/i.test(raw)&&Number.isFinite(stamp),source=mediaLabel(item.source),title=mediaTitle(item.title),url=/^https?:\/\//i.test(item.url||'')?String(item.url).slice(0,800):'';return {source,title:title.slice(0,240),url,stamp,timed,date:timed?new Date(stamp).toISOString():'',calendar:raw.slice(0,10)};}).filter(row=>row.title&&row.source&&(!Number.isFinite(reference)||!Number.isFinite(row.stamp)||(row.stamp<=reference&&reference-row.stamp<=30*day))).sort((a,b)=>(a.timed?a.stamp:Infinity)-(b.timed?b.stamp:Infinity)||a.source.localeCompare(b.source,'ko'));
 for(const row of rows){const key=row.source+'|'+(row.url||row.title+'|'+row.calendar);if(seen.has(key))continue;seen.add(key);const tokens=mediaTokens(row.title,person?.name),normalized=row.title.replace(/\s/g,'');
  const group=groups.find(group=>{if(!options.lifecycle&&Number.isFinite(row.stamp)&&Number.isFinite(group.stamp)&&Math.abs(row.stamp-group.stamp)>3*day)return false;if(group.normalized===normalized)return true;const overlap=[...tokens].filter(word=>group.tokens.has(word)).length;return overlap>=2&&overlap/Math.max(tokens.size,group.tokens.size,1)>=.8;});
  if(group)group.rows.push(row);else groups.push({normalized,tokens,stamp:row.stamp,title:row.title,rows:[row]});
 }
 return groups.map(group=>{const timed=group.rows.filter(row=>row.timed),first=timed[0],outlets=new Map();for(const row of group.rows)if(!outlets.has(row.source))outlets.set(row.source,row);const all=[...outlets.values()],selected=all.filter((row,index)=>index<8||MAJOR_OUTLET_NAMES.includes(row.source));return {...(options.lifecycle?{daily:issueDaily(group.rows,reference)}:{}),title:group.title,firstAt:first?.date||'',firstSources:first?all.filter(row=>row.timed&&row.stamp===first.stamp).map(row=>row.source):[],articleCount:group.rows.length,sourceCount:outlets.size,unknownTimeCount:group.rows.filter(row=>!row.timed).length,outlets:selected.map(row=>({source:row.source,title:row.title,url:row.url,date:row.date,delayMinutes:row.timed&&first?Math.round((row.stamp-first.stamp)/60000):null}))};}).sort((a,b)=>b.articleCount-a.articleCount||String(b.firstAt).localeCompare(String(a.firstAt))).slice(0,6);
}


export const BROADCAST_OUTLET_NAMES=Object.freeze(['KBS뉴스','MBC뉴스','SBS뉴스','YTN','연합뉴스']);
// Calendar days use Korea's local reporting date, independent of the browser timezone.
const localDay=stamp=>new Date(stamp+9*3600000).toISOString().slice(0,10);
function issueDaily(rows,reference){
 const dated=rows.filter(row=>Number.isFinite(row.stamp)),end=Number.isFinite(reference)?reference:Math.max(0,...dated.map(row=>row.stamp));
 const endDate=localDay(end),endStamp=Date.parse(endDate+'T00:00:00Z'),days=new Map();
 for(const row of dated){const date=localDay(row.stamp);if(!days.has(date))days.set(date,{count:0,sources:new Set()});const entry=days.get(date);entry.count++;entry.sources.add(row.source);}
 return Array.from({length:31},(_,i)=>{const date=new Date(endStamp-(30-i)*86400000).toISOString().slice(0,10),entry=days.get(date);return {date,count:entry?.count??null,sourceCount:entry?.sources.size??null};});
}
export function buildIssueLifecycle(person,items=[],referenceAt){
 return buildMediaObservations(person,items,referenceAt,{lifecycle:true}).map(({title,daily})=>({title,daily}));
}
const LIFE_TOPICS=[
 {key:'jobs',label:'취업·진로',age:'20대',ages:[20],terms:/청년|취업|일자리|진로|인턴|채용/},
 {key:'family',label:'결혼·육아',age:'30대',ages:[30],terms:/결혼|육아|보육|출산|신혼|어린이집/},
 {key:'restart',label:'재도전·전직',age:'40~50대',ages:[40,50],terms:/중장년|재도전|전직|재취업|직업훈련|경력단절/},
 {key:'housing',label:'주거·부동산',age:'40~50대',ages:[40,50],terms:/주거|부동산|주택|재건축|재개발|전세|월세/},
 {key:'silver',label:'실버산업·돌봄',age:'60대 이상',ages:[60],terms:/노인|어르신|고령|실버|요양|노후|노인돌봄/}
];
export function buildLocalAgenda(person,population=[],items=[]){
 const name=clean(person?.name),actions=[];
 for(const item of Array.isArray(items)?items:[]){
  const title=mediaTitle(item.title),at=name?title.indexOf(name):-1;
  if(at<0||!/^https?:\/\//i.test(item.url||''))continue;
  const tail=title.slice(at+name.length);
  // Explicit completed/ongoing action after the subject; exclude questions, proposals to others and other actors.
  if(/환영|평가|부인|불발|무산|실패|못\s|안\s*(?:해|했|한|하)|않|정부(?:의|가|는)|(?:부처|시청|도청)(?:의|가|는)|비판|촉구|요구|의혹|논란|해야|할까|\?|예정|계획|검토|만난|만나|향해|대신|라고|라는/.test(tail))continue;
  const action=tail.match(/법안\s*(?:대표)?발의|(?:예산|국비)\s*확보|(?:협약|업무협약)\s*체결|(?:간담회|토론회)\s*(?:개최|주최)|(?:지원|사업|정책)\s*(?:추진|시행|발표)/);
  if(!action)continue;
  // A second named politician/actor between the subject and action is not proof of this person's action.
  if(/[가-힣]{2,4}\s*(?:의원|시장|장관|대표)(?:은|는|이|가)?/.test(tail.slice(0,action.index)))continue;
  const normalized=title.replace(/\s*(발표|소식|밝혀|밝혔다|종합)\s*$/,'').replace(/\s+/g,'').replaceAll(name,'');
  const tokens=mediaTokens(title,name);
  if(actions.some(row=>row.normalized===normalized||([...tokens].filter(t=>row.tokens.has(t)).length/Math.max(1,tokens.size,row.tokens.size)>=.8)))continue;
  actions.push({title,url:String(item.url).slice(0,800),date:String(item.publishedAt||item.date||'').slice(0,40),source:mediaLabel(item.source),normalized,tokens});
 }
 return LIFE_TOPICS.map(topic=>{
  const matches=topic.ages.map(age=>population.find(row=>parseInt(row.age,10)===age)),known=matches.every(row=>row&&row.totalShare!=null&&Number.isFinite(Number(row.totalShare))),share=known?Math.round(matches.reduce((n,row)=>n+Number(row.totalShare),0)*10)/10:null;
  const evidence=actions.filter(row=>topic.terms.test(row.title)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(({title,url,date,source})=>({title,url,date,source}));
  return {key:topic.key,label:topic.label,age:topic.age,share,count:evidence.length,evidence};
 }).sort((a,b)=>(b.share??-1)-(a.share??-1));
}

// Stored lifecycle keeps observed days only; rebuild unobserved gaps on every read.
export function restoreIssueLifecycle(series=[],referenceAt){
 return series.slice(0,6).map(issue=>{const known=new Map((issue.daily||[]).map(row=>[row.date,row])),reference=Date.parse(referenceAt||''),latest=Math.max(0,...[...known.keys()].map(date=>Date.parse(date+'T00:00:00Z')).filter(Number.isFinite)),end=Number.isFinite(reference)?Date.parse(localDay(reference)+'T00:00:00Z'):latest;
 return {title:issue.title,daily:Array.from({length:31},(_,i)=>{const date=new Date(end-(30-i)*86400000).toISOString().slice(0,10);return known.get(date)||{date,count:null,sourceCount:null};})};});
}
