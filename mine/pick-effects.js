import {PICK_SOCKETS} from './pick-sockets.js?v=285';
import {equippedPick} from './pick-catalog.js?v=285';
export function makePickEffects(canvas,{getState,reduced=()=>false}={}){
 const ctx=canvas.getContext('2d');canvas.width=540;canvas.height=710;
 let particles=[],rings=[],trails=[],active=false,last=0,raf=0,pick=null;
 const fallbackSockets=[[430,415],[90,210],[105,135],[160,70],[435,570],[460,664],[440,620],[430,430]];
 function clear(){cancelAnimationFrame(raf);raf=0;particles=[];rings=[];trails=[];active=false;ctx.clearRect(0,0,540,710);}
 function wake(){if(!raf){last=performance.now();raf=requestAnimationFrame(draw);}}
 function sockets(){const s=getState();return PICK_SOCKETS[(s.character||'orc')+'-'+pick.visual]||fallbackSockets;}
 function begin(){pick=equippedPick(getState());active=true;wake();}
 function frame(n){if(!active||!pick||reduced())return;const [x,y]=sockets()[n]||sockets()[0];if(n>=1&&n<=5){trails.push({x,y,life:.32});wake();}}
 function impact(){pick=equippedPick(getState());const id=pick.visual,[x,y]=sockets()[5],magic=!['rust','iron'].includes(id),count=reduced()?4:id==='rust'?8:magic?26:14;
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=80+Math.random()*200;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,life:.4+Math.random()*.35,size:magic?2+Math.random()*4:1+Math.random()*3});}
  rings.push({x,y,life:.45,id});wake();
 }
 function draw(now){raf=0;const dt=Math.min(.05,(now-last)/1000);last=now;ctx.clearRect(0,0,540,710);if(!pick)return;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=pick.color;ctx.fillStyle=pick.color;ctx.shadowColor=pick.color;ctx.shadowBlur=12;
  trails=trails.filter(p=>(p.life-=dt)>0);if(trails.length>1){ctx.beginPath();ctx.lineWidth=pick.visual==='rust'?2:6;ctx.globalAlpha=.45;trails.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=pick.visual==='dimension'?`hsl(${(p.x+p.y)%360} 90% 80%)`:pick.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}particles=particles.filter(p=>p.life>0);
  for(const r of rings){r.life-=dt;const t=1-r.life/.45;ctx.globalAlpha=Math.max(0,r.life*1.8);ctx.lineWidth=3;
   if(!['rust','iron'].includes(r.id)){ctx.beginPath();ctx.ellipse(r.x,r.y,12+t*75,5+t*25,0,0,Math.PI*2);ctx.stroke();}
   if(['lightning','dark','dimension'].includes(r.id)){for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(r.x,r.y);for(let k=1;k<5;k++)ctx.lineTo(r.x+Math.cos(j*1.8)*k*20+(Math.random()-.5)*18,r.y-k*24+(Math.random()-.5)*18);ctx.stroke();}}
   if(r.id==='heaven'){const g=ctx.createLinearGradient(r.x,0,r.x,r.y);g.addColorStop(0,'#fff8d900');g.addColorStop(1,'#fff8d9');ctx.fillStyle=g;ctx.fillRect(r.x-18,70,36,r.y-70);}
   if(r.id==='wind'){ctx.beginPath();ctx.ellipse(r.x,r.y-30,45+t*60,20+t*25,-.4,0,Math.PI*2);ctx.stroke();}
  }rings=rings.filter(r=>r.life>0);
  if(active&&pick.visual==='wind'&&!reduced()){ctx.globalAlpha=.6;for(let i=0;i<3;i++){const a=now/400+i*Math.PI*2/3,x=280+Math.cos(a)*160,y=330+Math.sin(a)*95;ctx.save();ctx.translate(x,y);ctx.rotate(a+.8);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,25);ctx.lineTo(0,-22);ctx.moveTo(-25,-8);ctx.quadraticCurveTo(0,-35,25,-8);ctx.stroke();ctx.restore();}}
  ctx.restore();if(active||particles.length||rings.length||trails.length)raf=requestAnimationFrame(draw);
 }
 return {begin,frame,impact,end:()=>{active=false;},clear};
}
