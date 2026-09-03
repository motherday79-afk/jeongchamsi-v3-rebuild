const TOPIC_RULES=Object.freeze([
  {label:'지역·현장',words:/지역|현장|방문|주민|영등포|선거구|시장|군수|도지사|구청/},
  {label:'민생·경제',words:/민생|경제|물가|일자리|주거|산업|예산|소상공인|기업|재정/},
  {label:'정책·입법',words:/정책|법안|입법|공약|위원회|개혁|제도/},
  {label:'리더십·정당',words:/대표|당내|지도부|최고위원|경선|통합|갈등|협력|인선/},
  {label:'선거·경쟁',words:/선거|총선|대선|경쟁|후보|공천|득표/},
  {label:'외교·안보',words:/외교|안보|국방|북한|동맹|군|전작권/},
  {label:'논란·위기',words:/논란|의혹|수사|비판|공격|사과|해명|징계|고발|위기|도발|왜곡|폄훼|망언|모독/},
  {label:'성과·행정',words:/성과|확보|완료|달성|개통|유치|지원 확대|출범/},
  {label:'인물·행보',words:/발언|행보|인터뷰|출마|복귀|만나|참석/}
]);

const REF_BY_TOPIC=Object.freeze({
  '지역·현장':['03','08'],'민생·경제':['01','09'],'정책·입법':['01','09'],'리더십·정당':['01','04','10'],'선거·경쟁':['05','08'],'외교·안보':['01','09'],'논란·위기':['01','06','07'],'성과·행정':['01','03','09'],'인물·행보':['01','07']
});
const POSITIVE=/성과|달성|확보|유치|협력|통합|지원|개선|회복|성공|확대/;
const NEGATIVE=/논란|의혹|수사|비판|공격|사과|징계|고발|갈등|반발|실패|도발|왜곡|폄훼|망언|모독/;
const LED=/발표|제안|추진|강조|공개|요구|약속|방문|주도|출범|확보/;
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const objectWord=value=>{const word=clean(value),code=word.charCodeAt(word.length-1),hasBatchim=code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28!==0;return `${word}${hasBatchim?'을':'를'}`;};
const stamp=value=>{const time=Date.parse(value||'');return Number.isFinite(time)?time:0;};
const stableId=value=>{let hash=5381;for(const char of value)hash=((hash<<5)+hash)^char.charCodeAt(0);return `news-${(hash>>>0).toString(36)}`;};

function normalizedTitle(value){
  return clean(value).replace(/^\[[^\]]+\]\s*/,'').replace(/\s*[-|]\s*[^-|]{2,20}$/,'').replace(/[“”‘’"']/g,'').replace(/[^가-힣a-zA-Z0-9]+/g,' ').trim().toLocaleLowerCase('ko-KR');
}
function displayTitle(value){
  return clean(value).replace(/^(?:(?:\[[^\]]+\]|【[^】]+】)\s*)+/,'').replace(/\s*[-|｜]\s*[^-|｜]{2,30}$/,'').replace(/([가-힣]{2,4})\s+운명은(\?|$)/,'$1의 운명은$2').trim();
}
function tokens(value){return new Set(normalizedTitle(value).split(' ').filter(token=>token.length>1));}
function similar(left,right){
  const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return false;
  const overlap=[...a].filter(token=>b.has(token)).length,union=new Set([...a,...b]).size;
  return overlap/union>=.68;
}
function topicFor(title){return TOPIC_RULES.find(rule=>rule.words.test(title))?.label||'정치 활동';}
function frameFor(title){return NEGATIVE.test(title)?'부정·위기':POSITIVE.test(title)?'긍정·성과':'중립·정보';}
function agencyFor(title,person){return title.includes(clean(person?.name))&&LED.test(title)?'정치인 주도':'외부 서사';}

function representativeRows(items){
  const sorted=[...items].filter(item=>clean(item?.title)).sort((a,b)=>stamp(b.publishedAt||b.date)-stamp(a.publishedAt||a.date)||clean(a.title).localeCompare(clean(b.title),'ko'));
  const unique=[];
  for(const row of sorted){if(unique.some(saved=>normalizedTitle(saved.title)===normalizedTitle(row.title)||similar(saved.title,row.title)))continue;unique.push(row);}
  const chosen=[],sourceCounts=new Map();
  for(const row of unique){const source=clean(row.source)||'출처 미표기',count=sourceCounts.get(source)||0;if(count>=2)continue;chosen.push(row);sourceCounts.set(source,count+1);if(chosen.length===10)break;}
  return chosen;
}

function structuralTopics(person){
  const context=`${clean(person?.office)} ${clean(person?.roleLabel)} ${clean(person?.party)} ${clean(person?.region)} ${clean(person?.jurisdiction)} ${clean(person?.committee)}`;
  const candidates=TOPIC_RULES.filter(rule=>rule.words.test(context)).map(rule=>rule.label);
  const labels=[...new Set([...candidates,clean(person?.region)?'지역·현장':'',clean(person?.party)?'리더십·정당':''].filter(Boolean))].slice(0,5);
  return (labels.length?labels:['정치 활동']).map((label,index)=>({label,count:0,share:0,direction:index?'유지':'상승',sourceCount:0,basis:'structural'}));
}

export function analyzeNewsHeadlines(person,items=[]){
  const selected=representativeRows(Array.isArray(items)?items:[]),reference=Math.max(0,...selected.map(item=>stamp(item.publishedAt||item.date)));
  const enriched=selected.map(row=>{
    const title=clean(row.title),agendaTag=topicFor(title),source=clean(row.source)||'출처 미표기',date=clean(row.publishedAt||row.date).slice(0,10);
    return {id:stableId(`${normalizedTitle(title)}|${date}|${source}`),date,source,title,url:clean(row.url),agendaTag,frame:frameFor(title),agency:agencyFor(title,person),diagnosisRefs:REF_BY_TOPIC[agendaTag]||['01','07']};
  });
  const counts=new Map(),sources=new Map(),recent=new Map(),prior=new Map(),latest=new Map();
  for(const item of enriched){
    counts.set(item.agendaTag,(counts.get(item.agendaTag)||0)+1);
    latest.set(item.agendaTag,Math.max(latest.get(item.agendaTag)||0,stamp(item.date)));
    if(!sources.has(item.agendaTag))sources.set(item.agendaTag,new Set());sources.get(item.agendaTag).add(item.source);
    const age=reference&&stamp(item.date)?(reference-stamp(item.date))/86400000:0,bucket=age<=30?recent:prior;bucket.set(item.agendaTag,(bucket.get(item.agendaTag)||0)+1);
  }
  const topics=[...counts].map(([label,count])=>({
    label,
    count,
    share:Math.round(count/Math.max(1,enriched.length)*100),
    direction:(recent.get(label)||0)>(prior.get(label)||0)?'상승':(recent.get(label)||0)<(prior.get(label)||0)?'하락':'유지',
    sourceCount:sources.get(label)?.size||0,
    basis:'direct'
  })).sort((a,b)=>b.count-a.count||b.sourceCount-a.sourceCount||(latest.get(b.label)||0)-(latest.get(a.label)||0)||a.label.localeCompare(b.label,'ko'));
  const finalTopics=topics.length?topics.slice(0,5):structuralTopics(person),top=finalTopics[0];
  const risingTopics=finalTopics.filter(topic=>topic.direction==='상승').map(topic=>topic.label).slice(0,3),fadingTopics=finalTopics.filter(topic=>topic.direction==='하락').map(topic=>topic.label).slice(0,3);
  const led=enriched.filter(item=>item.agency==='정치인 주도'),dragged=enriched.filter(item=>item.agency==='외부 서사'),risks=enriched.filter(item=>item.frame==='부정·위기');
  const structuralCue=[clean(person?.office),clean(person?.jurisdiction),clean(person?.party)].filter(Boolean).join('·');
  const positive=enriched.filter(item=>item.frame==='긍정·성과').length,negative=risks.length,neutral=enriched.length-positive-negative;
  const frameDominant=negative>positive&&negative>=neutral?'부정·위기':positive>negative&&positive>=neutral?'긍정·성과':'중립·정보';
  const attentionQuality=negative>0&&negative>=positive&&negative>=neutral?'정치적 부담':positive>0&&positive>=negative&&positive>=neutral?'정치 자산':enriched.length?'혼합 영향':'구조적 기반';
  const within=days=>enriched.filter(item=>reference&&stamp(item.date)&&reference-stamp(item.date)<=days*86400000).length;
  const days30=within(30),days60=within(60),days90=within(90),year=within(365),prior30=Math.max(0,days60-days30);
  const dominantRow=enriched.find(item=>item.agendaTag===top.label)||enriched[0];
  const dominantEvent=dominantRow?{title:displayTitle(dominantRow.title),...Object.fromEntries(['date','source','agendaTag','frame','agency'].map(key=>[key,dominantRow[key]]))}:{title:`${structuralCue||clean(person?.name)} 현재 정치 역할`,date:'현재',source:'공식 프로필',agendaTag:top.label,frame:'중립·정보',agency:'정치인 주도'};
  const contextRows=enriched.filter(item=>item.agendaTag!==dominantEvent.agendaTag),contextWithin=days=>contextRows.filter(item=>reference&&stamp(item.date)&&reference-stamp(item.date)<=days*86400000).length,contextDays30=contextWithin(30),contextDays60=contextWithin(60),contextDays90=contextWithin(90),contextPrior30=Math.max(0,contextDays60-contextDays30);
  const politicalMeaning=attentionQuality==='정치적 부담'?`해당 핵심 이슈가 관심을 만들고 있으나 부정 프레임이 우세해 노출 확대보다 정치적 부담의 통제가 먼저다.`:attentionQuality==='정치 자산'?`해당 핵심 이슈가 관심을 만들고 있으며 긍정·성과 프레임이 우세해 대표 의제로 축적할 수 있다.`:`해당 핵심 이슈는 긍정과 부정 효과가 함께 나타나 사건별 정치적 의미를 분리해 관리해야 한다.`;
  const effectSeparation=negative?`뉴스 노출 상승과 브랜드 부담을 같은 성과로 보지 않고, 외부 관심 확대와 정치 자산 훼손 가능성을 분리한다.`:`뉴스 노출 상승과 브랜드 자산 축적을 구분하고, 정책·성과 프레임이 반복되는 범위만 정치 자산으로 평가한다.`;
  const mediaImage=enriched.length?`${top.label} 의제가 ${top.share}%로 뉴스 프레임을 주도한다.`:`${objectWord(structuralCue)} 중심으로 정치 서사의 기준축이 형성된다.`;
  return {
    items:enriched,
    topics:finalTopics,
    risingTopics:risingTopics.length?risingTopics:[top.label],
    fadingTopics,
    mediaImage,
    ledImage:led[0]?.agendaTag||top.label,
    externallyDrivenImage:dragged[0]?.agendaTag||top.label,
    riskFrames:[...new Set(risks.map(item=>item.agendaTag))].slice(0,3),
    dominantEvent,
    attentionQuality,
    frameSummary:{positive,neutral,negative,dominant:frameDominant},
    agencySummary:{led:led.length,external:dragged.length,dominant:led.length>=dragged.length?'정치인 주도':'외부 서사'},
    temporalSummary:{days30,days90,year,recentDirection:days30>prior30?'상승':days30<prior30?'하락':'유지',basis:'대표 뉴스 게시일'},
    contextTemporalSummary:{days30:contextDays30,days90:contextDays90,year:contextWithin(365),recentDirection:contextDays30>contextPrior30?'상승':contextDays30<contextPrior30?'하락':'유지',basis:'핵심 이슈 외 대표 뉴스 게시일'},
    politicalMeaning,
    effectSeparation,
    policyImageLink:Math.round(enriched.filter(item=>['민생·경제','정책·입법','성과·행정'].includes(item.agendaTag)).length/Math.max(1,enriched.length)*100),
    sourceDiversity:new Set(enriched.map(item=>item.source)).size,
    narratives:{
      days30:enriched.length?`${clean(person?.name)}의 최근 30일 노출은 ${objectWord(top.label)} 중심으로 형성됐고, ${led.length>=dragged.length?'직접 주도한 메시지가 서사를 견인한다.':'외부 사건에 반응한 보도가 직접 주도 메시지보다 많다.'}`:`${clean(person?.name)}의 최근 서사는 ${structuralCue}의 현재 역할과 정치 구조를 중심으로 해석된다.`,
      days90:`JCS 뉴스 서사는 ${top.label}의 지속성, ${finalTopics[1]?.label||'정치 역할'}과의 결합, ${risks.length?'위기 프레임의 반복':'정책·역할 프레임의 축적'}을 함께 추적한다.`
    }
  };
}
