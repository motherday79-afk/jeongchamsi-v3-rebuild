import {POLIMARBLE_MOVE_ANCHORS as MOVE_ANCHORS,POLIMARBLE_OWNER_BADGE_POINTS as OWNER_BADGES} from '../core/polimable-layout.js?v=0.0.31.245';
import {createPoliMarbleAudio} from '../core/polimable-audio.js?v=0.0.31.245';
import {calculatePoliMarbleStage} from '../core/polimable-viewport.js?v=0.0.31.247';

const START_CASH=10000;
const MAX_CARDS=4;
const RENT_RATE=[0,.40,.80,1.50,2.50];
const UPGRADE_RATE=[0,0,.60,.90,1.20];
const TRACK_LEN=MOVE_ANCHORS.length; // current approved visual board = 33 visible cells

const TILE_RULES=[
  {i:0,type:'start',name:'START'},
  {i:1,type:'gain',name:'민심 급등',amount:700},
  {i:2,type:'property',name:'정책연구원',group:'policy',price:1300},
  {i:3,type:'property',name:'공공전략실',group:'policy',price:1600},
  {i:4,type:'gain',name:'참여의 시간',amount:500},
  {i:5,type:'card',name:'정책카드'},
  {i:6,type:'loss',name:'민심 급락',amount:500},
  {i:7,type:'property',name:'현장 취재',group:'media',price:1100},
  {i:8,type:'property',name:'언론 토론회',group:'media',price:900},
  {i:9,type:'plaza',name:'정참시 광장',amount:500},
  {i:10,type:'property',name:'정당연구소',group:'policy',price:1900},
  {i:11,type:'property',name:'시민참여센터',group:'civic',price:700},
  {i:12,type:'property',name:'NGO연합',group:'ngo',price:750},
  {i:13,type:'issue',name:'긴급이슈'},
  {i:14,type:'property',name:'환경연대',group:'ngo',price:900},
  {i:15,type:'property',name:'인권네트워크',group:'ngo',price:1050},
  {i:16,type:'card',name:'전략카드'},
  {i:17,type:'fate',name:'운명의 선택'},
  {i:18,type:'property',name:'시민포럼',group:'civic',price:600},
  {i:19,type:'property',name:'지역연대',group:'civic',price:850},
  {i:20,type:'card',name:'민심카드'},
  {i:21,type:'property',name:'공익네트워크',group:'ngo',price:1200},
  {i:22,type:'issue',name:'긴급이슈'},
  {i:23,type:'property',name:'사회혁신랩',group:'civic',price:1000},
  {i:24,type:'property',name:'현장소통',group:'media',price:1350},
  {i:25,type:'tour',name:'정참시 투어'},
  {i:26,type:'property',name:'시민일보',group:'press',price:1100},
  {i:27,type:'property',name:'공론신문',group:'press',price:1500},
  {i:28,type:'loss',name:'메시지 혼선',amount:700},
  {i:29,type:'property',name:'공공방송센터',group:'media',price:1600},
  {i:30,type:'property',name:'미디어허브',group:'media',price:1850},
  {i:31,type:'card',name:'전략카드'},
  {i:32,type:'gain',name:'민심 급등',amount:700}
];


const CARD_ICONS=Object.freeze({
  shield:'🛡️',reroll:'🎲',upgrade:'⭐',buyout:'🤝',teleport:'🧭',boost:'⚡'
});

const CARD_DECK=[
  {id:'shield',name:'방어권',desc:'다음 민심 영향 1회 면제'},
  {id:'reroll',name:'재도전',desc:'다음 1P 턴에 주사위를 한 번 더 굴림'},
  {id:'upgrade',name:'강화할인',desc:'다음 강화 비용 50% 할인'},
  {id:'buyout',name:'인수할인',desc:'다음 인수 비용 30% 할인'},
  {id:'teleport',name:'이동권',desc:'원하는 칸으로 즉시 이동'},
  {id:'boost',name:'영향력 x2',desc:'다음 거점 민심 영향력 2배'}
];

export async function hydratePoliMarble(){bindPoliMarbleInteractions();}

function readPx(value){
  const n=Number.parseFloat(value);
  return Number.isFinite(n)?n:0;
}

function bindResponsiveStage(root){
  const page=root.closest('.pm-board-stage-page');
  if(!page||typeof window==='undefined')return;
  const coarse=window.matchMedia?.('(hover: none) and (pointer: coarse)');
  const sync=()=>{
    const vv=window.visualViewport;
    const vw=Math.max(1,vv?.width||window.innerWidth||document.documentElement.clientWidth||1);
    const vh=Math.max(1,vv?.height||window.innerHeight||document.documentElement.clientHeight||1);
    const mobile=Boolean(coarse?.matches) && Math.min(vw,vh)<=1200;
    page.classList.toggle('pm-mobile-fit',mobile);
    page.classList.toggle('pm-portrait-mode',mobile&&vh>vw);
    if(!mobile){
      root.style.removeProperty('width');
      root.style.removeProperty('height');
      root.removeAttribute('data-pm-fit-mode');
      return;
    }
    const cs=getComputedStyle(page);
    try{
      const fit=calculatePoliMarbleStage(vw,vh,{
        left:readPx(cs.paddingLeft),right:readPx(cs.paddingRight),
        top:readPx(cs.paddingTop),bottom:readPx(cs.paddingBottom),gutter:4
      });
      root.style.width=`${fit.width}px`;
      root.style.height=`${fit.height}px`;
      root.dataset.pmFitMode=fit.mode;
      root.style.setProperty('--pm-stage-scale',String(fit.scale));
    }catch(error){
      // Never allow a viewport calculation error to collapse the stage to a black screen.
      const safeScale=Math.max(.05,Math.min(1,vw/1672,vh/941));
      root.style.width=`${1672*safeScale}px`;
      root.style.height=`${941*safeScale}px`;
      root.dataset.pmFitMode='fallback-fit';
      root.style.setProperty('--pm-stage-scale',String(safeScale));
      console.error('[PoliMarble] responsive stage fallback',error);
    }
  };
  sync();
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',sync,{passive:true});
  window.visualViewport?.addEventListener('resize',sync,{passive:true});
  root._pmViewportSync=sync;
}

function bindLogicalCanvas(root){
  const canvas=root.querySelector('[data-pm-logical-canvas]');
  if(!canvas)return;
  const sync=()=>{
    const rect=root.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const scale=Math.min(rect.width/1672,rect.height/941);
    canvas.style.transform=`scale(${scale})`;
  };
  sync();
  if(typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(sync);
    ro.observe(root);
    root._pmLogicalResizeObserver=ro;
  }else if(typeof window!=='undefined'){
    window.addEventListener('resize',sync,{passive:true});
  }
}

export function bindPoliMarbleInteractions(){
  const root=document.querySelector('[data-pm-root]');
  if(!root||root.dataset.gameBound==='1') return;
  root.dataset.gameBound='1';
  bindResponsiveStage(root);
  bindLogicalCanvas(root);
  const game=createGame(root);
  root._pmGame=game;
  game.init();
}

function createGame(root){
  const token1=root.querySelector('[data-pm-character-token]');
  const token1Img=root.querySelector('[data-pm-character-token-image]');
  const token2=root.querySelector('[data-pm-ai-token]');
  const button=root.querySelector('[data-pm-dice-roll]');
  const flight=root.querySelector('[data-pm-dice-flight]');
  const flightDice=[...root.querySelectorAll('[data-pm-die-flight]')];
  const dockDice=[...root.querySelectorAll('[data-pm-die-dock]')];
  const result=root.querySelector('[data-pm-dice-result]');
  const resultTitle=root.querySelector('[data-pm-dice-result-title]');
  const resultSub=root.querySelector('[data-pm-dice-result-sub]');
  const modal=root.querySelector('[data-pm-action-modal]');
  const title=root.querySelector('[data-pm-action-title]');
  const body=root.querySelector('[data-pm-action-body]');
  const kicker=root.querySelector('[data-pm-action-kicker]');
  const actions=root.querySelector('[data-pm-action-buttons]');
  const toast=root.querySelector('[data-pm-toast]');
  const turnPill=root.querySelector('[data-pm-turn-pill]');
  const audio=createPoliMarbleAudio(root);

  const state={
    turn:0,rolling:false,gameOver:false,
    players:[
      {name:'PLAYER 1',cash:START_CASH,pos:0,laps:0,cards:[],shield:false,upgradeDiscount:false,buyoutDiscount:false,boost:false,reroll:false},
      {name:'AI 시민',cash:START_CASH,pos:0,laps:0,cards:[],shield:false,upgradeDiscount:false,buyoutDiscount:false,boost:false,reroll:false}
    ],
    props:{},
    pot:0
  };

  function init(){
    audio.init();
    placeToken(0,0,true);placeToken(1,0,true);render();
    button?.addEventListener('click',()=>{ if(state.turn===0&&!state.rolling&&!state.gameOver) runTurn(0); });
    root.querySelector('[data-pm-strategy-slots]')?.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-card-index]'); if(!b||state.turn!==0||state.rolling) return;
      void useCard(0,Number(b.dataset.cardIndex));
    });
  }

  function render(){
    // 31.244 HOTFIX: visual/HUD rendering must never interrupt the turn engine.
    // Each UI block is isolated so a marker/HUD failure cannot stop AI scheduling.
    try{
      state.players.forEach((p,i)=>{
        const cash=root.querySelector(`[data-pm-player-cash="${i}"]`);
        const meta=root.querySelector(`[data-pm-player-meta="${i}"]`);
        if(cash) cash.textContent=`민심 ${p.cash.toLocaleString('ko-KR')}`;
        if(meta) meta.textContent=`${p.laps}바퀴 · 자산 ${portfolioValue(i).toLocaleString('ko-KR')}`;
      });
      if(turnPill) turnPill.textContent=state.gameOver?'GAME OVER':`${state.turn===0?'1P':'2P AI'} TURN`;
      if(button) button.disabled=state.turn!==0||state.rolling||state.gameOver;
    }catch(error){console.error('[POLIMARBLE 31.244] base HUD render failed',error);}
    safeUiRender(renderCards,'strategy-cards');
    safeUiRender(renderRanking,'today-ranking');
    safeUiRender(renderOwnership,'ownership-markers');
  }

  function safeUiRender(fn,label){
    try{fn();}catch(error){console.error(`[POLIMARBLE 31.244] ${label} render failed`,error);}
  }

  function renderCards(){
    const el=root.querySelector('[data-pm-strategy-slots]'); if(!el)return;
    const cards=state.players[0].cards;
    el.innerHTML=[0,1,2,3].map(i=>cards[i]?`<button type="button" class="pm-card-chip" data-card-index="${i}" title="${cards[i].desc}"><span class="pm-card-icon" aria-hidden="true">${CARD_ICONS[cards[i].id]||'★'}</span><b>${cards[i].name}</b></button>`:`<span class="pm-card-chip is-empty"></span>`).join('');
  }

  function renderRanking(){
    const el=root.querySelector('[data-pm-ranking-overlay]');if(!el)return;
    const ranked=state.players.map((p,i)=>({i,p,score:p.cash+portfolioValue(i)})).sort((a,b)=>b.score-a.score);
    el.innerHTML=Array.from({length:3},(_,idx)=>{
      const r=ranked[idx];
      return r
        ? `<div class="pm-rank-row"><b>${idx+1}</b><span>${r.p.name}</span><strong>${r.score.toLocaleString('ko-KR')}</strong></div>`
        : `<div class="pm-rank-row is-empty"><b>${idx+1}</b><span>-</span><strong>-</strong></div>`;
    }).join('');
  }

  function renderOwnership(){
    const layer=root.querySelector('[data-pm-owner-marker-layer]');
    if(!layer)return;
    const markers=[];
    for(const [idxStr,prop] of Object.entries(state.props)){
      const idx=Number(idxStr),tile=TILE_RULES[idx],point=OWNER_BADGES[idx];
      if(!tile||tile.type!=='property'||!point)continue;
      markers.push(`<div class="pm-owner-marker ${prop.owner===0?'is-p1':'is-p2'} level-${prop.level}" style="left:${point.x}px;top:${point.y}px" aria-label="${prop.owner===0?'1P':'AI'} 소유 ${tile.name} 레벨 ${prop.level}"><span>${prop.owner===0?'1P':'AI'}</span><b>L${prop.level}</b></div>`);
    }
    layer.innerHTML=markers.join('');
  }

  async function runTurn(playerIndex){
    if(state.rolling||state.gameOver)return;
    state.rolling=true;render();
    const dice=await animateDice();
    const total=dice[0]+dice[1]; const dbl=dice[0]===dice[1];
    showDiceResult(dice,total,dbl);
    await wait(420);
    flight.setAttribute('aria-hidden','true');flight.classList.remove('is-landed');
    await moveBy(playerIndex,total);
    await resolveTile(playerIndex);
    if(state.gameOver){state.rolling=false;render();return;}
    const p=state.players[playerIndex];
    if(playerIndex===0&&p.reroll){p.reroll=false;showToast('재도전 카드 발동 · 1P가 한 번 더 굴립니다.');state.rolling=false;render();return;}
    if(dbl){showToast(`${playerIndex===0?'1P':'AI'} DOUBLE · 추가 턴`);state.rolling=false;render();if(playerIndex===1)setTimeout(()=>runTurn(1),850);return;}
    state.turn=playerIndex===0?1:0;state.rolling=false;render();
    if(state.turn===1) setTimeout(()=>runTurn(1),900);
  }

  async function animateDice(){
    audio.play('diceRoll');
    result.classList.remove('is-visible','is-double');result.setAttribute('aria-hidden','true');
    flight.setAttribute('aria-hidden','false');flight.classList.remove('is-rolling','is-landed');void flight.offsetWidth;flight.classList.add('is-rolling');
    const final=[fairDie(),fairDie()],started=performance.now();
    while(performance.now()-started<760){setDieFace(flightDice[0],fairDie());setDieFace(flightDice[1],fairDie());await wait(68);}
    setDieFace(flightDice[0],final[0]);setDieFace(flightDice[1],final[1]);flight.classList.remove('is-rolling');flight.classList.add('is-landed');audio.play('diceLand');await wait(320);
    dockDice.forEach((die,i)=>setDieFace(die,final[i]));
    return final;
  }

  function showDiceResult(dice,total,dbl){
    resultTitle.textContent=`합계 ${total}`;resultSub.textContent=dbl?`DOUBLE · ${dice[0]} + ${dice[1]}`:`${dice[0]} + ${dice[1]}`;
    result.classList.toggle('is-double',dbl);result.setAttribute('aria-hidden','false');result.classList.add('is-visible');
    if(dbl)audio.play('double');
  }

  async function moveBy(playerIndex,steps){
    const p=state.players[playerIndex];
    setMovingVisual(playerIndex,true);
    for(let s=0;s<steps;s++){
      const prev=p.pos; p.pos=(p.pos+1)%TRACK_LEN;
      if(prev===TRACK_LEN-1&&p.pos===0){p.laps++;const salary=salaryForLap(p.laps);p.cash+=salary;audio.play('start');showToast(`${p.name} START 통과 · 민심 +${salary.toLocaleString('ko-KR')}`);render();}
      placeToken(playerIndex,p.pos,false); audio.play('step'); await wait(215);
    }
    setMovingVisual(playerIndex,false); audio.play('land'); await wait(100);render();
  }

  function placeToken(playerIndex,index,instant=false){
    const point=MOVE_ANCHORS[index%TRACK_LEN];
    if(playerIndex===0){
      const w=7.0,bottom=12.25;
      token1.classList.toggle('is-instant',instant);token1.style.left=`${point.x-w/2}%`;token1.style.top=`${point.y-bottom}%`;
      if(instant)requestAnimationFrame(()=>token1.classList.remove('is-instant'));
    }else{
      token2.style.left=`${point.x}%`;token2.style.top=`${point.y}%`;
    }
  }

  function setMovingVisual(playerIndex,on){
    if(playerIndex===0&&token1Img)token1Img.src=on?'/assets/polimable/characters/male2/male2-move.png':'/assets/polimable/characters/male2/male2-token.png';
    if(playerIndex===0)token1?.classList.toggle('is-step-hop',on);
    else token2?.classList.toggle('is-moving',on);
  }

  async function resolveTile(playerIndex){
    const p=state.players[playerIndex],tile=TILE_RULES[p.pos]||{type:'noop',name:`칸 ${p.pos}`};
    if(tile.type==='start'){showToast(`${p.name} START 도착`);return;}
    if(tile.type==='gain'||tile.type==='plaza'){p.cash+=tile.amount;audio.play('gain');showToast(`${tile.name} · 민심 +${tile.amount.toLocaleString('ko-KR')}`);reaction(playerIndex,'win');render();return;}
    if(tile.type==='loss'){await takeCash(playerIndex,tile.amount,tile.name);reaction(playerIndex,'fail');render();return;}
    if(tile.type==='issue'){const amount=[-700,-400,400,700][Math.floor(Math.random()*4)];if(amount>=0){p.cash+=amount;audio.play('gain');showToast(`긴급이슈 반전 · 민심 +${amount}`);reaction(playerIndex,'emotion');}else{await takeCash(playerIndex,-amount,'긴급이슈');reaction(playerIndex,'fail');}render();return;}
    if(tile.type==='card'){await drawCard(playerIndex);render();return;}
    if(tile.type==='fate'){await resolveFate(playerIndex);render();return;}
    if(tile.type==='tour'){await resolveTour(playerIndex);render();return;}
    if(tile.type==='property'){await resolveProperty(playerIndex,tile);render();return;}
  }

  async function resolveProperty(playerIndex,tile){
    const prop=state.props[tile.i],p=state.players[playerIndex];
    if(!prop){
      if(playerIndex===1){if(p.cash>=tile.price*1.8){buyProperty(playerIndex,tile);}else showToast(`AI가 ${tile.name} 구매를 보류했습니다.`);return;}
      const ok=await ask(`영향력 거점`,`<b>${tile.name}</b><br>민심 ${tile.price.toLocaleString('ko-KR')}을 사용해 확보하시겠습니까?`,[['구매',true],['지나가기',false]]);
      if(ok)buyProperty(playerIndex,tile);return;
    }
    if(prop.owner===playerIndex){
      const maxLevel=Math.min(4,p.laps+1);
      const upCost=upgradeCost(tile,prop,p);
      if(playerIndex===1){if(prop.level<maxLevel&&p.cash>=upCost*2)upgradeProperty(playerIndex,tile,prop);return;}
      const options=[];
      if(prop.level<maxLevel)options.push([`강화 ${upCost.toLocaleString()}`, 'upgrade']);
      options.push([`매각 ${sellValue(tile,prop).toLocaleString()}`,'sell'],['그대로','skip']);
      const choice=await ask(`내 거점 · ${tile.name}`,`현재 L${prop.level} · 투자 ${prop.invested.toLocaleString('ko-KR')} 민심`,options);
      if(choice==='upgrade')upgradeProperty(playerIndex,tile,prop); else if(choice==='sell')sellProperty(playerIndex,tile,prop);return;
    }
    const owner=state.players[prop.owner];
    let rent=Math.round(tile.price*RENT_RATE[prop.level]);
    if(hasNetwork(prop.owner,tile.group))rent*=2;
    if(owner.boost){rent*=2;owner.boost=false;}
    if(p.shield){p.shield=false;showToast(`${p.name} 방어권 사용 · 민심 영향 면제`);}else{await transferCash(playerIndex,prop.owner,rent,`${tile.name} 민심 영향`);}
    if(state.gameOver)return;
    if(prop.level>=4)return;
    let buyout=prop.invested*2;
    if(p.buyoutDiscount){buyout=Math.round(buyout*.7);}
    if(playerIndex===1){if(p.cash>buyout*1.8){p.buyoutDiscount=false;transferOwnership(playerIndex,tile,prop,buyout);}return;}
    if(p.cash>=buyout){const ok=await ask(`거점 인수`,`민심 ${buyout.toLocaleString('ko-KR')}으로 <b>${tile.name}</b>을 인수하시겠습니까?`,[['인수',true],['아니오',false]]);if(ok){p.buyoutDiscount=false;transferOwnership(playerIndex,tile,prop,buyout);}}
  }

  function buyProperty(pi,tile){const p=state.players[pi];if(p.cash<tile.price){showToast('민심이 부족합니다.');return;}p.cash-=tile.price;state.props[tile.i]={owner:pi,level:1,invested:tile.price};audio.play('purchase');showToast(`${p.name} · ${tile.name} 영향력 확보`);reaction(pi,'win');}
  function upgradeProperty(pi,tile,prop){const p=state.players[pi],cost=upgradeCost(tile,prop,p);if(p.cash<cost)return;p.cash-=cost;prop.level++;prop.invested+=cost;p.upgradeDiscount=false;audio.play('purchase');showToast(`${tile.name} L${prop.level} 강화`);reaction(pi,'win');}
  function sellProperty(pi,tile,prop){const value=sellValue(tile,prop);state.players[pi].cash+=value;delete state.props[tile.i];audio.play('gain');showToast(`${tile.name} 매각 · 민심 +${value.toLocaleString('ko-KR')}`);}
  function transferOwnership(pi,tile,prop,cost){const old=prop.owner;state.players[pi].cash-=cost;state.players[old].cash+=cost;prop.owner=pi;audio.play('purchase');showToast(`${state.players[pi].name}이 ${tile.name} 인수`);reaction(pi,'win');}
  function upgradeCost(tile,prop,p){let c=Math.round(tile.price*UPGRADE_RATE[prop.level+1]);if(p.upgradeDiscount)c=Math.round(c*.5);return c;}
  function sellValue(tile,prop){return Math.round(prop.invested*.70);}

  async function resolveFate(pi){
    if(pi===1){const risky=Math.random()<.5;if(risky){const win=Math.random()<.5,amt=1200;if(win)state.players[pi].cash+=amt;else await takeCash(pi,amt,'운명의 선택');}else state.players[pi].cash+=300;showToast('AI가 운명의 선택을 마쳤습니다.');return;}
    const c=await ask('운명의 선택','안전하게 민심 +300을 받을까요, 위험을 감수해 ±1,200에 도전할까요?',[['안전 +300','safe'],['도전 ±1,200','risk']]);
    if(c==='safe'){state.players[pi].cash+=300;audio.play('gain');showToast('안전한 선택 · 민심 +300');}
    else{const win=Math.random()<.5;if(win){state.players[pi].cash+=1200;audio.play('gain');showToast('운명의 선택 성공 · 민심 +1,200');reaction(pi,'win');}else{await takeCash(pi,1200,'운명의 선택 실패');reaction(pi,'fail');}}
  }

  async function resolveTour(pi){
    if(pi===1){const target=Math.floor(Math.random()*TRACK_LEN);await moveDirect(pi,target);showToast(`AI 정참시 투어 · ${TILE_RULES[target]?.name||target} 이동`);return;}
    const choices=[2,7,10,14,18,21,26,29].map(idx=>[TILE_RULES[idx].name,idx]);
    const target=await ask('정참시 투어','이동할 대표 거점을 선택하세요.',choices);
    if(Number.isInteger(target)){await moveDirect(pi,target);showToast(`정참시 투어 · ${TILE_RULES[target].name} 이동`);}
  }
  async function moveDirect(pi,target){state.players[pi].pos=target;placeToken(pi,target,false);await wait(300);}

  async function drawCard(pi){
    const p=state.players[pi],card={...CARD_DECK[Math.floor(Math.random()*CARD_DECK.length)]};
    if(p.cards.length>=MAX_CARDS){
      if(pi===1)p.cards.shift();
      else{
        const opts=p.cards.map((c,i)=>[`버리기 · ${c.name}`,i]);opts.push(['새 카드 포기','skip']);
        const choice=await ask('전략카드 보유 한도',`새 카드 <b>${card.name}</b>을 획득했습니다.<br>기존 카드 한 장을 버리면 보유할 수 있습니다.`,opts);
        if(choice==='skip'){showToast('새 전략카드를 포기했습니다.');return;}
        if(Number.isInteger(choice))p.cards.splice(choice,1);
      }
    }
    p.cards.push(card);showToast(`${p.name} 전략카드 획득 · ${card.name}`);reaction(pi,'emotion');
    if(pi===1)autoUseAiCard(pi);
  }

  async function useCard(pi,index){
    const p=state.players[pi],card=p.cards[index];if(!card||pi!==0)return;
    const activeReason=card.id==='shield'&&p.shield?'이미 방어권이 활성화되어 있습니다.'
      :card.id==='reroll'&&p.reroll?'이미 재도전 효과가 활성화되어 있습니다.'
      :card.id==='upgrade'&&p.upgradeDiscount?'이미 강화할인 효과가 활성화되어 있습니다.'
      :card.id==='buyout'&&p.buyoutDiscount?'이미 인수할인 효과가 활성화되어 있습니다.'
      :card.id==='boost'&&p.boost?'이미 영향력 x2 효과가 활성화되어 있습니다.'
      :'';
    const icon=CARD_ICONS[card.id]||'★';
    const bodyHtml=`<span class="pm-card-confirm-icon" aria-hidden="true">${icon}</span><strong class="pm-card-confirm-name">${card.name}</strong><span class="pm-card-confirm-desc">${card.desc}</span>${activeReason?`<em class="pm-card-confirm-reason">${activeReason}</em>`:''}`;
    const options=activeReason
      ? [['확인','cancel',false],['사용하기','use',true]]
      : [['사용하기','use',false],['취소','cancel',false]];
    const choice=await ask('전략카드',bodyHtml,options);
    if(choice!=='use')return;
    // Card is consumed only after explicit confirmation.
    if(card.id==='shield')p.shield=true;
    if(card.id==='reroll')p.reroll=true;
    if(card.id==='upgrade')p.upgradeDiscount=true;
    if(card.id==='buyout')p.buyoutDiscount=true;
    if(card.id==='boost')p.boost=true;
    p.cards.splice(index,1);
    render();
    showToast(`${card.name} 사용`);
    if(card.id==='teleport')await resolveTour(pi);
  }
  function autoUseAiCard(pi){const p=state.players[pi];if(!p.cards.length)return;const card=p.cards[0];if(card.id==='shield')p.shield=true;else if(card.id==='upgrade')p.upgradeDiscount=true;else if(card.id==='buyout')p.buyoutDiscount=true;else if(card.id==='boost')p.boost=true;else if(card.id==='reroll')p.reroll=true;else return;p.cards.shift();}

  async function takeCash(pi,amount,label){const p=state.players[pi];if(p.shield){p.shield=false;showToast(`${p.name} 방어권 사용 · ${label} 면제`);return;}p.cash-=amount;audio.play('loss');showToast(`${label} · ${p.name} 민심 -${amount.toLocaleString('ko-KR')}`);if(p.cash<=0)endGame(1-pi);}
  async function transferCash(from,to,amount,label){const a=state.players[from],b=state.players[to];a.cash-=amount;b.cash+=amount;audio.play('loss');showToast(`${label} · ${a.name} -${amount.toLocaleString()} / ${b.name} +${amount.toLocaleString()}`);if(a.cash<=0)endGame(to);}
  function endGame(winner){state.gameOver=true;showToast(`${state.players[winner].name} 승리`);reaction(winner,'win');}

  function hasNetwork(owner,group){const groupTiles=TILE_RULES.filter(t=>t.type==='property'&&t.group===group);return groupTiles.length>=2&&groupTiles.every(t=>state.props[t.i]?.owner===owner);}
  function portfolioValue(pi){return Object.values(state.props).filter(p=>p.owner===pi).reduce((s,p)=>s+p.invested,0);}
  function salaryForLap(lap){return lap===1?1000:lap===2?1200:lap===3?1400:1500;}

  function ask(head,html,opts){
    return new Promise(resolve=>{
      kicker.textContent='JCS POLIMARBLE';title.textContent=head;body.innerHTML=html;
      actions.innerHTML=opts.map(([label,value,disabled],i)=>`<button type="button" class="pm-action-btn${i===0?' is-primary':''}" data-value="${String(value)}"${disabled?' disabled aria-disabled="true"':''}>${label}</button>`).join('');
      modal.setAttribute('aria-hidden','false');modal.classList.add('is-visible');
      const handler=ev=>{const b=ev.target.closest('[data-value]');if(!b||b.disabled)return;actions.removeEventListener('click',handler);modal.classList.remove('is-visible');modal.setAttribute('aria-hidden','true');let v=b.dataset.value;if(v==='true')v=true;else if(v==='false')v=false;else if(/^\d+$/.test(v))v=Number(v);resolve(v);};
      actions.addEventListener('click',handler);
    });
  }

  let toastTimer=0;
  function showToast(msg){clearTimeout(toastTimer);toast.textContent=msg;toast.classList.add('is-visible');toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),1800);}
  function reaction(pi,type){if(pi!==0)return;const box=root.querySelector('[data-pm-character-reaction]'),img=root.querySelector('[data-pm-character-reaction-image]');if(!box||!img)return;const src={win:'male2-win.png',fail:'male2-fail.png',emotion:'male2-emotion.png'}[type]||'male2-emotion.png';img.src=`/assets/polimable/characters/male2/${src}`;box.setAttribute('aria-hidden','false');box.classList.add('is-visible');setTimeout(()=>{box.classList.remove('is-visible');box.setAttribute('aria-hidden','true');},1050);}
  return {init,state};
}

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fairDie(){if(globalThis.crypto?.getRandomValues){const a=new Uint8Array(1);let x=255;while(x>=252){globalThis.crypto.getRandomValues(a);x=a[0];}return x%6+1;}return Math.floor(Math.random()*6)+1;}
function setDieFace(el,value){const face=Math.max(1,Math.min(6,Number(value)||1));el.dataset.face=String(face);el.setAttribute('aria-label',`주사위 ${face}`);}
