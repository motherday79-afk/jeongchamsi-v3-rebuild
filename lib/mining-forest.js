import {FOREST_DURATION,FOREST_MODES,forestResult} from '../mine/forest-rules.js';
import {recordQuest} from './mining-quests.js';
export function forestAction(s,input,now){
 if(input.action==='forest-start'){
  if(!Object.hasOwn(FOREST_MODES,input.difficulty))throw Error('MINE_FOREST_MODE');
  s.forestRun={id:input.requestId,difficulty:input.difficulty,startedAt:now,rules:322};return {forest:{...s.forestRun}};
 }
 const run=s.forestRun;if(!run||run.id!==input.runId||run.rules!==322)throw Error('MINE_FOREST_RUN');
 if(run.result)return {forest:run.result};
 if(!Array.isArray(input.events)||input.events.length>6000)throw Error('MINE_FOREST_INPUT');
 let last=-1;const held=Array(5).fill(false),lastDown=Array(5).fill(-100);
 for(const e of input.events){if(!Array.isArray(e)||e.length!==3||!Number.isInteger(e[0])||e[0]<last||e[0]<0||e[0]>FOREST_DURATION||!Number.isInteger(e[1])||e[1]<0||e[1]>4||![0,1].includes(e[2]))throw Error('MINE_FOREST_INPUT');
  const [t,l,d]=e;if(held[l]===!!d||(d&&t-lastDown[l]<55))throw Error('MINE_FOREST_INPUT');held[l]=!!d;if(d)lastDown[l]=t;last=t;
 }
 if(now-run.startedAt<FOREST_DURATION||now-run.startedAt>1800000)throw Error('MINE_FOREST_TIME');
 run.result={...forestResult(run.difficulty,input.events),runId:run.id,difficulty:run.difficulty};
 if(run.result.cleared)recordQuest(s,'forest-success',now);
 return {forest:run.result};
}

