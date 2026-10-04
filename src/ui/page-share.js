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
export function renderShareMenu(route,actions=''){if(!publicShareRoute(route))return '';return '<details class="jc-menu comic-share-menu"><summary aria-label="게시글 메뉴">…</summary><div class="jc-popover">'+shareActions(route)+actions+'</div></details>';}
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
export function placePageShare(root=document){
 const scope=root.querySelector('#app')||root;
 for(const entry of scope.querySelectorAll('.page-share-entry')){
  const menu=entry.querySelector('details');if(!menu){entry.remove();continue;}
  const heading=scope.querySelector('.jcs-report-head h1,.cb-heading h1,.subpage h1,main h1,h1,.subpage h2,main h2,h2');
  let host=heading?.closest('header');
  if(!host&&heading){host=document.createElement('div');heading.before(host);host.append(heading);}
  host=host||scope.querySelector('main,section');if(!host)continue;
  host.classList.add('page-share-title');host.append(menu);entry.remove();
 }
 wireContentMenus(scope);
 for(const menu of scope.querySelectorAll('.comic-share-menu')){const host=menu.parentElement;if(host?.matches('header'))host.classList.add('page-share-title');}
}

const actionIcon=kind=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(kind==='delete'?'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>':'<path d="m16 3 5 5-13 13H3v-5L16 3ZM13 6l5 5"/>')+'</svg>';
// Only connect controls already rendered by the authorized content view.
function wireContentMenus(scope){
 for(const card of scope.querySelectorAll('.group-post,.group-gallery-card,.group-event')){
  if(card.dataset.menuConnected)continue;card.dataset.menuConnected='true';
  const holder=document.createElement('div');holder.innerHTML=renderShareMenu(location.pathname+location.search);const menu=holder.firstElementChild;if(!menu)continue;
  menu.classList.remove('comic-share-menu');menu.classList.add('content-action-menu');card.prepend(menu);
  const popover=menu.querySelector('.jc-popover');
  const editForm=card.querySelector('details form[data-group-post-form],details form[data-group-event-form]');
  const deleteForm=[...card.querySelectorAll('form[data-group-action-form]')].find(f=>['post-delete','event-delete'].includes(f.elements.operation?.value));
  for(const [kind,form] of [['edit',editForm],['delete',deleteForm]]){
   if(!form)continue;const editor=form.closest('details');if(kind==='edit'&&editor)editor.querySelector('summary').hidden=true;if(kind==='delete')form.hidden=true;
   const button=document.createElement('button');button.type='button';button.innerHTML=actionIcon(kind)+(kind==='edit'?'수정':'삭제');if(kind==='delete')button.className='jc-danger';
   button.addEventListener('click',()=>{menu.open=false;for(let ancestor=form.parentElement;ancestor&&ancestor!==scope;ancestor=ancestor.parentElement)if(ancestor.matches('details'))ancestor.open=true;form.hidden=false;const required=form.querySelector('[required]:not([type=hidden])');if(kind==='edit'||required){form.scrollIntoView({block:'nearest'});(required||form.querySelector('input:not([type=hidden]),textarea'))?.focus();}else form.querySelector('button[type=submit]')?.click();});popover.append(button);
  }
 }
 const campaignEdit=scope.querySelector('a.jcd-admin-link');
 const pageMenu=scope.querySelector('.comic-share-menu .jc-popover');
 if(campaignEdit&&pageMenu&&!campaignEdit.dataset.menuConnected){campaignEdit.dataset.menuConnected='true';campaignEdit.innerHTML=actionIcon('edit')+'수정';pageMenu.append(campaignEdit);}
 for(const form of scope.querySelectorAll('form[data-participation-edit]')){
  if(form.dataset.menuConnected)continue;form.dataset.menuConnected='true';
  const editor=form.closest('details');if(!editor)continue;
  const holder=document.createElement('div');holder.innerHTML=renderShareMenu(location.pathname+location.search);const menu=holder.firstElementChild;if(!menu)continue;
  menu.classList.remove('comic-share-menu');menu.classList.add('content-action-menu');editor.before(menu);
  const summary=editor.querySelector('summary');if(summary)summary.hidden=true;
  const popover=menu.querySelector('.jc-popover');
  for(const kind of ['edit','delete']){const original=form.querySelector('[name="operation"][value="'+kind+'"]');if(!original)continue;const button=document.createElement('button');button.type='button';button.innerHTML=actionIcon(kind)+(kind==='edit'?'수정':'삭제');if(kind==='delete')button.className='jc-danger';button.addEventListener('click',()=>{menu.open=false;editor.open=true;if(kind==='edit'){form.querySelector('input:not([type=hidden]),textarea')?.focus();}else original.click();});popover.append(button);}
 }
}
