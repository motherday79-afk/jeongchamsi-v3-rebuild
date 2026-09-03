export const DIAGNOSTIC_TOPICS=Object.freeze([
  {id:'01',title:'정치인 브랜드 진단'},{id:'02',title:'세대·성별 지지구조 분석'},{id:'03',title:'지역구 민심·메시지 진단'},{id:'04',title:'핵심 지지층 결집도 분석'},{id:'05',title:'경쟁 정치인 비교 분석'},{id:'06',title:'이슈·위기 위험도 진단'},{id:'07',title:'언론·온라인 영향력 분석'},{id:'08',title:'선거·캠페인 경쟁력 진단'},{id:'09',title:'정책·공약 반응 분석'},{id:'10',title:'중장기 정치 성장 진단'}
]);

export const DIAGNOSIS_TOPIC_ACCESS=Object.freeze({
  public:Object.freeze(['01','07','09']),
  member:Object.freeze(['01','02','03','05','07','09']),
  admin:Object.freeze(DIAGNOSTIC_TOPICS.map(topic=>topic.id))
});
export const DIAGNOSTIC_TOPIC_ACCESS=DIAGNOSIS_TOPIC_ACCESS;
export const ST_INTERPRETATION='JCS ST 해석 · 공개 데이터, 뉴스 헤드라인, 정치 이력, 지역·정당 구조와 정참시 누적 신호를 종합한 자체 분석입니다.';

const DIAGNOSIS_FIELDS=Object.freeze({
  public:['id','title','headline','currentPosition','score','trend','visualization','updatedAt'],
  member:['id','title','headline','currentPosition','score','percentile','trend','benchmark','visualization','interpretation','evidence','sourceTypes','updatedAt','algorithmVersion','basis'],
  admin:['id','title','headline','currentPosition','score','percentile','trend','benchmark','visualization','interpretation','evidence','opportunity','risk','sourceTypes','updatedAt','algorithmVersion','basis']
});
const PRESCRIPTION_FIELDS=['id','linkedDiagnosisIds','title','objective','strategicJudgment','actions','target','messageDirection','channels','timing','priority','expectedImpact','monitoringIndicators','visualization','updatedAt','algorithmVersion'];
const VISUAL_KEYS=new Set(['type','xLabel','yLabel','axis','point','bars','rows','columns','heatmap','segments','axes','points','periods','topics','zones','current','next','gaps','ladder','items','stages','label','value','x','y','left','right','male','female','values','impact','feasibility']);

const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
const list=value=>Array.isArray(value)?value:[];
const text=value=>typeof value==='string'?value.trim():'';
const select=(value,keys)=>Object.fromEntries(keys.filter(key=>own(value,key)).map(key=>[key,value[key]]));
const stringList=value=>list(value).map(text).filter(Boolean);

function safeVisual(value,depth=0){
  if(depth>5)return null;
  if(typeof value==='string'||typeof value==='boolean'||Number.isFinite(value))return value;
  if(Array.isArray(value))return value.map(item=>safeVisual(item,depth+1)).filter(item=>item!==null);
  if(!value||typeof value!=='object')return null;
  return Object.fromEntries(Object.entries(value).filter(([key])=>VISUAL_KEYS.has(key)).map(([key,item])=>[key,safeVisual(item,depth+1)]).filter(([,item])=>item!==null));
}
function safeEvidence(value){return list(value).map(row=>select(row,['label','value','basis','sourceId'])).filter(row=>row.label||row.value);}
function safeTrend(value){return {direction:text(value?.direction)||'유지',periods:list(value?.periods).map(row=>select(row,['label','value']))};}
function safeBenchmark(value){return select(value,['label','position','delta']);}
function safeSources(value){return list(value).map(source=>select(source,['type','title','detail','grade','url'])).filter(source=>source.type||source.title);}
function safeNews(value){return list(value).slice(0,10).map(row=>select(row,['id','date','source','title','url','agendaTag','frame','agency','diagnosisRefs']));}
function safeRoles(value){return list(value).map(row=>select(row,['title','effectiveFrom','effectiveTo','roleStatus','sourceId','sourceUrl','sourceLabel','verifiedAt']));}

function safeDiagnosis(item,tier){
  const row=select(item,DIAGNOSIS_FIELDS[tier]);
  if(own(row,'trend'))row.trend=safeTrend(row.trend);
  if(own(row,'benchmark'))row.benchmark=safeBenchmark(row.benchmark);
  if(own(row,'visualization'))row.visualization=safeVisual(row.visualization);
  if(own(row,'interpretation'))row.interpretation=stringList(row.interpretation).slice(0,4);
  if(own(row,'evidence'))row.evidence=safeEvidence(row.evidence).slice(0,tier==='admin'?3:2);
  if(own(row,'sourceTypes'))row.sourceTypes=stringList(row.sourceTypes);
  return row;
}
function safePrescription(item){
  const row=select(item,PRESCRIPTION_FIELDS);
  row.linkedDiagnosisIds=stringList(row.linkedDiagnosisIds);
  row.actions=stringList(row.actions).slice(0,3);
  row.channels=stringList(row.channels);
  row.monitoringIndicators=stringList(row.monitoringIndicators);
  row.visualization=safeVisual(row.visualization);
  return row;
}
function safeSummary(value){return select(value,['strongestAsset','structuralWeakness','growthVariable','strongIds','managementIds']);}
function safePriorities(value){return {immediate:stringList(value?.immediate),days30:stringList(value?.days30),days90:stringList(value?.days90),longTerm:stringList(value?.longTerm)};}
function safeNarrative(value){return {topics:list(value?.topics).slice(0,5).map(row=>select(row,['label','count','share','direction','sourceCount','basis'])),risingTopics:stringList(value?.risingTopics),fadingTopics:stringList(value?.fadingTopics),mediaImage:text(value?.mediaImage),ledImage:text(value?.ledImage),externallyDrivenImage:text(value?.externallyDrivenImage),riskFrames:stringList(value?.riskFrames),policyImageLink:Number(value?.policyImageLink)||0,sourceDiversity:Number(value?.sourceDiversity)||0,narratives:select(value?.narratives,['days30','days90'])};}
function publicRecords(report){
  return {
    ...select(report,['id','snapshot','algorithmVersion','interpretationLabel','mode','currentRole']),
    rank:select(report.rank,['overall','category','temporary']),
    activities:stringList(report.activities),achievements:stringList(report.achievements),policies:stringList(report.policies),
    news:safeNews(report.news),sources:safeSources(report.sources),
    related:list(report.related).map(row=>select(row,['id','name','meta','party','jurisdiction','office','photo'])),
    primaryRole:select(report.primaryRole,['title','effectiveFrom','effectiveTo','roleStatus','sourceId','sourceUrl','sourceLabel','verifiedAt']),
    secondaryRole:text(report.secondaryRole),currentRoles:safeRoles(report.currentRoles),roleHistory:safeRoles(report.roleHistory)
  };
}

export function accessTierForUser(user){if(user?.role==='admin')return 'admin';return user?'member':'public';}

export function projectIntelligence(report,tier='public',scope='detail'){
  if(!report||typeof report!=='object')return null;
  const access=['public','member','admin'].includes(tier)?tier:'public',allowed=new Set(DIAGNOSIS_TOPIC_ACCESS[access]);
  const diagnoses=list(report.diagnoses).filter(item=>allowed.has(item?.id)).map(item=>safeDiagnosis(item,access));
  const result={...publicRecords(report),accessTier:access,diagnoses};
  if(access==='admin')Object.assign(result,{stInterpretation:ST_INTERPRETATION,diagnosisSummary:safeSummary(report.diagnosisSummary),prescriptions:list(report.prescriptions).map(safePrescription),prescriptionPriorities:safePriorities(report.prescriptionPriorities),newsNarrative:safeNarrative(report.newsNarrative)});
  return result;
}
