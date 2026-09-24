// Slow lift, fast downstroke; extra hits visibly lift again before striking.
export const SWING_FRAMES=[
 {at:0,frame:0},{at:180,frame:1},{at:380,frame:2},{at:590,frame:3},
 {at:690,frame:4},{at:745,frame:5},{at:800,frame:6},{at:980,frame:7},{at:1280,frame:0}
];
export function makeMinerMotion({setFrame,impact,schedule=setTimeout,cancel=clearTimeout}){
 let ids=[],generation=0;
 function stop(){generation++;ids.forEach(cancel);ids=[];setFrame(0);}
 function play(reduced=false,hits=1){
  stop();const current=generation,count=Math.max(1,Math.min(3,Math.trunc(Number(hits))||1));
  const extra=Array.from({length:count-1},(_,i)=>[
   {at:795+i*230,frame:6},{at:830+i*230,frame:2},{at:880+i*230,frame:3},
   {at:930+i*230,frame:4},{at:975+i*230,frame:5}
  ]).flat();
  const last=745+(count-1)*230;
  const steps=reduced?[...Array.from({length:count},(_,i)=>({at:745+i*230,frame:5})),{at:last+120,frame:0}]
   :count===1?SWING_FRAMES:[...SWING_FRAMES.filter(s=>s.at<=745),...extra,{at:last+45,frame:6},{at:last+105,frame:7},{at:last+220,frame:0}];
  for(const step of steps)ids.push(schedule(()=>{if(current!==generation)return;setFrame(step.frame);if(step.frame===5)impact();},step.at));
 }
 return {play,stop};
}
