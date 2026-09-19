import {POLIMARBLE_BOARD as BOARD} from '../core/polimable-data.js?v=0.0.31.206';
import {POLIMARBLE_24_TILE_LAYOUT as LAYOUT} from '../core/polimable-layout.js?v=0.0.31.206';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');
const valueLabel=tile=>{
  if(!tile?.value)return '';
  if(tile.kind==='loss')return `-${number(tile.value)}`;
  if(tile.kind==='percent_loss')return `-${number(tile.value)}%`;
  return `+${number(tile.value)}`;
};

function renderBoardTile(layout){
  const tile=BOARD[layout.index];
  if(!tile)return '';
  const style=`--pm-x:${layout.x}%;--pm-y:${layout.y}%;--pm-w:${layout.w}%;--pm-h:${layout.h}%;`;
  return `<div class="pm-board-tile pm-kind-${esc(tile.kind)} pm-band-${esc(layout.band)}${layout.index===0?' pm-start-tile':''}" data-pm-tile="${layout.index}" data-pm-band="${esc(layout.band)}" style="${style}" aria-label="${layout.index+1}번 칸 ${esc(tile.title)}">
    <span class="pm-board-tile-icon" aria-hidden="true">${tile.icon}</span>
    <strong>${esc(tile.title)}</strong>
    ${tile.value?`<small>${esc(valueLabel(tile))}</small>`:''}
  </div>`;
}

// 31.206: 1200×675 승인 백그라운드는 그대로 유지하고, 그 위에 24개의 독립 게임 칸만 올린다.
// START는 오른쪽 하단. 진행 방향은 오른쪽 하단 → 왼쪽 → 왼쪽 위 → 상단 오른쪽 → 오른쪽 아래.
export function renderPoliMarblePage(){
  return `<section class="pm-page pm-background-only-page" aria-label="JCS 폴리마블">
    <div class="pm-background-stage" aria-label="JCS 폴리마블 1200 × 675 게임 보드">
      <div class="pm-board-tiles" aria-label="폴리마블 24개 게임 칸">${LAYOUT.map(renderBoardTile).join('')}</div>
    </div>
  </section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){
  return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry" data-layout-route="/polimable" aria-label="JCS 폴리마블 게임 바로가기"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><span>GAME START <b>→</b></span></button></section>`;
}
