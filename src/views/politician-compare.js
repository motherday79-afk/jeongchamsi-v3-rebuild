const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function queryRoute(ids){
  return ids.length?`/compare?ids=${encodeURIComponent(ids.join(','))}`:'/compare';
}

function profilePhoto(item,className){
  const src=String(item?.photo?.localPath||'');
  if(!src)return `<span class="${className} is-empty" aria-hidden="true">${esc(String(item?.name||'?').slice(0,1))}</span>`;
  return `<span class="${className} has-photo" style="--photo-position:${esc(item.photo.focus||'50% 28%')}"><img src="${esc(src)}" alt="" width="240" height="240" loading="lazy" decoding="async"></span>`;
}

function searchResult(item,ids){
  const nextIds=[...ids,item.id];
  return `<button type="button" class="politician-compare-search-result" data-compare-add="${esc(item.id)}" data-layout-route="${esc(queryRoute(nextIds))}">${profilePhoto(item,'politician-compare-search-avatar')}<span><b>${esc(item.name)}</b><small>${esc([item.party,item.jurisdiction,item.office||item.roleLabel].filter(Boolean).join(' · '))}</small></span><em>선택</em></button>`;
}

function selectedSlot(item,index,ids,searchState){
  if(!item){
    const slot=index+1,active=searchState.slot===slot,results=active?searchState.items.filter(candidate=>!ids.includes(candidate.id)):[];
    const resultMarkup=active&&searchState.query
      ?`<div class="politician-compare-search-results" data-compare-search-results>${results.length?results.map(candidate=>searchResult(candidate,ids)).join(''):'<p>검색 결과가 없습니다.</p>'}</div>`:'';
    return `<article class="politician-compare-slot is-empty has-search" data-compare-slot><span class="politician-compare-slot-index">${String(slot).padStart(2,'0')}</span><form class="politician-compare-slot-search" data-compare-search-form data-compare-search-slot="${slot}" data-compare-search-base="${esc(queryRoute(ids))}" role="search"><label for="compare-person-${slot}">비교 정치인 검색</label><div><input id="compare-person-${slot}" type="search" name="q" value="${active?esc(searchState.query):''}" placeholder="정치인 이름·정당·지역 검색" autocomplete="off" required><button type="submit" aria-label="${slot}번 비교 정치인 검색">검색</button></div><p>이름·정당·지역·직책으로 찾을 수 있습니다.</p></form>${resultMarkup}</article>`;
  }
  const nextIds=ids.filter(id=>id!==item.id);
  return `<article class="politician-compare-slot" data-compare-slot data-compare-selected="${esc(item.id)}"><span class="politician-compare-slot-index">${String(index+1).padStart(2,'0')}</span>${profilePhoto(item,'politician-compare-avatar')}<h2>${esc(item.name)}</h2><p>${esc([item.party,item.jurisdiction].filter(Boolean).join(' · '))}</p><dl><div><dt>직책</dt><dd>${esc(item.office||item.roleLabel||'—')}</dd></div><div><dt>선수</dt><dd>${esc(item.terms||'—')}</dd></div><div><dt>위원회</dt><dd>${esc(item.committee||'—')}</dd></div></dl><button type="button" class="politician-compare-remove" data-compare-remove="${esc(item.id)}" data-layout-route="${esc(queryRoute(nextIds))}">비교에서 빼기</button></article>`;
}

function futureMatrix(items,capacity){
  const rows=['관심 구조','활동·미디어','관심 전이','위험·기회','전략 솔루션'];
  const cells=item=>`<td${item?'':' class="is-empty"'}><b>—</b><small>세부 데이터 연결 후 표시</small></td>`;
  return `<section class="content-card politician-compare-matrix-shell"><div class="section-title"><div><span class="eyebrow">COMPARISON FRAME</span><h2>비교 인텔리전스 배치</h2></div><span>프로필·사진 데이터만 표시</span></div><p class="politician-compare-matrix-notice">분석 수치와 판정은 생성하지 않았습니다. 모든 정치인의 상세 데이터가 연결되면 이 레이아웃에 동일 기준으로 표시됩니다.</p><div class="politician-compare-table-scroll"><table class="politician-compare-table capacity-${capacity}"><thead><tr><th>비교 항목</th>${items.map(item=>`<th>${item?esc(item.name):'선택 대기'}</th>`).join('')}</tr></thead><tbody>${rows.map(label=>`<tr><th>${label}</th>${items.map(cells).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}

export async function renderPoliticianCompare(service,route='/compare',session=null){
  const isAdmin=session?.user?.role==='admin',role=isAdmin?'admin':'public',limit=isAdmin?5:2;
  const query=new URLSearchParams(String(route).split('?')[1]||'');
  const rawIds=String(query.get('ids')||'').split(',').map(id=>id.trim()).filter(Boolean);
  const ids=[...new Set(rawIds)].slice(0,limit);
  const searchQuery=String(query.get('q')||'').trim();
  const searchSlot=Math.min(limit,Math.max(1,Number(query.get('slot')||ids.length+1)||1));
  const [selectedResults,searchResponse]=await Promise.all([
    Promise.all(ids.map(id=>service.get(id).catch(()=>({ok:false})))),
    searchQuery?service.search(searchQuery,12).catch(()=>({ok:false,items:[]})):Promise.resolve({ok:true,items:[]})
  ]);
  const selected=selectedResults.filter(result=>result?.ok&&result.item).map(result=>result.item);
  const selectedIds=selected.map(item=>item.id),slots=Array.from({length:limit},(_,index)=>selected[index]||null);
  const searchState={query:searchQuery,slot:searchSlot,items:searchResponse?.ok&&Array.isArray(searchResponse.items)?searchResponse.items:[]};
  const title=isAdmin?'관리자 다중 비교':'정치인 1:1 비교';
  const eyebrow=isAdmin?'JCS MULTI POLITICAL INTELLIGENCE':'POLITICIAN COMPARE';
  const description=isAdmin?'2명부터 최대 5명까지 같은 화면에서 비교하는 관리자 전용 레이아웃입니다.':'비로그인·일반회원은 두 정치인의 공식 프로필을 1:1로 비교합니다.';
  return `<main class="subpage politician-compare-page compare-capacity-${limit}" data-compare-role="${role}" data-compare-limit="${limit}"><section class="page-hero politician-compare-hero"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p><div class="politician-compare-capacity"><strong>${selected.length}</strong><span>/ ${limit}명 선택</span><b>${isAdmin?'최대 5명':'1:1 전용'}</b></div></section><section class="content-card politician-compare-selection"><div class="section-title"><div><span class="eyebrow">SELECTED PROFILES</span><h2>비교 대상</h2></div><span>검색하여 선택 · ${isAdmin?'2~5명 비교':'1:1 비교'}</span></div><div class="politician-compare-slots">${slots.map((item,index)=>selectedSlot(item,index,selectedIds,searchState)).join('')}</div></section>${futureMatrix(slots,limit)}</main>`;
}
