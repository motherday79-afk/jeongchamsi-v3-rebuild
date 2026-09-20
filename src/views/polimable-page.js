import {POLIMARBLE_32_TILE_LAYOUT as LAYOUT,POLIMARBLE_HUD_LAYOUT as HUD} from '../core/polimable-layout.js?v=0.0.31.238';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');

function renderDiePips(){
  return '<span class="pm-die-pip p1"></span><span class="pm-die-pip p2"></span><span class="pm-die-pip p3"></span><span class="pm-die-pip p4"></span><span class="pm-die-pip p5"></span><span class="pm-die-pip p6"></span><span class="pm-die-pip p7"></span><span class="pm-die-pip p8"></span><span class="pm-die-pip p9"></span>';
}
function renderTileObject(cell){
  return `<div class="pm-board-cell-object${cell.corner?' is-corner':''}" data-pm-board-cell="${cell.index}" data-pm-side="${esc(cell.side)}" style="--x:${cell.x}%;--y:${cell.y}%;--w:${cell.w}%;--h:${cell.h}%;"></div>`;
}
function renderHudObject(item){
  return `<div class="pm-hud-object" data-pm-hud="${esc(item.id)}" style="--x:${item.x}%;--y:${item.y}%;--w:${item.w}%;--h:${item.h}%;"></div>`;
}

export function renderPoliMarblePage(){
  return `<section class="pm-board-stage-page" aria-label="JCS 폴리마블 1P 대 AI 게임룰 테스트">
    <div class="pm-board-stage" data-pm-root data-pm-stage="gameplay-test">
      <img class="pm-board-stage-image" src="/assets/polimable/polimable-board-base-31-232.png" alt="JCS 폴리마블 게임보드">
      <div class="pm-board-object-layer" aria-hidden="true">
        ${LAYOUT.map(renderTileObject).join('')}
        ${HUD.map(renderHudObject).join('')}
      </div>

      <div class="pm-logical-canvas" data-pm-logical-canvas aria-label="1672×941 HUD logical canvas">
        <div class="pm-player-hud pm-player-hud--p1" data-pm-player-hud="0">
          <span class="pm-player-hud-name">PLAYER 1</span>
          <strong class="pm-player-hud-cash" data-pm-player-cash="0">10,000</strong>
          <small class="pm-player-hud-meta" data-pm-player-meta="0">0바퀴 · 자산 0</small>
        </div>
      </div>

      <div class="pm-game-overlay-layer">
        <div class="pm-player-hud pm-player-hud--p2" data-pm-player-hud="1">
          <span class="pm-player-hud-name">AI 시민</span>
          <strong class="pm-player-hud-cash" data-pm-player-cash="1">10,000</strong>
          <small class="pm-player-hud-meta" data-pm-player-meta="1">0바퀴 · 자산 0</small>
        </div>
        <div class="pm-turn-pill" data-pm-turn-pill>1P TURN</div>

        <div class="pm-strategy-slots" data-pm-strategy-slots aria-label="1P 보유 전략카드"></div>
        <div class="pm-ranking-overlay" data-pm-ranking-overlay></div>
        <div class="pm-toast" data-pm-toast aria-live="polite"></div>
      </div>

      <div class="pm-character-layer" data-pm-character-test="male2">
        <div class="pm-character-profile pm-character-profile--p1" aria-label="1P 남2 캐릭터 프로필">
          <img src="/assets/polimable/characters/male2/male2-profile.png" alt="남2 캐릭터 프로필">
        </div>
        <div class="pm-ai-profile" aria-hidden="true">AI</div>
        <button class="pm-character-token" type="button" data-pm-character-token aria-label="1P 게임말">
          <img data-pm-character-token-image src="/assets/polimable/characters/male2/male2-token.png" alt="남2 게임말">
        </button>
        <div class="pm-ai-token" data-pm-ai-token aria-label="AI 게임말">AI</div>
        <div class="pm-character-reaction" data-pm-character-reaction aria-hidden="true">
          <img data-pm-character-reaction-image src="/assets/polimable/characters/male2/male2-emotion.png" alt="남2 캐릭터 반응">
        </div>
      </div>

      <div class="pm-dice-layer" data-pm-dice-layer>
        <div class="pm-dice-dock" aria-label="주사위 대기 영역">
          <div class="pm-die pm-die--dock" data-pm-die-dock="1" data-face="1" aria-label="첫 번째 주사위 1">${renderDiePips()}</div>
          <div class="pm-die pm-die--dock" data-pm-die-dock="2" data-face="1" aria-label="두 번째 주사위 1">${renderDiePips()}</div>
        </div>
        <button class="pm-dice-roll-button" type="button" data-pm-dice-roll aria-label="주사위 두 개 굴리기"></button>
        <div class="pm-dice-flight" data-pm-dice-flight aria-hidden="true">
          <div class="pm-die pm-die--flight" data-pm-die-flight="1" data-face="1">${renderDiePips()}</div>
          <div class="pm-die pm-die--flight" data-pm-die-flight="2" data-face="1">${renderDiePips()}</div>
        </div>
        <div class="pm-dice-result" data-pm-dice-result aria-live="polite" aria-hidden="true">
          <strong data-pm-dice-result-title>합계 2</strong>
          <span data-pm-dice-result-sub></span>
        </div>
      </div>

      <div class="pm-action-modal" data-pm-action-modal aria-hidden="true">
        <div class="pm-action-card" role="dialog" aria-modal="true" aria-labelledby="pm-action-title">
          <small class="pm-action-kicker" data-pm-action-kicker>JCS POLIMARBLE</small>
          <h3 id="pm-action-title" data-pm-action-title>선택</h3>
          <p data-pm-action-body></p>
          <div class="pm-action-buttons" data-pm-action-buttons></div>
        </div>
      </div>
    </div>
  </section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){
 const board=data?.leaderboard||data||{},entries=Array.isArray(board?.entries)?board.entries:[],king=entries[0],me=board?.me||entries.find(e=>e?.isMe);
 return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry pm-side-entry--overlay" data-layout-route="/polimable"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><div class="pm-side-overlay"><div class="pm-side-overlay-brand"><span>TODAY</span></div><div class="pm-side-overlay-stats${session?.authenticated?'':' is-single'}"><div class="pm-side-overlay-panel"><small>👑 TODAY KING</small><b>${king?`${esc(king.initials||'JCS')} · ${number(king.score)}`:'아직 기록 없음'}</b></div>${session?.authenticated?`<div class="pm-side-overlay-panel"><small>나의 오늘 기록</small><b>${me?`${number(me.score)}점 · ${Number(me.rank)||'-'}위`:'기록 없음'}</b></div>`:''}</div><div class="pm-side-overlay-cta">GAME START →</div></div></button></section>`;
}
