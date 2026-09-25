export const VALLEY_DURATION=60000;
export const VALLEY_GUIDED=20000;
export const VALLEY_REACTION=350;
export function valleyAttacks(seed){
 let x=seed>>>0;const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 const attacks=[];let at=2400;
 while(at<59000){attacks.push({at,lane:random()<.5?0:1,hit:at+VALLEY_REACTION});at+=Math.round(at<VALLEY_GUIDED?1700+random()*450:900+random()*300);}
 return attacks;
}
export function valleyCoins(seed){
 const attacks=valleyAttacks(seed),coins=[];let x=(seed^0x9e3779b9)>>>0;
 const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 // Each coin independently chooses a lane; preserve a safe dodge window.
 for(let at=1000;at<59000;at+=Math.round(440+random()*260)){
  const preferred=random()<.5?0:1,near=attacks.find(a=>Math.abs(a.hit-at)<320);
  coins.push({id:coins.length,at,lane:near?1-near.lane:preferred});
 }
 return coins;
}
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
