const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const count=value=>number(value).toLocaleString('ko-KR');
const percent=(selected,total)=>number(total)?`${(number(selected)/number(total)*100).toFixed(1)}%`:'—';

export async function loadPartyStats(){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch('/api/v3/taxi/party-stats',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
    const data=await response.json();
    return response.ok&&data?.ok===true&&Array.isArray(data.parties)&&Array.isArray(data.questions)?data:null;
  }catch{return null;}finally{clearTimeout(timeout);}
}

function comparison(data,first=false){
  const total=number(first?data.firstResponses:data.responses),selectedKey=first?'firstSelected':'selected',shownKey=first?'firstShown':'shown';
  const parties=Array.isArray(data.parties)?data.parties:[];
  return `<div class="taxi-party-table-wrap" tabindex="0" role="region" aria-label="${first?'첫 응답':'전체 응답'} 정당별 선택 비교"><table class="taxi-party-table"><caption>${first?'첫 응답':'전체 응답'} · ${count(total)}건 기준</caption><thead><tr><th scope="col">정당</th><th scope="col">선택 응답</th><th scope="col">응답 비율</th><th scope="col">보기 노출</th></tr></thead><tbody>${parties.map(party=>`<tr><th scope="row">${esc(party.name||party.id)}</th><td>${count(party[selectedKey])}건</td><td>${percent(party[selectedKey],total)}</td><td>${count(party[shownKey])}회</td></tr>`).join('')}<tr class="taxi-party-none"><th scope="row">해당 없음</th><td>${count(first?data.firstNone:data.none)}건</td><td>${percent(first?data.firstNone:data.none,total)}</td><td>—</td></tr></tbody></table></div>`;
}

export function renderPartyStats(data){
  const head='<header class="taxi-party-head"><span>BLIND RESEARCH 02</span><h2>리얼택시 블라인드 정당 데이터</h2><p>정당 이름을 가린 정책 보기에서 어떤 선택이 나왔는지, 전체 정당을 함께 비교합니다.</p><a class="taxi-party-drive" href="/mine?mode=party" data-layout-route="/mine?mode=party">정당 블라인드 리서치 참여하기</a></header>';
  if(data===undefined)return `<section class="taxi-party-stats" aria-busy="true">${head}<p class="taxi-party-state" role="status">정당 응답 기록을 불러오는 중입니다.</p></section>`;
  if(!data||data.ok!==true)return `<section class="taxi-party-stats">${head}<p class="taxi-party-state" role="status">정당 응답 기록을 불러오지 못했습니다. 잠시 후 다시 열어주세요.</p></section>`;
  const questions=Array.isArray(data.questions)?data.questions:[];
  return `<section class="taxi-party-stats">${head}<dl class="taxi-party-summary"><div><dt>전체 응답</dt><dd>${count(data.responses)}<small>건</small></dd></div><div><dt>첫 응답</dt><dd>${count(data.firstResponses)}<small>건</small></dd></div><div><dt>해당 없음</dt><dd>${count(data.none)}<small>건</small></dd></div></dl>${!number(data.responses)?'<p class="taxi-party-state" role="status">아직 기록된 응답이 없습니다. 첫 선택이 기록되면 비교 데이터가 표시됩니다.</p>':''}<div class="taxi-party-method"><p>응답 수는 참여 인원 수가 아닙니다. 한 번의 운행에서 여러 문항에 응답할 수 있으며, 전체 응답에는 다시 참여한 응답도 포함됩니다.</p><p>비율은 ‘해당 없음’을 포함한 응답 수를 기준으로 계산합니다. 보기 노출은 정책 비교 보기를 연 횟수로, 선택하지 않고 떠난 경우도 포함됩니다.</p><p>첫 응답은 같은 문항·버전에서 로그인 계정 또는 비회원 브라우저의 최초 응답입니다. 게임 기록을 초기화해도 공개 누적 집계와 첫 응답 기록은 유지됩니다.</p></div><section class="taxi-party-comparison"><h3>전체 응답 비교</h3>${comparison(data)}</section><section class="taxi-party-comparison"><h3>첫 응답 비교</h3>${comparison(data,true)}</section><section class="taxi-party-questions"><h3>문항별 선택</h3><p>문항을 열면 전체 응답과 첫 응답을 각각 확인할 수 있습니다.</p>${questions.length?questions.map((question,index)=>`<details class="taxi-party-question"><summary><span>${String(index+1).padStart(2,'0')} · ${esc(question.domain)}</span><strong>${esc(question.title||question.id)}</strong><small>응답 ${count(question.responses)}건</small></summary><div class="taxi-party-question-body">${comparison(question)}${comparison(question,true)}</div></details>`).join(''):'<p class="taxi-party-state">표시할 문항 기록이 없습니다.</p>'}</section><footer class="taxi-party-note"><p>정책 보기 선택을 모은 게임 참여 기록입니다. 대표성 있는 여론조사나 정당 지지율이 아니며, 특정 정치인의 소속 정당에 한정하지 않은 전체 비교입니다.</p><small>문항 버전 ${esc(data.version||'—')}</small></footer></section>`;
}
