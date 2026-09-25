export const worldMapMarkup=()=>`<section class="mine-world" data-world hidden aria-label="일일퀘스트 월드맵">
 <div class="world-terrain" aria-hidden="true"></div>
 <header class="world-header"><button data-world-home aria-label="광산으로 돌아가기">‹ <span>광산으로</span></button><h2>일일퀘스트</h2><button data-world-home aria-label="월드맵 닫기">×</button></header>
 <div class="world-landmarks"><button class="world-place world-mine" data-world-home><span class="world-place-name">나의 광산</span><small>돌아가기</small></button>
 <button class="world-place world-raid" data-panel="raid"><span class="world-place-name">후회없는 약탈</span><small data-world-attempts>오늘 0 / 3</small><span class="world-badge" data-world-badge>1회 도전</span></button></div>
 <footer class="world-quest" aria-live="polite"><span class="world-compass" aria-hidden="true">✧</span><div><strong data-world-progress>오늘의 퀘스트 0 / 1</strong><p data-world-description>후회없는 약탈에 1회 도전하기</p></div></footer>
 </section>`;
export function updateWorldMap(root,raid){
 const complete=!!raid?.complete,used=raid?.used||0;
 root.querySelector('[data-world-attempts]').textContent=`오늘 ${used} / 3`;
 root.querySelector('[data-world-badge]').textContent=complete?'완료':'1회 도전';
 root.querySelector('[data-world-progress]').textContent=`오늘의 퀘스트 ${complete?1:0} / 1`;
 root.querySelector('[data-world-description]').textContent=complete?(used===3?'오늘의 도전을 모두 마쳤습니다':'퀘스트 완료 · 약탈 '+(3-used)+'회 더 도전 가능'):'후회없는 약탈에 1회 도전하기';
 root.querySelector('[data-world]').classList.toggle('quest-complete',complete);
}
