import {gameStory} from './game-story.js?v=335';
import {drawForestLeaf,leafIcon} from './forest-leaf.js?v=323';
import {FOREST_MODES,FOREST_DURATION,createJudgment} from './forest-rules.js?v=322';
import {FOREST_SONG} from './forest-song.js?v=322';
const KEYS=['KeyA','KeyS','KeyD','KeyF','KeyG'],COLORS=['#76da91','#83d2cf','#eec666','#bfade9','#eea179'];
export function forestMarkup(){return `<section class="forest-game" aria-label="노래하는 숲 리듬게임">
 <div class="forest-motes" aria-hidden="true"></div><div class="forest-hud"><span>정확도 <b data-f-accuracy>0%</b></span><span><b data-f-time>03:45</b></span><button data-f-pause disabled aria-label="일시정지">Ⅱ</button></div>
 <div class="forest-board"><canvas aria-label="위에서 내려오는 음표를 판정선에 맞춰 누르세요"></canvas><div class="forest-judgment" data-f-judge aria-live="off"></div><div class="forest-combo" data-f-combo></div></div>
 <div class="forest-keys">${KEYS.map((k,i)=>`<button data-f-key="${i}" aria-label="${i+1}번 음표 ${k.replace('Key','')}" style="--key-color:${COLORS[i]}"><span aria-hidden="true">${leafIcon(i)}</span><small>${k.replace('Key','')}</small></button>`).join('')}</div>
 <div class="forest-cover" data-f-cover><img class="forest-title" src="/assets/mine/forest-322/title.png" alt="노래하는 숲"><p class="forest-eyebrow">THE SINGING FOREST</p><h3>${FOREST_SONG.title}</h3>${gameStory('forest')}
 <div class="forest-modes" role="group" aria-label="난이도">${Object.entries(FOREST_MODES).map(([id,m])=>`<button data-f-mode="${id}" aria-pressed="${id==='easy'}"><b>${m.label}</b><small>${id==='easy'?'기본 박자':id==='normal'?'동시 입력':'연타 · 길게 누르기'}</small></button>`).join('')}</div>
 <p class="forest-help">PC A · S · D · F · G / 모바일 5버튼<br>정확도 70% 이상 클리어 · 일일퀘스트 1회</p>
 <label class="forest-sync">박자 보정 <output data-f-offset>0ms</output><input data-f-cal type="range" min="-200" max="200" step="10" value="0"><small>늦게 눌렀다고 느껴지면 + 방향으로 조절하세요.</small></label>
 <button class="forest-primary" data-f-start>연주 시작 <span>♪</span></button><p data-f-status role="status"></p></div>
 <div class="forest-pause-cover" data-f-paused hidden><h3>잠시 쉬어갑니다</h3><p>준비되면 이어서 연주하세요.</p><button class="forest-primary" data-f-resume>계속 연주</button></div>
 <div class="forest-result" data-f-result hidden></div></section>`;}
export function mountForest(host,{request,accept,audio}){
 const q=s=>host.querySelector(s),canvas=q('canvas'),ctx=canvas.getContext('2d'),board=q('.forest-board'),cover=q('[data-f-cover]'),status=q('[data-f-status]'),start=q('[data-f-start]'),pauseCover=q('[data-f-paused]'),resultBox=q('[data-f-result]');
 const releaseMusic=audio.holdMusic();let disposed=false,ac=null,gain=null,buffer=null,source=null,mode='easy',judgment=null,run=null,events=[],active=false,paused=false,base=0,anchor=0,raf=0,busy=false,pending=null,offset=0,flashes=Array(5).fill(-1),noticeAt=0,results=null;
 const pressed=new Map(),buttons=[...host.querySelectorAll('[data-f-key]')];
 try{offset=Math.max(-200,Math.min(200,Number(localStorage.getItem('jcs.forest.offset'))||0));}catch{}
 q('[data-f-cal]').value=offset;q('[data-f-offset]').textContent=offset+'ms';
 const songTime=()=>active&&!paused?Math.min(FOREST_DURATION,base+(ac.currentTime-anchor)*1000):base;
 const hitTime=()=>Math.round(Math.max(0,Math.min(FOREST_DURATION,songTime()-offset)));
 function stopSource(){if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();source=null;}}
 async function loadAudio(){
  if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)();gain=ac.createGain();gain.gain.value=audio.enabled?1:0;gain.connect(ac.destination);ac.onstatechange=()=>{if(active&&!paused&&ac.state!=='running')pause();};}await ac.resume();if(ac.state!=='running')throw Error('소리를 시작할 수 없습니다. 연주 시작을 다시 눌러주세요.');
  if(!buffer){const r=await fetch('/assets/mine/forest-322/ready-go.m4a');if(!r.ok)throw Error('음원을 불러오지 못했습니다. 다시 시도해 주세요.');buffer=await ac.decodeAudioData(await r.arrayBuffer());}
 }
 const unmute=audio.subscribe(enabled=>{if(gain)gain.gain.value=enabled?1:0;});
 function playAt(ms,delay){stopSource();base=ms;anchor=ac.currentTime+delay;source=ac.createBufferSource();source.buffer=buffer;source.connect(gain);source.start(anchor,Math.max(0,ms/1000));}
 function showJudge(text){q('[data-f-judge]').textContent=text;noticeAt=performance.now();}
 function enter(lane,id){if(!active||paused||songTime()<base||pressed.has(id)||[...pressed.values()].includes(lane)||events.length>=5900)return;const t=hitTime();const previous=events.findLast(e=>e[1]===lane&&e[2]===1);if(previous&&t-previous[0]<55)return;
  pressed.set(id,lane);events.push([t,lane,1]);const grade=judgment.input(t,lane,1);buttons[lane].classList.add('pressed');flashes[lane]=performance.now();if(grade==='perfect'||grade==='good')chime(lane);if(grade==='perfect')showJudge('PERFECT');else if(grade==='good')showJudge('GOOD');else if(grade==='empty')showJudge('박자를 기다려요');
 }
 function chime(lane){if(!audio.enabled||ac?.state!=='running')return;const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=[392,440,523.25,587.33,659.25][lane];g.gain.setValueAtTime(.045,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.065);o.connect(g);g.connect(gain);o.start();o.stop(ac.currentTime+.07);o.onended=()=>{o.disconnect();g.disconnect();};}
 function leave(id){if(!pressed.has(id))return;const lane=pressed.get(id);pressed.delete(id);buttons[lane].classList.remove('pressed');if(judgment&&active){const t=Math.max(events.at(-1)?.[0]||0,hitTime());events.push([t,lane,0]);judgment.input(t,lane,0);}}
 function releaseKeys(){for(const id of [...pressed.keys()])leave(id);}
 function pause(){if(!active||paused)return;releaseKeys();base=Math.max(0,songTime());paused=true;stopSource();pauseCover.hidden=false;q('[data-f-pause]').disabled=true;}
 async function resume(){if(!active||!paused||document.hidden)return;try{await ac.resume();if(disposed)return;playAt(base,1);paused=false;pauseCover.hidden=true;q('[data-f-pause]').disabled=false;}catch{q('[data-f-resume]').textContent='소리를 다시 연결하기';}}
 async function begin(){if(busy)return;busy=true;start.disabled=true;status.textContent='음악과 숲을 준비하고 있습니다…';
  try{await loadAudio();if(disposed)return;const d=await request('mine',{action:'forest-start',requestId:crypto.randomUUID(),difficulty:mode});if(disposed)return;if(!d.ok)throw Error('시작 정보를 저장하지 못했습니다. 다시 시도해 주세요.');accept(d);run=d.result.forest;judgment=createJudgment(mode);events=[];pressed.clear();buttons.forEach(b=>b.classList.remove('pressed'));results=null;pending=null;active=true;paused=false;cover.hidden=true;resultBox.hidden=true;q('[data-f-pause]').disabled=false;playAt(0,3);if(document.hidden)pause();
  }catch(e){status.textContent=e.message||'연결을 확인하고 다시 시작해 주세요.';}finally{busy=false;start.disabled=false;}
 }
 function renderResult(r,saved){resultBox.hidden=false;resultBox.innerHTML=`<img class="forest-title" src="/assets/mine/forest-322/title.png" alt="노래하는 숲"><p class="forest-eyebrow">${FOREST_MODES[mode].label} · 연주 결과</p><h3>${r.cleared?'숲이 당신의 노래를 기억합니다':'다시 한번, 리듬을 느껴보세요'}</h3><strong class="forest-result-score">${r.accuracy.toFixed(1)}<small>%</small></strong><p>PERFECT ${r.perfect} · GOOD ${r.good} · MISS ${r.miss}</p><p>최대 콤보 ${r.maxCombo} · 점수 ${r.score.toLocaleString()}</p><p data-f-save>${saved?(r.cleared?'오늘의 노래하는 숲 퀘스트 완료':'정확도 70% 이상이면 클리어됩니다.'):'결과를 저장하고 있습니다…'}</p><div class="forest-result-actions"><button class="forest-primary" data-f-again ${saved?'':'disabled'}>다시 연주하기</button><button data-panel="world" ${saved?'':'disabled'}>월드맵으로</button></div>`;q('[data-f-again]').onclick=()=>{resultBox.hidden=true;cover.hidden=false;status.textContent='';};}
 async function save(){if(busy||!pending)return;busy=true;try{const d=await request('mine',pending);if(disposed)return;if(!d.ok)throw Error(d.error);accept(d);results=d.result.forest;pending=null;renderResult(results,true);}catch(e){if(disposed)return;const stale=/MINE_FOREST_(RUN|TIME)/.test(e.message);q('[data-f-save]').textContent=stale?'이 연주는 저장할 수 없습니다. 새로 시작해 주세요.':'연결이 끊겼습니다. 결과를 다시 저장해 주세요.';const b=document.createElement('button');b.className='forest-primary';b.textContent=stale?'새 연주 준비':'결과 저장 재시도';b.onclick=()=>{b.remove();if(stale){pending=null;resultBox.hidden=true;cover.hidden=false;}else void save();};resultBox.append(b);}finally{busy=false;}}
 function finish(){if(!active)return;releaseKeys();base=FOREST_DURATION;active=false;paused=false;stopSource();judgment.advance(FOREST_DURATION);results=judgment.stats();q('[data-f-pause]').disabled=true;pending={action:'forest-finish',requestId:crypto.randomUUID(),runId:run.id,events};renderResult(results,false);void save();}
 function draw(now){if(disposed)return;const rect=board.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=rect.width,h=rect.height;
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const t=active?songTime():0,lw=w/5,line=h*.84,travel=FOREST_MODES[mode].travel;
  for(let i=0;i<5;i++){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#07191344');g.addColorStop(1,'#08271ae8');ctx.fillStyle=g;ctx.fillRect(i*lw,0,lw,h);ctx.strokeStyle='#d1c08644';ctx.beginPath();ctx.moveTo(i*lw,0);ctx.lineTo(i*lw,h);ctx.stroke();if(pressed.size&&[...pressed.values()].includes(i)||now-flashes[i]<160){ctx.fillStyle=COLORS[i]+'44';ctx.fillRect(i*lw,0,lw,h);}}
  ctx.fillStyle='#f9e5a2';ctx.shadowColor='#f3e5a2';ctx.shadowBlur=18;ctx.fillRect(0,line,w,3);ctx.shadowBlur=0;
  if(judgment){if(active&&!paused&&t>=0)judgment.advance(t-offset);for(const n of judgment.notes){if(n.grade)continue;const y=line-(n.at-(t-offset))/travel*line;if(y< -20||y>h+20&&!n.hold)continue;const x=(n.lane+.5)*lw,half=lw*.34;
    if(n.hold){const end=line-(n.at+n.hold-(t-offset))/travel*line;ctx.fillStyle=COLORS[n.lane]+'77';ctx.fillRect(x-half*.45,Math.max(0,end),half*.9,Math.min(line,y)-Math.max(0,end));}
    drawForestLeaf(ctx,x,n.head?line:y,Math.min(half*1.9,80),COLORS[n.lane],n.lane);
   }const r=judgment.stats();q('[data-f-accuracy]').textContent=(Math.max(0,r.perfect+r.good*.7-r.extra*.25)/Math.max(1,r.perfect+r.good+r.miss)*100).toFixed(1)+'%';q('[data-f-combo]').textContent=r.combo>=3?r.combo+' COMBO':'';}
  const remaining=Math.ceil((FOREST_DURATION-Math.max(0,t))/1000);q('[data-f-time]').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
  if(active&&!paused&&t<base){q('[data-f-judge]').textContent=String(Math.ceil((base-t)/1000));noticeAt=now;}else if(now-noticeAt>500)q('[data-f-judge]').textContent='';
  if(active&&!paused&&t>=FOREST_DURATION)finish();raf=requestAnimationFrame(draw);
 }
 const keydown=e=>{const lane=KEYS.indexOf(e.code);if(lane<0||e.target.matches('input,select,textarea')||!active)return;e.preventDefault();if(!e.repeat)enter(lane,e.code);};const keyup=e=>leave(e.code);const hidden=()=>{if(document.hidden)pause();};
 const downs=[],ups=[];buttons.forEach((b,i)=>{const down=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);enter(i,'p'+e.pointerId);};const up=e=>leave('p'+e.pointerId);b.addEventListener('pointerdown',down);for(const n of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(n,up);downs.push(down);ups.push(up);});
 for(const b of host.querySelectorAll('[data-f-mode]'))b.onclick=()=>{mode=b.dataset.fMode;for(const x of host.querySelectorAll('[data-f-mode]'))x.setAttribute('aria-pressed',String(x===b));};
 q('[data-f-cal]').oninput=e=>{offset=Number(e.target.value);q('[data-f-offset]').textContent=offset+'ms';try{localStorage.setItem('jcs.forest.offset',String(offset));}catch{}};
 start.onclick=begin;q('[data-f-pause]').onclick=pause;q('[data-f-resume]').onclick=resume;
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',pause);document.addEventListener('visibilitychange',hidden);raf=requestAnimationFrame(draw);
 return ()=>{disposed=true;active=false;cancelAnimationFrame(raf);stopSource();unmute();releaseMusic();void ac?.close();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',hidden);buttons.forEach((b,i)=>{b.removeEventListener('pointerdown',downs[i]);for(const n of ['pointerup','pointercancel','lostpointercapture'])b.removeEventListener(n,ups[i]);});};
}
