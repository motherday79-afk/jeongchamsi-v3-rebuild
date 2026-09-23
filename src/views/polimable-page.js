import {boardTile} from '../core/polimable-board-geometry.js?v=0.0.31.270';
import {POLIMARBLE_32_TILE_LAYOUT as LAYOUT,POLIMARBLE_HUD_LAYOUT as HUD} from '../core/polimable-layout.js?v=0.0.31.251';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');

function renderDiePips(){
  return '<span class="pm-die-pip p1"></span><span class="pm-die-pip p2"></span><span class="pm-die-pip p3"></span><span class="pm-die-pip p4"></span><span class="pm-die-pip p5"></span><span class="pm-die-pip p6"></span><span class="pm-die-pip p7"></span><span class="pm-die-pip p8"></span><span class="pm-die-pip p9"></span>';
}
function renderTileObject(old){
 const g=boardTile(old.index),xs=g.points.map(p=>p[0]),ys=g.points.map(p=>p[1]),cell={...old,cx:(Math.min(...xs)+Math.max(...xs))/2,cy:(Math.min(...ys)+Math.max(...ys))/2,w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),rot:0};
 const hit=g.points.map(([x,y])=>`${(x-Math.min(...xs))/cell.w*100}% ${(y-Math.min(...ys))/cell.h*100}%`).join(',');
  return `<div class="pm-board-cell-object${cell.corner?' is-corner':''}" data-pm-board-cell="${cell.index}" data-pm-tile-no="${cell.tileNo}" data-pm-type="${esc(cell.type)}" data-pm-label="${esc(cell.label)}" data-pm-side="${esc(cell.side)}" style="clip-path:polygon(${hit});--cx:${cell.cx}px;--cy:${cell.cy}px;--w:${cell.w}px;--h:${cell.h}px;--rot:${cell.rot}deg;"></div>`;
}
function renderHudObject(item){
  return `<div class="pm-hud-object" data-pm-hud="${esc(item.id)}" style="--cx:${item.cx}px;--cy:${item.cy}px;--w:${item.w}px;--h:${item.h}px;--rot:${item.rot||0}deg;"></div>`;
}

export function renderPoliMarblePage({session={}}={}){
  return `<section class="pm-board-stage-page pm-game-screen" aria-label="JCS 폴리마블 1P 대 AI 게임룰 테스트">
    <nav class="pm-game-nav" aria-label="게임 메뉴"><a href="/">← 정참시 홈</a><button type="button" data-pm-fullscreen hidden>전체화면</button></nav>
    <div class="pm-board-stage" data-pm-root data-pm-can-edit="${session?.user?.role==='admin'?'true':'false'}" data-pm-stage="gameplay-test">
      <img class="pm-board-stage-image" src="/assets/polimable/editor/board-background-270.png" alt="JCS 폴리마블 게임보드">
      <div class="pm-logical-canvas" data-pm-logical-canvas aria-label="1672×941 폴리마블 논리 캔버스">
        <div class="pm-plaza-layer" aria-hidden="true"><img src="/assets/polimable/editor/central-plaza-263.png" alt=""><div class="pm-plaza-logo">정참시<br><strong>폴리마블</strong></div></div>
        <div class="pm-board-object-layer" data-pm-board-object-layer aria-label="32칸 독립 객체 레이어">
          ${LAYOUT.map(renderTileObject).join('')}
          ${HUD.map(renderHudObject).join('')}
        </div>
        <div class="pm-player-hud pm-player-hud--p1" data-pm-player-hud="0">
          <span class="pm-player-hud-name">JCS 유저</span>
          <strong class="pm-player-hud-cash" data-pm-player-cash="0">민심 10,000</strong>
          <small class="pm-player-hud-meta" data-pm-player-meta="0">0바퀴 · 자산 0</small>
        </div>
        <div class="pm-player-hud pm-player-hud--p2" data-pm-player-hud="1">
          <span class="pm-player-hud-name">AI 시민</span>
          <strong class="pm-player-hud-cash" data-pm-player-cash="1">민심 10,000</strong>
          <small class="pm-player-hud-meta" data-pm-player-meta="1">0바퀴 · 자산 0</small>
        </div>
        <div class="pm-ranking-overlay" data-pm-ranking-overlay aria-label="TODAY RANKING"></div>
        <div class="pm-strategy-slots" data-pm-strategy-slots aria-label="1P 보유 전략카드"></div>
        <div class="pm-owner-marker-layer" data-pm-owner-marker-layer aria-label="거점 소유 및 강화 오브젝트"></div>

        <div class="pm-character-layer" data-pm-character-layer>
          <div class="pm-character-profile pm-character-profile--p1" aria-label="1P 캐릭터 프로필">
            <img src="/assets/polimable/characters/player1/profile.png" alt="1P 캐릭터 프로필">
          </div>
          <div class="pm-character-profile pm-character-profile--p2" aria-label="2P 캐릭터 프로필">
            <img src="/assets/polimable/characters/player2/profile.png" alt="2P 캐릭터 프로필">
          </div>
          <button class="pm-character-token pm-character-token--p1" type="button" data-pm-character-token="0" aria-label="1P 게임말">
            <img data-pm-character-token-image="0" src="/assets/polimable/characters/player1/token-257.png" alt="1P 게임말">
          </button>
          <div class="pm-character-token pm-character-token--p2" data-pm-character-token="1" aria-label="2P 게임말">
            <img data-pm-character-token-image="1" src="/assets/polimable/characters/player2/token-257.png" alt="2P 게임말">
          </div>
          <div class="pm-character-reaction" data-pm-character-reaction="0" aria-hidden="true">
            <img data-pm-character-reaction-image="0" src="/assets/polimable/characters/player1/happy-265.png" alt="1P 캐릭터 감정표현">
          </div>
          <div class="pm-character-reaction pm-character-reaction--p2" data-pm-character-reaction="1" aria-hidden="true">
            <img data-pm-character-reaction-image="1" src="/assets/polimable/characters/player2/happy-265.png" alt="2P 캐릭터 감정표현">
          </div>
          <div class="pm-fixed-asset-effect" data-pm-fixed-asset-effect aria-hidden="true">
            <img src="/assets/polimable/objects/fixed-asset-effect.png" alt="고정자산 획득">
          </div>
        </div>
      </div>

      <div class="pm-game-overlay-layer">

        <button class="pm-sound-toggle" type="button" data-pm-sound-toggle aria-label="폴리마블 소리 끄기" aria-pressed="false" title="소리 끄기">🔊</button>
        <div class="pm-toast" data-pm-toast aria-live="polite"></div>
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
          <div class="pm-action-body" data-pm-action-body></div>
          <div class="pm-action-buttons" data-pm-action-buttons></div>
        </div>
      </div>
    </div>
    <div class="pm-orientation-guard" data-pm-orientation-guard aria-hidden="true">
      <div class="pm-orientation-guard-card">
        <span class="pm-orientation-icon" aria-hidden="true">↻</span>
        <strong>가로 화면으로 플레이</strong>
        <small>기기를 가로로 돌려주세요</small>
      </div>
    </div>
  </section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){
 const board=data?.leaderboard||data||{},entries=Array.isArray(board?.entries)?board.entries:[],king=entries[0],me=board?.me||entries.find(e=>e?.isMe);
 return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry pm-side-entry--overlay" data-layout-route="/polimable"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><div class="pm-side-overlay"><div class="pm-side-overlay-brand"><span>TODAY</span></div><div class="pm-side-overlay-stats${session?.authenticated?'':' is-single'}"><div class="pm-side-overlay-panel"><small>👑 TODAY KING</small><b>${king?`${esc(king.initials||'JCS')} · ${number(king.score)}`:'아직 기록 없음'}</b></div>${session?.authenticated?`<div class="pm-side-overlay-panel"><small>나의 오늘 기록</small><b>${me?`${number(me.score)}점 · ${Number(me.rank)||'-'}위`:'기록 없음'}</b></div>`:''}</div><div class="pm-side-overlay-cta">GAME START →</div></div></button></section>`;
}
