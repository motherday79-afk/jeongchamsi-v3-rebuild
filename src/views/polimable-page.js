import {POLIMARBLE_32_TILE_LAYOUT as LAYOUT,POLIMARBLE_HUD_LAYOUT as HUD} from '../core/polimable-layout.js?v=0.0.31.231';

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
  return `<section class="pm-board-stage-page" aria-label="JCS 폴리마블 주사위 액션 테스트">
    <div class="pm-board-stage" data-pm-root data-pm-stage="dice-action-test">
      <img class="pm-board-stage-image" src="/assets/polimable/polimable-board-base-31-227.png" alt="JCS 폴리마블 32칸 보드 및 빈 HUD">
      <div class="pm-board-object-layer" aria-hidden="true">
        ${LAYOUT.map(renderTileObject).join('')}
        ${HUD.map(renderHudObject).join('')}
      </div>
      <div class="pm-character-layer" data-pm-character-test="male2">
        <div class="pm-character-profile pm-character-profile--p1" aria-label="1P 남2 캐릭터 프로필">
          <img src="/assets/polimable/characters/male2/male2-profile.png" alt="남2 캐릭터 프로필">
        </div>
        <button class="pm-character-token" type="button" data-pm-character-token aria-label="남2 캐릭터 테스트: 클릭할 때마다 이동, 승리, 실패, 감정 표현을 순서대로 확인">
          <img data-pm-character-token-image src="/assets/polimable/characters/male2/male2-token.png" alt="남2 게임말">
        </button>
        <div class="pm-character-reaction" data-pm-character-reaction aria-hidden="true">
          <img data-pm-character-reaction-image src="/assets/polimable/characters/male2/male2-emotion.png" alt="남2 캐릭터 반응">
        </div>
      </div>
      <div class="pm-dice-layer" data-pm-dice-layer>
        <div class="pm-dice-dock" aria-label="주사위 대기 영역">
          <div class="pm-die pm-die--dock" data-pm-die-dock="1" data-face="1" aria-label="첫 번째 주사위 1">${renderDiePips()}</div>
          <div class="pm-die pm-die--dock" data-pm-die-dock="2" data-face="1" aria-label="두 번째 주사위 1">${renderDiePips()}</div>
        </div>
        <button class="pm-dice-roll-button" type="button" data-pm-dice-roll aria-label="주사위 두 개 굴리기"><span class="pm-dice-roll-button__label">주사위 굴리기</span></button>
        <div class="pm-dice-flight" data-pm-dice-flight aria-hidden="true">
          <div class="pm-die pm-die--flight" data-pm-die-flight="1" data-face="1">${renderDiePips()}</div>
          <div class="pm-die pm-die--flight" data-pm-die-flight="2" data-face="1">${renderDiePips()}</div>
        </div>
        <div class="pm-dice-result" data-pm-dice-result aria-live="polite" aria-hidden="true">
          <strong data-pm-dice-result-title>합계 2</strong>
          <span data-pm-dice-result-sub></span>
        </div>
      </div>
    </div>
  </section>`;
}

// Home sidebar remains exactly as the previously approved behavior.
export function renderPoliMarbleSidebarCard(data={},session={}){
 const board=data?.leaderboard||data||{},entries=Array.isArray(board?.entries)?board.entries:[],king=entries[0],me=board?.me||entries.find(e=>e?.isMe);
 return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry pm-side-entry--overlay" data-layout-route="/polimable"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><div class="pm-side-overlay"><div class="pm-side-overlay-brand"><span>TODAY</span></div><div class="pm-side-overlay-stats${session?.authenticated?'':' is-single'}"><div class="pm-side-overlay-panel"><small>👑 TODAY KING</small><b>${king?`${esc(king.initials||'JCS')} · ${number(king.score)}`:'아직 기록 없음'}</b></div>${session?.authenticated?`<div class="pm-side-overlay-panel"><small>나의 오늘 기록</small><b>${me?`${number(me.score)}점 · ${Number(me.rank)||'-'}위`:'기록 없음'}</b></div>`:''}</div><div class="pm-side-overlay-cta">GAME START →</div></div></button></section>`;
}
