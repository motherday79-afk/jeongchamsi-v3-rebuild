import {POLIMARBLE_BOARD as BOARD,POLIMARBLE_CARDS as CARDS} from '../core/polimable-data.js?v=0.0.31.207';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');

/*
 * 31.207 UI principle
 * -------------------
 * - The game screenshot is NOT used as a clickable UI layer.
 * - Each playable object is real DOM: 24 tiles, player, dice, score, buttons,
 *   strategy cards and ranking.
 * - The approved illustration is used only as the scenic board background.
 * - Current position is represented ONLY by the moving Minime avatar.
 */
const VISUAL_POSITIONS=Object.freeze([
  [1,1], // START
  [1,2],[1,3],[1,4],[1,5],[1,6],[1,7],
  [2,7],[3,7],[4,7],[5,7],[6,7],
  [7,7],[7,6],[7,5],[7,4],[7,3],[7,2],
  [7,1],[6,1],[5,1],[4,1],[3,1],[2,1]
]);

const DIE_PIPS={
  1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]
};

const PLAYER_ASSET='/assets/polimable/player-male-31-207.png';

function die(face=1){const on=new Set(DIE_PIPS[Math.max(1,Math.min(6,Number(face)||1))]);return `<span class="pm-die" aria-label="주사위 ${face}">${Array.from({length:9},(_,i)=>`<i class="${on.has(i+1)?'on':''}"></i>`).join('')}</span>`;}
function delta(tile){if(tile.kind==='gain'||tile.kind==='bonus')return `+${number(tile.value)}`;if(tile.kind==='loss')return `-${number(tile.value)}`;if(tile.kind==='percent_loss')return `-${number(tile.value)}%`;if(tile.kind==='start')return 'START';if(tile.kind==='safe')return 'SAFE';if(tile.kind==='strategy_card')return 'CARD';if(tile.kind==='public_card')return 'EVENT';if(tile.kind==='choice')return 'CHOICE';return '';}
function tileClass(tile,i){const palette=['mint','blue','yellow','pink'];if(tile.kind==='loss'||tile.kind==='percent_loss')return 'loss';if(tile.kind==='bonus')return 'bonus';if(tile.kind==='strategy_card'||tile.kind==='choice')return 'special';if(tile.kind==='public_card')return 'public';if(tile.kind==='safe')return 'safe';if(tile.kind==='start')return 'start';return palette[i%palette.length];}

function board(state){return `<div class="pm-board-track" aria-label="JCS 폴리마블 24칸 게임보드">${BOARD.map((tile,i)=>{const [r,c]=VISUAL_POSITIONS[i];const player=state?.position===i;return `<div class="pm-tile tone-${tileClass(tile,i)}" style="--r:${r};--c:${c}" data-pm-cell="${i}" aria-label="${i===0?'START':`${i}번`} ${esc(tile.title)} ${esc(delta(tile))}"><span class="pm-tile-no">${i===0?'':i}</span><span class="pm-tile-icon" aria-hidden="true">${tile.icon}</span><b>${esc(tile.title)}</b><em>${esc(delta(tile))}</em>${player?`<span class="pm-player-token${state?._moving?' is-moving':''}" aria-label="현재 위치"><img src="${PLAYER_ASSET}" alt="폴리마블 미니미"></span>`:''}</div>`;}).join('')}</div>`;}

function dicePanel(state,authenticated,busy,moving){const dice=state?.lastDice?.length?state.lastDice:[3,5];const total=dice.reduce((a,b)=>a+Number(b||0),0);let main='';if(!state)main=authenticated?`<button type="button" class="pm-main-roll is-start" data-pm-start ${busy?'disabled':''}>🎲 GAME START</button>`:`<button type="button" class="pm-main-roll is-start" data-pm-login>🔐 로그인하고 시작</button>`;else if(state.status==='playing'&&!state.pendingChoice)main=`<button type="button" class="pm-main-roll" data-pm-roll ${busy||moving?'disabled':''}>🎲 주사위 굴리기</button>`;else if(state.status==='cashed_out')main=`<button type="button" class="pm-main-roll is-start" data-pm-start ${busy?'disabled':''}>🎲 다시 도전하기</button>`;
return `<section class="pm-dice-panel"><header><span>🎲</span><div><b>주사위 굴리기</b><small>지금, 한 걸음의 용기가 더 나은 정참시를 만듭니다!</small></div></header><div class="pm-dice-box">${dice.slice(0,3).map(die).join('')}</div><div class="pm-dice-result">${state?.lastDice?.length?`${dice.join(' + ')} = ${total}칸`:'READY'}</div>${main}</section>`;}

function scorePanel(state,busy,moving){const active=state?.status==='playing'&&!state?.pendingChoice;return `<section class="pm-score-panel"><header>💗 민심 SCORE</header><strong>${number(state?.score??1000)}</strong><div class="pm-peak">👑 최고 기록 <b>${number(state?.peakScore??1000)}</b></div><div class="pm-stage-badge">STAGE ${Number(state?.stage||1)}</div><button type="button" class="pm-continue" data-pm-roll ${!active||busy||moving?'disabled':''}>↻ 계속 도전</button><button type="button" class="pm-record" data-pm-record-open ${!active||busy||moving?'disabled':''}>🏁 기록하고 종료</button></section>`;}

function effects(state){if(!state)return '';const rows=[state.effects?.shieldCharges?`🛡 방어 ${state.effects.shieldCharges}`:'',state.effects?.favorPassTurns?`🌟 우대 ${state.effects.favorPassTurns}턴`:'',state.effects?.doubleGainTurns?`✨ 2배 ${state.effects.doubleGainTurns}`:'',state.effects?.halfLossTurns?`🧯 반감 ${state.effects.halfLossTurns}`:'',state.effects?.bonusDice?`🎲 추가 ${state.effects.bonusDice}`:'',state.effects?.recordInsuranceRatio?`📜 보험 ${Math.round(state.effects.recordInsuranceRatio*100)}%`:'',state.effects?.doubleOrNothingTurns?`⚡ 승부수 ${state.effects.doubleOrNothingTurns}`:''].filter(Boolean);return rows.length?`<div class="pm-effect-badges">${rows.map(x=>`<span>${x}</span>`).join('')}</div>`:'';}

function cards(state,busy){const held=state?.cards||[];return `<section class="pm-cards-panel"><header><div><span>⚡</span><b>전략카드 <small>(보유 ${held.length}/3)</small></b></div><em>똑똑한 선택이 더 큰 기회를 만듭니다!</em></header><div class="pm-card-grid">${Array.from({length:3},(_,idx)=>{const id=held[idx];if(!id)return `<div class="pm-card is-empty"><span>✦</span><b>전략카드</b><em>빈 카드 슬롯</em><small>${idx+1}</small></div>`;const c=CARDS[id];return `<button type="button" class="pm-card rarity-${c.rarity}" data-pm-card="${esc(id)}" ${busy||state?.status!=='playing'||state?.pendingChoice||state?._moving?'disabled':''}><span>${c.icon}</span><b>${esc(c.shortLabel)}</b><em>${esc(c.description)}</em><small>${idx+1}</small></button>`;}).join('')}</div>${effects(state)}</section>`;}

function ranking(leaderboard,scope){const entries=leaderboard?.entries||[],me=leaderboard?.me;return `<section class="pm-ranking-panel"><header><div><span>🏆</span><b>${scope==='today'?'TODAY':scope==='week'?'WEEK':'ALL'} RANKING</b></div><nav>${['today','week','all'].map(s=>`<button type="button" data-pm-scope="${s}" class="${scope===s?'active':''}">${s==='today'?'TODAY':s==='week'?'WEEK':'ALL'}</button>`).join('')}</nav></header><ol>${entries.slice(0,5).map(e=>`<li class="${e.isMe?'me':''}"><i>${e.rank===1?'👑':e.rank}</i><span class="pm-rank-face"><img src="${PLAYER_ASSET}" alt=""></span><strong>${esc(e.initials||'JCS')}</strong><b>${number(e.score)}</b>${e.rank===1?'<em>TODAY KING</em>':e.isMe?'<em>나의 순위!</em>':''}</li>`).join('')||'<li class="pm-rank-empty">첫 기록을 기다리고 있어요!</li>'}</ol>${me&&!entries.some(e=>e.userId===me.userId)?`<div class="pm-my-rank">내 순위 <b>#${me.rank}</b> · ${number(me.score)}</div>`:''}</section>`;}

function status(state,message,busy,moving){const current=state?BOARD[state.position]:BOARD[0];return `<div class="pm-status-bubble" aria-live="polite"><span>${current.icon}</span><div><b>${esc(current.title)}</b><p>${busy&&!moving?'처리 중...':esc(message)}</p></div></div>`;}

function choice(state,busy){if(!state?.pendingChoice)return '';const c=state.pendingChoice;return `<div class="pm-choice" role="dialog" aria-label="운명의 선택"><b>⚖️ 운명의 선택</b><p>${esc(c.description)}</p><div><button type="button" data-pm-choice="safe" ${busy?'disabled':''}>🫶 ${esc(c.safeLabel)}</button><button type="button" data-pm-choice="risk" ${busy?'disabled':''}>⚡ ${esc(c.riskLabel)}</button></div></div>`;}

function modal(state,recordMode,busy){if(!state||(state.status!=='game_over'&&!recordMode))return '';const gameOver=state.status==='game_over',recordable=gameOver?Number(state.insuredScore||0):Number(state.score||0);return `<div class="pm-modal" role="dialog" aria-modal="true" aria-label="점수 기록"><div class="pm-modal-card"><img class="pm-modal-avatar" src="${PLAYER_ASSET}" alt="폴리마블 미니미"><b>${gameOver?'GAME OVER':'SCORE REGISTER'}</b><p>${gameOver?'오늘의 도전은 여기까지!':'지금 점수를 안전하게 기록할까요?'}</p><div class="pm-final-score">${number(recordable)}</div>${gameOver&&!recordable?'<p class="pm-modal-note">기록 보험이 없어 이번 점수는 랭킹에 남지 않습니다.</p>':''}${(!gameOver||recordable>0)?`<label>이니셜<input data-pm-initials maxlength="3" value="${esc(state.initials||'JCS')}" autocomplete="off"></label><button type="button" class="pm-modal-primary" data-pm-record ${busy?'disabled':''}>🏆 기록하기</button>`:''}${!gameOver?`<button type="button" class="pm-modal-secondary" data-pm-record-cancel ${busy?'disabled':''}>계속 도전</button>`:`<button type="button" class="pm-modal-secondary" data-pm-start ${busy?'disabled':''}>다시 시작</button>`}</div></div>`;}

export function renderPoliMarblePage({session,state=null,leaderboard=null,scope='today',message='주사위를 굴려 정참시의 오늘을 만들어봐요! 💜',recordMode=false,busy=false}={}){
 const authenticated=!!session?.authenticated,moving=!!state?._moving;
 return `<section class="pm-page"><div class="pm-landscape-note"><b>📱 JCS 폴리마블</b><span>가로모드로 돌리면 바로 게임을 시작할 수 있어요.</span></div><div class="pm-game-root" data-pm-root data-authenticated="${authenticated?'true':'false'}"><div class="pm-stage"><section class="pm-board-zone"><div class="pm-board-scene" aria-hidden="true"></div>${board(state)}${status(state,message,busy,moving)}</section><aside class="pm-console"><div class="pm-console-head"><div class="pm-console-mascot"><img src="${PLAYER_ASSET}" alt=""><span>주사위를 굴려<br>정참시의 오늘을 만들어봐요! 💗</span></div><div class="pm-console-icons" aria-hidden="true"><span>🔊</span><span>?</span><span>⚙</span></div></div><div class="pm-console-main">${dicePanel(state,authenticated,busy,moving)}${scorePanel(state,busy,moving)}</div>${cards(state,busy)}${ranking(leaderboard,scope)}</aside>${choice(state,busy)}${modal(state,recordMode,busy)}</div></div></section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry" data-layout-route="/polimable" aria-label="JCS 폴리마블 게임 시작"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><span>GAME START <b>→</b></span></button></section>`;}
