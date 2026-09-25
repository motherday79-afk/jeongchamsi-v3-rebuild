const material=new Image();material.src='/assets/mine/valley-317/materials.png';
// World-anchored dirt and bridge sections move toward the camera with the cart.
const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const mod=(n,d)=>(n%d+d)%d;
const bridgeAt=row=>{const section=mod(row,210);return section>=62&&section<133;};
function polygon(ctx,points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
function line(ctx,points,color,width){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function textured(ctx,points,bridge,row){
 if(!material.complete||!material.naturalWidth)return;
 const half=material.width/2,slice=bridge?material.height/8:24,sy=mod(row*(bridge?slice:24),material.height-slice),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
 ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(material,bridge?half:0,sy,half,slice,left,top,width,height+1);ctx.restore();
}
export function drawValleyTerrain(ctx,{w,h,time}){
 const horizon=h*.19,depth=h*.73,roadWidth=Math.min(w*.88,h*.9);
 const center=z=>w*.5+Math.sin(z*5+time/9000)*roadWidth*.13*z;
 const edge=(z,side)=>center(z)+side*roadWidth*(.07+.44*z);
 const y=z=>horizon+depth*z,travel=time/130,whole=Math.floor(travel),phase=travel-whole,rows=48;
 const dirt=['#6c5a45','#6d5b46','#6b5944','#6e5b46','#6c5944'];
 for(let i=0;i<rows;i++){
  const z0=Math.max(0,(i-1+phase)/rows),z1=(i+phase)/rows,row=whole-i;
  if(z1<=0||z0>1)continue;
  const bridge=bridgeAt(row),scale=.12+z1*.88,rough=bridge?0:(random(row)-.5)*roadWidth*.025*scale;
  const l0=edge(z0,-1),r0=edge(z0,1),l1=edge(z1,-1)+rough,r1=edge(z1,1)-rough,y0=y(z0),y1=y(z1)+1;
  // Raised sides and a deep shadow place the bridge above the ravine.
  if(bridge){
   polygon(ctx,[[l0,y0],[r0,y0],[r1+14*scale,y1+22*scale],[l1-14*scale,y1+22*scale]],'#090f12bb');
   polygon(ctx,[[l0,y0],[l1,y1],[l1,y1+10*scale],[l0,y0+10*scale]],'#211a13');
   polygon(ctx,[[r0,y0],[r1,y1],[r1,y1+10*scale],[r0,y0+10*scale]],'#302317');
   const shade=Math.floor(random(row)*19);
   polygon(ctx,[[l0,y0],[r0,y0],[r1,y1],[l1,y1]],`rgb(${99+shade},${72+shade},${44+shade})`);
   textured(ctx,[[l0,y0],[r0,y0],[r1,y1],[l1,y1]],true,row);
  }else{
   polygon(ctx,[[l0-14*scale,y0],[r0+14*scale,y0],[r1+18*scale,y1+6*scale],[l1-18*scale,y1+6*scale]],'#332e22');
   polygon(ctx,[[l0,y0],[r0,y0],[r1,y1],[l1,y1]],dirt[Math.floor(random(row)*dirt.length)]);
   textured(ctx,[[l0,y0],[r0,y0],[r1,y1],[l1,y1]],false,row);
   for(let k=0;k<3;k++){
    const n=row*13+k,x=l1+(r1-l1)*random(n+2),yy=y0+(y1-y0)*random(n+5),size=(1+random(n+9)*4)*scale;
    ctx.fillStyle='#251f1b55';ctx.beginPath();ctx.ellipse(x+size*.3,yy+size*.5,size*1.5,size*.55,0,0,Math.PI*2);ctx.fill();
    polygon(ctx,[[x-size,yy],[x-size*.5,yy-size*.5],[x+size*.7,yy-size*.35],[x+size,yy+size*.2],[x,yy+size*.45]],k%3?'#938674':'#b2a28a');
    line(ctx,[[x-size*.5,yy-size*.5],[x+size*.7,yy-size*.35]],'#d3c6a166',Math.max(.4,scale*.65));
   }
   for(const side of [-1,1]){
    const x=edge(z1,side)+side*9*scale;
    polygon(ctx,[[x-8*scale,y1],[x-4*scale,y1-5*scale],[x+7*scale,y1-3*scale],[x+11*scale,y1+4*scale]],'#55584a');
    if(i%2===0){for(let g=0;g<3;g++)line(ctx,[[x+g*3*scale,y1],[x+(g*5-4)*scale,y1-(8+g*3)*scale]],'#67704a',Math.max(.6,scale));}
   }
  }

 }
 // Ropes sag between wooden posts, never a luminous road outline.
 for(let i=0;i<rows;i++){
  const row=whole-i,z=(i+phase)/rows;if(!bridgeAt(row)||z<=0||z>1)continue;
  const scale=.12+z*.88,yy=y(z),zNext=Math.min(1,z+1/rows);
  for(const side of [-1,1]){
   const x=edge(z,side),xNext=edge(zNext,side),height=48*scale,sag=Math.sin(mod(row,4)/4*Math.PI)*7*scale;
   for(const level of [.5,1])line(ctx,[[x,yy-height*level+sag],[xNext,y(zNext)-(48*(.12+zNext*.88))*level+Math.sin(mod(row-1,4)/4*Math.PI)*7*scale]],'#a48b61',Math.max(.8,2.8*scale));
   if(mod(row,4)===0){line(ctx,[[x,yy+8*scale],[x,yy-height-6*scale]],'#271c13',Math.max(2,8*scale));line(ctx,[[x-2*scale,yy],[x-2*scale,yy-height-6*scale]],'#94764c',Math.max(1,3*scale));for(let k=0;k<3;k++)line(ctx,[[x-5*scale,yy-height+k*3*scale],[x+5*scale,yy-height+k*3*scale]],'#c0a16a',Math.max(.7,scale));}
  }
 }
 return {horizon,depth,roadWidth,center};
}
