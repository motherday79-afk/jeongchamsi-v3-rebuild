import { HOME_FIXTURE } from './fixtures/home.js';
import { siteHeader, drawer, footer } from './layout/site-shell.js';
import { renderHomeLayout } from './layout/home-layout.js?v=0.0.10';
import { setupLayoutInteractions } from './ui/interactions.js';
import { createAuthService } from './core/auth.js';
import { createContentService } from './core/content.js';
import { createPoliticianService } from './core/politicians.js';
import * as views from './views/stage1.js';
import { renderPoliticianDirectory, renderPoliticianDetail } from './views/politicians.js?v=0.0.10';

const app=document.getElementById('app');
const auth=createAuthService();
const content=createContentService();
const politicians=createPoliticianService();

const route=()=>decodeURIComponent((location.hash||'#/').replace(/^#/,'')||'/');
const parts=r=>r.split('?')[0].split('/').filter(Boolean);
const unstable=new Set(['compare','search','keywords','trending','president','news']);

async function shell(body,session){
  const memberCount=await auth.memberCount().catch(()=>0);
  app.innerHTML=`<div class="site-shell">${siteHeader(memberCount,session)}<div class="page-wrap">${body}</div>${footer()}${drawer(session)}</div>`;
  setupLayoutInteractions(document);
}

async function render(){
  const r=route(),p=parts(r),session=await auth.session();
  let body='';
  if(!p.length){
    const [memberCount,columns,community,itsmePosts,polls,generation,nationalEvaluation,academy,rankResult]=await Promise.all([
      auth.memberCount().catch(()=>0),
      content.list('columns').catch(()=>[]),
      content.list('community').catch(()=>[]),
      content.list('itsme').catch(()=>[]),
      content.readDomain('polls').catch(()=>({items:[]})),
      content.readDomain('generation').catch(()=>({})),
      content.readDomain('nationalEvaluation').catch(()=>({})),
      content.readDomain('academy').catch(()=>({items:[],slots:[]})),
      politicians.list('assembly',0,30).catch(()=>({ok:false,items:[]}))
    ]);
    const rank=rankResult?.ok?(Array.isArray(rankResult.items)?rankResult.items:[]).slice(0,30).map((item,index)=>({...item,rank:index+1,rankMode:'temporary-assembly-pilot'})):[];
    const home={...HOME_FIXTURE,memberCount,columns,community,itsmePosts,polls,generation,nationalEvaluation,academy,rank,session};
    body=`<div class="product-home-wrap">${renderHomeLayout(home)}</div>`;
  } else if(p[0]==='about') body=views.renderAbout();
  else if(p[0]==='support') body=views.renderSupport();
  else if(['guide','privacy','policy'].includes(p[0])) body=views.renderLegal(p[0]);
  else if(p[0]==='column') body=p[1]==='write'?views.renderBoardWrite('columns'):p[1]?await views.renderBoardDetail('columns',p[1],content,session):await views.renderBoard('columns',content,session);
  else if(p[0]==='community') body=p[1]==='write'?views.renderBoardWrite('community'):p[1]?await views.renderBoardDetail('community',p[1],content,session):await views.renderBoard('community',content,session);
  else if(p[0]==='itsme') body=p[1]==='write'?views.renderItsmeWrite():p[1]?await views.renderItsmeDetail(p[1],content,session):await views.renderItsme(content,r);
  else if(p[0]==='poll') body=await views.renderPoll(content,session);
  else if(p[0]==='generation-president') body=await views.renderGeneration(content,session);
  else if(p[0]==='national-evaluation') body=await views.renderNationalEvaluation(content,session);
  else if(p[0]==='academy') body=await views.renderAcademy(content,session);
  else if(p[0]==='now') body=await renderPoliticianDirectory(politicians,r);
  else if(p[0]==='person') body=await renderPoliticianDetail(p[1]||'',politicians,session);
  else if(p[0]==='request-politician') body=views.renderPoliticianRequest();
  else if(p[0]==='partners') body=views.renderPartners();
  else if(p[0]==='login') body=views.renderLogin();
  else if(p[0]==='join') body=views.renderJoin();
  else if(p[0]==='mypage') body=views.renderMyPage(session);
  else if(p[0]==='admin') body=await views.renderAdminStable(session,auth);
  else if(p[0]==='migration') body=views.renderMigration();
  else if(unstable.has(p[0])) body=`<section class="module"><span class="eyebrow">NEXT PHASE</span><h2>${p[0]}</h2><p class="module-desc">이 영역은 이번 버전에서 제외했습니다. NOW·정치인 데이터·분석 엔진은 연결하지 않습니다.</p></section>`;
  else body=`<section class="module"><h2>페이지를 찾을 수 없습니다</h2></section>`;
  await shell(body,session);
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
  if(type==='board'){const item=await content.create(form.dataset.domain,data);result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/${form.dataset.domain==='columns'?'column':'community'}/${item.id}`};}
  if(type==='itsme'){const item=await content.create('itsme',data);result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/itsme/${item.id}`};}
  if(type==='comment'){result=await content.comment(form.dataset.domain,form.dataset.postId,data.text);if(result.ok)await render();}
  if(type==='politician-request'){result={ok:false,error:'다음 단계에서 운영 데이터 저장소에 연결합니다.'};}
  if(type==='partner'){result={ok:false,error:'다음 단계에서 운영 데이터 저장소에 연결합니다.'};}
  if(type==='migration'){result=await auth.migrationRun(String(data.secret||''));}
  if(type==='politician-migration'){result=await auth.politicianMigrationRun(String(data.secret||''));}
  const state=form.querySelector('[data-form-state]'); if(state)state.textContent=result?.ok?(result.message||'처리되었습니다.'):(result?.error||'처리하지 못했습니다.');
  if(result?.status===401&&type!=='migration'){location.hash='#/login';return;}
  if(result?.ok&&['login','join'].includes(type)){location.hash='#/mypage';return;}
  if(result?.route){location.hash='#'+result.route;return;}
  if(result?.ok&&['migration','politician-migration'].includes(type)){await render();return;}
  if(result?.ok&&type!=='comment')form.reset();
});

document.addEventListener('click',async event=>{
  const vote=event.target.closest('[data-stage-vote]');
  if(vote){event.preventDefault();const result=await content.vote(vote.dataset.stageVote,vote.dataset.option);if(result?.status===401){location.hash='#/login';return;}if(!result?.ok){alert(result?.error||'투표하지 못했습니다.');return;}await render();return;}
  const like=event.target.closest('[data-post-like]');
  if(like){event.preventDefault();const result=await content.like(like.dataset.domain,like.dataset.postId);if(result?.status===401){location.hash='#/login';return;}if(!result?.ok){alert(result?.error||'처리하지 못했습니다.');return;}await render();return;}
  const action=event.target.closest('[data-stage-action]')?.dataset.stageAction;
  if(action==='logout'){await auth.logout();location.hash='#/';return;}
  if(action==='academy-apply'){const result=await content.academyApply(event.target.closest('[data-slot-id]')?.dataset.slotId||'');if(result?.status===401){location.hash='#/login';return;}alert(result?.ok?'수강 신청을 접수했습니다.':(result?.error||'신청하지 못했습니다.'));}
});

await render();
