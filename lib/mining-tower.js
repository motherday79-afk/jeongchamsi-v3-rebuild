import {PICKS,equippedPick} from '../mine/pick-catalog.js';
import {recordQuest} from './mining-quests.js';
export function publicTower(s){return {floor:Math.max(1,Number.isSafeInteger(s.towerFloor)?s.towerFloor:1),best:Math.max(0,(s.towerFloor||1)-1)};}
export function towerAction(s,input,now,seed,admin=false){
 if(input.action==='tower-reset'){if(!admin)throw Error('FORBIDDEN');s.towerFloor=1;s.towerRun=null;return {towerReset:true};}
 if(input.action==='tower-start'){
  const owned=new Set(['rust',...(s.ownedPicks||[]),...(s.paidPicks||[]),...(admin?PICKS.map(p=>p.id):[])]);
  const picks=[...owned].map(tool=>equippedPick({...s,tool}));const pick=picks.sort((a,b)=>b.amount*(b.hits+(b.extraChance||0))-a.amount*(a.hits+(a.extraChance||0)))[0];
  const floor=publicTower(s).floor,target=Math.max(9+floor,Math.ceil(10*Math.pow(1.015,Math.min(floor-1,2000))));let v=seed>>>0,total=0;const events=[];
  for(let i=0;i<20;i++){v=(Math.imul(v,1664525)+1013904223)>>>0;const hits=pick.hits+(v/4294967296<(pick.extraChance||0)?1:0);for(let h=0;h<hits;h++){events.push({at:1200+i*1500+h*140,amount:pick.amount});total+=pick.amount;}}
  let mined=0,endsAt=30000;for(const e of events){mined+=e.amount;if(mined>=target){endsAt=e.at;break;}}
  s.towerRun={id:input.requestId,floor,target,pick,events,startedAt:now,endsAt,won:total>=target,done:false};return {towerRun:{...s.towerRun}};
 }
 const r=s.towerRun;if(!r||r.id!==input.runId)throw Error('MINE_TOWER_RUN');if(r.done)return {towerRun:{...r}};
 if(now-r.startedAt<r.endsAt)throw Error('MINE_TOWER_TIME');if(now-r.startedAt>1800000)throw Error('MINE_TOWER_EXPIRED');
 r.done=true;if(r.won){s.towerFloor=r.floor+1;recordQuest(s,'tower-success',now);}return {towerRun:{...r}};
}
