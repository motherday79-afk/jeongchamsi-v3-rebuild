export function passengerPose({active,playing,speaking,intro,seconds=0,cues=[]}){
 if(!active||!playing)return 'still';
 if(!speaking)return 'rest';
 if(intro&&seconds<2.3)return 'greet';
 let index=-1;for(let i=0;i<cues.length;i++){if(cues[i].start>seconds)break;index=i;}
 const cue=cues[index];
 if(cue&&seconds>=cue.start+cue.duration)return 'rest';
 const elapsed=cue?seconds-cue.start:seconds%5.3;
 if(elapsed<.2||elapsed>2.5)return 'rest';
 return ['nod','explain','lean','nod','rest'][Math.max(0,index<0?Math.floor(seconds/5.3):index)%5];
}
