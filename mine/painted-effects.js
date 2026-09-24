// Each tool owns a painted 4x3 atlas: aura, slash, then ground impact.
// Keep only three decoded atlases to bound memory while trying equipment.
const CELL=384,cache=new Map(),pending=new Map();
let selected='';
const styles={
 rust:{color:'#bc9470',aura:0,slash:.60,impact:.48,speed:4},
 iron:{color:'#bacdd9',aura:0,slash:.72,impact:.57,speed:5},
 silver:{color:'#b5e6ff',aura:.70,slash:.84,impact:.73,speed:5},
 gold:{color:'#ffd16a',aura:.82,slash:.92,impact:.85,speed:5},
 mystic:{color:'#b969ff',aura:1,slash:1,impact:1,speed:6},
 dimension:{color:'#c7bbff',aura:1.06,slash:1.03,impact:1,speed:5},
 heaven:{color:'#ffe4a3',aura:1.08,slash:1.05,impact:1,speed:5},
 lightning:{color:'#65bcff',aura:1,slash:1.05,impact:1,speed:9},
 wind:{color:'#85f1db',aura:1.10,slash:1.08,impact:1,speed:7}
};
function soften(image){
 const frames=[];
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const tile=document.createElement('canvas');tile.width=tile.height=CELL;
  const c=tile.getContext('2d');c.drawImage(image,col*CELL,row*CELL,CELL,CELL,0,0,CELL,CELL);
  c.globalCompositeOperation='destination-in';
  for(const vertical of [true,false]){
   const g=c.createLinearGradient(0,0,vertical?0:CELL,vertical?CELL:0);
   g.addColorStop(0,'#0000');g.addColorStop(.08,'#000');
   g.addColorStop(vertical&&row===0?.82:.92,'#000');g.addColorStop(1,'#0000');
   c.fillStyle=g;c.fillRect(0,0,CELL,CELL);
  }frames.push(tile);
 }return frames;
}
export function hasPaintedEffects(id){return cache.has(id);}
export function loadPaintedEffects(id,ready){
 if(!styles[id])return;
 selected=id;
 if(cache.has(id)){const f=cache.get(id);cache.delete(id);cache.set(id,f);return;}
 if(pending.has(id)){if(ready)pending.get(id).add(ready);return;}
 pending.set(id,new Set(ready?[ready]:[]));
 const image=new Image();
 image.onload=()=>{
  cache.set(id,soften(image));while(cache.size>3)cache.delete([...cache.keys()].find(key=>key!==selected));
  const callbacks=pending.get(id);pending.delete(id);for(const fn of callbacks||[])fn();
 };
 image.onerror=()=>pending.delete(id);
 image.src='/assets/mine/effects-296/'+id+'-atlas.webp';
}
function sequence(c,id,row,frame,x,y,w,h,alpha=1,loop=false){
 const frames=cache.get(id);if(!frames)return;
 const f=Math.max(0,Math.min(loop?3.999:3,frame)),i=Math.floor(f),mix=f-i;
 c.save();c.globalAlpha*=Math.max(0,Math.min(1,alpha))*(1-mix);
 c.drawImage(frames[row*4+i],x,y,w,h);c.restore();
 if(mix){c.save();c.globalAlpha*=Math.max(0,Math.min(1,alpha))*mix;
  c.drawImage(frames[row*4+(loop?(i+1)%4:Math.min(3,i+1))],x,y,w,h);c.restore();}
}
function glow(c,x,y,r,color,alpha){
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha*=alpha;
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#fff8eb');
 g.addColorStop(.15,color);g.addColorStop(1,color+'00');
 c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
}
export function paintedAura(front,back,a,id,now,charge,quiet){
 const style=styles[id];if(!cache.has(id)||!style)return false;if(!style.aura)return true;
 const f=quiet?1:(now/1000*style.speed)%4,s=style.aura,
 width=(charge?207:262)*s,height=a.length+185*s,top=-125*s;
 back.save();back.translate(...a.head);back.rotate(a.angle);
 sequence(back,id,0,f,-width/2,top,width,height,.96,true);
 back.save();back.rotate(Math.PI/2);
 sequence(back,id,0,(f+1.5)%4,-98*s,-143*s,196*s,264*s,.65,true);back.restore();back.restore();
 front.save();front.translate(...a.head);front.rotate(a.angle);front.globalCompositeOperation='lighter';
 sequence(front,id,0,f,-width/2,top,width,height,charge?.28:.16,true);
 glow(front,0,0,charge?40:28,style.color,charge?.40:.19);front.restore();return true;
}
export function paintedSlash(c,b,id,quiet){
 if(!cache.has(id)||quiet)return false;
 const t=1-b.life/b.max,angle=b.start+(b.finish-b.start)*Math.min(1,t*1.6),size=b.r*2.85*styles[id].slash;
 c.save();c.translate(b.cx,b.cy);c.rotate(angle-.45);
 sequence(c,id,1,t*3,-size/2,-size/2,size,size,Math.sin(Math.PI*Math.min(.99,t))*.96);
 c.restore();return true;
}
export function paintedImpact(front,back,b,id,quiet){
 if(!cache.has(id))return false;
 const t=1-b.life/b.max,fade=Math.min(1,t*12)*Math.min(1,(1-t)*3),
 w=(quiet?160:300+55*Math.sin(t*Math.PI))*styles[id].impact,h=w*.85;
 back.save();sequence(back,id,2,t*3,b.x-w/2,b.y-h*.76,w,h,fade);back.restore();
 front.save();front.globalCompositeOperation='lighter';
 if(!quiet)sequence(front,id,2,t*3,b.x-w/2,b.y-h*.76,w,h,fade*.2);
 glow(front,b.x,b.y,(quiet?32:75)*styles[id].impact,styles[id].color,Math.max(0,1-t*5)*.6);
 front.restore();return true;
}
