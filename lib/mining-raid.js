export const raidDay=now=>new Date(now+9*3600000).toISOString().slice(0,10);
export function publicRaid(s,now){
 const day=raidDay(now),plays=s.raid?.day===day?s.raid.plays:[];
 return {day,used:plays.length,remaining:3-plays.length,complete:plays.length>0,last:plays.at(-1)||null};
}
export function raidAction(s,input,now,roll){
 const fail=code=>{throw Error(code);},day=raidDay(now);
 if(input.day!==day)fail('MINE_RAID_DAY');
 const plays=s.raid?.day===day?s.raid.plays:[];
 const prior=plays.find(p=>p.requestId===input.requestId);if(prior)return prior;
 if(!Number.isInteger(input.card)||input.card<0||input.card>2)fail('MINE_RAID_CARD');
 if(plays.length>=3)fail('MINE_RAID_LIMIT');
 if(input.expectedPlays!==plays.length)fail('MINE_RAID_CHANGED');
 if(!Number.isSafeInteger(s.gold)||s.gold<10)fail('MINE_RAID_GOLD');
 const winner=Math.floor(roll*3),won=input.card===winner,before=s.gold,amount=Math.floor(before/10),after=before+(won?amount:-amount);
 if(!Number.isSafeInteger(after))fail('MINE_RAID_GOLD');
 const result={requestId:input.requestId,day,at:now,card:input.card,winner,won,before,delta:won?amount:-amount,after,number:plays.length+1};
 s.gold=after;s.raid={day,plays:[...plays,result]};return result;
}
