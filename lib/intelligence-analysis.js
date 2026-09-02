const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const avg=values=>values.length?values.reduce((sum,value)=>sum+Number(value||0),0)/values.length:0;
const unique=values=>[...new Set(values.filter(Boolean))];
const safeText=value=>String(value||'').trim();
const AGE_LABELS=['20대','30대','40대','50대','60대 이상'];

function termsCount(value){const match=safeText(value).match(/(\d+)선/);if(match)return Number(match[1]);return /초선/.test(safeText(value))?1:/재선/.test(safeText(value))?2:1;}
function boundedVolume(value,range){if(Number.isFinite(Number(value)))return Math.max(0,Number(value));if(range&&Number.isFinite(range.max))return (Number(range.min||0)+Number(range.max))/2;return 0;}
function searchMetrics(searchAds){
  const volume=searchAds?.volume||{},pc=boundedVolume(volume.pc,volume.pcRange),mobile=boundedVolume(volume.mobile,volume.mobileRange),total=pc+mobile;
  const score=total?clamp(18+Math.log10(total+1)*18):0;
  return {pc,mobile,total,score,mobileShare:total?mobile/total:.5,pcShare:total?pc/total:.5};
}
function partyProfile(party){
  const value=safeText(party);
  if(/민주|진보|정의|조국/.test(value))return {young:5,older:-2,male:-1,female:3,label:'진보·개혁 지지층 맥락'};
  if(/국민의힘|보수|자유통일/.test(value))return {young:-3,older:5,male:3,female:-1,label:'보수 지지층 맥락'};
  if(/개혁신당/.test(value))return {young:4,older:-2,male:3,female:-1,label:'개혁·제3지대 지지층 맥락'};
  return {young:0,older:0,male:0,female:0,label:'무소속·기타 정당 맥락'};
}
function newsMetrics(news){
  const items=Array.isArray(news?.items)?news.items:[],sources=unique(items.map(item=>safeText(item.source)));
  return {items,sources,count:items.length,score:clamp(20+items.length*5+sources.length*6)};
}
const TOPICS=[
  {title:'민생·경제',words:/민생|경제|물가|일자리|주거|산업|예산|소상공인/},
  {title:'정책·입법',words:/정책|법안|입법|국회|위원회|개혁/},
  {title:'리더십·정당',words:/대표|당내|지도부|경선|통합|갈등|협력/},
  {title:'지역·현장',words:/지역|현장|방문|주민|시장|군수|도지사/},
  {title:'외교·안보',words:/외교|안보|국방|북한|동맹/},
];
function deriveIssues(items,base){
  const titles=items.map(item=>safeText(item.title));
  const scored=TOPICS.map((topic,index)=>{const hits=titles.filter(title=>topic.words.test(title)).length;return {kind:hits?'관측 이슈':'기반 이슈',title:topic.title,hits,impact:clamp(base+hits*7-index*2),persistence:clamp(base-4+hits*5+index)};});
  return scored.sort((a,b)=>b.hits-a.hits||b.impact-a.impact||a.title.localeCompare(b.title,'ko')).slice(0,4);
}
function pickPeers(person,context,score){
  const rows=(Array.isArray(context?.peers)?context.peers:[]).filter(item=>item?.id&&item.id!==person.id);
  return rows.sort((a,b)=>Number(b.region===person.region)-Number(a.region===person.region)||Number(b.party===person.party)-Number(a.party===person.party)||String(a.id).localeCompare(String(b.id))).slice(0,3).map((item,index)=>({name:item.name,score:clamp(score-5-index*7+(item.region===person.region?4:0)),note:[item.party,item.region,item.type===person.type?'동일 분야':'연관 분야'].filter(Boolean).join(' · '),id:item.id}));
}

export function buildIntelligenceDraft(person,raw,sharedContext={},algorithmVersion='JCS_INTELLIGENCE_V1'){
  const search=searchMetrics(raw?.searchAds),news=newsMetrics(raw?.news),terms=termsCount(person?.terms),profileScore=clamp(42+terms*7+(person?.office?5:0));
  const nowIndex=clamp(search.score*.5+news.score*.5),party=partyProfile(person?.party),gallupSupport=Number(sharedContext?.gallup?.partySupport?.[person?.party]),gallupTilt=Number.isFinite(gallupSupport)?(gallupSupport-25)*.18:0,base=clamp(nowIndex*.55+profileScore*.45+gallupTilt),mediaReach=clamp(news.score+news.sources.length*2);
  const core=[
    {label:'관심도',score:nowIndex,desc:`검색 신호 ${search.score} · 뉴스 신호 ${news.score}`},
    {label:'확산력',score:clamp(news.score*.7+news.sources.length*5),desc:`${news.sources.length}개 매체의 ${news.count}건 보도 확산`},
    {label:'활동성',score:clamp(profileScore*.45+news.score*.55),desc:`${person.roleLabel||'정치인'} 공식 역할과 최근 보도 활동`},
    {label:'미디어성',score:mediaReach,desc:`Google 뉴스 매체 다양성과 보도량`},
    {label:'지속성',score:clamp(profileScore*.65+news.score*.35),desc:`${terms}선 경력과 현재 역할의 지속 관측 가능성`},
    {label:'변동성',score:clamp(35+Math.abs(search.score-news.score)*.7+(raw?.sourceErrors?.length||0)*6),desc:'검색과 뉴스 신호 차이에서 계산한 변화 민감도'}
  ];
  const cohortSource=Array.isArray(sharedContext?.ageSex)?sharedContext.ageSex:AGE_LABELS.map(age=>({age,maleShare:50,femaleShare:50}));
  const ageChannel=[12,8,2,-4,-10],cohortBase=clamp(nowIndex*.65+profileScore*.35);
  const channelTilt=(search.mobileShare-.5)*20;
  const cohorts=AGE_LABELS.map((age,index)=>{
    const official=cohortSource.find(row=>row.age===age)||cohortSource[index]||{maleShare:50,femaleShare:50};
    const ageSignal=ageChannel[index]*channelTilt/10,sexDelta=(Number(official.femaleShare||50)-Number(official.maleShare||50))*.35;
    return {age,male:clamp(cohortBase+ageSignal-sexDelta),female:clamp(cohortBase+ageSignal+sexDelta),note:'검색 기기 비중·공식 연령×성별 인구 맥락의 JCS 관심 추정지수'};
  });
  const cohortAverage=avg(cohorts.flatMap(row=>[row.male,row.female])),audiencePosition=clamp(cohortAverage*.6+search.score*.4);
  const audienceBars=[
    {label:'관심 집중도',score:clamp(Math.max(search.score,news.score)),desc:'검색·뉴스 중 강한 관심 채널'},
    {label:'확장 가능성',score:clamp(audiencePosition),desc:'기기·연령·성별 관심 구조의 확장 폭'},
    {label:'반응 밀도',score:clamp(news.score*.6+search.score*.4),desc:'검색량과 기사 밀도의 결합'},
    {label:'관심 안정성',score:clamp(core[4].score-core[5].score*.2),desc:'역할 지속성과 신호 변동성 결합'}
  ];
  const activity=[
    {label:'활동 강도',score:core[2].score,left:'낮음',right:'높음',desc:`최근 기사 ${news.count}건과 공식 역할`},
    {label:'현장성',score:clamp(45+news.items.filter(item=>/현장|방문|지역|주민/.test(item.title)).length*12),left:'온라인',right:'현장',desc:'현장·지역 관련 보도 비중'},
    {label:'정책 지향',score:clamp(48+news.items.filter(item=>/정책|법안|민생|경제|예산/.test(item.title)).length*10),left:'메시지',right:'정책',desc:'정책·입법·민생 보도 비중'}
  ];
  const media=[
    {label:'언론 노출',score:mediaReach,left:'낮음',right:'높음',desc:`Google 뉴스 ${news.count}건`},
    {label:'자발 확산',score:clamp(news.sources.length*12+search.score*.35),left:'수동',right:'자발',desc:`고유 매체 ${news.sources.length}개와 검색 반응`},
    {label:'콘텐츠 반응',score:clamp(news.score*.5+search.score*.5),left:'낮음',right:'높음',desc:'뉴스와 검색 반응의 결합'}
  ];
  const transition=[
    {label:'유입력',score:clamp(search.score*.6+news.score*.4),desc:'검색과 보도의 신규 관심 유입'},
    {label:'확장력',score:audienceBars[1].score,desc:'연령×성별 관심 구조의 외연'},
    {label:'전환력',score:clamp(base*.65+activity[2].score*.35),desc:'관심을 정책·지지 신호로 연결하는 힘'},
    {label:'유지력',score:audienceBars[3].score,desc:'공식 역할과 관심 안정성'}
  ];
  const issues=deriveIssues(news.items,base),topIssue=issues[0]?.title||'정치 활동',dominantDevice=search.mobile>=search.pc?'모바일':'PC';
  const diagnosisTitle=`${topIssue} 관심을 ${dominantDevice} 확산과 정책 신뢰로 전환할 구간`;
  const diagnosisBody=`${person.name}은 현재 검색 ${search.total.toLocaleString('ko-KR')}회와 Google 뉴스 ${news.count}건에서 관측된다. ${dominantDevice} 검색 비중과 ${news.sources.length}개 매체 확산을 실제 지지와 지역 성과로 연결하는 메시지 순서가 핵심이다.`;
  const support={core:clamp(base+terms*2),expand:audienceBars[1].score,floating:clamp(100-Math.abs(audiencePosition-50)),risk:core[5].score,loyalty:clamp(profileScore+terms*2),action:activity[0].score,stability:audienceBars[3].score,scalability:audienceBars[1].score,waterfall:[['관심 유입',transition[0].score],['지지 전환',transition[2].score],['지지 유지',transition[3].score]]};
  const resilience={index:clamp((support.stability+profileScore+transition[3].score)/3),resistance:clamp(profileScore-core[5].score*.15),speed:clamp(activity[0].score),stability:support.stability,curve:[core[0].score,clamp(core[0].score-core[5].score*.25),transition[0].score,transition[1].score,transition[2].score,transition[3].score]};
  const competitors=pickPeers(person,sharedContext,base),related=competitors.map(item=>({id:item.id,name:item.name,meta:item.note}));
  const risks=[
    `${dominantDevice} 중심 관심이 반대 기기 채널로 충분히 확장되지 않을 가능성`,
    `뉴스 신호 ${news.score}와 검색 신호 ${search.score}의 격차가 메시지 전환 손실로 이어질 가능성`,
    `${topIssue} 보도가 실제 지역·정책 성과 증거보다 먼저 소비될 가능성`
  ];
  const opportunities=[
    `${dominantDevice} 검색 ${Math.round(Math.max(search.mobile,search.pc)).toLocaleString('ko-KR')}회를 핵심 콘텐츠 유입 경로로 전환`,
    `${news.sources.length}개 매체에 형성된 ${topIssue} 서사를 반복 가능한 정책 메시지로 통합`,
    `${terms}선 공식 경력과 ${person.jurisdiction||person.region||'지역'} 기반을 실행 성과 서사로 연결`
  ];
  const strategies=[
    {title:'핵심 메시지 설계',body:`${topIssue}를 추상어가 아니라 비용·기한·수혜대상으로 설명한다.`},
    {title:'검색 수요 대응',body:`${dominantDevice} 우세 검색 흐름에 맞춰 인물명과 대표 정책을 한 문장으로 결합한다.`},
    {title:'뉴스 서사 통합',body:`${news.sources.length}개 매체에 흩어진 메시지를 하나의 성과 프레임으로 통일한다.`},
    {title:'세대별 커뮤니케이션',body:'연령×성별 관심 지수가 높은 구간에는 결집 메시지, 낮은 구간에는 생활 문제 해결 증거를 배치한다.'},
    {title:'지역구 전환',body:`${person.jurisdiction||person.region||'관할 지역'}에서 확인 가능한 일정·결과·후속조치를 묶어 공개한다.`},
    {title:'경쟁 구도 대응',body:`${competitors[0]?.name||'동일 분야 경쟁자'}와의 차이를 인물 평가가 아니라 실행 순서와 결과로 만든다.`},
    {title:'위기 대응 시나리오',body:'24시간 사실확인, 48시간 조치 공개, 7일 결과 보고의 세 단계 규칙을 적용한다.'},
    {title:'30일 실행 우선순위',body:`1주 검색 메시지 정리, 2주 ${topIssue} 성과 증거, 3주 세대별 확장, 4주 재측정을 실행한다.`}
  ];
  const sources=[
    {type:'네이버 검색광고',grade:raw?.searchAds?'DIRECT':'ERROR',title:'PC·모바일 월간 검색량',detail:raw?.searchAds?`PC ${search.pc.toLocaleString('ko-KR')} · 모바일 ${search.mobile.toLocaleString('ko-KR')}`:'수집 오류 기록',url:'https://searchad.naver.com/'},
    {type:'Google 뉴스',grade:raw?.news?'DIRECT':'ERROR',title:`최근 보도 ${news.count}건`,detail:`고유 매체 ${news.sources.length}개`,url:`https://news.google.com/search?q=${encodeURIComponent(person.name)}&hl=ko&gl=KR&ceid=KR:ko`},
    {type:'공식 프로필',grade:'DIRECT',title:`${person.roleLabel||'정치인'} 공식 프로필`,detail:[person.party,person.jurisdiction,person.terms].filter(Boolean).join(' · '),url:person.type==='assembly'?'https://www.assembly.go.kr/':'https://www.laiis.go.kr/'},
    {type:'한국갤럽·중앙선거여론조사심의위원회',grade:sharedContext?.gallup?'CONTEXT':'ERROR',title:sharedContext?.gallup?.source?.title||'공개 여론조사 맥락',detail:sharedContext?.gallup?`${person.party||'소속 정당'} 지지도 ${Number.isFinite(gallupSupport)?`${gallupSupport}%`:'공개 보고서 맥락 적용'}`:'공식 공개자료 수집 오류 기록',url:sharedContext?.gallup?.source?.url||'https://www.nesdc.go.kr/'},
    {type:'선거·인구·연령×성별 공식자료',grade:sharedContext?.ageSex?'CONTEXT':'ERROR',title:sharedContext?.source?.title||'행정안전부 연령별 인구 통계',detail:sharedContext?.ageSex?'연령×성별 관심 구조의 공식 인구 맥락':'공식 인구 원자료 수집 오류 기록',url:sharedContext?.source?.url||'https://jumin.mois.go.kr/ageStatMonth.do'}
  ];
  const newsRows=news.items.map(item=>({date:safeText(item.publishedAt).slice(0,10),source:item.source,title:item.title,url:item.url}));
  return {
    id:person.id,snapshot:raw?.snapshotId||safeText(raw?.collectedAt).slice(0,10),algorithmVersion,interpretationLabel:'JCS 해석',mode:'전체 정치인 운영 분석',rank:{overall:null,category:null,temporary:false},currentRole:person.office||person.roleLabel,
    signal:{index:nowIndex,label:`${topIssue}·${dominantDevice} 확산형`,summary:diagnosisBody},core,
    audience:{position:audiencePosition,label:audiencePosition>=60?'대중 확장 우세':'핵심 관심 집중',summary:`${dominantDevice} 검색과 ${party.label}을 결합한 관심 구조`,bars:audienceBars},
    activity,media,transition,diagnosis:{title:diagnosisTitle,body:diagnosisBody},
    deep:[{title:'관심 전환 구조',score:transition[2].score,left:'관심',right:'지지',desc:'검색·뉴스 관심의 지지 전환력'},{title:'시간 흐름',score:transition[3].score,left:'단기',right:'지속',desc:'공식 역할과 보도 지속성'},{title:'이슈 구조',score:issues[0].impact,left:'단일',right:'다변화',desc:`${issues.length}개 주요 이슈 분류`}],
    trend:[core[0].score,transition[0].score,transition[1].score,transition[2].score,transition[3].score],trendSummary:'현재 스냅샷의 검색·뉴스·공식 프로필 결합 흐름',
    raw:{searchAds:raw?.searchAds||null,news:raw?.news||null,officialProfile:raw?.officialProfile||person,officialContext:raw?.officialContext||null,sourceErrors:raw?.sourceErrors||[]},
    cohorts,support,resilience,mediaScores:{reach:mediaReach,social:clamp(search.score),organic:media[1].score,persistence:core[4].score},issues,risks,opportunities,competitors,strategies,
    conclusion:`${person.name}의 현재 자산은 ${topIssue} 관심과 ${dominantDevice} 검색 유입이다. 이를 ${person.jurisdiction||person.region||'관할 지역'}에서 확인 가능한 성과와 후속 결과로 반복 증명하는 것이 최우선 전략이다.`,
    activities:[`${person.office||person.roleLabel} 공식 역할 수행`,`${person.committee||person.jurisdiction||'관할 분야'} 활동`,`${news.count}건의 최근 공개 보도 관측`],
    achievements:[`${person.terms||'공식 임기'} 정치 경력`,`${person.electionLabel||person.roleLabel} 공식 기록`,`${news.sources.length}개 매체 최근 보도 확산`],
    policies:issues.slice(0,3).map(issue=>issue.title),news:newsRows,sources,related
  };
}
