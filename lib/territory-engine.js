import {TERRITORY_PARTIES as PARTIES,TERRITORY_OFFICES as OFFICES,TERRITORY_MOVES as MOVES,TERRITORY_RULES as R,TERRITORY_PLAZA_MODES as MODES,TERRITORY_COLLECTIVE_MOVES as COLLECTIVE,TERRITORY_ROSTER as ROSTER} from '../src/core/territory-catalog.js';

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
  game.participants||=[];
  for(const p of game.participants){
    if(!p.ownerId){p.ownerId=p.id;p.unitId=ROSTER.find(u=>u.appearance===p.appearance)?.id||'unit1';p.id=`${p.ownerId}:${p.unitId}`;}
  }
  // Each presence owns its next unprocessed minute. Settle old holds before
  // changing scores, then establish any new hold at that minute, never earlier.
  for(;;){
    const tick=Math.min(...game.participants.filter(p=>p.nextTickAt<=p.expiresAt).map(p=>p.nextTickAt));
    if(!Number.isFinite(tick)||tick>at)break;
    settleHolds(game,tick);
    const active=game.participants.filter(p=>p.joinedAt<=tick&&p.expiresAt>=tick);
    const groups=new Map();
    for(const p of active){const key=`${p.partyId}:${p.territoryId}`,g=groups.get(key)||{total:0,rally:0};g.total++;if(p.mode==='rally')g.rally++;groups.set(key,g);}
    for(const p of active.filter(p=>p.nextTickAt===tick)){
      const peers=groups.get(`${p.partyId}:${p.territoryId}`);
      let amount=p.mode==='vigil'&&tick<=p.committedUntil?6:4;
      if(p.mode==='rally'&&peers.rally>=3)amount=8;
      if(p.mode==='support')amount=peers.total>1?6:0;
      const t=game.territories.find(t=>t.id===p.territoryId);
      t.scores[p.partyId]=Math.min(R.maxScore,t.scores[p.partyId]+amount);
      p.nextTickAt+=R.plazaTickMs;
    }
    settleHolds(game,tick);
  }
  game.participants=game.participants.filter(p=>p.expiresAt>at);
  settleHolds(game,at);
  return game;
}
function settleHolds(game,at){
  for(const t of game.territories){
    const lead=at>=t.protectedUntil?candidate(t):null;
    if(lead!==t.challengerPartyId){t.challengerPartyId=lead;t.holdStartedAt=lead?(t.protectedUntil>0&&t.protectedUntil<=at?Math.max(t.protectedUntil,game.holdsSettledAt??at):at):null;}
    if(lead&&t.holdStartedAt!==null&&at>=t.holdStartedAt+R.holdMs){
      const capturedAt=t.holdStartedAt+R.holdMs;
      t.ownerPartyId=lead;t.protectedUntil=capturedAt+R.protectionMs;t.challengerPartyId=null;t.holdStartedAt=null;
      log(game,{id:`capture:${t.id}:${capturedAt}`,type:'capture',at:capturedAt,partyId:lead,territoryId:t.id});
    }
  }
  game.holdsSettledAt=at;
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
  game.participants||=[];
  const own=game.participants.filter(p=>p.ownerId===actor.participantId);
  const committed=p=>p?.mode==='vigil'&&at<p.committedUntil;
  let unitIds=input.unitIds;
  if(unitIds!==undefined){
    if(!Array.isArray(unitIds)||!unitIds.length||unitIds.length>18||unitIds.some(id=>!ROSTER.some(u=>u.id===id)))territoryFail('INVALID_UNIT');
    unitIds=[...new Set(unitIds)];
  }
  if(input.action==='leave'){
    const removed=own.filter(p=>!unitIds||unitIds.includes(p.unitId));
    game.participants=game.participants.filter(p=>!removed.includes(p));
    return {action:'leave',points:0,unitIds:removed.map(p=>p.unitId)};
  }
  if(input.action==='act'&&(unitIds?own.some(p=>unitIds.includes(p.unitId)&&committed(p)):ROSTER.every(u=>committed(own.find(p=>p.unitId===u.id)))))territoryFail('VIGIL_COMMITTED',409);
  if(at<actor.cooldownUntil)territoryFail('COOLDOWN',429,{retryAfterSeconds:Math.ceil((actor.cooldownUntil-at)/1000)});
  let result;
  if(input.action==='deploy'){
    if(!game.territories.some(t=>t.id===input.territoryId))territoryFail('INVALID_TERRITORY');
    if(!MODES.some(m=>m.id===input.mode))territoryFail('INVALID_MODE');
    if(!unitIds){if(!/^citizen[1-6]$/.test(input.appearance))territoryFail('INVALID_APPEARANCE');unitIds=[ROSTER.find(u=>u.appearance===input.appearance).id];}
    if(input.appearance!==undefined&&(!/^citizen[1-6]$/.test(input.appearance)||unitIds.some(id=>ROSTER.find(u=>u.id===id).appearance!==input.appearance)))territoryFail('INVALID_APPEARANCE');
    const replaced=own.filter(p=>unitIds.includes(p.unitId));
    const locked=replaced.find(committed);
    if(locked)territoryFail('VIGIL_COMMITTED',409,{retryAfterSeconds:Math.ceil((locked.committedUntil-at)/1000)});
    const remaining=game.participants.filter(p=>!replaced.includes(p));
    if(remaining.length+unitIds.length>R.maxParticipants)territoryFail('PLAZA_FULL',409);
    if(input.mode==='support'&&unitIds.length<2&&!remaining.some(p=>p.partyId===actor.partyId&&p.territoryId===input.territoryId))territoryFail('SUPPORT_REQUIRED',409);
    const energy=R.deployEnergy*unitIds.length;
    if(actor.energy<energy)territoryFail('INSUFFICIENT_ENERGY',429);
    actor.energy-=energy;
    actor.appearance=ROSTER.find(u=>u.id===unitIds[0]).appearance;
    game.participants=remaining;
    for(const unitId of unitIds)game.participants.push({id:`${actor.participantId}:${unitId}`,ownerId:actor.participantId,unitId,nickname:String(nickname||'참여자').slice(0,40),partyId:actor.partyId,appearance:ROSTER.find(u=>u.id===unitId).appearance,territoryId:input.territoryId,mode:input.mode,joinedAt:at,expiresAt:Math.min(at+R.presenceMs,game.round.endsAt),committedUntil:input.mode==='vigil'?Math.min(at+R.vigilMs,game.round.endsAt):0,nextTickAt:at+R.plazaTickMs});
    result={action:'deploy',points:0,energy,unitIds,territoryId:input.territoryId,mode:input.mode};
  }else if(input.action==='collective'){
    const move=COLLECTIVE.find(m=>m.id===input.moveId),t=game.territories.find(t=>t.id===input.territoryId);
    if(!t)territoryFail('INVALID_TERRITORY');if(!move)territoryFail('INVALID_MOVE');
    const peers=game.participants.filter(p=>p.partyId===actor.partyId&&p.territoryId===t.id&&p.mode===move.mode);
    if(!peers.some(p=>p.ownerId===actor.participantId&&!committed(p))||peers.length<move.minParticipants)territoryFail('COLLECTIVE_REQUIRED',409);
    if(actor.energy<move.energy)territoryFail('INSUFFICIENT_ENERGY',429);
    const before=t.scores[actor.partyId];
    t.scores[actor.partyId]=Math.min(R.maxScore,before+80);
    const influence=t.scores[actor.partyId]-before;
    actor.energy-=move.energy;actor.contribution+=influence;
    result={action:'collective',points:move.points,territoryId:t.id,moveId:move.id,influence,participantCount:peers.length,unitCount:peers.length,commanderCount:new Set(peers.map(p=>p.ownerId)).size};
    settleTerritoryGame(game,at);
  }else if(input.action==='upgrade'){
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
  const participants=(game.participants||[]).map(({nextTickAt,...p})=>{const owner=game.territories.find(t=>t.id===p.territoryId)?.ownerPartyId;return {...p,role:!owner?'contesting':owner===p.partyId?'defender':'attacker'};});
  const presences=actor?participants.filter(p=>p.ownerId===actor.participantId):[];
  const units=ROSTER.map(u=>{const presence=presences.find(p=>p.unitId===u.id)||null;const committedUntil=presence?.mode==='vigil'?presence.committedUntil:0;return {...u,presence,committedUntil,ready:committedUntil<=at};});
  return {ok:true,serverNow:at,round:game.round,territories:game.territories,parties:PARTIES,offices:game.offices,officeCatalog:OFFICES,moves:MOVES,rules:R,participants,unitCount:participants.length,commanderCount:new Set(participants.map(p=>p.ownerId)).size,plazaModes:MODES,collectiveMoves:COLLECTIVE,player:actor?{participantId:actor.participantId||null,ownerId:actor.participantId||null,units,presences,presence:presences[0]||null,appearance:actor.appearance||'citizen1',partyId:actor.partyId,energy:actor.energy,nextEnergyAt:actor.energy<R.maxEnergy?actor.energyAt+R.energyRegenMs:null,contribution:actor.contribution,balance:Number(wallet?.balance)||0,cooldownUntil:actor.cooldownUntil}:null,logs:game.logs,...(result?{result}:{})};
}
