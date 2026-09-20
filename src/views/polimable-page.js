import {POLIMARBLE_BOARD as BOARD,POLIMARBLE_CARDS as CARDS,POLIMARBLE_GROUPS as GROUPS} from '../core/polimable-data.js?v=0.0.31.224';
import {POLIMARBLE_32_TILE_LAYOUT as LAYOUT} from '../core/polimable-layout.js?v=0.0.31.224';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');

const groupClass=tile=>tile?.group?` pm-group-${tile.group}`:'';
const gradeMarkup=tile=>tile?.grade?`<span class="pm-v2-grade">${esc(tile.grade)}</span>`:'';
function renderTile(layout){
  const tile=BOARD[layout.index];
  if(!tile)return'';
  const cx=layout.x+layout.w/2,cy=layout.y+layout.h/2;
  const special=tile.kind!=='asset';
  return `<div class="pm-v2-tile pm-v2-kind-${esc(tile.kind)}${groupClass(tile)}${layout.corner?' is-corner':''}" data-pm-tile="${layout.index}" data-pm-cx="${cx}" data-pm-cy="${cy}" style="--x:${layout.x}%;--y:${layout.y}%;--w:${layout.w}%;--h:${layout.h}%;" aria-label="${layout.index+1}번 칸 ${esc(tile.title)}">
    <div class="pm-v2-tile-glow"></div>
    <span class="pm-v2-tile-icon">${tile.icon}</span>
    <strong>${esc(tile.title)}</strong>
    ${gradeMarkup(tile)}
    ${special?`<small>${tile.kind==='public_card'?'EVENT':tile.kind==='start'?'JCS':'SPECIAL'}</small>`:''}
    <span class="pm-v2-owner" data-pm-owner="${layout.index}"></span>
    <span class="pm-v2-level" data-pm-level="${layout.index}"></span>
  </div>`;
}
function renderPlayerPiece(){
  const s=LAYOUT[0];
  return `<div class="pm-v2-piece" data-pm-player data-pm-position="0" style="left:${s.x+s.w/2}%;top:${s.y+s.h/2}%"><img src="/assets/polimable/polimable-player-piece-31-207.png" alt="JCS 폴리마블 캐릭터"></div>`;
}
function renderCenter(){return `<div class="pm-v2-center" data-pm-center>
  <div class="pm-v2-center-brand"><span>JCS</span><strong>POLIMARBLE</strong><small>정치에 참여할 시간</small></div>
  <div class="pm-v2-center-event" data-pm-center-event hidden><span data-pm-center-kicker></span><strong data-pm-center-title></strong><p data-pm-center-copy></p></div>
  <div class="pm-v2-dice-stage" data-pm-dice-stage aria-live="polite"><span data-pm-die="0">⚀</span><span data-pm-die="1">⚀</span><b data-pm-dice-total></b></div>
</div>`}
function renderHud(authenticated){return `<div class="pm-v2-hud">
  <div class="pm-v2-player-card pm-v2-player-me"><div class="pm-v2-avatar">JCS</div><div><small>PLAYER 1</small><strong data-pm-score>10,000</strong><span>민심</span></div></div>
  <div class="pm-v2-turn"><small data-pm-round>ROUND 0</small><strong data-pm-status>${authenticated?'GAME READY':'로그인 후 플레이'}</strong></div>
  <div class="pm-v2-player-card pm-v2-player-rival"><div><small>RIVAL</small><strong>10,000</strong><span>멀티플레이 준비</span></div><div class="pm-v2-avatar is-rival">R</div></div>
  <div class="pm-v2-card-dock"><button type="button" class="pm-v2-card-toggle" data-pm-card-toggle>✦ 전략카드 <b data-pm-card-count>0</b></button><div class="pm-v2-card-list" data-pm-card-list hidden>${[0,1,2].map(i=>`<button type="button" data-pm-card-slot="${i}" disabled><span>✦</span><b>EMPTY</b></button>`).join('')}</div></div>
  <div class="pm-v2-roll-wrap"><button type="button" class="pm-v2-roll" data-pm-main-action><span>🎲 🎲</span><b>${authenticated?'주사위 굴리기':'로그인하고 시작'}</b></button><button type="button" class="pm-v2-cashout" data-pm-cashout hidden>기록하고 종료</button></div>
</div>`}
function renderActionModal(){return `<div class="pm-v2-modal" data-pm-action-modal hidden><div class="pm-v2-modal-card"><small data-pm-action-kicker>영향력 거점</small><strong data-pm-action-title>거점명</strong><p data-pm-action-copy></p><div class="pm-v2-modal-actions"><button type="button" data-pm-asset-action="skip">지나가기</button><button type="button" class="is-primary" data-pm-asset-action="buy">영향력 확보</button></div></div></div>`}
function renderChoiceModal(){return `<div class="pm-v2-modal" data-pm-choice-modal hidden><div class="pm-v2-modal-card"><small>운명의 선택</small><strong>⚖️ CHOICE</strong><p data-pm-choice-copy>안전하게 갈지 승부수를 던질지 선택하세요.</p><div class="pm-v2-modal-actions"><button type="button" data-pm-choice="safe">안전하게</button><button type="button" class="is-primary" data-pm-choice="risk">승부수</button></div></div></div>`}
function renderResultModal(){return `<div class="pm-v2-modal" data-pm-result-modal hidden><div class="pm-v2-modal-card"><small>JCS POLIMARBLE</small><strong data-pm-result-title>GAME OVER</strong><p data-pm-result-copy></p><b class="pm-v2-result-score" data-pm-result-score>0</b><div class="pm-v2-modal-actions"><button type="button" data-pm-result-record>기록하기</button><button type="button" class="is-primary" data-pm-result-restart>다시 시작</button></div></div></div>`}

export function renderPoliMarblePage({session}={}){
 const authenticated=!!session?.authenticated;
 return `<section class="pm-v2-page" aria-label="JCS 폴리마블 2.0"><div class="pm-v2-shell" data-pm-root data-authenticated="${authenticated?'true':'false'}">
  <div class="pm-v2-sky"></div><div class="pm-v2-city"></div><div class="pm-v2-board-frame"><div class="pm-v2-board-floor"></div><div class="pm-v2-tiles">${LAYOUT.map(renderTile).join('')}</div>${renderCenter()}${renderPlayerPiece()}</div>
  ${renderHud(authenticated)}${renderActionModal()}${renderChoiceModal()}${renderResultModal()}
  <div class="pm-v2-ios-gate" data-pm-ios-gate hidden><strong>가로 화면으로 플레이</strong><p>폴리마블 2.0은 가로 화면에 최적화되어 있습니다.</p><button type="button" data-pm-ios-rotate>↻ 가로 화면으로 플레이</button></div>
 </div></section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){
 const board=data?.leaderboard||data||{},entries=Array.isArray(board?.entries)?board.entries:[],king=entries[0],me=board?.me||entries.find(e=>e?.isMe);
 return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry pm-side-entry--overlay" data-layout-route="/polimable"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><div class="pm-side-overlay"><div class="pm-side-overlay-brand"><span>TODAY</span></div><div class="pm-side-overlay-stats${session?.authenticated?'':' is-single'}"><div class="pm-side-overlay-panel"><small>👑 TODAY KING</small><b>${king?`${esc(king.initials||'JCS')} · ${number(king.score)}`:'아직 기록 없음'}</b></div>${session?.authenticated?`<div class="pm-side-overlay-panel"><small>나의 오늘 기록</small><b>${me?`${number(me.score)}점 · ${Number(me.rank)||'-'}위`:'기록 없음'}</b></div>`:''}</div><div class="pm-side-overlay-cta">GAME START →</div></div></button></section>`;
}
export {CARDS,GROUPS};
