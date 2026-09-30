import {canViewAdminAnalysis} from '../core/membership.js?v=0.0.31.354';
import {renderComparisonBoard} from './comparison-board.js?v=0.0.31.364';
import { renderAnalysisAccess } from './person-refresh.js?v=0.0.31.362';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function queryRoute(ids,run=false){
  if(!ids.length)return '/compare';
  return `/compare?ids=${encodeURIComponent(ids.join(','))}${run?'&run=1':''}`;
}

function profilePhoto(item,className){
  const src=String(item?.photo?.url||item?.photo?.localPath||'');
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

function renderDiagnosticComparison(entries,role,strategyId='',access=null){
 return renderComparisonBoard(entries,{role,accessMarkup:role==='paid'?renderAnalysisAccess(access,entries.map(entry=>entry.item.id)):''});
}

const resultAccess=result=>result?.analysisAccess||result?.intelligence?.analysisAccess||null;
const hasActivePaidAccess=result=>{
  const access=resultAccess(result),tier=result?.accessTier||result?.intelligence?.accessTier;
  return tier==='admin'&&access?.personId===result?.item?.id&&access?.active===true&&Number(access.expiresAt)>Number(access.serverNow);
};
function sharedAnalysisAccess(records){
  const access=records.map(record=>resultAccess(record.result)).filter(Boolean);
  if(!access.length)return null;
  return {active:true,serverNow:Math.max(...access.map(row=>Number(row.serverNow)||0)),expiresAt:Math.min(...access.map(row=>Number(row.expiresAt)||0)),grantedAt:Math.max(...access.map(row=>Number(row.grantedAt)||0))};
}
function renderCompareAccessGate(records,ids){
  const failures=records.filter(record=>!record.result?.ok||!record.result.item),locked=records.filter(record=>record.result?.ok&&record.result.item&&!hasActivePaidAccess(record.result));
  const failureRows=failures.map(record=>`<li><b>${esc(record.id)}</b><span>비교 데이터를 불러오지 못했습니다. 다시 시도해 주세요.</span></li>`).join('');
  const lockedRows=locked.map(record=>{const item=record.result.item,access=resultAccess(record.result),expired=access&&Number(access.expiresAt)>0&&Number(access.expiresAt)<=Number(access.serverNow);return `<li><b>${esc(item.name)}</b><span>${expired?'24시간 열람권이 만료되었습니다.':'심층 분석 열람권이 필요합니다.'}</span><a href="/person/${encodeURIComponent(item.id)}" data-layout-route="/person/${encodeURIComponent(item.id)}">상세에서 갱신하기</a></li>`;}).join('');
  return `<section class="content-card politician-compare-access-gate" data-compare-access-gate><span class="eyebrow">ANALYSIS ACCESS</span><h2>모든 비교 대상의 열람 상태를 확인해 주세요</h2><p>심층 비교는 요청한 모든 정치인의 데이터를 불러오고 24시간 열람권이 유효할 때 표시됩니다. 잠긴 인물의 상세 페이지에서 갱신한 뒤 같은 대상을 다시 비교해 주세요.</p><ul>${failureRows}${lockedRows}</ul><button type="button" class="ghost-btn" data-layout-route="${esc(queryRoute(ids,true))}">모두 다시 확인</button></section>`;
}

export async function renderPoliticianCompare(service,route='/compare',session=null){
  const isAdmin=canViewAdminAnalysis(session?.user),isMember=!!session?.user&&!isAdmin,fetchLimit=isAdmin||isMember?4:2;
  const query=new URLSearchParams(String(route).split('?')[1]||'');
  const rawIds=[...new Set(String(query.get('ids')||'').split(',').map(id=>id.trim()).filter(Boolean))];
  const ids=rawIds.slice(0,fetchLimit),run=query.get('run')==='1'&&ids.length>=2;
  const searchQuery=String(query.get('q')||'').trim();
  const [selectedResults,searchResponse]=await Promise.all([
    Promise.all(ids.map(async id=>{const requestedAt=Date.now();const result=await (run&&service.getForCompare?service.getForCompare(id):service.get(id)).catch(()=>({ok:false,error:'POLITICIAN_REQUEST_FAILED'}));return {result,requestedAt};})),
    searchQuery?service.search(searchQuery,12).catch(()=>({ok:false,items:[]})):Promise.resolve({ok:true,items:[]})
  ]);
  // Include request transit and slower peers conservatively; never extend a near-expiry grant.
  const renderedAt=Date.now(),observedTimes=selectedResults.map(({result,requestedAt})=>{const time=Number(resultAccess(result)?.serverNow);return Number.isFinite(time)&&time>0?time+Math.max(0,renderedAt-requestedAt):0;});
  const serverNow=Math.max(0,...observedTimes);
  const records=selectedResults.map(({result},index)=>{
    if(result?.ok&&result.item?.id!==ids[index])return {id:ids[index],result:{ok:false,error:'PERSON_ID_MISMATCH'}};
    const access=resultAccess(result);
    return {id:ids[index],result:access?{...result,analysisAccess:{...access,serverNow}}:result};
  });
  const allLoaded=records.length===ids.length&&records.every(record=>record.result?.ok&&record.result.item&&record.result.intelligence),paidRecords=records.filter(record=>hasActivePaidAccess(record.result)),hasPaid=isMember&&paidRecords.length>0;
  const needsDeepAccess=isMember&&records.some(record=>Number(resultAccess(record.result)?.expiresAt)>0||record.result?.intelligence?.accessTier==='admin');
  const limit=isAdmin||hasPaid||isMember&&ids.length>2?4:2,searchSlot=Math.min(limit,Math.max(1,Number(query.get('slot')||ids.length+1)||1));
  const entries=records.filter(record=>record.result?.ok&&record.result.item).map(record=>({item:record.result.item,intelligence:record.result.intelligence||null})),selected=entries.map(entry=>entry.item);
  const slots=Array.from({length:limit},(_,index)=>records[index]||null),searchState={query:searchQuery,slot:searchSlot,items:searchResponse?.ok&&Array.isArray(searchResponse.items)?searchResponse.items:[]};
  const deepEligible=isAdmin&&allLoaded||isMember&&allLoaded&&records.length>=2&&paidRecords.length===records.length;
  const ordinaryMember=isMember&&allLoaded&&records.length===2&&paidRecords.length===0&&!needsDeepAccess;
  const role=isAdmin?'admin':deepEligible?'paid':isMember?'member':'public';
  const title=isAdmin?'관리자 다중 비교':hasPaid?'24시간 심층 비교':'정치인 1:1 비교';
  const eyebrow=isAdmin?'JCS MULTI POLITICAL INTELLIGENCE':hasPaid?'JCS 24H DEEP COMPARE':'POLITICIAN COMPARE';
  const description=isAdmin?'2명부터 최대 4명까지 같은 기준의 관리자 인텔리전스를 비교합니다.':hasPaid?'열람권이 유효한 2~4명의 진단 01~10을 추가 차감 없이 비교합니다.':isMember?'두 정치인의 회원 분석 항목을 1:1로 비교합니다.':'두 정치인의 3개 공개 진단 항목을 1:1로 비교합니다.';
  const strategyId=String(query.get('strategy')||ids[0]||''),ready=ids.length>=2;
  let analysis=`<section class="content-card politician-compare-ready"><b>${ready?'선택이 완료되었습니다':'비교할 정치인을 검색해 선택하세요'}</b><p>${ready?'비교하기를 누르면 선택한 인물의 정보가 한 번에 열립니다.':'정치인 이름·정당·지역을 검색해 비교 대상을 채워주세요.'}</p></section>`;
  if(run){
    if(rawIds.length>fetchLimit)analysis=`<section class="content-card politician-compare-access-gate" data-compare-access-gate><h2>최대 ${fetchLimit}명까지 비교할 수 있습니다.</h2><p>선택한 인물 수를 줄인 뒤 다시 비교해 주세요.</p></section>`;
    else if(!allLoaded)analysis=renderCompareAccessGate(records,ids);
    else if(isMember&&paidRecords.length>0&&paidRecords.length!==records.length)analysis=renderCompareAccessGate(records,ids);
    else if(isMember&&records.length>2&&!deepEligible)analysis=renderCompareAccessGate(records,ids);
    else if(deepEligible)analysis=renderDiagnosticComparison(entries,role,strategyId,sharedAnalysisAccess(records));
    else if(ordinaryMember||!isMember)analysis=renderDiagnosticComparison(entries,role,strategyId);
    else analysis=renderCompareAccessGate(records,ids);
  }
  const slotMarkup=slots.map((record,index)=>record?(record.result?.ok&&record.result.item?selectedSlot(record.result.item,index,ids):failedSlot(record.id,index,ids,run)):selectedSlot(null,index,ids)).join('');
  const availableResults=searchState.items.filter(candidate=>!ids.includes(candidate.id));
  const submittedResults=searchState.query?`<div class="politician-compare-search-results politician-compare-global-results" data-compare-search-results>${availableResults.length?availableResults.map(candidate=>searchResult(candidate,ids)).join(''):'<p>검색 결과가 없습니다.</p>'}</div>`:'';
  const globalSearch=ids.length<limit?`<form class="politician-compare-global-search" data-compare-search-form data-compare-search-slot="${Math.min(limit,ids.length+1)}" data-compare-search-base="${esc(queryRoute(ids))}" role="search"><label for="compare-person-search">정치인 추가</label><div class="politician-compare-global-search-field"><input id="compare-person-search" type="search" name="q" value="${esc(searchState.query)}" placeholder="정치인 이름·정당·지역 검색" autocomplete="off" data-politician-autocomplete data-politician-select-mode="compare" data-politician-base="${esc(queryRoute(ids))}" required><button type="submit">검색</button></div>${submittedResults}</form>`:'';
  const runButton=ready?`<div class="politician-compare-run-row"><button class="primary-btn" type="button" data-compare-run data-layout-route="${esc(queryRoute(ids,true))}">${run?'다시 비교하기':'비교하기'}</button></div>`:'';
  if(run&&analysis.includes('data-compare-board'))return `<main class="subpage politician-compare-page compare-workspace" data-compare-role="${role}" data-compare-limit="${limit}" data-compare-executed="true"><div class="cb-topbar"><a href="/" data-layout-route="/">← 정참시</a><b>정치인 비교분석</b><span>${entries.length}명 비교 중</span></div><details class="cb-selection"><summary>비교 대상 변경 <span>${selected.map(item=>esc(item.name)).join(' · ')} ＋</span></summary><section class="politician-compare-selection">${globalSearch}<div class="politician-compare-slots">${slotMarkup}</div>${runButton}</section></details>${analysis}</main>`;
  return `<main class="subpage politician-compare-page compare-workspace compare-setup compare-capacity-${limit}" data-compare-role="${role}" data-compare-limit="${limit}" data-compare-executed="${run}"><div class="cb-topbar"><a href="/" data-layout-route="/">← 정참시</a><b>정치인 비교분석</b><span>대상 선택</span></div><section class="page-hero politician-compare-hero"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p><div class="politician-compare-capacity"><strong>${ids.length}</strong><span>/ ${limit}명 선택</span><b>${limit===4?'최대 4명':'1:1 전용'}</b></div></section><section class="content-card politician-compare-selection"><div class="section-title"><div><span class="eyebrow">SELECTED PROFILES</span><h2>비교 대상</h2></div><span>검색하여 선택 · ${limit===4?'2~4명 비교':'1:1 비교'}</span></div>${globalSearch}<div class="politician-compare-slots">${slotMarkup}</div>${runButton}</section>${analysis}</main>`;
}
