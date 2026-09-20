import {POLIMARBLE_32_TILE_LAYOUT as LAYOUT} from '../core/polimable-layout.js?v=0.0.31.226';
import {POLIMARBLE_LABEL_BY_INDEX as LABELS} from '../core/polimable-labels.js?v=0.0.31.226';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');

function renderTileObject(cell){
  const item=LABELS[cell.index];
  return `<div class="pm-board-cell-object${cell.corner?' is-corner':''} tone-${esc(item?.tone||'navy')}" data-pm-board-cell="${cell.index}" data-pm-side="${esc(cell.side)}" data-pm-label="${esc(item?.name||'')}" style="--x:${cell.x}%;--y:${cell.y}%;--w:${cell.w}%;--h:${cell.h}%;">
    <div class="pm-board-label" aria-hidden="true">
      <span class="pm-board-label-icon" role="presentation">${esc(item?.icon||'')}</span>
      <span class="pm-board-label-text">${esc(item?.name||'')}</span>
    </div>
  </div>`;
}

export function renderPoliMarblePage(){
  return `<section class="pm-board-stage-page" aria-label="JCS 폴리마블 보드 라벨·아이콘 적용 2단계">
    <div class="pm-board-stage" data-pm-root data-pm-stage="labels-icons-only">
      <img class="pm-board-stage-image" src="/assets/polimable/polimable-board-base-31-226.png" alt="JCS 폴리마블 32칸 보드">
      <div class="pm-board-cell-layer" aria-hidden="true">
        ${LAYOUT.map(renderTileObject).join('')}
      </div>
    </div>
  </section>`;
}

// Home sidebar remains exactly as the previously approved 31.222/31.223 behavior.
export function renderPoliMarbleSidebarCard(data={},session={}){
 const board=data?.leaderboard||data||{},entries=Array.isArray(board?.entries)?board.entries:[],king=entries[0],me=board?.me||entries.find(e=>e?.isMe);
 return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry pm-side-entry--overlay" data-layout-route="/polimable"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><div class="pm-side-overlay"><div class="pm-side-overlay-brand"><span>TODAY</span></div><div class="pm-side-overlay-stats${session?.authenticated?'':' is-single'}"><div class="pm-side-overlay-panel"><small>👑 TODAY KING</small><b>${king?`${esc(king.initials||'JCS')} · ${number(king.score)}`:'아직 기록 없음'}</b></div>${session?.authenticated?`<div class="pm-side-overlay-panel"><small>나의 오늘 기록</small><b>${me?`${number(me.score)}점 · ${Number(me.rank)||'-'}위`:'기록 없음'}</b></div>`:''}</div><div class="pm-side-overlay-cta">GAME START →</div></div></button></section>`;
}
