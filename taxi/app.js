import {personPartyMarkup} from '../src/ui/person-party.js?v=0.0.31.494';
import {updateTaxiJourney} from './journey.js?v=0.0.31.492';
import {splitDialogue} from './dialogue-reader.js?v=0.0.31.470';
import {bindTaxiFullscreen} from './fullscreen.js?v=0.0.31.470';
import {formatDistance} from './distance.js?v=0.0.31.470';
import {TaxiSound} from './sound.js?v=0.0.31.478';
import {renderPartyStats,loadPartyStats} from '../src/ui/taxi-party-stats.js?v=0.0.31.497';
const partyMode = new URLSearchParams(location.search).get('mode') === 'party';
const modeLabel = partyMode ? '정당 승객' : '정치인 승객';
const API = partyMode ? '/api/v3/taxi/party' : '/api/v3/taxi';
const TOKEN_KEY = 'jcs-real-taxi-session-v1';
const PENDING_KEY = partyMode ? 'jcs-real-taxi-party-pending-v1' : 'jcs-real-taxi-pending-v1';
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g,(char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const num = (value) => Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : 0;
const duration = (value) => { const seconds = Math.floor(num(value)/1000); return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; };
const safeUrl = (value) => { if (!value) return ''; try { const url = new URL(String(value),location.origin); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
let token = '';
let pending = null;
let state = null;
let busy = false;
let syncing = false;
let localPaused = true;
let pauseWanted = false;
let receivedAt = performance.now();
let boardUntil = 0;
let contentSignature = '';
let journalSelected = null;
const photoCache = new Map();
const sound = new TaxiSound();
const distance = ride => Math.floor(num(ride.distanceMeters ?? num(ride.activeMs)*.008));
const meters = value => {const d=formatDistance(value);return d.value+d.unit;};
try { token = localStorage.getItem(TOKEN_KEY) || ''; pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); if (pending && !['start','begin','listen','like','compare','choose','dropoff','finish','pause','resume','heartbeat','reset'].includes(pending.action)) pending = null; } catch { /* Keep the session and pending request in memory if storage is blocked. */ }
function savePending() { try { if (pending) sessionStorage.setItem(PENDING_KEY,JSON.stringify(pending)); else sessionStorage.removeItem(PENDING_KEY); } catch { /* The live request retains its original id. */ } }
function notice(message) { $('#notice').hidden = !message; $('#notice').textContent = message; }
function accept(data) {
  if (!data || data.ok !== true || !Number.isInteger(data.version) || !Array.isArray(data.history)) throw new Error('INVALID_RESPONSE');
  const previousRide = state?.ride?.id;
  state = data;
  receivedAt = performance.now();
  if (data.sessionToken) { token = data.sessionToken; try { localStorage.setItem(TOKEN_KEY,token); } catch { /* Play remains available for this page session. */ } }
  if (state.ride?.status === 'active' && previousRide !== state.ride.id) boardUntil = performance.now()+num(state.ride.boardingRemainingMs);
  if (state.ride?.status === 'active' && (document.hidden || $('#help-dialog').open || $('#journal-dialog').open)) { localPaused = true; pauseWanted = true; }
  if (state.ride?.paused || state.ride?.status !== 'active') localPaused = true;
  render();
}
async function request(body,keepalive = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),18000);
  try {
    const response = await fetch(API,{method:body ? 'POST' : 'GET',credentials:'same-origin',cache:'no-store',headers:{...(token ? {'X-Taxi-Session':token} : {}),...(body ? {'Content-Type':'application/json'} : {})},body:body ? JSON.stringify(body) : undefined,keepalive,signal:controller.signal});
    const data = await response.json();
    return {response,data};
  } finally { clearTimeout(timeout); }
}
const messages = {CHOICE_REQUIRED:'네 입장을 비교한 뒤 하나를 고르거나, 선택하지 않음을 기록해 주세요.',OPTIONS_REQUIRED:'먼저 다른 입장 비교하기를 눌러 주세요.',ALREADY_SELECTED:'이미 선택을 기록한 질문입니다.',CHOICE_INVALID:'선택할 입장을 다시 확인해 주세요.',INTRO_REQUIRED:'먼저 손님의 이야기를 들어볼지 선택해 주세요.',STORY_STARTED:'이야기가 이미 시작됐어요.',VERSION_CHANGED:'다른 화면에서 운행 기록이 바뀌었어요. 현재 이야기를 확인한 뒤 다시 선택해 주세요.',REQUEST_ID_REUSED:'요청 정보를 확인할 수 없어요. 현재 운행을 다시 확인합니다.',RIDE_ACTIVE:'이미 동승 중인 손님이 있어요.',NO_ACTIVE_RIDE:'진행 중인 운행이 없어요.',ALREADY_LIKED:'이미 공감한 이야기예요.',NOT_LAST_BEAT:'마지막 이야기까지 들은 뒤 운행을 마칠 수 있어요.',RIDE_PAUSED:'운행이 잠시 멈췄어요. 직접 이어가기를 눌러 주세요.',INVALID_SESSION:'운행 연결을 확인하지 못했어요. 페이지를 새로고침해 주세요.',ACCOUNT_INACTIVE:'현재 계정으로는 운행할 수 없어요.',ORIGIN_INVALID:'이 페이지에서 요청을 확인할 수 없어요. 새로고침 후 다시 시도해 주세요.',CONTENT_UNAVAILABLE:'승객의 이야기를 준비하고 있어요. 잠시 뒤 다시 확인해 주세요.',STORAGE_UNAVAILABLE:'운행 기록에 연결할 수 없어요. 잠시 뒤 다시 확인해 주세요.'};
async function refresh() {
  if (busy || syncing) return;
  syncing = true;
  controls();
  try {
    const {response,data} = await request();
    if (['LOGIN_REQUIRED','TAXI_ADMIN_REQUIRED'].includes(data.error)) { location.replace('/mine'); return; }
    if (!response.ok || !data.ok) throw new Error(data.error || 'LOAD_FAILED');
    accept(data);
    if (state.ride?.status === 'active' && localPaused && !state.ride.paused) pauseWanted = true;
  } catch (error) { notice(messages[error.message] || '운행 정보를 불러오지 못했어요. 아래에서 다시 연결해 주세요.'); if (!state) { $('#start-button').textContent = '다시 연결'; $('#start-button').disabled = false; } }
  finally { syncing = false; controls(); void flushPause(); }
}
async function act(action,{retry = false,keepalive = false,choice} = {}) {
  if (busy || syncing || (!retry && pending) || (!retry && !state)) return;
  if (!retry && action === 'begin' && !sound.introReady(state?.ride)) return;
  if (!retry) { pending = {action,requestId:crypto.randomUUID(),expectedVersion:state.version,...(action === 'choose' ? {choice} : {})}; savePending(); }
  if (!pending) return;
  const operation = pending.action;
  busy = true;
  controls();
  let refreshAfter = false;
  let researchChanged = false;
  try {
    const {response,data} = await request(pending,keepalive);
    if (['LOGIN_REQUIRED','TAXI_ADMIN_REQUIRED'].includes(data.error)) { state=null; pending=null; savePending(); sound.update(null,false); location.replace('/mine'); return; }
    if (response.status >= 500 || typeof data?.ok !== 'boolean') throw new Error('UNKNOWN_RESULT');
    if (!response.ok || !data.ok) {
      pending = null; savePending();
      notice(messages[data.error] || '요청을 처리하지 못했어요. 현재 운행을 다시 확인해 주세요.');
      localPaused = true; pauseWanted = true; refreshAfter = true;
    } else {
      if (['start','resume'].includes(operation) && !document.hidden && !pauseWanted) localPaused = false;
      if (operation === 'reset') { localPaused=true; pauseWanted=false; journalSelected=null; boardUntil=0; }
      if (operation === 'pause') { localPaused = true; pauseWanted = false; }
      if(operation==='start' && data.ride?.id!==state?.ride?.id) sound.effect('board');
      if(state?.ride?.status==='active' && data.ride?.status==='completed') sound.effect('exit');
      if(operation==='reset') sound.stopEffects();
      accept(data);
      pending = null; savePending();
      if (['compare','choose','reset'].includes(operation)) { statsGeneration++; researchChanged=true; }
      if (operation === 'like') notice('이 이야기에 공감을 기록했어요. 계속 듣기를 누르면 다음 이야기로 넘어갑니다.');
      else if (!['heartbeat','pause'].includes(operation)) notice('');
    }
  } catch { localPaused = true; pauseWanted = true; notice('연결이 잠시 끊겼어요. 결과를 확인한 뒤 운행을 이어갈 수 있습니다.'); }
  finally {
    busy = false;
    render();
    controls();
    if (researchChanged && !$('#taxi-data-panel-02').hidden) void showDataTab('02');
    if (refreshAfter) void refresh(); else void flushPause();
  }
}
async function flushPause() {
  if (!pauseWanted || busy || syncing || pending || !state) return;
  if (state.ride?.status !== 'active' || state.ride.paused) { pauseWanted = false; render(); return; }
  await act('pause',{keepalive:true});
}
function sourcesMarkup(ride) {
  return `<div class="sources">${(ride.beats || []).map((beat,index) => `<details><summary>${index+1}. ${index < num(ride.heardCount) ? '함께 들은 이야기' : '아직 듣지 않은 이야기'}${ride.likedBeatIndexes?.includes(index) ? ' · 공감한 이야기' : ''}</summary><blockquote>${esc(beat.text)}</blockquote><p class="source-context">${esc(beat.context)}</p>${(beat.sources || []).map((source) => { const url = safeUrl(source.url); return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><time>${esc(source.date)}</time>${esc(source.title)} <span>(원문)</span></a>` : ''; }).join('')}</details>`).join('')}</div>`;
}
function partyRevealMarkup(ride,journal) {
  return `<div class="reveal party-reveal"><span class="reveal-kicker">JCS REAL TAXI · 정당 승객 운행 기록</span><div class="reveal-heading"><div><span class="speaker-label">오늘 함께한 정당 승객</span><h2>${esc(ride.passenger?.name || '정당 승객')}</h2></div></div><div class="reveal-stats"><span>${ride.firstRide ? '첫 번째 동승' : `${num(ride.visitNumber)}번째 동승`}</span><span class="distance-result">함께 달린 거리 ${meters(distance(ride))}</span><span>동승 시간 약 ${duration(ride.activeMs)}</span><span>${num(ride.heardCount)} / ${num(ride.totalBeats)}개 이야기</span></div><p class="reveal-note">${ride.finishReason === 'dropoff' ? '도중에 내려준 손님이었어요.' : '마지막 이야기까지 함께했어요.'} 각 질문에서 고른 입장은 해당 정당의 선택 기록에 반영됩니다. 대사는 실제 자료를 재구성한 요약이며 직접 인용이 아닙니다.</p><div class="sources">${(ride.beats || []).map((beat,index) => `<details><summary>${index+1}. ${esc(beat.title || '함께 나눈 질문')} · ${beat.selection ? esc(beat.selection.partyName || '선택한 입장') : index < num(ride.heardCount) ? '선택한 정당 없음' : '아직 듣지 않음'}</summary><blockquote>${esc(beat.text)}</blockquote><p class="source-context">${esc(beat.context)}</p><p class="party-selection-record">${beat.selection ? `내 선택 · ${esc(beat.selection.partyName)}<br>${esc(beat.selection.text)}` : '이 질문에서 선택한 정당이 없습니다.'}</p>${(beat.options || []).map(option => `<article class="party-source-option"><h3>${num(option.number)}. ${esc(option.partyName)}</h3><p>${esc(option.text)}</p>${(option.sources || []).map(source => {const url=safeUrl(source.url);return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><time>${esc(source.date)}</time>${esc(source.title)} <span>(원문)</span></a>` : `<p>${esc(source.date)} ${esc(source.title)}</p>`;}).join('')}</article>`).join('')}</details>`).join('')}</div>${journal ? '' : '<div class="choice-row"><button type="button" class="button main-button" data-action="start">다음 정당 승객 태우기</button><button type="button" class="button" data-open-journal>운행 일지 보기</button></div>'}</div>`;
}
function partyChoicesMarkup(ride,last) {
  const selected = ride.selectedChoice != null;
  return `<section class="party-comparison" aria-label="익명 입장 비교"><h3>${esc(ride.questionTitle || '이 질문에 어떤 생각을 갖고 있나요?')}</h3>${ride.optionsShown ? `<p class="party-choice-guide">첫 번째는 지금 승객의 입장입니다. 네 입장을 비교해 하나를 고르거나, 선택하지 않음을 기록해 주세요. 선택 후에는 바꿀 수 없습니다.</p><div class="party-options">${(ride.options || []).map(option => `<button type="button" class="button party-choice" data-action="choose" data-choice="${esc(option.id)}" ${selected ? 'data-selected-lock="true"' : ''} aria-pressed="${ride.selectedChoice === option.id}"><strong>입장 ${num(option.number)}${num(option.number) === 1 ? ' · 지금 승객' : ''}</strong><span>${esc(option.text)}</span>${ride.selectedChoice === option.id ? '<small>선택한 입장</small>' : ''}</button>`).join('')}<button type="button" class="button party-choice party-none" data-action="choose" data-choice="none" ${selected ? 'data-selected-lock="true"' : ''} aria-pressed="${ride.selectedChoice === 'none'}">${ride.selectedChoice === 'none' ? '선택하지 않음으로 기록했어요' : '어느 입장도 선택하지 않기'}</button></div>${selected ? '<p class="party-choice-guide" role="status">선택을 기록했어요. 준비되면 다음 단계로 진행해 주세요.</p>' : ''}` : '<p class="party-choice-guide">같은 질문에 대한 네 가지 입장을 정당 이름 없이 비교할 수 있어요.</p><button type="button" class="button" data-action="compare">다른 입장 비교하기</button>'}</section><div class="choice-row"><button type="button" class="button main-button" data-action="${last ? 'finish' : 'listen'}" ${selected ? '' : 'data-choice-required="true"'}>${last ? '운행 마치기' : '계속 듣기'}</button><button type="button" class="button drop-button" data-action="dropoff">내려주기</button></div>`;
}
async function hydratePhotos() {
  for (const node of document.querySelectorAll('[data-photo-person]')) {
    const id = node.dataset.photoPerson;
    const name = node.dataset.photoName;
    if (!id || node.dataset.loading) continue;
    node.dataset.loading = 'true';
    if (!photoCache.has(id)) photoCache.set(id,(async () => {
      try {
        const response = await fetch(`/api/v3/politicians?ids=${encodeURIComponent(id)}`,{credentials:'same-origin',cache:'force-cache'});
        if (!response.ok) return null;
        const data = await response.json();
        const person = data.items?.find((item) => item.id === id && item.name === name);
        const url = person?.photo?.url || person?.photo?.localPath;
        return url ? safeUrl(url) : null;
      } catch { return null; }
    })());
    const url = await photoCache.get(id);
    if (url && node.isConnected) { const image = document.createElement('img'); image.className = 'portrait'; image.alt = name; image.loading = 'lazy'; image.src = url; image.addEventListener('error',() => image.replaceWith(node),{once:true}); node.replaceWith(image); }
  }
}
function revealMarkup(ride,journal = false) {
  if (ride.passengerKind === 'party' || partyMode) return partyRevealMarkup(ride,journal);
  const person = ride.passenger || {};
  const photo = person.photoUrl ? safeUrl(person.photoUrl) : '';
  return `<div class="reveal"><span class="reveal-kicker">${journal ? 'JCS REAL TAXI · RIDE RECORD' : 'JCS REAL TAXI · THE PASSENGER WAS…'}</span><div class="reveal-heading">${photo ? `<img class="portrait" src="${esc(photo)}" alt="${esc(person.name)}" loading="lazy">` : `<div class="portrait portrait-placeholder" data-photo-person="${esc(person.personId)}" data-photo-name="${esc(person.name)}" aria-hidden="true">${esc((person.name || '?').slice(0,1))}</div>`}<div><span class="speaker-label">오늘 함께한 승객</span><h2>${esc(person.name || '승객')}</h2><p>${personPartyMarkup(person)}</p></div></div><div class="reveal-stats"><span>${ride.firstRide ? '첫 번째 동승' : `${num(ride.visitNumber)}번째 동승`}</span><span class="distance-result">함께 달린 거리 ${meters(distance(ride))}</span><span>동승 시간 약 ${duration(ride.activeMs)}</span><span>${num(ride.heardCount)} / ${num(ride.totalBeats)}개 이야기</span></div><p class="reveal-note">${ride.finishReason === 'dropoff' ? '도중에 내려준 손님이었어요.' : '마지막 이야기까지 함께했어요.'} 대화는 실제 기록에 이해를 돕는 설명을 더한 재구성이며 직접 인용이 아닙니다. 아래에서 각 이야기의 날짜와 맥락, 원문을 확인해 보세요.</p>${sourcesMarkup(ride)}${person.personId ? `<div class="choice-row"><a class="button" href="/person/${encodeURIComponent(person.personId)}?tab=taxi">${esc(person.name || '정치인')} 리얼택시 기록 보기</a></div>` : ''}${journal ? '' : '<div class="choice-row"><button type="button" class="button main-button" data-action="start">다음 손님 태우기</button><button type="button" class="button" data-open-journal>운행 일지 보기</button></div>'}</div>`;
}
function activeMarkup(ride) {
  if (localPaused || ride.paused || document.hidden) return `<div class="paused-card"><div class="speech-balloon"><span class="speaker-label">잠시 정차 중</span><h2>이야기는 여기서<br>기다리고 있어요.</h2><p>화면을 떠난 동안은 주행 거리가 늘지 않아요.<br>준비되면 직접 운행을 이어가 주세요.</p></div><div class="choice-row"><button type="button" class="button main-button" data-action="resume">운행 이어가기</button><button type="button" class="button drop-button" data-action="dropoff">여기서 내려주기</button></div></div>`;
  if(ride.phase==='intro') return `<div class="speech-balloon"><span class="speaker-label">${modeLabel} · 첫인사</span><p class="beat-text">${esc(ride.beat?.text)}</p><p class="intro-note">손님과의 인사는 게임 연출입니다. 인사를 들은 뒤 운행을 시작할지 선택해 주세요.</p></div><div class="choice-row"><button type="button" class="button main-button" data-action="begin" disabled>인사를 듣는 중</button><button type="button" class="button drop-button" data-action="dropoff">내려주기</button></div><button type="button" class="pause-button" data-action="pause">잠시 정차</button>`;
  const last = num(ride.beatIndex)+1 >= num(ride.totalBeats);
  const liked = ride.likedBeatIndexes?.includes(ride.beatIndex);
  return `<div class="speech-balloon"><span class="speaker-label">${modeLabel} · 이야기 ${num(ride.beatIndex)+1}</span><div class="dialogue-scroll" id="dialogue-scroll" tabindex="0" role="region" aria-label="승객 대사" aria-describedby="dialogue-scroll-hint"><p class="beat-text">${splitDialogue(ride.beat?.text).map((sentence,index)=>`<span class="dialogue-sentence" data-sentence="${index}">${esc(sentence.text)}</span>`).join('')}</p>${ride.beat?.comfort ? '<p class="gentle-line" id="gentle-line" hidden></p>' : ''}</div><p class="scroll-hint" id="dialogue-scroll-hint">음성을 준비하고 있어요. 위아래로 읽을 수 있습니다.</p></div>${partyMode ? partyChoicesMarkup(ride,last) : `<div class="choice-row"><button type="button" class="button main-button" data-action="${last ? 'finish' : 'listen'}">${last ? '운행 마치기' : '계속 듣기'}</button><button type="button" class="button like-button" data-action="like" ${liked ? 'data-liked="true"' : ''}>${liked ? '공감했어요' : '공감하기'}</button><button type="button" class="button drop-button" data-action="dropoff">내려주기</button></div>`}<button type="button" class="pause-button" data-action="pause">잠시 정차</button>`;
}
function render() {
  if (!state) { controls(); return; }
  const ride = state.ride;
  const active = ride?.status === 'active';
  const signature = JSON.stringify([ride?.id,ride?.status,ride?.phase,ride?.beatIndex,ride?.likedBeatIndexes,ride?.optionsShown,ride?.selectedChoice,ride?.paused,localPaused,active && document.hidden]);
  if (signature !== contentSignature) {
    const savedScroll = $('#dialogue-scroll')?.scrollTop||0;
    const sameDialogue = ride && sound.key===ride.id+':'+(ride.phase||'story')+':'+ride.beatIndex;
    const actionFocused = $('#content').contains(document.activeElement) ? document.activeElement.dataset.action : null;
    const choiceFocused = document.activeElement?.dataset.choice;
    if (!ride) $('#content').innerHTML = `<div class="speech-balloon"><span class="speaker-label">JCS 리얼택시 · ${modeLabel}</span><h2>이름은 잠시,<br>이야기부터 들어볼까요?</h2><p>익명의 승객이 건네는 다섯 가지 이야기.<br>얼마나 듣고, 언제 내려줄지는 당신의 선택입니다.</p></div><div class="choice-row"><button type="button" class="button main-button" data-action="start">${modeLabel} 태우기</button></div>`;
    else $('#content').innerHTML = active ? activeMarkup(ride) : revealMarkup(ride);
    contentSignature = signature;
    if(sameDialogue&&$('#dialogue-scroll'))$('#dialogue-scroll').scrollTop=savedScroll;
    if (actionFocused) { const target = [...$('#content').querySelectorAll('[data-action]')].find(item => item.dataset.action === actionFocused && (!choiceFocused || item.dataset.choice === choiceFocused)); (target && !target.hasAttribute('data-selected-lock') ? target : $('#content').querySelector('[data-action=choose]:not([data-selected-lock]), [data-action=listen]:not([data-choice-required]), [data-action=finish]:not([data-choice-required])'))?.focus({preventScroll:true}); }
  }
  $('#chapter-label').textContent = active ? ride.phase==='intro' ? '손님과 첫인사를 나누며' : `동승 중 · ${num(ride.beatIndex)+1}번째 이야기` : ride ? '이야기 끝에서 만난 얼굴' : '첫 번째 손님을 기다리며';
  $('#beat-count').textContent = ride ? `${num(ride.heardCount)} / ${num(ride.totalBeats)}개 이야기` : '이야기를 기다리는 중';
  $('.record-label').textContent = ride?.phase==='intro'&&active ? '승차 인사 · 게임 연출' : '실제 기록에 설명을 더한 대화 재구성';
  if ($('#journal-dialog').open) renderJournal();
  tick(); controls(); void hydratePhotos();
}
function controls() {
  const blocked = busy || syncing || !!pending || pauseWanted || performance.now()<sound.exitUntil;
  document.querySelectorAll('[data-action]').forEach((button) => { button.disabled = blocked || button.dataset.liked === 'true' || button.dataset.selectedLock === 'true' || button.dataset.choiceRequired === 'true' || document.hidden || (button.dataset.action === 'begin' && !sound.introReady(state?.ride)); if (button.dataset.action === 'begin') button.textContent = sound.introReady(state?.ride) ? '운행 시작하기' : '인사를 듣는 중'; });
  $('#recovery').hidden = !pending || busy;
  $('#retry-button').disabled = busy || syncing;
  $('#ride-reset').disabled = blocked || !state || document.hidden;
}
function tick() {
  const ride = state?.ride;
  updateTaxiJourney($('#scene'),ride);
  const listening = ride?.status === 'active' && !ride.paused && !localPaused && !document.hidden && (!pending || ['heartbeat','like','listen','compare','choose'].includes(pending.action)) && performance.now() >= boardUntil;
  const moving = listening && ride.phase !== 'intro';
  $('#scene').classList.toggle('is-driving',!!moving);
  $('#scene').classList.toggle('is-stopped',!moving);
  const leaving=performance.now()<sound.exitUntil;
  $('#scene').classList.toggle('has-passenger',ride?.status === 'active'||leaving);
  $('#scene').classList.toggle('is-leaving',leaving);
  $('#scene-status').textContent = leaving ? '천천히 정차하고, 손님을 내려주는 중' : moving ? '이름 모를 손님과 달리는 중' : ride?.status === 'active' ? performance.now() < boardUntil ? '손님이 택시에 타고 있어요' : '이야기를 잠시 멈춘 정류장' : ride ? '손님이 내린 뒤, 남은 이야기' : '잠시 쉬어 가는 정류장';
  const estimate = moving ? Math.min(20000,performance.now()-receivedAt) : 0;
  const drivingEstimate = moving ? Math.max(0,estimate-num(ride?.boardingRemainingMs)) : 0;
  const meter=formatDistance((ride ? distance(ride) : 0)+drivingEstimate*.008);
  $('#ride-distance').textContent = meter.value;
  $('#distance-unit').textContent = meter.unit;
  $('#meter-state').textContent = moving ? '운행 중' : '정차';
  sound.update(ride,!!listening && (!pending || ['heartbeat','like','compare','choose'].includes(pending.action)));
  document.getElementById('voice-replay').disabled = !listening;
  controls();
}
function renderJournal() {
  const history = state?.history || [];
  $('#journal-content').innerHTML = `<p class="journal-label">JCS 리얼택시 · 나만의 최근 ${history.length}회 운행 기록<br>동승 거리는 모든 승객에게 같은 가상 속도(시속 28.8km)를 적용한 기록입니다.</p>${history.length ? history.map((ride) => `<button type="button" class="journal-item" data-journal-id="${esc(ride.id)}"><span><strong>${esc(ride.passenger?.name)}</strong><small>${ride.passengerKind === 'party' || partyMode ? '정당 승객' : personPartyMarkup(ride.passenger)} · ${ride.firstRide ? '첫 동승' : `${num(ride.visitNumber)}번째 동승`}</small></span><span><strong>${meters(distance(ride))} · ${num(ride.heardCount)}개</strong><small>${esc(new Date(num(ride.endedAt)).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</small></span></button>`).join('') : '<p class="journal-empty">아직 운행 기록이 없어요.<br>첫 손님을 내려주면 정체와 출처가 이곳에 남습니다.</p>'}${journalSelected && history.some((ride) => ride.id === journalSelected) ? `<div class="journal-result">${revealMarkup(history.find((ride) => ride.id === journalSelected),true)}</div>` : ''}`;
  void hydratePhotos();
}
function pauseLocally() { sound.stopEffects(); localPaused = true; pauseWanted = true; render(); return flushPause(); }
function openDialog(id) { if (state?.ride?.status === 'active') pauseLocally(); if (id === 'journal-dialog') renderJournal(); $(`#${id}`).showModal(); }
let statsGeneration = 0;
let statsLoading = false;
async function showDataTab(tab) {
  document.querySelectorAll('.taxi-data-tabs [data-taxi-data]').forEach(button => { const selected=button.dataset.taxiData===tab; button.setAttribute('aria-selected',String(selected)); button.tabIndex=selected ? 0 : -1; $(`#taxi-data-panel-${button.dataset.taxiData}`).hidden=!selected; });
  if (tab !== '02') return;
  if (state?.ride?.status === 'active') pauseLocally();
  if (statsLoading) return;
  statsLoading=true;
  const generation=statsGeneration;
  $('#party-stats-content').textContent='정당별 데이터를 불러오고 있어요.';
  try { const data=await loadPartyStats(); if (!data) throw new Error('STATS_UNAVAILABLE'); if (generation===statsGeneration) $('#party-stats-content').innerHTML=renderPartyStats(data); }
  catch { $('#party-stats-content').innerHTML='<p>데이터를 불러오지 못했어요.</p><button type="button" class="button" data-taxi-data="02">다시 불러오기</button>'; }
  finally { statsLoading=false; if (generation!==statsGeneration && !$('#taxi-data-panel-02').hidden) void showDataTab('02'); }
}
document.querySelectorAll('[data-taxi-mode]').forEach(link => {
  const current=link.dataset.taxiMode===(partyMode ? 'party' : 'politician');
  if (current) link.setAttribute('aria-current','page');
  link.addEventListener('click',async event => { event.preventDefault(); if (current) return; if (busy || syncing || pending) { notice('진행 중인 요청 결과를 확인한 뒤 승객 모드를 바꿔 주세요.'); return; } if (state?.ride?.status==='active') { if (!window.confirm('현재 운행을 잠시 정차하고 승객 모드를 바꿀까요? 돌아오면 이어갈 수 있어요.')) return; await pauseLocally(); if (pending || !state.ride.paused) { notice('정차 기록을 확인하지 못했어요. 연결을 확인한 뒤 다시 모드를 바꿔 주세요.'); return; } } location.assign(link.href); });
});
document.title=`${modeLabel} · JCS 리얼택시 · 정참시`;
$('#mode-description').textContent=partyMode ? '정당 승객 · 이름을 가린 네 입장을 비교하고, 하차 뒤 정당과 출처를 확인합니다.' : '정치인 승객 · 익명의 이야기를 듣고, 하차 뒤 인물과 실제 기록을 확인합니다.';
if (partyMode) {
  $('#help-dialog h2').textContent='같은 질문, 네 가지 입장.';
  $('#help-dialog ol').innerHTML='<li><strong>정당 승객과 인사를 나눠요.</strong><p>승객의 정당 이름은 하차할 때까지 공개되지 않아요. 인사를 들은 뒤 운행 시작하기를 선택합니다.</p></li><li><strong>다른 입장을 비교해요.</strong><p>다섯 질문을 차례로 듣습니다. 다른 입장 비교하기를 누르면 같은 질문에 대한 네 입장을 익명으로 볼 수 있어요. 첫 번째는 지금 승객의 입장입니다.</p></li><li><strong>질문마다 한 번 선택해요.</strong><p>가장 가까운 입장 하나 또는 어느 입장도 선택하지 않기를 고르세요. 선택은 바꿀 수 없고, 자동으로 다음 질문으로 넘어가지 않습니다. 계속 듣기 또는 마지막 질문의 운행 마치기를 직접 눌러 주세요. 내려주기는 언제든 가능합니다.</p></li><li><strong>하차 후 정당과 출처를 확인해요.</strong><p>승객 정당과 모든 입장의 정당 이름, 내 선택, 원문과 날짜가 공개됩니다. 선택 기록은 실제로 고른 입장의 정당에 반영됩니다. 운행 거리와 선택 기록은 지지도가 아닙니다.</p></li>';
  $('#help-dialog .help-note').textContent='대사는 공개된 정당 자료를 이해하기 쉽게 재구성한 요약이며 직접 인용이 아닙니다. 일반 합성 음성과 승하차 효과음은 각각 끌 수 있습니다. 인사와 배려 멘트는 게임 연출입니다. 낭독에 맞춰 말풍선이 내려가며 음성을 끄면 자유롭게 읽을 수 있습니다. 화면을 떠나거나 일지·데이터를 확인하면 정차하며 직접 이어가야 합니다. 운행 거리에는 모든 승객에 같은 속도를 적용합니다. 초기화는 현재 모드의 개인 운행과 일지를 지우며 전체 누적 통계는 유지합니다. 로그인이나 포인트 없이 이용할 수 있습니다.';
}
document.querySelector('.taxi-data-tabs').addEventListener('keydown',event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const tabs=[...document.querySelectorAll('.taxi-data-tabs [role=tab]')]; const index=tabs.indexOf(document.activeElement); const next=event.key==='Home' ? 0 : event.key==='End' ? tabs.length-1 : (index+(event.key==='ArrowRight' ? 1 : -1)+tabs.length)%tabs.length; tabs[next].focus(); void showDataTab(tabs[next].dataset.taxiData); });
document.addEventListener('click',(event) => {
  if (event.target.closest('[data-politician-records]')) { event.preventDefault(); if (partyMode) document.querySelector('[data-taxi-mode="politician"]').click(); else openDialog('journal-dialog'); return; }
  const dataTab=event.target.closest('[data-taxi-data]'); if (dataTab) void showDataTab(dataTab.dataset.taxiData);
  const actionButton = event.target.closest('[data-action]');
  if (actionButton && !actionButton.disabled) { const action = actionButton.dataset.action; sound.unlock(); if (action === 'pause') { pauseLocally(); return; } void act(action,{choice:actionButton.dataset.choice}); }
  const closeButton = event.target.closest('[data-close]'); if (closeButton) $(`#${closeButton.dataset.close}`).close();
  if (event.target.closest('[data-open-journal]')) openDialog('journal-dialog');
  const journalButton = event.target.closest('[data-journal-id]'); if (journalButton) { journalSelected = journalSelected === journalButton.dataset.journalId ? null : journalButton.dataset.journalId; renderJournal(); }
});
$('#ride-reset').addEventListener('click',()=>{ if (!state || busy || pending) return; if (!window.confirm('내 현재 운행과 운행일지를 모두 초기화할까요? 승객 순서도 새로 섞이며, 다른 계정의 기록은 유지됩니다.')) return; sound.voice.pause(); void act('reset'); });
$('#effects-toggle').addEventListener('click',()=>sound.toggle('effects'));

$('#voice-toggle').addEventListener('click',()=>sound.toggle('voice'));
$('#voice-replay').addEventListener('click',()=>sound.replay());
$('#help-open').addEventListener('click',() => openDialog('help-dialog'));
$('#journal-open').addEventListener('click',() => openDialog('journal-dialog'));
$('#start-button').addEventListener('click',() => void refresh());
$('#retry-button').addEventListener('click',() => void act(null,{retry:true}));
document.addEventListener('visibilitychange',() => { if (document.hidden) { if (state?.ride?.status === 'active') pauseLocally(); } else { localPaused = true; render(); void refresh(); } });
window.addEventListener('pagehide',() => { if (state?.ride?.status === 'active') pauseLocally(); });
window.addEventListener('online',() => { localPaused = true; render(); void refresh(); });
setInterval(() => { if (!document.hidden && state?.ride?.status === 'active' && !localPaused && !state.ride.paused && !pending && !busy && !syncing) void act('heartbeat'); },15000);
setInterval(tick,250);
bindTaxiFullscreen();
controls();
void refresh();
