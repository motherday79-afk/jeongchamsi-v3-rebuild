import {recordQuest} from './mining-quests.js';
function setup(run,now,seed){
 let v=seed>>>0;const random=()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};
 const ids=Array.from({length:20},(_,i)=>i);for(let i=19;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 run.targets=ids.slice(0,2-run.found);run.layout=Array.from({length:20},(_,i)=>i);run.swaps=[];
 for(let n=0;n<7;n++){const used=new Set(),pairs=[];for(let k=0;k<2;k++){let a,b;do{a=Math.floor(random()*20);}while(used.has(a));used.add(a);do{b=Math.floor(random()*20);}while(used.has(b));used.add(b);pairs.push([a,b]);[run.layout[a],run.layout[b]]=[run.layout[b],run.layout[a]];}run.swaps.push(pairs);}
 run.readyAt=now+3000+7*700+400;
}
const pub=r=>({id:r.id,round:r.round,found:r.found,done:!!r.done,won:!!r.won,targets:r.done?[]:r.targets,swaps:r.done?[]:r.swaps,last:r.last||[]});
export function eyeAction(s,input,now,seed){
 if(input.action==='eye-start'){const r={id:input.requestId,round:1,found:0,startedAt:now};setup(r,now,seed);s.eyeRun=r;return {eye:pub(r)};}
 const r=s.eyeRun;if(!r||r.id!==input.runId||r.done||r.round!==input.round||now-r.startedAt>1800000)throw Error('MINE_EYE_RUN');
 if(now<r.readyAt)throw Error('MINE_EYE_TIME');
 if(!Array.isArray(input.picks)||input.picks.length!==2||new Set(input.picks).size!==2||input.picks.some(x=>!Number.isInteger(x)||x<0||x>19))throw Error('MINE_EYE_INPUT');
 r.last=input.picks.map(slot=>({slot,treasure:r.targets.includes(r.layout[slot])}));r.found+=r.last.filter(x=>x.treasure).length;
 r.won=r.found===2;r.done=r.won||r.round===3;
 if(r.won)recordQuest(s,'eye-success',now);
 if(!r.done){r.round++;setup(r,now,seed);}
 return {eye:pub(r)};
}
