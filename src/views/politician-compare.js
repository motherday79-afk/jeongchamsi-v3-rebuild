import { jcsSupportConversion } from '../ui/cohort-metrics.js';

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

const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));
const available=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const sectionHead=(en,ko,note)=>`<div class="section-title politician-compare-analysis-title"><div><span class="eyebrow">${esc(en)}</span><h2>${esc(ko)}</h2></div><span>${esc(note)}</span></div>`;
const valueBar=(label,value,description='')=>available(value)?`<div class="politician-compare-value-bar"><header><b>${esc(label)}</b><strong>${Number(value)}</strong></header><div><i style="width:${clamp(value)}%"></i></div>${description?`<p>${esc(description)}</p>`:''}</div>`:'';

function metricColumns(entries,key){
  return `<div class="politician-compare-analysis-grid" style="--compare-count:${entries.length}">${entries.map(entry=>{
    const rows=Array.isArray(entry.intelligence?.[key])?entry.intelligence[key]:[];
    return `<article class="politician-compare-analysis-column"><header>${profilePhoto(entry.item,'politician-compare-analysis-avatar')}<span><b>${esc(entry.item.name)}</b><small>${esc(entry.item.party)}</small></span></header>${rows.map(row=>valueBar(row.label,row.score,row.desc)).join('')}</article>`;
  }).join('')}</div>`;
}

function renderPublicComparison(entries){
  if(!entries.length)return `<section class="content-card politician-compare-empty-analysis"><b>비교할 정치인을 검색해 선택하세요</b><p>선택한 인물의 공개 운영지표를 실제 스냅샷 기준으로 비교합니다.</p></section>`;
  const nowCards=entries.map(({item,intelligence:data})=>`<article><span>${profilePhoto(item,'politician-compare-index-avatar')}</span><small>${esc(item.name)}</small><strong>${available(data?.signal?.index)?Number(data.signal.index):''}</strong><p>전체 ${data?.rank?.overall||''}위 · 분야 ${data?.rank?.category||''}위</p></article>`).join('');
  const activityMedia=entries.map(entry=>`<article><h3>${esc(entry.item.name)}</h3><div class="politician-compare-dual-metrics"><section><b>ACTIVITY</b>${(entry.intelligence?.activity||[]).map(row=>valueBar(row.label,row.score)).join('')}</section><section><b>MEDIA</b>${(entry.intelligence?.media||[]).map(row=>valueBar(row.label,row.score)).join('')}</section></div></article>`).join('');
  return `<div class="politician-compare-intelligence public-comparison-intelligence jcs-analysis-compact"><section class="content-card">${sectionHead('NOW OPERATING INDEX','NOW 운영지수 비교','네이버 검색광고 40% · Google 뉴스 60%')}<div class="politician-compare-index-grid" style="--compare-count:${entries.length}">${nowCards}</div></section><section class="content-card">${sectionHead('CORE INDICATORS','핵심 지표 비교','동일 운영 스냅샷')}${metricColumns(entries,'core')}</section><section class="content-card">${sectionHead('ACTIVITY & MEDIA','활동·미디어 비교','공식 역할·Google 뉴스') }<div class="politician-compare-activity-grid" style="--compare-count:${entries.length}">${activityMedia}</div></section></div>`;
}

function cohortRows(entries){
  const ages=[...new Set(entries.flatMap(entry=>(entry.intelligence?.cohorts||[]).map(row=>row.age)))];
  return ages.map(age=>`<div class="politician-compare-cohort-row"><b>${esc(age)}</b>${entries.map(entry=>{const data=entry.intelligence||{},row=(data.cohorts||[]).find(item=>item.age===age);return `<span>${[['남',row?.male],['여',row?.female]].map(([gender,attention])=>{const support=jcsSupportConversion(data,attention);return `<em style="--heat:${clamp(attention)}%"><b>${gender}</b><small>관심 ${available(attention)?Number(attention):'—'}</small><small>지지전환 ${available(support)?support:'—'}</small></em>`;}).join('')}</span>`;}).join('')}</div>`).join('');
}

function renderMemberLayers(entries,showIdentity=true){
  if(!entries.length)return '';
  const audience=entries.map(entry=>`<article><h3>${esc(entry.item.name)}</h3>${valueBar('대중 확장 위치',entry.intelligence?.audience?.position,entry.intelligence?.audience?.summary)}<strong>${esc(entry.intelligence?.audience?.label||'')}</strong></article>`).join('');
  const risks=entries.map(entry=>`<article><h3>${esc(entry.item.name)}</h3><section><b>RISK</b>${(entry.intelligence?.risks||[]).map(text=>`<p>${esc(text)}</p>`).join('')}</section><section><b>OPPORTUNITY</b>${(entry.intelligence?.opportunities||[]).map(text=>`<p>${esc(text)}</p>`).join('')}</section></article>`).join('');
  const conclusions=entries.map(entry=>`<article><b>${esc(entry.item.name)}</b><strong>${esc(entry.intelligence?.diagnosis?.title||'')}</strong><p>${esc(entry.intelligence?.conclusion||entry.intelligence?.diagnosis?.body||'')}</p></article>`).join('');
  const strengthGap=entries.map(entry=>{
    const metrics=['core','activity','media','transition'].flatMap(key=>Array.isArray(entry.intelligence?.[key])?entry.intelligence[key]:[]).filter(row=>available(row?.score));
    const ordered=[...metrics].sort((a,b)=>Number(b.score)-Number(a.score)||String(a.label).localeCompare(String(b.label))),strong=ordered[0],weak=ordered.at(-1),gap=strong&&weak?Number((Number(strong.score)-Number(weak.score)).toFixed(1)):null;
    return `<article><h3>${esc(entry.item.name)}</h3>${strong?`<div><small>가장 강한 지표</small><b>${esc(strong.label)}</b><strong>${Number(strong.score)}</strong></div>`:''}${weak?`<div><small>보완 지표</small><b>${esc(weak.label)}</b><strong>${Number(weak.score)}</strong></div>`:''}${available(gap)?`<p>내부 지표 격차 <b>${gap}p</b></p>`:''}</article>`;
  }).join('');
  return `<div class="politician-compare-intelligence member-comparison-intelligence jcs-analysis-compact">${showIdentity?`<section class="content-card member-comparison-banner">${sectionHead('MEMBER INTERPRETED COMPARISON','회원 전용 1:1 해석','실제 공개 스냅샷의 구조·격차 해석')}</section>`:''}<section class="content-card">${sectionHead('AGE × GENDER ATTENTION & SUPPORT','연령·성별 관심·지지 전환 구조','관심지수와 JCS 지지전환지수')}<div class="politician-compare-cohort-map" style="--compare-count:${entries.length}"><header><b>연령</b>${entries.map(entry=>`<span>${esc(entry.item.name)}</span>`).join('')}</header>${cohortRows(entries)}</div><p class="politician-compare-method-note">관심·정당 지지맥락·전환력·위험을 결합한 JCS 세대별 지지전환지수입니다.</p></section><section class="content-card">${sectionHead('AUDIENCE LANDSCAPE','관심층 확장 구조','핵심층 집중과 대중 확장')}<div class="politician-compare-audience-grid" style="--compare-count:${entries.length}">${audience}</div></section><section class="content-card">${sectionHead('ATTENTION FLOW','관심 전이 비교','유입·확장·전환·유지')}${metricColumns(entries,'transition')}</section><section class="content-card">${sectionHead('STRENGTH & WEAKNESS GAP','강점·약점 격차','공개 지표의 실제 최고·최저값')}<div class="politician-compare-gap-grid" style="--compare-count:${entries.length}">${strengthGap}</div></section><section class="content-card">${sectionHead('RISK & OPPORTUNITY','위험·기회 비교','근거 기반 실행 신호')}<div class="politician-compare-risk-grid" style="--compare-count:${entries.length}">${risks}</div></section><section class="content-card">${sectionHead('JCS COMPARISON SYNTHESIS','JCS 비교 종합','인물별 진단과 실행 방향')}<div class="politician-compare-synthesis-grid" style="--compare-count:${entries.length}">${conclusions}</div></section></div>`;
}

function radarPoints(values){
  const total=values.length||1;
  return values.map((value,index)=>{const angle=-Math.PI/2+Math.PI*2*index/total,radius=74*clamp(value)/100;return `${(90+Math.cos(angle)*radius).toFixed(1)},${(90+Math.sin(angle)*radius).toFixed(1)}`;}).join(' ');
}

function radarAxisLabels(items){
  return items.map((item,index)=>{const angle=-Math.PI/2+Math.PI*2*index/items.length,x=90+Math.cos(angle)*92,y=90+Math.sin(angle)*92,anchor=Math.cos(angle)>.25?'start':Math.cos(angle)<-.25?'end':'middle';return `<text class="radar-axis-label" x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="${anchor}">${esc(item.label)} ${available(item.score)?Number(item.score):'—'}</text>`;}).join('');
}

function renderAdminComparison(entries){
  if(!entries.length)return '';
  const summary=entries.map(entry=>{const metrics=['core','activity','media','transition'].flatMap(key=>entry.intelligence?.[key]||[]).filter(row=>available(row.score)).sort((a,b)=>Number(b.score)-Number(a.score)),strong=metrics[0],weak=metrics.at(-1);return `<article><b>${esc(entry.item.name)}</b><strong>${available(entry.intelligence?.signal?.index)?entry.intelligence.signal.index:'—'}</strong><span>${entry.intelligence?.rank?.overall?`${entry.intelligence.rank.overall}위`:'집계 전'}</span><em>${esc(strong?.label||'—')}</em><small>${esc(weak?.label||'—')}</small></article>`;}).join('');
  const diagnoses=entries.map(entry=>`<article><header>${profilePhoto(entry.item,'admin-compare-compact-avatar')}<div><h3>${esc(entry.item.name)}</h3><span>${esc(entry.intelligence?.diagnosis?.title||'분석 진단')}</span></div></header><p>${esc(entry.intelligence?.conclusion||entry.intelligence?.diagnosis?.body||'')}</p><dl><div><dt>우선 위험</dt><dd>${esc(entry.intelligence?.risks?.[0]||'관측값 없음')}</dd></div><div><dt>핵심 기회</dt><dd>${esc(entry.intelligence?.opportunities?.[0]||'관측값 없음')}</dd></div><div><dt>첫 실행</dt><dd>${esc(entry.intelligence?.strategies?.[0]?.title||'추가 분석 필요')}</dd></div></dl></article>`).join('');
  return `<div class="politician-compare-intelligence admin-comparison-intelligence admin-comparison-compact"><section class="content-card admin-comparison-banner">${sectionHead('ADMIN CONSULTING SUMMARY','관리자 비교 컨설팅','최대 5명 핵심 의사결정 화면')}</section><section class="content-card">${sectionHead('EXECUTIVE MATRIX','핵심 비교표','NOW · 순위 · 강점 · 보완')}<div class="admin-compare-summary-table" style="--compare-count:${entries.length}">${summary}</div></section><section class="content-card">${sectionHead('CONSULTING DIAGNOSIS','인물별 컨설팅 진단','위험 · 기회 · 첫 실행')}<div class="admin-compare-diagnosis-grid" style="--compare-count:${entries.length}">${diagnoses}</div></section><details class="admin-compare-deep content-card"><summary>상세 지표 펼쳐보기</summary><div>${sectionHead('DEEP METRICS','핵심·세대별 상세값','필요할 때만 확인')}${metricColumns(entries,'core')}<div class="politician-compare-cohort-map" style="--compare-count:${entries.length}"><header><b>연령</b>${entries.map(entry=>`<span>${esc(entry.item.name)}</span>`).join('')}</header>${cohortRows(entries)}</div></div></details></div>`;
}

export async function renderPoliticianCompare(service,route='/compare',session=null){
  const isAdmin=session?.user?.role==='admin',isMember=!!session?.user&&!isAdmin,role=isAdmin?'admin':isMember?'member':'public',limit=isAdmin?5:2;
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
  const description=isAdmin?'2명부터 최대 5명까지 같은 화면에서 실제 관리자 인텔리전스를 교차 비교합니다.':isMember?'두 정치인의 공개 운영지표와 회원 전용 JCS 해석을 1:1로 비교합니다.':'두 정치인의 공개 운영지표를 1:1로 비교합니다.';
  const ready=ids.length>=2,analysis=run?(isAdmin?renderAdminComparison(entries):`${renderPublicComparison(entries)}${isMember?renderMemberLayers(entries,true):''}`):`<section class="content-card politician-compare-ready"><b>${ready?'선택이 완료되었습니다':'비교할 정치인을 검색해 선택하세요'}</b><p>${ready?'비교하기를 누르면 선택한 인물의 정보가 한 번에 열립니다.':'정치인 이름·정당·지역을 검색해 비교 대상을 채워주세요.'}</p></section>`;
  const slotMarkup=slots.map((record,index)=>record?(record.result?.ok&&record.result.item?selectedSlot(record.result.item,index,ids):failedSlot(record.id,index,ids,run)):selectedSlot(null,index,ids)).join('');
  const availableResults=searchState.items.filter(candidate=>!ids.includes(candidate.id));
  const submittedResults=searchState.query?`<div class="politician-compare-search-results politician-compare-global-results" data-compare-search-results>${availableResults.length?availableResults.map(candidate=>searchResult(candidate,ids)).join(''):'<p>검색 결과가 없습니다.</p>'}</div>`:'';
  const globalSearch=ids.length<limit?`<form class="politician-compare-global-search" data-compare-search-form data-compare-search-slot="${Math.min(limit,ids.length+1)}" data-compare-search-base="${esc(queryRoute(ids))}" role="search"><label for="compare-person-search">정치인 추가</label><div class="politician-compare-global-search-field"><input id="compare-person-search" type="search" name="q" value="${esc(searchState.query)}" placeholder="정치인 이름·정당·지역 검색" autocomplete="off" data-politician-autocomplete data-politician-select-mode="compare" data-politician-base="${esc(queryRoute(ids))}" required><button type="submit">검색</button></div>${submittedResults}</form>`:'';
  const runButton=ready?`<div class="politician-compare-run-row"><button class="primary-btn" type="button" data-compare-run data-layout-route="${esc(queryRoute(ids,true))}">${run?'다시 비교하기':'비교하기'}</button></div>`:'';
  return `<main class="subpage politician-compare-page compare-capacity-${limit}" data-compare-role="${role}" data-compare-limit="${limit}" data-compare-executed="${run}"><section class="page-hero politician-compare-hero"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p><div class="politician-compare-capacity"><strong>${ids.length}</strong><span>/ ${limit}명 선택</span><b>${isAdmin?'최대 5명':'1:1 전용'}</b></div></section><section class="content-card politician-compare-selection"><div class="section-title"><div><span class="eyebrow">SELECTED PROFILES</span><h2>비교 대상</h2></div><span>검색하여 선택 · ${isAdmin?'2~5명 비교':'1:1 비교'}</span></div>${globalSearch}<div class="politician-compare-slots">${slotMarkup}</div>${runButton}</section>${analysis}</main>`;
}
