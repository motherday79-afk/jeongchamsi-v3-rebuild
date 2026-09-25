import {valleyAttacks,valleyResult,VALLEY_DURATION} from './valley-rules.js?v=315';
export const valleyMarkup=()=>`<section class="valley-game"><canvas aria-label="망자의 계곡 운송 경로"></canvas><div class="valley-hud"><b>망자의 계곡</b><span data-valley-time>01:30</span><span data-valley-health aria-label="수레 내구도">◆ ◆ ◆</span></div><div class="valley-notice" role="status"></div><div class="valley-cover"><small>VALLEY OF THE DEAD</small><h3>망자의 계곡</h3><p>금화를 지켜 계곡을 건너세요.</p><p>90초 운송 · 수레 내구도 3칸<br>처음 60초는 방향 예고, 마지막 30초는 손을 보고 회피<br>왼쪽 손 → 오른쪽으로 / 오른쪽 손 → 왼쪽으로</p><button data-valley-start>운송 시작</button><p>보유 골드 차감·보상 지급 없음 · 성공하면 일일퀘스트 완료</p></div><div class="valley-controls"><button data-lane="0" aria-label="왼쪽으로 회피">◀ 왼쪽</button><button data-lane="1" aria-label="오른쪽으로 회피">오른쪽 ▶</button></div></section>`;
export function mountValley(host,{request,accept,audio}){
 const el=host.querySelector('.valley-game'),canvas=el.querySelector('canvas'),ctx=canvas.getContext('2d'),cover=el.querySelector('.valley-cover'),notice=el.querySelector('.valley-notice');
 const sprite=new Image();sprite.src='/assets/mine/valley-315/sprites.png';
 const tiles=[];
 const prepareSprites=()=>{for(let i=0;i<4;i++){const tile=document.createElement('canvas');tile.width=sprite.width/2;tile.height=sprite.height/2;const c=tile.getContext('2d');c.drawImage(sprite,(i%2)*tile.width,Math.floor(i/2)*tile.height,tile.width,tile.height,0,0,tile.width,tile.height);c.globalCompositeOperation='destination-in';c.translate(tile.width/2,tile.height/2);c.scale(tile.width/2,tile.height/2);const fog=c.createRadialGradient(0,0,.65,0,0,1.2);fog.addColorStop(0,'#fff');fog.addColorStop(1,'#fff0');c.fillStyle=fog;c.fillRect(-1,-1,2,2);tiles.push(tile);}};
 sprite.onload=prepareSprites;
 const bg=new Image();bg.src='/assets/mine/world-portrait-307.webp';
 let disposed=false,run=null,attacks=[],moves=[],lane=0,visualLane=0,time=0,last=0,raf=0,active=false,paused=false,health=3,flash=0,lastHit=-1,lastStep=-1,busy=false,finishBody=null;
 const setNotice=text=>{if(notice.textContent!==text)notice.textContent=text;};
 const resize=()=>{const box=el.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
 const ro=new ResizeObserver(resize);ro.observe(el);
 function change(next){if(!active||paused||next===lane||time-(moves.at(-1)?.[0]??-200)<200)return;lane=next;moves.push([Math.round(time),lane]);audio.play('swing');}
 const key=e=>{if(['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)){e.preventDefault();change(['ArrowLeft','a','A'].includes(e.key)?0:1);}};
 window.addEventListener('keydown',key);
 const visibility=()=>{if(document.hidden&&active){paused=true;cover.hidden=false;cover.innerHTML='<h3>운송 일시정지</h3><p>돌아오면 이어서 플레이할 수 있습니다.</p><button data-valley-resume>계속하기</button>';}};
 document.addEventListener('visibilitychange',visibility);
 async function finish(){
  active=false;cover.hidden=false;cover.innerHTML='<h3>운송 결과 저장 중…</h3>';setNotice('');
  finishBody??={action:'valley-finish',requestId:crypto.randomUUID(),runId:run.id,moves};
  try{const d=await request('mine',finishBody);if(disposed)return;if(!d.ok)throw Error(d.error);accept(d);const won=d.result.valley.won;audio.play(won?'upgrade':'loss');cover.innerHTML=`<small>${won?'DELIVERY COMPLETE':'CART LOST'}</small><h3>${won?'운송 성공':'운송 실패'}</h3><p>${won?'금화 수레가 계곡을 무사히 건넜습니다.<br>오늘의 퀘스트 완료!':'망자의 손에 수레가 부서졌습니다.<br>다시 도전할 수 있습니다.'}</p><p>보유 골드는 변하지 않습니다.</p><button data-valley-start>다시 도전</button>`;}
  catch{if(!disposed)cover.innerHTML='<h3>결과를 저장하지 못했습니다</h3><p>연결을 확인한 뒤 다시 저장해주세요.</p><button data-valley-save>결과 다시 저장</button>';}
 }
 async function click(e){
  const b=e.target.closest('button');if(!b||busy)return;
  if(b.dataset.lane!==undefined){change(Number(b.dataset.lane));return;}
  if(b.hasAttribute('data-valley-resume')){paused=false;last=performance.now();cover.hidden=true;return;}
  if(b.hasAttribute('data-valley-save')){busy=true;await finish();busy=false;return;}
  if(!b.hasAttribute('data-valley-start'))return;
  busy=true;b.disabled=true;
  try{await sprite.decode();await audio.unlock();const d=await request('mine',{action:'valley-start',requestId:crypto.randomUUID()});if(disposed)return;if(!d.ok)throw Error();accept(d);run=d.result.valley;attacks=valleyAttacks(run.seed);moves=[];lane=visualLane=0;time=0;health=3;lastHit=lastStep=-1;finishBody=null;paused=document.hidden;active=true;last=performance.now();cover.hidden=true;if(paused)visibility();}
  catch{if(!disposed){b.disabled=false;setNotice('연결 상태를 확인하고 다시 시작해주세요.');}}
  finally{busy=false;}
 }
 el.addEventListener('click',click);
 function poly(points,fill){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
 function draw(now){
  if(disposed)return;raf=requestAnimationFrame(draw);const dt=Math.min(50,Math.max(0,now-last));last=now;
  if(active&&!paused){time=Math.min(VALLEY_DURATION,time+dt);const r=valleyResult(run.seed,moves,time);if(r.health<health){health=r.health;flash=now;audio.play('pick-dark-strike');}if(!health||time>=VALLEY_DURATION){time=r.endedAt;moves=moves.filter(m=>m[0]<=time);void finish();}}
  visualLane+=(lane-visualLane)*Math.min(1,dt/110);
  const w=el.clientWidth,h=el.clientHeight;ctx.clearRect(0,0,w,h);
  if(bg.complete&&bg.naturalWidth){const scale=Math.max(w/bg.width,h/bg.height);ctx.drawImage(bg,(w-bg.width*scale)/2,(h-bg.height*scale)/2,bg.width*scale,bg.height*scale);}
  ctx.fillStyle='#061320b8';ctx.fillRect(0,0,w,h);
  const horizon=h*.19,depth=h*.73,roadWidth=Math.min(w*.88,h*.9);
  const center=z=>w*.5+Math.sin(z*5+time/9000)*roadWidth*.13*z;
  const left=[],right=[];
  for(let i=0;i<=40;i++){const z=i/40,y=horizon+depth*z;left.push([center(z)-roadWidth*(.07+.44*z),y]);right.push([center(z)+roadWidth*(.07+.44*z),y]);}
  poly([...left,...right.reverse()],'#192a30');
  ctx.strokeStyle='#92a99788';ctx.lineWidth=3;for(const edge of [left,right]){ctx.beginPath();edge.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
  for(let i=0;i<22;i++){const z=((i/22+time/6500)%1),y=horizon+depth*z;ctx.strokeStyle=`rgba(181,183,148,${z*.25})`;ctx.lineWidth=1+z*2;ctx.beginPath();ctx.moveTo(center(z)-roadWidth*z*.4,y);ctx.lineTo(center(z)+roadWidth*z*.4,y+4*z);ctx.stroke();}
  // Fog drifts across the ravine rather than hiding the collision area.
  for(let i=0;i<5;i++){const y=horizon+i*h*.13;const g=ctx.createRadialGradient(w*.5+Math.sin(now/4000+i)*w*.3,y,0,w*.5,y,w*.6);g.addColorStop(0,'#8cdcc316');g.addColorStop(1,'#8cdcc300');ctx.fillStyle=g;ctx.fillRect(0,y-h*.1,w,h*.2);}
  const playerZ=.78,py=horizon+depth*playerZ,px=center(playerZ)+(visualLane-.5)*roadWidth*.46;
  let warning='';
  for(const a of attacks){const age=time-a.at;if(age< -1000||age>1150)continue;
   if(time<60000&&age<0){warning=(a.lane===0?'왼쪽':'오른쪽')+'에서 손이 올라옵니다!';ctx.fillStyle='#ffbd3f55';const x=center(playerZ)+(a.lane-.5)*roadWidth*.46;ctx.beginPath();ctx.ellipse(x,py,roadWidth*.17,22,0,0,Math.PI*2);ctx.fill();}
   if(age>=0){const rise=Math.min(1,age/330),fade=age>800?Math.max(0,1-(age-800)/350):1,size=Math.min(w*.43,h*.39),x=center(playerZ)+(a.lane===0?-1:1)*roadWidth*.34;
    ctx.save();ctx.globalAlpha=fade;ctx.shadowColor='#45eac6';ctx.shadowBlur=15;
    if(tiles[a.lane+2])ctx.drawImage(tiles[a.lane+2],x-size/2,py-size*.8*rise,size,size*.85*rise);
    ctx.restore();if(active&&!paused&&lastHit!==a.at){lastHit=a.at;audio.play('pick-dark-swing');}
   }
  }
  if(active)setNotice(paused?'일시정지':warning||(time>=60000?'방향 예고 없음 · 손을 보고 피하세요':'방향을 확인하고 반대쪽으로 피하세요'));
  const size=Math.min(w*.48,h*.38),bounce=active&&!paused?Math.sin(time/90)*3:0;
  ctx.save();if(now-flash<230)ctx.globalAlpha=.55;ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(px,py+size*.09,size*.35,12,0,0,Math.PI*2);ctx.fill();
  if(tiles[0]){const frame=active&&!paused?Math.floor(time/240)%2:0;ctx.translate(px,py-size*.28+bounce);ctx.rotate((lane-visualLane)*.09);if(frame===1)ctx.scale(-1,1);ctx.drawImage(tiles[frame],-size/2,-size*.4,size,size*.8);}
  ctx.restore();
  const remaining=Math.ceil((VALLEY_DURATION-time)/1000);el.querySelector('[data-valley-time]').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
  el.querySelector('[data-valley-health]').textContent='◆ '.repeat(health)+'◇ '.repeat(3-health);
  ctx.fillStyle='#1c171bcc';ctx.fillRect(w*.12,h*.13,w*.76,5);ctx.fillStyle='#dfb96b';ctx.fillRect(w*.12,h*.13,w*.76*time/VALLEY_DURATION,5);
 }
 raf=requestAnimationFrame(draw);
 return ()=>{disposed=true;active=false;cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);el.removeEventListener('click',click);};
}
