export const VALLEY_DURATION=90000;
export function valleyAttacks(seed){
 let x=seed>>>0;const random=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 const attacks=[];let at=3200;
 while(at<88000){attacks.push({at,lane:random()<.5?0:1,hit:at+650});at+=Math.round((at<30000?2600:at<60000?2100:1650)+random()*650);}
 return attacks;
}
export function valleyResult(seed,moves,until=VALLEY_DURATION){
 let health=3,lane=0,index=0,lastHit=-Infinity,endedAt=VALLEY_DURATION;
 for(const attack of valleyAttacks(seed)){
  if(attack.hit>until)break;
  while(index<moves.length&&moves[index][0]<=attack.hit){lane=moves[index++][1];}
  if(lane===attack.lane&&attack.hit-lastHit>=1100){health--;lastHit=attack.hit;if(!health){endedAt=attack.hit;break;}}
 }
 return {health,won:health>0&&until>=VALLEY_DURATION,endedAt};
}
