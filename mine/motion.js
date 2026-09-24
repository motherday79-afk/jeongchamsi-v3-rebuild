// One cycle lasts 1500ms. The impact frame receives a short hold before recoil.
export const SWING_FRAMES=[
 {at:0,frame:0},{at:180,frame:1},{at:380,frame:2},{at:590,frame:3},
 {at:690,frame:4},{at:745,frame:5},{at:875,frame:6},{at:1060,frame:7},{at:1350,frame:0}
];
export function makeMinerMotion({setFrame,impact,schedule=setTimeout,cancel=clearTimeout}){
 let ids=[],generation=0;
 function stop(){generation++;ids.forEach(cancel);ids=[];setFrame(0);}
 function play(reduced=false,hits=1){
  stop();const current=generation;
  const steps=reduced?[{at:745,frame:5},{at:1100,frame:0}]:hits===1?SWING_FRAMES:[...SWING_FRAMES.filter(s=>s.at<=875),...Array.from({length:hits-1},(_,i)=>[{at:930+i*170,frame:4},{at:990+i*170,frame:5},{at:1050+i*170,frame:6}]).flat(),{at:1280,frame:7},{at:1430,frame:0}];
  for(const step of steps){
   ids.push(schedule(()=>{if(current!==generation)return;setFrame(step.frame);if(step.frame===5)impact();},step.at));
  }
 }
 return {play,stop};
}
