import {newMine} from './mining-engine.js';
const fail=code=>{throw Error(code);};
export const INITIAL_CAMPAIGN='movie-278';
export const MINE_TRANSACTION=`-- MINE_TRANSACTION_278
for i=1,#KEYS-1 do
 if (redis.call('GET',KEYS[i]) or '')~=ARGV[i*2-1] then return 0 end
end
for i=1,#KEYS-1 do redis.call('SET',KEYS[i],ARGV[i*2]) end
if tonumber(ARGV[#KEYS*2-1])>0 then redis.call('INCRBY',KEYS[#KEYS],ARGV[#KEYS*2-1]) end
return 1`;
export function initialCampaign(){return {current:{id:INITIAL_CAMPAIGN,title:'영화예매 티켓 이벤트',prize:'영화예매 티켓',limit:50,wins:0,at:0},campaigns:[],winners:[],requests:[]};}
export function publicCampaign(c){return {...c,cost:20,chance:.05,remaining:Math.max(0,c.limit-c.wins),status:c.wins>=c.limit?'closed':'active'};}
export function migrateCampaign(s,c,now){
 if(s.campaignId!==c.id){
  if(s.campaignId||c.id!==INITIAL_CAMPAIGN){
   const paidPicks=Array.isArray(s.paidPicks)?s.paidPicks:[],tool=paidPicks.includes(s.tool)?s.tool:'rust';
   const keep={costumes:s.costumes||{},cycle:s.cycle+1,character:s.character,chosen:s.chosen,paidPicks,tool,prizeHistory:s.prizeHistory||[],receipts:s.receipts||[]};
   for(const name of Object.keys(s))delete s[name];Object.assign(s,newMine(now),keep);
  }
  s.campaignId=c.id;s.lottery={plays:0,wins:0,ticket:null};
 }
 s.prizeHistory ||= [];s.paidPicks ||= [];
}
export function publicLottery(s,g){return {...s.lottery,history:(s.prizeHistory||[]).map(ticket=>{
 const claim=g.winners.find(w=>w.id===ticket.id);return {...ticket,fulfilled:claim?.fulfilled===true,fulfilledAt:claim?.fulfilledAt||null};
})};}
export function lotteryAction(s,g,user,input,now,roll,uuid){
 if(input.campaignId!==g.current.id)fail('MINE_CAMPAIGN_CHANGED');
 const l=s.lottery,c=g.current;
 if(input.action==='lottery-reveal'){
  if(!l.ticket||l.ticket.id!==input.ticketId)fail('MINE_TICKET');
  l.ticket.revealed=true;
  const old=s.prizeHistory.find(t=>t.id===input.ticketId);if(old)old.revealed=true;
  return {ticket:l.ticket};
 }
 if(!Number.isSafeInteger(input.expectedPlays)||input.expectedPlays<0)fail('MINE_LOTTERY_CHANGED');
 if(l.ticket?.requestId===input.requestId)return {ticket:l.ticket};
 if(input.expectedPlays!==l.plays)fail('MINE_LOTTERY_CHANGED');
 if(l.ticket&&!l.ticket.revealed)fail('MINE_LOTTERY_PENDING');
 if(c.wins>=c.limit)fail('MINE_LOTTERY_CLOSED');
 if(s.gold<20)fail('MINE_GOLD_REQUIRED');
 const won=roll<.05,id=uuid(),ticket={id,won,prize:c.prize,at:now,revealed:false,campaignId:c.id,code:won?uuid():null,requestId:input.requestId};
 s.gold-=20;l.plays++;l.ticket=ticket;
 if(won){l.wins++;c.wins++;s.prizeHistory.push({...ticket});g.winners.push({...ticket,userId:String(user.id),nickname:String(user.nickname||user.name||user.displayName||user.id).slice(0,100),fulfilled:false});}
 return {ticket};
}
export function campaignFields(input){
 const title=String(input.title||'').trim(),prize=String(input.prize||'').trim(),limit=input.limit;
 if(!title||title.length>80||!prize||prize.length>100||!Number.isSafeInteger(limit)||limit<1||limit>10000)fail('MINE_CAMPAIGN_INPUT');
 return {title,prize,limit};
}
