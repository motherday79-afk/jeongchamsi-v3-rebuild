const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values.filter(Boolean))];
const stableId=value=>{let hash=5381;for(const char of String(value||''))hash=((hash<<5)+hash)^char.charCodeAt(0);return `event-${(hash>>>0).toString(36)}`;};
const displayTitle=value=>clean(value).replace(/^(?:(?:\[[^\]]+\]|【[^】]+】)\s*)+/,'').replace(/\s*[-|｜]\s*[^-|｜]{2,30}$/,'').replace(/([가-힣]{2,4})\s+운명은(\?|$)/,'$1의 운명은$2').trim();

const ASSETS=['brand','mediaAttention','policyIdentity','regionalBase','coreSupport','moderateExpansion','partyAlliance','politicalResilience','electionCompetitiveness','crisisRisk','growthPotential'];
const KEYWORDS=/5\s*[·.]?\s*18|민생|경제|주거|노동|안전|교육|복지|예산|법안|정책|공약|공천|선거|총선|대선|당대표|최고위원|장관|시장|도지사|지역|개발|논란|발언|의혹|수사|기소|재판|유죄|소송|손배소|손해배상|갈등|충돌|성과|유치|확보/gi;

function eventType(title){
  if(/손배소|손해배상|소송|피소|고발|수사|기소|재판|유죄|혐의|의혹/.test(title))return '법적 사건';
  if(/논란|망언|왜곡|폄훼|도발|사과|해명|비판|반발/.test(title))return '발언·논란';
  if(/공천|선거|총선|대선|당선|낙선|득표|후보/.test(title))return '선거·공천';
  if(/대표|최고위원|지도부|당직|인선|장관|지명|임명/.test(title))return '당직·공직';
  if(/정책|법안|공약|민생|경제|예산|복지|주거|노동/.test(title))return '정책·입법';
  if(/지역|현장|개발|유치|확보|개통/.test(title))return '지역·성과';
  if(/충돌|갈등|공격|경쟁/.test(title))return '정치적 충돌';
  return '정치 활동';
}

function legalStatus(title){
  if(/유죄\s*확정|대법원.*유죄/.test(title))return '유죄 확정';
  if(/재판|공판/.test(title))return '재판';
  if(/기소|공소/.test(title))return '기소';
  if(/수사|입건/.test(title))return '수사';
  if(/손배소|손해배상|민사\s*소송|소송\s*(?:제기|청구)/.test(title))return '민사소송';
  if(/혐의|의혹/.test(title))return '혐의';
  if(/고발/.test(title))return '고발';
  return '';
}

function normalizedKeywords(title,personName=''){
  return unique((clean(title).match(KEYWORDS)||[]).map(word=>word.replace(/\s/g,'').replace('.', '·')).filter(word=>word!==personName)).slice(0,8);
}

function clusterKey(row,person){
  const title=clean(row.title),type=eventType(title),keywords=normalizedKeywords(title,person?.name);
  const anchor=/5\s*[·.]?\s*18/.test(title)?'5·18':keywords.find(word=>!['논란','발언','성과','정책','법안','지역'].includes(word))||row.agendaTag||type;
  return `${type}:${anchor}`;
}

function directionFor(rows){
  const frames=rows.map(row=>row.frame),positive=frames.filter(frame=>frame==='긍정·성과').length,negative=frames.filter(frame=>frame==='부정·위기').length;
  if(positive&&negative)return 'mixed';
  if(negative)return 'negative';
  if(positive)return 'positive';
  return 'neutral';
}

function affectedGroups(type,direction){
  if(type==='발언·논란'||type==='법적 사건')return ['핵심 지지층','중도층','비지지층'];
  if(type==='선거·공천')return ['당원','지역 유권자','경합 유권자'];
  if(type==='정책·입법')return ['정책 수혜층','중도층','지역 유권자'];
  if(type==='지역·성과')return ['지역 유권자','생활권 주민'];
  return direction==='positive'?['우호층','중도층']:['핵심 지지층','유동층'];
}

function effect(direction,strength,groups,evidenceIds,explanation){return {direction,impactStrength:strength,affectedGroups:groups,evidenceIds,explanation};}

function effectsFor(event){
  const ids=event.relatedNewsIds,groups=event.affectedGroups,negative=event.direction==='negative',positive=event.direction==='positive',controversy=['발언·논란','법적 사건'].includes(event.eventType);
  const neutral=asset=>effect('neutral','weak',groups,ids,`${event.eventTitle}에서 ${asset}의 직접 변화는 확인하지 않는다.`);
  const effects=Object.fromEntries(ASSETS.map(asset=>[asset,neutral(asset)]));
  effects.mediaAttention=effect(event.evidence.length?'positive':'neutral',event.severity,groups,ids,`${event.eventTitle} 보도로 언론 주목도는 상승한다.`);
  if(controversy||negative){
    effects.brand=effect('negative',event.severity,groups,ids,`${event.eventTitle}의 부정 프레임이 인물 이미지에 손실을 만든다.`);
    effects.policyIdentity=effect('negative','medium',groups,ids,'논란 서사가 정책·성과 노출을 밀어낸다.');
    effects.coreSupport=effect('positive','medium',['핵심 지지층'],ids,'외부 비판에 대한 방어 반응이 핵심 지지층 결집으로 작용한다.');
    effects.moderateExpansion=effect('negative',event.severity,['중도층','비지지층'],ids,'논란에 대한 거부감이 외연 확장을 막는다.');
    effects.electionCompetitiveness=effect('negative','medium',['중도층','경합 유권자'],ids,'후보 검증 이슈로 전환될 경우 경합 득표에 손실을 만든다.');
    effects.crisisRisk=effect('negative',event.severity,groups,ids,'추가 보도와 당사자 대응에 따라 위기 위험이 커진다.');
    effects.growthPotential=effect('negative','medium',['중도층','당내 의사결정층'],ids,'부정 이미지가 고착되면 다음 정치 단계의 명분이 약해진다.');
  }else if(positive){
    for(const asset of ['brand','policyIdentity','regionalBase','moderateExpansion','politicalResilience','electionCompetitiveness','growthPotential'])effects[asset]=effect('positive',event.severity,groups,ids,`${event.eventTitle}의 성과 프레임이 ${asset} 자산을 강화한다.`);
    effects.crisisRisk=effect('positive','weak',groups,ids,'성과 서사가 부정 이슈의 점유를 낮춘다.');
  }
  return effects;
}

function structuralRoleEvent(person,politicalHistory=[]){
  const history=list(politicalHistory).filter(row=>clean(row?.title||row?.eventTitle)).sort((a,b)=>clean(b?.effectiveFrom||b?.date).localeCompare(clean(a?.effectiveFrom||a?.date))),role=history[0],title=clean(role?.title||role?.eventTitle||person?.office||person?.roleLabel);
  if(!title)return null;
  const evidenceId=clean(role?.sourceId||role?.id)||`profile-${person?.id||'politician'}`,date=clean(role?.effectiveFrom||role?.date)||'현재',event={eventId:stableId(`${person?.id}|official-role|${title}|${date}`),eventTitle:title,eventType:'당직·공직',dateRange:{from:date,to:clean(role?.effectiveTo)||'현재'},relatedNewsIds:[],mainActors:unique([person?.name]),coreKeywords:unique(normalizedKeywords(title,person?.name)).length?unique(normalizedKeywords(title,person?.name)):['공식 직책'],politicalFrame:'중립·정보',direction:'neutral',affectedGroups:['지역 유권자','당원'],affectedPoliticalAssets:[],severity:'weak',persistence:'공식 재임',evidence:[{evidenceId,newsId:'',title,date,source:'공식 프로필',frame:'중립·정보'}],legalStatus:'',historyLinks:unique([role?.id,evidenceId])};
  event.assetEffects=effectsFor(event);return event;
}

export function buildEventClusters(person,newsNarrative={},politicalHistory=[]){
  const rows=list(newsNarrative.items).slice(0,10),groups=new Map();
  for(const row of rows){const key=clusterKey(row,person);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  const events=[...groups.entries()].map(([key,items])=>{
    const sorted=[...items].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.id||'').localeCompare(String(b.id||''))),first=sorted[0],type=eventType(sorted.map(row=>row.title).join(' ')),direction=directionFor(sorted),keywords=unique(sorted.flatMap(row=>normalizedKeywords(row.title,person?.name))).slice(0,8),dates=sorted.map(row=>row.date).filter(Boolean).sort(),evidence=sorted.map(row=>({evidenceId:row.id,newsId:row.id,title:row.title,date:row.date,source:row.source,frame:row.frame})),severity=sorted.length>=3?'strong':sorted.length===2?'medium':'weak';
    const event={eventId:stableId(`${person?.id}|${key}|${dates[0]||''}`),eventTitle:displayTitle(first?.title)||`${person?.name||'정치인'} 현재 정치 활동`,eventType:type,dateRange:{from:dates[0]||'현재',to:dates.at(-1)||dates[0]||'현재'},relatedNewsIds:sorted.map(row=>row.id),mainActors:unique([person?.name,...keywords.filter(word=>/당|정부|검찰|경찰|법원/.test(word))]),coreKeywords:keywords.length?keywords:[first?.agendaTag||'정치 활동'],politicalFrame:first?.frame||'중립·정보',direction,affectedGroups:affectedGroups(type,direction),affectedPoliticalAssets:[],severity,persistence:sorted.length>1?'반복':'단기 관측',evidence,legalStatus:type==='법적 사건'?legalStatus(sorted.map(row=>row.title).join(' ')):'',historyLinks:list(politicalHistory).filter(row=>keywords.some(keyword=>clean(row?.title||row?.eventTitle).includes(keyword))).map(row=>row.id||row.eventId).filter(Boolean)};
    const effects=effectsFor(event);event.affectedPoliticalAssets=Object.entries(effects).filter(([,value])=>value.direction!=='neutral').map(([asset])=>asset);event.assetEffects=effects;return event;
  }).sort((a,b)=>String(b.dateRange.to).localeCompare(String(a.dateRange.to))||a.eventId.localeCompare(b.eventId));
  if(events.length)return events;const fallback=structuralRoleEvent(person,politicalHistory);return fallback?[fallback]:[];
}

export function buildPoliticalAssetMatrix(eventClusters=[]){
  const byEvent=list(eventClusters).map(event=>({eventId:event.eventId,eventTitle:event.eventTitle,effects:event.assetEffects||effectsFor(event)}));
  const summary=Object.fromEntries(ASSETS.map(asset=>{
    const rows=byEvent.map(row=>row.effects[asset]).filter(Boolean),positive=rows.filter(row=>row.direction==='positive').length,negative=rows.filter(row=>row.direction==='negative').length;
    const direction=positive&&negative?'mixed':negative?'negative':positive?'positive':'neutral';
    return [asset,{direction,positiveEvents:positive,negativeEvents:negative,evidenceIds:unique(rows.flatMap(row=>row.evidenceIds||[])),explanation:direction==='mixed'?`${asset}에는 긍정과 부정 효과가 동시에 확인된다.`:direction==='negative'?`${asset}의 손실 신호가 우세하다.`:direction==='positive'?`${asset}의 강화 신호가 우세하다.`:`${asset}의 직접 변화는 확인하지 않는다.`}];
  }));
  return {assets:[...ASSETS],byEvent,summary};
}
