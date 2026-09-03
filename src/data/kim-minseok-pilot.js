// Public-only historical pilot content retained for compatibility tests.
// Member and administrator intelligence is never shipped in the browser source tree.
export const KIM_MINSEOK_PILOT=Object.freeze({
  id:'assembly-001',
  snapshot:'2026-09-02',
  mode:'김민석 공개 파일럿',
  rank:{overall:1,category:1,temporary:true},
  currentRole:'더불어민주당 대표 · 제22대 국회의원',
  signal:{index:84,label:'당대표 전환·다채널 확산형',summary:'당대표 선출 이후 뉴스와 공개 관심이 함께 상승한 흐름입니다.'},
  media:[
    {label:'언론 노출',score:91,desc:'당대표 선출을 중심으로 전국 단위 보도가 확산되었습니다.'},
    {label:'자발 확산',score:75,desc:'당원 선택과 후속 정치 논의가 재확산을 만들었습니다.'},
    {label:'콘텐츠 반응',score:81,desc:'인물 서사와 당권 이슈가 공개 반응을 견인했습니다.'}
  ],
  trend:[62,66,71,76,82,84],
  trendSummary:'당대표 경선 진입부터 선출·취임까지의 공개 관심 흐름',
  issues:[
    {title:'민생·실용·확장',impact:88},
    {title:'당정 전면 협력',impact:82},
    {title:'2028 총선 리더십',impact:77}
  ],
  activities:['더불어민주당 대표로 당 운영과 2028년 총선 준비 책임','이재명 정부 초대 국무총리 역임','제22대 국회 국방위원회 소속 의정활동'],
  achievements:['2026년 더불어민주당 대표 선출','제22대 총선 서울 영등포구을 당선','15·16·21·22대 국회의원 4선'],
  policies:['민생·실용·확장 노선','당정 전면 협력과 국정 성과 지원','당내 통합 및 2028 총선 준비 체계'],
  news:[
    {date:'2026-08-27',source:'아시아경제',title:'김민석 “민생·실용·확장 노선 선택…치열하게 일하는 당”',url:'https://v.daum.net/v/20260827161129417'},
    {date:'2026-08-18',source:'서울신문',title:'민주당 새 대표에 김민석…“정부 성공 위해 뛰겠다”',url:'https://www.seoul.co.kr/news/politics/2026/08/18/20260818001009'},
    {date:'2026-08-17',source:'연합뉴스',title:'김민석, 총리 이어 여당 대표로…4선 정치인의 재부상',url:'https://www.yna.co.kr/view/AKR20260816023251001'}
  ],
  sources:[
    {type:'공식 선거자료',grade:'DIRECT',title:'제22대 총선 서울 영등포구을 결과',url:'https://www.sisajournal.com/news/articleView.html?idxno=287934'},
    {type:'공식 경선결과',grade:'DIRECT',title:'2026 더불어민주당 대표 선거',url:'https://www.seoul.co.kr/news/politics/2026/08/18/20260818001009'},
    {type:'Google 뉴스 기반',grade:'DIRECT',title:'최근 정치·언론 보도',url:'https://news.google.com/'}
  ],
  related:[
    {id:'assembly-002',name:'정청래',meta:'동일 정당'},
    {id:'assembly-004',name:'송영길',meta:'동일 정당'},
    {id:'assembly-007',name:'박주민',meta:'더불어민주당 · 서울'},
    {id:'assembly-022',name:'우원식',meta:'더불어민주당 · 서울'}
  ]
});

export function pilotForPolitician(id){return id===KIM_MINSEOK_PILOT.id?KIM_MINSEOK_PILOT:null;}
