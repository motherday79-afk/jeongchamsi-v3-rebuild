export const worldMapMarkup=()=>`<section class="mine-world" data-world hidden aria-label="월드맵">
 <div class="world-terrain" aria-hidden="true"></div>
 <header class="world-header"><button data-world-home aria-label="광산으로 돌아가기">‹ <span>광산으로</span></button><h2><img class="world-title-art" src="/assets/mine/world-title-310.webp" alt="월드맵"></h2></header>
 <div class="world-landmarks"><button class="world-place world-mine" data-world-home aria-label="나의 광산으로 돌아가기"><span class="world-place-name">나의 광산</span></button>
 <button class="world-place world-raid" data-panel="raid" aria-label="후회없는 약탈 입장"><span class="world-place-name">후회없는 약탈</span><span class="world-badge" data-world-badge>1회 도전</span></button></div>
 <button class="world-quest" data-panel="quests" aria-label="오늘의 퀘스트 자세히 보기"><span class="world-quest-label">오늘의 퀘스트</span><strong data-world-progress>0/1</strong></button>
 </section>`;
export function updateWorldMap(root,raid){
 const complete=!!raid?.complete;
 root.querySelector('[data-world-badge]').textContent=complete?'완료':'1회 도전';
 root.querySelector('[data-world-progress]').textContent=`${complete?1:0}/1`;
 root.querySelector('[data-world]').classList.toggle('quest-complete',complete);
}
export function questMarkup(raid){
 const complete=!!raid?.complete,used=raid?.used||0;
 return `<section class="quest-scroll-page"><header class="quest-page-title"><small>오늘의 모험 기록</small><h3>오늘의 퀘스트</h3><p>${complete?1:0} / 1 완료 · 진행률 ${complete?'100':'00'}%</p></header>
 <div class="quest-page-track" role="progressbar" aria-label="오늘의 퀘스트 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${complete?100:0}"><i style="width:${complete?100:0}%"></i></div>
 <article class="quest-entry ${complete?'quest-entry-done':''}"><div class="quest-entry-heading"><span class="quest-seal" aria-hidden="true">${complete?'✓':'Ⅰ'}</span><div><small>${complete?'완료한 퀘스트':'진행할 퀘스트'}</small><h4>후회없는 약탈</h4></div><b class="quest-status">${complete?'완료':'미완료'}</b></div><p>세 광산 중 하나를 선택해 1회 도전하세요.<br>성공하거나 실패해도 퀘스트가 완료됩니다.</p><dl><div><dt>오늘 한 일</dt><dd>${used?`약탈 ${used}회 도전`:'아직 도전하지 않았습니다'}</dd></div><div><dt>앞으로 할 일</dt><dd>${complete?'오늘의 퀘스트를 모두 마쳤습니다':'후회없는 약탈에서 카드 1장 선택하기'}</dd></div><div><dt>남은 도전</dt><dd>${3-used}회 / 하루 3회</dd></div></dl><button class="quest-go" data-panel="raid">${complete?'후회없는 약탈 보기':'도전하러 가기'} ›</button></article>
 <footer class="quest-page-note">매일 오전 0시, 새로운 하루의 퀘스트가 시작됩니다.<br>한국 시간 기준 · 참여는 자유입니다.</footer></section>`;
}
