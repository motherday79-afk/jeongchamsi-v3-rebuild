import {POLIMARBLE_CARDS as CARDS} from '../core/polimable-data.js?v=0.0.31.209';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number(v||0).toLocaleString('ko-KR');

/*
 * JCS POLIMARBLE 31.209 — STEP 1 / FOUNDATION ONLY
 * -------------------------------------------------
 * This release intentionally contains NO board cells and NO character.
 * Goal: lock the 7:3 PC composition first.
 * - left 70%: scenic game background only
 * - right 30%: live status console
 * Board 24 cells and player will be added only after this composition is approved.
 */

const DIE_PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};

function die(face=1,rolling=false,index=0){
  const on=new Set(DIE_PIPS[Math.max(1,Math.min(6,Number(face)||1))]);
  return `<span class="pm-die${rolling?' is-rolling':''}" style="--die-i:${index}" aria-label="주사위 ${face}">${Array.from({length:9},(_,i)=>`<i class="${on.has(i+1)?'on':''}"></i>`).join('')}</span>`;
}

function dicePanel(state,authenticated,busy,moving){
  const rolling=!!state?._diceRolling;
  const dice=state?.lastDice?.length?state.lastDice:[3,5];
  const displayDice=rolling?[2,6]:dice;
  const total=dice.reduce((a,b)=>a+Number(b||0),0);
  let main='';
  if(!state) main=authenticated?`<button type="button" class="pm-main-roll is-start" data-pm-start ${busy?'disabled':''}>🎲 GAME START</button>`:`<button type="button" class="pm-main-roll is-start" data-pm-login>🔐 로그인하고 시작</button>`;
  else if(state.status==='playing'&&!state.pendingChoice) main=`<button type="button" class="pm-main-roll" data-pm-roll ${busy||moving?'disabled':''}>🎲 주사위 굴리기</button>`;
  else if(state.status==='cashed_out') main=`<button type="button" class="pm-main-roll is-start" data-pm-start ${busy?'disabled':''}>🎲 다시 도전하기</button>`;
  return `<section class="pm-dice-panel${rolling?' is-rolling':''}">
    <header><span>🎲</span><div><b>주사위 굴리기</b><small>${rolling?'주사위가 굴러가고 있어요!':'다음 이동을 결정합니다.'}</small></div></header>
    <div class="pm-dice-box">${displayDice.slice(0,2).map((v,i)=>die(v,rolling,i)).join('')}</div>
    <div class="pm-dice-result">${rolling?'ROLLING...':state?.lastDice?.length?`${dice.join(' + ')} = ${total}칸`:'READY'}</div>
    ${main}
  </section>`;
}

function scorePanel(state,busy,moving){
  const active=state?.status==='playing'&&!state?.pendingChoice;
  const score=number(state?.score??1000),digits=String(Math.max(0,Number(state?.score??1000))).length;
  return `<section class="pm-score-panel">
    <header><span>💗</span><b>민심 SCORE</b></header>
    <strong class="digits-${Math.min(8,digits)}">${score}</strong>
    <div class="pm-peak">👑 최고 기록 <b>${number(state?.peakScore??1000)}</b></div>
    <div class="pm-stage-badge">STAGE ${Number(state?.stage||1)}</div>
    <button type="button" class="pm-continue" data-pm-roll ${!active||busy||moving?'disabled':''}>↻ 계속 도전</button>
    <button type="button" class="pm-record" data-pm-record-open ${!active||busy||moving?'disabled':''}>🏁 기록하고 종료</button>
  </section>`;
}

function effects(state){
  if(!state)return '';
  const rows=[state.effects?.shieldCharges?`🛡 방어 ${state.effects.shieldCharges}`:'',state.effects?.favorPassTurns?`🌟 우대 ${state.effects.favorPassTurns}턴`:'',state.effects?.doubleGainTurns?`✨ 2배 ${state.effects.doubleGainTurns}`:'',state.effects?.halfLossTurns?`🧯 반감 ${state.effects.halfLossTurns}`:'',state.effects?.bonusDice?`🎲 추가 ${state.effects.bonusDice}`:'',state.effects?.recordInsuranceRatio?`📜 보험 ${Math.round(state.effects.recordInsuranceRatio*100)}%`:'',state.effects?.doubleOrNothingTurns?`⚡ 승부수 ${state.effects.doubleOrNothingTurns}`:''].filter(Boolean);
  return rows.length?`<div class="pm-effect-badges">${rows.map(x=>`<span>${x}</span>`).join('')}</div>`:'';
}

function cards(state,busy){
  const held=state?.cards||[];
  return `<section class="pm-cards-panel">
    <header><div><span>⚡</span><b>전략카드 <small>(보유 ${held.length}/3)</small></b></div><em>선택이 다음 흐름을 바꿉니다.</em></header>
    <div class="pm-card-grid">${Array.from({length:3},(_,idx)=>{
      const id=held[idx];
      if(!id)return `<div class="pm-card is-empty"><span>✦</span><b>전략카드</b><em>빈 카드 슬롯</em><small>${idx+1}</small></div>`;
      const c=CARDS[id];
      return `<button type="button" class="pm-card rarity-${c.rarity}" data-pm-card="${esc(id)}" ${busy||state?.status!=='playing'||state?.pendingChoice||state?._moving||state?._diceRolling?'disabled':''}><span>${c.icon}</span><b>${esc(c.shortLabel)}</b><em>${esc(c.description)}</em><small>${idx+1}</small></button>`;
    }).join('')}</div>${effects(state)}
  </section>`;
}

function ranking(leaderboard,scope){
  const entries=leaderboard?.entries||[],me=leaderboard?.me;
  return `<section class="pm-ranking-panel">
    <header><div><span>🏆</span><b>${scope==='today'?'TODAY':scope==='week'?'WEEK':'ALL'} RANKING</b></div><nav>${['today','week','all'].map(s=>`<button type="button" data-pm-scope="${s}" class="${scope===s?'active':''}">${s==='today'?'TODAY':s==='week'?'WEEK':'ALL'}</button>`).join('')}</nav></header>
    <ol>${entries.slice(0,5).map(e=>`<li class="${e.isMe?'me':''}"><i>${e.rank===1?'👑':e.rank}</i><span class="pm-rank-initial">${esc(String(e.initials||'J').slice(0,1))}</span><strong>${esc(e.initials||'JCS')}</strong><b>${number(e.score)}</b>${e.rank===1?'<em>TODAY KING</em>':e.isMe?'<em>나의 순위!</em>':''}</li>`).join('')||'<li class="pm-rank-empty">첫 기록을 기다리고 있어요!</li>'}</ol>
    ${me&&!entries.some(e=>e.userId===me.userId)?`<div class="pm-my-rank">내 순위 <b>#${me.rank}</b> · ${number(me.score)}</div>`:''}
  </section>`;
}

function choice(state,busy){
  if(!state?.pendingChoice)return '';
  const c=state.pendingChoice;
  return `<div class="pm-choice" role="dialog" aria-label="운명의 선택"><b>⚖️ 운명의 선택</b><p>${esc(c.description)}</p><div><button type="button" data-pm-choice="safe" ${busy?'disabled':''}>🫶 ${esc(c.safeLabel)}</button><button type="button" data-pm-choice="risk" ${busy?'disabled':''}>⚡ ${esc(c.riskLabel)}</button></div></div>`;
}

function modal(state,recordMode,busy){
  if(!state||(state.status!=='game_over'&&!recordMode))return '';
  const gameOver=state.status==='game_over',recordable=gameOver?Number(state.insuredScore||0):Number(state.score||0);
  return `<div class="pm-modal" role="dialog" aria-modal="true" aria-label="점수 기록"><div class="pm-modal-card"><b>${gameOver?'GAME OVER':'SCORE REGISTER'}</b><p>${gameOver?'오늘의 도전은 여기까지!':'지금 점수를 안전하게 기록할까요?'}</p><div class="pm-final-score">${number(recordable)}</div>${gameOver&&!recordable?'<p class="pm-modal-note">기록 보험이 없어 이번 점수는 랭킹에 남지 않습니다.</p>':''}${(!gameOver||recordable>0)?`<label>이니셜<input data-pm-initials maxlength="3" value="${esc(state.initials||'JCS')}" autocomplete="off"></label><button type="button" class="pm-modal-primary" data-pm-record ${busy?'disabled':''}>🏆 기록하기</button>`:''}${!gameOver?`<button type="button" class="pm-modal-secondary" data-pm-record-cancel ${busy?'disabled':''}>계속 도전</button>`:`<button type="button" class="pm-modal-secondary" data-pm-start ${busy?'disabled':''}>다시 시작</button>`}</div></div>`;
}

export function renderPoliMarblePage({session,state=null,leaderboard=null,scope='today',message='주사위를 굴려 정참시의 오늘을 만들어봐요! 💜',recordMode=false,busy=false}={}){
  const authenticated=!!session?.authenticated,moving=!!state?._moving;
  return `<section class="pm-page">
    <div class="pm-landscape-note"><b>📱 JCS 폴리마블</b><span>가로모드로 돌리면 바로 게임을 시작할 수 있어요.</span></div>
    <div class="pm-game-root" data-pm-root data-authenticated="${authenticated?'true':'false'}">
      <div class="pm-stage">
        <section class="pm-board-zone" aria-label="폴리마블 게임 배경 - 24칸 설계 전 단계">
          <div class="pm-board pm-board-step1" aria-label="JCS 폴리마블 승인 배경">
          <img class="pm-step1-approved-image" src="/assets/polimable/POLIMARBLE_STEP1_APPROVED_31_211.png" alt="JCS 폴리마블">
        </div>
        <aside class="pm-console">
          <div class="pm-console-head"><div class="pm-console-title"><strong>JCS POLIMARBLE</strong><span>GAME STATUS</span></div><div class="pm-console-icons" aria-hidden="true"><span>🔊</span><span>?</span><span>⚙</span></div></div>
          <div class="pm-console-main">${dicePanel(state,authenticated,busy,moving)}${scorePanel(state,busy,moving)}</div>
          ${cards(state,busy)}
          ${ranking(leaderboard,scope)}
        </aside>
        ${choice(state,busy)}${modal(state,recordMode,busy)}
      </div>
    </div>
  </section>`;
}

export function renderPoliMarbleSidebarCard(){
  return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry" data-layout-route="/polimable" aria-label="JCS 폴리마블 게임 시작"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><span>GAME START <b>→</b></span></button></section>`;
}
