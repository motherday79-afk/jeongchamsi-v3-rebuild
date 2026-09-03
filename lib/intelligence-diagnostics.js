export const POLITICAL_DIAGNOSIS_TOPICS=Object.freeze([
  ['01','정치인 브랜드 진단','positioning-matrix'],['02','세대·성별 지지구조 분석','cohort-diverging'],['03','지역구 민심·메시지 진단','issue-fit-bars'],['04','핵심 지지층 결집도 분석','support-stack'],['05','경쟁 정치인 비교 분석','competitor-heatmap'],['06','이슈·위기 위험도 진단','risk-matrix'],['07','언론·온라인 영향력 분석','narrative-timeline'],['08','선거·캠페인 경쟁력 진단','campaign-matrix'],['09','정책·공약 반응 분석','policy-heatmap'],['10','중장기 정치 성장 진단','growth-gap']
]);

const PRESCRIPTION_META=Object.freeze([
  ['01','정치인 브랜드 전략 처방','message-pyramid',['01','07','09']],['02','세대·성별 타깃 전략 처방','target-matrix',['02','04','09']],['03','지역구 메시지 전략 처방','local-playbook',['03','07','09']],['04','지지층 결집·확장 전략 처방','support-flow',['02','04','08']],['05','경쟁자 대응 전략 처방','response-matrix',['05','06','08']],['06','이슈·위기 대응 전략 처방','crisis-timeline',['01','06','07']],['07','언론·온라인 확산 전략 처방','propagation-flow',['01','07','09']],['08','선거·캠페인 데이터 전략 처방','resource-allocation',['03','04','08']],['09','정책·공약 반응 전략 처방','policy-quadrant',['01','03','09']],['10','중장기 정치 성장 전략 처방','growth-timeline',['01','08','10']]
]);

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
  const {person,topTopic,secondTopic,strongAge,weakAge,competitor,roleTitle,region,committee,score}=ctx;
  const copy={
    '01':{headline:`${topTopic} 이미지가 현재 대표 브랜드를 주도한다.`,position:`${topicWord(person.name)} ${roleTitle} 이미지와 ${topTopic} 서사가 결합된 ${level(score)}에 있다.`,interpretation:sentences(`최근 뉴스는 ${objectWord(topTopic)} 가장 반복적으로 연결한다.`,`${secondTopic} 노출은 브랜드 외연을 넓히지만 대표 이미지의 집중도는 함께 관리해야 한다.`,`정책 이미지 연결도는 ${ctx.policyLink}%로, 인물 노출을 장기 정치 자산으로 전환하는 정도를 보여준다.`),opportunity:`${objectWord(topTopic)} ${region}의 실행 성과와 결합하면 대표 의제로 축적할 수 있다.`,risk:`서로 다른 의제가 동시에 확대되면 ${person.name}의 대표 이미지가 분산될 수 있다.`},
    '02':{headline:`${strongAge} 반응 기반은 강하고 ${weakAge} 확장 속도는 상대적으로 느리다.`,position:`JCS 세대·성별 반응지수에서 ${subjectWord(strongAge)} 결집축, ${subjectWord(weakAge)} 확장축으로 나타난다.`,interpretation:sentences(`${region} 인구구조와 ${person.party}의 기본 반응, ${topTopic} 의제의 세대 이해관계를 함께 반영했다.`,`남녀 반응 차이는 공식 지지율이 아니라 구조·의제 기반 JCS 상대지수다.`,`결집 대상과 확장 대상을 같은 문장으로 다루기보다 이해관계별로 구분해야 하는 상태다.`),opportunity:`${weakAge}의 생활 의제와 ${objectWord(topTopic)} 연결하면 외연 확장 여지가 커진다.`,risk:`${strongAge} 중심 메시지가 고착되면 다른 세대의 접근성이 낮아질 수 있다.`},
    '03':{headline:`${region} 기반은 유지되지만 지역 대표 의제의 집중도가 승부를 가른다.`,position:`${committee} 활동과 ${topTopic} 뉴스가 지역 메시지의 핵심 축을 형성한다.`,interpretation:sentences(`${person.jurisdiction||region}에서 체감 가능한 의제와 전국 정치 메시지의 연결도를 진단했다.`,`${topicWord(topTopic)} 현재 선점 가능성이 가장 높은 지역 메시지다.`,`${topicWord(secondTopic)} 지역 활동 증거가 뒤따를 때 보조 자산으로 기능한다.`),opportunity:`${objectWord(topTopic)} 일정·예산·수혜대상으로 구체화하면 지역 체감도를 높일 수 있다.`,risk:`전국 정치 이슈가 지역 현안보다 앞서면 지역 대표성이 약해질 수 있다.`},
    '04':{headline:`핵심 지지층 결속과 외연 확장의 속도 차이가 현재 지지구조를 결정한다.`,position:`${person.party} 기반과 ${termsCount(person.terms)}선 경력은 결속 자산이며, ${weakAge} 확장이 다음 변수다.`,interpretation:sentences(`현직 효과와 반복된 정치 경력은 핵심층 안정성을 높인다.`,`${topTopic} 서사의 지속성은 우호층을 실제 지지층으로 전환하는 연결 고리다.`,`관심 변동이 커질수록 유동층 관리의 우선순위가 올라간다.`),opportunity:`우호층에게 ${topTopic}의 후속 성과를 반복 제시하면 결집력이 강화된다.`,risk:`핵심층 언어가 과도해지면 ${companionWord(weakAge)} 유동층의 이탈 가능성이 커진다.`},
    '05':{headline:`${companionWord(competitor)}의 격차는 전체 노출보다 의제 선점과 지역 기반에서 발생한다.`,position:`${topicWord(person.name)} ${topTopic}에서 비교 우위를 만들 수 있고 ${secondTopic}에서는 경합 관리가 필요하다.`,interpretation:sentences(`동일 직군·정당·지역 연관성을 우선해 경쟁 구도를 구성했다.`,`${topTopic}의 주도권은 단기 역전 가능 영역으로 분류된다.`,`${region} 기반과 정치 경력은 단기간에 복제하기 어려운 구조적 자산이다.`),opportunity:`${subjectWord(competitor)} 선점하지 못한 ${topTopic} 실행 증거를 먼저 축적할 수 있다.`,risk:`경쟁자의 프레임에 반응하는 방식이 반복되면 비교 기준을 스스로 잃을 수 있다.`},
    '06':{headline:ctx.negativeShare?`현재 위기 핵심은 노출량보다 반복되는 위험 프레임의 고착 가능성이다.`:`현재 대표 뉴스에서 직접 위기 프레임은 강하지 않으며 반복 위험의 선제 관리가 핵심이다.`,position:`${ctx.riskFrame} 프레임은 ${person.name}의 ${topTopic} 이미지와 충돌할 때 영향이 커진다.`,interpretation:sentences(`부정·논란 뉴스의 반복성과 매체 확산 범위를 함께 반영했다.`,`위험 신호가 ${weakAge}와 유동층에 먼저 작용할 가능성을 고려했다.`,`초기 사실관계와 후속 조치가 분리되면 위기 서사가 장기화될 수 있다.`),opportunity:`초기 대응을 ${topTopic} 성과 증거와 연결하면 방어를 회복 서사로 전환할 수 있다.`,risk:`${ctx.riskFrame} 프레임이 반복되면 정책·성과 노출을 밀어낼 수 있다.`},
    '07':{headline:`뉴스 영향력은 ${objectWord(topTopic)} 중심으로 형성되고 검색은 후속 관심을 확인하는 보조 신호다.`,position:`${ctx.sourceDiversity}개 매체의 대표 뉴스가 ${person.name}의 미디어 서사를 구성한다.`,interpretation:sentences(ctx.newsNarrative.narratives.days30,ctx.newsNarrative.narratives.days90,`검색 관심은 뉴스 노출이 실제 대중 관심으로 이어지는지 확인하는 보조 지표로만 반영했다.`),opportunity:`${topTopic} 보도 뒤 정책 설명과 지역 성과 콘텐츠를 연속 배치할 수 있다.`,risk:`논란 중심 노출이 증가하면 영향력 지수는 높아도 정치 자산의 질은 낮아질 수 있다.`},
    '08':{headline:`선거 경쟁력은 ${region} 기반, 지지층 결속, 브랜드와 정책 연결의 합으로 결정된다.`,position:`JCS 선거경쟁력지수 기준 ${peerPosition(score)}에 있으며 ${subjectWord(topTopic)} 핵심 승부처다.`,interpretation:sentences(`현직 효과, ${termsCount(person.terms)}선 경력, 정당 기반과 지역 메시지를 결합했다.`,`우세·경합·취약 영역을 분리해 자원 집중 지점을 확인한다.`,`이 지수는 당선 확률이 아니라 현재 정치 자산의 상대 위치다.`),opportunity:`${topTopic}의 지역 체감 성과를 만들면 경합 영역을 우세 영역으로 이동시킬 수 있다.`,risk:`${secondTopic} 취약점이 방치되면 경쟁자의 비교 프레임이 강화될 수 있다.`},
    '09':{headline:`${topicWord(topTopic)} 대표 정책 자산으로 연결될 가능성이 가장 높다.`,position:`정책 이미지 연결도 ${ctx.policyLink}%로, ${person.name}의 정책과 인물 이미지가 결합되는 단계다.`,interpretation:sentences(`정책·공약 기록과 관련 뉴스 의제의 반복도를 함께 분석했다.`,`${strongAge}에서는 체감 의제로 작동하고 ${weakAge}에는 설명 방식의 조정이 필요하다.`,`${topicWord(secondTopic)} 경쟁자가 선점하기 전에 정책 언어를 구체화할 영역이다.`),opportunity:`${objectWord(topTopic)} 비용·기한·수혜대상 중심으로 설명하면 대표 정책으로 축적할 수 있다.`,risk:`정책 발표가 정치 공방과 함께 소비되면 정책 자체의 기억률이 낮아질 수 있다.`},
    '10':{headline:`현재 단계에서 다음 정치적 성장으로 이동할 핵심 변수는 ${topTopic}의 장기 자산화다.`,position:`${roleTitle}와 ${termsCount(person.terms)}선 경력을 기반으로 다음 단계 준비도가 ${level(score)}에 있다.`,interpretation:sentences(`현재 직책, 당내 위치, 지역 기반, 브랜드와 선거 경쟁력을 종합했다.`,`${topicWord(topTopic)} 이미 확보한 자산이며 ${topicWord(secondTopic)} 추가로 보강할 자산이다.`,`성장 속도는 단기 노출보다 대표 의제와 조직 기반의 지속성에 좌우된다.`),opportunity:`${objectWord(topTopic)} ${region}에서 검증된 성과로 만들면 전국 단위 자산으로 확장할 수 있다.`,risk:`역할 변화가 잦고 대표 의제가 고정되지 않으면 다음 단계의 명분이 약해질 수 있다.`}
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

function makeDiagnoses(person,input){
  const newsNarrative=input.newsNarrative,topTopic=newsNarrative.topics[0]?.label||'정치 활동',secondTopic=newsNarrative.topics[1]?.label||clean(person.committee)||'지역·현장';
  const terms=termsCount(person.terms),role=roleWeight(person),newsCount=newsNarrative.items.length,policyLink=newsNarrative.policyImageLink,sourceDiversity=newsNarrative.sourceDiversity,search=input.searchMetrics||{},frames=newsNarrative.frameSummary||{positive:0,neutral:0,negative:0};
  const cohorts=list(input.cohorts),strong=cohorts.flatMap(row=>[{label:`${row.age} 남성`,value:row.male},{label:`${row.age} 여성`,value:row.female}]).sort((a,b)=>b.value-a.value),strongAge=strong[0]?.label||`${person.region||'지역'} 핵심층`,weakAge=strong.at(-1)?.label||'신규 유입층';
  const competitors=list(input.competitors),competitor=competitors[0]?.name||`동일 직군 ${person.region||'지역'} 정치인`,region=clean(person.jurisdiction||person.region)||'관할 지역',roleTitle=clean(person.office||person.roleLabel)||'현재 정치 역할',committee=clean(person.committee)||'담당 분야';
  const cohortValues=cohorts.flatMap(row=>[Number(row.male)||0,Number(row.female)||0]),cohortMean=clamp(average(cohortValues)),cohortSpread=cohortValues.length?Math.max(...cohortValues)-Math.min(...cohortValues):0,negativeShare=Math.round(frames.negative/Math.max(1,newsCount)*100),positiveShare=Math.round(frames.positive/Math.max(1,newsCount)*100),regionalShare=newsNarrative.topics.find(row=>row.label==='지역·현장')?.share||0,career=clamp(38+terms*8+role+(person.committee?5:0)),media=clamp(32+newsCount*5+sourceDiversity*4),regional=clamp(42+(person.jurisdiction||person.region?14:0)+regionalShare*.35),base=clamp(average([career,media,cohortMean||50]));
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
  const ctxBase={person,newsNarrative,topTopic,secondTopic,strongAge,weakAge,competitor,region,roleTitle,committee,policyLink,sourceDiversity,newsCount,negativeShare,cohorts,competitors,riskFrame:newsNarrative.riskFrames[0]||`${secondTopic} 이미지 충돌`};
  return POLITICAL_DIAGNOSIS_TOPICS.map(([id,title,type])=>{
    const score=clamp(rawScores[id]),basis=basisFor(id),ctx={...ctxBase,score};
    const copy=diagnosisCopy(id,ctx),sourceTypes=unique([basis==='direct'?'뉴스 헤드라인':'공식 현재정보','정치 구조 데이터',id==='07'?'검색 보조 신호':''].filter(Boolean));
    if(search.available)sourceTypes.push('검색 보조 신호');
    const dominant=newsNarrative.dominantEvent||{title:`${roleTitle} 공식 활동`,date:'현재',source:'공식 프로필'},coreEvent=dominant.title,contextTrend=newsNarrative.contextTemporalSummary||newsNarrative.temporalSummary||{},changeReason=newsCount?`대표 뉴스는 최근 30일 ${contextTrend.days30||0}건, 90일 ${contextTrend.days90||0}건으로 집계되며 ${contextTrend.recentDirection||'유지'} 흐름을 보입니다.`:`${roleTitle}, ${terms}선 경력, ${region} 정치 구조가 현재 평가의 기준을 형성합니다.`,pastPresentConnection=`${terms}선 공식 정치 경력과 현재 ${roleTitle} 역할을 연결하면, ${topTopic} 서사가 일시적 노출을 넘어 정치 자산으로 축적되는지가 핵심이다.`,politicalMeaning=`${copy.headline} ${newsNarrative.politicalMeaning}`;
    const evidenceRows=[evidence('핵심 이슈 분석',[dominant.agendaTag,dominant.frame,dominant.agency].filter(Boolean).join(' · ')||topTopic,newsCount?'direct':'structural',dominant.id||newsNarrative.items[0]?.id||`profile-${person.id}`),evidence('현재 직책',roleTitle,'structural',person.sourceId||`profile-${person.id}`),evidence('정치 구조',[person.party,region,person.terms].filter(Boolean).join(' · '),'structural',`profile-${person.id}`)];
    const supportingData=[{label:'뉴스 프레임',value:`긍정·성과 ${frames.positive} · 중립·정보 ${frames.neutral} · 부정·위기 ${frames.negative}`,basis:newsCount?'direct':'structural'},{label:'정치 구조',value:[person.party,region,person.terms,roleTitle].filter(Boolean).join(' · '),basis:'structural'}];
    if(search.available)supportingData.push({label:'검색 반응',value:`PC ${Number(search.pc||0).toLocaleString('ko-KR')} · 모바일 ${Number(search.mobile||0).toLocaleString('ko-KR')}`,basis:'supporting'});
    const relative=id==='06'?(score>=70?'고위험 구간':score>=45?'주의 구간':'관리 가능 구간'):peerPosition(score);
    return {id,title,headline:copy.headline,currentPosition:copy.position,coreEvent,politicalMeaning,changeReason,pastPresentConnection,supportingData,attentionQuality:newsNarrative.attentionQuality,score,percentile:relative,trend:observedTrend(newsNarrative),benchmark:{label:id==='06'?'뉴스 위험 프레임 기준':'동일 직군 JCS 기준',position:relative,delta:score-55},visualization:{type,...diagnosisVisualization(id,score,ctx)},interpretation:sentences(newsNarrative.effectSeparation,...copy.interpretation),evidence:evidenceRows,opportunity:copy.opportunity,risk:copy.risk,sourceTypes:unique(sourceTypes),updatedAt:clean(input.snapshot)||'2026-09-03',algorithmVersion:input.algorithmVersion,basis};
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
  const rows=PRESCRIPTION_META.map(([id,title,type,linkedDiagnosisIds])=>{
    const linked=linkedDiagnosisIds.map(key=>byId.get(key)),average=Math.round(linked.reduce((sum,item)=>sum+item.score,0)/linked.length),[judgment,actions,target,messageDirection,channels]=prescriptionContent(id,ctx);
    const timing=id==='06'?'0~6시간 · 24시간 · 72시간 · 7일':id==='08'?'30일 · 60일 · 90일':id==='10'?'3개월 · 6개월 · 12개월 · 24개월':id==='01'||id==='03'?'즉시 착수 · 30일 집중 운영':'즉시 착수 · 30일 · 90일 점검';
    const visualData={items:actions.map((label,index)=>({label,value:[100,67,34][index]||34})),stages:timing.split(' · '),axes:{impact:clamp(100-average),feasibility:clamp(average)}};
    return {id,linkedDiagnosisIds,diagnosisBasis:linked.map(item=>`${item.id} · ${item.headline}`),title,objective:`${person.name}의 ${linked.map(item=>item.title.replace(/ 진단| 분석/g,'')).join('·')} 결과를 실행 가능한 변화로 전환`,strategicJudgment:judgment,actions,target,messageDirection,channels,timing,priority:'',expectedImpact:`${linked[0].headline} 현재 판단을 ${topTopic} 실행 성과로 전환`,monitoringIndicators:unique([`${topTopic} 뉴스 점유`,`${region} 메시지 반응`,...linked.slice(0,2).map(item=>`${item.title} JCS 지수`)]),visualization:{type,...visualData},updatedAt:clean(input.snapshot)||'2026-09-03',algorithmVersion:input.algorithmVersion,urgency:clamp(100-average+(id==='06'?12:0))};
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
