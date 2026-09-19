import {POLIMARBLE_BOARD as BOARD,POLIMARBLE_CARDS as CARDS} from '../core/polimable-data.js?v=0.0.31.206';

const DICE_FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
const STEP_MS=265;
const SESSION_KEY='jcs:polimable:active-session';
const contexts=new WeakMap();
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const number=value=>Number(value||0).toLocaleString('ko-KR');
const saveSession=id=>{try{id?sessionStorage.setItem(SESSION_KEY,id):sessionStorage.removeItem(SESSION_KEY);}catch{}};
const loadSession=()=>{try{return sessionStorage.getItem(SESSION_KEY)||'';}catch{return '';}};
const errorMessage=code=>({
  LOGIN_REQUIRED:'로그인 후 플레이할 수 있습니다.',
  GAME_SESSION_NOT_FOUND:'이전 게임이 만료되었습니다. 새 게임을 시작해 주세요.',
  GAME_SESSION_FORBIDDEN:'현재 계정의 게임이 아닙니다.',
  CHOICE_REQUIRED:'먼저 운명의 선택을 완료해 주세요.',
  CARD_NOT_OWNED:'보유하지 않은 카드입니다.',
  GAME_NOT_ACTIVE:'새 게임을 시작해 주세요.',
  NO_PENDING_CHOICE:'선택할 이벤트가 없습니다.'
})[code]||'잠시 후 다시 시도해 주세요.';

function setPlayerToTile(root,index,{moving=false,react=false}={}){
  const player=root.querySelector('[data-pm-player]');
  const tile=root.querySelector(`[data-pm-tile="${index}"]`);
  if(!player||!tile)return null;
  const x=Number(tile.dataset.pmCx),y=Number(tile.dataset.pmCy);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  for(const cell of root.querySelectorAll('.pm-board-tile.is-stepping'))cell.classList.remove('is-stepping');
  player.style.left=`${x}%`;
  player.style.top=`${y}%`;
  player.dataset.pmPosition=String(index);
  player.classList.toggle('is-moving',moving);
  if(react){void tile.offsetWidth;tile.classList.add('is-stepping');}
  return tile;
}

function statusTextFromState(state){
  const events=Array.isArray(state?.lastEvents)?state.lastEvents:[];
  const last=events[events.length-1];
  if(!last)return '다음 주사위를 굴려보세요.';
  return `${last.title}${last.message?` · ${last.message}`:''}`;
}

function effectText(state){
  const e=state?.effects||{};
  return [
    e.shieldCharges?`🛡${e.shieldCharges}`:'',
    e.favorPassTurns?`⭐${e.favorPassTurns}`:'',
    e.doubleGainTurns?`×2 ${e.doubleGainTurns}`:'',
    e.halfLossTurns?`½ ${e.halfLossTurns}`:'',
    e.bonusDice?`🎲+${e.bonusDice}`:'',
    e.recordInsuranceRatio?`📜${Math.round(e.recordInsuranceRatio*100)}%`:'',
    e.doubleOrNothingTurns?`⚡${e.doubleOrNothingTurns}`:''
  ].filter(Boolean).join(' · ');
}

function updateCards(root,state,busy=false){
  const cards=Array.isArray(state?.cards)?state.cards:[];
  const slots=[...root.querySelectorAll('[data-pm-card-slot]')];
  slots.forEach((button,index)=>{
    const id=cards[index],card=id?CARDS[id]:null;
    button.dataset.pmCardId=id||'';
    button.disabled=!card||busy||state?.status!=='playing'||!!state?.pendingChoice;
    button.classList.toggle('has-card',!!card);
    const icon=button.querySelector('.pm-live-card-icon'),title=button.querySelector('b'),small=button.querySelector('small');
    if(card){
      if(icon)icon.textContent=card.icon;
      if(title)title.textContent=card.shortLabel;
      if(small)small.textContent=card.rarity==='epic'?'EPIC':card.rarity==='rare'?'RARE':'CARD';
      button.setAttribute('aria-label',`${card.name} 사용: ${card.description}`);
      button.title=card.description;
    }else{
      if(icon)icon.textContent='✦';
      if(title)title.textContent='';
      if(small)small.textContent='';
      button.setAttribute('aria-label',`비어 있는 전략카드 슬롯 ${index+1}`);
      button.removeAttribute('title');
    }
  });
}

function updateRanking(root,leaderboard){
  const mount=root.querySelector('[data-pm-ranking]');
  if(!mount)return;
  const entries=leaderboard?.entries||[];
  mount.innerHTML=[0,1,2,3].map(i=>{
    const e=entries[i],rank=i+1;
    if(!e)return `<div class="pm-rank-row"><i>${rank===1?'♛':rank}</i><span></span><b></b></div>`;
    return `<div class="pm-rank-row${e.isMe?' is-me':''}"><i>${rank===1?'♛':rank}</i><span>${String(e.initials||'JCS').replace(/[<>&]/g,'')}</span><b>${number(e.score)}</b></div>`;
  }).join('');
}

function updateChoice(root,state){
  const modal=root.querySelector('[data-pm-choice-modal]');
  if(!modal)return;
  const choice=state?.pendingChoice;
  modal.hidden=!choice;
  if(!choice)return;
  const copy=modal.querySelector('[data-pm-choice-copy]');
  if(copy)copy.textContent=choice.description||'안전하게 갈지 승부수를 던질지 선택하세요.';
  const safe=modal.querySelector('[data-pm-choice="safe"]'),risk=modal.querySelector('[data-pm-choice="risk"]');
  if(safe)safe.textContent=choice.safeLabel||'안전하게';
  if(risk)risk.textContent=choice.riskLabel||'승부수';
}

function updateResultModal(root,state){
  const modal=root.querySelector('[data-pm-result-modal]');
  if(!modal)return;
  const over=state?.status==='game_over';
  modal.hidden=!over;
  if(!over)return;
  const recordable=Number(state?.insuredScore||0);
  const title=modal.querySelector('[data-pm-result-title]'),copy=modal.querySelector('[data-pm-result-copy]'),score=modal.querySelector('[data-pm-result-score]'),record=modal.querySelector('[data-pm-result-record]');
  if(title)title.textContent='GAME OVER';
  if(copy)copy.textContent=recordable?'기록 보험으로 남길 수 있는 점수입니다.':'민심 SCORE가 0이 되었습니다.';
  if(score)score.textContent=number(recordable);
  if(record)record.hidden=recordable<=0;
}

function updateMainAction(root,ctx){
  const button=root.querySelector('[data-pm-main-action]');
  const cashout=root.querySelector('[data-pm-cashout]');
  if(!button)return;
  const state=ctx.state,authenticated=!!ctx.session?.authenticated;
  if(!authenticated){button.textContent='로그인하고 시작';button.disabled=false;if(cashout)cashout.hidden=true;return;}
  if(!state){button.textContent='GAME START';button.disabled=ctx.busy;if(cashout)cashout.hidden=true;return;}
  if(state.status==='playing'){
    button.textContent=state.pendingChoice?'선택을 완료하세요':'🎲 주사위 굴리기';
    button.disabled=ctx.busy||!!state.pendingChoice;
    if(cashout){cashout.hidden=false;cashout.disabled=ctx.busy||!!state.pendingChoice;}
    return;
  }
  button.textContent='다시 시작';button.disabled=ctx.busy;
  if(cashout)cashout.hidden=true;
}

function paintState(root,ctx,{keepStatus=false}={}){
  const state=ctx.state;
  const score=root.querySelector('[data-pm-score]'),peak=root.querySelector('[data-pm-peak]'),stage=root.querySelector('[data-pm-stage]'),effects=root.querySelector('[data-pm-effects]'),status=root.querySelector('[data-pm-status]');
  if(score)score.textContent=number(state?.score??1000);
  if(peak)peak.textContent=number(state?.peakScore??1000);
  if(stage)stage.textContent=`STAGE ${state?.stage??1}`;
  if(effects)effects.textContent=effectText(state);
  if(status&&!keepStatus)status.textContent=state?statusTextFromState(state):(ctx.session?.authenticated?'GAME READY':'로그인 후 플레이할 수 있어요');
  updateCards(root,state,ctx.busy);
  updateChoice(root,state);
  updateResultModal(root,state);
  updateMainAction(root,ctx);
}

async function loadRanking(root,ctx,client){
  const result=await client.leaderboard('today').catch(()=>null);
  if(result?.ok){ctx.leaderboard=result.leaderboard;updateRanking(root,ctx.leaderboard);}
}


function vfxLayer(root){
  let layer=root.querySelector('.pm-vfx-layer');
  if(!layer){layer=document.createElement('div');layer.className='pm-vfx-layer';layer.setAttribute('aria-hidden','true');root.append(layer);}
  return layer;
}
function tileCenter(root,index){
  const tile=root.querySelector(`[data-pm-tile="${index}"]`);
  if(!tile)return {x:50,y:50};
  const x=Number(tile.dataset.pmCx),y=Number(tile.dataset.pmCy);
  return {x:Number.isFinite(x)?x:50,y:Number.isFinite(y)?y:50};
}
function eventDelta(state){
  const events=Array.isArray(state?.lastEvents)?state.lastEvents:[];
  const scoreEvent=[...events].reverse().find(event=>event?.type==='score'&&Number.isFinite(Number(event?.delta)));
  return scoreEvent?Number(scoreEvent.delta):0;
}
function finalEffectKind(state){
  const tile=BOARD?.[Number(state?.position||0)];
  if(!tile)return 'safe';
  if(['gain','bonus','start'].includes(tile.kind))return 'good';
  if(['loss','percent_loss'].includes(tile.kind))return 'bad';
  if(tile.kind==='strategy_card')return 'card';
  if(tile.kind==='public_card')return 'public';
  if(tile.kind==='choice')return 'choice';
  return 'safe';
}
function burstSymbols(kind){
  if(kind==='good')return ['★','✦','✨','★','✧','🎉'];
  if(kind==='bad')return ['💔','✕','⚡','●','💢','✕'];
  if(kind==='card')return ['🃏','✦','◆','✦','🃏','◆'];
  if(kind==='public')return ['💗','?','💬','💗','?','✦'];
  if(kind==='choice')return ['?','⚖','!','?','✦','!'];
  return ['✦','✨','✦','✨'];
}
function playFinalEffect(root,state){
  const kind=finalEffectKind(state);
  if(kind==='safe')return;
  const {x,y}=tileCenter(root,state?.position||0),layer=vfxLayer(root);
  const burst=document.createElement('div');
  burst.className=`pm-vfx-burst is-${kind}`;
  burst.style.setProperty('--pm-vfx-x',`${x}%`);
  burst.style.setProperty('--pm-vfx-y',`${y}%`);
  const shock=document.createElement('span');shock.className='pm-vfx-shock';burst.append(shock);
  const symbols=burstSymbols(kind);
  const dirs=[[-2.4,-2.4,-30],[0,-3.0,12],[2.35,-2.25,38],[-2.8,-.8,-70],[2.8,-.65,62],[-1.0,-3.25,100],[1.1,-3.35,-95]];
  for(let i=0;i<Math.min(7,symbols.length+1);i++){
    const p=document.createElement('span');p.className='pm-vfx-particle';p.textContent=symbols[i%symbols.length];
    const [dx,dy,rot]=dirs[i];p.style.setProperty('--dx',`${dx}cqw`);p.style.setProperty('--dy',`${dy}cqw`);p.style.setProperty('--rot',`${rot}deg`);p.style.animationDelay=`${i*24}ms`;burst.append(p);
  }
  const delta=eventDelta(state);
  if(delta){const score=document.createElement('strong');score.className='pm-vfx-score';score.textContent=`${delta>0?'+':''}${delta.toLocaleString('ko-KR')}`;burst.append(score);}
  layer.append(burst);
  if(kind==='bad'){root.classList.remove('is-bad-impact');void root.offsetWidth;root.classList.add('is-bad-impact');setTimeout(()=>root.classList.remove('is-bad-impact'),280);}
  setTimeout(()=>burst.remove(),950);
}
async function animateDiceThrow(root,dice){
  const result=root.querySelector('[data-pm-dice-result]');
  if(!result)return;
  result.classList.remove('is-rolling','is-settled','is-tossing');
  void result.offsetWidth;
  result.classList.add('is-tossing');
  const started=performance.now();
  while(performance.now()-started<760){
    const faces=dice.length>1?dice.map(()=>DICE_FACES[Math.floor(Math.random()*6)]):[DICE_FACES[Math.floor(Math.random()*6)]];
    result.textContent=faces.join(' ');
    await wait(72);
  }
  result.classList.remove('is-tossing');
  result.textContent=dice.map(n=>DICE_FACES[n-1]||String(n)).join(' ');
  void result.offsetWidth;
  result.classList.add('is-settled');
  await wait(220);
  result.classList.remove('is-settled');
  await wait(200);
}

async function animateMove(root,fromState,toState){
  const dice=Array.isArray(toState?.lastDice)?toState.lastDice:[];
  const distance=dice.reduce((sum,n)=>sum+Number(n||0),0);
  if(!distance)return;
  await animateDiceThrow(root,dice);
  let position=Number(fromState?.position||0);
  const player=root.querySelector('[data-pm-player]');
  for(let step=0;step<distance;step+=1){
    position=(position+1)%24;
    player?.classList.remove('is-moving','is-landing');
    if(player)void player.offsetWidth;
    const tile=setPlayerToTile(root,position,{moving:true,react:true});
    await wait(205);
    player?.classList.remove('is-moving');
    player?.classList.add('is-landing');
    await wait(60);
    player?.classList.remove('is-landing');
    tile?.classList.remove('is-stepping');
  }
  playFinalEffect(root,toState);
  await wait(420);
}

async function startGame(root,ctx,client){
  ctx.busy=true;paintState(root,ctx);
  const status=root.querySelector('[data-pm-status]');if(status)status.textContent='게임을 준비하고 있어요...';
  try{
    const result=await client.start();
    if(!result?.ok)throw new Error(result?.error||'REQUEST_FAILED');
    ctx.state=result.state;
    saveSession(ctx.state?.sessionId||'');
    setPlayerToTile(root,0,{react:true});
    const dice=root.querySelector('[data-pm-dice-result]');if(dice)dice.textContent='⚀';
  }catch(error){if(status)status.textContent=errorMessage(String(error?.message||''));}
  finally{ctx.busy=false;paintState(root,ctx);}
}

async function rollGame(root,ctx,client){
  if(!ctx.state||ctx.busy)return;
  const before=clone(ctx.state);
  ctx.busy=true;paintState(root,ctx,{keepStatus:true});
  const status=root.querySelector('[data-pm-status]');if(status)status.textContent='주사위를 굴리는 중...';
  try{
    const result=await client.roll(ctx.state.sessionId);
    if(!result?.ok)throw new Error(result?.error||'REQUEST_FAILED');
    await animateMove(root,before,result.state);
    ctx.state=result.state;
    saveSession(ctx.state?.sessionId||'');
  }catch(error){
    const code=String(error?.message||'');
    if(status)status.textContent=errorMessage(code);
    if(code==='GAME_SESSION_NOT_FOUND'){saveSession('');ctx.state=null;setPlayerToTile(root,0);}
  }finally{ctx.busy=false;paintState(root,ctx);}
}

async function resolveChoiceAction(root,ctx,client,option){
  if(!ctx.state||ctx.busy)return;
  ctx.busy=true;paintState(root,ctx,{keepStatus:true});
  try{
    const result=await client.choice(ctx.state.sessionId,option);
    if(!result?.ok)throw new Error(result?.error||'REQUEST_FAILED');
    ctx.state=result.state;
  }catch(error){const status=root.querySelector('[data-pm-status]');if(status)status.textContent=errorMessage(String(error?.message||''));}
  finally{ctx.busy=false;paintState(root,ctx);}
}

async function useCardAction(root,ctx,client,cardId){
  if(!ctx.state||ctx.busy||!cardId)return;
  ctx.busy=true;paintState(root,ctx,{keepStatus:true});
  try{
    const result=await client.card(ctx.state.sessionId,cardId);
    if(!result?.ok)throw new Error(result?.error||'REQUEST_FAILED');
    ctx.state=result.state;
  }catch(error){const status=root.querySelector('[data-pm-status]');if(status)status.textContent=errorMessage(String(error?.message||''));}
  finally{ctx.busy=false;paintState(root,ctx);}
}

async function cashOutAction(root,ctx,client){
  if(!ctx.state||ctx.busy)return;
  ctx.busy=true;paintState(root,ctx,{keepStatus:true});
  try{
    const result=await client.cashout(ctx.state.sessionId,ctx.state.initials||'JCS');
    if(!result?.ok)throw new Error(result?.error||'REQUEST_FAILED');
    ctx.state=result.state;
    if(ctx.state?.status==='game_over')ctx.state={...ctx.state,status:'cashed_out',finalScore:Number(result.recordedScore||0)};
    saveSession('');
    await loadRanking(root,ctx,client);
    const status=root.querySelector('[data-pm-status]');if(status)status.textContent=`${number(result.recordedScore)}점 기록 완료! 🏆`;
  }catch(error){const status=root.querySelector('[data-pm-status]');if(status)status.textContent=errorMessage(String(error?.message||''));}
  finally{ctx.busy=false;paintState(root,ctx,{keepStatus:true});}
}

export async function hydratePoliMarble(root,client,session){
  const mount=root.querySelector?.('[data-pm-root]');
  if(!mount)return;
  const ctx={session:session||{authenticated:false},state:null,leaderboard:null,busy:false};
  contexts.set(mount,ctx);
  setPlayerToTile(mount,0);
  await loadRanking(mount,ctx,client);
  if(ctx.session?.authenticated){
    const id=loadSession();
    if(id){
      const resumed=await client.resume(id).catch(()=>null);
      if(resumed?.ok&&resumed.state){ctx.state=resumed.state;setPlayerToTile(mount,ctx.state.position||0);}
      else saveSession('');
    }
  }
  paintState(mount,ctx);
}

export function bindPoliMarbleInteractions(root,{client,navigate}={}){
  if(root.__jcsPolimable209Bound)return;
  root.__jcsPolimable209Bound=true;
  root.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-pm-main-action],[data-pm-cashout],[data-pm-card-slot],[data-pm-choice],[data-pm-result-record],[data-pm-result-restart]');
    if(!button)return;
    const mount=button.closest('[data-pm-root]');
    if(!mount)return;
    const ctx=contexts.get(mount);
    if(!ctx)return;
    event.preventDefault();
    if(button.hasAttribute('data-pm-main-action')){
      if(!ctx.session?.authenticated){navigate?.('/login');return;}
      if(!ctx.state||ctx.state.status!=='playing'){void startGame(mount,ctx,client);return;}
      void rollGame(mount,ctx,client);return;
    }
    if(button.hasAttribute('data-pm-cashout')){void cashOutAction(mount,ctx,client);return;}
    if(button.hasAttribute('data-pm-card-slot')){void useCardAction(mount,ctx,client,button.dataset.pmCardId||'');return;}
    if(button.hasAttribute('data-pm-choice')){void resolveChoiceAction(mount,ctx,client,button.dataset.pmChoice);return;}
    if(button.hasAttribute('data-pm-result-record')){void cashOutAction(mount,ctx,client);return;}
    if(button.hasAttribute('data-pm-result-restart')){mount.querySelector('[data-pm-result-modal]').hidden=true;void startGame(mount,ctx,client);}
  });
}
