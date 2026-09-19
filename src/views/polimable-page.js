const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// 31.205: 폴리마블 페이지는 승인된 1200×675 백그라운드 디자인만 노출한다.
// 기존 보드/주사위/점수/전략카드/랭킹 DOM은 의도적으로 렌더링하지 않는다.
export function renderPoliMarblePage(){
  return `<section class="pm-page pm-background-only-page" aria-label="JCS 폴리마블">
    <div class="pm-background-stage" role="img" aria-label="JCS 폴리마블 1200 × 675 게임 배경"></div>
  </section>`;
}

export function renderPoliMarbleSidebarCard(data={},session={}){
  return `<section class="side-card side-polimable"><button type="button" class="pm-side-entry" data-layout-route="/polimable" aria-label="JCS 폴리마블 게임 바로가기"><img src="/assets/polimable/sidebar-entry-31-204.webp" alt="JCS 폴리마블"><span>GAME START <b>→</b></span></button></section>`;
}
