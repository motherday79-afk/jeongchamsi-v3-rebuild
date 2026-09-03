import { HOME_FIXTURE } from './fixtures/home.js';
import { siteHeader, drawer, footer, renderInitialLoading } from './layout/site-shell.js';
import { renderHomeLayout, renderBadgeShowcase } from './layout/home-layout.js?v=0.0.30.2';
import { setupLayoutInteractions } from './ui/interactions.js';
import { createAuthService } from './core/auth.js';
import { createContentService } from './core/content.js';
import { createPoliticianService } from './core/politicians.js';
import { createNavigation } from './core/navigation.js?v=0.0.30.2';
import { createIntelligenceAutoResumeGuard, runIntelligenceAction } from './core/intelligence-runner.js';
import { buildRoleNarratives } from './ui/intelligence-narratives.js?v=0.0.30.2';
import * as views from './views/stage1.js';
import { renderPoliticianDirectory, renderPoliticianDetail } from './views/politicians.js?v=0.0.30.2';
import { renderPoliticianCompare } from './views/politician-compare.js?v=0.0.30.2';
import { renderPollBoard, renderGenerationPresident, renderNationalEvaluationPage } from './views/participation-pages.js?v=0.0.30.2';
import { renderPresidentPage } from './views/president.js?v=0.0.30.2';
import { renderSearchPage } from './views/search-page.js?v=0.0.30.2';
import { loadRecentPoliticians, recordRecentPolitician } from './ui/recent-politicians.js?v=0.0.30.2';

const app=document.getElementById('app');
renderInitialLoading(app);
const auth=createAuthService();
const content=createContentService();
const politicians=createPoliticianService();
let intelligenceRunnerActive=false;
let renderSequence=0;
const intelligenceAutoResumeGuard=createIntelligenceAutoResumeGuard();

let navigation=null;
const route=()=>navigation?.route()||String(location.hash||'#/').replace(/^#/,'')||'/';
const parts=r=>r.split('?')[0].split('/').filter(Boolean);
const unstable=new Set(['keywords','trending','news']);

function tunePoliticianNarratives(){
  const cover=document.querySelector('.person-intelligence-cover');if(!cover)return;
  const signalLabel=cover.querySelector('.person-intelligence-cover-copy h2')?.textContent||'';
  const audienceLabel=document.querySelector('.person-audience-spectrum-v3 strong')?.textContent||'';
  const core=[...document.querySelectorAll('.person-core-bullet-ledger article')].map(row=>({label:row.querySelector('b')?.textContent||'',score:Number(row.querySelector('strong')?.textContent||0)})).filter(row=>row.label);
  const ordered=[...core].sort((a,b)=>b.score-a.score),transitionLabel=document.querySelector('.person-attention-funnel article:nth-child(3) b')?.textContent||'전환력';
  const rank=Number((cover.querySelector('.person-intelligence-cover-index span')?.textContent||'').match(/\d+/)?.[0]);
  const copy=buildRoleNarratives({signalLabel,audienceLabel,strongestLabel:ordered[0]?.label,weakestLabel:ordered.at(-1)?.label,transitionLabel,rank});
  const publicCopy=cover.querySelector('.person-intelligence-cover-copy p');if(publicCopy)publicCopy.textContent=copy.publicSignal;
  const diagnosis=document.querySelector('.person-analysis-diagnosis:not(.is-pending) p');if(diagnosis)diagnosis.textContent=copy.memberDiagnosis;
  const executive=document.querySelector('.admin-pi-executive-ribbon');
  if(executive){const title=executive.querySelector('h2'),body=executive.querySelector('p');if(title)title.textContent='운영 구조 및 전환 과제';if(body)body.textContent=copy.adminDecision;}
}

async function shell(body,session,renderId){
  const memberCount=await auth.memberCount().catch(()=>0);
  if(renderId!==renderSequence)return false;
  app.innerHTML=`<div class="site-shell">${siteHeader(memberCount,session)}<div class="page-wrap">${body}</div>${footer()}${drawer(session)}</div>`;
  setupLayoutInteractions(document,{politicianSearch:(query,limit)=>politicians.search(query,limit)});
  return true;
}

function updateIntelligenceProgress(kind,job,message=''){
  const card=document.querySelector(`[data-intelligence-job="${kind}"]`);if(!card||!job)return;
  const completed=Number(job.completed||0),total=Number(job.total||542),percent=total?Math.min(100,Math.round(completed/total*100)):0;
  card.dataset.jobStatus=job.status||'RUNNING';const bar=card.querySelector('.admin-job-progress i');if(bar)bar.style.width=`${percent}%`;
  const progress=card.querySelector('[data-job-progress-text]');if(progress)progress.textContent=`${completed.toLocaleString('ko-KR')} / ${total.toLocaleString('ko-KR')}`;
  const state=card.querySelector('[data-job-message]');if(state)state.textContent=message||`${percent}% 처리 · 성공 ${Number(job.succeeded||0).toLocaleString('ko-KR')} · 오류 ${Number(job.failed||0).toLocaleString('ko-KR')}`;
}

async function runAdminIntelligence(kind,resume=false){
  if(intelligenceRunnerActive)return;intelligenceRunnerActive=true;intelligenceAutoResumeGuard.mark(kind);
  const button=document.querySelector(`[data-intelligence-action="${kind}"]`);if(button)button.disabled=true;
  try{
    const job=await runIntelligenceAction(auth,kind,{resume,onProgress:value=>updateIntelligenceProgress(kind,value)});
    updateIntelligenceProgress(kind,job,job.status==='COMPLETED'?'모든 분할 작업이 완료되었습니다.':`완료 상태: ${job.status}`);
  }catch(error){const card=document.querySelector(`[data-intelligence-job="${kind}"]`),state=card?.querySelector('[data-job-message]');if(state)state.textContent=`처리 중단 · ${error.message} · 다시 누르면 저장된 위치부터 재개됩니다.`;}
  finally{intelligenceRunnerActive=false;await render();}
}

function resumeAdminIntelligence(){
  const running=document.querySelector('[data-intelligence-job][data-job-status="RUNNING"]:not([data-job-blocked="true"])');
  if(running&&intelligenceAutoResumeGuard.claim(running.dataset.intelligenceJob))void runAdminIntelligence(running.dataset.intelligenceJob,true);
}

function setupMemberBadgeManagers(){
  for(const row of document.querySelectorAll('[data-member-badge-row]'))row.addEventListener('toggle',()=>{if(!row.open)return;const mount=row.querySelector('[data-member-badge-mount]');if(!mount||mount.dataset.loaded)return;try{mount.innerHTML=views.renderMemberBadgeManager(JSON.parse(row.dataset.memberBadgePayload||'{}'));mount.dataset.loaded='true';}catch{mount.innerHTML='<p class="module-desc">배지 목록을 불러오지 못했습니다.</p>';}});
}

async function render({preserveScroll=false}={}){
  const renderId=++renderSequence,r=route(),p=parts(r),session=await auth.session();
  const badgeStatusPromise=session.authenticated
    ? auth.recordBadgeVisit().then(result=>result?.status||auth.badgeStatus()).catch(()=>null)
    : Promise.resolve(null);
  const badgeStatus=p[0]==='mypage'?await badgeStatusPromise:null;
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
      politicians.rankings().catch(()=>({ok:false,items:[]}))
    ]);
    const rank=rankResult?.ok?(Array.isArray(rankResult.items)?rankResult.items:[]).slice(0,30):[];
    const generationIds=(Array.isArray(generation?.candidates)?generation.candidates:[]).slice(0,15),evaluationIds=Object.values(nationalEvaluation?.slots||{}).map(slot=>slot?.subjectId).filter(Boolean),resolvedPeople=await Promise.all([...new Set([...generationIds,...evaluationIds])].map(id=>politicians.get(id).catch(()=>({ok:false}))));
    const peopleById=Object.fromEntries(resolvedPeople.filter(result=>result?.ok&&result.item).map(result=>[result.item.id,result.item])),generationView={...generation,candidateLabels:Object.fromEntries(generationIds.map(id=>[id,peopleById[id]?.name||id]))},nationalEvaluationView={...nationalEvaluation,slots:Object.fromEntries(Object.entries(nationalEvaluation?.slots||{}).map(([key,slot])=>[key,{...slot,subjectName:peopleById[slot?.subjectId]?.name||slot?.subjectName,party:peopleById[slot?.subjectId]?.party||slot?.party,jurisdiction:peopleById[slot?.subjectId]?.jurisdiction||slot?.jurisdiction,photo:peopleById[slot?.subjectId]?.photo||slot?.photo}]))};
    const home={...HOME_FIXTURE,memberCount,columns,community,itsmePosts,polls,generation:generationView,nationalEvaluation:nationalEvaluationView,academy,rank,recentPoliticians:loadRecentPoliticians(),session,badgeStatus};
    body=`<div class="product-home-wrap">${renderHomeLayout(home)}</div>`;
  } else if(p[0]==='about') body=views.renderAbout();
  else if(p[0]==='support') body=views.renderSupport();
  else if(['guide','privacy','policy'].includes(p[0])) body=views.renderLegal(p[0]);
  else if(p[0]==='column') body=p[1]==='write'?views.renderBoardWrite('columns'):p[1]?await views.renderBoardDetail('columns',p[1],content,session):await views.renderBoard('columns',content,session);
  else if(p[0]==='community') body=p[1]==='write'?views.renderBoardWrite('community'):p[1]?await views.renderBoardDetail('community',p[1],content,session):await views.renderBoard('community',content,session);
  else if(p[0]==='itsme') body=p[1]==='write'?views.renderItsmeWrite():p[1]?await views.renderItsmeDetail(p[1],content,session):await views.renderItsme(content,r);
  else if(p[0]==='poll') body=await renderPollBoard({content,session,route:r});
  else if(p[0]==='generation-president') body=await renderGenerationPresident({content,politicians,session,route:r});
  else if(p[0]==='national-evaluation') body=await renderNationalEvaluationPage({content,politicians,session,route:r});
  else if(p[0]==='president') body=renderPresidentPage();
  else if(p[0]==='search') body=await renderSearchPage({query:new URLSearchParams(r.split('?')[1]||'').get('q')||'',politicians,content});
  else if(p[0]==='academy') body=await views.renderAcademy(content,session);
  else if(p[0]==='now') body=await renderPoliticianDirectory(politicians,r);
  else if(p[0]==='person') body=await renderPoliticianDetail(p[1]||'',politicians,session);
  else if(p[0]==='compare') body=await renderPoliticianCompare(politicians,r,session);
  else if(p[0]==='request-politician') body=views.renderPoliticianRequest();
  else if(p[0]==='partners') body=views.renderPartners();
  else if(p[0]==='login') body=views.renderLogin();
  else if(p[0]==='join') body=views.renderJoin();
  else if(p[0]==='mypage'&&p[1]==='activity') body=views.renderMyActivity(session,badgeStatus||{},r.includes('?')?`?${r.split('?')[1]}`:'');
  else if(p[0]==='mypage') body=views.renderMyPage(session,badgeStatus||{});
  else if(p[0]==='admin') body=await views.renderAdminStable(session,auth);
  else if(p[0]==='migration') body=views.renderMigration();
  else if(unstable.has(p[0])) body=`<section class="module"><span class="eyebrow">NEXT PHASE</span><h2>${p[0]}</h2><p class="module-desc">이 영역은 이번 버전에서 제외했습니다. NOW·정치인 데이터·분석 엔진은 연결하지 않습니다.</p></section>`;
  else body=`<section class="module"><h2>페이지를 찾을 수 없습니다</h2></section>`;
  if(renderId!==renderSequence)return;
  if(!await shell(body,session,renderId))return;
  if(!p.length&&session.authenticated)void badgeStatusPromise.then(status=>{
    if(renderId!==renderSequence||route()!==r||!status)return;
    for(const mount of document.querySelectorAll('[data-badge-showcase-mount]'))mount.innerHTML=renderBadgeShowcase(status);
  });
  setupMemberBadgeManagers();
  if(p[0]==='person'){recordRecentPolitician(document);tunePoliticianNarratives();}
  if(!preserveScroll)window.scrollTo(0,0);
  navigation?.cacheCurrent();
  if(p[0]==='admin')queueMicrotask(resumeAdminIntelligence);
}

navigation=createNavigation({window,readSnapshot:()=>app.innerHTML,restoreSnapshot:markup=>{app.innerHTML=markup;},rebind:()=>{setupLayoutInteractions(document,{politicianSearch:(query,limit)=>politicians.search(query,limit)});setupMemberBadgeManagers();},onRoute:(_route,options)=>void render(options)});
navigation.start();
window.addEventListener('jcs:layout-route',event=>navigation.navigate(event.detail?.route||'/'));
window.addEventListener('jcs:layout-search',event=>navigation.navigate(`/search?q=${encodeURIComponent(String(event.detail?.query||'').trim())}`));

document.addEventListener('submit',async event=>{
  const participationAdmin=event.target.closest('[data-participation-admin-form]');
  if(participationAdmin){event.preventDefault();const data=Object.fromEntries(new FormData(participationAdmin));data.applyToMain=data.applyToMain==='true';const result=await content.createParticipation(participationAdmin.dataset.participationAdminForm,data),state=participationAdmin.querySelector('[data-form-state]');if(state)state.textContent=result?.ok?'저장하고 적용했습니다.':(result?.error||'저장하지 못했습니다.');if(result?.ok)await render();return;}
  const generationSearch=event.target.closest('[data-generation-search]');
  if(generationSearch){event.preventDefault();const data=new FormData(generationSearch),age=String(data.get('age')||'20대'),query=String(data.get('q')||'').trim();navigation.navigate(`/generation-president?age=${encodeURIComponent(age)}${query?`&q=${encodeURIComponent(query)}`:''}`);return;}
  const form=event.target.closest('[data-stage-form]'); if(!form)return;
  event.preventDefault(); const data=Object.fromEntries(new FormData(form)); const type=form.dataset.stageForm; let result=null;
  if(type==='login') result=await auth.login(data);
  if(type==='join') result=await auth.register(data);
  if(type==='board'){const item=await content.create(form.dataset.domain,data);result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/${form.dataset.domain==='columns'?'column':'community'}/${item.id}`};}
  if(type==='itsme'){const item=await content.create('itsme',data);result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/itsme/${item.id}`};}
  if(type==='comment'){result=await content.comment(form.dataset.domain,form.dataset.postId,data.text);if(result.ok)await render();}
  if(type==='poll-vote'){result=await content.vote(form.dataset.voteScope,String(data.option||''));}
  if(type==='politician-request'){result={ok:false,error:'다음 단계에서 운영 데이터 저장소에 연결합니다.'};}
  if(type==='partner'){result={ok:false,error:'다음 단계에서 운영 데이터 저장소에 연결합니다.'};}
  if(type==='migration'){result=await auth.migrationRun(String(data.secret||''));}
  if(type==='politician-migration'){result=await auth.politicianMigrationRun(String(data.secret||''));}
  const state=form.querySelector('[data-form-state]'); if(state)state.textContent=result?.ok?(result.message||'처리되었습니다.'):(result?.error||'처리하지 못했습니다.');
  if(result?.status===401&&type!=='migration'){navigation.navigate('/login');return;}
  if(result?.ok&&['login','join'].includes(type)){navigation.navigate('/mypage');return;}
  if(result?.route){navigation.navigate(result.route);return;}
  if(result?.ok&&['migration','politician-migration'].includes(type)){await render();return;}
  if(result?.ok&&type==='poll-vote'){await render({preserveScroll:true});return;}
  if(result?.ok&&type!=='comment')form.reset();
});

document.addEventListener('click',async event=>{
  const participationFeature=event.target.closest('[data-participation-feature]');
  if(participationFeature){event.preventDefault();const [domain,itemId]=String(participationFeature.dataset.participationFeature||'').split(':');const result=await content.featureParticipation(domain,itemId);if(!result?.ok)alert(result?.error||'메인에 적용하지 못했습니다.');else await render({preserveScroll:true});return;}
  const representative=event.target.closest('[data-badge-representative]');
  if(representative){event.preventDefault();const result=await auth.setRepresentativeBadge(representative.dataset.badgeRepresentative);if(!result?.ok)alert(result?.error||'대표 배지를 설정하지 못했습니다.');await render();return;}
  const showcase=event.target.closest('[data-badge-showcase]');
  if(showcase){event.preventDefault();const result=await auth.toggleShowcaseBadge(showcase.dataset.badgeShowcase);if(!result?.ok)alert(result?.error==='BADGE_SHOWCASE_FULL'?'전시 배지는 최대 3개까지 선택할 수 있습니다.':(result?.error||'전시 배지를 설정하지 못했습니다.'));await render();return;}
  const memberBadgeSave=event.target.closest('[data-member-badge-save]');
  if(memberBadgeSave){event.preventDefault();const id=memberBadgeSave.dataset.memberBadgeSave,manager=document.querySelector(`[data-member-badge-manager="${CSS.escape(id)}"]`),grantedBadges=[...(manager?.querySelectorAll('[data-member-badge]:checked')||[])].map(input=>input.value),state=manager?.querySelector('[data-member-badge-state]');memberBadgeSave.disabled=true;const result=await auth.updateMemberBadges(id,grantedBadges);if(state)state.textContent=result?.ok?'배지 해금 내역을 저장했습니다.':(result?.error||'저장하지 못했습니다.');memberBadgeSave.disabled=false;if(result?.ok)await render();return;}
  const intelligence=event.target.closest('[data-intelligence-action]');
  if(intelligence){event.preventDefault();void runAdminIntelligence(intelligence.dataset.intelligenceAction,false);return;}
  const vote=event.target.closest('[data-stage-vote]');
  if(vote){event.preventDefault();const result=await content.vote(vote.dataset.stageVote,vote.dataset.option);if(result?.status===401){navigation.navigate('/login');return;}if(!result?.ok){alert(result?.error||'투표하지 못했습니다.');return;}await render({preserveScroll:true});return;}
  const like=event.target.closest('[data-post-like]');
  if(like){event.preventDefault();const result=await content.like(like.dataset.domain,like.dataset.postId);if(result?.status===401){navigation.navigate('/login');return;}if(!result?.ok){alert(result?.error||'처리하지 못했습니다.');return;}await render({preserveScroll:true});return;}
  const action=event.target.closest('[data-stage-action]')?.dataset.stageAction;
  if(action==='logout'){await auth.logout();navigation.navigate('/');return;}
  if(action==='academy-apply'){const result=await content.academyApply(event.target.closest('[data-slot-id]')?.dataset.slotId||'');if(result?.status===401){navigation.navigate('/login');return;}alert(result?.ok?'수강 신청을 접수했습니다.':(result?.error||'신청하지 못했습니다.'));}
});

await render();
