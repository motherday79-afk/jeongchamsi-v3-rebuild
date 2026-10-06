import {TERRITORY_PARTIES as PARTIES,TERRITORY_OFFICES as OFFICES,TERRITORY_MOVES as MOVES,TERRITORY_RULES as R} from '../src/core/territory-catalog.js';

export const territoryFail=(code,status=400,extra={})=>{throw Object.assign(new Error(code),{status,...extra});};
export function territoryRound(at){
  const local=new Date(at+9*3600000),day=(local.getUTCDay()+6)%7;
  const startsAt=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-day)-9*3600000;
  return {id:new Date(startsAt+9*3600000).toISOString().slice(0,10),startsAt,endsAt:startsAt+7*86400000};
}
export function newTerritoryGame(at){
  return {round:territoryRound(at),territories:[['bluehouse','청와대'],['assembly','국회의사당']].map(([id,name])=>({id,name,ownerPartyId:null,scores:Object.fromEntries(PARTIES.map(p=>[p.id,0])),challengerPartyId:null,holdStartedAt:null,protectedUntil:0})),offices:Object.fromEntries(PARTIES.map(p=>[p.id,Object.fromEntries(OFFICES.map(o=>[o.id,0]))])),logs:[]};
}
function log(game,event){game.logs.unshift(event);game.logs=game.logs.slice(0,50);}
function candidate(territory){
  const ranked=Object.entries(territory.scores).sort((a,b)=>b[1]-a[1]);
  return ranked[0][0]!==territory.ownerPartyId&&ranked[0][1]>=R.captureThreshold&&ranked[0][1]-ranked[1][1]>=R.leaderMargin?ranked[0][0]:null;
}
// Settle old scores before every mutation. A late reader never restarts a valid hold.
export function settleTerritoryGame(stored,at){
  const game=stored?.round?.id===territoryRound(at).id?stored:newTerritoryGame(at);
  for(const t of game.territories){
    const lead=at>=t.protectedUntil?candidate(t):null;
    if(lead!==t.challengerPartyId){t.challengerPartyId=lead;t.holdStartedAt=lead?at:null;}
    if(lead&&t.holdStartedAt!==null&&at>=t.holdStartedAt+R.holdMs){
      const capturedAt=t.holdStartedAt+R.holdMs;
      t.ownerPartyId=lead;t.protectedUntil=capturedAt+R.protectionMs;t.challengerPartyId=null;t.holdStartedAt=null;
      log(game,{id:`capture:${t.id}:${capturedAt}`,type:'capture',at:capturedAt,partyId:lead,territoryId:t.id});
    }
  }
  return game;
}
export function territoryActor(stored,round,at){
  const actor=stored?.roundId===round.id?stored:{roundId:round.id,partyId:null,energy:R.maxEnergy,energyAt:at,contribution:0,cooldownUntil:0};
  const ticks=Math.max(0,Math.floor((at-actor.energyAt)/R.energyRegenMs));
  actor.energy=Math.min(R.maxEnergy,actor.energy+ticks);
  actor.energyAt=actor.energy===R.maxEnergy?at:actor.energyAt+ticks*R.energyRegenMs;
  return actor;
}
export function applyTerritoryAction(game,actor,input,{at,nickname}){
  if(input.action==='join'){
    if(!PARTIES.some(p=>p.id===input.partyId))territoryFail('INVALID_PARTY');
    if(actor.partyId&&actor.partyId!==input.partyId)territoryFail('PARTY_LOCKED',409);
    actor.partyId=input.partyId;return {action:'join',points:0,partyId:actor.partyId};
  }
  if(!actor.partyId)territoryFail('JOIN_REQUIRED',409);
  if(at<actor.cooldownUntil)territoryFail('COOLDOWN',429,{retryAfterSeconds:Math.ceil((actor.cooldownUntil-at)/1000)});
  let result;
  if(input.action==='upgrade'){
    if(!OFFICES.some(o=>o.id===input.officeId))territoryFail('INVALID_OFFICE');
    const level=game.offices[actor.partyId][input.officeId];
    if(level>=R.maxOfficeLevel)territoryFail('OFFICE_MAX',409);
    if(input.expectedPoints!==R.upgradeBasePoints*(level+1))territoryFail('PRICE_CHANGED',409);
    game.offices[actor.partyId][input.officeId]=level+1;
    result={action:'upgrade',officeId:input.officeId,level:level+1,points:R.upgradeBasePoints*(level+1)};
  }else if(input.action==='act'){
    const t=game.territories.find(t=>t.id===input.territoryId),move=MOVES.find(m=>m.id===input.moveId);
    if(!t)territoryFail('INVALID_TERRITORY');if(!move)territoryFail('INVALID_MOVE');
    if((move.role==='defend')!==(t.ownerPartyId===actor.partyId))territoryFail('ROLE_REQUIRED',403);
    if(actor.energy<R.actionEnergy)territoryFail('INSUFFICIENT_ENERGY',429,{retryAfterSeconds:Math.ceil(((R.actionEnergy-actor.energy)*R.energyRegenMs-(at-actor.energyAt))/1000)});
    const level=game.offices[actor.partyId][move.officeId],before=t.scores[actor.partyId];
    t.scores[actor.partyId]=Math.min(R.maxScore,before+40+level*8);
    const influence=t.scores[actor.partyId]-before;
    if(move.role==='defend'){
      const enemy=Object.entries(t.scores).filter(([id])=>id!==actor.partyId).sort((a,b)=>b[1]-a[1])[0][0];
      t.scores[enemy]=Math.max(0,t.scores[enemy]-20-level*4);
    }else if(move.id==='scrutiny'){
      const enemy=Object.entries(t.scores).filter(([id])=>id!==actor.partyId).sort((a,b)=>b[1]-a[1])[0][0];
      t.scores[enemy]=Math.max(0,t.scores[enemy]-10-level*2);
    }
    actor.energy-=R.actionEnergy;actor.contribution+=influence;
    result={action:'act',territoryId:t.id,moveId:move.id,points:R.actionPoints,influence};
    settleTerritoryGame(game,at);
  }else territoryFail('INVALID_INPUT');
  actor.cooldownUntil=at+R.cooldownMs;
  log(game,{...result,id:input.requestId,type:result.action,at,partyId:actor.partyId,nickname:String(nickname||'참여자').slice(0,40)});
  return result;
}
export function territoryView(game,actor,wallet,at,result){
  return {ok:true,serverNow:at,round:game.round,territories:game.territories,parties:PARTIES,offices:game.offices,officeCatalog:OFFICES,moves:MOVES,rules:R,player:actor?{partyId:actor.partyId,energy:actor.energy,nextEnergyAt:actor.energy<R.maxEnergy?actor.energyAt+R.energyRegenMs:null,contribution:actor.contribution,balance:Number(wallet?.balance)||0,cooldownUntil:actor.cooldownUntil}:null,logs:game.logs,...(result?{result}:{})};
}
