const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values.filter(Boolean))];
const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const direction=(matrix,key)=>clean(matrix?.summary?.[key]?.direction)||'neutral';
const positive=(matrix,key)=>direction(matrix,key)==='positive'||direction(matrix,key)==='mixed';
const negative=(matrix,key)=>direction(matrix,key)==='negative'||direction(matrix,key)==='mixed';
const termsCount=value=>{const text=clean(value);const match=text.match(/(\d+)선/);if(match)return Number(match[1]);if(/재선/.test(text))return 2;if(/초선/.test(text))return 1;return 1;};

export function buildPastPresentConnections(person,eventClusters=[]){
  const events=list(eventClusters),history=list(person?.roleHistory),election=clean(person?.electionLabel),currentRole=clean(person?.office||person?.roleLabel)||'현재 정치 역할';
  const negativeEvents=events.filter(event=>event.direction==='negative'||['발언·논란','법적 사건'].includes(event.eventType));
  if(negativeEvents.length){
    return negativeEvents.slice(0,3).map(event=>({
      connectionId:`connection-${event.eventId}`,
      pastEvent:event.eventTitle,
      pastResponse:'당시 공개 대응과 후속 정치 결과를 함께 판정',
      outcome:election||history[0]?.title||currentRole,
      currentBase:[person?.party,person?.jurisdiction||person?.region,currentRole].filter(Boolean).join(' · '),
      currentEffect:/당선|선출|연임/.test(election)?'대중 이미지 부담은 남았지만 이후 선거 결과로 정치적 복원력이 확인됐다.':'부정 이미지 부담이 현재 외연 확장과 정치적 평가에 이어지고 있다.',
      evidenceIds:unique([...(event.relatedNewsIds||[]),...history.map(row=>row.sourceId)]),
      basis:/당선|선출|연임/.test(election)?'사건 이후 공식 선거 결과':'사건과 현재 공식 직책'
    }));
  }
  const role=history[0];
  return [{
    connectionId:`connection-${person?.id||'politician'}-career`,
    pastEvent:role?.title||clean(person?.terms)||'공식 정치 경력',
    pastResponse:'공식 경력과 현재 활동의 연속성을 판정',
    outcome:election||currentRole,
    currentBase:[person?.party,person?.jurisdiction||person?.region,currentRole].filter(Boolean).join(' · '),
    currentEffect:`기존 정치 경력은 현재 ${currentRole} 역할의 기반으로 작동한다.`,
    evidenceIds:unique(history.map(row=>row.sourceId)),
    basis:'공식 프로필·정치 이력'
  }];
}

function scoreTypes(person,evidence){
  const matrix=evidence?.politicalAssetMatrix||{},events=list(evidence?.eventClusters),office=clean(person?.office||person?.roleLabel),terms=termsCount(person?.terms),isExecutive=/시장|군수|구청장|도지사|광역단체장|기초단체장/.test(office),isNational=/대통령|총리|장관|당대표|원내대표|대선/.test(`${office} ${clean(person?.primaryRole?.title)}`),isPartyLeader=/당대표|원내대표|최고위원|지도부|위원장/.test(`${office} ${clean(person?.primaryRole?.title)}`),hasPolicy=events.some(event=>event.eventType==='정책·입법'&&event.direction==='positive'),hasRegional=events.some(event=>event.eventType==='지역·성과'&&event.direction==='positive'),hasControversy=events.some(event=>['발언·논란','법적 사건'].includes(event.eventType)||event.direction==='negative'),hasElection=events.some(event=>event.eventType==='선거·공천'),hasConflict=events.some(event=>event.eventType==='정치적 충돌'||event.eventType==='발언·논란');
  return [
    ['전국 인지도·차기주자형',20+(isNational?45:0)+(positive(matrix,'mediaAttention')?20:0)+(terms>=3?10:0)],
    ['지역기반·생활행정형',20+(isExecutive?40:0)+(positive(matrix,'regionalBase')?30:0)+(hasRegional?15:0)+(person?.jurisdiction?8:0)],
    ['정책·성과형',18+(positive(matrix,'policyIdentity')?38:0)+(hasPolicy?25:0)+(positive(matrix,'brand')?8:0)],
    ['정책의제 선점형',15+(hasPolicy?32:0)+(positive(matrix,'policyIdentity')?28:0)+(positive(matrix,'mediaAttention')?10:0)],
    ['코어지지층 결집형',28+(positive(matrix,'coreSupport')?38:0)+(hasControversy?14:0)+(negative(matrix,'moderateExpansion')?8:0)],
    ['위기복원형',14+(positive(matrix,'politicalResilience')?42:0)+(hasControversy?14:0)+(/당선|선출|연임/.test(clean(person?.electionLabel))?12:0)],
    ['당권·국정조율형',15+(isPartyLeader?48:0)+(positive(matrix,'partyAlliance')?25:0)+(terms>=3?8:0)],
    ['전략조직형',14+(terms>=3?24:terms*5)+(hasElection?20:0)+(/당선|선출/.test(clean(person?.electionLabel))?18:0)],
    ['개혁·전투형',12+(hasConflict?32:0)+(positive(matrix,'coreSupport')?18:0)+(positive(matrix,'mediaAttention')?12:0)],
    ['미디어·이슈주도형',18+(positive(matrix,'mediaAttention')?38:0)+(events.length?Math.min(20,events.length*5):0)+(hasControversy?8:0)],
    ['신흥리더형',10+(terms===1&&positive(matrix,'growthPotential')?35:0)+(positive(matrix,'brand')?18:0)+(positive(matrix,'moderateExpansion')?18:0)],
    ['지역기반 전환형',12+(!isExecutive&&positive(matrix,'regionalBase')?30:0)+(hasRegional?20:0)+(negative(matrix,'moderateExpansion')?8:0)],
    ['행정성과형',12+(isExecutive?32:0)+(hasRegional?28:0)+(positive(matrix,'policyIdentity')?14:0)],
    ['정치적 재기형',10+(hasControversy&&positive(matrix,'politicalResilience')?42:0)+(/복귀|재선|당선/.test(`${clean(person?.electionLabel)} ${events.map(row=>row.eventTitle).join(' ')}`)?18:0)]
  ].map(([type,score])=>({type,score:clamp(score)})).sort((a,b)=>b.score-a.score||a.type.localeCompare(b.type,'ko'));
}

function currentPhaseFor(events,matrix){
  const dominant=events[0],attention=positive(matrix,'mediaAttention'),expansionRisk=negative(matrix,'moderateExpansion'),policy=positive(matrix,'policyIdentity'),regional=positive(matrix,'regionalBase');
  if(dominant&&(['발언·논란','법적 사건'].includes(dominant.eventType)||dominant.direction==='negative'))return `부정 이슈 고주목${expansionRisk?' · 외연 확장 위험':''}`;
  if(policy&&regional)return '정책 성과 축적 · 지역 기반 강화';
  if(policy)return '정책 의제 상승 · 성과 확장 구간';
  if(regional)return '지역 기반 강화 · 전국 확장 전 단계';
  if(attention)return '미디어 주목 상승 · 정치 자산 전환 구간';
  return '공식 역할 수행 · 구조 자산 축적 구간';
}

export function classifyPolitician(person,evidence={},algorithmVersion='JCS_INTELLIGENCE_V3'){
  const eventClusters=list(evidence.eventClusters),matrix=evidence.politicalAssetMatrix||{},scores=scoreTypes(person,evidence),selected=scores.filter(row=>row.score>=40).slice(0,3),primary=selected[0]||scores[0],secondary=selected.slice(1).map(row=>row.type),eventIds=unique(eventClusters.flatMap(event=>event.relatedNewsIds||[])),structuralIds=unique(list(person?.roleHistory).map(row=>row.sourceId));
  const typeEvidence=(selected.length?selected:[primary]).map(row=>({type:row.type,score:row.score,evidenceIds:unique([...eventIds,...structuralIds]),basis:eventIds.length?'핵심 사건·정치 자산 영향·공식 이력':'공식 직책·정당·지역·정치 경력'}));
  return {primaryType:primary.type,secondaryTypes:secondary,currentPhase:currentPhaseFor(eventClusters,matrix),typeEvidence,typeScores:scores,classifiedFrom:{eventCount:eventClusters.length,officialRole:clean(person?.office||person?.roleLabel),region:clean(person?.jurisdiction||person?.region),terms:clean(person?.terms)},classifiedAt:clean(evidence.snapshot)||'현재',algorithmVersion};
}
