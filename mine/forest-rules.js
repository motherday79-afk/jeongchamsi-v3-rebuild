import {FOREST_SONG} from './forest-song.js';
export const FOREST_DURATION=FOREST_SONG.duration;
export const FOREST_MODES={easy:{label:'이지',window:180,travel:2200},normal:{label:'노멀',window:140,travel:1800},hard:{label:'하드',window:110,travel:1500}};
export function forestChart(mode){
 if(!FOREST_MODES[mode])throw Error('MINE_FOREST_MODE');
 const beat=60000/FOREST_SONG.bpm,notes=[],last=Array(5).fill(-1000),pattern=[0,2,4,1,3,2,0,3,1,4,2,3,0,4,1,2];
 const step=mode==='easy'?1:mode==='normal'?.5:.25;
 for(let b=4,index=0;FOREST_SONG.offset+b*beat<FOREST_DURATION-2500;b+=step,index++){
  if(mode==='hard'&&index%16===15)continue;
  const at=Math.round(FOREST_SONG.offset+b*beat),lane=pattern[index%pattern.length];
  const add=(l,hold=0)=>{if(at<last[l]+100||notes.filter(n=>n.at<=at&&n.at+n.hold>=at).length>=2)return;notes.push({at,lane:l,hold});last[l]=at+hold;};
  add(lane,mode==='hard'&&index%16===0?Math.round(beat*1.5):0);
  if(mode!=='easy'&&index%16===8)add((lane+2)%5);
 }
 return notes.sort((a,b)=>a.at-b.at||a.lane-b.lane).map((n,id)=>({...n,id}));
}
export function createJudgment(mode){
 const notes=forestChart(mode).map(n=>({...n,grade:null,head:null})),window=FOREST_MODES[mode].window,held=Array(5).fill(false);
 let perfect=0,good=0,miss=0,extra=0,combo=0,maxCombo=0,lastTime=-1;
 const resolve=(n,grade)=>{if(n.grade)return;n.grade=grade;if(grade==='miss'){miss++;combo=0;}else{if(grade==='perfect')perfect++;else good++;combo++;maxCombo=Math.max(combo,maxCombo);}};
 function advance(time){
  lastTime=Math.max(lastTime,time);
  for(const n of notes){if(n.grade)continue;if(n.head){if(!held[n.lane])resolve(n,'miss');else if(time>=n.at+n.hold)resolve(n,n.head);}else if(time>n.at+window)resolve(n,'miss');}
 }
 function input(time,lane,down){
  advance(time);if(down){if(held[lane])return null;held[lane]=true;
   const n=notes.find(n=>n.lane===lane&&!n.grade&&!n.head&&Math.abs(n.at-time)<=window);
   if(!n){extra++;combo=0;return 'empty';}const grade=Math.abs(n.at-time)<=window*.45?'perfect':'good';
   if(n.hold)n.head=grade;else resolve(n,grade);return grade;
  }held[lane]=false;for(const n of notes)if(n.lane===lane&&n.head&&!n.grade)resolve(n,time>=n.at+n.hold-65?n.head:'miss');return null;
 }
 function stats(){const points=Math.max(0,perfect+good*.7-extra*.25),accuracy=Math.round(points/notes.length*10000)/100;return {perfect,good,miss,extra,combo,maxCombo,total:notes.length,accuracy,score:Math.round(points/notes.length*1000000),cleared:accuracy>=70};}
 return {notes,held,input,advance,stats};
}
export function forestResult(mode,events){const j=createJudgment(mode);for(const [time,lane,down] of events)j.input(time,lane,down);j.advance(FOREST_DURATION);return j.stats();}
