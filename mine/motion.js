// One cycle lasts 1500ms. The impact frame receives a short hold before recoil.
export const SWING_FRAMES=[
 {at:0,frame:0},{at:180,frame:1},{at:380,frame:2},{at:590,frame:3},
 {at:690,frame:4},{at:745,frame:5},{at:875,frame:6},{at:1060,frame:7},{at:1350,frame:0}
];
export function makeMinerMotion({setFrame,impact,schedule=setTimeout,cancel=clearTimeout}){
 let ids=[],generation=0;
 function stop(){generation++;ids.forEach(cancel);ids=[];setFrame(0);}
 function play(reduced=false){
  stop();const current=generation;
  for(const step of reduced?[{at:760,frame:5},{at:880,frame:0}]:SWING_FRAMES){
   ids.push(schedule(()=>{if(current!==generation)return;setFrame(step.frame);if(step.frame===5)impact();},step.at));
  }
 }
 return {play,stop};
}
