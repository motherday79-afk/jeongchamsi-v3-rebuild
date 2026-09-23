const faces={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
export const pips=v=>{if(!faces[v])throw Error('INVALID_DIE');return [...faces[v]];};
export function diceOrientation(v){pips(v);return {1:'rotateX(0deg) rotateY(0deg)',2:'rotateX(-90deg) rotateY(0deg)',3:'rotateX(0deg) rotateY(-90deg)',4:'rotateX(0deg) rotateY(90deg)',5:'rotateX(90deg) rotateY(0deg)',6:'rotateX(0deg) rotateY(180deg)'}[v];}
export const stepTiming={travel:160,contact:100,landing:360};
export const ownerColor=owner=>owner===0?'#4BA9FF':owner===1?'#FF6DC6':'transparent';
export function pressFrames(last,reduced){if(reduced)return [{translate:'0 0px'},{translate:'0 0px'}];const d=last?7:4;return [{translate:'0 0px',offset:0},{translate:`0 ${d}px`,offset:.28},{translate:`0 ${d}px`,offset:.48},{translate:'0 0px',offset:.85},{translate:'0 0px',offset:1}];}
