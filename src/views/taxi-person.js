import {personMetaMarkup} from '../ui/person-party.js?v=0.0.31.494';
import {renderTaxiNumberEditor} from '../ui/taxi-number-editor.js?v=0.0.31.491';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>Math.max(0,Number(value)||0);
const count=value=>number(value).toLocaleString('ko-KR');
const distance=value=>`${(number(value)/1000).toLocaleString('ko-KR',{maximumFractionDigits:2})} km`;
const rate=(value,total)=>number(total)?`${Math.min(100,number(value)/number(total)*100).toFixed(1)}%`:'—';
const driveLink='<a class="taxi-person-drive" href="/mine" data-layout-route="/mine">운행하기</a>';

export function renderPersonDetailTabs(id,active='details'){
  const base=`/person/${encodeURIComponent(id)}`;
  return `<nav class="person-detail-tabs" aria-label="정치인 상세 메뉴"><a href="${base}" data-layout-route="${base}"${active==='details'?' aria-current="page"':''}>정치인 정보</a><a href="${base}?tab=taxi" data-layout-route="${base}?tab=taxi"${active==='taxi'?' aria-current="page"':''}>블라인드 리서치</a></nav>`;
}

export async function loadTaxiPersonStats(id){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    let token='';try{token=localStorage.getItem('jcs-real-taxi-session-v1')||'';}catch{}
    const response=await fetch(`/api/v3/taxi/stats?personId=${encodeURIComponent(id)}`,{credentials:'same-origin',headers:token?{'X-Taxi-Session':token}:{},cache:'no-store',signal:controller.signal});
    const data=await response.json();
    return response.ok&&data?.ok?data:null;
  }catch{return null;}finally{clearTimeout(timeout);}
}

function metrics(stats){
  const rides=number(stats?.rides);
  return `<dl class="taxi-person-metrics"><div><dt>총 운행</dt><dd>${count(rides)}<small>회</small></dd></div><div><dt>평균 동승 거리</dt><dd>${rides?distance(number(stats?.distanceMeters)/rides):'—'}</dd></div><div><dt>완주율</dt><dd>${rate(stats?.completed,rides)}</dd></div><div><dt>공감한 운행</dt><dd>${count(stats?.likedRides)}<small>회</small></dd></div></dl>`;
}

export function renderTaxiPersonStats(data,item={},options={}){
  const photo=item.photo?.url||item.photo?.localPath||'',meta=personMetaMarkup(item);
  const hero=`<header class="taxi-person-hero"><div class="taxi-person-identity"><div class="taxi-person-header-tools"><span class="taxi-person-kicker">블라인드 리서치 01 · 리얼택시</span></div><div class="taxi-person-profile"><div class="taxi-person-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(item.name)}" style="object-position:${esc(item.photo?.focus||'50% 28%')}" width="88" height="104">`:`<span>${esc(String(item.name||'?').slice(0,1))}</span>`}</div><div class="taxi-person-profile-copy"><div class="taxi-person-name-row"><h1>${esc(item.name)}</h1>${data?.canEdit?renderTaxiNumberEditor(item.id):''}</div><p class="taxi-person-office">${esc(item.office||item.roleLabel||'정치인')}</p><p class="taxi-person-meta">${meta}</p></div></div><div class="taxi-person-actions">${options.actions||''}</div></div><div class="taxi-person-scene"><img src="/assets/taxi/home-taxi-479.svg" alt="" width="280" height="150"><p>이야기를 듣고, 함께 달린 거리</p></div></header>`;
  if(!data)return `<section class="taxi-person-panel">${hero}<div class="taxi-person-empty"><h3>운행 기록을 불러오지 못했습니다.</h3><p>잠시 후 블라인드 리서치 탭을 다시 열어주세요.</p></div></section>`;
  if(data.registered!==true)return `<section class="taxi-person-panel">${hero}<div class="taxi-person-empty"><p>택시정보가 없습니다. 업데이트를 기다려주세요.</p></div></section>`;
  const totals=data.totals||{},first=data.first||{},beats=Array.isArray(data.beats)?data.beats.slice(0,5):[];
  return `<section class="taxi-person-panel">${hero}<div class="taxi-person-distance"><span>모든 운행의 누적 동승 거리</span><strong>${distance(totals.distanceMeters)}</strong><p>첫 만남과 다시 만난 운행을 모두 합산합니다.</p></div>${metrics(totals)}${!number(totals.rides)?`<div class="taxi-person-empty"><h3>아직 운행 기록이 없습니다.</h3>${driveLink}</div>`:''}<div class="taxi-person-first"><h3>첫 만남의 기록</h3><p>로그인 계정 또는 비회원 브라우저 기록을 기준으로, 처음 이야기를 듣고 하차한 운행만 모았습니다.</p><p class="taxi-person-first-distance">누적 거리 <b>${distance(first.distanceMeters)}</b></p>${metrics(first)}</div>${beats.length?`<section class="taxi-person-reactions"><h3>이야기별 반응</h3><p>각 이야기에 도달한 운행과 선택을 확인합니다.</p><div class="taxi-person-table-wrap"><table><caption class="taxi-person-sr">다섯 가지 이야기의 청취·공감·하차·계속 듣기 횟수</caption><thead><tr><th scope="col">이야기</th><th scope="col">청취</th><th scope="col">공감</th><th scope="col">하차</th><th scope="col">계속 듣기</th></tr></thead><tbody>${beats.map((beat,index)=>`<tr><th scope="row"><span>${String(index+1).padStart(2,'0')}</span>${esc(beat.title||`이야기 ${index+1}`)}</th><td>${count(beat.heard)}</td><td>${count(beat.likes)}</td><td>${count(beat.dropoffs)}</td><td>${count(beat.continued)}</td></tr>`).join('')}</tbody></table></div></section>`:''}${data.my?`<aside class="taxi-person-my"><h3>나의 동승 기록</h3><p>${count(data.my.rides)}회 운행 · ${distance(data.my.distanceMeters)}</p></aside>`:''}<footer class="taxi-person-footer">${data.adjusted?'<small class="taxi-person-adjusted">운영진의 수치 보정이 포함되어 있습니다.</small>':''}<p>공개 운행 전환 이후 이야기를 듣고 하차한 기록부터 합산합니다. 가상 주행 거리와 게임 안에서의 선택 기록입니다. 지지도나 여론조사 결과가 아닙니다. 완주율은 전체 운행 중 마지막 이야기까지 마친 비율입니다. 공감한 운행은 한 번 이상 공감한 운행 수입니다.</p>${number(totals.rides)?driveLink:''}<small>승객은 무작위로 만납니다.</small></footer></section>`;
}
