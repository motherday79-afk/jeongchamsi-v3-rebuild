// Dedicated painted dark VFX: four frames each of flame, cleave and rupture.
let sheet=null,loading=false,failed=false;const listeners=new Set(),CELL=384,TAU=Math.PI*2;
export function loadDarkEffects(ready){if(sheet)return sheet;if(ready)listeners.add(ready);if(loading||failed)return null;loading=true;const img=new Image();img.onload=()=>{sheet=img;loading=false;for(const fn of listeners)fn();listeners.clear();};img.onerror=()=>{failed=true;loading=false;listeners.clear();};img.src='/assets/mine/effects-294/dark-atlas.webp';return null;}
function cell(c,row,frame,x,y,w,h,alpha=1){if(!sheet)return;c.save();c.globalAlpha*=Math.max(0,Math.min(1,alpha));c.drawImage(sheet,(frame%4)*CELL,row*CELL,CELL,CELL,x,y,w,h);c.restore();}
function sequence(c,row,frame,x,y,w,h,alpha=1,loop=false){const f=Math.max(0,Math.min(loop?3.999:3,frame)),i=Math.floor(f),mix=f-i;cell(c,row,i,x,y,w,h,alpha*(1-mix));if(mix)cell(c,row,loop?(i+1)%4:Math.min(3,i+1),x,y,w,h,alpha*mix);}
function redGlow(c,x,y,r,alpha){c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#ff7687');g.addColorStop(.12,'#ff1646');g.addColorStop(.42,'#9e002b99');g.addColorStop(1,'#41000e00');c.globalAlpha*=alpha;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
export function darkAura(front,back,a,now,charge,quiet){
 if(!sheet)return false;const t=quiet?0:now/1000,L=a.length,pulse=.7+.3*Math.sin(t*3)**2,f=quiet?1:(t*6)%4;
 back.save();back.translate(...a.head);back.rotate(a.angle);back.globalCompositeOperation='source-over';
 // Flame base grips the handle, bright tongues rise through and above the blade.
 const width=charge?162:205,height=L+145;
 sequence(back,0,f,-width/2,-95,width,height,.98,true);
 back.save();back.translate(0,-4);back.rotate(Math.PI/2);sequence(back,0,(f+1.5)%4,-77,-112,154,206,.85,true);back.restore();
 redGlow(back,0,0,charge?96:70,(charge?.64:.32)*pulse);back.restore();
 front.save();front.translate(...a.head);front.rotate(a.angle);
 // A faint emissive pass follows the same painted flame, leaving the tool readable.
 front.globalCompositeOperation='lighter';sequence(front,0,f,-width/2,-95,width,height,charge?.28:.12,true);
 redGlow(front,0,0,charge?39:26,(charge?.62:.27)*pulse);
 if(!quiet)for(let i=0;i<10;i++){const v=(t*.42+i/10)%1,x=Math.sin(i*7+t*1.5)*(20+v*26),y=L*.85-v*(L+110);front.globalAlpha=(1-v)*.7;front.fillStyle=i%3?'#d72145':'#ff9aad';front.fillRect(x,y,1.7,3.2);}
 front.restore();return true;
}
export function darkSlash(c,b,quiet){if(!sheet||quiet)return false;const t=1-b.life/b.max,angle=b.start+(b.finish-b.start)*Math.min(1,t*1.6),size=b.r*2.35;
 c.save();c.translate(b.cx,b.cy);c.rotate(angle-.45);c.globalCompositeOperation='source-over';sequence(c,1,t*3,-size/2,-size/2,size,size,Math.sin(Math.PI*Math.min(.99,t))*.96);c.restore();return true;}
export function darkImpact(front,back,b,quiet){if(!sheet)return false;const t=1-b.life/b.max,fade=Math.min(1,t*12)*Math.min(1,(1-t)*3),w=quiet?160:300+55*Math.sin(t*Math.PI),h=w*.85;
 back.save();back.globalCompositeOperation='source-over';sequence(back,2,t*3,b.x-w/2,b.y-h*.76,w,h,fade);back.restore();
 front.save();redGlow(front,b.x,b.y,quiet?32:90,Math.max(0,1-t*5)*.8);
 if(!quiet){front.globalCompositeOperation='lighter';sequence(front,2,t*3,b.x-w/2,b.y-h*.76,w,h,fade*.2);
  for(let i=0;i<16;i++){const angle=i*2.399+Math.sin(b.seed+i),radius=(45+i%4*20)*t,x=b.x+Math.cos(angle)*radius,y=b.y+Math.sin(angle)*radius*.48-80*t*(1-t);front.globalAlpha=(1-t)*.8;front.fillStyle=i%4?'#d72047':'#ff8a9b';front.fillRect(x,y,2,4);}}
 front.restore();return true;
}
