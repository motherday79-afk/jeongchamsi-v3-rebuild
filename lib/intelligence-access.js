export const DIAGNOSTIC_TOPICS=Object.freeze([
  {id:'01',title:'정치인 브랜드 진단'},{id:'02',title:'세대·성별 지지구조 분석'},{id:'03',title:'지역구 민심·메시지 진단'},{id:'04',title:'핵심 지지층 결집도 분석'},{id:'05',title:'경쟁 정치인 비교 분석'},{id:'06',title:'이슈·위기 위험도 진단'},{id:'07',title:'언론·온라인 영향력 분석'},{id:'08',title:'선거·캠페인 경쟁력 진단'},{id:'09',title:'정책·공약 반응 분석'},{id:'10',title:'JCS 종합해석'}
]);

export const DIAGNOSIS_TOPIC_ACCESS=Object.freeze({
  public:Object.freeze(['01','07','09']),
  member:Object.freeze(['01','02','03','05','07','09']),
  admin:Object.freeze(DIAGNOSTIC_TOPICS.map(topic=>topic.id))
});
export const DIAGNOSTIC_TOPIC_ACCESS=DIAGNOSIS_TOPIC_ACCESS;
export const ST_INTERPRETATION='JCS ST 해석 · 뉴스 헤드라인, 공식 이력, 선거·지역·정당 구조와 검색 반응을 종합한 정참시 자체 분석입니다.';

const DIAGNOSIS_FIELDS=Object.freeze({
  public:['id','title','headline','currentPosition','dominantEvent','coreEvent','politicalMeaning','changeDirection','attentionQuality','score','trend','visualization','updatedAt'],
  member:['id','title','headline','currentPosition','dominantEvent','coreEvent','politicalMeaning','changeDirection','changeCause','changeReason','pastPresentConnection','comparison','supportingSignals','supportingData','metrics','attentionQuality','score','percentile','trend','benchmark','visualization','interpretation','evidence','sourceTypes','updatedAt','algorithmVersion','basis'],
  admin:['id','title','headline','currentPosition','dominantEvent','coreEvent','politicalMeaning','changeDirection','changeCause','changeReason','pastPresentConnection','comparison','supportingSignals','supportingData','metrics','evidenceIds','attentionQuality','score','percentile','trend','benchmark','visualization','display','interpretation','evidence','opportunity','risk','sourceTypes','updatedAt','algorithmVersion','basis']
});
const PRESCRIPTION_FIELDS=['id','linkedDiagnosisIds','sourceFindings','diagnosisBasis','title','objective','strategicJudgment','recommendedActions','actions','targetGroups','target','messageDirection','channels','timing','immediateActions','actionsWithin30Days','actionsWithin90Days','longTermActions','priority','expectedImpact','monitoringIndicators','evidenceIds','visualization','updatedAt','algorithmVersion'];
const VISUAL_KEYS=new Set(['type','xLabel','yLabel','axis','point','bars','rows','columns','heatmap','segments','axes','points','periods','topics','zones','current','next','gaps','ladder','items','stages','label','value','x','y','left','right','male','female','values','impact','feasibility']);
const DISPLAY_KEYS=new Set(['kind','id','nowSignal','indicators','search','pc','mobile','mobileShare','news','pastRisks','tag','title','url','date','totalSign','risk','opportunity','cohorts','age','male','female','maleShare','femaleShare','maleRank','femaleRank','total','composition','key','label','value','elections','status','population','populationBasis','populationStatus','issues','count','share','messageFit','localShare','messageShare','people','name','party','office','region','overallRank','categoryRank','newsCount','sourceCount','frames','positive','neutral','negative','metrics','direction','velocity','persistence','from','to','recurrences','events','source','articleCount','sourceSpread','concentration','ownership','led','external','agendaPenetration','agendas','articles','outlets','policies','stage','specificity','beneficiary','budget','deadline','owner','opponent','opponentRate','voteRate','margin','result','year','election','regions','totalScore','gender','support','resilience','mediaInfluence','media']);

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
function safeDisplay(value,depth=0){
  if(depth>7)return null;
  if(typeof value==='string'||typeof value==='boolean'||Number.isFinite(value))return value;
  if(value===null)return null;
  if(Array.isArray(value))return value.map(item=>safeDisplay(item,depth+1)).filter(item=>item!==undefined);
  if(!value||typeof value!=='object')return undefined;
  return Object.fromEntries(Object.entries(value).filter(([key])=>DISPLAY_KEYS.has(key)).map(([key,item])=>[key,safeDisplay(item,depth+1)]).filter(([,item])=>item!==undefined));
}
function safeEvidence(value){return list(value).map(row=>select(row,['label','value','basis','sourceId'])).filter(row=>row.label||row.value);}
function safeSupporting(value){return list(value).map(row=>select(row,['label','value','basis'])).filter(row=>row.label||row.value);}
function safeTrend(value){return {direction:text(value?.direction)||'유지',unit:text(value?.unit),basis:text(value?.basis),periods:list(value?.periods).map(row=>select(row,['label','value']))};}
function safeBenchmark(value){return select(value,['label','position','delta']);}
function safeSources(value){return list(value).map(source=>select(source,['type','title','detail','grade','url'])).filter(source=>source.type||source.title);}
function safeNews(value){return list(value).slice(0,10).map(row=>select(row,['id','date','source','title','url','agendaTag','frame','agency','diagnosisRefs']));}
function safeRoles(value){return list(value).map(row=>select(row,['title','effectiveFrom','effectiveTo','roleStatus','sourceId','sourceUrl','sourceLabel','verifiedAt']));}
function safeEvent(value){const row=select(value,['eventId','eventTitle','eventType','dateRange','relatedNewsIds','mainActors','coreKeywords','politicalFrame','direction','affectedGroups','affectedPoliticalAssets','severity','persistence','evidence','legalStatus','historyLinks','evidenceIds']);row.relatedNewsIds=stringList(row.relatedNewsIds);row.mainActors=stringList(row.mainActors);row.coreKeywords=stringList(row.coreKeywords);row.affectedGroups=stringList(row.affectedGroups);row.affectedPoliticalAssets=stringList(row.affectedPoliticalAssets);row.evidenceIds=stringList(row.evidenceIds);row.evidence=list(row.evidence).map(item=>select(item,['evidenceId','newsId','title','date','source','frame']));return row;}
function safeSignal(value){return select(value,['kind','label','value','basis']);}
function safeMetrics(value){return select(value,['score','relativePosition','peerDelta','attentionQuality']);}

function safeDiagnosis(item,tier){
  const row=select(item,DIAGNOSIS_FIELDS[tier]);
  if(own(row,'trend'))row.trend=safeTrend(row.trend);
  if(own(row,'benchmark'))row.benchmark=safeBenchmark(row.benchmark);
  if(own(row,'visualization'))row.visualization=safeVisual(row.visualization);
  if(own(row,'display'))row.display=safeDisplay(row.display);
  if(own(row,'interpretation'))row.interpretation=stringList(row.interpretation).slice(0,4);
  if(own(row,'evidence'))row.evidence=safeEvidence(row.evidence).slice(0,tier==='admin'?3:2);
  if(own(row,'supportingData'))row.supportingData=safeSupporting(row.supportingData);
  if(own(row,'supportingSignals'))row.supportingSignals=list(row.supportingSignals).map(safeSignal);
  if(own(row,'metrics'))row.metrics=safeMetrics(row.metrics);
  if(own(row,'dominantEvent'))row.dominantEvent=safeEvent(row.dominantEvent);
  if(own(row,'comparison'))row.comparison=safeBenchmark(row.comparison);
  if(own(row,'evidenceIds'))row.evidenceIds=stringList(row.evidenceIds);
  if(own(row,'sourceTypes'))row.sourceTypes=stringList(row.sourceTypes);
  return row;
}
function safePrescription(item){
  const row=select(item,PRESCRIPTION_FIELDS);
  row.linkedDiagnosisIds=stringList(row.linkedDiagnosisIds);
  row.diagnosisBasis=stringList(row.diagnosisBasis);
  row.sourceFindings=stringList(row.sourceFindings);
  row.recommendedActions=stringList(row.recommendedActions).slice(0,4);
  row.actions=stringList(row.actions).slice(0,3);
  row.targetGroups=stringList(row.targetGroups);
  row.immediateActions=stringList(row.immediateActions);
  row.actionsWithin30Days=stringList(row.actionsWithin30Days);
  row.actionsWithin90Days=stringList(row.actionsWithin90Days);
  row.longTermActions=stringList(row.longTermActions);
  row.evidenceIds=stringList(row.evidenceIds);
  row.channels=stringList(row.channels);
  row.monitoringIndicators=stringList(row.monitoringIndicators);
  row.visualization=safeVisual(row.visualization);
  return row;
}
function safeSummary(value){return select(value,['strongestAsset','structuralWeakness','growthVariable','strongIds','managementIds']);}
function safePriorities(value){return {immediate:stringList(value?.immediate),days30:stringList(value?.days30),days90:stringList(value?.days90),longTerm:stringList(value?.longTerm)};}
function safeNarrative(value){return {topics:list(value?.topics).slice(0,5).map(row=>select(row,['label','count','share','direction','sourceCount','basis'])),risingTopics:stringList(value?.risingTopics),fadingTopics:stringList(value?.fadingTopics),mediaImage:text(value?.mediaImage),ledImage:text(value?.ledImage),externallyDrivenImage:text(value?.externallyDrivenImage),riskFrames:stringList(value?.riskFrames),dominantEvent:select(value?.dominantEvent,['title','date','source','agendaTag','frame','agency']),attentionQuality:text(value?.attentionQuality),frameSummary:select(value?.frameSummary,['positive','neutral','negative','dominant']),agencySummary:select(value?.agencySummary,['led','external','dominant']),temporalSummary:select(value?.temporalSummary,['days30','days90','year','recentDirection','basis']),politicalMeaning:text(value?.politicalMeaning),effectSeparation:text(value?.effectSeparation),policyImageLink:Number(value?.policyImageLink)||0,sourceDiversity:Number(value?.sourceDiversity)||0,narratives:select(value?.narratives,['days30','days90'])};}
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
  if(access==='admin')Object.assign(result,{stInterpretation:ST_INTERPRETATION,diagnosisSummary:safeSummary(report.diagnosisSummary),prescriptions:list(report.prescriptions).map(safePrescription),prescriptionPriorities:safePriorities(report.prescriptionPriorities),newsNarrative:safeNarrative(report.newsNarrative),eventClusters:list(report.eventClusters).map(safeEvent),politicalAssetMatrix:safePoliticalAssetMatrix(report.politicalAssetMatrix),pastPresentConnections:list(report.pastPresentConnections).map(row=>select(row,['connectionId','pastEvent','pastResponse','outcome','currentBase','currentEffect','evidenceIds','basis'])),politicianType:safePoliticianType(report.politicianType)});
  return result;
}

function safePoliticianType(value){return {primaryType:text(value?.primaryType),secondaryTypes:stringList(value?.secondaryTypes),currentPhase:text(value?.currentPhase),typeEvidence:list(value?.typeEvidence).map(row=>({type:text(row?.type),score:Number(row?.score)||0,evidenceIds:stringList(row?.evidenceIds),basis:text(row?.basis)})),typeScores:list(value?.typeScores).map(row=>({type:text(row?.type),score:Number(row?.score)||0})),classifiedAt:text(value?.classifiedAt),algorithmVersion:text(value?.algorithmVersion)};}
function safePoliticalAssetMatrix(value){return {assets:stringList(value?.assets),byEvent:list(value?.byEvent).map(row=>({eventId:text(row?.eventId),eventTitle:text(row?.eventTitle),effects:Object.fromEntries(Object.entries(row?.effects||{}).map(([key,effect])=>[key,select(effect,['direction','impactStrength','affectedGroups','evidenceIds','explanation'])]))})),summary:Object.fromEntries(Object.entries(value?.summary||{}).map(([key,item])=>[key,select(item,['direction','positiveEvents','negativeEvents','evidenceIds','explanation'])]))};}
