import {valleyResult,VALLEY_DURATION} from '../mine/valley-rules.js';
import {raidDay} from './mining-raid.js';
import {recordQuest} from './mining-quests.js';
export function valleyAction(s,input,now,seed){
 if(input.action==='valley-start'){
  s.valleyRun={id:input.requestId,seed,startedAt:now,day:raidDay(now),rules:317};
  return {valley:{...s.valleyRun}};
 }
 const run=s.valleyRun;
 if(!run||run.id!==input.runId)throw Error('MINE_VALLEY_RUN');
 if(run.rules!==317)throw Error('MINE_VALLEY_RUN');
 if(run.result)return {valley:run.result};
 const moves=input.moves;
 if(!Array.isArray(moves)||moves.length>500)throw Error('MINE_VALLEY_MOVES');
 let last=-120;
 for(const move of moves){if(!Array.isArray(move)||move.length!==2||!Number.isInteger(move[0])||move[0]<last+120||move[0]>VALLEY_DURATION||![0,1].includes(move[1]))throw Error('MINE_VALLEY_MOVES');last=move[0];}
 const result=valleyResult(run.seed,moves);
 if(now-run.startedAt<result.endedAt||now-run.startedAt>1800000||last>result.endedAt)throw Error('MINE_VALLEY_TIME');
 run.result={...result,runId:run.id};
 if(result.won){recordQuest(s,'valley-success',now);if(result.allCoins)s.dailyQuests.valleyAllCoins={runId:run.id,at:now,collected:result.collected};}
 return {valley:run.result};
}
