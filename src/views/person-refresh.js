const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('ko-KR'):'미확인';
const volume=(row,field)=>row?.[field+'Range']?'10건 미만':number(row?.[field]);
export function renderCollectionProfile(profile,record){
 const selected=record.collectionProfile||{mode:'name',searchKeywords:[],newsRegions:[]};
 return `<form class="person-collection-profile" data-collection-profile-form="${esc(profile.id)}"><h4>이 인물의 수집 검색어</h4><label>수집 방식<select name="mode"><option value="name"${selected.mode==='name'?' selected':''}>이름으로 수집</option><option value="specified"${selected.mode==='specified'?' selected':''}>지정 검색어로 수집</option></select></label><label>검색량 키워드 · 한 줄에 하나, 최대 5개<textarea name="searchKeywords" rows="4" placeholder="전북박지원&#10;군산박지원">${esc(selected.searchKeywords.join('\n'))}</textarea></label><label>뉴스 지역 조건 · 한 줄에 하나, 최대 5개<textarea name="newsRegions" rows="4" placeholder="전북&#10;군산">${esc(selected.newsRegions.join('\n'))}</textarea></label><p>지정 검색어만 집계하며 이름 단독 검색량으로 대체하지 않습니다. 뉴스는 이름과 지역 조건 중 하나가 함께 있어야 합니다.</p><button type="submit" class="ghost-btn">검색어 저장</button><span data-refresh-state role="status"></span></form>`;
}
export function renderRefreshPolicy(policy={}){
 return `<section class="content-card person-refresh-settings"><h3>회원의 정치인 개별 갱신</h3><p>기존 충전 포인트를 사용합니다. 수집과 게시가 성공할 때만 차감하며, 성공한 회원에게 선택한 정치인의 진단 01~10과 전략 처방을 24시간 개방합니다. 실패하면 차감하지 않습니다.</p><form data-refresh-policy-form><label><input type="checkbox" name="enabled"${policy.enabled?' checked':''}>회원용 포인트 갱신 활성화</label><label>1회 이용료 (P)<input name="fee" type="number" min="1" max="1000000" step="1" value="${policy.fee||''}" placeholder="이용료 입력"></label><label>같은 인물의 재갱신 간격 (분)<input name="cooldownMinutes" type="number" min="1" max="1440" value="${policy.cooldownMinutes||10}" required></label><button class="primary-btn" type="submit">이용 설정 저장</button><span data-refresh-state role="status"></span></form></section>`;
}
export function renderRefreshSummary(result={}){
 const summary=result.summary||{},search=summary.search,news=summary.news,rank=result.rank||summary.rank,old=result.previousRank||summary.previousRank;
 if(!search&&!news)return '';
 const keywords=search?.keywords||[{keyword:search?.keyword||'이름 검색',volume:search?.volume||{}}],count=Array.isArray(news?.periodCounts)?news.periodCounts.find(x=>x.label==='30D')?.value:news?.periodCounts?.d30;
 return `<div class="person-refresh-result"><h4>수집 결과</h4><div class="person-refresh-table"><table><thead><tr><th>검색어</th><th>PC</th><th>모바일</th></tr></thead><tbody>${keywords.map(row=>`<tr><td>${esc(row.keyword)}</td><td>${volume(row.volume,'pc')}</td><td>${volume(row.volume,'mobile')}</td></tr>`).join('')}</tbody></table></div>${search?.keywordMode==='specified'?`<p>순위에 반영하는 확인된 검색량 합계: <b>${number(search.confirmedVolume?.total)}건</b>${search.confirmedVolume?.complete?'':' · 미확인·10건 미만 수치는 합계에서 제외'}</p>`:''}<p>30일 기사 ${number(count??news?.items?.length)}건 · 제외 ${number(news?.excludedCount||0)}건</p>${rank?`<p>전체 NOW ${old?number(old.rank)+'위 → ':''}<b>${number(rank.rank)}위</b></p>`:''}<details><summary>수집 기사 확인 · ${Math.min(30,news?.items?.length||0)}건 표시</summary><ul>${(news?.items||[]).slice(0,30).map(item=>`<li>${/^https:\/\//.test(item.url||'')?`<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a>`:esc(item.title)}<small>${esc(item.source)}</small></li>`).join('')||'<li>조건에 맞는 기사가 없습니다.</li>'}</ul></details></div>`;
}
export function renderMemberRefreshAction(item,session){
 if(!session?.authenticated||session.user?.role==='admin')return '';
 const id=`person-refresh-top-${String(item.id).replace(/[^a-zA-Z0-9_-]/g,'-')}`;
 return `<button type="button" data-member-refresh-open="${esc(item.id)}" aria-controls="${id}" aria-expanded="false">갱신하기</button>`;
}
export function renderMemberRefreshMount(item,session,placement='bottom'){
 if(!session?.authenticated)return '';
 if(session.user?.role==='admin')return placement==='top'?'':`<section class="content-card person-refresh-member"><a class="ghost-btn" href="/admin?tab=politicians&amp;q=${encodeURIComponent(item.name)}&amp;person=${esc(item.id)}" data-layout-route="/admin?tab=politicians&amp;q=${encodeURIComponent(item.name)}&amp;person=${esc(item.id)}">${esc(item.name)} 개별 수집·게시 관리</a></section>`;
 const top=placement==='top',id=top?` id="person-refresh-top-${String(item.id).replace(/[^a-zA-Z0-9_-]/g,'-')}"`:'';
 return `<section${id} class="content-card person-refresh-member${top?' person-refresh-member-top':''}" data-member-refresh="${esc(item.id)}" data-person-name="${esc(item.name)}" data-refresh-user="${esc(session.user?.id)}" data-refresh-placement="${top?'top':'bottom'}"${top?' role="region" aria-label="유료 데이터 갱신" tabindex="-1"':''} hidden></section>`;
}
export function renderMemberRefreshQuote(quote,name){
 return `<h3>${esc(name)} 데이터 갱신</h3><p>이 인물의 최신 자료를 다시 수집해 분석과 순위에 반영하고, 관리자 수준 진단 01~10과 전략 처방을 24시간 열람합니다.</p><p>1회 <b>${number(quote.fee)}P</b> · 보유 ${number(quote.balance)}P</p><button type="button" class="primary-btn" data-member-refresh-start>포인트 사용 · 갱신</button> <a class="ghost-btn" href="/points" data-layout-route="/points">포인트 충전</a><small>수집·게시에 성공할 때만 차감됩니다. 24시간 동안 재열람과 비교는 추가 포인트를 사용하지 않습니다. 다시 갱신하면 확인 후 같은 이용료가 부과됩니다.</small><p data-refresh-state role="status" aria-live="polite"></p><button class="ghost-btn" type="button" data-member-refresh-check hidden>처리 상태 확인</button>`;
}

const remainingLabel=milliseconds=>{const total=Math.max(0,Math.ceil(Number(milliseconds||0)/1000)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}시간 ${minutes}분`:`${minutes}분 ${seconds}초`;};
export function renderAnalysisAccess(access,personIds=[]){
 if(!access?.active||!Number.isFinite(Number(access.expiresAt))||!Number.isFinite(Number(access.serverNow)))return '';
 const expiresAt=Number(access.expiresAt),serverNow=Number(access.serverNow),ids=(Array.isArray(personIds)?personIds:[personIds]).filter(Boolean),compare=ids.length?`<a class="ghost-btn" href="/compare?ids=${encodeURIComponent(ids.join(','))}" data-layout-route="/compare?ids=${encodeURIComponent(ids.join(','))}">열람권 인물 비교하기</a>`:'';
 const end=new Date(expiresAt).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 return `<aside class="person-analysis-access" data-analysis-access data-access-expires-at="${expiresAt}" data-access-server-now="${serverNow}" data-access-rendered-at="${Date.now()}"><div><strong>24시간 심층 분석 열람 중</strong><span>종료 <time datetime="${new Date(expiresAt).toISOString()}">${esc(end)}</time></span><span data-analysis-remaining>남은 시간 ${remainingLabel(expiresAt-serverNow)}</span></div>${compare}</aside>`;
}
