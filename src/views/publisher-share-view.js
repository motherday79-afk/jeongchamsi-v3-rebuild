const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>Number(value||0).toLocaleString('ko-KR',{maximumFractionDigits:1});
const percent=value=>value>0&&value<.1?'0.1% 미만':`${number(value)}%`;
const gap=value=>Math.abs(value)<1e-10?'같은 비중':`${Math.abs(value)<.1?'0.1%p 미만':`${number(Math.abs(value))}%p`} ${value>0?'높음':'낮음'}`;
const width=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):0;
const dateFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit'});
const shortDate=value=>value&&Number.isFinite(Date.parse(value))?dateFormat.format(new Date(value)):'';

function safeUrl(value){
 const text=String(value||'').trim();if(!/^https?:\/\//i.test(text))return '';
 try{const url=new URL(text);return /^(https?:)$/.test(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}
}

function shareBar(label,metric,other=false){
 return `<div class="publisher-share-bar ${other?'is-other':'is-selected'}" role="img" aria-label="${esc(label)}: ${esc(percent(metric.share))}, ${number(metric.count)} / ${number(metric.total)}건"><div class="publisher-share-bar-label"><b>${esc(label)}</b><span><strong>${esc(percent(metric.share))}</strong><small>${number(metric.count)} / ${number(metric.total)}건</small></span></div><span class="publisher-share-track" aria-hidden="true"><i style="width:${width(metric.share)}%"></i></span></div>`;
}

function peerList(peers,title,publisher,period){
 if(!peers?.length)return '';
 return `<section class="publisher-share-peer-group"><h4>${title}</h4><ol>${peers.slice(0,3).map(peer=>{
  const params=new URLSearchParams({q:peer.name,person:peer.id,publisher});if(period==='cumulative')params.set('period',period);
  const route=`/search?${params}`;
  return `<li><a href="${esc(route)}" data-layout-route="${esc(route)}"><span class="publisher-share-peer-heading"><strong>${esc(peer.name)}</strong><b>${esc(gap(peer.differencePp))}</b></span><span class="publisher-share-peer-values"><span>이 언론 <b>${esc(percent(peer.selected.share))}</b> <small>(${number(peer.selected.count)} / ${number(peer.selected.total)}건)</small></span><span>합산 <b>${esc(percent(peer.other.share))}</b> <small>(${number(peer.other.count)} / ${number(peer.other.total)}건)</small></span></span>${peer.sampleLimited?'<small class="publisher-share-peer-note">적은 수집 표본</small>':''}</a></li>`;
 }).join('')}</ol></section>`;
}

function evidenceList(items,label){
 return `<div><h5>${esc(label)}</h5>${items?.length?`<ol>${items.slice(0,3).map(row=>{
  const url=safeUrl(row.url);
  return `<li><span><b>${esc(row.source)}</b><time>${esc(shortDate(row.date))}</time></span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(row.title)}</a>`:`<p>${esc(row.title)}</p>`}</li>`;
 }).join('')}</ol>`:'<p class="publisher-share-no-evidence">이 대상의 수집 기사가 없습니다.</p>'}</div>`;
}

export function renderPublisherShare(comparison,{period='latest',coverage={}}={}){
 const target=comparison?.target;
 if(!target?.name||!target.selected?.total||!target.other?.total)return '';
 const publisher=comparison.publisher,ratio=Number.isFinite(target.ratio)&&target.ratio>0?`<span class="publisher-share-ratio">비중 ${target.ratio<.1?'0.1배 미만':`${number(target.ratio)}배`}</span>`:'';
 return `<section class="publisher-share" aria-labelledby="publisher-share-title"><header class="publisher-share-header"><div><span class="spread-kicker">COVERAGE SHARE</span><h3 id="publisher-share-title">보도 비중의 차이</h3></div><span class="publisher-share-sources">다른 ${number(comparison.otherPublisherCount)}개 언론사와 비교</span></header><p class="publisher-share-intro">같은 기간, 수집된 등록 정치인 기사에서 차지하는 비중입니다.</p><div class="publisher-share-main"><div class="publisher-share-subject"><h4>${esc(target.name)}</h4><p><strong>${esc(gap(target.differencePp))}</strong><small>다른 언론 합산 대비</small></p>${ratio}</div><div class="publisher-share-bars">${shareBar(publisher,target.selected)}${shareBar('다른 언론 합산',target.other,true)}<p class="publisher-share-scale">두 막대는 같은 100% 눈금입니다.</p></div></div>${target.sampleLimited?'<p class="publisher-share-sample">적은 수집 표본 · 실제 건수와 비중을 함께 확인해 주세요.</p>':''}${comparison.higher?.length||comparison.lower?.length?`<div class="publisher-share-peers">${peerList(comparison.higher,'비중이 더 높은 인물',publisher,period)}${peerList(comparison.lower,'비중이 더 낮은 인물',publisher,period)}</div><p class="publisher-share-peer-basis">${esc(publisher)}와 다른 언론 합산의 비중 차이(%p) 순 · 각 최대 3명</p>`:''}<details class="publisher-share-basis"><summary>계산 기준과 기사 근거</summary><div class="publisher-share-method"><p>같은 기간의 <b>등록 정치인 ${number(comparison.populationCount)}명</b>에 관한 수집 기사만 비교합니다. <b>모든 정치 기사</b>를 집계한 값은 아닙니다.</p><p>${esc(publisher)}의 대상 기사 ${number(target.selected.count)}건 / 등록 정치인 기사 ${number(target.selected.total)}건과, ${esc(publisher)}를 <b>제외</b>한 다른 ${number(comparison.otherPublisherCount)}개 언론사의 대상 기사 ${number(target.other.count)}건 / 등록 정치인 기사 ${number(target.other.total)}건을 비교합니다. 다른 언론은 기사 수를 합산하며 언론사별 평균을 내지 않습니다.</p><p>중복 기사는 한 번만 세며, 한 기사에 대상 정치인이 여러 명 포함돼도 대상 기사 수에는 한 번만 포함합니다. 원언론사 미확인 기사는 양쪽 집계에서 제외합니다${comparison.unattributedCount?` (이 기간 ${number(comparison.unattributedCount)}건)`:''}. 인물별 비중의 합은 100%를 넘을 수 있습니다.</p><p>%p는 두 비중의 차이입니다. 배수는 양쪽 전체 기사 각각 20건 이상, 대상 기사 각각 5건 이상일 때만 표시합니다. 수집 누락이나 응답 제한에 따라 결과가 달라질 수 있습니다.${coverage.legacy?' 일부 이전 수집분은 기사별 정보가 부족합니다.':''}${coverage.truncated?' 이 기간의 자료에 확인된 수집 제한이 포함돼 있습니다.':''} 보도 비중은 지지나 반대를 뜻하지 않습니다.</p></div><div class="publisher-share-evidence">${evidenceList(target.evidence?.selected,publisher)}${evidenceList(target.evidence?.other,'다른 언론 합산')}</div><p class="publisher-share-evidence-note">대상에 관한 수집 기사 중 최근 근거를 양쪽 최대 3건씩 표시합니다.</p></details></section>`;
}
