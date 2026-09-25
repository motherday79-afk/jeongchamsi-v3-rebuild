export const VALLEY_DURATION=60000;
export const VALLEY_GUIDED=20000;
export const VALLEY_REACTION=350;
export function valleyAttacks(seed){
 let x=seed>>>0;const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 const attacks=[];let at=2400;
 while(at<59000){attacks.push({at,lane:random()<.5?0:1,hit:at+VALLEY_REACTION});at+=Math.round(at<VALLEY_GUIDED?1700+random()*450:900+random()*300);}
 return attacks;
}
export const valleyCoins=seed=>valleyAttacks(seed).filter((_,i)=>i%2===0).map((a,i)=>({id:i,at:a.hit-220,lane:a.lane}));
export function valleyResult(seed,moves,until=VALLEY_DURATION){
 let health=3,lane=0,index=0,lastHit=-Infinity,endedAt=VALLEY_DURATION;
 for(const attack of valleyAttacks(seed)){
  if(attack.hit>until)break;
  while(index<moves.length&&moves[index][0]<=attack.hit){lane=moves[index++][1];}
  if(lane===attack.lane&&attack.hit-lastHit>=550){health--;lastHit=attack.hit;if(!health){endedAt=attack.hit;break;}}
 }
 let collected=0;lane=0;index=0;const coins=valleyCoins(seed);
 for(const coin of coins){if(coin.at>Math.min(until,endedAt))break;while(index<moves.length&&moves[index][0]<=coin.at)lane=moves[index++][1];if(lane===coin.lane)collected++;}
 const won=health>0&&until>=VALLEY_DURATION;
 return {health,won,endedAt,collected,totalCoins:coins.length,allCoins:won&&collected===coins.length};
}
