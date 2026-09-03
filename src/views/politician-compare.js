const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function queryRoute(ids,run=false){
  if(!ids.length)return '/compare';
  return `/compare?ids=${encodeURIComponent(ids.join(','))}${run?'&run=1':''}`;
}

function profilePhoto(item,className){
  const src=String(item?.photo?.localPath||'');
  const initial=esc(String(item?.name||'?').slice(0,1));
  if(!src)return `<span class="${className} is-empty" data-politician-avatar aria-hidden="true"><span class="politician-photo-initial">${initial}</span></span>`;
  return `<span class="${className} has-photo" data-politician-avatar style="--photo-position:${esc(item.photo.focus||'50% 28%')}"><span class="politician-photo-initial" aria-hidden="true">${initial}</span><img data-politician-photo src="${esc(src)}" alt="" width="240" height="240" loading="lazy" decoding="async"></span>`;
}

function searchResult(item,ids){
  const nextIds=[...ids,item.id];
  return `<button type="button" class="politician-compare-search-result" data-compare-add="${esc(item.id)}" data-layout-route="${esc(queryRoute(nextIds))}">${profilePhoto(item,'politician-compare-search-avatar')}<span><b>${esc(item.name)}</b><small>${esc([item.party,item.jurisdiction,item.office||item.roleLabel].filter(Boolean).join(' · '))}</small></span><em>선택</em></button>`;
}

function selectedSlot(item,index,ids){
  if(!item){
    const slot=index+1;
    return `<article class="politician-compare-slot is-empty" data-compare-slot><span class="politician-compare-slot-index">${String(slot).padStart(2,'0')}</span><b>비교 대상 ${slot}</b></article>`;
  }
  const nextIds=ids.filter(id=>id!==item.id);
  return `<article class="politician-compare-slot" data-compare-slot data-compare-selected="${esc(item.id)}"><span class="politician-compare-slot-index">${String(index+1).padStart(2,'0')}</span>${profilePhoto(item,'politician-compare-avatar')}<h2>${esc(item.name)}</h2><p>${esc([item.party,item.jurisdiction].filter(Boolean).join(' · '))}</p><dl><div><dt>직책</dt><dd>${esc(item.office||item.roleLabel||'—')}</dd></div><div><dt>선수</dt><dd>${esc(item.terms||'—')}</dd></div><div><dt>위원회</dt><dd>${esc(item.committee||'—')}</dd></div></dl><button type="button" class="politician-compare-remove" data-compare-remove="${esc(item.id)}" data-layout-route="${esc(queryRoute(nextIds))}">비교에서 빼기</button></article>`;
}

function failedSlot(id,index,ids,run=false){
  const nextIds=ids.filter(value=>value!==id);
  return `<article class="politician-compare-slot is-failed" data-compare-slot data-compare-failed="${esc(id)}"><span class="politician-compare-slot-index">${String(index+1).padStart(2,'0')}</span><div class="politician-compare-load-error"><b>비교 데이터를 불러오지 못했습니다</b><p>${esc(id)}</p><button type="button" data-layout-route="${esc(queryRoute(ids,run))}">다시 시도</button><button type="button" data-layout-route="${esc(queryRoute(nextIds))}">목록에서 빼기</button></div></article>`;
}

const available=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const compareText=value=>{
  if(value===null||value===undefined||value==='')return '';
  if(typeof value==='string'||typeof value==='number')return `<span>${esc(value)}</span>`;
  if(Array.isArray(value))return value.map(compareText).join('');
  if(typeof value==='object'){
    const label=value.label||value.title||value.age||value.type||'',metric=value.value??value.score,details=[];
    if(value.male!==undefined||value.female!==undefined)details.push(`남성 ${value.male??'—'} · 여성 ${value.female??'—'}`);
    if(value.body)details.push(value.body);if(value.detail)details.push(value.detail);if(value.note)details.push(value.note);
    if(label||metric!==undefined||details.length)return `<span>${label?`<b>${esc(label)}</b>`:''}${metric!==undefined&&metric!==null?`<strong>${esc(metric)}</strong>`:''}${details.map(detail=>`<small>${esc(detail)}</small>`).join('')}</span>`;
    return Object.entries(value).map(([key,item])=>`<span><b>${esc(key)}</b>${compareText(item)}</span>`).join('');
  }
  return '';
};

const comparisonTopic=(entry,id)=>(entry.intelligence?.diagnoses||[]).find(topic=>topic.id===id)||null;
const topicSignal=topic=>{
  if(available(topic?.score))return Number(topic.score);
  const metric=(topic?.metrics||[]).find(row=>available(row?.value??row?.score));
  if(metric)return Number(metric.value??metric.score);
  const chart=Array.isArray(topic?.miniChart)?topic.miniChart.filter(available):[];
  return chart.length?Number(chart.at(-1)):null;
};

function relativePositions(entries,topicId){
  const values=entries.map(entry=>topicSignal(comparisonTopic(entry,topicId)));
  if(values.some(value=>value===null))return values.map(()=>({label:'구조 기준',value:null}));
  const high=Math.max(...values),low=Math.min(...values);
  if(high===low)return values.map(value=>({label:'경합',value}));
  return values.map(value=>({label:value===high?'우위':value===low?'열세':'경합',value}));
}

function compareProfileHeader(entry){
  const brand=comparisonTopic(entry,'01'),rank=entry.intelligence?.rank||{};
  return `<article class="jcs-compare-matrix-profile" data-compare-matrix-profile="${esc(entry.item.id)}">${profilePhoto(entry.item,'jcs-compare-matrix-avatar')}<div><h3>${esc(entry.item.name)}</h3><p>${esc(entry.item.party)}</p><small>${esc(entry.item.office||entry.item.roleLabel||entry.item.jurisdiction)}</small><em>${esc(entry.item.jurisdiction)}</em></div><footer><b>${rank.overall?`전체 ${rank.overall}위`:'NOW 순위 산정 전'}</b><span>${esc(brand?.trend?.direction||'유지')}</span></footer></article>`;
}

const compareField=(label,value,className='')=>`<div class="jcs-compare-field ${className}"><b>${esc(label)}</b><div>${compareText(value)}</div></div>`;

function publicCompareCell(topic,position){return `<article class="jcs-compare-topic-cell"><strong>${esc(topic?.headline)}</strong><p>${esc(topic?.currentPosition)}</p>${compareField('상대 비교',position.label)}${compareField('최근 흐름',topic?.trend)}${compareField('JCS 상대지수',topic?.score)}</article>`;}

function memberCompareCell(topic,position){return `<article class="jcs-compare-topic-cell">${compareField('현재 평가',topic?.currentPosition,'is-summary')}${compareField('핵심 수치',`${topic?.score} · ${topic?.percentile}`)}${compareField('최근 변화',topic?.trend)}${compareField('현재 우위·열세·경합',position.label)}${compareField('격차 요약',position.value)}${compareField('동급·경쟁 비교',topic?.benchmark)}${compareField('정참시 비교 해석',topic?.interpretation,'is-interpretation')}${compareField('기준일·출처',[topic?.updatedAt,...(topic?.sourceTypes||[])])}</article>`;}

function adminCompareCell(topic,position){return `<article class="jcs-compare-topic-cell">${compareField('현재 위치',topic?.currentPosition,'is-position')}${compareField('점수·상대 위치',`${position.label} · ${topic?.score}`)}${compareField('직군 위치',topic?.percentile)}${compareField('최근 변화',topic?.trend)}${compareField('비교 기준',topic?.benchmark)}${compareField('근거 데이터',topic?.evidence)}${compareField('정참시 해석',topic?.interpretation,'is-interpretation')}${compareField('활용 가능한 기회',topic?.opportunity)}${compareField('관리해야 할 위험',topic?.risk)}</article>`;}

function adminComparisonSummary(entries,topicIds){
  const comparable=topicIds.map(id=>{
    const values=entries.map(entry=>topicSignal(comparisonTopic(entry,id)));
    if(values.some(value=>value===null))return null;
    const high=Math.max(...values),low=Math.min(...values),leader=entries[values.indexOf(high)]?.item?.name||'';
    return {id,title:comparisonTopic(entries[0],id)?.title||id,gap:Number((high-low).toFixed(1)),leader};
  }).filter(Boolean).sort((a,b)=>b.gap-a.gap);
  const widest=comparable[0],closest=[...comparable].sort((a,b)=>a.gap-b.gap)[0];
  return `<section class="content-card jcs-compare-executive"><span>ADMIN COMPETITIVE CONCLUSION</span><h2>관리자 경쟁 분석 요약</h2><div><article><b>가장 격차가 큰 영역</b><p>${widest?`${esc(widest.title)} · ${widest.gap}p · ${esc(widest.leader)} 우위`:'구조 지표 기준 비교'}</p></article><article><b>단기간 역전 가능성 검토 영역</b><p>${closest?`${esc(closest.title)} · 현재 격차 ${closest.gap}p`:'구조 지표 기준 비교'}</p></article><article><b>구조적 불리 영역·우선 경쟁자</b><p>${widest?`${esc(widest.title)}의 선두 ${esc(widest.leader)}를 우선 비교`:'구조 지표 기준 비교'}</p></article><article><b>계층·지역·메시지 판단</b><p>02·03·09 항목의 진단값과 처방을 기준으로 확인</p></article></div></section>`;
}

function comparePrescription(item,target){return `<article class="jcs-compare-prescription" data-prescription-topic="${item.id}"><header><span>${item.id}</span><h3>${esc(item.title)}</h3><em>${esc(item.priority)}</em></header>${compareField('전략 기준 정치인',target.item.name)}${compareField('목표',item.objective)}${compareField('정참시 전략 판단',item.strategicJudgment,'is-judgment')}${compareField('실행 처방',item.actions,'is-action')}${compareField('타깃·메시지',[item.target,item.messageDirection])}${compareField('채널·시점',[...(item.channels||[]),item.timing])}${compareField('예상 변화·추적 지표',[item.expectedImpact,...(item.monitoringIndicators||[])])}</article>`;}
function comparePriority(value,prescriptions){const byId=new Map(prescriptions.map(row=>[row.id,row.title]));return `<section class="jcs-compare-priority"><h2>실행 우선순위</h2><div>${[['즉시 실행','immediate'],['30일 이내 실행','days30'],['90일 이내 실행','days90'],['중장기 관리','longTerm']].map(([label,key])=>`<article><b>${label}</b>${(value?.[key]||[]).map(id=>`<span>${esc(id)} · ${esc(byId.get(id))}</span>`).join('')}</article>`).join('')}</div></section>`;}

function renderDiagnosticComparison(entries,role,strategyId=''){
  if(!entries.length)return '';
  const topicIds=(entries[0].intelligence?.diagnoses||[]).map(topic=>topic.id),titles={public:['JCS OPEN POLITICAL COMPARISON','정참시 공개 비교'],member:['JCS MEMBER POLITICAL COMPARISON','정참시 회원 상세 비교'],admin:['JCS ADMIN POLITICAL COMPARISON','정참시 관리자 경쟁 분석']},[en,ko]=titles[role]||titles.public;
  const header=`<div class="jcs-compare-matrix-profile-row" style="--compare-count:${entries.length}"><div class="jcs-compare-matrix-corner"><span>COMPARE</span><b>동일 기준 비교</b></div>${entries.map(compareProfileHeader).join('')}</div>`;
  const sections=topicIds.map(id=>{
    const topic=comparisonTopic(entries[0],id),positions=relativePositions(entries,id);
    return `<section class="jcs-compare-topic" data-comparison-topic="${id}"><header><span>${id}</span><h2>${esc(topic?.title)}</h2></header><div class="jcs-compare-topic-row" style="--compare-count:${entries.length}">${entries.map((entry,index)=>{const current=comparisonTopic(entry,id);return role==='admin'?adminCompareCell(current,positions[index]):role==='member'?memberCompareCell(current,positions[index]):publicCompareCell(current,positions[index]);}).join('')}</div></section>`;
  }).join('');
  const target=entries.find(entry=>entry.item.id===strategyId)||entries[0],prescriptions=target?.intelligence?.prescriptions||[],targetSelector=role==='admin'?`<nav class="jcs-strategy-target"><b>전략 기준 정치인</b>${entries.map(entry=>`<button type="button" class="${entry.item.id===target.item.id?'active':''}" data-layout-route="/compare?ids=${encodeURIComponent(entries.map(row=>row.item.id).join(','))}&run=1&strategy=${encodeURIComponent(entry.item.id)}">${esc(entry.item.name)}</button>`).join('')}</nav>`:'';
  const adminRx=role==='admin'?`${targetSelector}<section class="jcs-compare-transition"><span>FROM DIAGNOSIS TO PRESCRIPTION</span><h2>${esc(target.item.name)} 기준 전략 처방</h2><p>위 비교 진단을 기준 정치인의 실행 전략으로 전환합니다.</p></section><div class="jcs-compare-prescriptions">${prescriptions.map(item=>comparePrescription(item,target)).join('')}</div>${comparePriority(target.intelligence?.prescriptionPriorities,prescriptions)}`:'';
  return `<section class="jcs-compare-report jcs-compare-report-${role}"><header class="jcs-compare-report-heading"><span>${en}</span><h2>${ko}</h2><p>${role==='admin'?esc(entries[0].intelligence?.stInterpretation):'상세페이지와 동일한 분석값을 같은 항목과 기준으로 직접 비교합니다.'}</p></header>${role==='admin'?adminComparisonSummary(entries,topicIds):''}<div class="jcs-compare-matrix" style="--compare-count:${entries.length}">${header}${sections}</div>${adminRx}${role==='public'?'<footer><button type="button" class="primary-btn" data-layout-route="/login">로그인하고 상세 비교 보기</button></footer>':''}</section>`;
}

export async function renderPoliticianCompare(service,route='/compare',session=null){
  const isAdmin=session?.user?.role==='admin',isMember=!!session?.user&&!isAdmin,role=isAdmin?'admin':isMember?'member':'public',limit=isAdmin?4:2;
  const query=new URLSearchParams(String(route).split('?')[1]||'');
  const rawIds=String(query.get('ids')||'').split(',').map(id=>id.trim()).filter(Boolean);
  const ids=[...new Set(rawIds)].slice(0,limit);
  const run=query.get('run')==='1'&&ids.length>=2;
  const searchQuery=String(query.get('q')||'').trim();
  const searchSlot=Math.min(limit,Math.max(1,Number(query.get('slot')||ids.length+1)||1));
  const [selectedResults,searchResponse]=await Promise.all([
    Promise.all(ids.map(id=>(run&&service.getForCompare?service.getForCompare(id):service.get(id)).catch(()=>({ok:false})))),
    searchQuery?service.search(searchQuery,12).catch(()=>({ok:false,items:[]})):Promise.resolve({ok:true,items:[]})
  ]);
  const records=selectedResults.map((result,index)=>({id:ids[index],result})),entries=records.filter(record=>record.result?.ok&&record.result.item).map(record=>({item:record.result.item,intelligence:record.result.intelligence||null})),selected=entries.map(entry=>entry.item);
  const slots=Array.from({length:limit},(_,index)=>records[index]||null);
  const searchState={query:searchQuery,slot:searchSlot,items:searchResponse?.ok&&Array.isArray(searchResponse.items)?searchResponse.items:[]};
  const title=isAdmin?'관리자 다중 비교':'정치인 1:1 비교';
  const eyebrow=isAdmin?'JCS MULTI POLITICAL INTELLIGENCE':'POLITICIAN COMPARE';
  const description=isAdmin?'2명부터 최대 4명까지 같은 기준의 관리자 인텔리전스를 비교합니다.':isMember?'두 정치인의 6개 회원 분석 항목을 1:1로 비교합니다.':'두 정치인의 3개 공개 진단 항목을 1:1로 비교합니다.';
  const strategyId=String(query.get('strategy')||ids[0]||''),ready=ids.length>=2,analysis=run?renderDiagnosticComparison(entries,role,strategyId):`<section class="content-card politician-compare-ready"><b>${ready?'선택이 완료되었습니다':'비교할 정치인을 검색해 선택하세요'}</b><p>${ready?'비교하기를 누르면 선택한 인물의 정보가 한 번에 열립니다.':'정치인 이름·정당·지역을 검색해 비교 대상을 채워주세요.'}</p></section>`;
  const slotMarkup=slots.map((record,index)=>record?(record.result?.ok&&record.result.item?selectedSlot(record.result.item,index,ids):failedSlot(record.id,index,ids,run)):selectedSlot(null,index,ids)).join('');
  const availableResults=searchState.items.filter(candidate=>!ids.includes(candidate.id));
  const submittedResults=searchState.query?`<div class="politician-compare-search-results politician-compare-global-results" data-compare-search-results>${availableResults.length?availableResults.map(candidate=>searchResult(candidate,ids)).join(''):'<p>검색 결과가 없습니다.</p>'}</div>`:'';
  const globalSearch=ids.length<limit?`<form class="politician-compare-global-search" data-compare-search-form data-compare-search-slot="${Math.min(limit,ids.length+1)}" data-compare-search-base="${esc(queryRoute(ids))}" role="search"><label for="compare-person-search">정치인 추가</label><div class="politician-compare-global-search-field"><input id="compare-person-search" type="search" name="q" value="${esc(searchState.query)}" placeholder="정치인 이름·정당·지역 검색" autocomplete="off" data-politician-autocomplete data-politician-select-mode="compare" data-politician-base="${esc(queryRoute(ids))}" required><button type="submit">검색</button></div>${submittedResults}</form>`:'';
  const runButton=ready?`<div class="politician-compare-run-row"><button class="primary-btn" type="button" data-compare-run data-layout-route="${esc(queryRoute(ids,true))}">${run?'다시 비교하기':'비교하기'}</button></div>`:'';
  return `<main class="subpage politician-compare-page compare-capacity-${limit}" data-compare-role="${role}" data-compare-limit="${limit}" data-compare-executed="${run}"><section class="page-hero politician-compare-hero"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p><div class="politician-compare-capacity"><strong>${ids.length}</strong><span>/ ${limit}명 선택</span><b>${isAdmin?'최대 4명':'1:1 전용'}</b></div></section><section class="content-card politician-compare-selection"><div class="section-title"><div><span class="eyebrow">SELECTED PROFILES</span><h2>비교 대상</h2></div><span>검색하여 선택 · ${isAdmin?'2~4명 비교':'1:1 비교'}</span></div>${globalSearch}<div class="politician-compare-slots">${slotMarkup}</div>${runButton}</section>${analysis}</main>`;
}
