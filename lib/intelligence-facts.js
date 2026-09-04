const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const unique=values=>[...new Set(values.filter(Boolean))];
const numberTokens=value=>unique(clean(value).match(/\d[\d,.]*(?:%|%포인트|만호|만명|억원|만원|석|선|개|건|명|년|개월|일)?/g)||[]).slice(0,8);
const NEWS_TYPES=Object.freeze([
  ['legal',/1심|2심|3심|대법원|재판|기소|수사|혐의|유죄|무죄|벌금|과태료|직 상실|소송|손배|고발/],
  ['election',/선거|득표|초접전|격차|후보|당선|낙선|공천|여론조사/],
  ['organization',/의회|의석|석|지도부|당내|조직|여소야대|원내|최고위원|당대표/],
  ['crisis',/논란|의혹|비판|반발|왜곡|폄훼|망언|도발|사과|해명|위기|상실/],
  ['policy',/정책|공약|주택|교통|철도|예산|민생|경제|복지|교육|안전|착공|공급|개통|추진/],
  ['local',/서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|지역|주민|현장/]
]);
const TOPICS_BY_TYPE=Object.freeze({legal:['01','05','06','08','10'],election:['01','04','05','08','10'],policy:['01','03','07','09','10'],organization:['04','05','08','10'],crisis:['01','02','04','05','06','07','08','10'],local:['03','08','09']});

function fact(id,type,label,statement,extra={}){
  return {id,type,label,statement:clean(statement),direction:extra.direction||'neutral',topicIds:unique(extra.topicIds||[]),numbers:extra.numbers||numberTokens(statement),sourceId:extra.sourceId||id,sourceTitle:clean(extra.sourceTitle||label),sourceUrl:clean(extra.sourceUrl),date:clean(extra.date),basis:extra.basis||'direct'};
}

function typesFor(value){return NEWS_TYPES.filter(([,pattern])=>pattern.test(value)).map(([type])=>type);}
function topicsFor(row,types){return unique([...(row?.diagnosisRefs||[]),...types.flatMap(type=>TOPICS_BY_TYPE[type]||[]),'07']);}
function evidenceTitle(row,name,index){
  const original=clean(row?.title),wrapped=/^(?:\[[^\]]+\]|【[^】]+】)/.test(original),withoutWrapper=original.replace(/^(?:(?:\[[^\]]+\]|【[^】]+】)\s*)+/,'').replace(/\s*[-|｜]\s*[^-|｜]{2,30}$/,'').trim();
  if(wrapped)return `${name} 관련 ${clean(row?.agendaTag)||'정치 활동'} 대표 보도 ${index+1}`;
  return withoutWrapper||`${name} 관련 최근 보도 ${index+1}`;
}

export function extractPoliticalFacts(person,input={}){
  const name=clean(person?.name)||'정치인',role=clean(person?.office||person?.roleLabel)||'정치인',career=clean(person?.terms)||'공식 경력',region=clean(person?.jurisdiction||person?.region)||'관할 지역',party=clean(person?.party)||'무소속',news=input?.newsNarrative||{},facts=[];
  facts.push(fact(`profile-role-${person?.id||name}`,'profile','현재 정치 역할',`${name}은 현재 ${region}의 ${role}이며 소속은 ${party}이다.`,{topicIds:['01','03','04','05','08','10'],basis:'structural',sourceTitle:'공식 프로필'}));
  facts.push(fact(`profile-career-${person?.id||name}`,'career','공식 정치 경력',`${name}의 공식 정치 경력은 ${career}이며 현재 역할은 ${role}이다.`,{topicIds:['01','04','05','08','10'],basis:'structural',sourceTitle:'공식 프로필'}));
  facts.push(fact(`profile-region-${person?.id||name}`,'local','지역 기반',`${name}의 정치 기반은 ${region}이고 현재 ${party} 소속으로 활동한다.`,{topicIds:['02','03','04','08','09'],basis:'structural',sourceTitle:'공식 프로필'}));

  const items=Array.isArray(news?.items)?news.items:[];
  for(const [index,row] of items.entries()){
    const title=evidenceTitle(row,name,index),description=clean(row?.description),combined=clean(`${title}. ${description}`),classificationText=clean(`${row?.title} ${description}`),types=typesFor(classificationText),primary=types[0]||'news';
    facts.push(fact(`fact-${row?.id||index}`,primary,title||'최근 정치 활동',combined||`${name} 관련 최근 보도`,{direction:row?.frame==='부정·위기'?'negative':row?.frame==='긍정·성과'?'positive':'neutral',topicIds:topicsFor(row,types),sourceId:row?.id||`news-${index}`,sourceTitle:/^(?:\[[^\]]+\]|【[^】]+】)/.test(clean(row?.title))?'Google 뉴스':row?.source||'Google 뉴스',sourceUrl:row?.url,date:row?.date}));
  }

  const frames=news?.frameSummary||{},sources=Number(news?.sourceDiversity)||new Set(items.map(row=>row.source).filter(Boolean)).size;
  facts.push(fact(`media-${person?.id||name}`,'media','언론 노출 구조',`${name}의 대표 뉴스 ${items.length}건은 ${sources}개 매체에서 관측됐고 프레임은 긍정·성과 ${Number(frames.positive)||0}건, 중립·정보 ${Number(frames.neutral)||0}건, 부정·위기 ${Number(frames.negative)||0}건이다.`,{direction:(Number(frames.negative)||0)>(Number(frames.positive)||0)?'negative':'neutral',topicIds:['01','06','07'],basis:items.length?'direct':'structural',sourceTitle:'Google 뉴스'}));

  const search=input?.searchMetrics||{},pc=Number(search.pc)||0,mobile=Number(search.mobile)||0,total=Number(search.total)||pc+mobile;
  facts.push(fact(`search-${person?.id||name}`,'search','검색 관심',`${name}의 월간 검색 보조 신호는 PC ${pc.toLocaleString('ko-KR')}회, 모바일 ${mobile.toLocaleString('ko-KR')}회, 합계 ${total.toLocaleString('ko-KR')}회다.`,{topicIds:['01','02','07'],basis:'supporting',sourceTitle:'네이버 검색광고'}));

  const competitors=Array.isArray(input?.competitors)?input.competitors:[];
  for(const [index,row] of competitors.slice(0,3).entries())facts.push(fact(`competitor-${row?.id||index}`,'competitor','비교 정치인',`${name}의 비교 기준 정치인은 ${clean(row?.name)||'동일 직군 정치인'}이며 ${[row?.party,row?.region,row?.office,row?.terms].map(clean).filter(Boolean).join(' · ')} 구조를 가진다.`,{topicIds:['05','08','10'],basis:'structural',sourceTitle:'정치인 공식 프로필'}));

  return facts.filter(row=>row.statement);
}

export function factsForTopic(facts,topicId){
  return (Array.isArray(facts)?facts:[]).filter(row=>Array.isArray(row?.topicIds)&&row.topicIds.includes(topicId));
}
