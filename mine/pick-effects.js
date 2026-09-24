import {loadPaintedEffects,paintedAura,paintedSlash,paintedImpact,hasPaintedEffects} from './painted-effects.js?v=296';
import {loadDarkEffects,darkAura,darkSlash,darkImpact} from './dark-effects.js?v=296';
import {drawWeaponAura,drawWeaponMote} from './weapon-aura.js?v=293';
import {WEAPON_ANCHORS} from './weapon-anchors.js?v=290';
import {equippedPick} from './pick-catalog.js?v=285';
import {effectTexture,drawTexturePart} from './effect-textures.js?v=290';
const PAD=260,W=540,H=710,TAU=Math.PI*2;
const ranks={rust:0,iron:1,silver:2,gold:3,mystic:4,dimension:5,dark:6,heaven:7,lightning:8,wind:9};
export function makePickEffects(canvas,{backCanvas,getState,reduced=()=>false}={}){
 const ctx=canvas.getContext('2d'),back=(backCanvas||canvas).getContext('2d');
 for(const c of new Set([canvas,backCanvas].filter(Boolean))){c.width=W+PAD*2;c.height=H+PAD*2;}
 let pick=null,key='',phase=0,active=false,paused=true,raf=0,last=0,lastPaint=0,bursts=[],particles=[],slashes=[],texture=null;
 const fallback={head:[400,435],handle:[205,440],angle:Math.PI/2,length:195};
 const anchor=()=>WEAPON_ANCHORS[key]?.[phase]||fallback;
 function erase(){ctx.clearRect(0,0,canvas.width,canvas.height);if(back!==ctx)back.clearRect(0,0,backCanvas.width,backCanvas.height);}
 function clear(){cancelAnimationFrame(raf);raf=0;paused=true;active=false;phase=0;bursts=[];particles=[];slashes=[];erase();}
 function wake(){if(!paused&&!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(draw);}}
 function ready(){texture=effectTexture(pick?.visual);wake();}
 function sync(s=getState(),loadedKey){if(!s||document.hidden)return;const p=equippedPick(s),next=(s.character||'orc')+'-'+p.visual;if(loadedKey&&loadedKey!==next){clear();return;}
  if(key!==next){clear();key=next;pick=p;phase=0;texture=effectTexture(p.visual,ready);}else pick=p;
  paused=false;if(p.visual==='dark')loadDarkEffects(wake);else loadPaintedEffects(p.visual,wake);wake();
 }
 function begin(){sync();active=true;phase=0;wake();}
 function frame(n){
  const before=anchor();phase=n;
  if(active&&n===4&&!reduced()&&pick){const a=anchor(),cx=a.handle[0],cy=a.handle[1];
   let start=Math.atan2(before.head[1]-cy,before.head[0]-cx),finish=Math.atan2(a.head[1]-cy,a.head[0]-cx);
   while(finish<start)finish+=TAU;
   if(finish-start>Math.PI*1.3)start=finish-Math.PI*.85;
   slashes.push({cx,cy,start,finish,r:a.length+12,life:.19,max:.19});slashes=slashes.slice(-3);
  }wake();
 }
 function end(){if(!active)return;active=false;phase=0;wake();}
 function impact(){if(!pick||paused)return;const a=anchor(),power=ranks[pick.visual]||0,quiet=reduced(),x=a.head[0],y=a.head[1]+(pick.visual==='heaven'?28:18),life=quiet?.2:.72;
  bursts.push({x,y,life,max:life,seed:Math.random()*10,angle:a.angle});bursts=bursts.slice(-4);
  for(let i=0;i<(pick.visual==='dark'||hasPaintedEffects(pick.visual)?0:quiet?4:12+power*4);i++){const angle=Math.random()*TAU,speed=70+Math.random()*(65+power*8),time=.25+Math.random()*.25;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-80,life:time,max:time,size:2+Math.random()*(power+2),spin:Math.random()*TAU});}particles=particles.slice(-160);wake();
 }
 function glow(c,x,y,r,color,opacity){c.save();c.globalAlpha=opacity;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#fff9ed');g.addColorStop(.2,color);g.addColorStop(1,color+'00');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.restore();}
 function star(c,x,y,size,opacity=1){c.save();c.translate(x,y);c.globalAlpha=opacity;c.fillStyle=pick.visual==='gold'?'#ffe095':'#e6f6ff';c.beginPath();c.moveTo(0,-size);c.quadraticCurveTo(2,-2,size*.7,0);c.quadraticCurveTo(2,2,0,size);c.quadraticCurveTo(-2,2,-size*.7,0);c.quadraticCurveTo(-2,-2,0,-size);c.fill();c.restore();}
 function shaftPoint(a,t,side=0){const dx=a.handle[0]-a.head[0],dy=a.handle[1]-a.head[1],len=Math.hypot(dx,dy)||1;return [a.head[0]+dx*t-dy/len*side,a.head[1]+dy*t+dx/len*side];}
 function bolt(c,x,y,length,angle,seed,alpha){c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.lineJoin='round';c.beginPath();c.moveTo(0,0);for(let i=1;i<=9;i++)c.lineTo(Math.sin(i*7.1+seed)*18,-length*i/9);c.strokeStyle=pick.color;c.lineWidth=8;c.stroke();c.strokeStyle='#e9faff';c.lineWidth=2;c.stroke();c.restore();}
 function weaponAura(now,quiet){const a=anchor(),id=pick.visual,power=ranks[id]||0;if(power<2)return;
  const charged=active&&phase>=2&&phase<=4;
  if(id==='dark'&&darkAura(ctx,back,a,now,charged,quiet))return;
  if(id!=='dark'&&paintedAura(ctx,back,a,id,now,charged,quiet))return;
  if(power>=4){drawWeaponAura(ctx,back,a,id,now,charged,quiet,texture,drawTexturePart);return;}
  ctx.save();ctx.globalCompositeOperation='lighter';glow(ctx,...a.head,18,pick.color,charged?.65:.32);
  for(let i=0;i<3;i++){const t=quiet?i/3:(now/3600+i/3)%1,point=shaftPoint(a,t,quiet?8:Math.sin(now/800+i*2.1)*15);star(ctx,...point,3+Math.sin(t*Math.PI)*3,.35+Math.sin(t*Math.PI)*.5);}
  ctx.restore();
 }
 function impactArt(b){const id=pick.visual,power=ranks[id]||0,t=1-b.life/b.max,alpha=Math.max(0,1-t),quiet=reduced();
  if(id==='dark'&&darkImpact(ctx,back,b,quiet))return;
  if(id!=='dark'&&paintedImpact(ctx,back,b,id,quiet))return;
  ctx.save();ctx.globalCompositeOperation='lighter';if(id!=='dark')glow(ctx,b.x,b.y,quiet?35:40+power*5+t*30,pick.color,alpha*(power<2?.3:.72));ctx.globalAlpha=alpha;
  if(!quiet&&texture){
   back.save();back.translate(b.x,b.y);back.globalCompositeOperation='source-over';back.globalAlpha=alpha*(id==='dark'?.85:.5);back.rotate(b.angle+Math.sin(t*3)*.2);const s=(.3+t*.2);back.scale(s,s);back.drawImage(texture,-256,-200,512,512);back.restore();
   if(id==='heaven'){const g=ctx.createLinearGradient(b.x,b.y-230,b.x,b.y);g.addColorStop(0,'#fff1c500');g.addColorStop(.7,'#ffe79d66');g.addColorStop(1,'#fffce3cc');ctx.fillStyle=g;ctx.fillRect(b.x-30,b.y-230,60,230);for(let i=0;i<5;i++)drawTexturePart(ctx,texture,id,b.x+Math.cos(i*1.26)*t*80,b.y-50-Math.sin(i*1.26)*t*65,30,i+t);}
   if(id==='lightning'){bolt(ctx,b.x,b.y,220,0,b.seed,alpha);for(let i=0;i<3;i++)bolt(ctx,b.x,b.y,65+t*45,i*2+1,b.seed+i,alpha*.65);}
   if(id==='wind'){for(let i=0;i<4;i++){const angle=t*7+i*TAU/4;drawTexturePart(ctx,texture,id,b.x+Math.cos(angle)*(25+t*80),b.y-50+Math.sin(angle)*(15+t*45),75,angle+Math.PI/3);}}
  }
  if(!quiet&&power>=2&&power<4){ctx.strokeStyle=pick.color;ctx.lineWidth=4*(1-t)+1;ctx.globalAlpha=alpha*.55;ctx.beginPath();ctx.ellipse(b.x,b.y,20+t*(80+power*12),8+t*(25+power*4),0,0,TAU);ctx.stroke();}
  ctx.restore();
 }
 function swingArt(b){
  if(pick.visual==='dark'&&darkSlash(back,b,reduced()))return;
  if(pick.visual!=='dark'&&paintedSlash(back,b,pick.visual,reduced()))return;
  const t=1-b.life/b.max,c=back,id=pick.visual,r=b.r;
  c.save();c.translate(b.cx,b.cy);c.globalCompositeOperation=id==='dark'?'source-over':'lighter';
  c.globalAlpha=Math.sin(Math.PI*t)*.8;
  const end=b.start+(b.finish-b.start)*Math.min(1,t*1.7),start=Math.max(b.start,end-.95);
  // A filled, tapered blade flash. No sampled movement path or persistent line.
  const g=c.createRadialGradient(0,0,r*.7,0,0,r+18);g.addColorStop(0,pick.color+'00');g.addColorStop(.72,pick.color);g.addColorStop(1,'#fffbed');
  c.fillStyle=g;c.beginPath();c.arc(0,0,r+12,start,end);c.lineTo(Math.cos(end)*(r-30),Math.sin(end)*(r-30));c.arc(0,0,r-30,end,start,true);c.closePath();c.fill();
  if(texture&&id==='wind')for(let i=0;i<3;i++){const angle=end-i*.24;drawTexturePart(c,texture,id,Math.cos(angle)*r,Math.sin(angle)*r,45,angle+Math.PI/2);}
  c.restore();
 }
 function draw(now){raf=0;if(paused||document.hidden){erase();return;}if(now-lastPaint<32){raf=requestAnimationFrame(draw);return;}lastPaint=now;const dt=Math.min(.08,(now-last)/1000);last=now;erase();if(!pick)return;
  ctx.save();ctx.translate(PAD,PAD);if(back!==ctx){back.save();back.translate(PAD,PAD);}weaponAura(now,reduced());
  for(const flash of slashes){flash.life-=dt;if(flash.life>0)swingArt(flash);}slashes=slashes.filter(b=>b.life>0);
  for(const b of bursts){b.life-=dt;if(b.life>0)impactArt(b);}bursts=bursts.filter(b=>b.life>0);
  ctx.save();ctx.globalCompositeOperation='lighter';for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=pick.visual==='dimension'?`hsl(${p.spin*60} 85% 80%)`:pick.color;if((ranks[pick.visual]||0)>=4)drawWeaponMote(ctx,pick.visual,p,ctx.globalAlpha,texture,drawTexturePart);else star(ctx,p.x,p.y,p.size,ctx.globalAlpha);}ctx.restore();particles=particles.filter(p=>p.life>0);
  if(back!==ctx)back.restore();ctx.restore();if(active||bursts.length||particles.length||slashes.length||((ranks[pick.visual]||0)>=2&&!reduced()))raf=requestAnimationFrame(draw);
 }
 return {sync,begin,frame,impact,end,clear};
}
