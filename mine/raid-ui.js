const fmt=n=>Number(n).toLocaleString('ko-KR');
export function raidMarkup({raid,gold,locked=false,admin=false}){
 const amount=Math.floor(gold/10),last=raid.last;
 return `<section class="raid-game"><div class="raid-intro"><small>금광 요새 · 일일퀘스트</small><h3>후회없는 약탈</h3><p>세 광산 중 한 곳을 선택하세요.<br>빈틈은 단 하나. 나머지 두 곳에는 강한 광부가 기다립니다.</p></div><div class="raid-summary"><span>오늘 도전 <b>${raid.used} / 3</b></span><span class="${raid.complete?'quest-done':''}">일일퀘스트 <b>${raid.complete?'완료':'1회 도전'}</b></span></div><div class="raid-stakes"><span>성공 · 1장<strong>+${fmt(amount)} G</strong></span><span>실패 · 2장<strong>−${fmt(amount)} G</strong></span></div><div class="raid-cards">${['A','B','C'].map((c,i)=>`<button class="raid-card" data-raid-card="${i}" ${locked||!raid.remaining||gold<10?'disabled':''} aria-label="${c} 광산 선택"><span class="raid-card-letter">${c}</span><span class="raid-seal" aria-hidden="true"></span><span class="raid-card-caption">봉인된 광산</span></button>`).join('')}</div><p class="raid-instruction" role="status">${locked?'선택 결과를 확인하고 있습니다.':!raid.remaining?'오늘의 도전을 모두 마쳤습니다.':gold<10?'10 G부터 도전할 수 있습니다.':'카드를 고르면 즉시 골드가 정산됩니다.'}</p><div data-raid-result>${last?`<p class="raid-last">최근 결과 · ${last.won?'약탈 성공':'약탈 실패'} <b>${last.delta>0?'+':'−'}${fmt(Math.abs(last.delta))} G</b></p>`:''}</div><div class="raid-footer"><p class="raid-rule">현재 ${fmt(gold)} G · 성공 확률 1/3<br>매일 오전 0시(한국 시간) 3회 충전 · 참여는 선택<br>승패와 관계없이 1회 참여하면 퀘스트 완료<br>매회 보유 골드의 10% · 1 G 미만 버림</p>${admin?`<button class="raid-reset" data-raid-reset ${locked?'disabled':''}>↻ 내 약탈 횟수 초기화<small>관리자 테스트 · 골드는 유지됩니다</small></button>`:''}</div></section>`;
}
export function animateRaid(host,result,{onNext,audio}){
 let timer,finished=false,stopSound=()=>{};
 const game=host.querySelector('.raid-game');if(!game)return ()=>{};
 const dialog=host.closest('dialog');
 game.classList.add('raid-revealing');dialog?.classList.add('raid-cinema-dialog');
 const cards=[...game.querySelectorAll('[data-raid-card]')];
 cards.forEach((card,i)=>{card.disabled=true;card.classList.toggle('raid-chosen',i===result.card);});
 const target=game.querySelector('[data-raid-result]');
 const kind=result.won?'success':'failure',path='/assets/mine/media-311/'+kind;
 target.innerHTML=`<div class="raid-cinema raid-video-cinema ${result.won?'raid-victory':'raid-defeat'}" style="--cinema-poster:url('${path}.webp')"><div class="raid-video-stage"><video class="raid-result-video" muted playsinline preload="auto" poster="${path}.webp" aria-label="${result.won?'금으로 가득한 동굴을 발견하는 영상':'해골 전사들이 다가오는 영상'}"><source src="/assets/mine/media-313/${kind}.mp4" type="video/mp4"></video><div class="raid-video-fx" aria-hidden="true"></div><button class="raid-video-resume" data-video-resume hidden>▶ 영상 재생</button></div><div class="raid-video-caption" role="status"><small data-video-status>광산에 진입하는 중…</small><strong>${result.won?'약탈 성공':'약탈 실패'}</strong><b>${result.delta>0?'+':'−'}${fmt(Math.abs(result.delta))} G</b><span>${fmt(result.before)} → ${fmt(result.after)} G</span></div></div><button class="raid-skip" data-raid-skip>결과 바로 보기</button>`;
 const video=target.querySelector('video'),resume=target.querySelector('[data-video-resume]'),cinema=target.querySelector('.raid-cinema');
 game.querySelector('.raid-instruction').textContent='선택한 광산에 진입했습니다…';
 const finish=()=>{
  if(finished)return;finished=true;clean();dialog?.classList.remove('raid-cinema-dialog');game.classList.remove('raid-revealing');if(!host.contains(game))return;
  cards.forEach((card,i)=>{const win=i===result.winner;card.classList.add('raid-open',win?'raid-easy':'raid-strong');card.innerHTML=`<img src="/assets/mine/races-285/${win?'goblin':'orc'}-portrait.webp" alt="${win?'빈틈을 보인 광부':'강력한 경비 광부'}"><b>${win?'빈틈의 광산':'철통 광산'}</b><small>${win?'성공 +10%':'실패 −10%'}${i===result.card?' · 선택':''}</small>`;});
  game.querySelector('.raid-instruction').textContent='세 카드의 결과가 공개되었습니다.';
  target.innerHTML=`<div class="raid-settled ${result.won?'raid-win':'raid-loss'}" role="status"><small>${result.won?'약탈 성공':'약탈 실패'}</small><strong>${result.delta>0?'+':'−'}${fmt(Math.abs(result.delta))} G</strong><span>${fmt(result.before)} → ${fmt(result.after)} G</span><p>일일퀘스트 완료 · 오늘 ${result.number}/3회 도전</p></div><button class="gold-action" data-raid-next>${result.number<3?'다음 도전 준비':'오늘 결과 확인'}</button>`;
  target.querySelector('[data-raid-next]').onclick=onNext;
  dialog?.scrollTo({top:0,behavior:'instant'});
 };
 target.querySelector('[data-raid-skip]').onclick=finish;
 dialog?.scrollTo({top:0,behavior:'instant'});
 const guard=()=>{clearTimeout(timer);timer=setTimeout(finish,15000);};
 const progress=()=>{if(finished)return;guard();if(video.currentTime>=2.45){cinema.classList.add('raid-result-visible');target.querySelector('[data-video-status]').textContent=result.won?'황금을 찾아냈다':'강력한 수비자를 만났다';}};
 const play=()=>{if(finished)return;void audio?.unlock();resume.hidden=true;video.play().catch(()=>{if(!finished){clearTimeout(timer);resume.hidden=false;}});};
 const visible=()=>{if(document.hidden){video.pause();clearTimeout(timer);}else if(!finished){resume.hidden=false;}};
 const playing=()=>{resume.hidden=true;game.classList.add('raid-art-ready');guard();};
 const failed=()=>{if(finished)return;finish();};
 function clean(){clearTimeout(timer);stopSound();document.removeEventListener('visibilitychange',visible);video.removeEventListener('playing',playing);video.removeEventListener('timeupdate',progress);video.removeEventListener('ended',finish);video.removeEventListener('error',failed);video.pause();video.removeAttribute('src');video.querySelector('source')?.remove();video.load();}
 video.addEventListener('playing',playing);video.addEventListener('timeupdate',progress);video.addEventListener('ended',finish);video.addEventListener('error',failed);document.addEventListener('visibilitychange',visible);resume.onclick=play;
 stopSound=audio?.track(video,kind)||(()=>{});guard();video.play().catch(()=>{if(!finished){clearTimeout(timer);resume.hidden=false;}});
 return ()=>{finished=true;clean();dialog?.classList.remove('raid-cinema-dialog');};
}
