// Native vector leaves remain sharp on small touch screens without sprite downloads.
export function drawForestLeaf(ctx,x,y,width,color,lane){
 ctx.save();ctx.translate(x,y);ctx.scale(width/80,width/80);ctx.rotate((lane%2?-.13:.13));
 ctx.shadowColor=color;ctx.shadowBlur=9;
 const g=ctx.createLinearGradient(-30,-18,30,18);g.addColorStop(0,'#fbf7bf');g.addColorStop(.32,color);g.addColorStop(1,'#244f36');ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(-37,9);ctx.bezierCurveTo(-33,-15,-4,-28,36,-12);ctx.bezierCurveTo(25,14,-10,28,-37,9);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff1bb';ctx.lineWidth=1.15;ctx.stroke();
 ctx.strokeStyle='#294b32bb';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-42,13);ctx.quadraticCurveTo(-4,3,33,-10);ctx.stroke();
 ctx.strokeStyle='#f5efba99';ctx.lineWidth=.9;
 for(const k of [-20,-8,4,16]){const v=3-k*.24;ctx.beginPath();ctx.moveTo(k,v);ctx.quadraticCurveTo(k-3,v-8,k+3,v-16);ctx.moveTo(k,v);ctx.quadraticCurveTo(k+6,v+4,k+13,v+8);ctx.stroke();}
 ctx.restore();
}
export function leafIcon(lane){return `<svg viewBox="0 0 84 48" aria-hidden="true" focusable="false"><path d="M7 32C10 8 40 0 77 11C65 37 36 49 7 32Z" fill="currentColor" stroke="#f5df9c" stroke-width="1.5"/><path d="M2 36Q40 25 73 13M24 29L28 13M39 24L45 8M54 20L61 12M24 29L35 37M39 24L52 31M54 20L65 24" fill="none" stroke="#315039" stroke-width="1.4"/></svg>`;}
