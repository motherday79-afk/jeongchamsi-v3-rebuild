const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function queryRoute(ids){
  return ids.length?`/compare?ids=${encodeURIComponent(ids.join(','))}`:'/compare';
}

function profilePhoto(item,className){
  const src=String(item?.photo?.localPath||'');
  if(!src)return `<span class="${className} is-empty" aria-hidden="true">${esc(String(item?.name||'?').slice(0,1))}</span>`;
  return `<span class="${className} has-photo" style="--photo-position:${esc(item.photo.focus||'50% 28%')}"><img src="${esc(src)}" alt="" width="240" height="240" loading="lazy" decoding="async"></span>`;
}

function selectedSlot(item,index,ids){
  if(!item)return `<article class="politician-compare-slot is-empty" data-compare-slot><span class="politician-compare-slot-index">${String(index+1).padStart(2,'0')}</span><div class="politician-compare-empty-mark">＋</div><b>비교 인물을 선택해 주세요</b><p>아래 정치인 목록에서 프로필을 선택합니다.</p></article>`;
  const nextIds=ids.filter(id=>id!==item.id);
  return `<article class="politician-compare-slot" data-compare-slot data-compare-selected="${esc(item.id)}"><span class="politician-compare-slot-index">${String(index+1).padStart(2,'0')}</span>${profilePhoto(item,'politician-compare-avatar')}<h2>${esc(item.name)}</h2><p>${esc([item.party,item.jurisdiction].filter(Boolean).join(' · '))}</p><dl><div><dt>직책</dt><dd>${esc(item.office||item.roleLabel||'—')}</dd></div><div><dt>선수</dt><dd>${esc(item.terms||'—')}</dd></div><div><dt>위원회</dt><dd>${esc(item.committee||'—')}</dd></div></dl><button type="button" class="politician-compare-remove" data-compare-remove="${esc(item.id)}" data-layout-route="${esc(queryRoute(nextIds))}">비교에서 빼기</button></article>`;
}

function futureMatrix(items,capacity){
  const rows=['관심 구조','활동·미디어','관심 전이','위험·기회','전략 솔루션'];
  const cells=item=>`<td${item?'':' class="is-empty"'}><b>—</b><small>세부 데이터 연결 후 표시</small></td>`;
  return `<section class="content-card politician-compare-matrix-shell"><div class="section-title"><div><span class="eyebrow">COMPARISON FRAME</span><h2>비교 인텔리전스 배치</h2></div><span>프로필·사진 데이터만 표시</span></div><p class="politician-compare-matrix-notice">분석 수치와 판정은 생성하지 않았습니다. 모든 정치인의 상세 데이터가 연결되면 이 레이아웃에 동일 기준으로 표시됩니다.</p><div class="politician-compare-table-scroll"><table class="politician-compare-table capacity-${capacity}"><thead><tr><th>비교 항목</th>${items.map(item=>`<th>${item?esc(item.name):'선택 대기'}</th>`).join('')}</tr></thead><tbody>${rows.map(label=>`<tr><th>${label}</th>${items.map(cells).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}

function pickerCard(item,ids,atLimit){
  const selected=ids.includes(item.id);
  const nextIds=selected?ids:[...ids,item.id];
  return `<article class="politician-compare-picker-card${selected?' is-selected':''}">${profilePhoto(item,'politician-compare-picker-avatar')}<div><b>${esc(item.name)}</b><span>${esc([item.party,item.jurisdiction].filter(Boolean).join(' · '))}</span></div>${selected?'<em>선택됨</em>':atLimit?'<em class="is-disabled">선택 한도</em>':`<button type="button" data-compare-add="${esc(item.id)}" data-layout-route="${esc(queryRoute(nextIds))}">추가</button>`}</article>`;
}

export async function renderPoliticianCompare(service,route='/compare',session=null){
  const isAdmin=session?.user?.role==='admin',role=isAdmin?'admin':'public',limit=isAdmin?5:2;
  const query=new URLSearchParams(String(route).split('?')[1]||'');
  const rawIds=String(query.get('ids')||'').split(',').map(id=>id.trim()).filter(Boolean);
  const ids=[...new Set(rawIds)].slice(0,limit);
  const [directory,...selectedResults]=await Promise.all([
    service.list('assembly',0,30).catch(()=>({ok:false,items:[]})),
    ...ids.map(id=>service.get(id).catch(()=>({ok:false})))
  ]);
  const selected=selectedResults.filter(result=>result?.ok&&result.item).map(result=>result.item);
  const selectedIds=selected.map(item=>item.id),slots=Array.from({length:limit},(_,index)=>selected[index]||null);
  const candidates=directory?.ok&&Array.isArray(directory.items)?directory.items:[];
  const title=isAdmin?'관리자 다중 비교':'정치인 1:1 비교';
  const eyebrow=isAdmin?'JCS MULTI POLITICAL INTELLIGENCE':'POLITICIAN COMPARE';
  const description=isAdmin?'2명부터 최대 5명까지 같은 화면에서 비교하는 관리자 전용 레이아웃입니다.':'비로그인·일반회원은 두 정치인의 공식 프로필을 1:1로 비교합니다.';
  return `<main class="subpage politician-compare-page compare-capacity-${limit}" data-compare-role="${role}" data-compare-limit="${limit}"><section class="page-hero politician-compare-hero"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p><div class="politician-compare-capacity"><strong>${selected.length}</strong><span>/ ${limit}명 선택</span><b>${isAdmin?'최대 5명':'1:1 전용'}</b></div></section><section class="content-card politician-compare-selection"><div class="section-title"><div><span class="eyebrow">SELECTED PROFILES</span><h2>비교 대상</h2></div><span>프로필·사진 데이터만 표시</span></div><div class="politician-compare-slots">${slots.map((item,index)=>selectedSlot(item,index,selectedIds)).join('')}</div></section>${futureMatrix(slots,limit)}<section class="content-card politician-compare-picker"><div class="section-title"><div><span class="eyebrow">ASSEMBLY DIRECTORY</span><h2>국회의원 선택</h2></div><span>${selected.length>=limit?'선택 한도 도달':`${limit-selected.length}명 추가 가능`}</span></div>${candidates.length?`<div class="politician-compare-picker-grid">${candidates.map(item=>pickerCard(item,selectedIds,selected.length>=limit)).join('')}</div>`:'<div class="empty-state"><h2>정치인 목록을 불러오지 못했습니다</h2><p>정치인 DB 연결 상태를 확인해 주세요.</p></div>'}</section></main>`;
}
