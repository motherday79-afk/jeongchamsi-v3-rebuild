const API = '/api/v3/territory';
const OPERATION_KEY = 'jcs-territory-pending-v1';
const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const format = (value) => number(value).toLocaleString('ko-KR');
const color = (value) => /^#[\da-f]{6}$/i.test(value || '') ? value : '#889b79';
let state = null;
let offset = 0;
let busy = false;
let loading = false;
let pending = null;
let selectedParty = '';
let lastSync = 0;
let readSequence = 0;
try { const saved = JSON.parse(sessionStorage.getItem(OPERATION_KEY) || 'null'); if (saved && ['join','act','upgrade'].includes(saved.action) && typeof saved.requestId === 'string') pending = saved; } catch { /* Storage is optional; a live request is still kept in memory. */ }
const now = () => Date.now() + offset;
const party = (id) => state?.parties?.find((item) => item.id === id);
const rules = () => state?.rules || {};
const timeLeft = (timestamp) => {
  const seconds = Math.max(0, Math.ceil((number(timestamp) - now()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  return days ? `${days}일 ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}` : `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(remainder).padStart(2,'0')}`;
};
function notice(message, error = false) { const target = $('#notice'); target.textContent = message; target.classList.toggle('error', error); target.hidden = !message; }
function persist() { try { if (pending) sessionStorage.setItem(OPERATION_KEY, JSON.stringify(pending)); else sessionStorage.removeItem(OPERATION_KEY); } catch { /* Never retry with a new id when persistence is unavailable. */ } }
function updatePending() { $('#unknown').hidden = !pending || busy; $('#retry-operation').disabled = busy; updateButtons(); }
function focusedRender(target, html) {
  const active = document.activeElement;
  const focusKey = target.contains(active) ? active.dataset.focus : null;
  target.innerHTML = html;
  if (focusKey) [...target.querySelectorAll('[data-focus]')].find((element) => element.dataset.focus === focusKey)?.focus({preventScroll:true});
}
function accept(data) {
  if (!data || data.ok !== true || !data.round || !Array.isArray(data.territories) || !Array.isArray(data.parties)) throw new Error('INVALID_RESPONSE');
  const previousRound = state?.round?.id;
  state = data;
  offset = Number.isFinite(Number(data.serverNow)) ? Number(data.serverNow) - Date.now() : 0;
  lastSync = Date.now();
  if (previousRound && previousRound !== data.round.id) { selectedParty = ''; notice('새로운 주간 라운드가 시작됐어요. 이번 주 함께할 정당을 다시 선택해 주세요.'); }
  render();
}
function playerMarkup() {
  const player = state.player;
  if (!player) return '<div><div class="player-heading">우리 정당의 다음 한 수, 함께할까요?</div><p class="player-description">로그인하면 정당 선택과 정치 활동에 참여할 수 있어요. 관전은 누구나 가능합니다.</p></div><a class="primary-button" href="/login?return=/mine">로그인하고 참여</a>';
  const stats = `<div class="player-stats"><div class="stat"><span class="stat-label">보유 JCS 포인트</span><strong>${format(player.balance)} <small>P</small></strong></div><div class="stat"><span class="stat-label">정치 활동력</span><strong>${format(player.energy)} <small>/ ${format(rules().maxEnergy)}</small></strong><div class="energy-track"><i style="width:${Math.min(100,number(player.energy)/number(rules().maxEnergy)*100)}%"></i></div><small class="stat-label" id="energy-clock"></small></div><div class="stat"><span class="stat-label">이번 주 내 기여</span><strong>${format(player.contribution)}</strong></div><a class="primary-button" href="/points">포인트 충전</a></div>`;
  if (!player.partyId) return `<div class="party-join"><div class="party-join-heading"><div><div class="player-heading">이번 주, 어느 정당과 함께할까요?</div><p class="player-description">참여는 무료 · 선택한 정당은 라운드 종료까지 변경할 수 없어요.</p></div><span class="player-description">보유 포인트 <strong>${format(player.balance)} P</strong></span></div><form id="join-form"><div class="party-options">${state.parties.map((item) => `<label class="party-choice" style="--party:${color(item.color)}"><input type="radio" name="party" value="${escape(item.id)}" data-focus="party-${escape(item.id)}" ${selectedParty === item.id ? 'checked' : ''} required><span class="party-dot"></span>${escape(item.name)}</label>`).join('')}</div><button type="submit" class="primary-button join-submit" data-operation="join" data-focus="join">선택한 정당으로 이번 주 참여</button></form></div>`;
  const mine = party(player.partyId);
  return `<div><div class="player-heading" style="--party:${color(mine?.color)}"><span class="party-dot"></span>${escape(mine?.name || player.partyId)}<span class="owner-badge">이번 주 소속</span></div><p class="player-description">함께 만드는 우리 당의 영향력 · 라운드 종료까지 소속 유지</p><p class="player-description" id="cooldown-clock"></p></div>${stats}`;
}
function territoryMarkup(territory) {
  const owner = party(territory.ownerPartyId);
  const isOurs = !!state.player?.partyId && territory.ownerPartyId === state.player.partyId;
  const moves = (state.moves || []).filter((move) => move.role === (isOurs ? 'defend' : 'challenge'));
  const artwork = territory.id === 'bluehouse' ? 'blue-house' : 'assembly';
  const max = Math.max(number(rules().captureThreshold), ...Object.values(territory.scores || {}).map(number));
  return `<article class="territory-card" style="--party:${color(owner?.color)}"><div class="territory-header"><h3 class="territory-name">${escape(territory.name)}<span class="territory-en">${territory.id === 'bluehouse' ? 'THE BLUE HOUSE' : 'NATIONAL ASSEMBLY'}</span></h3><span class="owner-badge"><span class="party-dot"></span>${owner ? `${escape(owner.name)} 점령 중` : '아직 주인이 없어요'}</span></div><div class="illustration"><img src="/assets/territory/${artwork}.webp" alt="${escape(territory.name)} 일러스트" width="680" height="420"><span class="territory-flag" aria-hidden="true"><svg viewBox="0 0 40 53"><path d="M8 51V4" stroke="#68745c" stroke-width="2"/><path d="M9 6C18 0 27 13 38 6V25C28 32 19 18 9 25Z" fill="currentColor"/><path d="M9 6C18 0 27 13 38 6" fill="none" stroke="white" opacity=".5"/><circle cx="8" cy="3" r="2" fill="#a8b495"/></svg></span></div><div class="territory-state" data-territory-clock="${escape(territory.id)}"></div><div class="influence-panel"><div class="influence-heading"><strong>정당별 영향력</strong><span>${format(rules().captureThreshold)} 이상 + ${format(rules().leaderMargin)} 격차로 점령 도전</span></div><div class="influence-list">${state.parties.map((item) => `<div class="influence-row" style="--party:${color(item.color)}"><span class="influence-name"><i class="party-dot"></i>${escape(item.name)}</span><div class="influence-track" role="meter" aria-label="${escape(item.name)} 영향력" aria-valuemin="0" aria-valuemax="${number(rules().maxScore)}" aria-valuenow="${number(territory.scores?.[item.id])}"><div class="influence-fill" style="width:${Math.min(100,number(territory.scores?.[item.id])/max*100)}%"></div></div><span class="influence-number">${format(territory.scores?.[item.id])}</span></div>`).join('')}</div></div><div class="action-panel"><div class="action-heading">${isOurs ? '우리 영토 수비하기' : owner ? '상대 영토에 도전하기' : '첫 점령에 도전하기'}<span>행동마다 ${format(rules().actionPoints)} P · 활동력 ${format(rules().actionEnergy)}</span></div><div class="action-list">${moves.map((move) => { const level = number(state.offices?.[state.player?.partyId]?.[move.officeId]); return `<button type="button" class="action-button" data-operation="act" data-territory="${escape(territory.id)}" data-move="${escape(move.id)}" data-focus="${escape(territory.id)}-${escape(move.id)}" title="${escape(move.description)}">${escape(move.name)}<small>영향력 +${40+level*8}${isOurs ? ` · 상대 −${20+level*4}` : move.id === 'scrutiny' ? ` · 상대 −${10+level*2}` : ''}</small></button>`; }).join('')}</div><p class="action-hint">${!state.player ? '로그인 후 이번 주 참여 정당을 선택하면 활동할 수 있어요.' : !state.player.partyId ? '먼저 이번 주 참여 정당을 선택해 주세요.' : isOurs ? '수비 행동은 우리 영향력을 높이고 선두 도전 정당의 영향력을 낮춰요.' : '정당 사무소를 강화하면 같은 비용으로 더 큰 영향력을 만들 수 있어요.'}</p></div></article>`;
}
function officeMarkup() {
  return (state.officeCatalog || []).map((office) => {
    const level = number(state.offices?.[state.player?.partyId]?.[office.id]);
    const maxed = level >= number(rules().maxOfficeLevel);
    const cost = number(rules().upgradeBasePoints) * (level + 1);
    return `<article class="office-card"><div class="office-top"><span class="office-icon" aria-hidden="true">${{policy:'▤',media:'◉',research:'⌕'}[office.id] || '◇'}</span><div><h3>${escape(office.name)}</h3><span class="office-level">${state.player?.partyId ? `LEVEL ${level} / ${number(rules().maxOfficeLevel)}` : '정당 선택 후 공용 레벨 표시'}</span></div></div><p>${escape(office.description)}</p><button type="button" class="upgrade-button" data-operation="upgrade" data-office="${escape(office.id)}" data-cost="${cost}" data-maxed="${maxed}" data-focus="office-${escape(office.id)}">${!state.player?.partyId ? '정당 선택 후 강화' : maxed ? '최고 레벨 달성' : `${format(cost)} P로 강화`}</button></article>`;
  }).join('');
}
function logMarkup(log) {
  const team = party(log.partyId);
  const territory = state.territories.find((item) => item.id === log.territoryId);
  const move = state.moves?.find((item) => item.id === log.moveId);
  const office = state.officeCatalog?.find((item) => item.id === log.officeId);
  const actor = log.nickname || team?.name || '참가자';
  const labels = {join:'참여',act:'활동',upgrade:'강화',capture:'점령',round:'라운드',round_start:'새 라운드'};
  let description = `${actor} · ${team?.name || '정당'} 활동`;
  if (log.type === 'join') description = `${actor} 님이 ${team?.name || '정당'}에 합류했어요.`;
  if (log.type === 'act') description = `${actor} · ${territory?.name || '영토'}에서 ${move?.name || '정치 활동'}${log.influence != null ? ` · 영향력 +${format(log.influence)}` : ''}`;
  if (log.type === 'upgrade') description = `${actor} · ${office?.name || '사무소'} ${format(log.level)}단계 강화`;
  if (log.type === 'capture') description = `${team?.name || '정당'}이 ${territory?.name || '영토'} 점령에 성공했어요.`;
  if (log.type === 'round' || log.type === 'round_start') description = '새로운 주간 라운드가 시작됐어요.';
  const date = new Date(number(log.at));
  return `<li><span class="party-dot" style="--party:${color(team?.color)}"></span><span class="history-kind">${labels[log.type] || '기록'}</span><span>${escape(description)}</span><time datetime="${date.toISOString()}">${escape(date.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}))}</time></li>`;
}
function render() {
  focusedRender($('#player-panel'), playerMarkup());
  focusedRender($('#territories'), state.territories.map(territoryMarkup).join(''));
  focusedRender($('#offices'), officeMarkup());
  $('#history').innerHTML = state.logs?.length ? state.logs.map(logMarkup).join('') : '<li class="empty-state">아직 활동 기록이 없어요. 이번 라운드의 첫 발걸음을 남겨 주세요.</li>';
  $('#round-date').textContent = `${new Date(state.round.endsAt).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'})} 종료 (한국시간)`;
  tick();
  updatePending();
}
function updateButtons() {
  const blocked = busy || !!pending || !state || now() >= number(state.round.endsAt);
  document.querySelectorAll('[data-operation]').forEach((button) => {
    const action = button.dataset.operation;
    let disabled = blocked;
    if (action === 'join') disabled ||= !selectedParty || !state?.player || !!state.player.partyId;
    else {
      disabled ||= !state?.player?.partyId || now() < number(state?.player?.cooldownUntil);
      if (action === 'act') disabled ||= number(state?.player?.balance) < number(rules().actionPoints) || number(state?.player?.energy) < number(rules().actionEnergy);
      if (action === 'upgrade') disabled ||= button.dataset.maxed === 'true' || number(state?.player?.balance) < number(button.dataset.cost);
    }
    button.disabled = disabled;
  });
  document.querySelectorAll('#join-form input').forEach((input) => { input.disabled = busy || !!pending; });
}
function tick() {
  if (!state) return;
  $('#round-clock').textContent = now() >= state.round.endsAt ? '새 라운드 확인 중' : timeLeft(state.round.endsAt);
  $('#sync-label').textContent = Date.now() - lastSync > 40000 ? '연결 확인 필요 · 새로고침해 주세요' : '15초마다 현황 갱신';
  for (const territory of state.territories) {
    const node = [...document.querySelectorAll('[data-territory-clock]')].find((item) => item.dataset.territoryClock === territory.id);
    if (!node) continue;
    let text = '영향력을 쌓아 점령에 도전하세요.';
    if (number(territory.protectedUntil) > now()) text = `점령 보호 중 · ${timeLeft(territory.protectedUntil)} 남음 · 영향력 활동 가능`;
    else if (territory.challengerPartyId && territory.holdStartedAt != null) {
      const deadline = number(territory.holdStartedAt) + number(rules().holdMs);
      text = `${party(territory.challengerPartyId)?.name || '도전 정당'} 점령 유지 중 · ${now() >= deadline ? '점령 결과 확인 중' : timeLeft(deadline) + ' 남음'}`;
    } else if (territory.ownerPartyId) text = '보호 종료 · 정당별 영향력으로 공세와 수비가 이어집니다.';
    node.textContent = text;
  }
  if ($('#energy-clock')) $('#energy-clock').textContent = state.player.nextEnergyAt ? `다음 +1 ${timeLeft(state.player.nextEnergyAt)}` : '활동력 충전 완료';
  if ($('#cooldown-clock')) $('#cooldown-clock').textContent = number(state.player.cooldownUntil) > now() ? `다음 활동까지 ${timeLeft(state.player.cooldownUntil)}` : '지금 정치 활동에 참여할 수 있어요.';
  updateButtons();
}
const errors = {
  LOGIN_REQUIRED:'로그인이 필요해요. 로그인 후 다시 참여해 주세요.',ACCOUNT_INACTIVE:'현재 계정은 참여할 수 없는 상태입니다.',ORIGIN_INVALID:'요청을 확인할 수 없어요. 이 페이지를 새로고침해 주세요.',ROLE_REQUIRED:'영토의 주인이 바뀌었어요. 갱신된 행동 메뉴를 확인해 주세요.',ROUND_CHANGED:'새 라운드가 시작됐어요. 이번 주 참여 정당을 다시 선택해 주세요.',PARTY_LOCKED:'이번 주 참여 정당은 변경할 수 없어요.',JOIN_REQUIRED:'먼저 이번 주 함께할 정당을 선택해 주세요.',REQUEST_ID_REUSED:'요청 정보가 일치하지 않아 처리하지 않았어요. 현황을 확인해 주세요.',OFFICE_MAX:'이미 최고 레벨인 사무소입니다.',PRICE_CHANGED:'다른 참가자가 사무소를 강화해 비용이 바뀌었어요. 새 가격을 확인한 뒤 다시 선택해 주세요.',CONFLICT:'다른 참가자의 활동과 겹쳤어요. 최신 현황을 확인한 뒤 다시 선택해 주세요.',INSUFFICIENT_POINTS:'JCS 포인트가 부족해요. 충전하거나 활동으로 적립해 주세요.',COOLDOWN:'이전 활동 후 잠시 기다려 주세요.',INSUFFICIENT_ENERGY:'정치 활동력이 부족해요. 활동력은 5분마다 1씩 회복됩니다.',STORAGE_UNAVAILABLE:'현재 서버에 연결할 수 없어요. 잠시 후 다시 확인해 주세요.'
};
async function request(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(API,{method:body ? 'POST' : 'GET',credentials:'same-origin',cache:'no-store',headers:body ? {'Content-Type':'application/json'} : {},body:body ? JSON.stringify(body) : undefined,signal:controller.signal});
    const data = await response.json();
    return {response,data};
  } finally { clearTimeout(timeout); }
}
async function refresh(manual = false) {
  if (loading || busy) return;
  loading = true;
  const sequence = ++readSequence;
  $('#refresh-button').disabled = true;
  try {
    const {response,data} = await request();
    if (!response.ok || !data.ok) throw new Error(data.error || 'LOAD_FAILED');
    if (sequence === readSequence && !busy) accept(data);
    if (manual && !pending) notice('최신 현황을 확인했어요.');
  } catch (error) {
    if (manual || !state) notice(errors[error.message] || '게임 정보를 불러오지 못했어요. 새로고침으로 다시 연결해 주세요.',true);
    if (!state) { $('#player-panel').innerHTML = '<p class="empty-state">서버 연결을 기다리고 있어요. 잠시 후 다시 시도해 주세요.</p>'; $('#territories').innerHTML = '<div class="empty-state">연결 후 실제 영토 현황이 표시됩니다.</div>'; $('#offices').innerHTML = '<p class="empty-state">연결 후 사무소 정보가 표시됩니다.</p>'; $('#history').innerHTML = '<li class="empty-state">활동 기록을 아직 확인하지 못했어요.</li>'; }
  } finally { loading = false; $('#refresh-button').disabled = false; }
}
async function submit(body, retry = false) {
  if (busy || (!retry && pending)) return;
  if (!retry) { pending = {...body,roundId:state.round.id,requestId:crypto.randomUUID()}; persist(); }
  if (!pending) return;
  busy = true;
  ++readSequence;
  notice('요청을 처리하고 있어요.');
  updatePending();
  let definitiveError = false;
  try {
    const {response,data} = await request(pending);
    if (response.status >= 500 || !data || typeof data.ok !== 'boolean') throw new Error('UNKNOWN_RESULT');
    if (!response.ok || !data.ok) {
      pending = null; persist(); definitiveError = true;
      notice(errors[data.error] || '요청을 처리하지 못했어요. 최신 현황을 확인한 뒤 다시 선택해 주세요.',true);
    } else {
      accept(data);
      const action = pending.action;
      pending = null; persist();
      notice(action === 'join' ? '이번 주 참여 정당을 선택했어요. 함께 영향력을 쌓아 보세요.' : action === 'upgrade' ? `우리 당 사무소를 강화했어요. ${format(data.result?.points)} P 사용` : `정치 활동을 반영했어요. ${format(data.result?.points ?? rules().actionPoints)} P 사용`);
    }
  } catch { notice('서버 응답이 끊겨 결과를 확인 중이에요. 아래에서 같은 요청의 결과를 재확인할 수 있어요.',true); }
  finally { busy = false; updatePending(); if (definitiveError) void refresh(); }
}
document.addEventListener('change',(event) => { if (event.target.matches('#join-form input[name="party"]')) { selectedParty = event.target.value; updateButtons(); } });
document.addEventListener('submit',(event) => { if (event.target.id === 'join-form') { event.preventDefault(); if (selectedParty && !busy && !pending) void submit({action:'join',partyId:selectedParty}); } });
document.addEventListener('click',(event) => {
  const button = event.target.closest('button[data-operation]');
  if (!button || button.disabled || !state) return;
  if (button.dataset.operation === 'act') void submit({action:'act',territoryId:button.dataset.territory,moveId:button.dataset.move});
  if (button.dataset.operation === 'upgrade') void submit({action:'upgrade',officeId:button.dataset.office,expectedPoints:Number(button.dataset.cost)});
});
$('#retry-operation').addEventListener('click',() => void submit(null,true));
$('#refresh-state').addEventListener('click',() => void refresh(true));
$('#refresh-button').addEventListener('click',() => void refresh(true));
$('#help-open').addEventListener('click',() => $('#help-dialog').showModal());
$('#help-close').addEventListener('click',() => $('#help-dialog').close());
document.addEventListener('visibilitychange',() => { if (!document.hidden) void refresh(); });
window.addEventListener('online',() => void refresh());
setInterval(() => { if (!document.hidden) void refresh(); },15000);
setInterval(tick,1000);
updatePending();
void refresh();
