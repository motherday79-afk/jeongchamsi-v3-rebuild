export const DIAGNOSTIC_TOPICS=Object.freeze([
  {id:'01',title:'정치인 브랜드 진단'},
  {id:'02',title:'세대·성별 지지구조 분석'},
  {id:'03',title:'지역구 민심·메시지 진단'},
  {id:'04',title:'핵심 지지층 결집도 분석'},
  {id:'05',title:'경쟁 정치인 비교 분석'},
  {id:'06',title:'이슈·위기 위험도 진단'},
  {id:'07',title:'언론·온라인 영향력 분석'},
  {id:'08',title:'선거·캠페인 경쟁력 진단'},
  {id:'09',title:'정책·공약 반응 분석'},
  {id:'10',title:'중장기 정치 성장 로드맵'}
]);

export const DIAGNOSTIC_TOPIC_ACCESS=Object.freeze({
  public:Object.freeze(['01','07','09']),
  member:Object.freeze(['01','02','03','05','07','09']),
  admin:Object.freeze(DIAGNOSTIC_TOPICS.map(topic=>topic.id))
});

export const DIAGNOSTIC_FIELD_ACCESS=Object.freeze({
  public:Object.freeze(['headline','summary','trend','keywords','miniChart']),
  member:Object.freeze(['summary','metrics','trend','benchmark','comparison','interpretation','source','updatedAt']),
  admin:Object.freeze(['currentPosition','metrics','trend','benchmark','evidence','rootCause','opportunity','risk','strategicJudgment','actionPlan','priority','expectedImpact','monitoringIndicators','source','updatedAt'])
});

const MISSING='분석 준비 중';
const NO_PERIOD='해당 기간 데이터 없음';
const NO_COMPARISON='비교 가능한 데이터 부족';

const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
const list=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'&&value.trim()?value.trim():'';
const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const select=(value,keys)=>Object.fromEntries(keys.filter(key=>own(value,key)).map(key=>[key,value[key]]));
const metricRows=(value,labelKey='label',valueKey='score')=>list(value).flatMap(row=>{
  if(!row||typeof row!=='object')return [];
  const label=text(row[labelKey]||row.title||row.age||row.name),metric=number(row[valueKey]??row.value??row.impact??row.index);
  if(metric===null)return [];
  return [{label:label||'지표',value:metric,...select(row,['desc','note','kind','persistence','age','male','female'])}];
});
const objectMetrics=(value,labels={})=>value&&typeof value==='object'?Object.entries(value).flatMap(([key,raw])=>number(raw)===null?[]:[{label:labels[key]||key,value:number(raw)}]):[];
const safeSources=sources=>list(sources).map(source=>select(source,['type','title','detail','grade','url']));
const matchingSources=(sources,pattern)=>safeSources(sources).filter(source=>pattern.test(`${source.type||''} ${source.title||''}`));
const matchingStrategy=(strategies,pattern)=>list(strategies).filter(strategy=>pattern.test(text(strategy?.title))).map(strategy=>select(strategy,['title','body']));
const stringList=value=>list(value).map(text).filter(Boolean);
const unique=value=>[...new Set(value.filter(Boolean))];

function publicRecords(report){
  return {
    ...select(report,['id','snapshot','algorithmVersion','interpretationLabel','mode','currentRole']),
    rank:select(report.rank,['overall','category','temporary']),
    activities:stringList(report.activities),
    achievements:stringList(report.achievements),
    policies:stringList(report.policies),
    news:list(report.news).map(row=>select(row,['date','source','title','url'])),
    sources:safeSources(report.sources),
    related:list(report.related).map(row=>select(row,['id','name','meta','party','jurisdiction','office','photo']))
  };
}

function trendOf(report,values=report?.trend){
  const points=list(values).map(number).filter(value=>value!==null);
  if(!points.length)return {status:NO_PERIOD,values:[]};
  const first=points[0],last=points.at(-1),direction=last>first?'상승':last<first?'하락':'유지';
  return {status:'관측 데이터 있음',direction,summary:text(report?.trendSummary)||'현재 분석 대상 기간의 관측 흐름',values:points};
}

const sourceDate=report=>text(report?.snapshot)||MISSING;

function diagnosticInputs(report){
  const sources=safeSources(report.sources),core=metricRows(report.core),media=metricRows(report.media),activity=metricRows(report.activity),transition=metricRows(report.transition),issues=metricRows(report.issues,'title','impact');
  const support=objectMetrics(report.support,{core:'핵심 지지층',expand:'확장 가능성',floating:'중도 확장',risk:'이탈 위험',loyalty:'결속력',action:'행동력',stability:'안정성',scalability:'확장성'});
  const resilience=objectMetrics(report.resilience,{index:'정치 회복력',resistance:'충격 저항',speed:'대응 속도',stability:'안정성'});
  const competitors=metricRows(report.competitors,'name','score');
  const cohorts=list(report.cohorts).map(row=>select(row,['age','male','female','note']));
  const policies=stringList(report.policies),activities=stringList(report.activities),risks=stringList(report.risks),opportunities=stringList(report.opportunities);
  const diagnosisTitle=text(report.diagnosis?.title),diagnosisBody=text(report.diagnosis?.body),signalSummary=text(report.signal?.summary),conclusion=text(report.conclusion);
  const rank=report.rank&&typeof report.rank==='object'?select(report.rank,['overall','category']):{};
  const common={updatedAt:sourceDate(report),source:sources};
  return {
    '01':{...common,headline:text(report.signal?.label)||MISSING,summary:signalSummary||MISSING,metrics:core,trend:trendOf(report),benchmark:Object.keys(rank).length?rank:NO_COMPARISON,comparison:competitors.length?competitors.map(row=>select(row,['label','value','note'])):NO_COMPARISON,interpretation:diagnosisBody||diagnosisTitle||MISSING,currentPosition:diagnosisTitle||signalSummary||MISSING,evidence:sources,rootCause:diagnosisBody||MISSING,opportunity:opportunities.slice(0,1),risk:risks.slice(0,1),strategicJudgment:conclusion||MISSING,actionPlan:matchingStrategy(report.strategies,/브랜드|핵심 메시지/),priority:matchingStrategy(report.strategies,/실행 우선|30일/),expectedImpact:MISSING,monitoringIndicators:core.map(row=>row.label),keywords:unique([...issues.map(row=>row.label),...policies]).slice(0,3),miniChart:trendOf(report).values},
    '02':{...common,summary:text(report.audience?.summary)||MISSING,metrics:cohorts,trend:{status:NO_PERIOD,values:[]},benchmark:number(report.audience?.position)??NO_COMPARISON,comparison:NO_COMPARISON,interpretation:text(report.audience?.label)||MISSING,currentPosition:text(report.audience?.summary)||text(report.audience?.label)||MISSING,evidence:matchingSources(report.sources,/인구|연령|갤럽|여론/),rootCause:MISSING,opportunity:[],risk:[],strategicJudgment:MISSING,actionPlan:matchingStrategy(report.strategies,/세대|성별|중도층/),priority:[],expectedImpact:MISSING,monitoringIndicators:cohorts.flatMap(row=>row.age?[`${row.age} 남성`,`${row.age} 여성`]:[])},
    '03':{...common,summary:activities[0]||MISSING,metrics:[],trend:{status:NO_PERIOD,values:[]},benchmark:NO_COMPARISON,comparison:NO_COMPARISON,interpretation:policies.length?policies.join(' · '):MISSING,currentPosition:activities[0]||MISSING,evidence:matchingSources(report.sources,/공식 프로필|선거|지역/),rootCause:MISSING,opportunity:[],risk:[],strategicJudgment:MISSING,actionPlan:matchingStrategy(report.strategies,/지역/),priority:[],expectedImpact:MISSING,monitoringIndicators:[]},
    '04':{...common,currentPosition:support.length?'핵심 지지층 지표 관측 중':MISSING,metrics:support,trend:{status:NO_PERIOD,values:[]},benchmark:NO_COMPARISON,evidence:matchingSources(report.sources,/갤럽|여론|선거/),rootCause:MISSING,opportunity:opportunities.slice(0,1),risk:risks.slice(0,1),strategicJudgment:MISSING,actionPlan:matchingStrategy(report.strategies,/지지층|중도층/),priority:[],expectedImpact:MISSING,monitoringIndicators:support.map(row=>row.label)},
    '05':{...common,summary:competitors.length?`${competitors.length}명 비교 데이터 관측`:NO_COMPARISON,metrics:competitors,trend:{status:NO_PERIOD,values:[]},benchmark:competitors.length?competitors:NO_COMPARISON,comparison:competitors.length?competitors:NO_COMPARISON,interpretation:competitors.length?'동일한 공개 지표 기준으로 상대 위치를 비교합니다.':NO_COMPARISON,currentPosition:competitors.length?`${competitors.length}명 비교 데이터 관측`:NO_COMPARISON,evidence:matchingSources(report.sources,/선거|경선|뉴스/),rootCause:MISSING,opportunity:[],risk:[],strategicJudgment:MISSING,actionPlan:matchingStrategy(report.strategies,/경쟁/),priority:[],expectedImpact:MISSING,monitoringIndicators:competitors.map(row=>row.label)},
    '06':{...common,currentPosition:issues.length?`${issues.length}개 이슈 신호 관측`:MISSING,metrics:issues,trend:{status:NO_PERIOD,values:[]},benchmark:NO_COMPARISON,evidence:matchingSources(report.sources,/뉴스|보도/),rootCause:diagnosisBody||MISSING,opportunity:[],risk:risks,strategicJudgment:risks[0]||MISSING,actionPlan:matchingStrategy(report.strategies,/위기|이슈 대응/),priority:[],expectedImpact:MISSING,monitoringIndicators:issues.map(row=>row.label)},
    '07':{...common,headline:media[0]?.label||'언론·온라인 영향력',summary:media[0]?.desc||signalSummary||MISSING,metrics:media,trend:trendOf(report),benchmark:NO_COMPARISON,comparison:NO_COMPARISON,interpretation:diagnosisBody||MISSING,currentPosition:media[0]?.desc||signalSummary||MISSING,evidence:matchingSources(report.sources,/뉴스|검색|온라인/),rootCause:diagnosisBody||MISSING,opportunity:opportunities.filter(value=>/검색|매체|뉴스|확산/.test(value)),risk:risks.filter(value=>/검색|뉴스|확산|기기|보도/.test(value)),strategicJudgment:conclusion||MISSING,actionPlan:matchingStrategy(report.strategies,/검색|미디어|뉴스|확산/),priority:matchingStrategy(report.strategies,/실행 우선|30일/),expectedImpact:MISSING,monitoringIndicators:media.map(row=>row.label),keywords:unique(issues.map(row=>row.label)).slice(0,3),miniChart:media.map(row=>row.value).filter(value=>value!==null)},
    '08':{...common,currentPosition:resilience.length||support.length?'선거·캠페인 관련 지표 관측 중':MISSING,metrics:[...support,...resilience],trend:trendOf(report,report.resilience?.curve),benchmark:Object.keys(rank).length?rank:NO_COMPARISON,evidence:matchingSources(report.sources,/선거|경선|여론/),rootCause:MISSING,opportunity:opportunities,risk:risks,strategicJudgment:MISSING,actionPlan:matchingStrategy(report.strategies,/캠페인|30일|실행 우선/),priority:matchingStrategy(report.strategies,/30일|실행 우선/),expectedImpact:MISSING,monitoringIndicators:[...support,...resilience].map(row=>row.label)},
    '09':{...common,headline:policies[0]||issues[0]?.label||'정책·공약 반응',summary:policies.length?policies.join(' · '):MISSING,metrics:issues,trend:{status:NO_PERIOD,values:[]},benchmark:NO_COMPARISON,comparison:NO_COMPARISON,interpretation:issues.length?'공개 이슈 반응과 정책 기록을 함께 확인합니다.':MISSING,currentPosition:policies.length?policies.join(' · '):MISSING,evidence:matchingSources(report.sources,/뉴스|정책|공식 프로필/),rootCause:MISSING,opportunity:opportunities.filter(value=>/정책|민생|성과/.test(value)),risk:risks.filter(value=>/정책|민생|성과|보도/.test(value)),strategicJudgment:MISSING,actionPlan:matchingStrategy(report.strategies,/정책|민생|핵심 메시지/),priority:[],expectedImpact:MISSING,monitoringIndicators:issues.map(row=>row.label),keywords:unique([...policies,...issues.map(row=>row.label)]).slice(0,3),miniChart:issues.map(row=>row.value).filter(value=>value!==null)},
    '10':{...common,currentPosition:conclusion||MISSING,metrics:resilience,trend:trendOf(report),benchmark:Object.keys(rank).length?rank:NO_COMPARISON,evidence:sources,rootCause:diagnosisBody||MISSING,opportunity:opportunities,risk:risks,strategicJudgment:conclusion||MISSING,actionPlan:matchingStrategy(report.strategies,/로드맵|실행 우선|30일/),priority:matchingStrategy(report.strategies,/실행 우선|30일/),expectedImpact:MISSING,monitoringIndicators:unique([...core,...resilience].map(row=>row.label))}
  };
}

function topicStatus(topicId,input){
  const primary={
    '01':input.metrics.length||input.summary!==MISSING,
    '02':input.metrics.length,
    '03':input.summary!==MISSING,
    '04':input.metrics.length,
    '05':input.metrics.length,
    '06':input.metrics.length||input.risk.length,
    '07':input.metrics.length||input.summary!==MISSING,
    '08':input.metrics.length,
    '09':input.metrics.length||input.summary!==MISSING,
    '10':input.currentPosition!==MISSING
  }[topicId];
  return primary?'ready':'insufficient';
}

function buildDiagnostics(report,tier){
  const inputs=diagnosticInputs(report);
  return {
    role:tier,
    topics:DIAGNOSTIC_TOPIC_ACCESS[tier].map(id=>{
      const meta=DIAGNOSTIC_TOPICS.find(topic=>topic.id===id),input=inputs[id];
      return {id,number:id,title:meta.title,status:topicStatus(id,input),...select(input,DIAGNOSTIC_FIELD_ACCESS[tier])};
    })
  };
}

export function accessTierForUser(user){
  if(user?.role==='admin')return 'admin';
  return user?'member':'public';
}

export function projectIntelligence(report,tier='public',scope='detail'){
  if(!report||typeof report!=='object')return null;
  const access=['public','member','admin'].includes(tier)?tier:'public';
  return {...publicRecords(report),accessTier:access,diagnostics:buildDiagnostics(report,access)};
}
