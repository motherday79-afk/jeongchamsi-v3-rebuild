import {POLIMARBLE_BOARD as BOARD} from '../core/polimable-data.js?v=0.0.31.206';
import {POLIMARBLE_24_TILE_LAYOUT as LAYOUT} from '../core/polimable-layout.js?v=0.0.31.208';

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
  const cx=Number((layout.x+layout.w/2).toFixed(4));
  const cy=Number((layout.y+layout.h*.78).toFixed(4));
  return `<div class="pm-board-tile pm-kind-${esc(tile.kind)} pm-band-${esc(layout.band)}${layout.index===0?' pm-start-tile':''}" data-pm-tile="${layout.index}" data-pm-cx="${cx}" data-pm-cy="${cy}" style="${style}" aria-label="${layout.index+1}번 칸 ${esc(tile.title)}">
    <span class="pm-board-tile-icon" aria-hidden="true">${tile.icon}</span>
    <strong>${esc(tile.title)}</strong>
    ${tile.value?`<small>${esc(valueLabel(tile))}</small>`:''}
  </div>`;
}

function renderPlayerPiece(){
  const start=LAYOUT[0];
  const x=Number((start.x+start.w/2).toFixed(4));
  const y=Number((start.y+start.h*.78).toFixed(4));
  return `<div class="pm-player-piece" data-pm-player data-pm-position="0" style="left:${x}%;top:${y}%" aria-label="폴리마블 게임말">
    <img src="/assets/polimable/polimable-player-piece-31-207.png" alt="JCS 폴리마블 플레이어 캐릭터">
  </div>`;
}

function renderDiceTest(){
  return `<div class="pm-dice-test" aria-label="주사위 이동 테스트">
    <div class="pm-dice-test-result" data-pm-dice-result aria-live="polite">⚀</div>
    <button type="button" class="pm-dice-test-button" data-pm-test-roll>🎲 주사위 굴리기</button>
  </div>`;
}

// 31.208 test scope: connected 24-cell band + one real player-piece image + dice-driven movement only.
export function renderPoliMarblePage(){
  return `<section class="pm-page pm-background-only-page" aria-label="JCS 폴리마블">
    <div class="pm-background-stage" data-pm-root aria-label="JCS 폴리마블 1200 × 675 게임 보드">
      <div class="pm-board-tiles" aria-label="폴리마블 24개 게임 칸">${LAYOUT.map(renderBoardTile).join('')}</div>
      ${renderPlayerPiece()}
      ${renderDiceTest()}
    </div>
  </section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){
  return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry" data-layout-route="/polimable" aria-label="JCS 폴리마블 게임 바로가기"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><span>GAME START <b>→</b></span></button></section>`;
}
