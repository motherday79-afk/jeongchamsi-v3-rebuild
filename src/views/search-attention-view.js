const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const count=value=>finite(value)?Number(value).toLocaleString('ko-KR'):'—';
const seoulDateFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
const shortDate=value=>{
  const date=new Date(value);
  if(!value||!Number.isFinite(date.getTime()))return '확인 중';
  const parts=Object.fromEntries(seoulDateFormat.formatToParts(date).map(part=>[part.type,part.value]));
  return `${parts.year}.${parts.month}.${parts.day}`;
};
const rank=(value,tied)=>finite(value)?`${tied?'공동 ':''}${count(value)}위`:'산정 전';
const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));

function searchRoute(person){
  return `/search?${new URLSearchParams({q:String(person?.name||''),person:String(person?.id||'')})}`;
}

function compareRoute(targetId,peerId){
  return `/compare?${new URLSearchParams({ids:[targetId,peerId].map(value=>String(value||'')).join(','),run:'1'})}`;
}

const link=(href,label,attrs='')=>`<a href="${esc(href)}" data-layout-route="${esc(href)}" ${attrs}>${label}</a>`;

function metric(label,value,rankValue,tied,note,className=''){
  const rankLabel=className==='is-search'?'검색 순위':'보도 순위';
  const unit=className==='is-search'?'회':'건';
  return `<div class="attention-metric ${className}"><dt>${esc(label)}</dt><dd><strong>${count(value)}<em>${unit}</em></strong><span>${rankLabel} ${rank(rankValue,tied)}</span></dd><small>${esc(note)}</small></div>`;
}

function positionChart(attention){
  const target=attention.target||{};
  if(attention.status!=='ready'||!finite(target.x)||!finite(target.y))return '';
  const left=48,right=392,top=22,bottom=190;
  const pointPosition=point=>({x:left+(right-left)*clamp(point.x)/100,y:bottom-(bottom-top)*clamp(point.y)/100});
  const peers=(attention.points||[]).filter(point=>point&&point.id!==target.id&&finite(point.x)&&finite(point.y));
  const targetPosition=pointPosition(target);
  const labelX=targetPosition.x>320?targetPosition.x-12:targetPosition.x+12;
  const labelY=targetPosition.y<42?targetPosition.y+21:targetPosition.y-11;
  const labelAnchor=targetPosition.x>320?'end':'start';
  const peerPoints=peers.map(point=>{
    const position=pointPosition(point);
    return `<circle data-attention-point="peer" class="attention-point-peer" cx="${position.x.toFixed(1)}" cy="${position.y.toFixed(1)}" r="3.5"><title>${esc(point.name)} · 보도 ${count(point.newsCount)}건 · 검색 ${count(point.searchCount)}회</title></circle>`;
  }).join('');
  const chartTitle=`${target.name||'선택 인물'}의 같은 직군 내 보도·검색 순위 위치`;
  return `<figure class="attention-chart"><svg viewBox="0 0 440 238" role="img" aria-labelledby="attention-chart-title attention-chart-description"><title id="attention-chart-title">${esc(chartTitle)}</title><desc id="attention-chart-description">가로축은 보도 순위의 상대 위치, 세로축은 검색 순위의 상대 위치입니다. 옅은 점은 같은 직군의 비교 인원이고 보라색 점은 ${esc(target.name)}입니다.</desc><g class="attention-chart-grid" aria-hidden="true"><line x1="48" y1="22" x2="48" y2="190"/><line x1="220" y1="22" x2="220" y2="190"/><line x1="392" y1="22" x2="392" y2="190"/><line x1="48" y1="22" x2="392" y2="22"/><line x1="48" y1="106" x2="392" y2="106"/><line x1="48" y1="190" x2="392" y2="190"/></g><g class="attention-chart-quadrants" aria-hidden="true"><text x="58" y="39">검색 쪽</text><text x="382" y="39" text-anchor="end">함께 높음</text><text x="58" y="180">조용한 편</text><text x="382" y="180" text-anchor="end">보도 쪽</text></g>${peerPoints}<g data-attention-point="target" class="attention-point-target" transform="translate(${targetPosition.x.toFixed(1)} ${targetPosition.y.toFixed(1)})"><circle class="attention-point-ring" r="9"/><circle class="attention-point-core" r="5"/></g><text class="attention-target-label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${labelAnchor}">${esc(target.name)}</text><g class="attention-chart-axis" aria-hidden="true"><text x="220" y="226" text-anchor="middle">보도 순위 위치 →</text><text transform="translate(22 106) rotate(-90)" text-anchor="middle">검색 순위 위치 →</text></g></svg><figcaption>같은 ${esc(attention.cohort?.label||'직군')} ${count(attention.cohort?.size)}명의 순위를 백분위 위치로 비교했습니다.</figcaption></figure>`;
}

function peerCard(peer,target){
  const person=peer?.person||{};
  const search=searchRoute(person),compare=compareRoute(target.id,person.id);
  return `<article class="attention-peer"><p>${esc(peer?.label||'비슷한 관심 흐름')}</p>${link(search,`<strong>${esc(person.name)}</strong><span>${esc(person.party||'소속 확인 중')}</span>`,`class="attention-peer-profile" aria-label="${esc(person.name)} 검색 결과 보기"`)}<dl><div><dt>보도 순위</dt><dd>${rank(person.newsRank,person.newsTied)}</dd></div><div><dt>검색 순위</dt><dd>${rank(person.searchRank,person.searchTied)}</dd></div></dl>${link(compare,`${esc(target.name)}과 비교하기 <span aria-hidden="true">→</span>`,`class="attention-compare-link" aria-label="${esc(target.name)}과 ${esc(person.name)} 비교하기"`)}</article>`;
}

export function renderSearchAttention(attention){
  if(!attention)return '';
  const target=attention.target||{},cohort=attention.cohort||{},ready=attention.status==='ready';
  const category=['both','search','news','quiet','balanced'].includes(attention.category)?attention.category:'pending';
  const period=`${shortDate(cohort.from)} – ${shortDate(cohort.to)}`;
  const partial=cohort.partial||target.partial;
  const chart=positionChart(attention);
  const peers=ready?(attention.peers||[]).filter(peer=>peer?.person?.id&&peer.person.id!==target.id):[];
  return `<section class="attention-panel attention-${category}" aria-labelledby="attention-title"><header class="attention-header"><div><span class="attention-kicker">MONTHLY ATTENTION</span><h2 id="attention-title">${esc(target.name||'선택 인물')}의 월간 관심도</h2></div><p>수집 기준일 ${esc(period)}<small>${esc(cohort.label||'같은 직군')} 비교 인원 ${count(cohort.size)}명${partial?' · 보도 수집 일부 제한':''}</small></p></header><div class="attention-layout"><div class="attention-story"><p class="attention-headline">${esc(attention.headline||'월간 보도와 검색 관심을 확인합니다.')}</p><dl class="attention-metrics">${metric('월간 검색',target.searchCount,target.searchRank,target.searchTied,`네이버 PC ${count(target.pc)} + 모바일 ${count(target.mobile)}`,'is-search')}${metric('30일 보도',target.newsCount,target.newsRank,target.newsTied,'수집 기사','is-news')}</dl><div class="attention-dates"><span>검색 기준일 <b>${esc(shortDate(target.searchAt))}</b></span><span>보도 기준일 <b>${esc(shortDate(target.newsAt))}</b></span></div>${!ready?`<p class="attention-insufficient">비교 가능한 같은 직군 4명 이상이 모이면 순위 위치를 함께 보여드립니다.</p>`:''}</div>${chart}</div>${peers.length?`<section class="attention-related" aria-labelledby="attention-related-title"><header><span>RELATED PEOPLE</span><h3 id="attention-related-title">함께 살펴볼 인물</h3></header><div>${peers.map(peer=>peerCard(peer,target)).join('')}</div></section>`:''}<details class="attention-basis"><summary>수치와 위치는 어떻게 계산하나요?</summary><div><p><b>검색량</b>은 네이버 월간 PC + 모바일 검색량으로 공개된 키워드 검색 횟수이며 검색한 사람 수가 아닙니다. <b>보도량</b>은 수집 시점 기준 최근 30일 기사 수이며 포털 경유 등 원언론사 미확인 기사도 포함하지만 아래 언론사별 분석에서는 제외합니다. 두 값은 서로 다른 공개 집계 기준입니다.</p><p>점의 위치는 같은 직군 안의 순위 상대 위치입니다. 동률 중간 순위의 백분위 위치를 축에 놓고 50 중간선으로 네 영역을 구분하며, 표시된 건수나 검색 횟수 자체를 좌표로 사용하지 않습니다. 두 값을 더한 합성 점수가 아닙니다.</p><p>같은 직군에서 보도·검색 수집 시각이 대상과 각각 48시간 이내인 자료만 비교합니다. 기존 자료 중 의미가 불명확한 0과 범위 검색량은 비교에서 제외합니다. 수집 기준일 ${esc(period)}의 자료를 사용했습니다.${partial?' 일부 보도 수집에 누락·응답 제한 또는 확인되지 않은 구간이 있습니다.':''} 보도량과 검색량은 지지나 반대를 뜻하지 않습니다.</p></div></details></section>`;
}
