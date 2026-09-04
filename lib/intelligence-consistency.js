const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values.filter(Boolean))];
const normalized=value=>clean(value).replace(/[0-9,.%]+/g,'#').replace(/[가-힣]{2,4}(?=의|은|는|이|가|을|를|에게)/g,'인물');
const tokens=value=>new Set(normalized(value).split(/[^가-힣A-Za-z#]+/).filter(token=>token.length>1));

function similarity(left,right){
  const a=tokens(left),b=tokens(right);if(!a.size||!b.size)return 0;
  const shared=[...a].filter(token=>b.has(token)).length;
  return shared/Math.max(a.size,b.size);
}

function copiedDiagnosisFields(diagnoses){
  for(const row of diagnoses){
    const values=[row?.currentPosition,row?.politicalMeaning,...list(row?.interpretation)].map(clean).filter(Boolean);
    for(let i=0;i<values.length;i+=1)for(let j=i+1;j<values.length;j+=1)if(normalized(values[i])===normalized(values[j])||similarity(values[i],values[j])>=.72)return true;
  }
  return false;
}

function overusedEvidence(diagnoses){
  const counts=new Map();
  for(const row of diagnoses)for(const id of new Set(list(row?.evidenceIds).map(clean).filter(Boolean)))counts.set(id,(counts.get(id)||0)+1);
  return [...counts.values()].some(count=>count>2);
}

function repeatedCode(rows,field,code){
  const values=rows.map(row=>Array.isArray(row?.[field])?row[field].map(normalized).join(' '):normalized(row?.[field])).filter(Boolean),counts=new Map();
  for(const value of values)counts.set(value,(counts.get(value)||0)+1);
  return Math.max(0,...counts.values())>=Math.max(3,Math.ceil(rows.length*.6))?code:'';
}

export function validateIntelligenceConsistency(report,options={}){
  const errors=[],warnings=[],diagnoses=list(report?.diagnoses),prescriptions=list(report?.prescriptions),events=list(report?.eventClusters),news=list(report?.newsNarrative?.items).length?report.newsNarrative.items:list(report?.news),sourceErrors=list(report?.raw?.sourceErrors),checks=['SOURCE_STATE','LEGAL_STAGE','ATTENTION_DIRECTION','DUPLICATION','FIELD_INDEPENDENCE','EVIDENCE_OWNERSHIP','SCORE_VARIATION','DIAGNOSIS_PRESCRIPTION_LINK','SEARCH_ROLE'];
  const failedNews=sourceErrors.some(row=>/NEWS|GOOGLE|NAVER_NEWS/i.test(`${row?.source||''} ${row?.stage||''} ${row?.code||''}`));
  if(failedNews&&!news.length&&diagnoses.some(row=>/0건.*유지|유지.*0건/.test(`${row?.changeCause||''} ${row?.changeReason||''}`)))errors.push('SOURCE_FAILURE_AS_ABSENCE');
  const unsettledLegal=events.some(event=>event.eventType==='법적 사건'&&!['유죄 확정'].includes(event.legalStatus));
  if(unsettledLegal&&/유죄\s*확정/.test(JSON.stringify(diagnoses)))errors.push('LEGAL_STAGE_CONTRADICTION');
  const negativeDominant=events.some(event=>event.direction==='negative'||event.politicalFrame==='부정·위기');
  if(negativeDominant&&diagnoses.some(row=>row.attentionQuality==='정치 자산'))errors.push('NEGATIVE_ATTENTION_MARKED_AS_ASSET');
  for(const [field,code] of [['opportunity','OPPORTUNITY_COPY_REPEATED'],['risk','RISK_COPY_REPEATED'],['interpretation','INTERPRETATION_COPY_REPEATED'],['politicalMeaning','POLITICAL_MEANING_COPY_REPEATED']]){const found=repeatedCode(diagnoses,field,code);if(found)errors.push(found);}
  if(copiedDiagnosisFields(diagnoses))errors.push('DIAGNOSIS_FIELDS_COPIED');
  if(overusedEvidence(diagnoses))errors.push('EVIDENCE_OVERUSED');
  const impactCopy=repeatedCode(prescriptions,'expectedImpact','EXPECTED_IMPACT_COPY_REPEATED');if(impactCopy)errors.push(impactCopy);
  const monitoringCopy=repeatedCode(prescriptions,'monitoringIndicators','MONITORING_COPY_REPEATED');if(monitoringCopy)errors.push(monitoringCopy);
  if(/\[object Object\]/.test(JSON.stringify(report)))errors.push('OBJECT_TEXT_RENDERED');
  if(diagnoses.some(row=>/현재 판단을 .*실행 성과로 전환|근거는 .*의 결합이며 단일 검색량을 지지율로 해석하지 않는다|해당 핵심 이슈는 긍정과 부정 효과가 함께 나타나/.test(JSON.stringify(row)))||prescriptions.some(row=>/현재 판단을 .*실행 성과로 전환|해당 핵심 이슈는 긍정과 부정 효과가 함께 나타나/.test(JSON.stringify(row))))errors.push('FORBIDDEN_GENERIC_COPY');
  const scores=diagnoses.map(row=>Number(row?.score)).filter(Number.isFinite);if(scores.length===10&&new Set(scores).size===1)errors.push('DIAGNOSIS_SCORE_CLONED');
  const diagnosisIds=new Set(diagnoses.map(row=>clean(row?.id)).filter(Boolean));
  if(prescriptions.some(row=>!list(row?.linkedDiagnosisIds).length||list(row.linkedDiagnosisIds).some(id=>!diagnosisIds.has(clean(id)))))errors.push('PRESCRIPTION_LINK_INVALID');
  if(prescriptions.some(row=>!list(row?.sourceFindings||row?.diagnosisBasis).length))errors.push('PRESCRIPTION_FINDING_MISSING');
  const primaryCopy=diagnoses.flatMap(row=>[row?.headline,row?.currentPosition,row?.politicalMeaning]).map(clean);
  if(primaryCopy.some(text=>/^(?:PC|모바일)?\s*검색(?:량| 반응)?.*(?:높|많).*(?:영향력|인지도|지지)/.test(text)||/검색량이?\s*(?:높|많).*므로/.test(text)))errors.push('SEARCH_USED_AS_PRIMARY_CONCLUSION');
  if(!events.length)warnings.push('STRUCTURAL_ONLY_ANALYSIS');
  if(!report?.pastPresentConnections?.length)warnings.push('PAST_PRESENT_LINK_MISSING');
  const timestamp=typeof options.now==='function'?new Date(Number(options.now())).toISOString():clean(report?.snapshot||diagnoses[0]?.updatedAt)||'현재';
  return {ok:errors.length===0,errors:unique(errors),warnings:unique(warnings),checks,checkedAt:timestamp};
}
