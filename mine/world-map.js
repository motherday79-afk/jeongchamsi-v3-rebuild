export const worldMapMarkup=()=>`<section class="mine-world" data-world hidden aria-label="월드맵">
 <div class="world-terrain" aria-hidden="true"></div>
 <header class="world-header"><button data-world-home aria-label="광산으로 돌아가기">‹ <span>광산으로</span></button><h2><img class="world-title-art" src="/assets/mine/world-title-310.webp" alt="월드맵"></h2></header>
 <div class="world-landmarks"><button class="world-place world-mine" data-world-home aria-label="나의 광산으로 돌아가기"><span class="world-place-name">나의 광산</span></button>
 <button class="world-place world-raid" data-panel="raid" aria-label="후회없는 약탈 입장"><span class="world-place-name">후회없는 약탈</span><span class="world-badge" data-world-badge>1회 도전</span></button></div>
 <button class="world-valley" data-panel="valley" aria-label="망자의 계곡 입장"><img src="/assets/mine/valley-316/title.png" alt="망자의 계곡"><small data-valley-badge>운송 성공 1회</small></button>
 <button class="world-tower" data-panel="tower" aria-label="오만의 탑 입장"><img src="/assets/mine/tower-326/title.png" alt="오만의 탑"><small>끝없는 층에 도전</small></button>
 <button class="world-eye" data-panel="eye" aria-label="깨어있는 눈 입장"><img src="/assets/mine/eye-324/title.png" alt="깨어있는 눈"><small data-eye-badge>보물 3개 찾기</small></button>
 <button class="world-forest" data-panel="forest" aria-label="노래하는 숲 입장"><img src="/assets/mine/forest-322/title.png" alt="노래하는 숲"><small data-forest-badge>한 곡 클리어</small></button>
 <button class="world-quest" data-panel="quests" aria-label="오늘의 퀘스트 자세히 보기"><span class="world-quest-label">오늘의 퀘스트</span><strong data-world-progress>0/7</strong></button>
 </section>`;
export function updateWorldMap(root,raid,quests){
 root.querySelector('[data-eye-badge]').textContent=quests?.eye?'오늘 탐색 완료':'보물 3개 찾기';
 const complete=!!raid?.complete;
 root.querySelector('[data-forest-badge]').textContent=quests?.forest?'오늘 연주 완료':'한 곡 클리어';
 root.querySelector('[data-valley-badge]').textContent=quests?.valley?'오늘 운송 완료':'운송 성공 1회';
 root.querySelector('[data-world-badge]').textContent=complete?'완료':'1회 도전';
 root.querySelector('[data-world-progress]').textContent=`${quests?.completed??Number(complete)}/7`;
 root.querySelector('[data-world]').classList.toggle('quest-complete',quests?.completed===7);
}
export function questMarkup(raid,quests){
 const used=raid?.used||0,autoStart=quests?.autoStart||0,collect=quests?.collect||0,completed=quests?.completed??Number(!!raid?.complete);
 const entries=[
  {art:'tower',name:'오만의 탑',count:Number(!!quests?.tower),goal:1,description:'오늘 오만의 탑에서 한 개 층을 클리어하세요.',action:'data-panel="tower"',button:'탑으로 가기'},
  {art:'eye',name:'깨어있는 눈',count:Number(!!quests?.eye),goal:1,description:'20장의 카드를 추적해 세 번의 시도 안에 보물 3개를 찾으세요.',action:'data-panel="eye"',button:'유적으로 가기'},
  {art:'forest',name:'노래하는 숲',count:Number(!!quests?.forest),goal:1,description:'난이도와 관계없이 한 곡을 정확도 70% 이상으로 클리어하세요.',action:'data-panel="forest"',button:'숲으로 가기'},
  {art:'valley',name:'망자의 계곡',count:Number(!!quests?.valley),goal:1,description:'수레 내구도 3칸으로 60초 운송을 완수하세요. 별도 보상은 지급되지 않습니다.',action:'data-panel="valley"',button:'계곡으로 가기'},
  {art:'raid',name:'후회없는 약탈',count:Math.min(1,used),goal:1,description:'승패와 관계없이 카드 1장을 선택해 도전하세요.',action:'data-panel="raid"',button:'약탈하러 가기'},
  {art:'auto',name:'자동채굴하기',count:autoStart,goal:1,description:'광산에서 자동채굴하기를 눌러 채굴을 시작하세요.',action:'data-world-home',button:'광산으로 가기'},
  {art:'collect',name:'광물 회수하기',count:collect,goal:5,description:'저장고가 가득 차면 광물을 회수하세요. 하루 5회 회수하면 완료됩니다.',action:'data-world-home',button:'광산으로 가기'}
 ];
 return `<section class="quest-scroll-page"><header class="quest-page-title"><small>오늘의 모험 기록</small><h3 class="quest-heading-art"><span class="quest-accessible">오늘의 퀘스트</span><b>${completed}/7</b></h3></header>
 ${entries.map((q,i)=>{const done=q.count>=q.goal;return `<article class="quest-entry ${done?'quest-entry-done':''}"><div class="quest-entry-heading"><span class="quest-seal" aria-hidden="true">${done?'✓':['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'][i]}</span><div class="quest-name-wrap"><small>${done?'완료한 퀘스트':'진행할 퀘스트'}</small><h4 class="quest-name-art quest-name-${q.art}"><span class="quest-accessible">${q.name}</span></h4></div><b class="quest-status">${q.count} / ${q.goal}</b></div><p>${q.description}</p><dl><div><dt>오늘 한 일</dt><dd>${q.count}회 완료</dd></div><div><dt>앞으로 할 일</dt><dd>${done?'이 퀘스트를 완료했습니다':`${q.goal-q.count}회 더 진행하세요`}</dd></div></dl><button class="quest-go quest-go-${q.art}" ${q.action} aria-label="${q.button}"><span class="quest-accessible">${q.button}</span></button></article>`;}).join('')}
 <footer class="quest-page-note">매일 오전 0시, 새로운 하루의 퀘스트가 시작됩니다.<br>한국 시간 기준 · 참여는 자유입니다.</footer></section>`;
}
