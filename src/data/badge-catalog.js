export const BADGE_CATALOG = Object.freeze([
  { key:"noon-signal", tier:"BRONZE", name:"도시락알리미", mission:"정오 시간대에 정참시를 찾아 활동 기록을 남기면 획득합니다.", kind:"시간 미션" },
  { key:"midnight", tier:"BRONZE", name:"신데렐라", mission:"자정 시간대에 정참시를 찾아 활동 기록을 남기면 획득합니다.", kind:"시간 미션" },
  { key:"weekman", tier:"SILVER", name:"위크맨", mission:"7일 연속으로 정참시 활동 기록을 이어가면 획득합니다.", kind:"연속 출석" },
  { key:"superhero", tier:"SILVER", name:"슈퍼히어로", mission:"30일 연속으로 정참시 활동 기록을 이어가면 획득합니다.", kind:"월간 출석" },
  { key:"first-participation", tier:"BRONZE", name:"첫 참여", mission:"설문·댓글·글쓰기 등 첫 참여를 완료하면 획득합니다.", kind:"참여" },
  { key:"citizen-choice", tier:"BRONZE", name:"시민 선택", mission:"시민들의 선택 설문에 처음 참여하면 획득합니다.", kind:"투표" },
  { key:"first-penguin", tier:"GOLD", name:"퍼스트팽귄", mission:"초기 COLUMN 작가·선도 참여자에게 운영진이 부여합니다.", kind:"역할형" },
  { key:"influencer", tier:"GOLD", name:"인플루언서", mission:"플랫폼 안팎의 영향력과 활동을 확인해 운영진이 부여합니다.", kind:"역할형" },
  { key:"policy-proposer", tier:"GOLD", name:"정책 제안자", mission:"IT’S ME에서 정책·공약 제안을 작성하면 획득합니다.", kind:"IT’S ME" },
  { key:"opinion-leader", tier:"GOLD", name:"의견 리더", mission:"정뮤니티와 댓글에서 꾸준한 토론 기여가 확인되면 획득합니다.", kind:"COMMUNITY" },
  { key:"top-community", tier:"PLATINUM", name:"TOP 1% · 정뮤니티", mission:"시즌별 정뮤니티 활동 상위 1%에게 운영진이 부여합니다.", kind:"시즌" },
  { key:"top-itsme", tier:"PLATINUM", name:"TOP 1% · IT’S ME", mission:"시즌별 IT’S ME 활동 상위 1%에게 운영진이 부여합니다.", kind:"시즌" },
  { key:"jungchamsi-partner", tier:"PLATINUM", name:"정참시 PARTNER", mission:"정참시 공식 파트너스 승인 회원에게 부여합니다.", kind:"공식 파트너" },

  { key:"first-step", tier:"BRONZE", name:"퍼스트 스텝", mission:"정참시에서 첫 번째 능동적 활동을 완료하면 획득합니다.", kind:"시작", series:"EXPANSION_2026", icon:"steps" },
  { key:"first-voice", tier:"BRONZE", name:"첫 목소리", mission:"처음으로 댓글이나 의견을 남겨 자신의 목소리를 표현하면 획득합니다.", kind:"표현", series:"EXPANSION_2026", icon:"voice" },
  { key:"participation-sprout", tier:"BRONZE", name:"참여 새싹", mission:"설문·평가·세대별 투표 등 참여형 활동을 3회 이상 완료하면 획득합니다.", kind:"참여", series:"EXPANSION_2026", icon:"sprout" },
  { key:"connection-start", tier:"BRONZE", name:"연결 시작점", mission:"여러 글에 반응하거나 대화를 이어가며 첫 연결 흐름을 만들면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"link" },
  { key:"attention-start", tier:"BRONZE", name:"주목 개시", mission:"내가 만든 콘텐츠가 처음으로 다른 이용자의 반응이나 조회를 얻으면 획득합니다.", kind:"주목", series:"EXPANSION_2026", icon:"spark" },

  { key:"steady-walker", tier:"SILVER", name:"꾸준한 발걸음", mission:"서로 다른 7일 이상 정참시에서 활동 기록을 남기면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"footsteps" },
  { key:"diligent-participant", tier:"SILVER", name:"성실 참여자", mission:"글·댓글·투표·좋아요 등 누적 참여가 20회 이상 쌓이면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"check" },
  { key:"field-responder", tier:"SILVER", name:"현장 반응자", mission:"설문·평가·세대별 투표 등 직접 선택 활동을 5회 이상 완료하면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"pulse" },
  { key:"debate-participant", tier:"SILVER", name:"토론 참여자", mission:"댓글과 의견을 10회 이상 남기며 토론에 지속적으로 참여하면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"debate" },
  { key:"execution-maker", tier:"SILVER", name:"실행 메이커", mission:"직접 작성한 콘텐츠와 참여 활동을 함께 쌓아 행동으로 기여하면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"bolt" },

  { key:"growth-signal", tier:"SILVER", name:"성장 신호", mission:"내 콘텐츠에 누적 반응이 10회 이상 모이며 성장 흐름이 시작되면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"growth" },
  { key:"rising-current", tier:"SILVER", name:"상승 기류", mission:"내 콘텐츠 누적 조회가 300회를 넘어 주목 흐름이 커지면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"rise" },
  { key:"potential-spotted", tier:"SILVER", name:"잠재력 포착", mission:"반응이나 조회가 눈에 띄는 콘텐츠를 3개 이상 만들면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"diamond" },
  { key:"rising-prospect", tier:"SILVER", name:"주목 유망주", mission:"서로 다른 이용자 5명 이상이 내 콘텐츠에 반응하면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"star" },
  { key:"growth-acceleration", tier:"SILVER", name:"성장 가속", mission:"반응과 조회가 함께 누적되며 성장 속도가 한 단계 높아지면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"rocket" },

  { key:"communication-connector", tier:"SILVER", name:"소통 연결자", mission:"서로 다른 이용자 8명 이상과 콘텐츠 반응을 통해 연결되면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"network" },
  { key:"empathy-maker", tier:"SILVER", name:"공감 메이커", mission:"내 콘텐츠에 누적 공감과 반응이 25회 이상 모이면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"heart" },
  { key:"conversation-catalyst", tier:"SILVER", name:"대화 촉진자", mission:"내가 만든 글에서 다른 이용자의 댓글 반응이 20회 이상 이어지면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"chat" },
  { key:"community-bridge", tier:"SILVER", name:"커뮤니티 브릿지", mission:"여러 토론에 참여하고 정뮤니티 글도 작성해 연결의 폭을 넓히면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"bridge" },
  { key:"participation-inducer", tier:"SILVER", name:"참여 유도자", mission:"내 콘텐츠에서 다른 이용자의 후속 참여가 30회 이상 발생하면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"magnet" },

  { key:"stable-contributor", tier:"SILVER", name:"안정 기여자", mission:"14일 이상 꾸준히 활동하며 글과 댓글 기여를 함께 쌓으면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"shield" },
  { key:"honest-voice", tier:"SILVER", name:"정직한 목소리", mission:"20회 이상의 의견 활동과 직접 작성 콘텐츠를 함께 꾸준히 남기면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"truth" },
  { key:"quality-participant", tier:"SILVER", name:"품격 참여자", mission:"여러 콘텐츠를 작성하고 반복적으로 긍정적 반응을 얻으면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"laurel" },
  { key:"trust-builder", tier:"SILVER", name:"신뢰 축적자", mission:"21일 이상 활동하며 다양한 이용자와 안정적인 반응 관계를 쌓으면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"trust" },
  { key:"faithful-contributor", tier:"SILVER", name:"성실 기여자", mission:"30일 이상의 활동 기록 또는 80회 이상의 누적 참여를 달성하면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"anchor" },

  { key:"issue-maker", tier:"GOLD", name:"이슈 메이커", mission:"강한 반응이나 조회를 만든 콘텐츠를 5개 이상 기록하면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"flame" },
  { key:"influence-leader", tier:"GOLD", name:"영향력 리더", mission:"높은 누적 반응과 폭넓은 이용자 반응을 동시에 만들어내면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"crown" },
  { key:"participation-driver", tier:"GOLD", name:"참여 견인자", mission:"내 콘텐츠에서 다른 이용자의 후속 참여를 50회 이상 이끌어내면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"megaphone" },
  { key:"public-discussion-expander", tier:"GOLD", name:"공론 확장자", mission:"IT’S ME 제안과 후속 토론을 함께 성장시켜 공론의 범위를 넓히면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"forum" },
  { key:"debate-axis", tier:"GOLD", name:"토론 중심축", mission:"100회 이상의 의견 활동과 20개 이상의 서로 다른 토론 참여를 달성하면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"compass" },
  { key:"reaction-catalyst", tier:"GOLD", name:"반응 촉진자", mission:"내 콘텐츠에 누적 반응이 150회 이상 모이면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"radar" },
  { key:"community-hub", tier:"GOLD", name:"커뮤니티 허브", mission:"30명 이상의 이용자와 연결되고 50회 이상의 의견 활동을 이어가면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"hub" },
  { key:"attention-driver", tier:"GOLD", name:"주목 견인자", mission:"내 콘텐츠 누적 조회가 5,000회를 넘어 지속적인 주목을 만들면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"eye" },
  { key:"trust-leader", tier:"GOLD", name:"신뢰 리더", mission:"60일 이상의 꾸준한 활동과 높은 누적 반응을 함께 달성하면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"medal" },
  { key:"content-driver", tier:"GOLD", name:"콘텐츠 드라이버", mission:"40개 이상의 콘텐츠와 4,000회 이상의 누적 조회를 달성하면 획득합니다.", kind:"콘텐츠", series:"EXPANSION_2026", icon:"pen" },

  { key:"signature-influencer", tier:"PLATINUM", name:"시그니처 인플루언서", mission:"매우 높은 반응·조회·이용자 확산을 동시에 달성한 상징적 멤버에게 주어집니다.", kind:"상징", series:"EXPANSION_2026", icon:"signature" },
  { key:"agenda-leader", tier:"PLATINUM", name:"아젠다 리더", mission:"IT’S ME 제안을 지속적으로 만들고 강한 후속 토론을 이끌어낸 멤버에게 주어집니다.", kind:"의제", series:"EXPANSION_2026", icon:"agenda" },
  { key:"public-icon", tier:"PLATINUM", name:"퍼블릭 아이콘", mission:"압도적인 조회와 반응을 함께 기록해 대중적 존재감을 만든 멤버에게 주어집니다.", kind:"상징", series:"EXPANSION_2026", icon:"public" },
  { key:"grand-connector", tier:"PLATINUM", name:"그랜드 커넥터", mission:"매우 넓은 이용자 연결과 토론 참여를 통해 커뮤니티의 큰 흐름을 만든 멤버에게 주어집니다.", kind:"연결", series:"EXPANSION_2026", icon:"connect" },
  { key:"elite-strategist", tier:"PLATINUM", name:"엘리트 스트래티지스트", mission:"장기 활동·콘텐츠·반응·다양한 참여영역을 모두 높은 수준으로 달성하면 획득합니다.", kind:"종합", series:"EXPANSION_2026", icon:"strategy" },

  { key:"operator", tier:"BLACK", name:"운영자", mission:"정참시 운영 권한을 가진 관리자에게 부여되는 운영 역할 배지입니다.", kind:"운영", series:"EXPANSION_2026", icon:"operator" },
  { key:"jeongcham-mayor", tier:"BLACK", name:"정참시장", mission:"운영자 배지를 제외한 모든 배지를 획득해 정참시민을 대표할 자격을 증명하면 획득합니다.", kind:"완주 명예", series:"BLACK_HONORS_2026", icon:"mayor" },
  { key:"michael", tier:"BLACK", name:"미카엘", mission:"나의 추천인 번호로 가입한 유효 정참시민 1,000명을 달성하면 획득합니다.", kind:"확장 명예", series:"BLACK_HONORS_2026", icon:"michael" }
]);

export function badgeByKey(key=''){return BADGE_CATALOG.find(item=>item.key===String(key||''))||null;}
export function badgeKeys(){return BADGE_CATALOG.map(item=>item.key);}

function crestMark(item){
  const source=String(item?.icon||item?.key||'J').replace(/[^a-z0-9가-힣]/gi,'');
  return (source[0]||'J').toUpperCase();
}

export function badgeCrestSvg(key='',extraClass=''){
  const item=badgeByKey(key);
  if(!item)return '';
  const tier=String(item.tier||'BRONZE').toLowerCase();
  const mark=crestMark(item);
  return `<span class="badge-crest badge-crest-${tier} ${extraClass}" data-badge-key="${item.key}" role="img" aria-label="${item.name}"><svg viewBox="0 0 72 82" aria-hidden="true"><path class="badge-crest-shadow" d="M36 2 64 14v31c0 17-12 28-28 35C20 73 8 62 8 45V14Z"/><path class="badge-crest-shell" d="M36 4 62 15v29c0 16-11 26-26 33C21 70 10 60 10 44V15Z"/><path class="badge-crest-ring" d="M36 10 56 19v23c0 12-8 21-20 27-12-6-20-15-20-27V19Z"/><path class="badge-crest-facet badge-crest-facet-a" d="m36 4 10 25-10 11-10-11Z"/><path class="badge-crest-facet badge-crest-facet-b" d="M10 15 26 29l10 11-26 4Z"/><path class="badge-crest-facet badge-crest-facet-c" d="m62 15-16 14-10 11 26 4Z"/><circle class="badge-crest-medallion" cx="36" cy="41" r="14"/><text class="badge-crest-mark" x="36" y="47" text-anchor="middle">${mark}</text><path class="badge-crest-crown" d="m25 20 5 3 6-8 6 8 5-3-2 9H27Z"/></svg></span>`;
}

export const badgeGemSvg=badgeCrestSvg;

