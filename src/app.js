import { HOME_FIXTURE } from './fixtures/home.js';
import { siteHeader, drawer, footer } from './layout/site-shell.js';
import { renderHomeLayout } from './layout/home-layout.js';
import { setupLayoutInteractions } from './ui/interactions.js';
import { createBrowserStore } from './core/store.js';
import { createAuthService } from './core/auth.js';
import { createContentService } from './core/content.js';
import { seedStableDomains } from './core/seed.js';
import * as views from './views/stage1.js';

const app=document.getElementById('app');
const store=createBrowserStore();
const auth=createAuthService(store);
const content=createContentService(store);
let guestKey=localStorage.getItem('jcs:v3:guest-key');
if(!guestKey){guestKey=`guest-${Math.random().toString(36).slice(2,12)}`;localStorage.setItem('jcs:v3:guest-key',guestKey);}
await seedStableDomains(content);

const route=()=>decodeURIComponent((location.hash||'#/').replace(/^#/,'')||'/');
const parts=r=>r.split('?')[0].split('/').filter(Boolean);
const unstable=new Set(['now','compare','person','search','keywords','trending','president','news','admin']);

async function shell(body){
  const session=await auth.session();
  const members=await auth.exportMembers();
  app.innerHTML=`<div class="site-shell">${siteHeader(members.length)}<div class="page-wrap">${body}</div>${footer()}${drawer(session)}</div>`;
  setupLayoutInteractions(document);
}

async function render(){
  const r=route(),p=parts(r),session=await auth.session(),voter=session.authenticated?session.user.id:guestKey;
  let body='';
  if(!p.length){
    const home={...HOME_FIXTURE,memberCount:(await auth.exportMembers()).length};
    body=`<div class="product-home-wrap">${renderHomeLayout(home)}</div>`;
  } else if(p[0]==='about') body=views.renderAbout();
  else if(p[0]==='support') body=views.renderSupport();
  else if(['guide','privacy','policy'].includes(p[0])) body=views.renderLegal(p[0]);
  else if(p[0]==='column') body=p[1]==='write'?views.renderBoardWrite('columns'):p[1]?await views.renderBoardDetail('columns',p[1],content):await views.renderBoard('columns',content);
  else if(p[0]==='community') body=p[1]==='write'?views.renderBoardWrite('community'):p[1]?await views.renderBoardDetail('community',p[1],content):await views.renderBoard('community',content);
  else if(p[0]==='itsme') body=p[1]==='write'?views.renderItsmeWrite():p[1]?await views.renderItsmeDetail(p[1],content):await views.renderItsme(content);
  else if(p[0]==='poll') body=await views.renderPoll(content,voter);
  else if(p[0]==='generation-president') body=await views.renderGeneration(content,voter);
  else if(p[0]==='national-evaluation') body=await views.renderNationalEvaluation(content,voter);
  else if(p[0]==='academy') body=await views.renderAcademy(content);
  else if(p[0]==='request-politician') body=views.renderPoliticianRequest();
  else if(p[0]==='partners') body=views.renderPartners();
  else if(p[0]==='login') body=views.renderLogin();
  else if(p[0]==='join') body=views.renderJoin();
  else if(p[0]==='mypage') body=views.renderMyPage(session);
  else if(unstable.has(p[0])) body=`<section class="module"><span class="eyebrow">NEXT PHASE</span><h2>${p[0]}</h2><p class="module-desc">이 영역은 이번 1차 이식 대상에서 제외했습니다. 기존 NOW·정치인 데이터·분석 엔진은 연결하지 않습니다.</p></section>`;
  else body=`<section class="module"><h2>페이지를 찾을 수 없습니다</h2></section>`;
  await shell(body);
  window.scrollTo(0,0);
}

window.addEventListener('hashchange',render);
window.addEventListener('jcs:layout-route',event=>{location.hash='#'+(event.detail?.route||'/');});
window.addEventListener('jcs:layout-search',()=>{location.hash='#/search';});

document.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-stage-form]'); if(!form)return;
  event.preventDefault(); const data=Object.fromEntries(new FormData(form)); const type=form.dataset.stageForm; let result=null;
  if(type==='login') result=await auth.login(data);
  if(type==='join') result=await auth.register(data);
  if(type==='board'){const item=await content.create(form.dataset.domain,data);result={ok:true,route:`/${form.dataset.domain==='columns'?'column':'community'}/${item.id}`};}
  if(type==='itsme'){const item=await content.create('itsme',data);result={ok:true,route:`/itsme/${item.id}`};}
  if(type==='politician-request'){await content.create('politicianRequests',data);result={ok:true,message:'등록 요청을 접수했습니다.'};}
  if(type==='partner'){await content.create('partnerApplications',data);result={ok:true,message:'파트너스 신청을 접수했습니다.'};}
  const state=form.querySelector('[data-form-state]'); if(state)state.textContent=result?.ok?(result.message||'저장되었습니다.'):(result?.error||'처리하지 못했습니다.');
  if(result?.ok&&['login','join'].includes(type)){location.hash='#/mypage';return;}
  if(result?.route){location.hash='#'+result.route;return;}
  if(result?.ok)form.reset();
});

document.addEventListener('click',async event=>{
  const vote=event.target.closest('[data-stage-vote]');
  if(vote){event.preventDefault();await content.vote(vote.dataset.stageVote,vote.dataset.option,vote.dataset.voter||guestKey);await render();return;}
  const action=event.target.closest('[data-stage-action]')?.dataset.stageAction;
  if(action==='logout'){await auth.logout();location.hash='#/';return;}
  if(action==='academy-apply'){
    const session=await auth.session();
    if(!session.authenticated){location.hash='#/login';return;}
    await content.create('academyApplications',{userId:session.user.id,status:'received'});alert('수강 신청을 접수했습니다.');
  }
});

await render();
