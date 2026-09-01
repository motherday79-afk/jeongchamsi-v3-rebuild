// JCS single-person pilot. Raw facts and JCS interpretations are kept separate.
// No legacy score, modeled fallback, or unrelated API value is used here.
export const KIM_MINSEOK_PILOT=Object.freeze({
  id:'assembly-001',
  snapshot:'2026-09-02',
  mode:'김민석 단일 파일럿',
  rank:{overall:1,category:1,temporary:true},
  currentRole:'더불어민주당 대표 · 제22대 국회의원',
  signal:{index:84,label:'당대표 전환·다채널 확산형',summary:'당대표 선출로 관심 유입이 커졌고, 당원 선택·국민 여론·지역구 선거 결과가 서로 다른 강점과 과제를 동시에 보여준다. JCS는 현재 국면을 높은 주목도와 확장 기회가 공존하는 전환기로 해석한다.'},
  core:[
    {label:'관심도',score:88,desc:'당대표 선출과 취임 행보 중심의 최근 보도량'},
    {label:'확산력',score:86,desc:'당권·당정·민생 의제가 복수 매체로 전파'},
    {label:'활동성',score:84,desc:'전당대회 이후 지도부·현장 일정 연속 노출'},
    {label:'미디어성',score:89,desc:'인물·당권·국정 프레임이 함께 보도'},
    {label:'지속성',score:78,desc:'2028 총선까지 당대표 역할로 관심 지속 가능'},
    {label:'변동성',score:67,desc:'당내 통합과 민생 성과에 따라 평가 변동 가능'}
  ],
  audience:{position:71,label:'대중 확장 우세',summary:'민주당 지지층 결집 기반이 크지만, 전당대회 국민 여론조사에서는 경쟁 후보와 초접전이었다. 핵심층 유지와 일반 유권자 확장을 분리해 관리해야 한다.',bars:[
    {label:'관심 집중도',score:76,desc:'당원·민주당 지지층 중심 결집'},
    {label:'확장 가능성',score:74,desc:'민생·실용 메시지의 중도 확장 여지'},
    {label:'반응 밀도',score:82,desc:'당대표 선출 직후 뉴스 반응 집중'},
    {label:'관심 안정성',score:72,desc:'대표 역할은 지속되나 성과 평가에 민감'}
  ]},
  activity:[
    {label:'활동 강도',score:86,left:'낮음',right:'높음',desc:'취임·워크숍·당정 협력 일정이 연속 관측'},
    {label:'현장성',score:72,left:'온라인',right:'현장',desc:'수해 현장·현충원·워크숍 등 현장 행보 포함'},
    {label:'정책 지향',score:77,left:'메시지',right:'정책',desc:'민생·실용·확장 노선을 정책 프레임으로 제시'}
  ],
  media:[
    {label:'언론 노출',score:91,left:'낮음',right:'높음',desc:'당대표 선출을 중심으로 전국 단위 보도 확산'},
    {label:'자발 확산',score:75,left:'수동',right:'자발',desc:'당원 선택과 후속 정치 논쟁이 재확산을 생성'},
    {label:'콘텐츠 반응',score:81,left:'낮음',right:'높음',desc:'인물 서사와 당권 이슈가 콘텐츠 반응을 견인'}
  ],
  transition:[
    {label:'유입력',score:90,desc:'당대표 선출이 신규 관심 유입'},
    {label:'확장력',score:76,desc:'민생·실용 프레임의 외연 확장'},
    {label:'전환력',score:69,desc:'주목을 개인 지지로 바꾸는 과제'},
    {label:'유지력',score:79,desc:'당대표 역할과 2028 총선 책임'}
  ],
  diagnosis:{title:'높은 주목을 생활 성과 신뢰로 바꿔야 하는 전환 구간',body:'당원·대의원 선택은 강한 조직 기반을 보여주지만 국민 여론조사와 지역구 초접전 결과는 확장 메시지의 정교함을 요구한다. 당내 통합보다 민생 성과가 먼저 보이도록 순서를 설계하는 것이 핵심이다.'},
  deep:[
    {title:'관심 전환 구조',score:69,left:'관심',right:'지지',desc:'대형 직책 뉴스가 개인 지지로 고정되기 전 단계'},
    {title:'시간 흐름',score:79,left:'단기',right:'지속',desc:'대표 임기와 총선 책임이 장기 관측을 만든다'},
    {title:'이슈 구조',score:73,left:'단일',right:'다변화',desc:'당권에서 민생·당정·통합 이슈로 확장 중'}
  ],
  trend:[62,66,71,76,82,84],
  trendSummary:'당대표 경선 진입부터 선출·취임 행보까지 관심이 단계적으로 상승한 파일럿 스냅샷',
  raw:{
    election:{votes:49651,voteRate:50.18,opponentRate:49.03,margin:1.15,label:'제22대 총선 서울 영등포구을 당선'},
    leadership:{finalRate:54.08,opponentRate:45.92,delegateRate:66.69,publicPollRate:49.30,publicOpponentRate:50.70,label:'2026 더불어민주당 당대표 선출'},
    gallup:{democratic:48,peoplePower:19,unaffiliated:26,moderateDemocratic:48,moderatePeoplePower:12,moderateUnaffiliated:34,label:'한국갤럽 2026년 4월 셋째 주 정당 지지도'},
    searchAds:{status:'EXCLUDED_NO_CREDENTIALS',label:'네이버 검색광고 원본',note:'API 키가 연결되기 전에는 검색량을 산정하거나 대체값을 만들지 않음'}
  },
  cohorts:[
    {age:'20대',male:44,female:66,note:'정당·정치성향 성별 격차를 반영한 JCS 맥락지수'},
    {age:'30대',male:55,female:69,note:'민생·주거 의제 확장 필요'},
    {age:'40대',male:78,female:80,note:'민주당 핵심 지지 기반'},
    {age:'50대',male:73,female:71,note:'성과·안정 메시지 반응 구간'},
    {age:'60대 이상',male:52,female:55,note:'외연 확장 난도가 높은 구간'}
  ],
  support:{core:81,expand:70,floating:64,risk:43,loyalty:82,action:79,stability:71,scalability:74,waterfall:[['관심 유입',18],['지지 전환',9],['지지 유지',13]]},
  resilience:{index:76,resistance:69,speed:81,stability:74,curve:[82,63,68,72,75,78]},
  mediaScores:{reach:91,social:76,organic:75,persistence:79},
  issues:[
    {kind:'핵심 이슈',title:'민생·실용·확장',impact:88,persistence:84},
    {kind:'상승 이슈',title:'당정 전면 협력',impact:82,persistence:76},
    {kind:'잠재 이슈',title:'2028 총선 리더십',impact:77,persistence:90},
    {kind:'관리 이슈',title:'당내 통합과 계파 균형',impact:80,persistence:72}
  ],
  risks:['국민 여론조사 49.30%로 경쟁 후보 50.70%에 뒤진 확장성 경고','22대 총선 지역구 득표차 1.15%p의 얇은 지역 기반','당정 협력 강조가 독자적 리더십 부재로 해석될 가능성'],
  opportunities:['54.08% 당대표 선출과 대의원 66.69%의 조직 기반','민생·실용·확장 노선을 중도층 언어로 전환할 여지','총리 경험과 당대표 역할을 연결한 실행형 리더십 서사'],
  competitors:[
    {name:'정청래',score:78,note:'당대표 최종 45.92% · 국민 여론조사 50.70%'},
    {name:'송영길',score:61,note:'전당대회 3위 표의 선호 이전이 최종 승부에 영향'},
    {name:'박용찬',score:59,note:'22대 총선 지역구 49.03% · 1.15%p 차'}
  ],
  strategies:[
    {title:'핵심 메시지 설계',body:'“당정 협력”보다 “생활비·주거·일자리에서 확인되는 결과”를 첫 문장으로 고정한다.'},
    {title:'이슈 대응 프레임',body:'당내 갈등 질문에는 인물 대립 대신 결정 일정·책임자·완료 시점을 답한다.'},
    {title:'미디어 확산 전략',body:'대형 정치 일정 1회 뒤에 민생 현장·수치·후속 결과 콘텐츠를 3회 연속 배치한다.'},
    {title:'세대별 커뮤니케이션',body:'20·30대에는 주거·기회, 40·50대에는 실행 성과, 60대 이상에는 안정·국정 연속성을 분리한다.'},
    {title:'지지층 결속 전략',body:'당원 선택의 의미를 승리 서사보다 참여·정책 결정 구조로 환원한다.'},
    {title:'중도층 확장 전략',body:'한국갤럽 중도층 무당층 34%를 핵심 시장으로 보고 이념어 대신 비용·기한·효과로 말한다.'},
    {title:'위기 대응 시나리오',body:'당내 갈등·민생 지표 악화·당정 엇박자 세 상황에 24시간 사실확인, 48시간 조치, 7일 결과 공개 규칙을 둔다.'},
    {title:'실행 우선순위',body:'① 민생 성과 증거 ② 당내 통합 절차 ③ 세대별 메시지 ④ 장기 총선 서사 순으로 집행한다.'}
  ],
  conclusion:'김민석의 현재 자산은 높은 직책 인지도 자체가 아니라 조직 선택을 받은 실행 경험이다. 앞으로의 평가는 당대표 뉴스량보다 국민이 체감할 민생 결과와 당내 통합 절차를 얼마나 반복 증명하느냐에 의해 결정된다.',
  activities:['더불어민주당 대표로 당 운영과 2028년 총선 준비 책임','이재명 정부 초대 국무총리 역임','제22대 국회 국방위원회 소속 의정활동'],
  achievements:['2026년 더불어민주당 대표 선출 54.08%','제22대 총선 서울 영등포구을 49,651표 당선','15·16·21·22대 국회의원 4선'],
  policies:['민생·실용·확장 노선','당정 전면 협력과 국정 성과 지원','당내 통합 및 2028 총선 준비 체계'],
  news:[
    {date:'2026-08-27',source:'아시아경제',title:'김민석 “민생·실용·확장 노선 선택…치열하게 일하는 당”',url:'https://v.daum.net/v/20260827161129417'},
    {date:'2026-08-18',source:'서울신문',title:'민주당 새 대표에 김민석…“정부 성공 위해 뛰겠다”',url:'https://www.seoul.co.kr/news/politics/2026/08/18/20260818001009'},
    {date:'2026-08-17',source:'연합뉴스',title:'김민석, 총리 이어 여당 대표로…4선 정치인의 재부상',url:'https://www.yna.co.kr/view/AKR20260816023251001'},
    {date:'2026-08-17',source:'연합뉴스',title:'민주당 새 대표 김민석…당내 통합과 국정 동력 과제',url:'https://www.yna.co.kr/view/AKR20260817058552001'},
    {date:'2026-08-16',source:'MBC',title:'민주당 당대표 경선 서울·경기 김민석 1위',url:'https://imnews.imbc.com/news/2026/politics/article/6845112_36911.html'},
    {date:'2026-08-11',source:'리얼미터',title:'민주 당대표 조사 김민석 46.8%·정청래 35.2%',url:'https://www.realmeter.net/8-17-%EC%A0%84%EB%8B%B9%EB%8C%80%ED%9A%8C-%EC%B0%A8%EA%B8%B0-%EB%AF%BC%EC%A3%BC-%EB%8B%B9%EB%8C%80%ED%91%9C-%EC%A0%84%EA%B5%AD-%EA%B9%80%EB%AF%BC%EC%84%9D-46-8-%EC%A0%95%EC%B2%AD%EB%9E%98-35-2/'}
  ],
  sources:[
    {type:'공식 선거자료',grade:'DIRECT',title:'제22대 총선 서울 영등포구을 결과',detail:'49,651표 · 50.18% · 1.15%p 차',url:'https://www.sisajournal.com/news/articleView.html?idxno=287934'},
    {type:'공식 경선결과',grade:'DIRECT',title:'2026 더불어민주당 대표 선거',detail:'최종 54.08% · 대의원 66.69% · 국민여론 49.30%',url:'https://www.seoul.co.kr/news/politics/2026/08/18/20260818001009'},
    {type:'한국갤럽',grade:'CONTEXT',title:'2026년 4월 셋째 주 정당 지지도',detail:'민주당 48% · 중도층 민주당 48% · 중도 무당층 34%',url:'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1635'},
    {type:'Google 뉴스 기반',grade:'DIRECT',title:'최근 정치·언론 보도 6건',detail:'당대표 선출·민생 노선·당정 협력 주제 분류',url:'https://news.google.com/search?q=%EA%B9%80%EB%AF%BC%EC%84%9D&hl=ko&gl=KR&ceid=KR%3Ako'},
    {type:'주민등록 인구통계',grade:'CONTEXT',title:'행정안전부 연령별 인구 통계',detail:'향후 지역구 코호트 규모 산정의 공식 기준',url:'https://jumin.mois.go.kr/ageStatMonth.do'},
    {type:'네이버 검색광고',grade:'EXCLUDED',title:'검색량 원본 이번 산정 제외',detail:'API 키 준비 전 수치 생성·대체·fallback 금지',url:'https://searchad.naver.com/'}
  ],
  related:[
    {id:'assembly-002',name:'정청래',meta:'당대표 경선 경쟁'},
    {id:'assembly-004',name:'송영길',meta:'당대표 경선 경쟁'},
    {id:'assembly-007',name:'박주민',meta:'더불어민주당 · 서울'},
    {id:'assembly-022',name:'우원식',meta:'더불어민주당 · 서울'}
  ]
});

export function pilotForPolitician(id){return id===KIM_MINSEOK_PILOT.id?KIM_MINSEOK_PILOT:null;}
