import {shareableUrlForRoute} from '../core/navigation.js?v=0.0.31.377';
export const SHARE_PAGES={'mock-bill':'JCS AI 모의법안 발의','political-map':'대한민국 정치지도','ai-panel':'JCS 여론조사','political-comic':'정치4컷',now:'나우랭크',person:'정치인 데이터',compare:'정치인 비교분석',shop:'정참시 쇼핑몰',poll:'시티즌 초이스',column:'정참시 칼럼',news:'정참시 뉴스',community:'정뮤니티',itsme:'잇츠미',groups:'정참시 모임',campaigns:'정참시 캠페인',president:'대한민국 대통령','generation-president':'세대별 선택',about:'정참시 소개',points:'정참시 포인트',support:'정참시 응원'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicShareRoute(route){
 const u=new URL(route,'https://www.jeongchamsi.com'),parts=u.pathname.split('/').filter(Boolean);
 if(u.origin!=='https://www.jeongchamsi.com'||!SHARE_PAGES[parts[0]]||parts.some(p=>['write','edit','request','admin','manage'].includes(p)))return '';
 const clean=new URLSearchParams();for(const key of ['type','ids','tab','panel','id','period','publisher','category','view'])if(u.searchParams.has(key))clean.set(key,u.searchParams.get(key));
 return u.pathname+(clean.size?'?'+clean:'');
}
function shareActions(route){
 const clean=publicShareRoute(route);if(!clean)return '';
 return '<div class="page-share-bar"><button type="button" data-page-share="'+esc(clean)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-3M9 14l6 3"/></svg>공유하기</button><span data-page-share-state role="status"></span></div>';
}
export function renderPageShare(route){return publicShareRoute(route)?'<div class="page-share-entry">'+renderShareMenu(route)+'</div>':'';}
export function renderShareMenu(route){if(!publicShareRoute(route))return '';return '<details class="jc-menu comic-share-menu"><summary aria-label="게시글 메뉴">…</summary><div class="jc-popover">'+shareActions(route)+'</div></details>';}
export async function sharePage(route,title,capabilities=globalThis.navigator){
 const clean=publicShareRoute(route);if(!clean)throw Error('SHARE_UNAVAILABLE');const url=shareableUrlForRoute(clean);
 if(typeof capabilities?.share==='function')try{await capabilities.share({title,url});return {status:'shared',url};}catch(e){if(e.name==='AbortError')return {status:'cancelled',url};}
 try{if(capabilities?.clipboard?.writeText){await capabilities.clipboard.writeText(url);return {status:'copied',url};}}catch{}
 return {status:'manual',url};
}
export function bindPageShare(root){
 root.addEventListener('click',async event=>{
  const b=event.target.closest('[data-page-share]');if(!b||b.disabled)return;event.preventDefault();b.disabled=true;
  const state=b.parentElement.querySelector('[data-page-share-state]');
  try{const title=root.querySelector('.comic-reader h1,.subpage h1,main h1,h1')?.textContent?.trim()||SHARE_PAGES[b.dataset.pageShare.split('/')[1]?.split('?')[0]]||'정참시';const result=await sharePage(b.dataset.pageShare,title);
   if(result.status==='copied')state.textContent='링크를 복사했습니다.';
   if(result.status==='manual'){state.textContent='아래 주소를 복사해 주세요.';let input=b.parentElement.querySelector('input');if(!input){input=root.createElement?root.createElement('input'):document.createElement('input');input.readOnly=true;input.setAttribute('aria-label','공유 주소');b.parentElement.append(input);}input.value=result.url;input.focus();input.select();}
  }catch{state.textContent='공유하지 못했습니다. 다시 시도해 주세요.';}finally{b.disabled=false;}
 });
}
