import { PlazaScene, avatarMarkup } from './scene.js?v=0.0.31.464';
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
let selectedTerritory = 'bluehouse';
let selectedMode = 'solo';
const selectedUnits = new Set();
let rosterInitialized = false;
let selectedPerson = '';
const modeNames = {solo:'1인 시위',rally:'함께 집회',vigil:'상징 단식',support:'응원 방문',petition:'공동 발의'};
const modeHints = {solo:'각 유닛 분당 +4',rally:'각 유닛 분당 +4 · 3기부터 +8',vigil:'5분 약속 · 각 유닛 분당 +6',support:'동료 유닛과 · 분당 +6',petition:'각 유닛 분당 +4'};
const roster = () => state?.player?.units || [];
const unitId = unit => unit.unitId || unit.id;
const locked = unit => now() < number(unit.presence?.committedUntil || unit.committedUntil);
const picked = () => roster().filter(unit => selectedUnits.has(unitId(unit)));
const deployable = all => (all ? roster() : picked()).filter(unit => !locked(unit));
const scene = new PlazaScene($('#plaza-scene'),(id) => {
  selectedPerson = id;
  const person = state?.participants?.find(p => p.id === id);
  if (person?.ownerId === state?.player?.ownerId) { selectedUnits.clear(); selectedUnits.add(person.unitId); renderDock(); updateButtons(); }
  renderPerson();
});
try { const saved = JSON.parse(sessionStorage.getItem(OPERATION_KEY) || 'null'); if (saved && ['join','act','upgrade','deploy','leave','collective'].includes(saved.action) && typeof saved.requestId === 'string') pending = saved; } catch { /* Storage is optional; a live request is still kept in memory. */ }
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
  if (!rosterInitialized && roster().length) { roster().forEach(unit => selectedUnits.add(unitId(unit))); rosterInitialized = true; }
  offset = Number.isFinite(Number(data.serverNow)) ? Number(data.serverNow) - Date.now() : 0;
  lastSync = Date.now();
  if (previousRound && previousRound !== data.round.id) { selectedParty = ''; notice('새로운 주간 라운드가 시작됐어요. 이번 주 함께할 정당을 다시 선택해 주세요.'); }
  render();
}
function playerMarkup() {
  const player = state.player;
  if (!player) return '<div><div class="player-heading">우리 정당의 다음 한 수, 함께할까요?</div><p class="player-description">로그인하면 정당 선택과 정치 활동에 참여할 수 있어요. 관전은 누구나 가능합니다.</p></div><a class="primary-button" href="/login?return=/mine">로그인하고 참여</a>';
  const stats = `<div class="player-stats"><div class="stat"><span class="stat-label">보유 JCS 포인트</span><strong>${format(player.balance)} <small>P</small></strong></div><div class="stat"><span class="stat-label">정치 활동력</span><strong>${format(player.energy)} <small>/ ${format(rules().maxEnergy)}</small></strong><div class="energy-track"><i style="width:${Math.min(100,number(player.energy)/number(rules().maxEnergy)*100)}%"></i></div><small class="stat-label" id="energy-clock"></small></div><div class="stat"><span class="stat-label">직접 행동 기여</span><strong>${format(player.contribution)}</strong></div><a class="primary-button" href="/points">포인트 충전</a></div>`;
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
  const move = [...(state.moves || []),...(state.collectiveMoves || [])].find((item) => item.id === log.moveId);
  const office = state.officeCatalog?.find((item) => item.id === log.officeId);
  const actor = log.nickname || team?.name || '참가자';
  const labels = {join:'참여',act:'활동',upgrade:'강화',capture:'점령',round:'라운드',round_start:'새 라운드',deploy:'광장',leave:'퇴장',collective:'함께'};
  let description = `${actor} · ${team?.name || '정당'} 활동`;
  if (log.type === 'join') description = `${actor} 님이 ${team?.name || '정당'}에 합류했어요.`;
  if (log.type === 'deploy') description = `${actor} · ${territory?.name || '광장'}에서 ${modeNames[log.mode] || '시민 활동'} 시작`;
  if (log.type === 'leave') description = `${actor} 님이 광장에서 나왔어요.`;
  if (log.type === 'collective') description = `${actor} · ${territory?.name || '광장'}에서 함께 ${move?.name || '정치 활동'} · 영향력 +${format(log.influence)}`;
  if (log.type === 'act') description = `${actor} · ${territory?.name || '영토'}에서 ${move?.name || '정치 활동'}${log.influence != null ? ` · 영향력 +${format(log.influence)}` : ''}`;
  if (log.type === 'upgrade') description = `${actor} · ${office?.name || '사무소'} ${format(log.level)}단계 강화`;
  if (log.type === 'capture') description = `${team?.name || '정당'}이 ${territory?.name || '영토'} 점령에 성공했어요.`;
  if (log.type === 'round' || log.type === 'round_start') description = '새로운 주간 라운드가 시작됐어요.';
  const date = new Date(number(log.at));
  return `<li><span class="party-dot" style="--party:${color(team?.color)}"></span><span class="history-kind">${labels[log.type] || '기록'}</span><span>${escape(description)}</span><time datetime="${date.toISOString()}">${escape(date.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}))}</time></li>`;
}
function renderPerson() {
  const person = state?.participants?.find(p => p.id === selectedPerson && p.territoryId === selectedTerritory);
  const target = $('#person-detail');
  target.hidden = !person;
  if (!person) return;
  target.innerHTML = `<button type="button" data-close-person aria-label="참가자 정보 닫기">닫기</button><strong>${escape(person.nickname || '시민')}${person.ownerId === state.player?.ownerId ? ' · 내 유닛 '+person.unitId : ''}</strong> · ${escape(party(person.partyId)?.name || '')}<br>${escape(modeNames[person.mode] || '광장 활동')} · ${escape(modeHints[person.mode] || '')} · ${timeLeft(person.expiresAt)} 남음`;
}
function renderDock() {
  const units = roster(), selected = picked(), available = deployable(false), allAvailable = deployable(true);
  const cost = number(rules().deployEnergy || 1);
  const modes = state.plazaModes?.length ? state.plazaModes : Object.keys(modeNames).map(id => ({id,name:modeNames[id]}));
  focusedRender($('#action-dock'), `<div class="dock-top"><div><h3>내 미니미 부대 · ${units.length || 18}기</h3><p>${!state.player ? '로그인하고 정당을 선택하면 18기를 함께 지휘할 수 있어요.' : !state.player.partyId ? '아래에서 이번 주 함께할 정당을 먼저 선택해 주세요.' : '6가지 모습 × 각 3기 = 내 유닛 18기. 개별 또는 여러 기를 선택해 동시에 배치하세요.'}</p></div></div><div class="roster-toolbar"><button type="button" data-select-units="all">18기 전체 선택</button><button type="button" data-select-units="none">선택 해제</button><strong>선택 ${selected.length}기 · 배치 가능 ${available.length}기</strong></div><div class="unit-roster" role="group" aria-label="내 미니미 18기 선택">${units.map((unit,i) => `<button type="button" class="unit-choice" data-unit="${escape(unitId(unit))}" data-focus="unit-${escape(unitId(unit))}" aria-pressed="${selectedUnits.has(unitId(unit))}">${avatarMarkup(unit.appearance)}<strong>#${i+1}</strong><small>${unit.presence ? escape(state.territories.find(t => t.id === unit.presence.territoryId)?.name || '')+' · '+escape(modeNames[unit.presence.mode]) : '배치 대기'}</small><span>${locked(unit) ? '🔒 전환 대기 · 회수 가능' : unit.presence ? '배치 중 · 전환 가능' : '준비 완료'}</span></button>`).join('')}</div><div class="mode-options" role="group" aria-label="선택 유닛 활동">${modes.map(mode => `<button type="button" class="mode-choice" data-mode="${escape(mode.id)}" data-focus="mode-${escape(mode.id)}" aria-pressed="${selectedMode === mode.id}"><strong>${escape(modeNames[mode.id] || mode.name)}</strong><small>${escape(modeHints[mode.id])}</small></button>`).join('')}</div><div class="dock-actions"><button type="button" class="primary-button" data-operation="deploy" data-focus="deploy">선택 ${available.length}기 배치 · 0 P + 활동력 ${format(available.length*cost)}</button><button type="button" class="primary-button" data-operation="deploy" data-all="true" data-focus="deploy-all">전체 ${allAvailable.length}기 배치 · 0 P + 활동력 ${format(allAvailable.length*cost)}</button><button type="button" class="leave-button" data-operation="leave" data-focus="leave">선택 유닛 회수 · 무료</button><button type="button" class="leave-button" data-operation="leave" data-all="true" data-focus="leave-all">전체 회수 · 무료</button><span id="presence-clock" class="presence-caption"></span></div><p class="dock-note">배치·재배치 비용은 1기당 0 P + 활동력 ${cost}. 18기 전체는 활동력 ${18*cost}. 자리 지키는 유닛 ${units.filter(locked).length}기는 배치에서 자동 제외되며 무료 회수는 언제든 가능해요.</p><div class="collective-row">${(state.collectiveMoves || []).map(move => {
    const count = (state.participants || []).filter(p => p.territoryId === selectedTerritory && p.partyId === state.player?.partyId && p.mode === move.mode).length;
    return `<button type="button" class="collective-button" data-operation="collective" data-move="${escape(move.id)}" data-focus="collective-${escape(move.id)}">${escape(move.name)} · ${format(move.points)} P + 활동력 ${format(move.energy)}<small>우리 정당 ${escape(modeNames[move.mode])} ${count} / ${format(move.minParticipants)}기 · 한 지휘자의 여러 유닛도 합산</small></button>`;
  }).join('')}</div><p class="dock-note">${selectedMode === 'vigil' ? '상징 단식은 유닛별 5분 약속이에요. 다른 유닛은 계속 조작할 수 있어요.' : selectedMode === 'support' ? '같은 광장의 우리 정당 다른 유닛과 함께 응원해요.' : '각 유닛은 배치 후 10분간 활동하며 매분 영향력을 쌓아요.'} 화면을 닫아도 남은 시간 동안 활동해요.</p>`);
}
function renderPlaza() {
  focusedRender($('#location-tabs'), state.territories.map(t => `<button type="button" role="tab" aria-selected="${t.id === selectedTerritory}" aria-controls="plaza-scene" data-location="${escape(t.id)}" data-focus="location-${escape(t.id)}">${escape(t.name)}<small>${(state.participants || []).filter(p => p.territoryId === t.id).length}기</small></button>`).join(''));
  const territory = state.territories.find(t => t.id === selectedTerritory) || state.territories[0];
  if (!territory) return;
  selectedTerritory = territory.id;
  const owner = party(territory.ownerPartyId);
  $('#plaza-name').textContent = `${territory.name} 앞 광장`;
  $('#plaza-meta').innerHTML = `<strong>지금 함께 ${state.participants?.filter(p => p.territoryId === territory.id).length || 0}기 · 지휘자 ${new Set((state.participants || []).filter(p => p.territoryId === territory.id).map(p => p.ownerId)).size}명</strong><span class="owner-badge" style="--party:${color(owner?.color)}">${owner ? escape(owner.name)+' 점령 중' : '첫 점령을 기다리는 중'}</span>`;
  $('#plaza-status').innerHTML = '<span id="plaza-status-clock"></span><span>실제 배치된 시민 · 자동 갱신</span>';
  scene.update(state,selectedTerritory);
  renderDock();
  renderPerson();
}
function render() {
  renderPlaza();
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
    else if (action === 'leave') disabled ||= !(button.dataset.all === 'true' ? roster() : picked()).some(unit => unit.presence);
    else {
      disabled ||= !state?.player?.partyId || now() < number(state?.player?.cooldownUntil);
      if (action === 'deploy') {
        const units = deployable(button.dataset.all === 'true');
        disabled ||= !units.length || number(state?.player?.energy) < units.length * number(rules().deployEnergy || 1);
        if (selectedMode === 'support') disabled ||= !(state?.participants || []).some(p => p.territoryId === selectedTerritory && p.partyId === state.player?.partyId && !units.some(unit => p.ownerId === state.player?.ownerId && p.unitId === unitId(unit))) && units.length < 2;
      }
      if (action === 'collective') {
        const move = state.collectiveMoves?.find(m => m.id === button.dataset.move);
        const presence = roster().some(unit => !locked(unit) && unit.presence?.territoryId === selectedTerritory && unit.presence?.mode === move?.mode);
        const count = (state.participants || []).filter(p => p.territoryId === selectedTerritory && p.partyId === state.player?.partyId && p.mode === move?.mode).length;
        disabled ||= !move || !presence || count < number(move?.minParticipants) || number(state.player?.balance) < number(move?.points) || number(state.player?.energy) < number(move?.energy);
      }
      if (action === 'act') disabled ||= (roster().length > 0 && roster().every(locked)) || number(state?.player?.balance) < number(rules().actionPoints) || number(state?.player?.energy) < number(rules().actionEnergy);
      if (action === 'upgrade') disabled ||= button.dataset.maxed === 'true' || number(state?.player?.balance) < number(button.dataset.cost);
    }
    button.disabled = disabled;
  });
  document.querySelectorAll('#join-form input').forEach((input) => { input.disabled = busy || !!pending; });
  document.querySelectorAll('[data-unit],[data-select-units],[data-mode]').forEach(button => { button.disabled = busy || !!pending; });
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
  if ($('#presence-clock')) $('#presence-clock').textContent = `내 부대 ${roster().filter(unit => unit.presence).length} / ${roster().length || 18}기 배치 중 · 선택 ${picked().length}기`;
  if ($('#plaza-status-clock')) {
    const territory = state.territories.find(t => t.id === selectedTerritory);
    const source = [...document.querySelectorAll('[data-territory-clock]')].find(el => el.dataset.territoryClock === selectedTerritory);
    $('#plaza-status-clock').textContent = source?.textContent || (territory?.ownerPartyId ? '우리의 목소리가 모이는 중이에요.' : '첫 점령의 주인공이 되어 보세요.');
  }
  updateButtons();
}
const errors = {
  INVALID_MODE:'광장 활동을 다시 선택해 주세요.',INVALID_APPEARANCE:'캐릭터 모습을 다시 선택해 주세요.',PLAZA_FULL:'지금 광장에 참가자가 가득 찼어요. 잠시 후 다시 참여해 주세요.',SUPPORT_REQUIRED:'응원할 우리 정당 동료가 먼저 이 광장에 있어야 해요.',VIGIL_COMMITTED:'자리를 지키는 약속이 진행 중이에요. 시간이 끝나면 전환하거나 지금 무료로 나올 수 있어요.',COLLECTIVE_REQUIRED:'같은 광장에 같은 정당의 해당 활동 유닛이 3기 이상 필요해요.',
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
      const affected = pending.unitIds?.length || 0;
      pending = null; persist();
      const messages = {join:'이번 주 함께할 정당을 선택했어요. 캐릭터를 광장에 보내 보세요.',deploy:`${affected}기를 광장에 배치했어요. 0 P · 활동력 ${affected * number(rules().deployEnergy || 1)} 사용`,leave:'광장에서 나왔어요. 편할 때 다시 함께해요.',collective:`함께한 정치 활동을 반영했어요. ${format(data.result?.points)} P 사용`,upgrade:`우리 당 사무소를 강화했어요. ${format(data.result?.points)} P 사용`};
      notice(messages[action] || `정치 활동을 반영했어요. ${format(data.result?.points ?? rules().actionPoints)} P 사용`);
    }
  } catch { notice('서버 응답이 끊겨 결과를 확인 중이에요. 아래에서 같은 요청의 결과를 재확인할 수 있어요.',true); }
  finally { busy = false; updatePending(); if (definitiveError) void refresh(); }
}
document.addEventListener('change',(event) => { if (event.target.matches('#join-form input[name="party"]')) { selectedParty = event.target.value; updateButtons(); } });
document.addEventListener('submit',(event) => { if (event.target.id === 'join-form') { event.preventDefault(); if (selectedParty && !busy && !pending) void submit({action:'join',partyId:selectedParty}); } });
document.addEventListener('click',(event) => {
  const tab = event.target.closest('[data-location]');
  if (tab && state) { selectedTerritory = tab.dataset.location; selectedPerson = ''; renderPlaza(); tick(); return; }
  const selection = event.target.closest('[data-select-units]');
  if (selection && !selection.disabled) { selectedUnits.clear(); if (selection.dataset.selectUnits === 'all') roster().forEach(unit => selectedUnits.add(unitId(unit))); renderDock(); updateButtons(); return; }
  const unit = event.target.closest('[data-unit]');
  if (unit && !unit.disabled) { if (selectedUnits.has(unit.dataset.unit)) selectedUnits.delete(unit.dataset.unit); else selectedUnits.add(unit.dataset.unit); renderDock(); updateButtons(); return; }
  const mode = event.target.closest('[data-mode]');
  if (mode && !mode.disabled) { selectedMode = mode.dataset.mode; renderDock(); updateButtons(); return; }
  if (event.target.closest('[data-close-person]')) { selectedPerson = ''; renderPerson(); return; }
  const button = event.target.closest('button[data-operation]');
  if (!button || button.disabled || !state) return;
  if (button.dataset.operation === 'act') void submit({action:'act',territoryId:button.dataset.territory,moveId:button.dataset.move});
  if (button.dataset.operation === 'upgrade') void submit({action:'upgrade',officeId:button.dataset.office,expectedPoints:Number(button.dataset.cost)});
  if (button.dataset.operation === 'deploy') void submit({action:'deploy',territoryId:selectedTerritory,mode:selectedMode,unitIds:deployable(button.dataset.all === 'true').map(unitId)});
  if (button.dataset.operation === 'leave') void submit({action:'leave',unitIds:(button.dataset.all === 'true' ? roster() : picked()).filter(unit => unit.presence).map(unitId)});
  if (button.dataset.operation === 'collective') void submit({action:'collective',territoryId:selectedTerritory,moveId:button.dataset.move});
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
