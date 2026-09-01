import { HOME_FIXTURE } from './fixtures/home.js';
import { siteHeader, drawer, footer } from './layout/site-shell.js';
import { renderHomeLayout } from './layout/home-layout.js';
import { setupLayoutInteractions } from './ui/interactions.js';

const app=document.getElementById('app');
function renderHome(){app.innerHTML=`<div class="site-shell">${siteHeader(HOME_FIXTURE.memberCount)}<div class="page-wrap product-home-wrap">${renderHomeLayout(HOME_FIXTURE)}</div>${footer()}${drawer()}</div>`;setupLayoutInteractions(document);}
function renderPlaceholder(route){app.innerHTML=`<div class="site-shell">${siteHeader(HOME_FIXTURE.memberCount)}<div class="page-wrap"><section class="module"><span class="eyebrow">LAYOUT FOUNDATION</span><h2>${route}</h2><p class="module-desc">이 화면의 기능과 데이터는 다음 단계에서 새 구조로 구현합니다. 메인으로 돌아가 레이아웃을 계속 검수할 수 있습니다.</p><button class="ghost-btn" type="button" data-layout-route="/">메인으로</button></section></div>${footer()}${drawer()}</div>`;setupLayoutInteractions(document);}
window.addEventListener('jcs:layout-route',event=>{const route=event.detail?.route||'/';if(route==='/')renderHome();else renderPlaceholder(route);window.scrollTo(0,0);});
window.addEventListener('jcs:layout-search',event=>renderPlaceholder(`/search?q=${encodeURIComponent(event.detail?.query||'')}`));
renderHome();
