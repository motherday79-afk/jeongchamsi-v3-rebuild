import { factsForTopic } from './intelligence-facts.js';

const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values.filter(Boolean))];
const termsCount=value=>{const match=clean(value).match(/(\d+)선/);return match?Number(match[1]):/초선/.test(clean(value))?1:/재선/.test(clean(value))?2:1;};
const first=(facts,pattern)=>facts.find(row=>pattern.test(`${row.type} ${row.statement}`));
const short=value=>clean(value).split(/[.!?。]/)[0].slice(0,180);
const statement=(fact,fallback)=>short(fact?.statement||fallback);
const issueLabel=fact=>short(fact?.label||fact?.statement||'현재 정치 활동');

function evidenceRoute(facts,topicId,preferred=[],usage=new Map(),fallback=[]){
  const topic=factsForTopic(facts,topicId),ordered=[];
  const available=row=>row&&!ordered.includes(row)&&(usage.get(row.id)||0)<2;
  for(const pattern of preferred){const hit=topic.find(row=>pattern.test(`${row.type} ${row.statement}`)&&available(row));if(hit)ordered.push(hit);}
  for(const row of topic)if(available(row))ordered.push(row);
  for(const row of fallback)if(ordered.length<3&&available(row))ordered.push(row);
  const selected=ordered.slice(0,3);
  for(const row of selected)usage.set(row.id,(usage.get(row.id)||0)+1);
  return selected;
}

export function inferPoliticalStates(person,input={}){
  const facts=list(input.facts),news=input.newsNarrative||{},name=clean(person?.name)||'정치인',region=clean(person?.jurisdiction||person?.region)||'관할 지역',party=clean(person?.party)||'무소속',career=clean(person?.terms)||'공식 경력',role=clean(person?.office||person?.roleLabel)||'현재 역할',terms=termsCount(career);
  const typed=(type,pattern)=>facts.find(row=>row.type===type)||first(facts,pattern),legal=typed('legal',/1심|2심|3심|대법원|벌금|기소|수사|직 상실|소송/),election=typed('election',/득표|초접전|격차|당선|낙선|후보/),policy=typed('policy',/주택|교통|철도|예산|민생|경제|복지|교육|착공|공급/),organization=typed('organization',/의회|의석|여소야대|지도부|조직/),crisis=typed('crisis',/논란|비판|반발|왜곡|망언|도발|상실/),competitor=typed('competitor',/비교 기준 정치인/),media=typed('media',/대표 뉴스/),search=typed('search',/검색 보조 신호/),profile=typed('career',/공식 정치 경력/),local=typed('local',/정치 기반/);
  const negative=Number(news?.frameSummary?.negative)||facts.filter(row=>row.direction==='negative').length,positive=Number(news?.frameSummary?.positive)||facts.filter(row=>row.direction==='positive').length,top=clean(news?.topics?.[0]?.label)||issueLabel(policy||crisis),external=Number(news?.agencySummary?.external)||0,led=Number(news?.agencySummary?.led)||0;
  const isMay18=facts.some(row=>/5\s*[.·]?\s*18/.test(row.statement)),mainIssue=isMay18?'5·18 역사 인식':issueLabel(crisis||legal||policy||facts.find(row=>row.type==='news'));
  const rivalName=clean(list(input.competitors)[0]?.name)||clean(competitor?.statement.match(/비교 기준 정치인은\s*([^이며]+)/)?.[1])||'동일 직군 경쟁자';
  const groupStrong=/국민의힘|개혁신당/.test(party)?'2030세대':/민주|조국|진보/.test(party)?'4050세대':'핵심 반응층';
  const groupRisk=/국민의힘|개혁신당/.test(party)?'4050세대 이상':/민주|조국|진보/.test(party)?'2030세대':'확장 유권자층';
  const policyFact=statement(policy,`${name}의 최근 대표 정책 보도는 확인된 기사 범위에서 뚜렷하지 않다`),legalFact=statement(legal,`${name}에게 현재 확인된 직접 법적 사건 보도는 없다`),electionFact=statement(election,`${name}의 현재 선거 경쟁 기준은 ${region} 기반과 ${career} 경력이다`),orgFact=statement(organization,`${name}은 ${party} 소속 ${role} 구조 안에서 활동한다`),mediaFact=statement(media,`${name}의 최근 대표 뉴스는 ${facts.filter(row=>row.type==='news').length}건이다`),searchFact=statement(search,`${name}의 검색 보조 신호는 수집값을 기준으로 본다`),careerFact=statement(profile,`${name}의 공식 경력은 ${career}다`),localFact=statement(local,`${name}의 정치 기반은 ${region}이다`);
  const rows={
    '01':{state:negative>positive?'known-brand-under-pressure':policy?'policy-brand-with-risk':'career-brand',headline:negative>positive?`${mainIssue} 관련 논란·위기 프레임이 ${name}의 대표 이미지를 압박한다.`:`${career} 경력과 ${top} 의제가 ${name}의 대표 이미지를 만든다.`,judgment:`${careerFact}. ${negative>positive?`${mainIssue} 관련 부정 프레임이 정책과 성과 이미지보다 앞서 브랜드 신뢰를 떨어뜨리고 있다`:`${policyFact}. 이 정책 보도가 경력 인지도와 결합해 대표 브랜드로 축적되는 구간이다`}.`,opportunity:`${career} 인지도를 ${policy?issueLabel(policy):top}의 구체적 성과와 결합하면 인물 기억을 정책 성과로 바꿀 수 있다.`,risk:`${crisis?issueLabel(crisis):mainIssue} 관련 보도가 반복되면 ${career} 경력보다 논란이 먼저 기억된다.`,preferred:[/career/,/crisis|legal|policy/,/media/]},
    '02':{state:negative?'cohort-polarized':'cohort-expansion-test',headline:`${groupStrong} 결집과 ${groupRisk} 확장 여부가 갈리는 구간이다.`,judgment:`${party} 지지구조와 ${mainIssue} 반응을 함께 보면 ${groupStrong}에는 결속 신호로, ${groupRisk}에는 거부 또는 확장 위험으로 작용한다. ${searchFact}.`,opportunity:/국민의힘|개혁신당/.test(party)?`해당 아젠다는 지역 갈라치기의 문제로 번지고 있으며, 2030세대에게는 결속을, 4050세대 이상에게는 위험 신호로 작용하고 있다.`:`${mainIssue} 관련 반응은 ${groupStrong}의 결집 의제로 사용할 수 있으며, 반응이 강한 검색 채널에서 지지 이유를 명확히 만들 수 있다.`,risk:`${groupRisk}에서 ${mainIssue} 관련 반응이 인물 전체에 대한 거부로 굳으면 세대 확장이 막힌다.`,preferred:[/profile-region|search/,/crisis|policy/,/media/]},
    '03':{state:policy&&/local|서울|부산|대구|지역/.test(`${policy.type} ${policy.statement}`)?'local-policy-fit':negative?'national-issue-over-local':'local-base-unproven',headline:policy?`${region} 기반과 ${issueLabel(policy)} 성과를 직접 연결할 수 있다.`:`${region} 기반에 비해 지역 성과의 뉴스 증거가 약하다.`,judgment:`${localFact}. ${policy?`${policyFact}를 지역의 수혜 대상·일정·결과로 증명할 때 지역 메시지가 완성된다`:`최근 대표 보도에서 ${region} 주민이 확인할 정책 수치가 없어 공식 지역 기반이 성과 평가로 전환되지 못했다`}.`,opportunity:policy?`${issueLabel(policy)}의 수혜 지역과 완료 시점을 공개하면 ${region} 의제를 선점할 수 있다.`:`${region}에서 완료된 예산·민원·입법 한 건을 대표 지역 성과로 고정할 수 있다.`,risk:`전국 이슈가 ${region} 실행 결과보다 앞서면 지역 대표성 평가가 정당 소속과 인지도에만 남는다.`,preferred:[/local/,/policy/,/crisis/]},
    '04':{state:negative?'core-mobilized-expansion-blocked':'support-conversion',headline:negative?'핵심층 방어는 강해져도 외연 확장은 좁아진다.':'정당 기반을 성과 지지층으로 전환할 수 있다.',judgment:`${party} 소속과 ${career} 경력은 핵심 지지층의 결속 자산이다. ${negative?`${mainIssue} 관련 이슈는 방어 결집을 만들지만 이것을 전체 유권자 확대로 해석할 수 없다`:`${policyFact}. 같은 정책 성과가 반복되면 정당 지지를 인물 성과 지지로 넓힐 수 있다`}.`,opportunity:`${party} 핵심층에 ${career}의 성과 근거를 다시 제시하면 방어 반응을 적극 지지로 전환할 수 있다.`,risk:`핵심층 반응을 전체 민심으로 판단하면 ${groupRisk}의 이탈 신호를 놓치게 된다.`,preferred:[/career/,/profile-region/,/crisis|policy/]},
    '05':{state:election?'measured-rival-gap':'structural-peer-gap',headline:election?`${rivalName}와의 실제 격차가 경쟁 전략의 출발점이다.`:`${rivalName}와 경력·지역·정책 증거를 같은 기준으로 비교해야 한다.`,judgment:`${electionFact}. ${competitor?statement(competitor,`${rivalName}가 직접 비교 기준이다`):`${rivalName}의 공식 구조를 비교 기준으로 삼는다`}. 관심량이 아니라 득표·정책·조직의 실제 격차로 우열을 판단해야 한다.`,opportunity:policy?`${issueLabel(policy)}의 수치와 완료 시점을 먼저 증명하면 ${rivalName}보다 정책 실행력 비교를 선점할 수 있다.`:`${rivalName}보다 먼저 지역 성과를 정량화하면 비교 기준 자체를 바꿀 수 있다.`,risk:election?`확인된 접전 격차를 인지도 우세로 오판하면 ${rivalName}의 추격 또는 역전 신호를 놓친다.`:`경쟁자의 정책·지역 성과가 먼저 수치화되면 ${career} 경력 우위가 약해진다.`,preferred:[/election/,/competitor/,/policy|career/]},
    '06':{state:legal?'legal-office-risk':negative?'persistent-crisis':'low-direct-risk',headline:legal?`${issueLabel(legal)} 관련 법적 사건은 직책 지속성과 직접 연결된 위기다.`:negative?`${mainIssue} 부정 프레임이 장기화될 위험이 있다.`:'직접 법적 위기보다 발언·정책 검증을 선제 관리할 단계다.',judgment:isMay18?`${legalFact}. 이번 5·18 역사 인식 사안은 손해배상 청구로 법적 분쟁 단계에 들어갔고 추가 당사자 발언 때마다 재점화될 수 있다.`:`${legalFact}. ${legal?`재판 단계와 확정 여부를 구분하되 ${role} 유지 가능성까지 연결된 사건이므로 가장 먼저 대응해야 한다`:`현재 직접 법적 사건보다 ${mainIssue}의 반복 여부가 위기 단계를 결정한다`}.`,opportunity:legal?'재판 단계, 사실관계, 직책 영향 조건을 한 문서로 공개하면 추측 보도의 범위를 줄일 수 있다.':'논란이 고착되기 전에 사실관계와 책임 주체를 공개하면 위기 프레임의 시작점을 차단할 수 있다.',risk:legal?`${issueLabel(legal)} 관련 사건이 상급심 또는 확정 단계로 진행되면 ${role} 수행 능력과 정치적 생존이 동시에 흔들린다.`:`${mainIssue} 대응이 늦어지면 정책 평가보다 인물 자격 논란이 먼저 남는다.`,preferred:[/legal/,/crisis/,/media/]},
    '07':{state:external>led?'external-narrative-dominant':negative>positive?'crisis-attention':'owned-attention',headline:`언론·온라인 주도권은 ${external>led?'외부 보도':'본인 정책 메시지'}에 있다.`,judgment:`${mediaFact}. ${searchFact}. 뉴스 노출의 주도권은 ${external>led?`본인이 아니라 외부 사건 보도에 있다`:`본인이 공개한 ${top} 정책 메시지에 있다`}.`,opportunity:`${issueLabel(policy||crisis||media)} 원문과 후속 결과를 같은 날 공개하면 기사 제목 이후의 검색 서사를 직접 선점할 수 있다.`,risk:`외부 기사 제목이 공식 설명보다 반복되면 검색 결과가 ${mainIssue} 중심으로 고착된다.`,preferred:[/media/,/search/,/crisis|policy/]},
    '08':{state:legal?'electoral-asset-under-legal-risk':organization?'organization-constrained':'structural-campaign-base',headline:legal?'선거 자산은 있으나 법적 위험이 후보 지속성을 압박한다.':organization?'개인 경쟁력과 조직·의회 제약을 따로 계산해야 한다.':`${region} 기반과 ${career} 경력이 캠페인 기본 자산이다.`,judgment:`선거 경쟁력 기준에서 ${electionFact}. ${orgFact}. ${legal?`${legalFact} 때문에 인지도와 경력이 득표 경쟁력으로 온전히 전환되지 않는다`:`${region} 기반의 우세·경합·취약 영역을 조직과 정책 반응으로 분리해야 한다`}.`,opportunity:`${region} 기반과 ${career} 경력을 결집 자원으로 고정하고 ${policy?issueLabel(policy):top} 성과를 경합층 확장에 집중할 수 있다.`,risk:`${legal?issueLabel(legal):issueLabel(organization||crisis)} 관련 사건이 캠페인 중심 의제가 되면 중도층 확장과 조직 동원이 동시에 약해진다.`,preferred:[/election/,/organization|profile-region/,/legal|policy/]},
    '09':{state:policy?'quantified-policy-needs-proof':'policy-ownership-empty',headline:policy?`${issueLabel(policy)} 관련 의제는 대표 정책으로 자리 잡을 조건을 갖췄다.`:'대중이 기억할 대표 정책의 수치와 결과가 비어 있다.',judgment:`${policyFact}. ${policy?`${top} 의제를 대표 정책으로 고정하고 발표 수치가 실제 착공·집행·수혜 결과로 이어지는지를 공개해야 정책 소유권이 ${name}에게 남는다`:`최근 기사에서 비용·기한·수혜 대상이 확인되는 대표 공약이 없어 정책 반응을 인물 평가와 분리하기 어렵다`}.`,opportunity:policy?`${issueLabel(policy)}의 월별 이행률과 실제 수혜 사례를 공개하면 정책 발표를 성과 지지로 바꿀 수 있다.`:`${region} 생활 문제 한 가지를 비용·기한·수혜 대상까지 갖춘 대표 공약으로 선점할 수 있다.`,risk:policy?`${issueLabel(policy)}의 일정이 지연되거나 결과 수치가 없으면 경쟁자가 실현 가능성 문제를 공격한다.`:'대표 정책이 비어 있으면 이후의 관심도도 발언과 정쟁 이미지로만 소비된다.',preferred:[/policy/,/local/,/media/]},
    '10':{state:legal?'survival-before-growth':terms>=3?'experienced-next-stage':'foundation-building',headline:legal?'중장기 성장보다 직책 유지와 신뢰 회복이 먼저다.':terms>=3?`${career} 경력에 맞는 다음 정치 단계의 명분이 필요하다.`:'첫 임기의 대표 성과가 다음 정치 단계를 결정한다.',judgment:`${careerFact}. ${legal?`${legalFact} 때문에 현재는 외연 확대보다 법적 위험 해소와 신뢰 회복이 성장의 선결 조건이다`:`${policy?policyFact:`${region}에서 확인되는 대표 성과를 만드는 일`}이 다음 역할로 이동할 명분을 결정한다`}. ${terms===1?'초선 임기에는 논란 방어와 별개로 대표 정책 성과를 반드시 남겨야 한다.':''}`,opportunity:`${career} 경력과 ${policy?issueLabel(policy):region} 성과를 장기 기록으로 묶으면 다음 정치 목표의 명분을 만들 수 있다.`,risk:`${legal?issueLabel(legal):mainIssue} 관련 문제가 해결되지 않으면 ${career} 경력이 성장 자산이 아니라 책임 평가의 기준으로 바뀐다.`,preferred:[/career/,/legal|policy/,/election|organization/]}
  };
  const negativeImpact={
    '01':'대표 이미지 신뢰','02':`${groupRisk} 확장`,'03':`${region} 지역성과`,'04':'핵심층 밖 지지 확장','05':`${rivalName}와의 비교 우위`,'06':`${role} 지속 가능성`,'07':'검색 결과의 서사 주도권','08':'중도층 득표 경쟁력','09':'대표 정책의 신뢰','10':'다음 정치 단계의 명분'
  };
  const positions={
    '01':`${name}의 현재 브랜드는 ${career} 경력 위에 ${negative>positive?mainIssue:top} 이미지가 가장 강하게 올라와 있다.`,
    '02':`${groupStrong} 반응이 현재 결집축이고 ${groupRisk} 반응이 외연 확장의 취약 구간이다.`,
    '03':`${name}은 ${region} 기반을 보유했지만 지역 평가의 중심은 ${policy?issueLabel(policy):'확인 가능한 지역 성과'}에 달려 있다.`,
    '04':`${party} 기반과 ${career} 경력이 핵심층 결속을 만들고 있으며 확장층과의 간격이 남아 있다.`,
    '05':`${name}의 직접 비교 기준은 ${rivalName}이며 현재 우열은 경력보다 지역·정책·조직의 실제 격차에서 갈린다.`,
    '06':legal?`${issueLabel(legal)} 사안이 ${role} 수행과 정치적 신뢰를 동시에 압박하는 위기 구간이다.`:`${mainIssue} 프레임이 반복 보도될 경우 인물 평가 전체로 번질 수 있는 주의 구간이다.`,
    '07':`${name} 관련 대표 뉴스 ${Number(news?.items?.length)||facts.filter(row=>row.type==='news').length}건의 서사 주도권은 ${external>led?'외부 보도':'본인 메시지'}에 있다.`,
    '08':`${region} 기반과 ${career} 경력은 선거 자산이지만 ${legal?'법적 위험':'조직·정책 전환력'}이 실제 득표 확장의 제약이다.`,
    '09':policy?`${issueLabel(policy)} 의제가 대표 정책 후보로 노출되고 있으나 실행 결과까지 연결해야 한다.`:`${name}에게 대중이 즉시 떠올릴 대표 정책의 수치와 결과가 아직 선명하지 않다.`,
    '10':`${name}은 ${career} 경력에 맞는 다음 정치 단계의 명분을 성과와 신뢰로 증명해야 하는 위치다.`
  };
  const meanings={
    '01':negative>positive?`${mainIssue} 관련 이슈가 정책·성과보다 먼저 기억되면 높은 인지도도 브랜드 신뢰 하락으로 바뀐다.`:`${top} 의제가 경력과 함께 기억되면 인지도는 대표 정책을 가진 정치인이라는 평가로 전환된다.`,
    '02':`${groupStrong} 결집은 단기 동원이 되지만 ${groupRisk} 거부가 굳으면 전국 단위 확장과 중도 경쟁력이 약해진다.`,
    '03':`${region} 유권자가 확인할 수 있는 수혜 대상·일정·결과가 없으면 지역 기반은 정당 지지 이상의 개인 경쟁력이 되지 못한다.`,
    '04':`핵심층의 방어 반응을 전체 민심으로 오판하면 우호층과 유동층의 이탈을 뒤늦게 발견하게 된다.`,
    '05':`${rivalName}보다 먼저 정책과 지역 성과를 수치화한 정치인이 비교의 기준과 공격 주도권을 가져간다.`,
    '06':legal?`${legalFact}. 법적 절차가 장기화되면 ${role} 지속 능력과 정치적 자격이 동시에 평가받는다.`:`초기 대응이 늦어지면 ${mainIssue}는 단일 논란에서 반복 가능한 인물 검증 프레임으로 확대된다.`,
    '07':`뉴스 노출이 커져도 외부 기사 제목이 검색 결과를 장악하면 영향력은 상승하고 메시지 통제력은 하락한다.`,
    '08':`관심도와 경력은 출발 자산일 뿐이며 지역 조직·정책 반응·중도 확장이 연결되지 않으면 득표 경쟁력으로 환산되지 않는다.`,
    '09':policy?`${policyFact}. 발표 내용이 착공·집행·수혜 사례로 확인될 때만 정책 소유권이 ${name}에게 남는다.`:`대표 정책이 비어 있으면 이후의 관심도는 발언과 정쟁 이미지로 소비된다.`,
    '10':`${career} 경력 이후에도 다음 역할의 이유가 분명하지 않으면 경력은 성장 자산이 아니라 성과 검증의 기준으로 바뀐다.`
  };
  const interpretations={
    '01':[`${career} 경력은 인지도의 기반이다.`,negative>positive?`${mainIssue} 관련 부정 노출을 정책·성과 서사보다 먼저 정리해야 브랜드 회복이 가능하다.`:`${top} 성과를 반복 가능한 대표 이미지로 고정할 시점이다.`],
    '02':[`${party} 지지구조는 ${groupStrong} 결집에 유리하다.`,`${groupRisk} 반응을 회복하지 못하면 현재 관심은 진영 내부 소비에 머문다.`],
    '03':[`${region} 기반은 이미 확보돼 있다.`,policy?`${issueLabel(policy)}를 지역 주민의 실제 수혜와 완료 시점으로 바꿔 제시해야 지역 대표성이 강화된다.`:`지역에서 완료된 예산·민원·입법 성과를 하나의 대표 기록으로 먼저 만들어야 한다.`],
    '04':[`${party} 기반과 ${career} 경력은 핵심 지지층 결집의 방어력을 높인다.`,`이 결집을 우호·유동층 확장으로 바꾸려면 논란 방어가 아니라 확인 가능한 성과가 필요하다.`],
    '05':[`경쟁 정치인 ${rivalName}와의 비교 우위는 동일한 지역·정책·조직 기준으로 판단해야 한다.`,`노출량이 아니라 실행 결과의 격차를 먼저 공개하는 쪽이 경쟁 프레임을 선점한다.`],
    '06':[legal?(isMay18?'5·18 역사 인식 사안은 손해배상 청구로 법적 분쟁 단계에 들어간 현재 가장 시급한 위험 근거다.':`${legalFact}. 이 사건은 현재 가장 시급한 위험 근거다.`):`${mainIssue} 반복 여부가 위기 수준을 결정한다.`,`사실관계·책임 주체·후속 조치를 하나의 순서로 공개해야 부정 프레임의 확산을 끊을 수 있다.`],
    '07':[`대표 뉴스 노출과 검색 유입을 함께 보면 현재 서사 주도권은 ${external>led?'외부 기사 제목':'본인 정책 메시지'}에 있다.`,`${mediaFact}. ${searchFact}. 공식 메시지가 기사 제목보다 먼저 검색 서사를 차지해야 한다.`],
    '08':[`${electionFact}. 이는 선거 경쟁력의 기본 자산이다.`,`${orgFact}. 이 조직 구조와 정책 반응을 함께 봐야 우세·경합·취약 영역을 실제 자원 배분으로 바꿀 수 있다.`],
    '09':[policy?`${top} 의제는 대표 정책 후보를 보여준다. ${policyFact}.`:`현재 기사 범위에서는 대표 정책의 수치와 결과가 선명하지 않다.`,`비용·기한·수혜 대상을 공개하고 이후 이행 결과까지 추적해야 정책 지지가 유지된다.`],
    '10':[`${careerFact}는 다음 단계의 출발 자산이다.`,`${region}에서 검증된 대표 성과와 전국 확장 가능한 의제를 순서대로 축적해야 다음 역할의 명분이 생긴다.`]
  };
  const opportunities={
    '01':`${career} 인지도를 ${top}의 구체적 성과와 결합하면 대표 이미지를 정책 성과로 다시 고정할 수 있다.`,
    '02':/국민의힘|개혁신당/.test(party)?'해당 아젠다는 지역 갈라치기의 문제로 번지고 있으며, 2030세대에게는 결속을, 4050세대 이상에게는 위험 신호로 작용하고 있다.':`${groupStrong} 결집을 유지하면서 ${groupRisk}에 생활 의제와 직접 수혜를 제시하면 세대 확장 통로를 만들 수 있다.`,
    '03':`${region}의 예산·일정·수혜 대상을 공개하면 지역 대표 의제의 소유권을 선점할 수 있다.`,
    '04':`${party} 핵심층에 ${career}의 성과 근거를 재제시하면 방어 반응을 적극 지지와 참여로 바꿀 수 있다.`,
    '05':`${rivalName}보다 먼저 지역·정책 결과를 동일 기준으로 공개하면 비교의 기준 자체를 선점할 수 있다.`,
    '06':legal?'재판 단계·사실관계·직책 영향 조건을 한 문서로 공개하면 추측 보도의 범위를 줄일 수 있다.':'논란이 고착되기 전에 사실과 조치를 공개하면 위기 프레임의 시작점을 차단할 수 있다.',
    '07':`현재 뉴스와 검색 유입을 공식 설명·원문·후속 결과로 연결하면 외부 보도를 본인 주도 서사로 전환할 수 있다.`,
    '08':`${region} 기반과 ${career} 경력을 조직 동원에 고정하고 경합층에는 정책 성과를 집중할 수 있다.`,
    '09':policy?`${issueLabel(policy)}의 이행률과 실제 수혜 사례를 공개하면 정책 발표를 성과 지지로 바꿀 수 있다.`:`${region} 생활 문제 하나를 비용·기한·수혜 대상이 분명한 대표 공약으로 선점할 수 있다.`,
    '10':`${career} 경력과 ${region} 성과를 장기 기록으로 묶으면 다음 정치 목표의 명분을 만들 수 있다.`
  };
  const risks={
    '01':`${mainIssue} 이미지가 굳으면 경력과 정책 성과가 대중 평가에서 뒤로 밀린다.`,
    '02':`${groupRisk}의 반응이 인물 자체에 대한 거부로 굳으면 세대 확장이 막힌다.`,
    '03':`전국 이슈가 ${region}의 실행 결과를 계속 가리면 지역을 위해 한 일이 없다는 평가가 남는다.`,
    '04':`핵심층 결집을 전체 민심으로 판단하면 우호층과 유동층의 이탈 신호를 놓친다.`,
    '05':`${rivalName}가 구체적인 지역·정책 결과를 먼저 제시하면 현재의 경력 우위는 빠르게 약해진다.`,
    '06':legal?`${issueLabel(legal)} 절차가 상급심이나 확정 단계로 진행되면 ${role} 수행과 정치적 생존이 동시에 흔들린다.`:`${mainIssue} 대응을 미루면 정책 평가보다 정치적 자격 문제가 먼저 남는다.`,
    '07':`공식 메시지보다 외부 기사 제목이 반복되면 검색 결과 전체가 ${mainIssue} 중심으로 고착된다.`,
    '08':`${legal?issueLabel(legal):issueLabel(organization||crisis)}가 선거 중심 의제가 되면 중도 확장과 조직 동원이 동시에 약해진다.`,
    '09':policy?`${issueLabel(policy)}의 일정이 지연되거나 결과 수치가 없으면 실현 가능성이 직접 공격받는다.`:'대표 정책이 비어 있으면 이후 관심도도 발언과 정쟁 이미지로만 소비된다.',
    '10':`${mainIssue} 문제가 장기화되면 ${career} 경력이 성장 자산이 아니라 책임 평가의 기준으로 바뀐다.`
  };
  const fallbackEvidence={
    '01':[['경력·직책',`${careerFact}.`],['대표 이미지',positions['01']]],
    '02':[['정당·세대 구조',`${party} 지지구조에서 ${groupStrong}과 ${groupRisk}의 반응 방향을 구분한다.`],['관심 유입 경로',`${searchFact}.`]],
    '03':[['지역 기반',`${localFact}.`],['지역 성과 기준',`${region}의 수혜 대상·일정·결과를 평가 기준으로 삼는다.`]],
    '04':[['결집 기반',`${party} 소속과 ${career} 경력이 핵심층 결속의 구조적 기반이다.`],['확장 대상',`${groupRisk} 반응이 외연 확장의 핵심 변수다.`]],
    '05':[['직접 비교 기준',`${rivalName}의 지역·경력·정책 결과를 동일 기준으로 비교한다.`],['선거 구조',`${electionFact}.`]],
    '06':[['위기 사건',`${legal?legalFact:`${mainIssue} 반복 노출`}.`],['위기 영향',`${role} 지속성과 정치적 신뢰에 미치는 영향을 구분한다.`]],
    '07':[['언론 분포',`${mediaFact}.`],['검색 유입',`${searchFact}.`]],
    '08':[['선거 기반',`${electionFact}.`],['조직 구조',`${orgFact}.`]],
    '09':[['정책 근거',`${policyFact}.`],['정책 검증',`비용·기한·수혜 대상과 실제 이행 결과를 확인한다.`]],
    '10':[['성장 자산',`${careerFact}.`],['다음 단계 조건',`${region} 성과와 전국 확장 의제가 다음 역할의 명분을 결정한다.`]]
  };
  const usage=new Map();
  return Object.entries(rows).map(([id,row])=>{
    const derived=(fallbackEvidence[id]||[]).map(([label,value],index)=>({id:`derived-${person?.id||name}-${id}-${index}`,type:'structural',label,statement:clean(value),direction:'neutral',topicIds:[id],sourceId:`profile-${person?.id||name}`,sourceTitle:'공식 프로필·JCS 구조 분석',sourceUrl:'',date:'',basis:'derived'}));
    const evidence=evidenceRoute(facts,id,row.preferred,usage,derived),politicalMeaning=negative>positive?`${meanings[id]} ${mainIssue}의 부정 프레임은 ${negativeImpact[id]}에 직접적인 부담을 만든다.`:meanings[id];
    return {id,state:row.state,headline:row.headline,currentPosition:positions[id],judgment:row.judgment,politicalMeaning,interpretation:interpretations[id],opportunity:opportunities[id],risk:risks[id],evidenceIds:unique(evidence.map(item=>item.id)),evidence};
  });
}
