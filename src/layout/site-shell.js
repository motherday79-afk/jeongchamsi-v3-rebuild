import { SERVICE_CATALOG, serviceIconSvg } from '../ui/service-icons.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderInitialLoading(target){
  if(!target||Number(target.childElementCount||0)>0||String(target.innerHTML||'').trim())return false;
  target.innerHTML='<main class="app-initial-loading" role="status" aria-live="polite"><div class="app-initial-loading-card"><span class="app-initial-loading-mark" aria-hidden="true"><i></i><i></i><i></i></span><b>정참시</b><p>정참시를 불러오고 있습니다</p></div></main>';
  return true;
}

export function siteHeader(memberCount=0,session={authenticated:false,user:null}){
  const authenticated=session?.authenticated===true;
  const nickname=esc(session?.user?.nickname||'회원');
  const account=authenticated
    ? `<button class="product-user-chip" type="button" data-layout-route="/mypage" aria-label="${nickname}님 마이페이지"><span>${nickname}님</span></button>`
    : `<button class="product-login-chip" type="button" data-layout-route="/login">로그인</button>`;
  return `<header class="site-header product-header"><div class="product-head-main"><button class="product-menu" type="button" aria-label="전체 메뉴 열기" aria-expanded="false" data-drawer-open><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><a class="product-wordmark" href="#/" data-layout-route="/"><b>정참시</b><span>JEONGCHAMSI</span></a><form class="product-search" data-layout-search><input name="q" aria-label="통합 검색" placeholder="정치인, 정당, 이슈를 검색하세요" autocomplete="off" data-politician-autocomplete data-politician-select-mode="value"><button type="submit" aria-label="검색"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></button></form><div class="product-account-tools"><button type="button" data-layout-route="/mypage/activity" aria-label="내 참여와 배지">${serviceIconSvg('badge')}</button><button type="button" data-layout-route="/mypage/recent" aria-label="최근 본 정치인">${serviceIconSvg('recent')}</button>${account}</div></div><div class="product-service-bar live-community-bar"><div class="live-community-inner"><div class="live-community-count"><b>${Number(memberCount).toLocaleString('ko-KR')}</b><span>명이 정참시와 함께합니다</span></div><div class="live-community-actions"><a class="live-community-cta is-active" href="#/about" data-layout-route="/about">정참시 응원하기 <span>→</span></a><a class="live-community-cta" href="#/support" data-layout-route="/support">정참시 후원하기 <span>♡</span></a></div></div></div></header>`;
}

export function drawer(session={authenticated:false,user:null}){
  const services=SERVICE_CATALOG.map(item=>`<a class="drawer-service-item drawer-service-${item.key} drawer-tone-${item.tone}" href="#${item.href}" data-layout-route="${item.href}"><span class="drawer-service-icon">${serviceIconSvg(item.key)}</span><span class="drawer-service-copy"><b>${item.label}</b><small>${item.description}</small></span><em>→</em></a>`).join('');
  const authenticated=session?.authenticated===true;
  const nickname=esc(session?.user?.nickname||'회원');
  const adminLink=authenticated&&session.user?.role==='admin'?`<a href="#/admin" data-layout-route="/admin">관리자</a>`:'';
  const account=authenticated?`<div class="drawer-account drawer-account-live"><div class="drawer-account-copy"><b>${nickname}님</b><span>${session.user?.role==='admin'?'관리자 계정':'정참시 회원'}</span></div><a class="drawer-account-arrow" href="#/mypage" data-layout-route="/mypage" aria-label="마이페이지">›</a></div>`:`<div class="drawer-account"><div class="drawer-account-copy"><b>로그인하세요</b><span>참여·투표·활동을 한곳에서 관리하세요</span></div><a class="drawer-account-arrow" href="#/login" data-layout-route="/login" aria-label="로그인">›</a></div>`;
  const personal=`<section class="drawer-block drawer-personal"><div class="drawer-mini-links"><a href="#/mypage/activity" data-layout-route="/mypage/activity"><span>${serviceIconSvg('badge')}</span><span><b>내 참여 · 배지</b><small>참여 기록과 대표 배지</small></span></a><a href="#/mypage/recent" data-layout-route="/mypage/recent"><span>${serviceIconSvg('recent')}</span><span><b>최근 본 정치인</b><small>최근 확인한 인물</small></span></a></div></section>`;
  return `<div class="drawer-backdrop" data-drawer-close hidden></div><aside class="app-drawer" data-drawer hidden aria-hidden="true" aria-label="정참시 전체 메뉴"><div class="drawer-head"><div><span>JEONGCHAMSI</span><b>정참시 전체메뉴</b></div><button type="button" aria-label="전체 메뉴 닫기" data-drawer-close>×</button></div>${account}<section class="drawer-block drawer-service-block"><div class="drawer-block-head"><b>전체 서비스</b><span>정참시 서비스 메뉴</span></div><div class="drawer-service-grid">${services}</div></section>${personal}<section class="drawer-block drawer-utility"><div class="drawer-utility-links">${adminLink}<a href="#/about" data-layout-route="/about">정참시 소개</a><a href="#/guide" data-layout-route="/guide">이용안내</a><a href="#/privacy" data-layout-route="/privacy">개인정보처리방침</a><a href="#/policy" data-layout-route="/policy">운영정책</a><a href="#/request-politician" data-layout-route="/request-politician">정치인 등록 요청</a><a href="#/partners" data-layout-route="/partners">파트너스 신청</a></div></section></aside>`;
}
export function footer(){return `<footer class="footer"><div><b>정참시</b><span>정치에 참여할 시간</span></div><nav class="footer-links"><a href="#/guide" data-layout-route="/guide">이용안내</a><a href="#/privacy" data-layout-route="/privacy">개인정보처리방침</a><a href="#/policy" data-layout-route="/policy">운영정책</a></nav></footer>`;}
