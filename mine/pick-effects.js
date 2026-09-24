import {PICK_SOCKETS} from './pick-sockets.js?v=285';
import {equippedPick} from './pick-catalog.js?v=285';
const PAD=260,W=540,H=710;
const rank={rust:0,iron:1,silver:2,gold:3,mystic:4,dimension:5,dark:6,heaven:7,lightning:8,wind:9};
export function makePickEffects(canvas,{getState,reduced=()=>false}={}){
 const ctx=canvas.getContext('2d');canvas.width=W+PAD*2;canvas.height=H+PAD*2;
 let particles=[],bursts=[],trails=[],active=false,last=0,raf=0,pick=null,tip=[350,400],phase=0;
 const fallback=[[430,415],[90,210],[105,135],[160,70],[435,570],[460,664],[440,620],[430,430]];
 const sockets=()=>PICK_SOCKETS[(getState()?.character||'orc')+'-'+pick.visual]||fallback;
 function clear(){cancelAnimationFrame(raf);raf=0;particles=[];bursts=[];trails=[];active=false;ctx.clearRect(0,0,canvas.width,canvas.height);}
 function wake(){if(!raf){last=performance.now();raf=requestAnimationFrame(draw);}}
 function begin(){pick=equippedPick(getState());tip=sockets()[0];phase=0;active=true;wake();}
 function frame(n){if(!pick)return;tip=sockets()[n]||sockets()[0];phase=n;if(active&&n>=1&&n<=6){trails.push({x:tip[0],y:tip[1],life:.7});trails=trails.slice(-10);}wake();}
 function impact(){pick=equippedPick(getState());const [x,y]=sockets()[5],power=rank[pick.visual]||0,quiet=reduced();
  const count=quiet?5:12+power*7;for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=80+Math.random()*(180+power*35),life=.45+Math.random()*.55;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-90,life,max:life,size:2+Math.random()*(3+power*.7),hue:Math.random()*360});}
  particles=particles.slice(-220);bursts.push({x,y,life:quiet?.35:1.05,max:quiet?.35:1.05,power,seed:Math.random()*10});bursts=bursts.slice(-5);wake();
 }
 function glow(x,y,r,color,alpha=1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#fff9eacc');g.addColorStop(.16,color);g.addColorStop(1,color+'00');ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 function ring(x,y,r,tilt,color,width=4){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,r,r*.32,tilt,0,Math.PI*2);ctx.stroke();}
 function bolt(x,y,length,angle,seed){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);for(let i=1;i<=8;i++)ctx.lineTo(Math.sin(i*7+seed)*19,-length*i/8);ctx.strokeStyle=pick.color;ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle='#f0fcff';ctx.lineWidth=2.5;ctx.stroke();ctx.restore();}
 function ghostPick(x,y,a,size){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(size,size);ctx.globalAlpha*=.8;ctx.strokeStyle='#a9f9ff';ctx.fillStyle='#d7ffff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,37);ctx.lineTo(0,-18);ctx.stroke();ctx.beginPath();ctx.moveTo(-40,0);ctx.quadraticCurveTo(-12,-45,26,-27);ctx.lineTo(42,-7);ctx.quadraticCurveTo(10,-26,-40,0);ctx.fill();ctx.restore();}
 function draw(now){raf=0;const dt=Math.min(.05,(now-last)/1000);last=now;ctx.clearRect(0,0,canvas.width,canvas.height);if(!pick)return;const power=rank[pick.visual]||0,id=pick.visual,quiet=reduced();
  ctx.save();ctx.translate(PAD,PAD);ctx.globalCompositeOperation='lighter';ctx.shadowColor=pick.color;ctx.shadowBlur=quiet?0:18;
  if(active&&power>=2){const pulse=quiet?1:1+Math.sin(now/180)*.1;glow(tip[0],tip[1],(30+power*7)*pulse,pick.color,.55);}
  trails=trails.filter(p=>(p.life-=dt)>0);
  if(!quiet&&trails.length>1){ctx.globalAlpha=.8;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=pick.color;ctx.lineWidth=power<2?4:10+power*2;ctx.beginPath();trails.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.globalAlpha=.85;ctx.strokeStyle='#fffbe9';ctx.lineWidth=power<2?1:3;ctx.stroke();}
  if(active&&!quiet&&power>=4){
   if(id==='mystic'||id==='dimension'){for(let i=0;i<6;i++){const a=now/600+i*Math.PI/3,x=tip[0]+Math.cos(a)*65,y=tip[1]+Math.sin(a)*32;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=.75;ctx.fillStyle=id==='dimension'?`hsl(${i*60} 95% 80%)`:pick.color;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(7,0);ctx.lineTo(0,13);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.restore();}}
   if(id==='dark'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.65;ctx.strokeStyle='#1c071fee';ctx.lineWidth=22;ctx.beginPath();ctx.arc(tip[0],tip[1],62,now/300,now/300+4.5);ctx.stroke();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ff3157';ctx.lineWidth=4;ctx.stroke();}
   if(id==='lightning')for(let i=0;i<3;i++)bolt(tip[0],tip[1],80+i*15,i*2+now/450,Math.floor(now/90)+i);
   if(id==='heaven'){ctx.globalAlpha=.65;ring(tip[0],tip[1]-15,65,-.3,'#ffeda6',5);}
   if(id==='wind'){ctx.globalAlpha=.7;for(let i=0;i<5;i++){const a=now/400+i*Math.PI*2/5;ghostPick(250+Math.cos(a)*185,350+Math.sin(a)*185,a+.8,.8);}ring(250,380,210,-.4,pick.color,5);}
  }
  for(const b of bursts){b.life-=dt;const t=1-b.life/b.max,fade=Math.max(0,1-t),radius=(35+b.power*17)*(1+t);ctx.globalAlpha=fade;
   glow(b.x,b.y,quiet?35:radius,pick.color,fade*(power<2?.45:.8));ctx.globalAlpha=fade;
   if(power>=2)ring(b.x,b.y,20+t*(85+power*20),0,pick.color,Math.max(2,8*(1-t)));
   if(!quiet&&id==='dimension'){for(let j=0;j<3;j++)ring(b.x,b.y-20,45+t*(100+j*35),j*.9,`hsl(${j*100+t*180} 95% 80%)`,5);}
   if(!quiet&&id==='mystic'){ctx.save();ctx.translate(b.x,b.y);ctx.scale(1,.4);ctx.rotate(t*1.4);ctx.strokeStyle=pick.color;ctx.lineWidth=5;ctx.beginPath();for(let j=0;j<=6;j++){const a=j*Math.PI/3;j?ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius):ctx.moveTo(radius,0);}ctx.stroke();ctx.restore();}
   if(!quiet&&id==='dark'){ctx.globalCompositeOperation='source-over';glow(b.x,b.y,160*(1-t*.3),'#240b30',fade*.8);ctx.globalCompositeOperation='lighter';for(let j=0;j<5;j++)bolt(b.x,b.y,110+t*100,j*1.25,b.seed+j);}
   if(!quiet&&id==='heaven'){const g=ctx.createLinearGradient(b.x,b.y-550,b.x,b.y);g.addColorStop(0,'#fff8cd00');g.addColorStop(.8,'#ffdc8799');g.addColorStop(1,'#fffdefff');ctx.fillStyle=g;ctx.globalAlpha=fade*.8;ctx.fillRect(b.x-45,b.y-550,90,550);ring(b.x,b.y,80+t*170,0,'#fff4b5',6);}
   if(!quiet&&id==='lightning'){bolt(b.x,b.y,480,0,b.seed);for(let j=0;j<4;j++)bolt(b.x,b.y,180,j*1.55,b.seed+j);}
   if(!quiet&&id==='wind'){for(let j=0;j<3;j++){ctx.globalAlpha=fade*.65;ring(b.x,b.y-j*40,60+t*180,j*.35,pick.color,9-j*2);ghostPick(b.x+Math.cos(t*9+j*2)*130,b.y-70+Math.sin(t*9+j*2)*90,t*9,1);}}
  }bursts=bursts.filter(b=>b.life>0);
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=id==='dimension'?`hsl(${p.hue} 90% 80%)`:pick.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*4);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();}particles=particles.filter(p=>p.life>0);
  ctx.restore();if(active||particles.length||bursts.length||trails.length)raf=requestAnimationFrame(draw);
 }
 return {begin,frame,impact,end:()=>{active=false;},clear};
}
