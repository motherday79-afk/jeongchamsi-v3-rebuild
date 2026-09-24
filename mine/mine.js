import {makeIdleNotice,setText} from './idle-state.js?v=280';
import {makeMinerMotion} from './motion.js?v=280';
import {mountScratchCard} from './scratch-card.js?v=278';
import {lotteryMarkup,refreshLotteryNumbers,campaignAdminMarkup} from './lottery-ui.js?v=278';
import {pickAppearance,renderPickDecoration} from './pick-design.js?v=278';
const root=document.getElementById('mine-game'),q=s=>root.querySelector(s),dialog=q('[data-dialog]');
const names={strong:'건장한 광부',glamour:'하이힐 광부',elf:'미니미 엘프'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const errors={LOGIN_REQUIRED:'로그인 후 광산에 입장해 주세요.',MINE_COOLDOWN:'다음 타격을 준비하고 있어요.',MINE_NOT_FULL:'저장고가 가득 차면 회수할 수 있어요.',MINE_CYCLE_CHANGED:'이미 회수한 광물입니다. 현재 저장고를 확인해 주세요.',MINE_GOLD_REQUIRED:'광산 골드가 부족해요.',MINE_STORAGE_LOCKED:'곡괭이나 인부를 먼저 강화해 주세요.',MINE_BUSY:'다른 화면에서 작업 중입니다. 잠시 후 다시 시도해 주세요.',MINE_AD_URL:'광고주 주소를 https://로 시작하는 전체 주소로 입력해 주세요.',MINE_AD_NAME:'광고주 이름을 입력해 주세요.',FORBIDDEN:'관리자만 사용할 수 있어요.',MINE_FULL:'저장고가 가득 찼어요. 광물을 회수해 주세요.',STORAGE_CAPACITY:'저장소 용량이 부족합니다. 관리자에게 알려 주세요.'};
let state=null,user=null,ad=null,busy=false,pending=null,offset=0,lastManual=0,lastAuto=0,panel='',toastTimer,disposed=false,adminData=null;
const timers=new Set(),later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);return id;};
const serverNow=()=>Date.now()-offset;
let onlineToken=null,sequence=0,lastHeartbeat=0,needsEntry=false;
let jackpot=null;
let campaign=null,lottery=null,scratchCleanup=null,currentFrame=0;
let pendingReveal=null;
const idleNotice=makeIdleNotice();
const foregroundBusy=()=>busy&&pending?.action!=='heartbeat';
const foregroundPending=()=>pending&&pending.action!=='heartbeat';
Object.assign(errors,{MINE_CAMPAIGN_CHANGED:'새 회차가 시작됐습니다. 변경된 정보를 확인해 주세요.',MINE_LOTTERY_CLOSED:'준비된 경품이 모두 당첨되어 이번 복권은 종료됐습니다.',MINE_LOTTERY_PENDING:'이미 구매한 복권을 먼저 긁어주세요.',MINE_LOTTERY_CHANGED:'복권 기록이 갱신됐습니다. 현재 복권을 확인해 주세요.',MINE_TICKET:'복권 기록을 다시 확인해 주세요.',MINE_CAMPAIGN_INPUT:'경품 이름과 당첨 한도를 확인해 주세요.',MINE_CAMPAIGN_PRIZE_LOCKED:'진행 중인 경품은 바꿀 수 없습니다. 새 회차를 시작해 주세요.'});
const running=()=>onlineToken&&state?.onlineToken===onlineToken&&state.mode==='player'&&serverNow()<state.onlineUntil&&state.ore<state.stats.capacity;
const minerMotion=makeMinerMotion({setFrame:n=>{if(currentFrame===n)return;currentFrame=n;q('[data-player]').style.backgroundPosition=(n/7*100)+'% 0';if(state)renderPickDecoration(q('[data-pick-decoration]'),state,n);},impact:particles});
function presenceExtra(){return {token:onlineToken,sequence:++sequence};}
async function enterGame(){
 if(document.hidden||disposed||!state)return;
 if(busy||pending){needsEntry=true;return;}needsEntry=false;
 onlineToken=crypto.randomUUID();sequence=0;lastHeartbeat=Date.now();
 await action('enter',presenceExtra());
}
function leaveGame(){
 needsEntry=false;if(!onlineToken)return;
 const body=JSON.stringify({action:'leave',requestId:crypto.randomUUID(),campaignId:campaign?.id,...presenceExtra()});onlineToken=null;
 const sent=navigator.sendBeacon?.('/api/v3/mine',new Blob([body],{type:'application/json'}));
 if(!sent)void fetch('/api/v3/mine',{method:'POST',headers:{'Content-Type':'application/json'},body,credentials:'same-origin',keepalive:true}).catch(()=>{});
 for(const id of timers)clearTimeout(id);timers.clear();
 minerMotion.stop();paint();
}
const storageKey=()=>`jcs.mine.pending.${user?.id||''}`;
function storePending(value){pending=value;try{if(value)sessionStorage.setItem(storageKey(),JSON.stringify(value));else sessionStorage.removeItem(storageKey());}catch{}}
function toast(message,ms=4500){clearTimeout(toastTimer);q('[data-toast]').textContent=message;toastTimer=setTimeout(()=>q('[data-toast]').textContent='',ms);}
async function request(path,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);try{const response=await fetch('/api/v3/'+path,{credentials:'same-origin',cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});return await response.json();}finally{clearTimeout(timer);}}
function accept(data){
 const previousRound=state?.campaignId;
 const previousTicket=lottery?.ticket?.id,previousRevealed=lottery?.ticket?.revealed;
 if(data.state){state=data.state;offset=Date.now()-state.serverNow;}
 if(data.ad)ad=data.ad;if(data.jackpot)jackpot=data.jackpot;if(data.campaign)campaign=data.campaign;if(data.lottery)lottery=data.lottery;
 if(previousRound&&state?.campaignId!==previousRound){onlineToken=null;needsEntry=true;toast('새 광고주 회차가 시작되어 골드와 일반 강화가 초기화됐습니다. 유료 장비와 경품 기록은 유지됩니다.',8000);if(panel==='lottery')showPanel('lottery');}
 else if(panel==='lottery'&&(previousTicket!==lottery?.ticket?.id||previousRevealed!==lottery?.ticket?.revealed))showPanel('lottery');
 paint();
}
function paint(){
 if(!state)return;
 const s=state,st=s.stats,full=s.ore>=st.capacity;
 if(jackpot){const el=q('[data-jackpot-count]'),value=fmt(jackpot.failedCycles)+' G';if(el.textContent!==value){setText(el,value);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)el.animate([{filter:'brightness(1.8)',transform:'scale(1.04)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:500});}}
 if(!running())minerMotion.stop();
 root.classList.toggle('is-full',full);q('[data-gold]').innerHTML=`${fmt(s.gold)} <small>G</small>`;
 q('[data-player]').dataset.character=s.character;q('[data-player]').setAttribute('aria-label',names[s.character]);q('[data-player-actor]').classList.toggle('trial',s.tool==='trial');
 q('[data-character-name]').textContent=names[s.character];q('[data-tool-name]').textContent=s.tool==='trial'?'황금 곡괭이 · 체험':'기본 곡괭이';
 q('[data-tool-name]').textContent=(s.tool==='trial'?'체험 · ':'')+pickAppearance(s).name;
 renderPickDecoration(q('[data-pick-decoration]'),s,currentFrame);
 for(const sel of ['[data-worker-level]','[data-dock-worker]'])q(sel).textContent='Lv.'+s.worker;
 for(const sel of ['[data-storage-level]','[data-dock-storage]'])q(sel).textContent='Lv.'+s.storage;
 q('[data-pick-level]').textContent='Lv.'+s.pick;
 q('[data-storage]').textContent=`${s.ore} / ${st.capacity}`;q('[data-fill]').style.width=(s.ore/st.capacity*100)+'%';
 q('[data-progress]').setAttribute('aria-valuenow',s.ore);q('[data-progress]').setAttribute('aria-valuemax',st.capacity);
 q('[data-chance]').textContent=`성공률 ${Math.round(st.chance*100)}%`;
 q('[data-auto-speed]').textContent='인부 휴식 · 종료 후 '+(st.autoMs/1000).toFixed(1)+'초마다 채굴';
 q('[data-storage-note]').textContent=full?'회수 후 자동채굴을 다시 눌러주세요':'가득 차면 회수할 수 있어요';
 setText(q('[data-status]'),foregroundPending()?'저장 결과 확인 중':full?'저장고 가득 참 · 채굴 정지':running()?'플레이어 자동채굴 중':'채굴 대기 · 인부 휴식');
 q('[data-collect]').disabled=!full||busy||!!pending;
 q('[data-collect-copy]').textContent=full?(ad?.enabled?'광고주 방문하고 회수':'테스트 페이지 방문 · +'+s.ore+' G'):'저장고를 채워주세요';
 q('[data-ad-tag]').textContent=ad?.enabled?'광고':'광산 소식';q('[data-ad-name]').textContent=ad?.name||'정참시 광산';q('[data-ad-copy]').textContent=ad?.message||'나만의 광산을 키워보세요';
 const adImage=q('[data-ad-image]');adImage.hidden=!ad?.imageUrl;if(ad?.imageUrl&&adImage.getAttribute('src')!==ad.imageUrl)adImage.src=ad.imageUrl;
 const sign=q('[data-sponsor-link]');if(ad?.enabled&&/^https:\/\//.test(ad.url||'')){sign.href=ad.url;sign.removeAttribute('aria-disabled');q('[data-ad-visit]').textContent='광고주 사이트 방문 ↗';}else{sign.removeAttribute('href');sign.setAttribute('aria-disabled','true');q('[data-ad-visit]').textContent='광고 준비 중';}
 q('[data-lottery-left]').textContent=campaign?(campaign.status==='closed'?'회차 종료':fmt(campaign.remaining)+'개 남음'):'20G';
 if(panel==='lottery')refreshLotteryNumbers(root,{campaign,lottery,state,busy:busy||!!pending});
 cooldown();
}
function cooldown(){if(!state)return;const active=running();q('[data-strike]').disabled=foregroundBusy()||!!foregroundPending()||!onlineToken||state.onlineToken!==onlineToken||state.ore>=state.stats.capacity;
 setText(q('[data-strike] b'),state.ore>=state.stats.capacity?'채굴 완료':active?'자동채굴 멈추기':'자동채굴하기');q('[data-strike]').setAttribute('aria-pressed',String(!!active));
 setText(q('[data-cooldown]'),active?'1.5초마다 자동 타격 중':'1.5초마다 한 번');q('[data-cooldown-fill]').style.width=active?((Date.now()-lastManual)%1500/1500*100)+'%':'100%';}
async function sync(){
 if(busy||!user||disposed)return;busy=true;paint();
 try{const retry=pending,data=await request('mine',retry||undefined);if(data.error==='MINE_FORBIDDEN'){accessDenied();return;}accept(data);if(retry&&data.state)storePending(null);
  if(!data.ok){if(data.error==='LOGIN_REQUIRED'){user=null;login();}else toast(errors[data.error]||'광산을 불러오지 못했어요. 다시 연결해 주세요.');}
  else if(retry?.action==='collect'&&data.result?.visitUrl){location.assign(data.result.visitUrl);return;}
  else if(retry?.action?.startsWith('lottery-'))showPanel('lottery');
  else if(data.result?.autoGained)effect(data.result.autoGained,false);
 }catch{toast('연결이 잠시 끊겼어요. 채굴 기록을 다시 확인하고 있습니다.',6000);}
 finally{busy=false;paint();}
}
async function action(actionName,extra={}){
 if(busy||pending||!state)return;busy=true;
 const body={action:actionName,requestId:crypto.randomUUID(),campaignId:campaign?.id,...extra};storePending(body);paint();
 if(actionName==='strike'){lastManual=Date.now();swing(q('[data-player]'));}
 try{
  const data=await request('mine',body);if(data.error==='MINE_FORBIDDEN'){accessDenied();return;}accept(data);if(data.state)storePending(null);
  if(!data.ok){if(data.error==='MINE_SESSION'){onlineToken=null;toast('채굴 연결이 종료됐어요. 도움말의 다시 연결을 눌러주세요.');}else toast(errors[data.error]||'작업을 처리하지 못했어요. 다시 시도해 주세요.');if(actionName.startsWith('lottery-'))showPanel('lottery');return;}
  if(data.result?.autoGained)effect(data.result.autoGained,false);
  if(actionName==='auto-start')lastManual=Date.now();
  if(actionName.startsWith('lottery-')){showPanel('lottery');return;}
  if(actionName==='collect'&&data.result?.visitUrl){dialog.close();location.assign(data.result.visitUrl);return;}
  if(actionName==='strike'){
   if(data.result.hits===2){later(()=>swing(q('[data-player]')),650);floating('더블 타격!','double');}
   later(()=>effect(data.result.gained,true),360);
  }else if(actionName==='character'){dialog.close();panel='';toast(names[state.character]+'와 채굴을 시작합니다.');}
  else if(actionName==='upgrade'){toast('강화 완료!');showPanel(extra.target);}
  else if(actionName==='tool'){toast(extra.tool==='trial'?'황금 곡괭이를 체험합니다. 결제는 없습니다.':pickAppearance(state).name+'를 장착했어요.');showPanel('pick');}
  else if(actionName==='test-fill'){dialog.close();panel='';toast('테스트용 저장고를 채웠어요. 이 회수는 광고 통계에서 제외됩니다.');}
 }catch{toast('저장 결과를 확인 중입니다. 연결되면 같은 요청을 이어갑니다.',7000);}
 finally{busy=false;paint();}
}
function swing(el){
 if(!state||state.ore>=state.stats.capacity||document.hidden||!running())return;
 minerMotion.play(matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function particles(){const mount=q('[data-effects]'),rock=q('[data-ore-rock]');rock.classList.remove('ore-hit');void rock.offsetWidth;rock.classList.add('ore-hit');for(let i=0;i<7;i++){const el=document.createElement('i');el.className='spark';el.style.setProperty('--dx',(Math.random()*110-70)+'px');el.style.setProperty('--dy',(-Math.random()*95-10)+'px');mount.append(el);later(()=>el.remove(),750);}}
function floating(text,kind=''){const el=document.createElement('span');el.className='ore-gain '+kind;el.textContent=text;q('[data-effects]').append(el);later(()=>el.remove(),1500);}
function effect(gained,manual){if(gained>0)floating('+'+gained+' 금');else if(manual)floating('다시 도전!','miss');}
function open(title,html){scratchCleanup?.();scratchCleanup=null;q('[data-dialog-title]').textContent=title;q('[data-dialog-body]').innerHTML=html;if(!dialog.open)dialog.showModal();}
function login(){open('내 광산을 시작하세요',`<p class="dialog-copy">정참시 계정으로 광물과 강화 내역을 저장합니다.</p><a class="gold-action" href="/login?return=%2Fmine" style="display:block;text-align:center;text-decoration:none">로그인하고 입장하기</a><p class="dialog-copy">광산 골드는 기존 정참시 포인트와 별도로 모입니다.</p>`);}
function showPanel(which){
 panel=which;if(which==='help'){open('광산 이용 방법',`<ul class="help-list"><li>공동 잭팟은 실패 1회당 1G씩 함께 적립합니다. 브론즈 100G · 실버 300G · 골드 1,000G 보상을 준비 중이며, 추첨과 지급은 아직 시작하지 않았습니다.</li><li>게임을 떠나면 인부가 기본 3초마다 채굴합니다. 게임을 켠 동안 인부는 쉽니다.</li><li>자동채굴하기를 누르면 플레이어가 1.5초마다 계속 타격합니다. 멈추기 버튼으로 중지할 수 있습니다. 다른 탭으로 이동하거나 창을 닫으면 인부 채굴로 바뀝니다.</li><li>기본 성공률은 3%. 성공하면 금 1개를 얻습니다. 성공률은 타격할 때마다 독립적으로 적용됩니다.</li><li>저장고가 가득 차야 회수할 수 있습니다. 회수 후 광고주 페이지로 이동하며, 뒤로가기로 돌아오면 됩니다.</li><li>곡괭이는 성공률, 인부는 자동 타격 속도를 높입니다. 저장고는 곡괭이 또는 인부가 필요한 단계에 도달하면 강화할 수 있습니다.</li><li>복권은 1회 20G, 당첨 확률은 5%입니다. 전체 당첨 한도에 도달하면 복권만 종료되고 채굴은 계속됩니다. 이전 경품은 복권 창의 당첨 내역에서 확인하세요.</li><li>새 광고주 회차를 시작하면 골드와 일반 강화는 초기화되며, 유료 장비 소유권과 경품 당첨 기록은 유지됩니다.</li><li>광산 골드는 정참시 포인트와 별도입니다. 황금 곡괭이는 이번 버전에서 무료 체험 장비입니다.</li></ul><button class="purple-action" data-reconnect>다시 연결</button>`);return;}
 if(!state){login();return;}
 if(which==='lottery'){
  open('광고주 경품 복권',lotteryMarkup({campaign,lottery,state,busy:busy||!!pending}));
  if(lottery?.ticket&&!lottery.ticket.revealed){const ticket=lottery.ticket;scratchCleanup=mountScratchCard(q('[data-scratch-ticket]'),{onReveal:()=>{pendingReveal={campaignId:ticket.campaignId,ticketId:ticket.id};q('.scratch-outcome')?.removeAttribute('aria-hidden');}});}
  return;
 }
 if(which==='jackpot'){
  showPanel('help');return;
 }
 if(which==='characters'){open('함께할 광부를 골라주세요',`<p class="dialog-copy">캐릭터는 외형 선택입니다. 채굴 능력은 장비와 강화로 결정됩니다.</p><div class="character-grid">${Object.entries(names).map(([id,name])=>`<button class="character-choice" data-character="${id}" aria-pressed="${state.character===id}"><img src="/assets/mine/${id}-portrait.webp" alt="${name}"><b>${name}</b><small>${id==='strong'?'묵직한 한 방':id==='glamour'?'당당한 발걸음':'작지만 큰 한 방'}</small></button>`).join('')}</div>`);return;}
 if(which==='admin'){void adminPanel();return;}
 if(!['pick','worker','storage'].includes(which))return;
 const s=state,st=s.stats,title={pick:'곡괭이 강화',worker:'인부 강화',storage:'저장고 확장'}[which],level=s[which],cost=st.costs[which],locked=which==='storage'&&Math.max(s.pick,s.worker)<st.storageRequirement,max=level>=(st.maxLevels?.[which]||st.maxLevel);
 const current=which==='pick'?Math.round(st.chance*100)+'%':which==='worker'?(st.autoMs/1000).toFixed(1)+'초':st.capacity+'금';
 const next=which==='pick'?Math.min(80,Math.round(st.chance*100)+2)+'%':which==='worker'?(Math.max(1100,st.autoMs-100)/1000).toFixed(1)+'초':st.capacity+10+'금';
 open(title,`<div class="upgrade-card"><h3>Lv.${level} ${max?'· 최고 단계':'→ Lv.'+(level+1)}</h3><div class="upgrade-line"><span>${which==='pick'?'채굴 성공률':which==='worker'?'자동 타격 간격':'저장고 용량'}</span><strong>${current}${max?'':' → '+next}</strong></div><div class="upgrade-line"><span>보유 골드</span><strong>${fmt(s.gold)} G</strong></div>${locked?`<p class="panel-error">곡괭이 또는 인부 Lv.${st.storageRequirement}부터 열립니다.</p>`:''}<button class="gold-action" data-upgrade="${which}" ${max||locked||s.gold<cost?'disabled':''}>${max?'최고 단계입니다':locked?'성장 조건을 먼저 채워주세요':s.gold<cost?`${fmt(cost-s.gold)} G 더 필요해요`:`${fmt(cost)} G · 강화하기`}</button></div>${which==='pick'?`<h3>장비 선택</h3><div class="tool-choice"><button data-tool="basic" aria-pressed="${s.tool==='basic'}">기본 곡괭이</button><button data-tool="trial" aria-pressed="${s.tool==='trial'}">황금 곡괭이 · 무료 체험</button></div><p class="dialog-copy">황금 곡괭이: 성공률 +12%p · 25% 확률로 추가 타격 1회.<br>추가 타격도 별도로 채굴 성공 여부를 계산합니다.</p>`:''}`);
 if(which==='pick'){
  const appearance=pickAppearance(s);
  q('[data-dialog-body]').insertAdjacentHTML('afterbegin',`<div class="pick-showcase"><img src="${appearance.image}" alt="${appearance.name}"><div><b>${appearance.name}</b><small>Lv.1 철 · Lv.2 은빛<br>Lv.7 황금 · Lv.14 자수정<br>타격 중 곡괭이 장식도 함께 바뀝니다.</small></div></div>`);
  if(s.paidPicks?.length)q('[data-dialog-body]').insertAdjacentHTML('beforeend',`<h3>보유 유료 장비 · 회차가 바뀌어도 유지</h3><div class="tool-choice">${s.paidPicks.map((id,i)=>`<button data-tool="${esc(id)}" aria-pressed="${s.tool===id}">보유 장비 ${i+1}</button>`).join('')}</div>`);
 }
}
async function adminPanel(){
 if(user?.role!=='admin')return;open('광고 관리','<p class="dialog-copy">광고 설정을 불러오는 중…</p>');
 try{await recoverAdminMutation();const data=await request('mine/admin');if(!data.ok)throw new Error(data.error);adminData=data;if(panel!=='admin')return;const a=data.ad;
 open('광고 관리',`<form class="admin-form" data-ad-form><label>광고 이미지 · JPG/PNG/WebP, 최대 1MB<input type="file" accept="image/jpeg,image/png,image/webp" data-ad-file></label><input type="hidden" name="imageUrl" value="${esc(a.imageUrl||'')}"><img class="ad-preview" data-ad-preview src="${esc(a.imageUrl||'')}" ${a.imageUrl?'':'hidden'} alt="광고 미리보기"><button type="button" data-ad-image-remove>이미지 지우기</button><p class="dialog-copy">권장 800×450px · 잘리지 않게 전체 표시합니다. 저장하면 적용됩니다.</p><label>광고주 이름<input type="text" name="name" maxlength="40" required value="${esc(a.name)}"></label><label>광산 간판 문구<input type="text" name="message" maxlength="90" value="${esc(a.message)}"></label><label>방문할 주소<input type="url" name="url" placeholder="https://" value="${esc(a.url)}"></label><label><input type="checkbox" name="enabled" ${a.enabled?'checked':''}> 실제 광고 연결</label><p class="dialog-copy">연결을 끄면 내부 테스트 페이지로 이동합니다.</p><button type="submit" class="gold-action">광고 설정 저장</button><p class="panel-error" data-ad-error role="status"></p></form><h3>최근 30일 광고 이동</h3><p class="dialog-copy">이동 수 ${fmt(data.rows.reduce((n,r)=>n+r.visits,0))}회 · 회원 수는 날짜별 중복 제외<br>테스트 회수는 집계에서 제외합니다.</p><table class="admin-table"><thead><tr><th>날짜</th><th>이동 수</th><th>참여 회원</th></tr></thead><tbody>${data.rows.filter((r,i)=>i<7||r.visits).map(r=>`<tr><td>${esc(r.day)}</td><td>${fmt(r.visits)}</td><td>${fmt(r.users)}</td></tr>`).join('')}</tbody></table><div class="admin-tools"><b>관리자 플레이 확인</b><p class="dialog-copy">현재 저장고를 채워 회수·광고 이동·강화를 바로 확인합니다. 광산 골드에만 반영됩니다.</p><button class="purple-action" data-test-fill>테스트 저장고 채우기</button></div>`);
  q('[data-dialog-body]').insertAdjacentHTML('beforeend',campaignAdminMarkup(data));
 }catch{if(panel==='admin')open('광고 관리','<p class="panel-error">설정을 불러오지 못했습니다. 닫은 뒤 다시 열어주세요.</p>');}
}
const adminPendingKey=()=>`jcs.mine.admin.pending.${user?.id||''}`;
function getAdminPending(){try{return JSON.parse(sessionStorage.getItem(adminPendingKey())||'null');}catch{return null;}}
function setAdminPending(value){try{if(value)sessionStorage.setItem(adminPendingKey(),JSON.stringify(value));else sessionStorage.removeItem(adminPendingKey());}catch{}}
async function recoverAdminMutation(){
 const body=getAdminPending();if(!body)return;
 const data=await request('mine/admin',body);
 if(data.ok||!['MINE_NETWORK','MINE_BUSY'].includes(data.error))setAdminPending(null);
 if(!data.ok)throw Error(errors[data.error]||'이전 저장 결과를 확인하지 못했습니다. 다시 열어주세요.');
}
async function saveCampaign(body){
 const existing=getAdminPending();if(existing){await recoverAdminMutation();throw Error('이전 저장을 확인했습니다. 현재 회차 정보를 다시 불러온 뒤 진행해 주세요.');}
 const requestBody={...body,requestId:crypto.randomUUID()};setAdminPending(requestBody);
 const data=await request('mine/admin',requestBody);
 if(data.ok||!['MINE_NETWORK','MINE_BUSY'].includes(data.error))setAdminPending(null);
 if(!data.ok)throw Error(errors[data.error]||'저장하지 못했습니다. 다시 확인해 주세요.');
 return data;
}
async function updateFulfillment(button){
 button.disabled=true;
 try{await saveCampaign({action:'campaign-fulfill',campaignId:adminData.campaign.id,ticketId:button.dataset.fulfillTicket,fulfilled:true});toast('경품 전달 완료로 표시했습니다.');await adminPanel();}
 catch(e){toast(e.message||'전달 상태를 저장하지 못했습니다.');button.disabled=false;}
}
async function loadWinners(campaignId){
 try{const data=await request('mine/admin',{action:'campaign-winners',campaignId});if(!data.ok)throw Error();
  const current=q('.campaign-admin');if(!current)return;
  const source={...adminData,winners:data.winners};current.outerHTML=campaignAdminMarkup(source);toast(data.campaign.title+' 당첨자 목록');
 }catch{toast('당첨자 목록을 불러오지 못했습니다.');}
}
root.addEventListener('submit',async event=>{
 const f=event.target;if(!f.matches('[data-campaign-start],[data-campaign-update]'))return;event.preventDefault();
 const b=f.querySelector('[type=submit]'),message=f.querySelector('[data-campaign-error]'),fd=new FormData(f),starting=f.hasAttribute('data-campaign-start');
 if(starting&&!fd.has('confirmReset'))return;
 b.disabled=true;message.textContent='저장 중…';
 try{
  const data=await saveCampaign({action:starting?'campaign-start':'campaign-update',campaignId:adminData.campaign.id,title:fd.get('title'),prize:fd.get('prize'),limit:Number(fd.get('limit')),...(starting?{ad:{name:fd.get('name'),message:fd.get('message'),url:fd.get('url'),enabled:true}}:{})});
  if(data.ad)ad=data.ad;toast(starting?'새 광고주 회차를 시작했습니다.':'회차 설정을 저장했습니다.');
  await sync();await adminPanel();
 }catch(e){message.textContent=e.message||'저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인합니다.';}
 finally{b.disabled=false;}
});
root.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.hasAttribute('data-ad-image-remove')){const f=b.closest('form');f.elements.imageUrl.value='';f.querySelector('[data-ad-preview]').hidden=true;}
 else if(b.hasAttribute('data-close')){dialog.close();panel='';}
 else if(b.dataset.panel)showPanel(b.dataset.panel);
 else if(b.dataset.character)void action('character',{character:b.dataset.character});
 else if(b.hasAttribute('data-strike'))void action(running()?'auto-stop':'auto-start',presenceExtra());
 else if(b.hasAttribute('data-collect'))void action('collect',{cycle:state.cycle});
 else if(b.dataset.upgrade)void action('upgrade',{target:b.dataset.upgrade});
 else if(b.dataset.tool)void action('tool',{tool:b.dataset.tool});
 else if(b.hasAttribute('data-test-fill'))void action('test-fill');
 else if(b.hasAttribute('data-lottery-buy'))void action('lottery-buy',{campaignId:campaign.id,expectedPlays:lottery.plays});
 else if(b.dataset.fulfillTicket)void updateFulfillment(b);
 else if(b.dataset.winnerRound)void loadWinners(b.dataset.winnerRound);
 else if(b.hasAttribute('data-reconnect')){dialog.close();void sync().then(enterGame);}
});
root.addEventListener('submit',async event=>{if(!event.target.matches('[data-ad-form]'))return;event.preventDefault();const f=event.target,button=f.querySelector('button[type=submit]');button.disabled=true;const fd=new FormData(f);try{const data=await request('mine/admin',{name:fd.get('name'),message:fd.get('message'),url:fd.get('url'),imageUrl:fd.get('imageUrl'),enabled:fd.has('enabled')});if(!data.ok)throw new Error(errors[data.error]||'저장하지 못했습니다.');ad=data.ad;paint();f.querySelector('[data-ad-error]').textContent='저장했습니다.';}catch(e){f.querySelector('[data-ad-error]').textContent=e.message||'연결 상태를 확인해 주세요.';}finally{button.disabled=false;}});
dialog.addEventListener('cancel',()=>panel='');
dialog.addEventListener('close',()=>{scratchCleanup?.();scratchCleanup=null;panel='';});
async function boot(){
 let session;
 try{session=await request('user/session');if(!session.authenticated||session.user?.role!=='admin'){accessDenied();return;}}catch{accessDenied();return;}
 root.style.visibility='visible';
 if(location.pathname.replace(/\/$/,'')==='/mine/ad'){
  document.title='광고 이동 체험 · 정참시';document.body.innerHTML='<main class="test-ad-page"><section class="test-ad-card"><small>광고 이동 체험</small><h1>광물 회수를 마쳤어요</h1><p>실제 광고주 주소가 아직 연결되지 않아<br>이 안내 페이지로 이동했습니다.</p><p>브라우저의 뒤로가기를 누르면<br>진행 중인 광산으로 돌아갑니다.</p><button class="gold-action" id="back-to-mine">광산으로 돌아가기</button></section></main>';document.getElementById('back-to-mine').onclick=()=>{if(history.length>1)history.back();else location.replace('/mine');};return;
 }
 try{
  user=session.user;q('[data-admin]').hidden=user.role!=='admin';
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey())||'null');if(saved?.requestId)pending=saved;}catch{}
  await sync();await enterGame();if(state&&!state.chosen&&!pending)showPanel('characters');
 }catch{open('광산 연결','<p class="dialog-copy">연결을 확인하지 못했습니다. 잠시 후 다시 입장해 주세요.</p><a href="/mine" class="gold-action" style="display:block;text-align:center">다시 입장하기</a>');}
}
function accessDenied(){
 disposed=true;user=null;state=null;onlineToken=null;scratchCleanup?.();minerMotion.stop();
 root.style.visibility='visible';root.className='test-ad-page';
 root.innerHTML='<section class="test-ad-card"><h1>권한이 없습니다.</h1><p>관리자에게 권한을 요청해 주세요.</p><a class="gold-action" href="/">정참시 메인으로 돌아가기</a></section>';
}
const ticker=setInterval(()=>{
 if(disposed||!state)return;
 const notice=idleNotice({now:Date.now(),visible:!document.hidden,running:!!running(),full:state.ore>=state.stats.capacity,ready:!!onlineToken});
 setText(q('[data-idle-notice]'),notice);q('[data-idle-notice]').hidden=!notice;
 if(document.hidden)return;cooldown();
 if(!running())minerMotion.stop();
 if(needsEntry&&!busy&&!pending){void enterGame();return;}
 if(pendingReveal&&!busy&&!pending){const reveal=pendingReveal;pendingReveal=null;void action('lottery-reveal',reveal);return;}
 if(running()&&state.ore<state.stats.capacity&&Date.now()-lastManual>=1500){lastManual=Date.now();swing(q('[data-player]'));}
 if(user&&!busy&&!pending&&onlineToken&&Date.now()-lastHeartbeat>=4000){lastHeartbeat=Date.now();void action('heartbeat',presenceExtra());}
},100);
const syncTimer=setInterval(()=>{if(!document.hidden&&pending)void sync();},4000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)leaveGame();else void sync().then(enterGame);});
window.addEventListener('pageshow',e=>{if(e.persisted){disposed=false;void sync().then(enterGame);}});
window.addEventListener('pagehide',()=>{leaveGame();disposed=true;});
void boot();

root.addEventListener('change',async event=>{
 if(!event.target.matches('[data-ad-file]'))return;
 const input=event.target,file=input.files[0],f=input.closest('form'),button=f.querySelector('[type=submit]'),message=f.querySelector('[data-ad-error]');if(!file)return;
 if(file.size>1048576||!['image/jpeg','image/png','image/webp'].includes(file.type)){message.textContent='1MB 이하의 JPG, PNG, WebP 이미지를 선택해 주세요.';input.value='';return;}
 button.disabled=true;input.disabled=true;message.textContent='이미지를 올리고 있어요…';
 try{const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
 const data=await request('mine/image',{base64:encoded,contentType:file.type});if(!data.ok)throw Error(data.error);
 f.elements.imageUrl.value=data.url;const preview=f.querySelector('[data-ad-preview]');preview.src=data.url;preview.hidden=false;message.textContent='이미지 준비 완료. 광고 설정 저장을 눌러 적용하세요.';
 }catch{message.textContent='이미지를 올리지 못했습니다. 이미지 저장소 연결 또는 파일을 확인한 뒤 다시 선택해 주세요.';}
 finally{button.disabled=false;input.disabled=false;input.value='';}
});
