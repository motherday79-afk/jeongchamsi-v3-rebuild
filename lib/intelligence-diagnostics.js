export const POLITICAL_DIAGNOSIS_TOPICS=Object.freeze([
  ['01','정치인 브랜드 진단','positioning-matrix'],['02','세대·성별 지지구조 분석','cohort-diverging'],['03','지역구 민심·메시지 진단','issue-fit-bars'],['04','핵심 지지층 결집도 분석','support-stack'],['05','경쟁 정치인 비교 분석','competitor-heatmap'],['06','이슈·위기 위험도 진단','risk-matrix'],['07','언론·온라인 영향력 분석','narrative-timeline'],['08','선거·캠페인 경쟁력 진단','campaign-matrix'],['09','정책·공약 반응 분석','policy-heatmap'],['10','JCS 종합해석','growth-gap']
]);

const PRESCRIPTION_META=Object.freeze([
  ['01','정치인 브랜드 전략 처방','message-pyramid',['01','07','09']],['02','세대·성별 타깃 전략 처방','target-matrix',['02','04','09']],['03','지역구 메시지 전략 처방','local-playbook',['03','07','09']],['04','지지층 결집·확장 전략 처방','support-flow',['02','04','08']],['05','경쟁자 대응 전략 처방','response-matrix',['05','06','08']],['06','이슈·위기 대응 전략 처방','crisis-timeline',['01','06','07']],['07','언론·온라인 확산 전략 처방','propagation-flow',['01','07','09']],['08','선거·캠페인 데이터 전략 처방','resource-allocation',['03','04','08']],['09','정책·공약 반응 전략 처방','policy-quadrant',['01','03','09']],['10','중장기 정치 성장 전략 처방','growth-timeline',['01','08','10']]
]);

const MONITORING_BY_TOPIC=Object.freeze({
  '01':['대표 이미지 키워드 점유율','정책 이미지 연결도'],
  '02':['세대별 반응 격차','성별 반응 격차'],
  '03':['지역 현안 뉴스 비중','지역 성과 언급 비중'],
  '04':['핵심층 결집지수','유동층 확장지수'],
  '05':['경쟁자 대비 항목별 격차','직접 경쟁 뉴스 점유율'],
  '06':['부정 프레임 비중','위기 재점화 속도'],
  '07':['본인 주도 뉴스 비중','뉴스 대비 검색 전환 흐름'],
  '08':['우세·경합·취약 영역 변화','지역·조직 경쟁력 변화'],
  '09':['정책 긍정·부정 반응','공약 이행 근거 축적량'],
  '10':['대표 의제 축적도','중장기 단계별 달성률']
});

const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const clean=value=>String(value||'').trim();
const list=value=>Array.isArray(value)?value:[];
const unique=value=>[...new Set(value.filter(Boolean))];
const average=values=>values.length?values.reduce((sum,value)=>sum+Number(value||0),0)/values.length:0;
const hasBatchim=value=>{const word=clean(value);const code=word.charCodeAt(word.length-1);return code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28!==0;};
const particle=(value,withBatchim,withoutBatchim)=>`${clean(value)}${hasBatchim(value)?withBatchim:withoutBatchim}`;
const objectWord=value=>particle(value,'을','를');
const subjectWord=value=>particle(value,'이','가');
const topicWord=value=>particle(value,'은','는');
const companionWord=value=>particle(value,'과','와');
const directionWord=value=>{const word=clean(value),code=word.charCodeAt(word.length-1),jong=code>=0xac00&&code<=0xd7a3?(code-0xac00)%28:0;return `${word}${!jong||jong===8?'로':'으로'}`;};
const termsCount=value=>{const match=clean(value).match(/(\d+)선/);if(match)return Number(match[1]);if(/초선/.test(clean(value)))return 1;if(/재선/.test(clean(value)))return 2;return 1;};
const level=score=>score>=75?'강점 구간':score>=60?'우세 구간':score>=45?'경합 구간':'우선 관리 구간';
const direction=(score,offset)=>clamp(score+offset)>score?'상승':clamp(score+offset)<score?'하락':'유지';
const sentences=(...values)=>values.map(clean).filter(Boolean).slice(0,4);

function roleWeight(person){const title=clean(person?.office);return /당대표|장관|광역단체장/.test(title)?14:/최고위원|후보자|위원장/.test(title)?10:/국회의원|시장|군수|구청장/.test(title)?7:4;}
function peerPosition(score){return score>=75?'직군 선도권':score>=60?'직군 상위권':score>=45?'직군 중위권':'직군 추격권';}
function observedTrend(newsNarrative){const value=newsNarrative?.temporalSummary||{};return {direction:clean(value.recentDirection)||'유지',unit:'건',basis:clean(value.basis)||'대표 뉴스 게시일',periods:[{label:'1년',value:Number(value.year)||0},{label:'90일',value:Number(value.days90)||0},{label:'30일',value:Number(value.days30)||0}]};}
function contextFactors(ctx,score){
  const cohortValues=list(ctx.cohorts).flatMap(row=>[Number(row.male)||0,Number(row.female)||0]),career=clamp(38+termsCount(ctx.person?.terms)*8+roleWeight(ctx.person)+(ctx.person?.committee?5:0)),media=clamp(32+ctx.newsCount*5+ctx.sourceDiversity*4),regional=clamp(42+(ctx.person?.jurisdiction?14:0)+(ctx.newsNarrative.topics.find(row=>row.label==='지역·현장')?.share||0)*.35),audience=clamp(average(cohortValues)),policy=clamp(ctx.policyLink||ctx.newsNarrative.topics.filter(row=>['민생·경제','정책·입법','성과·행정'].includes(row.label)).reduce((sum,row)=>sum+row.share,0));
  return {career,media,regional,audience,policy,score:clamp(score)};
}
function factorFor(label,factors){if(/정책|의제|호응/.test(label))return factors.policy;if(/언론|미디어|뉴스|영향/.test(label))return factors.media;if(/지역/.test(label))return factors.regional;if(/조직|결집|일관성|지속|위기 대응|당내/.test(label))return factors.career;if(/확장|전국|대중/.test(label))return factors.audience;return factors.score;}
function bars(labels,score,ctx){const factors=contextFactors(ctx,score);return labels.map(label=>({label,value:factorFor(label,factors)}));}
function evidence(label,value,basis,sourceId){return {label,value:clean(value),basis,sourceId:clean(sourceId)};}

function diagnosisCopy(id,ctx){
  const {person,topTopic,secondTopic,strongAge,weakAge,competitor,roleTitle,region,committee,score,issueLabel,isMay18,negativeShare,newsNarrative}=ctx;
  const controversial=negativeShare>0,isConservative=/국민의힘|개혁신당|보수/.test(clean(person.party)),isProgressive=/더불어민주당|조국혁신당|진보/.test(clean(person.party));
  const cohesionGroup=isConservative?'2030세대':isProgressive?'4050세대':strongAge,riskGroup=isConservative?'4050세대 이상':isProgressive?'2030세대':weakAge;
  const agenda=issueLabel||topTopic,externalLed=Number(newsNarrative?.agencySummary?.external||0)>Number(newsNarrative?.agencySummary?.led||0),firstTerm=termsCount(person.terms)===1,careerLabel=clean(person.terms)||`${termsCount(person.terms)}선`,policyAgenda=/^(정치 활동|논란·위기)$/.test(topTopic)?'대표 정책':topTopic;
  const copy={
    '01':{headline:controversial?`${agenda} 이슈가 현재 대표 이미지를 주도한다.`:`${topTopic} 이미지가 현재 대표 브랜드를 주도한다.`,position:`${topicWord(person.name)} ${roleTitle} 이미지와 ${agenda} 서사가 결합된 ${level(score)}에 있다.`,interpretation:sentences(`현재 ${person.name} 브랜드의 중심은 ${controversial?`${agenda} 논란`:`${topTopic} 성과`}이다.`,controversial?'높은 뉴스 관심을 긍정적인 정치 자산으로 보지 않는다. 정책과 성과보다 논란이 먼저 인식되는 상태다.':`${topTopic} 노출이 정책과 성과를 함께 각인시키며 대표 이미지를 만들고 있다.`,`정책 이미지 연결도 ${ctx.policyLink}%는 인물 인지도가 실제 정책 기억으로 전환되는 정도를 보여준다.`),opportunity:controversial?'부정 이슈 신호가 여러 갈래에서 잡히고 있지만, 이를 지지기반의 결집 여부를 확인하는 계기로 활용할 수 있다.':`${topTopic} 성과를 반복 제시하면 ${person.name}의 대표 이미지를 선점할 수 있다.`,risk:controversial?`${agenda} 이미지가 굳으면 정책과 의정 성과가 대중 평가에서 사라진다.`:`대표 의제가 흔들리면 인지도는 남아도 ${person.name}만의 정치적 이유가 사라진다.`},
    '02':{headline:`${cohesionGroup} 결집과 ${riskGroup} 이탈 위험이 동시에 나타나는 세대 분화 구간이다.`,position:`JCS 세대·성별 반응지수에서 ${subjectWord(strongAge)} 강하고 ${subjectWord(weakAge)} 취약하게 나타난다.`,interpretation:sentences(`세대·성별 반응은 ${cohesionGroup} 결집과 ${riskGroup} 확장 저하로 갈리고 있다.`,`${person.party} 지지구조와 ${agenda}에 대한 세대별 태도가 같은 방향으로 작용한다.`,`현재 반응은 전 세대 확장이 아니라 지지와 반대가 선명하게 갈리는 진영 결집형이다.`),opportunity:isConservative?'해당 아젠다는 지역 갈라치기의 문제로 번지고 있으며, 2030세대에게는 결속을, 4050세대 이상에게는 위험 신호로 작용하고 있다.':isProgressive?'현재 정치 지형에서 4050세대는 결집 기반이고, 2030세대는 반드시 회복해야 할 위험 구간이다.':`${topicWord(strongAge)} 결집 기반이고 ${topicWord(weakAge)} 확장 여부를 결정할 핵심 구간이다.`,risk:`${agenda}에 반발하는 ${subjectWord(riskGroup)} 인물 자체에 대한 거부층으로 굳어지는 것이 가장 큰 위험이다.`},
    '03':{headline:controversial?`${region} 지역성과보다 ${agenda} 전국 이슈가 앞서 있다.`:`${region} 지역성과와 ${topTopic} 메시지가 같은 방향으로 움직인다.`,position:controversial?`${committee} 활동보다 ${agenda} 보도가 지역 메시지의 중심을 차지한다.`:`${committee} 활동과 ${topTopic} 성과가 지역 메시지의 중심을 형성한다.`,interpretation:controversial?sentences(`지역구 관점에서 ${person.name}의 현재 약점은 ${region} 성과보다 전국 이슈가 먼저 보인다는 점이다.`,`${region} 유권자가 체감할 의정·행정 결과가 현재 뉴스 서사에서 충분히 드러나지 않는다.`,`지역 대표성은 정당 기반이 아니라 지역 문제를 해결한 기록으로 평가받아야 한다.`):sentences(`지역구 관점에서 ${person.name}의 현재 강점은 ${topTopic} 성과가 ${region} 메시지와 연결된다는 점이다.`,`${region} 유권자에게 수혜 대상과 결과를 구체적으로 보여주면 지역 대표성을 강화할 수 있다.`,`전국 메시지보다 지역에서 확인된 실행 결과가 경쟁력을 결정한다.`),opportunity:controversial?`${region}의 기존 정당 기반은 전국 단위 부정 여론을 방어할 수 있는 정치적 버팀목이다.`:`${topTopic} 성과를 ${region}의 예산·일정·수혜 결과로 제시하면 지역 의제를 선점할 수 있다.`,risk:controversial?`지역 현안과 성과가 계속 가려지면 ${region} 유권자에게도 지역을 위해 한 일이 없다는 평가를 받는다.`:`성과를 전국 홍보로만 소비하면 ${region} 유권자에게 돌아온 실제 결과가 보이지 않게 된다.`},
    '04':{headline:controversial?'핵심 지지층 결집은 강해질 수 있지만 외연 확장은 막히는 구조다.':'핵심 지지층 결속을 유지하면서 성과 지지층으로 넓힐 수 있는 구간이다.',position:`${person.party} 기반과 ${careerLabel} 경력은 결집 자산이고 ${riskGroup} 확장이 취약점이다.`,interpretation:controversial?sentences(`핵심 지지층은 ${objectWord(agenda)} 외부 공격으로 받아들일수록 더 강하게 결집한다.`,`이 결집은 충성도 신호이지 전체 유권자의 지지 확대를 뜻하지 않는다.`,`우호층과 유동층에서는 논란 방어보다 정치 성과를 요구하는 압력이 커진다.`):sentences(`핵심 지지층은 ${topTopic} 성과가 반복될수록 지지 이유를 더 분명하게 갖는다.`,`정당 지지와 인물 성과가 함께 움직여 우호층을 실제 지지층으로 전환할 수 있다.`,`외연 확장은 핵심층의 언어가 아니라 생활에서 확인되는 결과로 만들어야 한다.`),opportunity:controversial?'논란 이후에도 유지되는 지지 신호를 통해 실제 핵심 지지층의 규모와 충성도를 확인할 수 있다.':`${topTopic} 성과를 반복 제시하면 핵심층의 충성도와 우호층의 참여를 동시에 높일 수 있다.`,risk:controversial?'핵심층의 방어 반응을 전체 민심으로 오판하면 중도층과 신규 지지층의 이탈을 놓치게 된다.':`핵심층만 이해하는 정당 언어에 머물면 성과가 있어도 중도층과 신규 지지층으로 넓어지지 않는다.`},
    '05':{headline:controversial?'관심도에서는 앞설 수 있지만 논란의 질까지 포함하면 비교 우위가 아니다.':`${topTopic} 성과가 경쟁 정치인과의 비교 우위를 만든다.`,position:`${topicWord(person.name)} 인지도에서 앞서고, ${subjectWord(competitor)} 정책·지역 성과 비교에서 반격할 수 있다.`,interpretation:controversial?sentences(`경쟁 정치인 비교에서는 노출량이 아니라 어떤 이유로 주목받는지를 먼저 봐야 한다.`,`${person.name}의 현재 관심도 우위는 ${agenda} 논란이 만든 결과라서 그대로 정치 경쟁력으로 환산할 수 없다.`,`${subjectWord(competitor)} 정책과 지역 성과를 선점하면 인지도 격차는 빠르게 무너진다.`):sentences(`경쟁 정치인 비교에서 ${person.name}의 현재 우위는 ${topTopic} 성과가 뉴스와 정책 이미지에 함께 남는다는 점이다.`,`${competitor}보다 먼저 실행 결과를 제시하면 인지도 우위를 실제 정치 경쟁력으로 바꿀 수 있다.`,`비교의 기준을 발언량이 아니라 정책 결과와 지역 성과에 고정해야 한다.`),opportunity:controversial?'높은 인지도 덕분에 해명이나 새로운 의제를 발표했을 때 경쟁 정치인보다 빠르게 주목받을 수 있다.':`${topTopic} 실행 결과를 동일 기준으로 제시하면 경쟁 정치인보다 성과 우위를 선점할 수 있다.`,risk:controversial?`경쟁자는 ${agenda}, ${careerLabel} 경력과 성과 부족을 묶어 정치적 자격 문제로 공격할 수 있다.`:`${competitor}이 더 구체적인 수치와 지역 결과를 제시하면 현재의 관심도 우위는 바로 뒤집힌다.`},
    '06':{headline:controversial?'현재 위기는 단순 노출이 아니라 부정 프레임의 장기화다.':'현재 직접 위기는 강하지 않지만 선제 관리가 필요하다.',position:`${ctx.riskFrame} 프레임이 ${person.name}의 ${topTopic} 이미지를 밀어내는 단계다.`,interpretation:sentences(isMay18?'위기 관점에서 이번 사안은 단순 발언 논란이 아니라 5·18 역사 인식 문제가 법적 분쟁으로 확대된 사건이다.':controversial?`${agenda} 논란이 비판과 법적·정치적 책임 요구로 확대되는 단계다.`:`현재 직접적인 위기 신호는 약하지만 ${secondTopic}이 반복될 경우 논란으로 전환된다.`,controversial?'추가 보도와 당사자 대응이 나올 때마다 같은 문제가 다시 뉴스 중심으로 올라온다.':'사실관계와 대응 주체를 먼저 정리하면 확산 전 차단할 수 있다.','위기의 핵심은 기사 수가 아니라 부정적인 평가가 인물의 고정 이미지가 되는지 여부다.'),opportunity:controversial?'논쟁의 핵심이 분명하므로 여러 사안을 동시에 방어하지 말고 사실관계와 공식 입장을 한 번에 정리해야 한다.':'직접 위기가 약한 지금이 취약 발언과 대응 절차를 먼저 정비할 시점이다.',risk:isMay18?'손해배상 소송과 추가 당사자 발언이 이어질 때마다 논란이 재점화되고 역사의식에 대한 국민적 심판 여론이 강화된다.':`${agenda} 대응을 미루면 논란이 정책 평가를 밀어내고 정치적 자격 문제로 확대된다.`},
    '07':{headline:`뉴스 영향력은 높지만 노출의 주도권이 ${externalLed?'외부 보도':'본인 메시지'}에 있다.`,position:`${ctx.sourceDiversity}개 매체의 대표 뉴스가 ${person.name}의 온라인 이미지를 결정하고 있다.`,interpretation:sentences(`언론·온라인 관점에서 현재 뉴스 노출의 주도권은 ${externalLed?'외부 보도와 논란 당사자':'본인의 정책·성과 메시지'}가 쥐고 있다.`,ctx.newsNarrative.narratives.days30,`검색 관심이 높아져도 ${agenda} 검색어가 남으면 영향력은 커지고 정치 자산은 약해진다.`),opportunity:`뉴스와 검색 관심이 높은 지금 공식 입장과 후속 행동을 내놓으면 같은 속도로 확산시킬 수 있다.`,risk:`공식 메시지보다 부정적인 기사 제목이 더 많이 반복되면 검색 결과 전체가 ${agenda} 중심으로 고착된다.`},
    '08':{headline:`현재 관심도는 핵심층 동원에는 유리하지만 외연 확장에는 불리하다.`,position:`JCS 선거경쟁력지수 기준 ${peerPosition(score)}이며 ${region} 기반과 ${riskGroup} 반응이 승부처다.`,interpretation:sentences(`선거 경쟁력 관점에서 ${person.party} 지역 기반과 높은 인지도는 동원 자산이다.`,controversial?`${agenda} 중심 관심은 핵심층을 모을 수 있지만 중도층의 득표 확장에는 직접적인 손실이다.`:`${topTopic} 성과가 지역 유권자의 선택 이유로 연결되고 있다.`,'관심도 순위와 득표 경쟁력은 같은 값이 아니며 조직·지역·확장성을 함께 봐야 한다.'),opportunity:`${region}의 기존 지지기반과 현재 인지도를 동시에 활용하면 핵심 조직의 동원력을 높일 수 있다.`,risk:`${subjectWord(agenda)} 후보 검증 문제로 굳으면 중도층이 필요한 선거에서 득표 확장이 막힌다.`},
    '09':{headline:ctx.policyLink?`${subjectWord(topTopic)} 대표 정책으로 연결되는 단계다.`:'현재 대중에게 각인된 대표 정책이 보이지 않는다.',position:`정책 이미지 연결도 ${ctx.policyLink}%로 정책과 인물 이미지의 결합 수준이 드러난다.`,interpretation:ctx.policyLink?sentences(`정책·공약 관점에서 ${person.name}의 현재 강점은 ${subjectWord(topTopic)} 대표 정책 이미지로 자리 잡고 있다는 점이다.`,`정책 이미지 연결도 ${ctx.policyLink}%는 뉴스 관심이 정책 기억으로 전환되는 정도를 보여준다.`,`${objectWord(policyAgenda)} 비용·기한·수혜대상이 분명한 실행 결과로 바꿔야 정책 지지를 유지할 수 있다.`):sentences(`정책·공약 관점에서 ${person.name}에게 현재 가장 부족한 것은 대중에게 각인된 대표 정책이다.`,`정책 이미지 연결도 ${ctx.policyLink}%는 뉴스 관심이 정책 기억으로 이어지지 않고 있음을 보여준다.`,`${objectWord(policyAgenda)} 비용·기한·수혜대상이 분명한 정책으로 만들지 않으면 인물 이미지만 남는다.`),opportunity:ctx.policyLink?`${topTopic} 반응을 실제 수혜 사례와 성과 수치로 증명하면 대표 정책의 소유권을 굳힐 수 있다.`:'대표 정책 이미지가 비어 있어 가장 먼저 선명한 지역·민생 성과를 제시하면 새로운 평가 기준을 만들 수 있다.',risk:ctx.policyLink?`발표만 반복하고 실제 결과를 보여주지 못하면 ${topTopic} 정책은 경쟁 정치인의 공격 지점으로 바뀐다.`:`정책 노출이 계속 부족하면 이후 어떤 공약을 발표해도 유권자는 정책보다 ${agenda}부터 떠올린다.`},
    '10':{headline:`다음 정치 단계의 핵심은 노출 확대가 아니라 신뢰와 성과의 증명이다.`,position:`${roleTitle}와 ${careerLabel} 경력을 기준으로 다음 단계 준비도가 ${level(score)}에 있다.`,interpretation:sentences(`중장기 성장 관점에서 ${person.name}에게 필요한 것은 추가 노출보다 ${region}에서 확인되는 정치 성과다.`,firstTerm?`초선 임기 초반에 대표 정책과 의정 성과를 만들지 못하면 ${subjectWord(agenda)} 전체 정치 경력을 규정한다.`:`${careerLabel} 경력에 맞는 대표 의제와 전국 확장 성과가 부족하면 다음 역할의 명분이 약해진다.`,`현재의 관심을 신뢰·성과·조직 기반으로 전환해야 다음 정치 단계로 이동할 수 있다.`),opportunity:firstTerm?'초선 임기 초반이므로 의정 성과와 대표 정책을 쌓아 현재 이미지를 다시 정의할 시간이 남아 있다.':`${careerLabel} 경력과 ${region} 기반을 전국 단위 성과로 증명하면 다음 역할의 명분을 만들 수 있다.`,risk:firstTerm?`임기 초반부터 ${subjectWord(agenda)} 반복되면 당내 역할과 전국 단위 정치 확장 모두에서 지속적인 검증 부담을 안게 된다.`:`대표 의제 없이 논란과 역할 변화만 반복되면 경력은 길어도 다음 정치 단계로 올라갈 이유가 사라진다.`}
  };
  return copy[id];
}

function diagnosisVisualization(id,score,ctx){
  const factors=contextFactors(ctx,score),topicValues=ctx.newsNarrative.topics.slice(0,5).map(topic=>({label:topic.label,value:topic.basis==='direct'?clamp(topic.share):factorFor(topic.label,factors)}));
  const cohortValues=ctx.cohorts.map(row=>({label:row.age,left:clamp(row.male),right:clamp(row.female)}));
  const visuals={
    '01':{xLabel:'정책 중심 ↔ 인물·정쟁 중심',yLabel:'이미지 분산 ↔ 이미지 선명',point:{x:ctx.policyLink,y:score},bars:bars(['브랜드 선명도','정책 연결도','이미지 일관성','차별성','확장성'],score,ctx)},
    '02':{axis:'상대적 취약 ↔ 상대적 강점',rows:cohortValues,heatmap:ctx.cohorts.map(row=>({label:row.age,male:row.male,female:row.female}))},
    '03':{axis:'지역 메시지 적합도',rows:topicValues},
    '04':{segments:[{label:'핵심',value:clamp(score*.36)},{label:'우호',value:clamp(score*.28)},{label:'유동',value:clamp((100-score)*.22)},{label:'이탈위험',value:clamp((100-score)*.14)}],axes:{cohesion:score,expansion:factors.audience}},
    '05':{columns:['브랜드','지역','미디어','정책','확장'],rows:[{label:ctx.person.name,values:bars(['브랜드','지역','미디어','정책','확장'],score,ctx).map(row=>row.value)},...ctx.competitors.slice(0,3).map(row=>({label:row.name,values:[row.score,clamp(42+(row.jurisdiction||row.region?14:0)),clamp(35+(row.office?8:0)),clamp(35+(row.committee?12:0)),clamp(38+termsCount(row.terms)*6)]}))]},
    '06':{xLabel:'발생 가능성',yLabel:'영향도',points:ctx.newsNarrative.riskFrames.length?ctx.newsNarrative.riskFrames.map(label=>({label,x:clamp(ctx.negativeShare),y:clamp(ctx.sourceDiversity*12+ctx.newsCount*5)})):[{label:'이미지 충돌',x:clamp(ctx.negativeShare),y:clamp(ctx.sourceDiversity*12+ctx.newsCount*5)}]},
    '07':{periods:observedTrend(ctx.newsNarrative).periods,topics:topicValues},
    '08':{zones:[{label:'우세',items:topicValues.slice(0,2)},{label:'경합',items:topicValues.slice(2,4)},{label:'취약',items:topicValues.slice(4)}],bars:bars(['지역 기반','조직','브랜드','정책','미디어','확장력'],score,ctx)},
    '09':{columns:[ctx.strongAge,ctx.weakAge,'지역 유권자'],rows:topicValues.slice(0,4).map(row=>({label:row.label,values:[row.value,factors.audience,factors.regional]}))},
    '10':{current:score,next:Math.max(score,75),gaps:bars(['대표 의제','당내 입지','지역 기반','전국 확장','위기 대응'],score,ctx),ladder:['현재 역할','대표 의제 확립','외연 확장','다음 정치 단계']}
  };
  return visuals[id];
}

const DISPLAY_KINDS=Object.freeze({
  '01':'brand','02':'demographic','03':'local','04':'support','05':'competitor',
  '06':'risk','07':'media','08':'campaign','09':'policy','10':'summary'
});
const RISK_TAG_RULES=Object.freeze([
  [/5\s*[·.]?\s*18|역사\s*인식|역사관/,'역사인식'],[/과거\s*발언|발언\s*논란|망언|도발/,'과거발언'],
  [/번복|철회/,'정책번복'],[/손배소|손해배상|소송|피소|재판|기소|수사|고발/,'법적분쟁'],
  [/공천|선거법|부정선거/,'선거논란'],[/의혹|논란|비판|반발/,'논란']
]);
const compactTitle=value=>clean(value).replace(/^(?:(?:\[[^\]]+\]|【[^】]+】)\s*)+/,'').replace(/\s*[-|｜]\s*[^-|｜]{2,30}$/,'').trim();
const signed=value=>Math.max(-50,Math.min(50,Math.round(Number(value||0)-50)));
const countBy=(rows,key)=>rows.reduce((map,row)=>map.set(row[key],(map.get(row[key])||0)+1),new Map());
function normalizedHundred(rows){
  const values=rows.map(row=>Math.max(0,Number(row.value)||0)),sum=values.reduce((total,value)=>total+value,0);
  if(!sum)return rows.map(row=>({...row,value:0}));
  const exact=values.map(value=>value/sum*100),rounded=exact.map(Math.floor),missing=100-rounded.reduce((total,value)=>total+value,0);
  exact.map((value,index)=>({index,fraction:value-rounded[index]})).sort((a,b)=>b.fraction-a.fraction||a.index-b.index).slice(0,missing).forEach(row=>rounded[row.index]++);
  return rows.map((row,index)=>({...row,value:rounded[index]}));
}
function demographicDisplay(cohorts){
  const source=list(cohorts),ageTotals=normalizedHundred(source.map(row=>({age:row.age,value:(Number(row.male)||0)+(Number(row.female)||0)})));
  const rows=source.map(row=>{const split=normalizedHundred([{gender:'male',value:row.male},{gender:'female',value:row.female}]);return {age:row.age,total:ageTotals.find(item=>item.age===row.age)?.value||0,male:split[0]?.value||0,female:split[1]?.value||0,maleContribution:Math.round((ageTotals.find(item=>item.age===row.age)?.value||0)*(split[0]?.value||0)/100),femaleContribution:Math.round((ageTotals.find(item=>item.age===row.age)?.value||0)*(split[1]?.value||0)/100)};});
  const rank=gender=>rows.map(row=>({age:row.age,value:row[`${gender}Contribution`]})).sort((a,b)=>b.value-a.value||a.age.localeCompare(b.age,'ko'));
  return {kind:'demographic',cohorts:rows,maleRank:rank('male'),femaleRank:rank('female'),total:100};
}
function dateBuckets(items,referenceAt){
  const dated=list(items).map(row=>Date.parse(row.date||row.publishedAt||'')).filter(Number.isFinite),requested=Date.parse(referenceAt||''),reference=Number.isFinite(requested)?requested:Math.max(0,...dated);
  const within=days=>list(items).filter(row=>{const stamp=Date.parse(row.date||row.publishedAt||'');const age=reference-stamp;return reference&&Number.isFinite(stamp)&&age>=0&&age<=days*86400000;}).length;
  return [{label:'24H',value:within(1)},{label:'7D',value:within(7)},{label:'30D',value:within(30)}];
}
function riskTags(items){
  const found=[];
  for(const row of list(items).filter(item=>item.frame==='부정·위기')){
    const rule=RISK_TAG_RULES.find(([pattern])=>pattern.test(row.title||'')),label=rule?.[1]||clean(row.agendaTag).replace(/[^가-힣A-Za-z0-9]/g,'');
    if(!label||!row.url||found.some(item=>item.tag===`#${label}`))continue;
    found.push({tag:`#${label}`,title:compactTitle(row.title),url:row.url,date:row.date});
    if(found.length===5)break;
  }
  return found;
}
function verifiedElections(person,input){
  const rows=[...list(input.elections),...list(person.elections),...list(input.officialElection?.elections)];
  const metric=value=>{const cleaned=String(value??'').replace(/[%p,\s]/g,'');if(!cleaned)return null;const number=Number(cleaned);return Number.isFinite(number)?number:null;};
  const mapped=rows.filter(row=>clean(row?.election||row?.name||person.electionLabel)).map(row=>{const voteRate=metric(row.voteRate??row.voteShare),opponentRate=metric(row.opponentRate),explicitMargin=metric(row.margin),margin=explicitMargin??(voteRate!==null&&opponentRate!==null?Math.round((voteRate-opponentRate)*10)/10:null);return {
    year:clean(row.year||row.date),election:clean(row.election||row.name||person.electionLabel),result:clean(row.result)||(margin===null?'공식 기록':margin>=0?'승리':'패배'),voteRate,opponent:clean(row.opponent),opponentRate,margin,regions:list(row.regions).slice(0,30).map(region=>{const rate=metric(region.voteRate??region.rate),opponent=metric(region.opponentRate),gap=metric(region.margin)??(rate!==null&&opponent!==null?Math.round((rate-opponent)*10)/10:null);return {name:clean(region.name||region.region),voteRate:rate,margin:gap,status:clean(region.status)||(gap===null?'데이터 부족':gap>=5?'우세':gap<=-5?'취약':'경합')};})
  };});
  if(mapped.length)return mapped;
  const election=clean(person?.electionLabel);if(!election)return [];
  const year=election.match(/(?:제)?(\d{1,2})대/)?.[1];
  return [{year:year?`제${year}대`:'현재',election,result:/당선|선출/.test(election)?'당선':'공식 프로필 기록',voteRate:null,opponent:'',opponentRate:null,margin:null,regions:[]}];
}
function policyStage(title){if(/완료|달성|개통/.test(title))return '완료';if(/시행|집행|착수/.test(title))return '시행';if(/통과|의결|가결/.test(title))return '통과';if(/검토|심사|협의/.test(title))return '검토';if(/제안|발의|제출/.test(title))return '제안';return '발표';}
function isPolicyEvidence(row){const title=clean(row?.title),policyAction=/정책|공약|법안|조례|예산|입법|발의|제안|추진|시행|복지|주거|노동|교육|교통|안전|민생|경제|산업|환경/.test(title),politicalOrganization=/창당|해산|탈당|복당|입당|전당대회|당대표|지도부|공천/.test(title);return policyAction&&!politicalOrganization;}
function supportDisplay(ctx){
  const spread=list(ctx.cohorts).flatMap(row=>[Number(row.male)||0,Number(row.female)||0]),career=contextFactors(ctx,ctx.score).career;
  const composition=normalizedHundred([{key:'core',label:'코어',value:career+Math.max(0,50-ctx.negativeShare)},{key:'floating',label:'유동',value:Math.max(10,100-(spread.length?Math.max(...spread)-Math.min(...spread):0))},{key:'exit',label:'이탈',value:Math.max(5,ctx.negativeShare+Math.abs(50-ctx.score))}]);
  return {kind:'support',composition};
}
function localCoverage(items,person){
  const jurisdiction=clean(person?.jurisdiction),region=clean(person?.region);
  const placeTerms=unique([
    jurisdiction,
    jurisdiction.replace(/\s+/g,''),
    ...jurisdiction.split(/\s+/).filter(term=>term.length>=2),
    region,
    region.replace(/\s+/g,'')
  ]);
  const localCue=/지역구|지역\s*(?:예산|현안|민심|주민|현장)|구민|군민|도민|시민|시정|도정|군정|구정/;
  const rows=list(items).filter(row=>placeTerms.some(term=>clean(row.title).includes(term))||localCue.test(clean(row.title)));
  const grouped=new Map();
  for(const row of rows){
    const label=clean(row.agendaTag)||'지역·현장',current=grouped.get(label)||{label,count:0,sources:new Set(),led:0,evidence:[]};
    current.count+=1;
    if(row.source)current.sources.add(row.source);
    if(row.agency==='정치인 주도')current.led+=1;
    if(current.evidence.length<3)current.evidence.push({title:compactTitle(row.title),url:clean(row.url),source:clean(row.source),date:clean(row.date)});
    grouped.set(label,current);
  }
  return [...grouped.values()].map(row=>({label:row.label,count:row.count,sourceCount:row.sources.size,share:Math.round(row.count/Math.max(1,rows.length)*100),messageShare:Math.round(row.led/Math.max(1,row.count)*100),evidence:row.evidence})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'ko')).slice(0,5);
}
function displayContract(id,ctx,input,diagnosisScores){
  const news=list(ctx.newsNarrative.items),search=input.searchMetrics||{},frames=ctx.newsNarrative.frameSummary||{positive:0,neutral:0,negative:0},buckets=dateBuckets(news,input.referenceAt),elections=verifiedElections(ctx.person,input),demographic=demographicDisplay(ctx.cohorts),support=supportDisplay(ctx),sources=[...countBy(news,'source')].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'ko'));
  const aggregateNewsCount=Math.max(news.length,Number(input.newsMetrics?.count)||0),aggregateSourceCount=Math.max(ctx.sourceDiversity,Number(input.newsMetrics?.sourceCount)||0),topics=list(ctx.newsNarrative.topics).filter(row=>row.basis==='direct').slice(0,5),localTopics=localCoverage(news,ctx.person),led=Number(ctx.newsNarrative.agencySummary?.led)||0,external=Number(ctx.newsNarrative.agencySummary?.external)||0,totalSearch=Number(search.pc||0)+Number(search.mobile||0),subject={id:ctx.person.id,name:ctx.person.name,party:ctx.person.party,office:ctx.roleTitle,region:ctx.region,overallRank:null,categoryRank:null,pc:Number(search.pc)||0,mobile:Number(search.mobile)||0,newsCount:aggregateNewsCount,sourceCount:aggregateSourceCount,frames,agendas:topics,election:elections[0]||null};
  const people=[subject,...ctx.competitors.slice(0,3).map(row=>({id:row.id,name:row.name,party:row.party,office:row.office,region:row.jurisdiction||row.region,overallRank:null,categoryRank:null,pc:null,mobile:null,newsCount:null,sourceCount:null,frames:null,agendas:[],election:null}))];
  const issueTotal=Math.max(1,frames.positive+frames.neutral+frames.negative),direction=Math.round((frames.positive-frames.negative)/issueTotal*50),dominant=list(input.eventClusters)[0],eventDates=list(dominant?.evidence).map(row=>Date.parse(row.date||'')).filter(Number.isFinite).sort((a,b)=>a-b),durationDays=eventDates.length?Math.max(1,Math.ceil((eventDates.at(-1)-eventDates[0])/86400000)+1):0,reignitionCount=eventDates.slice(1).filter((stamp,index)=>stamp-eventDates[index]>7*86400000).length,persistence=dominant?{from:dominant.dateRange?.from,to:dominant.dateRange?.to,durationDays,sourceCount:new Set(list(dominant.evidence).map(row=>row.source)).size,recurrences:Math.max(0,list(dominant.relatedNewsIds).length-1),reignitionCount,events:list(dominant.evidence).map(row=>({date:row.date,source:row.source}))}:{from:'',to:'',durationDays:0,sourceCount:0,recurrences:0,reignitionCount:0,events:[]};
  const policyNews=news.filter(isPolicyEvidence),stages=['발표','제안','검토','통과','시행','완료'],policyRows=policyNews.slice(0,5).map(row=>{const stage=policyStage(row.title);return {name:compactTitle(row.title),stage,stageIndex:stages.indexOf(stage),articles:1,outlets:1,frame:row.frame,pc:null,mobile:null,share:Math.round(100/Math.max(1,policyNews.length)),specificity:{beneficiary:/청년|노인|소상공인|주민|가구|기업/.test(row.title),budget:/예산|억|조원/.test(row.title),deadline:/년|월|일까지/.test(row.title),owner:/정부|국회|위원회|부처|서울시|도|시|군|구/.test(row.title)}};});
  const contracts={
    '01':{kind:'brand',nowSignal:compactTitle(ctx.newsNarrative.dominantEvent?.title||`${ctx.person.name} 현재 정치 활동`),indicators:diagnosisVisualization('01',ctx.score,ctx).bars.map(row=>({label:row.label==='차별성'?'경쟁자 차별성':row.label,value:signed(row.value)})),search:{pc:Number(search.pc)||0,mobile:Number(search.mobile)||0,mobileShare:totalSearch?Math.round(Number(search.mobile||0)/totalSearch*100):0},news:buckets,pastRisks:riskTags(news),totalSign:{risk:Math.min(50,Math.round(frames.negative/issueTotal*50)),opportunity:Math.min(50,Math.round((frames.positive+led*.5)/issueTotal*50))}},
    '02':demographic,
    '03':{kind:'local',elections,status:elections.length?'공식 선거 데이터 연결':'비교 가능한 공식 선거 데이터 부족',population:list(input.officialPopulation).map(row=>({age:clean(row.age),maleShare:Number(row.maleShare)||0,femaleShare:Number(row.femaleShare)||0})),populationBasis:'광역 연령·성별 인구 구조',populationStatus:list(input.officialPopulation).length?'공식 지역 인구 연결':'지역 연령별 인구 데이터 부족',issues:localTopics.map(row=>({label:row.label,count:row.count,share:row.share,evidence:row.evidence})),messageFit:localTopics.map(row=>({label:row.label,localShare:row.share,messageShare:row.messageShare,gap:Math.abs(row.share-row.messageShare)}))},
    '04':support,
    '05':{kind:'competitor',people,metrics:['NOW 순위','PC·모바일 검색량','대표 뉴스량·매체 다양성','뉴스 프레임','주요 의제 점유율','공식 선거 득표율·격차']},
    '06':{kind:'risk',nowSignal:compactTitle(ctx.newsNarrative.dominantEvent?.title||`${ctx.person.name} 현재 정치 활동`),direction,frames,velocity:buckets,persistence},
    '07':{kind:'media',articleCount:aggregateNewsCount,sourceCount:aggregateSourceCount,sourceSpread:sources,concentration:sources.map(row=>({...row,share:Math.round(row.value/Math.max(1,news.length)*100)})),search:{pc:Number(search.pc)||0,mobile:Number(search.mobile)||0,mobileShare:totalSearch?Math.round(Number(search.mobile||0)/totalSearch*100):0},ownership:{led,external},agendaPenetration:topics.map(row=>({label:row.label,articles:row.count,outlets:row.sourceCount}))},
    '08':{kind:'campaign',elections,status:elections.length?'공식 선거 기록 연결':'비교 가능한 공식 선거 데이터 부족'},
    '09':{kind:'policy',policies:policyRows,status:policyRows.length?'정책·공약 보도 연결':'확인 가능한 정책·공약 데이터 부족'},
    '10':{kind:'summary',totalScore:clamp(average(Object.entries(diagnosisScores).filter(([key])=>key!=='10').map(([,value])=>value))),gender:(demographic.maleRank[0]?.value||0)>=(demographic.femaleRank[0]?.value||0)?{label:'남성',value:demographic.maleRank[0]?.value||0}:{label:'여성',value:demographic.femaleRank[0]?.value||0},age:[...demographic.cohorts].map(row=>({label:row.age,value:row.male+row.female})).sort((a,b)=>b.value-a.value)[0],support:[...support.composition].sort((a,b)=>b.value-a.value)[0],resilience:clamp(average([contextFactors(ctx,ctx.score).career,100-ctx.negativeShare,ctx.policyLink||0])),mediaInfluence:clamp(average([Math.min(100,aggregateNewsCount*10),Math.min(100,aggregateSourceCount*12),totalSearch?Math.min(100,Math.log10(totalSearch+1)*20):0])),media:{articles:aggregateNewsCount,outlets:aggregateSourceCount}}
  };
  return contracts[id]||{kind:DISPLAY_KINDS[id]};
}

function makeDiagnoses(person,input){
  const newsNarrative=input.newsNarrative,topTopic=newsNarrative.topics[0]?.label||'정치 활동',secondTopic=newsNarrative.topics[1]?.label||clean(person.committee)||'지역·현장';
  const terms=termsCount(person.terms),role=roleWeight(person),representativeNewsCount=newsNarrative.items.length,newsCount=Math.max(representativeNewsCount,Number(input.newsMetrics?.count)||0),policyLink=newsNarrative.policyImageLink,sourceDiversity=Math.max(newsNarrative.sourceDiversity,Number(input.newsMetrics?.sourceCount)||0),search=input.searchMetrics||{},frames=newsNarrative.frameSummary||{positive:0,neutral:0,negative:0};
  const cohorts=list(input.cohorts),strong=cohorts.flatMap(row=>[{label:`${row.age} 남성`,value:row.male},{label:`${row.age} 여성`,value:row.female}]).sort((a,b)=>b.value-a.value),strongAge=strong[0]?.label||`${person.region||'지역'} 핵심층`,weakAge=strong.at(-1)?.label||'신규 유입층';
  const competitors=list(input.competitors),competitor=competitors[0]?.name||`동일 직군 ${person.region||'지역'} 정치인`,region=clean(person.jurisdiction||person.region)||'관할 지역',roleTitle=clean(person.office||person.roleLabel)||'현재 정치 역할',committee=clean(person.committee)||'담당 분야';
  const cohortValues=cohorts.flatMap(row=>[Number(row.male)||0,Number(row.female)||0]),cohortMean=clamp(average(cohortValues)),cohortSpread=cohortValues.length?Math.max(...cohortValues)-Math.min(...cohortValues):0,negativeShare=Math.round(frames.negative/Math.max(1,representativeNewsCount)*100),positiveShare=Math.round(frames.positive/Math.max(1,representativeNewsCount)*100),regionalShare=newsNarrative.topics.find(row=>row.label==='지역·현장')?.share||0,career=clamp(38+terms*8+role+(person.committee?5:0)),media=clamp(32+newsCount*5+sourceDiversity*4),regional=clamp(42+(person.jurisdiction||person.region?14:0)+regionalShare*.35),base=clamp(average([career,media,cohortMean||50]));
  const assetAttention=clamp(media-negativeShare*.45+positiveShare*.25),peerAverage=competitors.length?average(competitors.map(row=>row.score)):career;
  const rawScores={
    '01':average([assetAttention,policyLink||40,career]),
    '02':average([cohortMean||50,clamp(100-cohortSpread),career]),
    '03':average([regional,career,regionalShare||45]),
    '04':average([career,cohortMean||50,clamp(100-cohortSpread)]),
    '05':clamp(50+career-peerAverage),
    '06':average([negativeShare,clamp(sourceDiversity*12),clamp(newsCount*8)]),
    '07':average([media,clamp(newsNarrative.agencySummary?.led/Math.max(1,newsCount)*100),assetAttention]),
    '08':average([career,regional,cohortMean||50]),
    '09':average([policyLink||35,clamp(newsNarrative.topics.filter(row=>['민생·경제','정책·입법','성과·행정'].includes(row.label)).reduce((sum,row)=>sum+row.share,0)),career]),
    '10':average([career,regional,assetAttention])
  };
  const basisFor=id=>['01','06','07','09'].includes(id)&&newsCount?'direct':['02','04','05','08'].includes(id)?'derived':'structural';
  const eventDominant=list(input.eventClusters)[0]||null,dominant=eventDominant?{id:eventDominant.relatedNewsIds?.[0],title:eventDominant.eventTitle,date:eventDominant.dateRange?.to,source:eventDominant.evidence?.[0]?.source,agendaTag:eventDominant.coreKeywords?.[0],frame:eventDominant.politicalFrame,agency:newsNarrative.dominantEvent?.agency}:newsNarrative.dominantEvent||{title:`${roleTitle} 공식 활동`,date:'현재',source:'공식 프로필'},dominantTitle=clean(dominant.title),isMay18=/5\s*[\.·]?\s*18/.test(dominantTitle),issueLabel=isMay18?'5·18 역사 인식':negativeShare?`${newsNarrative.riskFrames[0]||topTopic} 부정 이슈`:topTopic;
  const ctxBase={person,newsNarrative,topTopic,secondTopic,strongAge,weakAge,competitor,region,roleTitle,committee,policyLink,sourceDiversity,newsCount,negativeShare,cohorts,competitors,riskFrame:newsNarrative.riskFrames[0]||`${secondTopic} 이미지 충돌`,issueLabel,isMay18},decisionMap=new Map(list(input.politicalStates).map(row=>[row.id,row]));
  return POLITICAL_DIAGNOSIS_TOPICS.map(([id,title,type])=>{
    const score=clamp(rawScores[id]),basis=basisFor(id),ctx={...ctxBase,score};
    const copy=diagnosisCopy(id,ctx),decision=decisionMap.get(id),sourceTypes=unique([basis==='direct'?'뉴스 헤드라인':'공식 현재정보','정치 구조 데이터',id==='07'?'검색 보조 신호':''].filter(Boolean));
    if(search.available)sourceTypes.push('검색 보조 신호');
    const careerLabel=clean(person.terms)||`${terms}선`,coreEvent=dominant.title,contextTrend=newsNarrative.contextTemporalSummary||newsNarrative.temporalSummary||{},changeReason=newsCount?`대표 뉴스는 최근 30일 ${contextTrend.days30||0}건, 90일 ${contextTrend.days90||0}건으로 집계되며 ${contextTrend.recentDirection||'유지'} 흐름을 보입니다.`:`${roleTitle}, ${careerLabel} 경력, ${region} 정치 구조가 현재 평가의 기준을 형성합니다.`,linkedPast=list(input.pastPresentConnections)[0],pastPresentConnection=linkedPast?.currentEffect||`${careerLabel} 공식 정치 경력과 현재 ${roleTitle} 역할을 연결하면, ${topTopic} 서사가 일시적 노출을 넘어 정치 자산으로 축적되는지가 핵심이다.`,politicalMeaning=decision?.politicalMeaning||`${copy.headline} ${newsNarrative.politicalMeaning}`;
    const evidenceRows=[evidence('핵심 이슈 분석',[dominant.agendaTag,dominant.frame,dominant.agency].filter(Boolean).join(' · ')||topTopic,newsCount?'direct':'structural',dominant.id||newsNarrative.items[0]?.id||`profile-${person.id}`),evidence('현재 직책',roleTitle,'structural',person.sourceId||`profile-${person.id}`),evidence('정치 구조',[person.party,region,person.terms].filter(Boolean).join(' · '),'structural',`profile-${person.id}`)];
    const supportingData=[{label:'뉴스 프레임',value:`긍정·성과 ${frames.positive} · 중립·정보 ${frames.neutral} · 부정·위기 ${frames.negative}`,basis:newsCount?'direct':'structural'},{label:'정치 구조',value:[person.party,region,person.terms,roleTitle].filter(Boolean).join(' · '),basis:'structural'}];
    if(search.available)supportingData.push({label:'검색 반응',value:`PC ${Number(search.pc||0).toLocaleString('ko-KR')} · 모바일 ${Number(search.mobile||0).toLocaleString('ko-KR')}`,basis:'supporting'});
    const relative=id==='06'?(score>=70?'고위험 구간':score>=45?'주의 구간':'관리 가능 구간'):peerPosition(score),trend=observedTrend(newsNarrative),benchmark={label:id==='06'?'뉴스 위험 프레임 기준':'동일 직군 JCS 기준',position:relative,delta:score-55},dominantEvent=eventDominant?{eventId:eventDominant.eventId,eventType:eventDominant.eventType,dateRange:eventDominant.dateRange,politicalFrame:eventDominant.politicalFrame,direction:eventDominant.direction,severity:eventDominant.severity,evidenceIds:eventDominant.relatedNewsIds}:{eventId:`profile-${person.id}`,eventType:'정치 활동',dateRange:{from:'현재',to:'현재'},politicalFrame:'중립·정보',direction:'neutral',severity:'weak',evidenceIds:[`profile-${person.id}`]},factEvidence=list(decision?.evidence).map(row=>({id:row.id,label:row.label,statement:row.statement,basis:row.basis,sourceTitle:row.sourceTitle,sourceUrl:row.sourceUrl,date:row.date})),evidenceIds=unique([...(decision?.evidenceIds||[]),...(id==='01'?dominantEvent.evidenceIds||[]:[]),...(id==='01'?evidenceRows.map(row=>row.sourceId):[]),...(id==='01'?(linkedPast?.evidenceIds||[]):[])]),supportingSignals=[{kind:'news',label:'뉴스 프레임',value:supportingData[0].value,basis:supportingData[0].basis},{kind:'structure',label:'정치 구조',value:supportingData[1].value,basis:'structural'},...(search.available?[{kind:'search',label:'검색 반응',value:`PC ${Number(search.pc||0).toLocaleString('ko-KR')} · 모바일 ${Number(search.mobile||0).toLocaleString('ko-KR')}`,basis:'supporting'}]:[])];
    return {id,title,headline:decision?.headline||copy.headline,currentPosition:decision?.currentPosition||copy.position,dominantEvent,coreEvent,politicalMeaning,changeDirection:trend.direction,changeCause:changeReason,changeReason,pastPresentConnection,comparison:benchmark,supportingSignals,supportingData,metrics:{score,relativePosition:relative,peerDelta:benchmark.delta,attentionQuality:newsNarrative.attentionQuality},evidenceIds,attentionQuality:newsNarrative.attentionQuality,score,percentile:relative,trend,benchmark,visualization:{type,...diagnosisVisualization(id,score,ctx)},display:displayContract(id,ctx,input,rawScores),interpretation:sentences(...(decision?.interpretation||copy.interpretation)),evidence:evidenceRows,factEvidence,opportunity:decision?.opportunity||copy.opportunity,risk:decision?.risk||copy.risk,sourceTypes:unique(sourceTypes),updatedAt:clean(input.snapshot)||'2026-09-03',algorithmVersion:input.algorithmVersion,basis};
  });
}

function prescriptionContent(id,ctx){
  const {person,topTopic,secondTopic,region,strongAge,weakAge,competitor}=ctx;
  const rows={
    '01':[`대표 브랜드를 ${topTopic} 중심으로 일원화한다.`,[`모든 공개 발언의 첫 문장을 ${topTopic} 성과로 통일`,`인물·정쟁 키워드는 반응형 답변으로 축소`,`${region} 실행 사례를 대표 브랜드 증거로 축적`],`${topTopic} 해결형 정치인`,`${topTopic}·실행·성과`,['보도자료','공식 SNS','현장 연설']],
    '02':[`${topicWord(strongAge)} 결집하고 ${topicWord(weakAge)} 생활 의제로 확장한다.`,[`${strongAge}에 성과 재확인 메시지 배치`,`${weakAge}에 비용·기회 중심 콘텐츠 제공`,`성별 반응 차이가 큰 의제는 표현을 분리`],`${strongAge} 결집 · ${weakAge} 확장`,`${subjectWord(topTopic)} 각 집단의 생활에 미치는 변화`,['세대별 숏폼','지역 커뮤니티','정책 간담회']],
    '03':[`${region}의 대표 의제를 ${directionWord(topTopic)} 선점한다.`,[`${topTopic} 현장 일정과 정책 발표를 같은 주에 배치`,`지역 주민 수혜대상과 기한 공개`,`${topicWord(secondTopic)} 보조 의제로 순서를 낮춤`],`${region} 생활권 유권자`,`${region}에서 확인되는 ${topTopic}의 구체적 변화`,['지역 언론','현장 간담회','지역 온라인 커뮤니티']],
    '04':[`결집과 확장을 분리 운영해 지지층 이동을 만든다.`,[`${strongAge}에 성과와 정체성 재확인`,`우호층에 참여 가능한 행동과 일정 제시`,`${weakAge}에는 정당 언어보다 생활 문제 해결 증거 제공`],`핵심·우호·유동층`,`${topTopic} 성과를 집단별 언어로 변환`,['당원 채널','문자·메신저','생활권 콘텐츠']],
    '05':[`${topicWord(companionWord(competitor))} ${topTopic}에서 공세하고 ${secondTopic}에서 방어한다.`,[`${competitor} 대비 실행 결과를 동일 기준으로 비교`,`구조적으로 불리한 경력 비교는 회피`,`단기 역전 가능한 ${topTopic} 증거를 선점`],`${competitor} 지지·유동층`,`${person.name}의 차이는 말이 아니라 실행 순서와 결과`,['비교 브리핑','정책 토론','지역 현장']],
    '06':[`위기 초기 6시간 안에 사실과 조치의 기준을 선점한다.`,[`0~6시간 사실관계와 대응 주체 확정`,`24시간 안에 조치와 재발 방지 공개`,`72시간 후 ${topTopic} 본래 의제로 서사 복귀`],`중도·유동층과 핵심 언론`, `사실 확인 → 조치 → 회복의 단일 순서`,['공식 입장문','책임자 브리핑','후속 결과 보고']],
    '07':[`${objectWord(topTopic)} 언론에서 검색과 온라인 확산으로 연결한다.`,[`${topTopic} 원문 메시지를 먼저 공개`,`언론 보도 직후 핵심 문답과 짧은 영상 배치`,`논란 키워드보다 정책 키워드가 남도록 후속 콘텐츠 운영`],`뉴스 유입층과 정책 관심층`,`${topTopic}의 문제·해법·결과를 하나의 문장으로 연결`,['공식 발표','언론 인터뷰','검색형 콘텐츠','SNS']],
    '08':[`경합 자원은 ${region}의 ${topTopic} 승부처에 집중한다.`,[`우세 기반은 핵심층 조직으로 방어`,`경합 영역에 인력·현장·콘텐츠 우선 배분`,`취약 영역은 손실 최소화 메시지로 관리`],`${region} 경합 유권자`,`${topTopic} 성과가 투표 선택을 바꾸는 이유`,['현장 조직','지역 매체','타깃 콘텐츠']],
    '09':[`${topicWord(topTopic)} 유지·강화하고 ${topicWord(secondTopic)} 표현을 재설계한다.`,[`${objectWord(topTopic)} 대표 정책으로 고정`,`${topicWord(secondTopic)} 수혜대상과 재원 설명 보강`,`경쟁자가 비어 있는 지역 정책을 신규 선점`],`${companionWord(strongAge)} ${weakAge}`,`정책의 비용·기한·수혜대상을 먼저 제시`,['정책 발표회','설명 카드뉴스','이해관계자 간담회']],
    '10':[`다음 정치 단계의 명분을 ${topTopic} 장기 성과로 만든다.`,[`3개월 안에 대표 의제와 측정 지표 확정`,`6개월 안에 ${region} 성과 사례 축적`,`12개월 안에 전국 확장 가능한 정책 브랜드 완성`],`당내 의사결정층과 확장 유권자`,`${region}에서 검증된 ${topTopic} 리더십`,['당내 정책 네트워크','지역 성과 보고','전국 의제 포럼']]
  };
  return rows[id];
}

function makePrescriptions(person,diagnoses,input){
  const byId=new Map(diagnoses.map(item=>[item.id,item])),news=input.newsNarrative,topTopic=news.topics[0]?.label||'정치 활동',secondTopic=news.topics[1]?.label||clean(person.committee)||'지역·현장',cohorts=list(input.cohorts).flatMap(row=>[{label:`${row.age} 남성`,value:row.male},{label:`${row.age} 여성`,value:row.female}]).sort((a,b)=>b.value-a.value),strongAge=cohorts[0]?.label||'핵심 지지층',weakAge=cohorts.at(-1)?.label||'신규 유입층',region=clean(person.jurisdiction||person.region)||'관할 지역',competitor=list(input.competitors)[0]?.name||`동일 직군 ${person.region||'지역'} 정치인`;
  const ctx={person,topTopic,secondTopic,strongAge,weakAge,region,competitor};
  const expectedImpactFor=id=>({
    '01':`${topTopic} 키워드가 ${person.name}의 대표 이미지로 정착하고 정책 이미지 연결도가 상승한다.`,
    '02':`${strongAge} 결집을 유지하면서 ${weakAge} 반응 격차가 축소된다.`,
    '03':`${region} 현안에서 ${person.name}의 실행 성과 언급 비중이 높아진다.`,
    '04':`핵심층의 방어 반응이 적극 지지로 바뀌고 유동층 확장 폭이 커진다.`,
    '05':`${competitor} 대비 정책·지역 성과 격차가 줄고 비교 프레임의 주도권을 확보한다.`,
    '06':`부정 프레임의 재점화 속도가 낮아지고 사실·조치 중심 보도가 늘어난다.`,
    '07':`외부 기사 중심 노출이 본인 원문과 후속 결과 중심의 검색 서사로 이동한다.`,
    '08':`${region} 경합 영역의 조직·정책 반응이 개선되고 자원 낭비가 줄어든다.`,
    '09':`${topTopic}의 긍정 반응과 이행 근거가 함께 축적돼 대표 정책 소유권이 강화된다.`,
    '10':`${region} 성과와 전국 확장 의제가 단계별로 축적돼 다음 정치 역할의 명분이 선명해진다.`
  }[id]);
  const rows=PRESCRIPTION_META.map(([id,title,type,linkedDiagnosisIds])=>{
    const linked=linkedDiagnosisIds.map(key=>byId.get(key)),average=Math.round(linked.reduce((sum,item)=>sum+item.score,0)/linked.length),[judgment,actions,target,messageDirection,channels]=prescriptionContent(id,ctx);
    const timing=id==='06'?'0~6시간 · 24시간 · 72시간 · 7일':id==='08'?'30일 · 60일 · 90일':id==='10'?'3개월 · 6개월 · 12개월 · 24개월':id==='01'||id==='03'?'즉시 착수 · 30일 집중 운영':'즉시 착수 · 30일 · 90일 점검';
    const visualData={items:actions.map((label,index)=>({label,value:[100,67,34][index]||34})),stages:timing.split(' · '),axes:{impact:clamp(100-average),feasibility:clamp(average)}};
    const diagnosisBasis=linked.map(item=>`${item.id} · ${item.headline}`),sourceFindings=unique(linked.flatMap(item=>list(item.factEvidence).map(row=>clean(row.statement)))).slice(0,6),evidenceIds=unique(linked.flatMap(item=>item.evidenceIds||[])),monitoringIndicators=[...MONITORING_BY_TOPIC[id]];
    return {id,linkedDiagnosisIds,sourceFindings:sourceFindings.length?sourceFindings:diagnosisBasis,diagnosisBasis,title,objective:`${person.name}의 ${linked.map(item=>item.title.replace(/ 진단| 분석/g,'')).join('·')} 결과를 실행 가능한 변화로 전환`,strategicJudgment:judgment,recommendedActions:actions,actions,targetGroups:[target],target,messageDirection,channels,timing,immediateActions:actions.slice(0,1),actionsWithin30Days:actions.slice(1,2),actionsWithin90Days:actions.slice(2,3),longTermActions:[`분기마다 ${monitoringIndicators[0]}를 재측정하고 전략을 갱신`],priority:'',expectedImpact:expectedImpactFor(id),monitoringIndicators,evidenceIds,visualization:{type,...visualData},updatedAt:clean(input.snapshot)||'2026-09-03',algorithmVersion:input.algorithmVersion,urgency:clamp(100-average+(id==='06'?12:0))};
  });
  const ranked=[...rows].sort((a,b)=>b.urgency-a.urgency||a.id.localeCompare(b.id)),groups={immediate:ranked.slice(0,3).map(item=>item.id),days30:ranked.slice(3,6).map(item=>item.id),days90:ranked.slice(6,8).map(item=>item.id),longTerm:ranked.slice(8,10).map(item=>item.id)};
  const labels=new Map([...groups.immediate.map(id=>[id,'즉시 실행']),...groups.days30.map(id=>[id,'30일 이내']),...groups.days90.map(id=>[id,'90일 관리']),...groups.longTerm.map(id=>[id,'중장기 축적'])]);
  return {prescriptions:rows.map(({urgency,...row})=>({...row,priority:labels.get(row.id)})),priorities:groups};
}

export function buildDiagnosisAndPrescription(person,input={}){
  const diagnoses=makeDiagnoses(person,input),sorted=[...diagnoses].sort((a,b)=>b.score-a.score),prescriptionResult=makePrescriptions(person,diagnoses,input);
  const diagnosisSummary={strongestAsset:`${person.name}의 가장 강한 정치 자산은 ${sorted[0].title}의 ${input.newsNarrative.topics[0]?.label||'현재 역할'} 축이다.`,structuralWeakness:`가장 큰 구조적 취약점은 ${sorted.at(-1).title}의 ${sorted.at(-1).risk}`,growthVariable:`향후 성장을 좌우할 변수는 ${sorted[1].title}과 ${sorted.at(-2).title}의 격차를 줄이는 속도다.`,strongIds:sorted.slice(0,3).map(item=>item.id),managementIds:sorted.slice(-3).reverse().map(item=>item.id)};
  return {diagnoses,prescriptions:prescriptionResult.prescriptions,diagnosisSummary,prescriptionPriorities:prescriptionResult.priorities};
}
