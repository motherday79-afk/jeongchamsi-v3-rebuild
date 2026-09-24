const TAU=Math.PI*2;
function stroke(c,color,width,draw){c.strokeStyle=color;c.lineWidth=width;c.beginPath();draw();c.stroke();}
function crystal(c,x,y,s,color){c.save();c.translate(x,y);c.fillStyle=color;c.beginPath();c.moveTo(0,-s);c.lineTo(s*.55,0);c.lineTo(0,s);c.lineTo(-s*.55,0);c.closePath();c.fill();stroke(c,'#ffffffaa',1,()=>{c.moveTo(0,-s);c.lineTo(0,s);});c.restore();}
function ribbon(c,L,t,color,width,offset=0){stroke(c,color,width,()=>{for(let j=0;j<=32;j++){const y=-22+j*(L+36)/32,x=Math.sin(y/36+t+offset)*(24+9*Math.cos(y/50));j?c.lineTo(x,y):c.moveTo(x,y);}});}
function electric(c,L,t,offset=0){stroke(c,'#268cffa0',7,()=>{for(let j=0;j<=15;j++){const y=j*L/15,x=offset+Math.sin(j*9+Math.floor(t*12))*13;j?c.lineTo(x,y):c.moveTo(x,y);}});stroke(c,'#d9faff',2,()=>{for(let j=0;j<=15;j++){const y=j*L/15,x=offset+Math.sin(j*9+Math.floor(t*12))*13;j?c.lineTo(x,y):c.moveTo(x,y);}});}
// All coordinates are weapon-local: head at (0,0), handle along +Y.
export function drawWeaponAura(front,back,a,id,time,charged,quiet,texture,part){
 const t=quiet?1:time/1000,L=a.length,gain=charged?1.18:1;
 for(const [c,foreground] of [[back,false],[front,true]]){
  c.save();c.translate(...a.head);c.rotate(a.angle);c.globalAlpha=foreground?.92:.85;c.lineCap='round';c.lineJoin='round';
  c.globalCompositeOperation=id==='dark'?'source-over':'lighter';
  if(!foreground&&texture){c.save();c.beginPath();c.ellipse(0,0,105,58,0,0,TAU);c.rect(-49,0,98,L+25);c.clip();c.globalAlpha=.64; c.drawImage(texture,-110,-65,220,L+110);c.restore();}
  if(id==='dark'){
   if(!foreground){for(let i=0;i<14;i++){const y=-15+(i/13)*(L+20),x=Math.sin(t*1.5+i*.9)*29,r=(24+8*Math.sin(t+i))*gain;const g=c.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,'#050008f5');g.addColorStop(.56,'#140514df');g.addColorStop(.83,'#780b2680');g.addColorStop(1,'#21001100');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}}
   else {c.globalAlpha=.55+.35*Math.pow(Math.sin(t*2.5),2);for(let i=0;i<3;i++)stroke(c,i===1?'#ff334b':'#a30d35',i===1?2.5:4,()=>{for(let j=0;j<9;j++){const y=L*j/8,x=Math.sin(j*2.6+i*4+t*.8)*13+(i-1)*13;j?c.lineTo(x,y):c.moveTo(x,y);}});}
  }else if(id==='mystic'){
   if(!foreground){ribbon(c,L,t*1.8,'#842fff99',12);ribbon(c,L,-t*1.3,'#d185ff',3,2);}
   else for(let i=0;i<6;i++){const v=t*.8+i*TAU/6;crystal(c,Math.cos(v)*47,-8+(Math.sin(v)+1)*L*.48,7+2*Math.sin(v),'#bd74ff');}
  }else if(id==='dimension'){
   for(let i=0;i<(foreground?3:5);i++){const y=L*(i+.3)/(foreground?3:5),v=t*.6+i,x=Math.sin(v)*35;c.save();c.translate(x,y);c.rotate(v*.4);const color=`hsl(${(i*72+t*35)%360} 95% 78%)`;c.globalAlpha=foreground?.9:.65;stroke(c,color,foreground?2:5,()=>{c.moveTo(-17,-19);c.lineTo(7,-12);c.lineTo(-3,4);c.lineTo(18,19);});if(foreground)crystal(c,10,-8,7,color);c.restore();}
  }else if(id==='heaven'){
   if(foreground){c.save();c.translate(0,-24);c.rotate(Math.sin(t*.5)*.12);stroke(c,'#ffce55',6,()=>c.ellipse(0,0,58,15,0,0,TAU));stroke(c,'#fff8d6',2,()=>c.ellipse(0,0,59,16,0,0,TAU));c.restore();}
   else {ribbon(c,L,t*.5,'#ffe8a480',9);for(let i=0;i<5;i++){const y=L-((t*26+i*L/5)%(L+45)),x=Math.sin(t+i*1.3)*40;if(texture)part(c,texture,id,x,y,27,Math.sin(t+i)*.5);}}
  }else if(id==='lightning'){
   if(foreground){electric(c,L,t,8);c.save();c.rotate(Math.PI/2);electric(c,86,t+2,-8);c.restore();}
   else {electric(c,L,t+.4,-23);for(let i=0;i<3;i++){c.save();c.translate(Math.sin(i*3+t)*26,L*i/3);c.rotate(i%2?1:-1);electric(c,48,t+i);c.restore();}}
  }else if(id==='wind'){
   if(!foreground){for(let i=0;i<3;i++){c.save();c.translate(0,L*(i+.25)/3);c.rotate(-.3);stroke(c,i===1?'#b0fff1':'#41cdb8aa',3+i,()=>c.ellipse(0,0,57,20,0,t*1.8+i,t*1.8+i+4.7));c.restore();}}
   else if(texture)for(let i=0;i<3;i++){const v=t*2+i*TAU/3;part(c,texture,id,Math.cos(v)*57,L*.45+Math.sin(v)*L*.52,48,v+Math.PI/2);}
  }
  c.restore();
 }
}
export function drawWeaponMote(c,id,p,alpha,texture,part){
 c.save();c.globalAlpha=alpha;c.translate(p.x,p.y);c.rotate(p.spin+p.life);
 if(id==='heaven'&&texture)part(c,texture,id,0,0,p.size+15,0);
 else if(id==='wind'&&texture)part(c,texture,id,0,0,p.size+20,0);
 else if(id==='dark'){c.globalCompositeOperation='source-over';c.fillStyle='#170511';c.beginPath();c.ellipse(0,0,p.size*1.8,p.size,0,0,TAU);c.fill();stroke(c,'#ed234b',2,()=>{c.moveTo(-p.size,0);c.lineTo(0,-3);c.lineTo(p.size,2);});}
 else if(id==='lightning'){stroke(c,'#a3e6ff',2,()=>{c.moveTo(-p.size,-p.size);c.lineTo(1,0);c.lineTo(-2,2);c.lineTo(p.size,p.size);});}
 else crystal(c,0,0,p.size,id==='dimension'?`hsl(${p.spin*60} 95% 78%)`:'#bc78ff');
 c.restore();
}
