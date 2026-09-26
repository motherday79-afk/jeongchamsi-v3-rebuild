import {gameStory} from './game-story.js?v=335';
import {prepareValleySprites,valleyPose} from './valley-sprites.js?v=320';
import {valleyAttacks,valleyCoins,valleyResult,VALLEY_DURATION,VALLEY_GUIDED} from './valley-rules.js?v=335';
export const valleyMarkup=()=>`<section class="valley-game"><canvas aria-label="망자의 계곡 운송 경로"></canvas><div class="valley-hud"><span data-valley-coins>금화 0 / 0</span><span data-valley-time>01:00</span><span data-valley-health aria-label="수레 내구도">◆ ◆ ◆</span></div><div class="valley-notice" role="status"></div><div class="valley-cover"><small>VALLEY OF THE DEAD</small><h3 class="valley-title-art"><img src="/assets/mine/valley-316/title.png" alt="망자의 계곡"></h3>${gameStory('valley')}<p>60초 운송 · 수레 내구도 3칸<br>처음 20초만 짧게 예고 · 이후 40초는 즉시 회피<br>길의 금화를 모으되 손에 붙잡히지 마세요</p><button data-valley-start>운송 시작</button><p>보유 골드 차감·보상 지급 없음 · 성공하면 일일퀘스트 완료</p></div><div class="valley-controls"><button data-lane="0" aria-label="왼쪽으로 회피">◀ 왼쪽</button><button data-lane="1" aria-label="오른쪽으로 회피">오른쪽 ▶</button></div></section>`;
export function mountValley(host,{request,accept,audio}){
 const el=host.querySelector('.valley-game'),canvas=el.querySelector('canvas'),ctx=canvas.getContext('2d'),cover=el.querySelector('.valley-cover'),notice=el.querySelector('.valley-notice');
 const sprite=new Image();sprite.src='/assets/mine/valley-315/sprites.png';
 const tiles=[];
 const prepareSprites=()=>{for(let i=0;i<4;i++){const tile=document.createElement('canvas');tile.width=sprite.width/2;tile.height=sprite.height/2;const c=tile.getContext('2d');c.drawImage(sprite,(i%2)*tile.width,Math.floor(i/2)*tile.height,tile.width,tile.height,0,0,tile.width,tile.height);c.globalCompositeOperation='destination-in';c.translate(tile.width/2,tile.height/2);c.scale(tile.width/2,tile.height/2);const fog=c.createRadialGradient(0,0,.65,0,0,1.2);fog.addColorStop(0,'#fff');fog.addColorStop(1,'#fff0');c.fillStyle=fog;c.fillRect(-1,-1,2,2);tiles.push(tile);}};
 sprite.onload=prepareSprites;
 const cargo=new Image();cargo.src='/assets/mine/valley-320/walk.png';let cargoTiles=[];
 cargo.onload=()=>{cargoTiles=prepareValleySprites(cargo);};
 const bg=new Image();bg.src='/assets/mine/valley-317/environment.png';
 let disposed=false,run=null,attacks=[],moves=[],lane=0,visualLane=0,time=0,last=0,raf=0,active=false,paused=false,health=3,flash=0,lastHit=-1,lastStep=-1,busy=false,finishBody=null;
 let finishAt=0,coins=[],roadCoins=[],collected=0,turnAt=-1000,turnDirection=0,pickups=[];
 const setNotice=text=>{if(notice.textContent!==text)notice.textContent=text;};
 const resize=()=>{const box=el.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
 const ro=new ResizeObserver(resize);ro.observe(el);
 function change(next){if(!active||paused||next===lane||time-(moves.at(-1)?.[0]??-120)<120)return;turnDirection=next-lane;turnAt=time;lane=next;moves.push([Math.round(time),lane]);audio.play('swing');}
 const key=e=>{if(['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)){e.preventDefault();change(['ArrowLeft','a','A'].includes(e.key)?0:1);}};
 window.addEventListener('keydown',key);
 const visibility=()=>{if(document.hidden&&active){paused=true;cover.hidden=false;cover.innerHTML='<h3>운송 일시정지</h3><p>돌아오면 이어서 플레이할 수 있습니다.</p><button data-valley-resume>계속하기</button>';}};
 document.addEventListener('visibilitychange',visibility);
 async function finish(){
  active=false;cover.hidden=false;cover.innerHTML='<h3>운송 결과 저장 중…</h3>';setNotice('');
  finishBody??={action:'valley-finish',requestId:crypto.randomUUID(),runId:run.id,moves};
  try{const d=await request('mine',finishBody);if(disposed)return;if(!d.ok)throw Error(d.error);accept(d);const won=d.result.valley.won;audio.play(won?'upgrade':'loss');cover.innerHTML=`<small>${won?'DELIVERY COMPLETE':'CART LOST'}</small><h3>${won?'운송 성공':'운송 실패'}</h3><p>${won?'금화 수레가 계곡을 무사히 건넜습니다.<br>오늘의 퀘스트 완료!':'망자의 손에 수레가 부서졌습니다.<br>다시 도전할 수 있습니다.'}</p><p>길의 금화 ${d.result.valley.collected} / ${d.result.valley.totalCoins}${d.result.valley.allCoins?' · 전부 수집 완료':''}</p><p>보유 골드는 변하지 않습니다.</p><button data-valley-start>다시 도전</button>`;}
  catch(error){if(!disposed)cover.innerHTML=error.message==='MINE_VALLEY_RUN'?'<h3>게임이 업데이트되었습니다</h3><p>새로운 운송을 시작해주세요.</p><button data-valley-start>다시 시작</button>':'<h3>결과를 저장하지 못했습니다</h3><p>연결을 확인한 뒤 다시 저장해주세요.</p><button data-valley-save>결과 다시 저장</button>';}
 }
 async function click(e){
  const b=e.target.closest('button');if(!b||busy)return;
  if(b.dataset.lane!==undefined){change(Number(b.dataset.lane));return;}
  if(b.hasAttribute('data-valley-resume')){paused=false;last=performance.now();cover.hidden=true;return;}
  if(b.hasAttribute('data-valley-save')){busy=true;await finish();busy=false;return;}
  if(!b.hasAttribute('data-valley-start'))return;
  busy=true;b.disabled=true;
  try{await Promise.all([sprite.decode(),cargo.decode(),bg.decode()]);await audio.unlock();const d=await request('mine',{action:'valley-start',requestId:crypto.randomUUID()});if(disposed)return;if(!d.ok)throw Error();accept(d);run=d.result.valley;attacks=valleyAttacks(run.seed);moves=[];lane=visualLane=0;time=0;health=3;lastHit=lastStep=-1;finishBody=null;finishAt=0;coins=[];roadCoins=valleyCoins(run.seed);collected=0;turnAt=-1000;turnDirection=0;pickups=[];paused=document.hidden;active=true;last=performance.now();cover.hidden=true;if(paused)visibility();}
  catch{if(!disposed){b.disabled=false;setNotice('연결 상태를 확인하고 다시 시작해주세요.');}}
  finally{busy=false;}
 }
 el.addEventListener('click',click);
 function poly(points,fill){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
 function draw(now){
  if(disposed)return;raf=requestAnimationFrame(draw);const dt=Math.min(50,Math.max(0,now-last));last=now;
  if(active&&!paused){time=Math.min(VALLEY_DURATION,time+dt);const r=valleyResult(run.seed,moves,time);if(r.collected>collected){audio.play('gain');pickups.push({born:now,amount:r.collected-collected});collected=r.collected;}if(r.health<health){health=r.health;flash=now;audio.play('pick-dark-strike');audio.play('collect');coins=Array.from({length:health?24:42},(_,i)=>({born:now,vx:(Math.random()-.5)*.9,vy:-.2-Math.random()*.5,spin:Math.random()*6,size:3+Math.random()*3}));}if(!health||time>=VALLEY_DURATION){time=r.endedAt;moves=moves.filter(m=>m[0]<=time);if(!health){active=false;finishAt=now+1500;setNotice('수레가 부서지고 금화가 쏟아집니다…');}else void finish();}}
  if(finishAt&&now>=finishAt){finishAt=0;void finish();}
  visualLane+=(lane-visualLane)*Math.min(1,dt/65);
  const w=el.clientWidth,h=el.clientHeight;ctx.clearRect(0,0,w,h);
  if(bg.complete&&bg.naturalWidth){const scale=Math.max(w/bg.width,h/bg.height)*(1+time/VALLEY_DURATION*.42),dw=bg.width*scale,dh=bg.height*scale;ctx.drawImage(bg,(w-dw)/2,h*.28-dh*.28,dw,dh);}
  ctx.fillStyle='#080d1422';ctx.fillRect(0,0,w,h);
  const horizon=h*.24,depth=h*.68,roadWidth=Math.min(w*.82,h*.74),center=()=>w*.5;
  const playerZ=.78,py=horizon+depth*playerZ,px=center(playerZ)+(visualLane-.5)*roadWidth*.46;
  for(const coin of roadCoins){const ahead=coin.at-time;if(ahead<0||ahead>1800)continue;const z=.08+.70*(1-ahead/1800),cy=horizon+depth*z,cx=center(z)+(coin.lane-.5)*roadWidth*.46*(z/.78),radius=5+12*z;ctx.save();ctx.shadowColor='#ffd258';ctx.shadowBlur=14;ctx.fillStyle='#d99825';ctx.beginPath();ctx.ellipse(cx,cy,radius*.72,radius,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffed9c';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff4b5';ctx.font=`bold ${radius}px Georgia`;ctx.textAlign='center';ctx.beginPath();ctx.ellipse(cx,cy,radius*.43,radius*.7,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  let warning='';
  for(const a of attacks){const age=time-a.at;if(age< -100||age>700)continue;
   if(a.at<VALLEY_GUIDED&&age<0){warning=(a.lane===0?'왼쪽':'오른쪽')+'에서 손이 올라옵니다!';ctx.fillStyle='#ffbd3f55';const x=center(playerZ)+(a.lane-.5)*roadWidth*.46;ctx.beginPath();ctx.ellipse(x,py,roadWidth*.17,22,0,0,Math.PI*2);ctx.fill();}
   if(age>=0){const rise=Math.min(1,age/130),fade=age>400?Math.max(0,1-(age-400)/300):1,size=Math.min(w*.43,h*.39),x=center(playerZ)+(a.lane===0?-1:1)*roadWidth*.34;
    ctx.save();ctx.globalAlpha=fade;ctx.shadowColor='#45eac6';ctx.shadowBlur=15;
    if(tiles[a.lane+2])ctx.drawImage(tiles[a.lane+2],x-size/2,py-size*.8*rise,size,size*.85*rise);
    ctx.restore();if(active&&!paused&&lastHit!==a.at){lastHit=a.at;audio.play('pick-dark-swing');}
   }
  }
  if(active)setNotice(paused?'일시정지':warning||(time>=VALLEY_GUIDED?'방향 예고 없음 · 손을 보고 피하세요':'방향을 확인하고 반대쪽으로 피하세요'));
  const size=Math.min(w*.48,h*.38),bounce=active&&!paused?Math.sin(time/90)*3:0;
  ctx.save();if(now-flash<230)ctx.globalAlpha=.55;ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(px,py+size*.09,size*.35,12,0,0,Math.PI*2);ctx.fill();
  if(cargoTiles.length===16){const hitAge=now-flash,recoil=hitAge>=0&&hitAge<1000?Math.sin(hitAge/45)*.2*Math.exp(-hitAge/380):0,walking=active&&!paused,turning=walking&&time-turnAt<260;ctx.translate(px+recoil*size*.12,py-size*.27+bounce);ctx.rotate(recoil);const pose=valleyPose(health,time,turning,turnDirection,walking);ctx.drawImage(cargoTiles[pose],-size*.5,-size*.55,size,size); }
  ctx.restore();
  coins=coins.filter(coin=>now-coin.born<1400);
  for(const coin of coins){const age=(now-coin.born)/1000,x=px-size*.12+coin.vx*size*age,y=py-size*.25+coin.vy*size*age+size*.65*age*age;ctx.save();ctx.globalAlpha=Math.min(1,(1.4-age)*2);ctx.translate(x,y);ctx.rotate(coin.spin+age*8);ctx.fillStyle='#9a570d';ctx.beginPath();ctx.ellipse(1,2,coin.size,coin.size*.6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffdf67';ctx.beginPath();ctx.ellipse(0,0,coin.size,coin.size*.6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff2ad';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
  pickups=pickups.filter(p=>now-p.born<650);for(const p of pickups){const age=(now-p.born)/650;ctx.save();ctx.globalAlpha=1-age;ctx.fillStyle='#ffeaa2';ctx.shadowColor='#dfa33b';ctx.shadowBlur=9;ctx.textAlign='center';ctx.font='bold 20px Georgia';ctx.fillText(`+${p.amount}`,px,py-size*.55-age*45);ctx.restore();}
  el.querySelector('[data-valley-coins]').textContent=`금화 ${collected} / ${roadCoins.length}`;
  const remaining=Math.ceil((VALLEY_DURATION-time)/1000);el.querySelector('[data-valley-time]').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
  el.querySelector('[data-valley-health]').textContent='◆ '.repeat(health)+'◇ '.repeat(3-health);
  ctx.fillStyle='#1c171bcc';ctx.fillRect(w*.12,h*.13,w*.76,5);ctx.fillStyle='#dfb96b';ctx.fillRect(w*.12,h*.13,w*.76*time/VALLEY_DURATION,5);
 }
 raf=requestAnimationFrame(draw);
 return ()=>{disposed=true;active=false;cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);el.removeEventListener('click',click);};
}
