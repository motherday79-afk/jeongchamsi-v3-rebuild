import {mountGameMotion,setCubeFace} from './polimable-motion.js?v=0.0.31.260';
import {stepTiming} from '../core/polimable-motion.js?v=0.0.31.260';
import {tileName,escapeText} from '../core/polimable-tile-design.js';
import {mountHudEditor} from './polimable-hud-editor.js?v=0.0.31.260';
import {POLIMARBLE_MOVE_ANCHORS as MOVE_ANCHORS,POLIMARBLE_TOKEN_POINTS as TOKEN_POINTS,POLIMARBLE_PROPERTY_OBJECT_POINTS as OBJECT_POINTS} from '../core/polimable-layout.js?v=0.0.31.251';
import {createPoliMarbleAudio} from '../core/polimable-audio.js?v=0.0.31.245';
import {calculatePoliMarbleStage} from '../core/polimable-viewport.js?v=0.0.31.251';

const START_CASH=10000;
const MAX_CARDS=4;
const RENT_RATE=[0,.40,.80,1.50,2.50];
const UPGRADE_RATE=[0,0,.60,.90,1.20];
const TRACK_LEN=MOVE_ANCHORS.length; // exact 32-position diamond board

const DEFAULT_TILE_RULES=[
  {i:0,type:'start',name:'START'},
  {i:1,type:'property',name:'임팩트G',group:'ngo',price:750},
  {i:2,type:'property',name:'굿파트너스',group:'ngo',price:900},
  {i:3,type:'property',name:'핀임팩트',group:'ngo',price:1050},
  {i:4,type:'card',name:'전략카드'},
  {i:5,type:'property',name:'휴먼링크',group:'ngo',price:1200},
  {i:6,type:'property',name:'인브릿지',group:'ngo',price:1400},
  {i:7,type:'property',name:'온케어',group:'ngo',price:1600},
  {i:8,type:'hope',name:'희망의 재단'},
  {i:9,type:'property',name:'키워크',group:'civic',price:600},
  {i:10,type:'property',name:'시트너스',group:'civic',price:750},
  {i:11,type:'property',name:'컴웨이',group:'civic',price:900},
  {i:12,type:'card',name:'전략카드'},
  {i:13,type:'property',name:'퍼브릿지',group:'civic',price:1100},
  {i:14,type:'property',name:'시민링크',group:'civic',price:1300},
  {i:15,type:'property',name:'로컬온',group:'civic',price:1500},
  {i:16,type:'fate20',name:'운명의 선택'},
  {i:17,type:'property',name:'JCS RS',group:'policy',price:1300},
  {i:18,type:'property',name:'JCS TV',group:'policy',price:1500},
  {i:19,type:'property',name:'E퍼블릭',group:'policy',price:1700},
  {i:20,type:'card',name:'전략카드'},
  {i:21,type:'property',name:'폴리시빅',group:'policy',price:1900},
  {i:22,type:'property',name:'넥스트랩',group:'policy',price:2150},
  {i:23,type:'property',name:'폴리피아',group:'policy',price:2400},
  {i:24,type:'desire',name:'욕망의 굴레'},
  {i:25,type:'property',name:'MBU',group:'media',price:2000},
  {i:26,type:'property',name:'KCA',group:'media',price:1750},
  {i:27,type:'property',name:'BCS',group:'media',price:1500},
  {i:28,type:'card',name:'전략카드'},
  {i:29,type:'property',name:'웨이브',group:'media',price:1300},
  {i:30,type:'property',name:'프레스윈',group:'media',price:1100},
  {i:31,type:'property',name:'온데일리',group:'media',price:900}
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
  let wasLandscape=false;

  const clearViewportStyles=()=>{
    for(const prop of ['position','left','top','width','height','right','bottom'])page.style.removeProperty(prop);
    document.documentElement.classList.remove('pm-polimable-mobile-lock');
    document.body?.classList.remove('pm-polimable-mobile-lock');
  };

  const sync=()=>{
    if(root.dataset.pmHudEditing==='1')return;
    if(!root.isConnected){
      clearViewportStyles();
      return;
    }
    const vv=window.visualViewport;
    const vw=Math.max(1,vv?.width||window.innerWidth||document.documentElement.clientWidth||1);
    const vh=Math.max(1,vv?.height||window.innerHeight||document.documentElement.clientHeight||1);
    const offsetLeft=Math.max(0,vv?.offsetLeft||0);
    const offsetTop=Math.max(0,vv?.offsetTop||0);
    const mobile=Boolean(coarse?.matches) && Math.min(vw,vh)<=1200;
    const portrait=mobile&&vh>vw;
    const landscape=mobile&&!portrait;

    page.classList.toggle('pm-mobile-fit',mobile);
    page.classList.toggle('pm-portrait-mode',portrait);
    page.classList.toggle('pm-landscape-fullscreen',landscape);

    if(!mobile){
      clearViewportStyles();
      root.style.removeProperty('width');
      root.style.removeProperty('height');
      root.style.removeProperty('--pm-stage-scale');
      root.removeAttribute('data-pm-fit-mode');
      wasLandscape=false;
      return;
    }

    // The polimable route becomes a true visual-viewport screen on mobile.
    // This prevents the game from living lower in the normal document and removes any need to scroll.
    page.style.position='fixed';
    page.style.left=`${offsetLeft}px`;
    page.style.top=`${offsetTop}px`;
    page.style.width=`${vw}px`;
    page.style.height=`${vh}px`;
    page.style.right='auto';
    page.style.bottom='auto';
    document.documentElement.classList.add('pm-polimable-mobile-lock');
    document.body?.classList.add('pm-polimable-mobile-lock');

    if(landscape&&!wasLandscape){
      try{window.scrollTo({left:0,top:0,behavior:'instant'});}catch{window.scrollTo(0,0);}
    }
    wasLandscape=landscape;

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
      const safeScale=Math.max(.05,Math.min(1,vw/1672,vh/941));
      root.style.width=`${1672*safeScale}px`;
      root.style.height=`${941*safeScale}px`;
      root.dataset.pmFitMode='fallback-fit';
      root.style.setProperty('--pm-stage-scale',String(safeScale));
      console.error('[PoliMarble] responsive stage fallback',error);
    }
  };

  const deferredSync=()=>{
    sync();
    window.setTimeout(sync,80);
    window.setTimeout(sync,240);
  };

  sync();
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',deferredSync,{passive:true});
  window.visualViewport?.addEventListener('resize',sync,{passive:true});
  window.visualViewport?.addEventListener('scroll',sync,{passive:true});
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
  void mountHudEditor(root);
}

function createGame(root){
  const TILE_RULES=DEFAULT_TILE_RULES.map(t=>({...t,get name(){return tileName(root._pmSceneLayout,t.i);}}));
  const token1=root.querySelector('[data-pm-character-token="0"]');
  const token1Img=root.querySelector('[data-pm-character-token-image="0"]');
  const token2=root.querySelector('[data-pm-character-token="1"]');
  const token2Img=root.querySelector('[data-pm-character-token-image="1"]');
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
  const audio=createPoliMarbleAudio(root);const motion=mountGameMotion(root);

  const state={
    turn:0,rolling:false,gameOver:false,
    players:[
      {name:'JCS 유저',cash:START_CASH,pos:0,laps:0,cards:[],shield:false,upgradeDiscount:false,buyoutDiscount:false,boost:false,reroll:false,trappedTurns:0},
      {name:'AI 시민',cash:START_CASH,pos:0,laps:0,cards:[],shield:false,upgradeDiscount:false,buyoutDiscount:false,boost:false,reroll:false,trappedTurns:0}
    ],
    props:{},
    pot:0,
    hopeWaiting:false
  };

  let layoutEditing=false;
  function canLayoutEdit(){return !state.rolling&&(state.turn===0||state.gameOver)&&!modal.classList.contains('is-visible');}
  function setLayoutEditing(on){if(on&&!canLayoutEdit())return false;layoutEditing=Boolean(on);if(on)motion.stop();render();return true;}

  function init(){
    audio.init();
    if(new URLSearchParams(globalThis.location?.search||'').get('pmdebug')==='1')root.classList.add('pm-object-debug');
    placeToken(0,0,true);placeToken(1,0,true);render();
    button?.addEventListener('click',()=>{ if(!layoutEditing&&state.turn===0&&!state.rolling&&!state.gameOver) runTurn(0); });
    root.querySelector('[data-pm-strategy-slots]')?.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-card-index]'); if(!b||layoutEditing||state.turn!==0||state.rolling) return;
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
      if(button) button.disabled=layoutEditing||state.turn!==0||state.rolling||state.gameOver;
    }catch(error){console.error('[POLIMARBLE 31.251] base HUD render failed',error);}
    motion.turn(state.turn);safeUiRender(renderCards,'strategy-cards');
    safeUiRender(renderRanking,'today-ranking');
    safeUiRender(renderOwnership,'ownership-markers');
    root.dispatchEvent(new CustomEvent('polimable:hud-update'));
  }

  function safeUiRender(fn,label){
    try{fn();}catch(error){console.error(`[POLIMARBLE 31.251] ${label} render failed`,error);}
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
    const objects=[];
    for(const [idxStr,prop] of Object.entries(state.props)){
      const idx=Number(idxStr),tile=TILE_RULES[idx],base=OBJECT_POINTS[idx],slot=prop.level<=1?'flag':`building${Math.min(3,prop.level-1)}`,custom=root._pmSceneLayout?.items?.[`tile.${idx}.${slot}`],point=custom?{...base,...custom}:base;
      if(!tile||tile.type!=='property'||!point)continue;
      let src='',kind='',label='';
      if(prop.level<=1){
        src=prop.owner===0?'/assets/polimable/objects/flag-p1.png':'/assets/polimable/objects/flag-p2.png';
        kind='flag'; label=`${prop.owner===0?'1P':'2P'} 소유 ${tile.name}`;
      }else if(prop.level===2){
        src='/assets/polimable/objects/building-1.png';kind='building-1';label=`${tile.name} 강화 1단계`;
      }else if(prop.level===3){
        src='/assets/polimable/objects/building-2.png';kind='building-2';label=`${tile.name} 강화 2단계`;
      }else{
        src='/assets/polimable/objects/building-3.png';kind='building-3';label=`${tile.name} 강화 3단계 · 고정자산`;
      }
      objects.push(`<div class="pm-property-state-object is-${kind} side-${point.side}" data-pm-property-object="${idx}" style="left:${point.x}px;top:${point.y}px;${custom?`width:${custom.w}px!important;height:${custom.h}px!important;${custom.hidden?'display:none!important;':''}`:''}" aria-label="${escapeText(label)}"><img src="${src}" alt=""></div>`);
    }
    layer.innerHTML=objects.join('');motion.ownership(state.props);
  }

  async function runTurn(playerIndex){
    if(layoutEditing||state.rolling||state.gameOver)return;
    state.rolling=true;render();
    const dice=await animateDice();
    const total=dice[0]+dice[1]; const dbl=dice[0]===dice[1];
    showDiceResult(dice,total,dbl);
    await wait(420);
    flight.setAttribute('aria-hidden','true');flight.classList.remove('is-landed');
    const activePlayer=state.players[playerIndex];
    if(activePlayer.trappedTurns>0&&!dbl){
      activePlayer.trappedTurns=Math.max(0,activePlayer.trappedTurns-1);
      showToast(`${activePlayer.name} · ${TILE_RULES[24].name} ${activePlayer.trappedTurns}턴 남음`);
    }else{
      if(activePlayer.trappedTurns>0&&dbl){activePlayer.trappedTurns=0;showToast(`${activePlayer.name} DOUBLE · ${TILE_RULES[24].name} 탈출`);}
      await moveBy(playerIndex,total);
      await resolveTile(playerIndex);
    }
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
    while(performance.now()-started<(motion.reduced()?100:880)){setDieFace(flightDice[0],fairDie());setDieFace(flightDice[1],fairDie());await wait(68);}
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
      if(prev===TRACK_LEN-1&&p.pos===0){p.laps++;const salary=salaryForLap(p.laps);p.cash+=salary;audio.play('start');showToast(`${p.name} ${TILE_RULES[0].name} 통과 · 민심 +${salary.toLocaleString('ko-KR')}`);render();}
      placeToken(playerIndex,p.pos,false);motion.hop(playerIndex);audio.play('step');await wait(stepTiming.travel);motion.press(p.pos,playerIndex,s===steps-1);await wait(s===steps-1?stepTiming.landing:stepTiming.contact);
    }
    setMovingVisual(playerIndex,false); audio.play('land'); await wait(100);render();
  }

  function placeToken(playerIndex,index,instant=false){
    const p=state.players[playerIndex];
    if(p)p.pos=index%TRACK_LEN;
    placeAllTokens(instant);
  }

  function placeAllTokens(instant=false){
    const same=state.players[0].pos===state.players[1].pos;
    placeOneToken(0,state.players[0].pos,same?'p1':'solo',instant);
    placeOneToken(1,state.players[1].pos,same?'p2':'solo',instant);
  }

  function placeOneToken(playerIndex,index,slot='solo',instant=false){
    const placement=TOKEN_POINTS[index%TRACK_LEN];
    const custom=root._pmSceneLayout?.items?.[`tile.${index%TRACK_LEN}.${slot}`],point=custom||placement?.[slot]||placement?.solo;
    const token=playerIndex===0?token1:token2;
    if(!token||!point)return;
    if(custom){token.style.setProperty('width',custom.w+'px','important');token.style.setProperty('height',custom.h+'px','important');token.style.setProperty('visibility',custom.hidden?'hidden':'visible');}token.classList.toggle('is-instant',instant);
    token.style.setProperty('--pm-token-x',`${point.x}px`);
    token.style.setProperty('--pm-token-y',`${point.y}px`);
    token.dataset.pmTile=String(index%TRACK_LEN);
    token.dataset.pmSlot=slot;
    if(instant)requestAnimationFrame(()=>token.classList.remove('is-instant'));
  }

  function setMovingVisual(playerIndex,on){
    const token=playerIndex===0?token1:token2;
    const img=playerIndex===0?token1Img:token2Img;
    if(img)img.src=playerIndex===0?'/assets/polimable/characters/player1/token-257.png':'/assets/polimable/characters/player2/token-257.png';
    token?.classList.toggle('pm-is-walking',on);
  }

  async function resolveTile(playerIndex){
    const p=state.players[playerIndex],tile=TILE_RULES[p.pos]||{type:'noop',name:`칸 ${p.pos}`};
    if(tile.type==='start'){showToast(`${p.name} ${TILE_RULES[0].name} 도착`);return;}
    if(tile.type==='gain'||tile.type==='plaza'){p.cash+=tile.amount;audio.play('gain');showToast(`${tile.name} · 민심 +${tile.amount.toLocaleString('ko-KR')}`);reaction(playerIndex,'win');render();return;}
    if(tile.type==='loss'){await takeCash(playerIndex,tile.amount,tile.name);reaction(playerIndex,'fail');render();return;}
    if(tile.type==='issue'){const amount=[-700,-400,400,700][Math.floor(Math.random()*4)];if(amount>=0){p.cash+=amount;audio.play('gain');showToast(`긴급이슈 반전 · 민심 +${amount}`);reaction(playerIndex,'emotion');}else{await takeCash(playerIndex,-amount,'긴급이슈');reaction(playerIndex,'fail');}render();return;}
    if(tile.type==='card'){await drawCard(playerIndex);render();return;}
    if(tile.type==='hope'){await resolveHope(playerIndex);render();return;}
    if(tile.type==='fate20'){await resolveFate20(playerIndex);render();return;}
    if(tile.type==='desire'){state.players[playerIndex].trappedTurns=2;showToast(`${state.players[playerIndex].name} · ${TILE_RULES[24].name} 2턴`);reaction(playerIndex,'fail');render();return;}
    if(tile.type==='fate'){await resolveFate(playerIndex);render();return;}
    if(tile.type==='tour'){await resolveTour(playerIndex);render();return;}
    if(tile.type==='property'){await resolveProperty(playerIndex,tile);render();return;}
  }

  async function resolveProperty(playerIndex,tile){
    const prop=state.props[tile.i],p=state.players[playerIndex];
    if(!prop){
      if(playerIndex===1){if(p.cash>=tile.price*1.8){buyProperty(playerIndex,tile);}else showToast(`AI가 ${tile.name} 구매를 보류했습니다.`);return;}
      const ok=await ask(`영향력 거점`,`<b>${escapeText(tile.name)}</b><br>민심 ${tile.price.toLocaleString('ko-KR')}을 사용해 확보하시겠습니까?`,[['구매',true],['지나가기',false]]);
      if(ok)buyProperty(playerIndex,tile);return;
    }
    if(prop.owner===playerIndex){
      const maxLevel=Math.min(4,p.laps+1);
      const upCost=upgradeCost(tile,prop,p);
      if(playerIndex===1){if(prop.level<maxLevel&&p.cash>=upCost*2)upgradeProperty(playerIndex,tile,prop);return;}
      const options=[];
      if(prop.level<maxLevel)options.push([`강화 ${Math.max(1,prop.level)}단계 · ${upCost.toLocaleString()}`, 'upgrade']);
      options.push([`매각 ${sellValue(tile,prop).toLocaleString()}`,'sell'],['그대로','skip']);
      const currentLabel=prop.level===1?'소유':prop.level>=4?'고정자산':`강화 ${prop.level-1}단계`;
      const choice=await ask(`내 거점 · ${tile.name}`,`현재 ${currentLabel} · 투자 ${prop.invested.toLocaleString('ko-KR')} 민심`,options);
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
    if(p.cash>=buyout){const ok=await ask(`거점 인수`,`민심 ${buyout.toLocaleString('ko-KR')}으로 <b>${escapeText(tile.name)}</b>을 인수하시겠습니까?`,[['인수',true],['아니오',false]]);if(ok){p.buyoutDiscount=false;transferOwnership(playerIndex,tile,prop,buyout);}}
  }

  function buyProperty(pi,tile){const p=state.players[pi];if(p.cash<tile.price){showToast('민심이 부족합니다.');return;}p.cash-=tile.price;state.props[tile.i]={owner:pi,level:1,invested:tile.price};audio.play('purchase');showToast(`${p.name} · ${tile.name} 영향력 확보`);reaction(pi,'win');}
  function upgradeProperty(pi,tile,prop){
    const p=state.players[pi],cost=upgradeCost(tile,prop,p);
    if(p.cash<cost)return;
    p.cash-=cost;prop.level++;prop.invested+=cost;p.upgradeDiscount=false;audio.play('purchase');
    const stage=Math.max(1,prop.level-1);
    showToast(`${tile.name} 강화 ${stage}단계`);
    if(prop.level>=4)showFixedAssetEffect(); else reaction(pi,'win');
  }
  function showFixedAssetEffect(){
    const box=root.querySelector('[data-pm-fixed-asset-effect]');if(!box)return;
    box.setAttribute('aria-hidden','false');box.classList.remove('is-visible');void box.offsetWidth;box.classList.add('is-visible');
    setTimeout(()=>{box.classList.remove('is-visible');box.setAttribute('aria-hidden','true');},1500);
  }
  function sellProperty(pi,tile,prop){const value=sellValue(tile,prop);state.players[pi].cash+=value;delete state.props[tile.i];audio.play('gain');showToast(`${tile.name} 매각 · 민심 +${value.toLocaleString('ko-KR')}`);}
  function transferOwnership(pi,tile,prop,cost){const old=prop.owner;state.players[pi].cash-=cost;state.players[old].cash+=cost;prop.owner=pi;audio.play('purchase');showToast(`${state.players[pi].name}이 ${tile.name} 인수`);reaction(pi,'win');}
  function upgradeCost(tile,prop,p){let c=Math.round(tile.price*UPGRADE_RATE[prop.level+1]);if(p.upgradeDiscount)c=Math.round(c*.5);return c;}
  function sellValue(tile,prop){return Math.round(prop.invested*.70);}

  async function resolveHope(pi){
    const p=state.players[pi];
    if(!state.hopeWaiting){
      const donation=Math.max(1,Math.round(p.cash*.10));
      p.cash-=donation;state.pot=donation;state.hopeWaiting=true;
      audio.play('loss');showToast(`${TILE_RULES[8].name} · ${p.name} 민심 ${donation.toLocaleString('ko-KR')} 기부`);reaction(pi,'emotion');
      if(p.cash<=0)endGame(1-pi);return;
    }
    const reward=state.pot;state.pot=0;state.hopeWaiting=false;p.cash+=reward;
    audio.play('gain');showToast(`${TILE_RULES[8].name} · ${p.name} 기부 민심 +${reward.toLocaleString('ko-KR')}`);reaction(pi,'win');
  }

  async function resolveFate20(pi){
    const p=state.players[pi],amount=Math.max(1,Math.round(p.cash*.20));
    if(Math.random()<.5){p.cash+=amount;audio.play('gain');showToast(`운명의 선택 성공 · 민심 +${amount.toLocaleString('ko-KR')}`);reaction(pi,'win');}
    else{await takeCash(pi,amount,'운명의 선택');reaction(pi,'fail');}
  }

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
  async function moveDirect(pi,target){state.players[pi].pos=target;placeToken(pi,target,false);motion.hop(pi);await wait(stepTiming.travel);motion.press(target,pi,true);await wait(stepTiming.landing);}

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
    p.cards.push(card);await motion.reveal(card,CARD_ICONS[card.id]||'★');showToast(`${p.name} 전략카드 획득 · ${card.name}`);reaction(pi,'surprise');
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

  async function takeCash(pi,amount,label){const p=state.players[pi];if(p.shield){p.shield=false;showToast(`${p.name} 방어권 사용 · ${label} 면제`);return;}p.cash-=amount;audio.play('loss');showToast(`${label} · ${p.name} 민심 -${amount.toLocaleString('ko-KR')}`);reaction(pi,'sad');if(p.cash<=0)endGame(1-pi);}
  async function transferCash(from,to,amount,label){const a=state.players[from],b=state.players[to];a.cash-=amount;b.cash+=amount;audio.play('loss');showToast(`${label} · ${a.name} -${amount.toLocaleString()} / ${b.name} +${amount.toLocaleString()}`);reaction(from,'angry');if(a.cash<=0)endGame(to);}
  function endGame(winner){state.gameOver=true;showToast(`${state.players[winner].name} 승리`);reaction(winner,'win');}

  function hasNetwork(owner,group){const groupTiles=TILE_RULES.filter(t=>t.type==='property'&&t.group===group);return groupTiles.length>=2&&groupTiles.every(t=>state.props[t.i]?.owner===owner);}
  function portfolioValue(pi){return Object.values(state.props).filter(p=>p.owner===pi).reduce((s,p)=>s+p.invested,0);}
  function salaryForLap(lap){return lap===1?1000:lap===2?1200:lap===3?1400:1500;}

  function ask(head,html,opts){
    return new Promise(resolve=>{
      kicker.textContent='JCS POLIMARBLE';title.textContent=head;body.innerHTML=html;
      actions.innerHTML=opts.map(([label,value,disabled],i)=>`<button type="button" class="pm-action-btn${i===0?' is-primary':''}" data-value="${String(value)}"${disabled?' disabled aria-disabled="true"':''}>${escapeText(label)}</button>`).join('');
      modal.setAttribute('aria-hidden','false');modal.classList.add('is-visible');
      const handler=ev=>{const b=ev.target.closest('[data-value]');if(!b||b.disabled)return;actions.removeEventListener('click',handler);modal.classList.remove('is-visible');modal.setAttribute('aria-hidden','true');let v=b.dataset.value;if(v==='true')v=true;else if(v==='false')v=false;else if(/^\d+$/.test(v))v=Number(v);resolve(v);};
      actions.addEventListener('click',handler);
    });
  }

  let toastTimer=0;
  function showToast(msg){clearTimeout(toastTimer);toast.textContent=msg;toast.classList.add('is-visible');toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),1800);}
  function reaction(pi,type){motion.react(pi,type);
    const box=root.querySelector(`[data-pm-character-reaction="${pi}"]`);
    const img=root.querySelector(`[data-pm-character-reaction-image="${pi}"]`);
    if(!box||!img)return;
    const fileMap={happy:'happy.png',win:'win.png',surprise:'surprise.png',angry:'angry.png',sad:'sad.png',fail:'sad.png',emotion:'happy.png'};
    const folder=pi===0?'player1':'player2';
    img.src=`/assets/polimable/characters/${folder}/${fileMap[type]||'happy.png'}`;
    box.setAttribute('aria-hidden','false');box.classList.remove('is-visible');void box.offsetWidth;box.classList.add('is-visible');
    setTimeout(()=>{box.classList.remove('is-visible');box.setAttribute('aria-hidden','true');},1100);
  }

  return {init,state,canLayoutEdit,setLayoutEditing,refreshLayout(){placeAllTokens(true);renderOwnership();}};
}

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fairDie(){if(globalThis.crypto?.getRandomValues){const a=new Uint8Array(1);let x=255;while(x>=252){globalThis.crypto.getRandomValues(a);x=a[0];}return x%6+1;}return Math.floor(Math.random()*6)+1;}
function setDieFace(el,value){const face=Math.max(1,Math.min(6,Number(value)||1));el.dataset.face=String(face);setCubeFace(el,face);el.setAttribute('aria-label',`주사위 ${face}`);}
