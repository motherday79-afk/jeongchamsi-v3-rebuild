import {createHash,randomUUID} from 'node:crypto';
import {spendActivityCredit,ACTIVITY_KEYS} from './activity-points.js';
import {territoryFail as fail,territoryRound,settleTerritoryGame,territoryActor,applyTerritoryAction,territoryView} from './territory-engine.js';

const digest=value=>createHash('sha256').update(value).digest('hex');
export const TERRITORY_KEYS={game:'jcs:territory:v1:game',actor:id=>'jcs:territory:v1:actor:'+digest(String(id)),receipt:(id,requestId)=>'jcs:territory:v1:receipt:'+digest(String(id)+'\n'+requestId),wallet:ACTIVITY_KEYS.wallet};
const TTL=14*86400;
const parse=raw=>{if(raw===null||raw===undefined||raw==='')return null;try{return JSON.parse(raw);}catch{fail('STORAGE_UNAVAILABLE',503);}};
// Compare every input before any write, including the unchanged wallet on free joins.
// ARGV: N old JSON values, N new values, N TTLs; '-1' TTL means compare only.
export const TERRITORY_CAS_LUA=`
local n=#KEYS
for i=1,n do
 if (redis.call('GET',KEYS[i]) or '')~=ARGV[i] then return 0 end
end
for i=1,n do
 local ttl=tonumber(ARGV[2*n+i])
 if ttl>=0 then
  if ttl>0 then redis.call('SET',KEYS[i],ARGV[n+i],'EX',ttl)
  else redis.call('SET',KEYS[i],ARGV[n+i]) end
 end
end
return 1`;

function validInput(body){
  if(!body||typeof body!=='object'||Array.isArray(body))fail('INVALID_INPUT');
  if(typeof body.requestId!=='string'||!/^[A-Za-z0-9_-]{12,100}$/.test(body.requestId))fail('INVALID_REQUEST_ID');
  if(typeof body.roundId!=='string')fail('INVALID_INPUT');
  const actions={join:['partyId'],act:['territoryId','moveId'],upgrade:['officeId','expectedPoints'],deploy:['territoryId','mode','appearance'],leave:[],collective:['territoryId','moveId']};
  if(typeof body.action!=='string'||!Object.hasOwn(actions,body.action))fail('INVALID_INPUT');
  const fields=actions[body.action];
  if(Object.keys(body).some(k=>!['action','roundId','requestId',...fields].includes(k))||fields.some(k=>k==='expectedPoints'?(!Number.isSafeInteger(body[k])||body[k]<1):typeof body[k]!=='string'))fail('INVALID_INPUT');
  return Object.fromEntries(Object.keys(body).sort().map(k=>[k,body[k]]));
}
function requireActor(user){
  if(!user?.id)fail('LOGIN_REQUIRED',401);
  if(user.status&&user.status!=='active')fail('ACCOUNT_INACTIVE',403);
}
export function createTerritoryService({command,now=Date.now}={}){
  if(typeof command!=='function')fail('STORAGE_UNAVAILABLE',503);
  async function cas(keys,old,values,ttls){return Number(await command(['EVAL',TERRITORY_CAS_LUA,String(keys.length),...keys,...old.map(v=>v??''),...values.map(v=>JSON.stringify(v)),...ttls.map(String)]))===1;}
  async function get(user=null){
    for(let attempt=0;attempt<8;attempt++){
      const at=now(),keys=[TERRITORY_KEYS.game,...(user?.id?[TERRITORY_KEYS.actor(user.id),TERRITORY_KEYS.wallet(user.id)]:[])];
      const raw=await command(['MGET',...keys]),game=settleTerritoryGame(parse(raw[0]),at);
      // A public read may settle territory timers, never a wallet or actor write.
      if(JSON.stringify(game)!==(raw[0]??'')&&!await cas([keys[0]],[raw[0]],[game],[0]))continue;
      const actor=user?.id?territoryActor(parse(raw[1]),game.round,at):null;
      return territoryView(game,actor,parse(raw[2]),at);
    }
    fail('CONFLICT',409);
  }
  async function mutate(user,body){
    requireActor(user);const input=validInput(body),signature=digest(JSON.stringify(input));
    for(let attempt=0;attempt<12;attempt++){
      const at=now();if(input.roundId!==territoryRound(at).id)fail('ROUND_CHANGED',409);
      const keys=[TERRITORY_KEYS.game,TERRITORY_KEYS.actor(user.id),TERRITORY_KEYS.wallet(user.id),TERRITORY_KEYS.receipt(user.id,input.requestId)];
      const raw=await command(['MGET',...keys]),receipt=parse(raw[3]);
      if(receipt){
        if(receipt.signature!==signature)fail('REQUEST_ID_REUSED',409);
        const view=await get(user);return {...view,result:{...receipt.result,replayed:true}};
      }
      const game=settleTerritoryGame(parse(raw[0]),at),actor=territoryActor(parse(raw[1]),game.round,at),wallet=parse(raw[2])||{};
      actor.participantId||=randomUUID();
      const result=applyTerritoryAction(game,actor,input,{at,nickname:user.nickname});
      if(result.points){
        if(!Number.isSafeInteger(wallet.balance)||wallet.balance<result.points)fail('INSUFFICIENT_POINTS',402);
        wallet.balance-=result.points;spendActivityCredit(wallet,result.points);wallet.ledger||=[];
        wallet.ledger.push({id:'territory:'+input.requestId,type:'territory',points:-result.points,at,roundId:game.round.id,action:input.action,territoryId:result.territoryId||null,officeId:result.officeId||null});
      }
      if(input.roundId!==territoryRound(now()).id)fail('ROUND_CHANGED',409);
      if(await cas(keys,raw,[game,actor,wallet,{signature,result}],[0,TTL,result.points?0:-1,TTL]))return territoryView(game,actor,wallet,at,result);
    }
    fail('CONFLICT',409);
  }
  return {get,mutate};
}
