import {POLIMARBLE_32_TILE_LAYOUT as LAYOUT,POLIMARBLE_HUD_LAYOUT as HUD} from '../core/polimable-layout.js?v=0.0.31.227';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');

function renderTileObject(cell){
  return `<div class="pm-board-cell-object${cell.corner?' is-corner':''}" data-pm-board-cell="${cell.index}" data-pm-side="${esc(cell.side)}" style="--x:${cell.x}%;--y:${cell.y}%;--w:${cell.w}%;--h:${cell.h}%;"></div>`;
}
function renderHudObject(item){
  return `<div class="pm-hud-object" data-pm-hud="${esc(item.id)}" style="--x:${item.x}%;--y:${item.y}%;--w:${item.w}%;--h:${item.h}%;"></div>`;
}

export function renderPoliMarblePage(){
  return `<section class="pm-board-stage-page" aria-label="JCS 폴리마블 오브젝트 베이스 3단계">
    <div class="pm-board-stage" data-pm-root data-pm-stage="object-map-only">
      <img class="pm-board-stage-image" src="/assets/polimable/polimable-board-base-31-227.png" alt="JCS 폴리마블 32칸 보드 및 빈 HUD">
      <div class="pm-board-object-layer" aria-hidden="true">
        ${LAYOUT.map(renderTileObject).join('')}
        ${HUD.map(renderHudObject).join('')}
      </div>
    </div>
  </section>`;
}

// Home sidebar remains exactly as the previously approved behavior.
export function renderPoliMarbleSidebarCard(data={},session={}){
 const board=data?.leaderboard||data||{},entries=Array.isArray(board?.entries)?board.entries:[],king=entries[0],me=board?.me||entries.find(e=>e?.isMe);
 return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry pm-side-entry--overlay" data-layout-route="/polimable"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><div class="pm-side-overlay"><div class="pm-side-overlay-brand"><span>TODAY</span></div><div class="pm-side-overlay-stats${session?.authenticated?'':' is-single'}"><div class="pm-side-overlay-panel"><small>👑 TODAY KING</small><b>${king?`${esc(king.initials||'JCS')} · ${number(king.score)}`:'아직 기록 없음'}</b></div>${session?.authenticated?`<div class="pm-side-overlay-panel"><small>나의 오늘 기록</small><b>${me?`${number(me.score)}점 · ${Number(me.rank)||'-'}위`:'기록 없음'}</b></div>`:''}</div><div class="pm-side-overlay-cta">GAME START →</div></div></button></section>`;
}
