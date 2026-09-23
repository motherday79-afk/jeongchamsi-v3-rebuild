const clamp=v=>Math.max(0,Math.min(1,v));
export function contactFrame(progress,last=false,reduced=false){
 const t=clamp(progress),empty={depth:0,glow:0,radius:0,beam:0,particles:[]};if(reduced||t>=1)return empty;
 const depth=t<.25?Math.sin(t/.25*Math.PI/2)*(last?6:4):t<.44?(last?6:4):t<.88?(last?6:4)*(1-Math.sin((t-.44)/.44*Math.PI/2)):0;
 const age=clamp(t/.95),glow=t===0?0:(1-age)**1.3*(last?.95:.55),count=last?14:5;
 const particles=Array.from({length:count},(_,i)=>{const a=(-175+i*(last?25:72))*Math.PI/180,s=6+Math.sqrt(age)*(last?62:30);return {x:Math.cos(a)*s,y:Math.sin(a)*s*.38-Math.sin(Math.PI*age)*(last?28:10),scale:(last?.9:.55)*(1-age*.65),opacity:t===0?0:Math.sin(Math.PI*age)**.4,angle:i*19};});
 return {depth,glow,radius:(last?35:18)+(last?45:20)*age,beam:last?Math.sin(Math.PI*age)**.45*.8:0,particles};
}
export function tileSides({x,y,w,h},depth=0){const top=[[x-w/2,y+depth],[x,y+h/2+depth],[x+w/2,y+depth]],bottom=[[x-w/2,y+12],[x,y+h/2+12],[x+w/2,y+12]];return {top,bottom,left:`M${top[0]}L${top[1]}L${bottom[1]}L${bottom[0]}Z`,right:`M${top[1]}L${top[2]}L${bottom[2]}L${bottom[1]}Z`};}
