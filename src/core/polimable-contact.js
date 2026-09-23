const clamp=v=>Math.max(0,Math.min(1,v));
export function contactFrame(progress,last=false,reduced=false){
 const t=clamp(progress),empty={depth:0,glow:0,radius:0,beam:0,particles:[]};if(reduced||t>=1)return empty;
 const depth=t<.25?Math.sin(t/.25*Math.PI/2)*(last?7:5):t<.44?(last?7:5):t<.88?(last?7:5)*(1-Math.sin((t-.44)/.44*Math.PI/2)):0;
 const age=clamp(t/.95),glow=t===0?0:Math.min(1,age*12)*(1-age)**.5*(last?1:.9),count=last?18:8;
 const particles=Array.from({length:count},(_,i)=>{const a=(-175+i*(last?20:45))*Math.PI/180,s=6+Math.sqrt(age)*(last?125:75);return {x:Math.cos(a)*s,y:Math.sin(a)*s*.38-Math.sin(Math.PI*age)*(last?58:30),scale:(last?1.65:1.15)*(1-age*.65),opacity:t===0?0:Math.sin(Math.PI*age)**.4,angle:i*19};});
 return {depth,glow,radius:(last?65:40)+(last?85:60)*age,beam:Math.sin(Math.PI*age)**.5*(last?.68:.38),particles};
}
export function tileSides({x,y,w,h},depth=0){const top=[[x-w/2,y+depth],[x,y+h/2+depth],[x+w/2,y+depth]],bottom=[[x-w/2,y+12],[x,y+h/2+12],[x+w/2,y+12]];return {top,bottom,left:`M${top[0]}L${top[1]}L${bottom[1]}L${bottom[0]}Z`,right:`M${top[1]}L${top[2]}L${bottom[2]}L${bottom[1]}Z`};}
