// Pointer-operated foil. The server supplies the already-paid ticket result;
// erasing the foil never draws a new outcome or spends currency.
export function mountScratchCard(host,{onReveal=()=>{},revealed=false}={}){
 const surface=host.querySelector('.scratch-surface')||host,canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),button=host.querySelector('[data-scratch-reveal]');
 let done=revealed,down=false,previous=null,points=[],visited=new Set();
 const columns=24,rows=14;
 function erase(x,y){
  const radius=canvas.getBoundingClientRect().width*.066;
  ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=radius*2;
  ctx.beginPath();if(previous)ctx.moveTo(previous.x,previous.y);else ctx.moveTo(x,y);ctx.lineTo(x+.01,y+.01);ctx.stroke();
  previous={x,y};
 }
 function drawFoil(){
  if(done)return;
  const rect=canvas.getBoundingClientRect(),scale=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(rect.width*scale);canvas.height=Math.round(rect.height*scale);ctx.setTransform(scale,0,0,scale,0,0);
  ctx.globalCompositeOperation='source-over';
  const gradient=ctx.createLinearGradient(0,0,rect.width,rect.height);gradient.addColorStop(0,'#f1f4fb');gradient.addColorStop(.3,'#a5aabc');gradient.addColorStop(.55,'#e6eaf3');gradient.addColorStop(1,'#8b90a4');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,rect.width,rect.height);
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;
  for(let x=-rect.height;x<rect.width;x+=17){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+rect.height,rect.height);ctx.stroke();}
  ctx.textAlign='center';ctx.fillStyle='#47435d';ctx.font='bold 19px "Malgun Gothic", sans-serif';ctx.fillText('행운을 긁어보세요',rect.width/2,rect.height*.47);
  ctx.font='12px "Malgun Gothic", sans-serif';ctx.fillText('손가락 또는 마우스로 긁기',rect.width/2,rect.height*.61);
  previous=null;
  for(const point of points){if(point.break)previous=null;else erase(point.x*rect.width,point.y*rect.height);}
  previous=null;
 }
 function reveal(){if(done)return;done=true;down=false;surface.classList.add('is-revealed');canvas.style.pointerEvents='none';button.hidden=true;onReveal();}
 function record(event){
  const r=canvas.getBoundingClientRect(),x=Math.max(0,Math.min(r.width,event.clientX-r.left)),y=Math.max(0,Math.min(r.height,event.clientY-r.top));
  const from=previous||{x,y},distance=Math.hypot(x-from.x,y-from.y),steps=Math.max(1,Math.ceil(distance/6)),radius=r.width*.066;
  for(let n=0;n<=steps;n++){
   const px=from.x+(x-from.x)*n/steps,py=from.y+(y-from.y)*n/steps;
   for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    if(Math.hypot((col+.5)*r.width/columns-px,(row+.5)*r.height/rows-py)<radius)visited.add(row*columns+col);
   }
  }
  points.push({x:x/r.width,y:y/r.height});erase(x,y);if(visited.size/(columns*rows)>=.55)reveal();
 }
 function start(e){if(done||e.button!==undefined&&e.button!==0)return;down=true;previous=null;points.push({break:true});canvas.setPointerCapture(e.pointerId);record(e);}
 function move(e){if(down&&!done)record(e);}
 function stop(){down=false;previous=null;}
 canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);button.addEventListener('click',reveal);
 const observer=new ResizeObserver(drawFoil);observer.observe(canvas);
 if(done){surface.classList.add('is-revealed');button.hidden=true;}else drawFoil();
 return ()=>{observer.disconnect();canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',stop);canvas.removeEventListener('pointercancel',stop);button.removeEventListener('click',reveal);};
}
