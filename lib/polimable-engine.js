import {POLIMARBLE_BOARD as BOARD,POLIMARBLE_CARDS as STRATEGY_CARDS,POLIMARBLE_INFLUENCE_RATIO as INFLUENCE,POLIMARBLE_UPGRADE_RATIO as UPGRADE,POLIMARBLE_START_BONUS as START_BONUS} from '../src/core/polimable-data.js';

const BOARD_SIZE=BOARD.length,START_SCORE=10000;
const CARD_POOL=['SHIELD','SHIELD','FAVOR_PASS','FAVOR_PASS','HALF_LOSS','HALF_LOSS','DOUBLE_GAIN','BONUS_MOVE','RECORD_INSURANCE'];
const PUBLIC_EVENTS=[
 {title:'시민 응원',message:'현장 공감이 확산됐습니다.',delta:700},{title:'정책 공감',message:'정책 메시지가 좋은 반응을 얻었습니다.',delta:500},{title:'지역 호응',message:'지역 네트워크의 반응이 좋아졌습니다.',delta:350},
 {title:'관심 분산',message:'관심이 다른 이슈로 이동했습니다.',delta:-350},{title:'소통 엇박자',message:'메시지 전달 과정에서 혼선이 생겼습니다.',delta:-550},{title:'돌발 변수',message:'예상하지 못한 변수가 발생했습니다.',delta:-800}
];
const clone=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));
const drawCard=rng=>CARD_POOL[rng.int(0,CARD_POOL.length-1)];
export {BOARD,STRATEGY_CARDS};
export const normalizeInitials=value=>String(value||'').trim().replace(/\s+/g,'').slice(0,3)||'JCS';
const allowedLevel=laps=>laps>=3?4:laps>=2?3:laps>=1?2:1;
const startBonus=laps=>START_BONUS[Math.min(4,Math.max(1,laps))]||1500;
const donationAmount=laps=>laps>=4?1000:laps>=3?900:laps>=2?700:500;

export function createGameState({sessionId,userId,initials,nickname,now=new Date()}){
 const stamp=now.toISOString();return {version:2,sessionId:String(sessionId),userId:String(userId),initials:normalizeInitials(initials),nickname:String(nickname||''),score:START_SCORE,peakScore:START_SCORE,position:0,turn:0,laps:0,doubleStreak:0,cards:[],effects:{shieldCharges:0,favorPassTurns:0,doubleGainTurns:0,halfLossTurns:0,bonusMove:0,recordInsuranceRatio:0,mediaFocusCharges:0,mediaFocusTile:null,allianceDiscount:false},assets:{},donationPot:0,donationOwner:null,pendingChoice:null,pendingAction:null,status:'playing',lastDice:[],lastEvents:[{type:'info',title:'GAME START',message:'민심 10,000에서 시작합니다.'}],requestLedger:[],createdAt:stamp,updatedAt:stamp};
}
function applyDelta(state,raw,title){let delta=Math.trunc(raw);if(delta>0&&state.effects.favorPassTurns>0)delta=Math.round(delta*1.3);if(delta>0&&state.effects.doubleGainTurns>0){delta*=2;state.effects.doubleGainTurns-=1;}if(delta<0&&state.effects.shieldCharges>0){state.effects.shieldCharges-=1;delta=0;}else if(delta<0&&state.effects.halfLossTurns>0){state.effects.halfLossTurns-=1;delta=-Math.max(1,Math.round(Math.abs(delta)/2));}state.score=Math.max(0,state.score+delta);state.peakScore=Math.max(state.peakScore,state.score);return {type:'score',title,message:delta===0?'방어 효과로 민심 손실을 막았습니다.':`${delta>0?'+':''}${delta.toLocaleString()} 민심`,delta};}
function passStart(state,count,events){for(let i=0;i<count;i++){state.laps+=1;events.push(applyDelta(state,startBonus(state.laps),`START ${state.laps}바퀴 보너스`));}}
function groupComplete(state,group){const ids=BOARD.filter(t=>t.kind==='asset'&&t.group===group).map(t=>String(t.index));return ids.length===4&&ids.every(id=>state.assets[id]?.ownerId===state.userId);}
function landingFee(state,tile){const holding=state.assets[String(tile.index)];if(!holding)return 0;let fee=Math.round(tile.price*(INFLUENCE[holding.level]||.4));if(groupComplete(state,tile.group))fee*=2;if(state.effects.mediaFocusTile===tile.index&&state.effects.mediaFocusCharges>0){fee*=2;state.effects.mediaFocusCharges-=1;if(state.effects.mediaFocusCharges<=0)state.effects.mediaFocusTile=null;}return fee;}
function finishIfNeeded(state,events,now){if(state.score>0)return;state.status='game_over';state.endedAt=now.toISOString();state.insuredScore=state.effects.recordInsuranceRatio>0?Math.floor(state.peakScore*state.effects.recordInsuranceRatio):0;events.push({type:'game_over',title:'GAME OVER',message:'민심이 0이 되었습니다.'});}
function setAssetAction(state,tile,events){const h=state.assets[String(tile.index)];if(!h){state.pendingAction={type:'asset',mode:'buy',tileIndex:tile.index,title:tile.title,price:tile.price,grade:tile.grade};events.push({type:'asset',title:tile.title,message:`민심 ${tile.price.toLocaleString()}으로 영향력 거점을 확보할 수 있습니다.`});return;}
 if(h.ownerId===state.userId&&h.level<4&&h.level<allowedLevel(state.laps)){const ratio=UPGRADE[h.level+1]||0,price=Math.round(tile.price*ratio*(state.effects.allianceDiscount?.5:1));state.pendingAction={type:'asset',mode:'upgrade',tileIndex:tile.index,title:tile.title,price,level:h.level+1,discount:!!state.effects.allianceDiscount};events.push({type:'asset',title:tile.title,message:`${h.level+1}단계로 강화할 수 있습니다.`});return;}
 if(h.ownerId!==state.userId){const fee=landingFee(state,tile);events.push(applyDelta(state,-fee,`${tile.title} 민심 영향`));}
}
export function rollTurn(input,rng,now=new Date()){
 const state=clone(input);if(state.status!=='playing')throw new Error('GAME_NOT_ACTIVE');if(state.pendingChoice||state.pendingAction)throw new Error('ACTION_REQUIRED');
 let dice=[rng.int(1,6),rng.int(1,6)],distance=dice[0]+dice[1]+(state.effects.bonusMove||0);state.effects.bonusMove=0;const from=state.position,raw=from+distance,next=raw%BOARD_SIZE,events=[{type:'move',title:`${distance}칸 이동`,message:''}];if(raw>=BOARD_SIZE)passStart(state,Math.floor(raw/BOARD_SIZE),events);state.position=next;state.turn+=1;state.lastDice=dice;const isDouble=dice[0]===dice[1];state.doubleStreak=isDouble?state.doubleStreak+1:0;if(isDouble)events.push({type:'double',title:'DOUBLE!',message:'행동 완료 후 한 번 더 굴릴 수 있습니다.'});if(state.doubleStreak>=3){events.push(applyDelta(state,-1000,'3연속 DOUBLE 페널티'));state.doubleStreak=0;}
 const tile=BOARD[next];events[0].message=`${tile.icon} ${tile.title} 도착`;
 switch(tile.kind){
  case'asset':setAssetAction(state,tile,events);break;
  case'public_card':{const e=PUBLIC_EVENTS[rng.int(0,PUBLIC_EVENTS.length-1)];events.push(applyDelta(state,e.delta,e.title));events.push({type:'info',title:e.title,message:e.message});break;}
  case'donation':{const amount=donationAmount(state.laps);if(state.donationPot>0&&state.donationOwner&&state.donationOwner!==state.userId){events.push(applyDelta(state,state.donationPot,'민심 기부 누적금 획득'));state.donationPot=0;state.donationOwner=null;}else{events.push(applyDelta(state,-amount,'민심 기부'));state.donationPot+=amount;state.donationOwner=state.userId;events.push({type:'info',title:'민심 기부함',message:`누적 ${state.donationPot.toLocaleString()} 민심`});}break;}
  case'alliance':state.effects.allianceDiscount=true;events.push({type:'special',title:'연대 강화',message:'다음 거점 강화 비용이 50% 할인됩니다.'});break;
  case'media_focus':if(state.laps>=3){const candidates=Object.entries(state.assets).filter(([idx,h])=>h.ownerId===state.userId&&['press','media'].includes(BOARD[Number(idx)]?.group));if(candidates.length){const idx=Number(candidates[0][0]);state.effects.mediaFocusTile=idx;state.effects.mediaFocusCharges=2;events.push({type:'special',title:'미디어 집중',message:`${BOARD[idx].title} 영향력 ×2 · 2회 적용`});}else events.push({type:'info',title:'미디어 집중',message:'보유한 언론·방송 거점이 없습니다.'});}else events.push({type:'info',title:'미디어 집중',message:'3바퀴 이후 활성화됩니다.'});break;
  case'policy_drive':{const owned=Object.entries(state.assets).find(([idx,h])=>h.ownerId===state.userId&&h.level<Math.min(4,allowedLevel(state.laps)));if(owned){owned[1].level+=1;events.push({type:'special',title:'정책 드라이브',message:`${BOARD[Number(owned[0])].title} 무료 강화`});}else events.push({type:'info',title:'정책 드라이브',message:'현재 강화 가능한 거점이 없습니다.'});break;}
  case'choice':state.pendingChoice={safeGain:500,riskWin:1600,riskLose:-1200,riskWinChance:.5};events.push({type:'choice',title:'운명의 선택',message:'안전하게 +500 / 승부수 +1,600 또는 -1,200'});break;
  case'tour':state.pendingAction={type:'tour',mode:'tour',tileIndex:tile.index,title:'정참시 투어',price:0};events.push({type:'special',title:'정참시 투어',message:'원하는 칸으로 이동할 수 있습니다.'});break;
  case'plaza':events.push(applyDelta(state,300,'정참시 광장'));break;
 }
 if(state.effects.favorPassTurns>0)state.effects.favorPassTurns-=1;finishIfNeeded(state,events,now);state.lastEvents=events;state.updatedAt=now.toISOString();return state;
}
export function resolveAssetAction(input,action,targetIndex,now=new Date()){
 const state=clone(input),pending=state.pendingAction;if(!pending)throw new Error('NO_PENDING_ACTION');const events=[];
 if(pending.type==='tour'){if(action==='skip'){state.pendingAction=null;}else{const idx=Math.max(0,Math.min(31,Number(targetIndex)));state.position=idx;state.pendingAction=null;events.push({type:'tour',title:'정참시 투어',message:`${BOARD[idx].title}로 이동했습니다.`});}state.lastEvents=events;state.updatedAt=now.toISOString();return state;}
 const tile=BOARD[pending.tileIndex];if(action==='skip'){state.pendingAction=null;state.lastEvents=[{type:'info',title:tile.title,message:'이번에는 지나갑니다.'}];state.updatedAt=now.toISOString();return state;}
 if(action==='buy'&&pending.mode==='buy'){if(state.score<pending.price)throw new Error('INSUFFICIENT_SCORE');state.score-=pending.price;state.assets[String(tile.index)]={ownerId:state.userId,level:1,invested:pending.price};events.push({type:'asset',title:'영향력 확보',message:`${tile.title} 확보 완료`});}
 else if(action==='upgrade'&&pending.mode==='upgrade'){if(state.score<pending.price)throw new Error('INSUFFICIENT_SCORE');state.score-=pending.price;const h=state.assets[String(tile.index)];h.level=pending.level;h.invested+=pending.price;if(pending.discount)state.effects.allianceDiscount=false;events.push({type:'asset',title:'거점 강화',message:`${tile.title} ${h.level}단계`});}
 else throw new Error('INVALID_ACTION');state.pendingAction=null;state.lastEvents=events;state.updatedAt=now.toISOString();return state;
}
export function resolveChoice(input,option,rng,now=new Date()){const state=clone(input);if(!state.pendingChoice)throw new Error('NO_PENDING_CHOICE');const c=state.pendingChoice,events=[];events.push(applyDelta(state,option==='safe'?c.safeGain:(rng.float()<c.riskWinChance?c.riskWin:c.riskLose),option==='safe'?'안전한 선택':'승부수'));state.pendingChoice=null;finishIfNeeded(state,events,now);state.lastEvents=events;state.updatedAt=now.toISOString();return state;}
export function useCard(input,cardId,now=new Date()){const state=clone(input),i=state.cards.indexOf(cardId);if(i<0)throw new Error('CARD_NOT_OWNED');state.cards.splice(i,1);if(cardId==='SHIELD')state.effects.shieldCharges+=1;if(cardId==='FAVOR_PASS')state.effects.favorPassTurns+=2;if(cardId==='DOUBLE_GAIN')state.effects.doubleGainTurns+=1;if(cardId==='HALF_LOSS')state.effects.halfLossTurns+=1;if(cardId==='BONUS_MOVE')state.effects.bonusMove+=2;if(cardId==='RECORD_INSURANCE')state.effects.recordInsuranceRatio=Math.max(state.effects.recordInsuranceRatio,.7);state.lastEvents=[{type:'card',title:`${STRATEGY_CARDS[cardId].name} 사용`,message:STRATEGY_CARDS[cardId].description}];state.updatedAt=now.toISOString();return state;}
export function cashOut(input,now=new Date()){const state=clone(input);if(state.pendingChoice||state.pendingAction)throw new Error('ACTION_REQUIRED');state.status='cashed_out';state.finalScore=state.score;state.endedAt=now.toISOString();state.updatedAt=now.toISOString();return state;}
export const getRecordableScore=state=>state.status==='cashed_out'?(state.finalScore??state.score):state.status==='game_over'?(state.insuredScore??0):0;
