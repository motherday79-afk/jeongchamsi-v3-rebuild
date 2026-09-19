import {POLIMARBLE_BOARD as BOARD,POLIMARBLE_CARDS as CARDS} from '../core/polimable-data.js?v=0.0.31.206';
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

function renderGameHud(authenticated){
  return `<div class="pm-game-hud" aria-label="폴리마블 게임 정보">
    <div class="pm-dice-live" aria-label="주사위 조작">
      <div class="pm-live-dice" data-pm-dice-result aria-live="polite">⚀</div>
      <div class="pm-live-status" data-pm-status>${authenticated?'GAME READY':'로그인 후 플레이할 수 있어요'}</div>
      <button type="button" class="pm-live-roll" data-pm-main-action>${authenticated?'GAME START':'로그인하고 시작'}</button>
    </div>

    <div class="pm-score-live" aria-label="민심 점수">
      <strong data-pm-score>1,000</strong>
      <small>최고 <b data-pm-peak>1,000</b></small>
      <span data-pm-stage>STAGE 1</span>
      <div class="pm-effect-line" data-pm-effects></div>
      <button type="button" class="pm-cashout-button" data-pm-cashout hidden>기록하고 종료</button>
    </div>

    <div class="pm-card-live-grid" aria-label="보유 전략카드">
      ${[0,1,2].map(i=>`<button type="button" class="pm-live-card" data-pm-card-slot="${i}" disabled aria-label="비어 있는 전략카드 슬롯 ${i+1}"><span class="pm-live-card-icon">✦</span><b>전략카드</b><small>EMPTY</small></button>`).join('')}
    </div>

    <div class="pm-ranking-live" data-pm-ranking aria-label="오늘의 랭킹">
      ${[1,2,3,4].map(rank=>`<div class="pm-rank-row"><i>${rank===1?'♛':rank}</i><span>—</span><b>—</b></div>`).join('')}
    </div>

    <div class="pm-choice-modal" data-pm-choice-modal hidden role="dialog" aria-modal="true" aria-label="운명의 선택">
      <div class="pm-choice-card">
        <strong>⚖️ 운명의 선택</strong>
        <p data-pm-choice-copy>안전하게 갈지 승부수를 던질지 선택하세요.</p>
        <div>
          <button type="button" data-pm-choice="safe">안전하게</button>
          <button type="button" data-pm-choice="risk">승부수</button>
        </div>
      </div>
    </div>

    <div class="pm-result-modal" data-pm-result-modal hidden role="dialog" aria-modal="true" aria-label="게임 결과">
      <div class="pm-result-card">
        <strong data-pm-result-title>GAME OVER</strong>
        <p data-pm-result-copy>오늘의 도전은 여기까지입니다.</p>
        <b data-pm-result-score>0</b>
        <button type="button" data-pm-result-record>기록하기</button>
        <button type="button" data-pm-result-restart>다시 시작</button>
      </div>
    </div>
  </div>`;
}

// 31.209 scope: preserve approved 1200×675 board visuals and connect the existing server game rules.
export function renderPoliMarblePage({session}={}){
  const authenticated=!!session?.authenticated;
  return `<section class="pm-page pm-background-only-page" aria-label="JCS 폴리마블">
    <div class="pm-background-stage" data-pm-root data-authenticated="${authenticated?'true':'false'}" aria-label="JCS 폴리마블 1200 × 675 게임 보드">
      <div class="pm-board-tiles" aria-label="폴리마블 24개 게임 칸">${LAYOUT.map(renderBoardTile).join('')}</div>
      ${renderPlayerPiece()}
      ${renderGameHud(authenticated)}
    </div>
  </section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){
  const board=data?.leaderboard||data||{};
  const entries=Array.isArray(board?.entries)?board.entries:[];
  const king=entries[0];
  const me=board?.me||entries.find(entry=>entry?.isMe);
  const kingText=king?`${esc(king.initials||'JCS')} · ${number(king.score)}`:'아직 기록 없음';
  const meText=me?`${number(me.score)} · ${Number(me.rank)||'-'}위`:'아직 기록 없음';
  return `<section class="side-card side-polimable">
    <button type="button" class="pm-side-entry" data-layout-route="/polimable" aria-label="JCS 폴리마블 게임 바로가기"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"></button>
    <div class="pm-side-summary">
      <div class="pm-side-summary-head"><b>🎲 JCS 폴리마블</b><span>TODAY</span></div>
      <div class="pm-side-stat"><span>👑 TODAY KING</span><b>${kingText}</b></div>
      ${session?.authenticated?`<div class="pm-side-stat is-me"><span>내 오늘 기록</span><b>${meText}</b></div>`:''}
      <button type="button" class="pm-side-game-start" data-layout-route="/polimable">GAME START →</button>
    </div>
  </section>`;
}

export {CARDS};
