import { refreshFontScale } from './ui/font-scale.js?v=0.0.31.56';
import { renderCagePosts, renderCageArena, renderCageHits, cagePageData } from './views/community-ui.js?v=0.0.31.145';
import { HOME_FIXTURE } from './fixtures/home.js?v=0.0.31.56';
import { siteHeader, drawer, footer, renderInitialLoading } from './layout/site-shell.js?v=0.0.31.144';
import { renderCheerCatalog, renderGoodsRequest, renderCheerShop, renderCheerProduct, renderTrendingPage, renderKeywordsPage, renderNowRankCard, renderHomeLayout, renderBadgeShowcase, renderMemberSummary } from './layout/home-layout.js?v=0.0.31.145';
import { setupLayoutInteractions, setupPoliticianPhotoFallback, setupNowCarousel, setupCageCountdown, setupDesktopHomeViewport } from './ui/interactions.js?v=0.0.31.134';
import { createAuthService, photoUploadMessage } from './core/auth.js?v=0.0.31.106';
import { createContentService, loadNavigationDashboard } from './core/content.js?v=0.0.31.127';
import { createPoliticianService } from './core/politicians.js?v=0.0.31.106';
import { sharePost, createNavigation, adminRouteState, adminRouteWith } from './core/navigation.js?v=0.0.31.126';
import { createIntelligenceAutoResumeGuard, runIntelligenceAction } from './core/intelligence-runner.js?v=0.0.31.56';
import { buildRoleNarratives } from './ui/intelligence-narratives.js?v=0.0.31.56';
import * as views from './views/stage1.js?v=0.0.31.145';
import { renderPoliticianDirectory, renderPoliticianDetail } from './views/politicians.js?v=0.0.31.56';
import { renderPoliticianCompare } from './views/politician-compare.js?v=0.0.31.56';
import { renderPointShop, renderParticipationAdminSettings, generationVoteConfirmation, renderPollBoard, renderGenerationPresident, renderNationalEvaluationPage } from './views/participation-pages.js?v=0.0.31.131';
import { renderPresidentPage } from './views/president.js?v=0.0.31.107';
import { renderSearchPage, hasSearchSnapshot } from './views/search-page.js?v=0.0.31.99';
import { loadRecentPoliticians, recordRecentPolitician } from './ui/recent-politicians.js?v=0.0.31.56';
import { regionDistrictOptions, regionSubdistrictOptions } from './data/korean-regions.js?v=0.0.31.56';

const formErrors={GOODS_REQUEST_REQUIRED:'상품 종류, 희망 수량, 연락처와 제작 요청을 확인해 주세요.',ALREADY_VOTED:'이번 회차 투표를 이미 완료했습니다.',AGE_GROUP_MISMATCH:'20대 이상 회원은 본인 세대에서만 투표할 수 있습니다.',GENERATION_VOTE_CLOSED:'현재 진행 중인 모의투표가 아닙니다.',CANDIDATE_NOT_ALLOWED:'이번 회차에 등록된 후보를 선택해 주세요.',ADMIN_VOTE_DISABLED:'관리자는 데모 설정으로 현황을 관리해 주세요.',CAMP_REQUIRED:'진보진영 또는 보수진영을 선택해 주세요.',PIN_FORBIDDEN:'공지·케이지 고정은 관리자만 할 수 있습니다.',PIN_INVALID:'공지 또는 케이지 중 하나를 선택해 주세요.',POST_EDIT_FORBIDDEN:'본인이 작성한 게시글만 수정·삭제할 수 있습니다.',COMMENT_EDIT_FORBIDDEN:'본인이 작성한 댓글만 수정·삭제할 수 있습니다.',CONTENT_CHANGED_RETRY:'다른 참여 내용이 갱신됐습니다. 입력 내용은 유지되니 다시 저장해 주세요.',CONTENT_STORAGE_INVALID:'저장된 게시판 데이터를 읽지 못했습니다. 다시 시도해 주세요.',TITLE_REQUIRED:'제목을 입력해 주세요.',INVALID_COMMENT:'댓글 내용을 입력해 주세요.',COMMENT_PARENT_INVALID:'답글을 달 댓글이 변경되었거나 삭제되었습니다.',CAGE_NOT_FOUND:'케이지를 찾을 수 없습니다.',POST_NOT_FOUND:'게시글이 삭제되었거나 존재하지 않습니다.',COMMENT_NOT_FOUND:'댓글이 삭제되었거나 존재하지 않습니다.',CAMP_IMMUTABLE:'작성한 글의 진영은 변경할 수 없습니다.',INVALID_REFERRER:'추천인코드를 확인해 주세요. 사용 가능한 회원의 코드를 입력해야 합니다.',INVALID_REFERRER_CODE:'추천인코드는 숫자로 입력해 주세요.',INVALID_REGION:'시·군·구와 해당 구를 올바르게 선택해 주세요.',REGISTRATION_BUSY:'가입 요청이 많습니다. 잠시 후 다시 시도해 주세요.',MEMBERS_CHANGED_RETRY:'회원 정보가 갱신됐습니다. 새로고침 후 다시 저장해 주세요.'};
const app=document.getElementById('app');
renderInitialLoading(app);
const auth=createAuthService();
const content=createContentService();
const politicians=createPoliticianService();

async function updatePoliticianPhotoStorageStatus(){
  const status=document.querySelector('[data-photo-storage-status]');
  if(!status||typeof auth.politicianPhotoStorageStatus!=='function')return;
  const result=await auth.politicianPhotoStorageStatus().catch(()=>null);
  if(!status.isConnected)return;
  const configured=!!result?.storage?.configured;
  status.dataset.state=configured?'ready':'missing';
  status.textContent=configured?'사진 저장소 연결됨':'사진 저장소 미연결 · Vercel Blob 연결 후 재배포 필요';
}
let intelligenceRunnerActive=false;
let renderSequence=0;
let cageFeedback=null;
function cageRouteState(updates){
 // A query change must invalidate any pending snapshot revalidation.
 renderSequence++;
 const [path,query='']=route().split('?'),params=new URLSearchParams(query);
 for(const [key,value] of Object.entries(updates))params.set(key,String(value));
 const next=path+'?'+params.toString();window.history.replaceState({...window.history.state,route:next},'',next);
}
function showCageFeedback(){
 const root=document.querySelector('.jc55');if(!root||!cageFeedback||root.dataset.cageId!==String(cageFeedback.rootId))return;
 const {camp}=cageFeedback;cageFeedback=null;
 const arena=root.querySelector('[data-cage-arena]');arena?.classList.add(camp==='progressive'?'ca-hit-blue':'ca-hit-red');
 const status=root.querySelector('[data-cage-status]');if(status)status.textContent=(camp==='progressive'?'진보진영':'보수진영')+'의 참여가 반영됐습니다.';
}
const intelligenceAutoResumeGuard=createIntelligenceAutoResumeGuard();

let navigation=null;
const route=()=>navigation?.route()||String(location.hash||'#/').replace(/^#/,'')||'/';
const parts=r=>r.split('?')[0].split('/').filter(Boolean);
const unstable=new Set();

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

let homeSnapshot=null;
const sessionIdentity=session=>session?.authenticated?`${session.user?.id}:${session.user?.role}:${session.user?.sessionVersion||0}`:'guest';
const invalidateHome=()=>{if(homeSnapshot)homeSnapshot.at=0;};
window.addEventListener('jcs:data-changed',invalidateHome);
window.addEventListener('jcs:admin-changed',invalidateHome);
window.addEventListener('jcs:auth-changed',()=>{homeSnapshot=null;navigation?.clearCache();});
window.addEventListener('storage',()=>{homeSnapshot=null;navigation?.clearCache();});
function updateVisibleHome(body){
 const before=document.createElement('template'),after=document.createElement('template');before.innerHTML=homeSnapshot.body;after.innerHTML=body;
 for(const selector of ['.main-column','.side-column']){
  const oldRows=[...before.content.querySelector(selector).children],newRows=[...after.content.querySelector(selector).children],live=document.querySelector('.product-home-wrap '+selector);
  const key=node=>node.id||node.className;
  for(const row of newRows){const previous=oldRows.find(x=>key(x)===key(row));if(previous?.outerHTML===row.outerHTML)continue;
   const current=[...live.children].find(x=>key(x)===key(row));if(current)current.replaceWith(row);else {const following=newRows.slice(newRows.indexOf(row)+1).map(x=>[...live.children].find(y=>key(y)===key(x))).find(Boolean);live.insertBefore(row,following||null);}
   setupPoliticianPhotoFallback(row);setupNowCarousel(row);setupCageCountdown(row);
  }
  for(const current of [...live.children])if(!newRows.some(row=>key(row)===key(current)))current.remove();
 }
 setupDesktopHomeViewport(document);refreshFontScale(document);
 homeSnapshot.body=body;homeSnapshot.at=Date.now();
}
let shellInfoCache=null;
function loadShellInfo(){
  if(!shellInfoCache||shellInfoCache.until<Date.now())shellInfoCache={until:Date.now()+30000,promise:Promise.all([auth.memberCount().catch(()=>0),content.footerInfo().catch(()=>({}))])};
  return shellInfoCache.promise;
}
async function shell(body,session,renderId){
  const [memberCount,footerInfo]=await loadShellInfo();
  if(renderId!==renderSequence)return false;
  app.innerHTML=`<div class="site-shell">${siteHeader(memberCount,session)}<div class="page-wrap">${body}</div>${footer(footerInfo,memberCount)}${drawer(session)}</div>`;
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

const pipelineActive=()=>route().split('?')[0]==='/admin'&&adminRouteState(route()).tab==='pipeline';
async function runAdminIntelligence(kind,resume=false){
  if(intelligenceRunnerActive)return;let failureMessage='';intelligenceRunnerActive=true;intelligenceAutoResumeGuard.mark(kind);
  const button=document.querySelector(`[data-intelligence-action="${kind}"]`);if(button)button.disabled=true;
  try{
    const job=await runIntelligenceAction(auth,kind,{resume,onProgress:value=>{if(pipelineActive())updateIntelligenceProgress(kind,value);}});
    updateIntelligenceProgress(kind,job,job.status==='COMPLETED'?'모든 분할 작업이 완료되었습니다.':`완료 상태: ${job.status}`);
  }catch(error){if(error.message==='INTELLIGENCE_VIEW_PAUSED'){intelligenceAutoResumeGuard.release(kind);return;}failureMessage=error.message;const card=document.querySelector(`[data-intelligence-job="${kind}"]`),state=card?.querySelector('[data-job-message]');if(state)state.textContent=`처리 중단 · ${error.message} · 다시 누르면 저장된 위치부터 재개됩니다.`;}
  finally{intelligenceRunnerActive=false;if(pipelineActive()){await render({preserveScroll:true});if(failureMessage){const state=document.querySelector(`[data-intelligence-job="${kind}"] [data-job-message]`);if(state)state.textContent=`처리 중단 · ${failureMessage}`;}}}
}

function resumeAdminIntelligence(){
  const running=document.querySelector('[data-intelligence-job][data-job-status="RUNNING"]:not([data-job-blocked="true"])');
  if(running&&intelligenceAutoResumeGuard.claim(running.dataset.intelligenceJob))void runAdminIntelligence(running.dataset.intelligenceJob,true);
}

function setupMemberBadgeManagers(){
  for(const row of document.querySelectorAll('[data-member-badge-row]'))row.addEventListener('toggle',()=>{if(!row.open)return;const mount=row.querySelector('[data-member-badge-mount]');if(!mount||mount.dataset.loaded)return;try{mount.innerHTML=views.renderMemberBadgeManager(JSON.parse(row.dataset.memberBadgePayload||'{}'));mount.dataset.loaded='true';void loadMemberPoints(mount.querySelector('[data-member-points-panel]'));}catch{mount.innerHTML='<p class="module-desc">배지 목록을 불러오지 못했습니다.</p>';}});
}

async function render({preserveScroll=false,refreshHome=false}={}){
  const renderId=++renderSequence,r=route(),p=parts(r);
  if(!p.length&&!refreshHome&&homeSnapshot){
    app.replaceChildren(homeSnapshot.node);setupCageCountdown(document);
    if(!preserveScroll)window.scrollTo(0,0);
    const snapshot=homeSnapshot;
    void auth.session().then(session=>{
      if(renderId!==renderSequence||parts(route()).length)return;
      if(sessionIdentity(session)!==snapshot.identity){homeSnapshot=null;navigation?.clearCache();void render({refreshHome:true,preserveScroll:true});return;}
      if(Date.now()-snapshot.at>30000)void render({refreshHome:true,preserveScroll:true});
      else void refreshCachedMemberSummary();
    }).catch(()=>{});
    navigation?.cacheCurrent();return;
  }
  const searchParams=new URLSearchParams(r.split('?')[1]||''),searchTerm=(searchParams.get('q')||'').trim(),mountedSearch=document.querySelector('.search-page[data-search-query]');
  if(p[0]==='search'&&mountedSearch?.dataset.searchQuery===searchTerm&&hasSearchSnapshot(content,searchTerm)){
    const markup=await renderSearchPage({query:searchTerm,page:searchParams.get('page')||1,politicians,content});
    if(renderId!==renderSequence)return;
    const template=document.createElement('template');template.innerHTML=markup;
    const next=template.content.querySelector('.search-group'),current=mountedSearch.querySelector('.search-group');
    if(next&&current){current.replaceWith(next);setupPoliticianPhotoFallback(next);next.scrollIntoView({block:'start',behavior:'instant'});return;}
  }
  if(p[0]==='admin'){const target=document.querySelector('.page-wrap');if(target)target.innerHTML=views.renderAdminLoading(adminRouteState(r).tab);}
  void loadShellInfo();
  const session=await auth.session();
  const badgeStatusPromise=session.authenticated&&p[0]!=='admin'
    ? auth.recordBadgeVisit().then(result=>result?.status||auth.badgeStatus()).catch(()=>null)
    : Promise.resolve(null);
  const wantsWallet=session.authenticated&&(!p.length||p[0]==='mypage'&&!['activity','badges'].includes(p[1]));
  const walletPromise=wantsWallet?content.myWallet().catch(()=>({ok:false,error:'LOAD_FAILED'})):Promise.resolve(null);
  const summaryPromise=!p.length&&session.authenticated?content.memberSummary().catch(()=>({ok:false,error:'LOAD_FAILED'})):Promise.resolve(null);
  const [badgeStatus,dashboard]=await Promise.all([p[0]==='mypage'?badgeStatusPromise:Promise.resolve(null),loadNavigationDashboard(p,session,content)]);
  if(p[0]==='mypage'&&wantsWallet)dashboard.pointResult=await walletPromise;
  let body='';
  if(!p.length){
    const [memberCount,columns,community,itsmePosts,newsPosts,polls,generation,nationalEvaluation,academy,rankResult,homeBanner,trendingResult,keywordResult]=await Promise.all([
      auth.memberCount().catch(()=>0),
      content.list('columns').catch(()=>[]),
      content.list('community').catch(()=>[]),
      content.list('itsme').catch(()=>[]),
      content.list('news').catch(()=>[]),
      content.readDomain('polls').catch(()=>({items:[]})),
      content.readDomain('generation').catch(()=>({})),
      content.readDomain('nationalEvaluation').catch(()=>({})),
      content.readDomain('academy').catch(()=>({items:[],slots:[]})),
      politicians.rankings().catch(()=>({ok:false,items:[]})),
      content.homeBanner().catch(()=>null),politicians.trending().catch(()=>({items:[]})),politicians.keywords().catch(()=>({items:[]}))
    ]);
    const rank=rankResult?.ok?(Array.isArray(rankResult.items)?rankResult.items:[]).slice(0,100):[];
    const generationIds=(Array.isArray(generation?.candidates)?generation.candidates:[]).slice(0,75),evaluationIds=Object.values(nationalEvaluation?.slots||{}).map(slot=>slot?.subjectId).filter(Boolean),profileIds=[...new Set([...generationIds,...evaluationIds])],profileResult=profileIds.length?await politicians.profiles(profileIds).catch(()=>({items:[]})):{items:[]},resolvedPeople=(profileResult.items||[]).map(item=>({ok:true,item}));
    const peopleById=Object.fromEntries(resolvedPeople.filter(result=>result?.ok&&result.item).map(result=>[result.item.id,result.item])),generationView={...generation,candidatePeople:peopleById,candidateLabels:Object.fromEntries(generationIds.map(id=>[id,peopleById[id]?.name||id]))},nationalEvaluationView={...nationalEvaluation,slots:Object.fromEntries(Object.entries(nationalEvaluation?.slots||{}).map(([key,slot])=>[key,{...slot,subjectName:peopleById[slot?.subjectId]?.name||slot?.subjectName,party:peopleById[slot?.subjectId]?.party||slot?.party,jurisdiction:peopleById[slot?.subjectId]?.jurisdiction||slot?.jurisdiction,photo:peopleById[slot?.subjectId]?.photo||slot?.photo}]))};
    const home={...HOME_FIXTURE,trending:trendingResult.items||[],keywords:keywordResult.items||[],memberCount,columns,community,communityData:content.peekDomain('community')||{items:community},itsmePosts,newsPosts,polls,generation:generationView,nationalEvaluation:nationalEvaluationView,academy,rank,homeBanner,recentPoliticians:loadRecentPoliticians(),session,badgeStatus};
    body=`<div class="product-home-wrap">${renderHomeLayout(home)}</div>`;
  } else if(p[0]==='points') body=renderPointShop(await content.points(),session,new URLSearchParams(r.split('?')[1]||'').get('view')==='support'?'support':'shop');
  else if(p[0]==='shop') body=p[1]==='request'?renderGoodsRequest(session,r):p[1]?renderCheerProduct(p[1]):renderCheerCatalog();
  else if(p[0]==='about') body=views.renderAbout();
  else if(p[0]==='support') body=renderPointShop(await content.points(),session,'support');
  else if(['privacy','policy'].includes(p[0])) body=views.renderLegal(p[0]);
  else if(p[0]==='column') body=p[1]==='write'?views.renderBoardWrite('columns',session):p[1]?await views.renderBoardDetail('columns',p[1],content,session,dashboard):await views.renderBoard('columns',content,session);
  else if(p[0]==='community') body=p[1]==='write'?views.renderBoardWrite('community',session,session.authenticated?await content.myWallet().catch(()=>({ok:false})):{} ):p[1]?await views.renderBoardDetail('community',p[1],content,session,dashboard,r):await views.renderBoard('community',content,session,r);
  else if(p[0]==='news') body=p[1]==='write'?views.renderBoardWrite('news',session):p[1]?await views.renderBoardDetail('news',p[1],content,session,dashboard):await views.renderBoard('news',content,session);
  else if(p[0]==='itsme') body=p[1]==='write'?await views.renderItsmeWrite(session,content):p[1]?await views.renderItsmeDetail(p[1],content,session,dashboard):await views.renderItsme(content,r);
  else if(p[0]==='poll') body=await renderPollBoard({content,session,route:r});
  else if(p[0]==='generation-president') body=await renderGenerationPresident({content,politicians,session,route:r});
  else if(p[0]==='national-evaluation') body=await renderNationalEvaluationPage({content,politicians,session,route:r});
  else if(p[0]==='president') body=renderPresidentPage();
  else if(p[0]==='search') body=await renderSearchPage({query:new URLSearchParams(r.split('?')[1]||'').get('q')||'',page:new URLSearchParams(r.split('?')[1]||'').get('page')||1,politicians,content});
  else if(p[0]==='academy') body=await views.renderAcademy(content,session);
  else if(p[0]==='trending')body=renderTrendingPage(await politicians.trending());
  else if(p[0]==='keywords')body=renderKeywordsPage(await politicians.keywords(),new URLSearchParams(r.split('?')[1]||'').get('q')||'');
  else if(p[0]==='now') body=await renderPoliticianDirectory(politicians,r);
  else if(p[0]==='person') body=await renderPoliticianDetail(p[1]||'',politicians,session,dashboard);
  else if(p[0]==='compare') body=await renderPoliticianCompare(politicians,r,session);
  else if(p[0]==='request-politician'){const result=session.authenticated?await content.listPoliticianRequests().catch(()=>({items:[]})):{items:[]};body=views.renderPoliticianRequest({session,requests:result.items||[]});}
  else if(p[0]==='partners'){const result=session.user?.role==='admin'?await content.listPartnerApplications().catch(()=>({items:[]})):{items:[]};body=views.renderPartners({session,applications:result.items||[]});}
  else if(p[0]==='login') body=views.renderLogin();
  else if(p[0]==='join') body=views.renderJoin();
  else if(p[0]==='inquiry') body=p[1]==='write'?views.renderInquiryWrite(session):p[1]?await views.renderInquiryDetail(p[1],content,session):await views.renderInquiryBoard(content,session);
  else if(p[0]==='mypage'&&['activity','badges'].includes(p[1])) body=views.renderMyActivity(session,badgeStatus||{},r.includes('?')?`?${r.split('?')[1]}`:'');
  else if(p[0]==='mypage'&&['points','comments'].includes(p[1])) body=views.renderMyPage(session,badgeStatus||{},dashboard,{section:p[1],search:r.includes('?')?`?${r.split('?')[1]}`:''});
  else if(p[0]==='mypage'&&p[1]==='posts') body=views.renderMyPage(session,badgeStatus||{},dashboard,{section:'authored',search:r.includes('?')?`?${r.split('?')[1]}`:''});
  else if(p[0]==='mypage'&&p[1]==='favorites'&&p[2]==='posts') body=views.renderMyPage(session,badgeStatus||{},dashboard,{section:'favorite-posts',search:r.includes('?')?`?${r.split('?')[1]}`:''});
  else if(p[0]==='mypage'&&p[1]==='favorites'&&p[2]==='politicians') body=views.renderMyPage(session,badgeStatus||{},dashboard,{section:'favorite-people'});
  else if(p[0]==='mypage') body=views.renderMyPage(session,badgeStatus||{},dashboard);
  else if(p[0]==='admin'&&adminRouteState(r).tab==='participation'&&session.authenticated&&session.user?.role==='admin'){const settings=await auth.participationSettings();if(!settings.ok)body='<section class="module"><p>참여 설정을 불러오지 못했습니다. 새로고침해 주세요.</p></section>';else{const ids=[...new Set((settings.data.generation?.items||[]).flatMap(x=>x.candidateIds||[]))],people=await Promise.all(ids.map(id=>politicians.get(id).catch(()=>null)));settings.data.generation={...settings.data.generation,candidateLabels:Object.fromEntries(people.filter(x=>x?.ok&&x.item).map(x=>[x.item.id,x.item.name]))};body=renderParticipationAdminSettings(settings.data);}}
  else if(p[0]==='admin') body=await views.renderAdminStable(session,auth,adminRouteState(r));
  else if(p[0]==='migration') body=views.renderMigration();
  else if(unstable.has(p[0])) body=`<section class="module"><span class="eyebrow">NEXT PHASE</span><h2>${p[0]}</h2><p class="module-desc">이 영역은 이번 버전에서 제외했습니다. NOW·정치인 데이터·분석 엔진은 연결하지 않습니다.</p></section>`;
  else body=`<section class="module"><h2>페이지를 찾을 수 없습니다</h2></section>`;
  if(renderId!==renderSequence)return;
  if(['community','itsme','column','news','inquiry','poll','generation-president','national-evaluation','academy'].includes(p[0]))body=body.replace(/class="subpage\b/,'class="subpage board-typography');
  if(p[0]==='mypage'&&session.authenticated){
    const current=r.split('?')[0],tabs=[['/mypage','마이페이지'],['/mypage/favorites/politicians','즐겨찾는 정치인'],['/mypage/favorites/posts','즐겨찾는 게시글'],['/mypage/posts','내 게시글'],['/mypage/comments','내 댓글'],['/mypage/points','포인트']];
    body=`<div class="mypage-workspace"><nav class="mypage-section-nav" aria-label="마이페이지 메뉴">${tabs.map(([href,label])=>`<a href="${href}" data-layout-route="${href}" ${current===href?'aria-current="page"':''}>${label}</a>`).join('')}</nav>${body}</div>`;
  }
  if(refreshHome&&homeSnapshot&&document.querySelector('.product-home-wrap')&&homeSnapshot.identity===sessionIdentity(session))updateVisibleHome(body);
  else if(!await shell(body,session,renderId))return;
  if(!p.length)homeSnapshot={node:app.firstElementChild,body,at:Date.now(),identity:sessionIdentity(session)};
  if(!p.length&&session.authenticated)void badgeStatusPromise.then(status=>{
    if(renderId!==renderSequence||route()!==r||!status)return;
    for(const mount of document.querySelectorAll('[data-badge-showcase-mount]'))mount.innerHTML=renderBadgeShowcase(status,mount.dataset.badgeMypage==='true',mount.dataset.displayName||'');
  });
  if(!p.length&&session.authenticated)void Promise.all([summaryPromise,walletPromise]).then(([summary,wallet])=>{
    if(renderId!==renderSequence||route()!==r)return;
    for(const mount of document.querySelectorAll('[data-member-summary-mount]'))mount.innerHTML=renderMemberSummary(summary,wallet);
  });
  setupMemberBadgeManagers();
  restoreCageDraft();
  showCageFeedback();
  if(p[0]==='person'){invalidateHome();recordRecentPolitician(document);tunePoliticianNarratives();if(session.user?.role==='admin')void updatePoliticianPhotoStorageStatus();}
  if(!preserveScroll){window.scrollTo(0,0);if(p[0]==='support'||p[0]==='points'&&new URLSearchParams(r.split('?')[1]||'').get('view')==='support'){const target=document.getElementById('jcs-support');target?.scrollIntoView({block:'start'});target?.querySelector('h2')?.focus({preventScroll:true});}}
  navigation?.cacheCurrent();
  if(p[0]==='admin')queueMicrotask(resumeAdminIntelligence);
}

navigation=createNavigation({window,readSnapshot:()=>app.innerHTML,restoreSnapshot:markup=>{app.innerHTML=markup;if(document.querySelector('.product-home-wrap')&&homeSnapshot)homeSnapshot.node=app.firstElementChild;},rebind:()=>{++renderSequence;const cachedRoute=parts(route());if(['mypage','points'].includes(cachedRoute[0]))queueMicrotask(()=>void render({preserveScroll:true}));else if(!cachedRoute.length)void refreshCachedMemberSummary();setupLayoutInteractions(document,{politicianSearch:(query,limit)=>politicians.search(query,limit)});setupMemberBadgeManagers();if(document.querySelector('.jc55'))queueMicrotask(()=>void render({preserveScroll:true}));if(pipelineActive())queueMicrotask(resumeAdminIntelligence);},onRoute:(_route,options)=>void render(options)});
navigation.start();
window.addEventListener('jcs:layout-route',event=>navigation.navigate(event.detail?.route||'/'));
window.addEventListener('jcs:layout-search',event=>navigation.navigate(`/search?q=${encodeURIComponent(String(event.detail?.query||'').trim())}`));
document.addEventListener('change',event=>{
 const form=event.target.closest('form');if(!form)return;const province=form.querySelector('[data-region-province]'),city=form.querySelector('[data-region-city]'),district=form.querySelector('[data-region-district]'),field=form.querySelector('[data-region-district-field]');
 if(event.target===province&&city){city.innerHTML='<option value="">시·군·구 선택</option>'+regionDistrictOptions(province.value).map(value=>`<option>${value}</option>`).join('');city.disabled=!province.value;}
 if((event.target===province||event.target===city)&&district){const rows=regionSubdistrictOptions(province.value,city.value);district.innerHTML='<option value="">구 선택</option>'+rows.map(value=>`<option>${value}</option>`).join('');district.disabled=!rows.length;district.required=!!rows.length;field.hidden=!rows.length;}
 const select=event.target.closest('[data-intelligence-past-risk-form] select[name="personId"]');if(select){const textarea=select.closest('form')?.querySelector('textarea[name="pastRisks"]');if(textarea)textarea.value='';return;}const input=event.target.closest('[data-politician-photo-input]');if(!input)return;const file=input.files?.[0],preview=input.closest('form')?.querySelector('[data-politician-photo-preview]');if(!file||!preview)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1048576){preview.innerHTML='<span>JPG·PNG·WEBP 파일을 1MB 이하로 선택해 주세요.</span>';input.value='';return;}if(preview.dataset.objectUrl)URL.revokeObjectURL(preview.dataset.objectUrl);const objectUrl=URL.createObjectURL(file),img=document.createElement('img');img.src=objectUrl;img.alt='업로드 전 프로필 사진 미리보기';preview.dataset.objectUrl=objectUrl;preview.replaceChildren(img);});


document.addEventListener('toggle',async event=>{const details=event.target;if(!(details instanceof HTMLDetailsElement)||!details.matches('[data-admin-audit-disclosure]')||!details.open||details.dataset.loaded==='true')return;const mount=details.querySelector('[data-admin-audit-mount]');details.dataset.loaded='loading';if(mount)mount.innerHTML='<p>관리자 작업 기록을 불러오는 중입니다…</p>';const result=await auth.adminAudit().catch(()=>({ok:false,error:'AUDIT_LOAD_FAILED'}));if(!details.isConnected)return;if(result?.ok){if(mount)mount.innerHTML=views.renderAdminAuditPanel(result);details.dataset.loaded='true';}else{if(mount)mount.innerHTML='<p>작업 기록을 불러오지 못했습니다. 접었다가 다시 펼쳐 주세요.</p>';delete details.dataset.loaded;}},true);

document.addEventListener('submit',async event=>{
  const keywordForm=event.target.closest('[data-keyword-rules-form]');if(keywordForm){event.preventDefault();const data=Object.fromEntries(new FormData(keywordForm)),parse=value=>Object.fromEntries(String(value||'').split('\n').map(line=>line.split('=').map(part=>part.trim())).filter(parts=>parts.length===2&&parts.every(Boolean)));data.aliases=parse(data.aliases);data.labels=parse(data.labels);const result=await auth.saveKeywordRules(data);keywordForm.querySelector('[data-form-state]').textContent=result.ok?'저장했습니다.':result.error||'저장하지 못했습니다.';return;}
  const footerInfoForm=event.target.closest('[data-footer-info-form]');
  if(footerInfoForm){event.preventDefault();const state=footerInfoForm.querySelector('[data-form-state]'),result=await auth.saveFooterInfo(Object.fromEntries(new FormData(footerInfoForm)));if(state)state.textContent=result?.ok?'풋터 정보를 저장하고 공개 화면에 반영했습니다.':(result?.error||'풋터 정보를 저장하지 못했습니다.');if(result?.ok){shellInfoCache=null;await render({preserveScroll:true});}return;}
  const bannerForm=event.target.closest('[data-home-banner-form]');
  if(bannerForm){
    event.preventDefault();const data=new FormData(bannerForm),pc=data.get('pc'),mobile=data.get('mobile'),tablet=data.get('tablet'),files=[pc,mobile,tablet],state=bannerForm.querySelector('[data-form-state]'),submit=bannerForm.querySelector('[type="submit"]');
    if(files.some(file=>!(file instanceof File)||!file.size)){state.textContent='기기별 배너 이미지를 모두 선택해 주세요.';return;}
    if(files.some(file=>file.size>2097152||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))){state.textContent='JPG·PNG·WEBP·GIF, 이미지별 최대 2MB입니다.';return;}
    if(files.reduce((sum,file)=>sum+file.size,0)>3145728){state.textContent='선택한 이미지의 합계 용량은 3MB 이하로 선택해 주세요.';return;}
    if(submit.disabled)return;submit.disabled=true;state.textContent='기기별 배너 3종을 저장하고 있습니다…';
    try{const encode=async file=>{const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let start=0;start<bytes.length;start+=32768)binary+=String.fromCharCode(...bytes.subarray(start,start+32768));return {contentType:file.type,dataBase64:btoa(binary)};};
      const result=await content.saveHomeBanner({placement:String(data.get('placement')||'sidebar'),pc:await encode(pc),mobile:await encode(mobile),...(tablet instanceof File&&tablet.size?{tablet:await encode(tablet)}:{}),targetUrl:String(data.get('targetUrl')||''),alt:String(data.get('alt')||'정참시 배너')});
      const messages={BANNER_STORAGE_NOT_CONFIGURED:'배너 저장소가 연결되지 않았습니다.',BANNER_BOTH_REQUIRED:'기기별 배너 이미지를 모두 선택해 주세요.',BANNER_PAIR_TOO_LARGE:'이미지의 합계 용량은 3MB 이하입니다.',BANNER_TOO_LARGE:'이미지별 최대 2MB입니다.',BANNER_TYPE_INVALID:'JPG·PNG·WEBP·GIF 이미지만 업로드할 수 있습니다.',BANNER_SIGNATURE_INVALID:'손상되었거나 지원하지 않는 이미지입니다.',BANNER_TARGET_URL_INVALID:'클릭 이동 주소는 https://로 시작해야 합니다.'};
      state.textContent=result?.ok?'기기별 배너 3종을 저장했습니다.':messages[result?.error]||'배너를 저장하지 못했습니다. 다시 시도해 주세요.';
      if(result?.ok){bannerForm.closest('dialog')?.close();await render({preserveScroll:true});}
    }catch{state.textContent='배너를 저장하지 못했습니다. 다시 시도해 주세요.';}finally{submit.disabled=false;}return;
  }
  const youtubeChannel=event.target.closest('[data-youtube-channel-form]');
  if(youtubeChannel){event.preventDefault();const button=youtubeChannel.querySelector('button'),data=new FormData(youtubeChannel),personId=youtubeChannel.dataset.youtubeChannelForm||String(data.get('personId')||'');if(button)button.disabled=true;const result=await auth.youtubeChannelSave({personId,reference:String(data.get('reference')||'')});if(!result?.ok){alert(result?.error||'공식 채널을 저장하지 못했습니다.');if(button)button.disabled=false;return;}await render({preserveScroll:true});return;}
  const memberProfile=event.target.closest('[data-member-profile-form]');
  if(memberProfile){event.preventDefault();const data=Object.fromEntries(new FormData(memberProfile)),state=memberProfile.querySelector('[data-member-profile-state]'),result=await auth.updateMemberProfile({id:memberProfile.dataset.memberProfileForm,...data});if(state)state.textContent=result?.ok?'회원 정보를 저장했습니다. 기존 로그인 상태도 안전하게 갱신했습니다.':(result?.error||'회원 정보를 저장하지 못했습니다.');return;}
  const memberPassword=event.target.closest('[data-member-password-reset]');
  if(memberPassword){event.preventDefault();const data=new FormData(memberPassword),state=memberPassword.querySelector('[data-member-password-state]');if(!confirm('임시 비밀번호로 초기화하고 이 회원의 기존 로그인을 모두 종료할까요?'))return;const result=await auth.resetMemberPassword(memberPassword.dataset.memberPasswordReset,String(data.get('temporaryPassword')||''));if(state)state.textContent=result?.ok?'초기화했습니다. 임시 비밀번호를 회원에게 별도로 전달하세요.':(result?.error||'초기화하지 못했습니다.');if(result?.ok)memberPassword.reset();return;}
  const politicianSearch=event.target.closest('[data-admin-politician-search]');
  if(politicianSearch){event.preventDefault();const q=String(new FormData(politicianSearch).get('q')||'').trim();navigation.navigate(adminRouteWith(route(),{tab:'politicians',q,person:''}));return;}
  const politicianRisk=event.target.closest('[data-politician-risk-form]');
  if(politicianRisk){event.preventDefault();const raw=String(new FormData(politicianRisk).get('pastRisks')||''),pastRisks=raw.split(/\r?\n/).filter(Boolean).map(line=>line.split('|').map(value=>value.trim())).map(([tag,title,url,date])=>({tag,title,url,date})),state=politicianRisk.querySelector('[data-politician-state]'),result=await auth.savePoliticianPastRisks(politicianRisk.dataset.politicianRiskForm,pastRisks);if(state)state.textContent=result?.ok?'다음 수집에도 유지되도록 영구 저장했습니다.':(result?.error||'저장하지 못했습니다.');return;}
  const politicianExclusion=event.target.closest('[data-politician-exclusion-form]');
  if(politicianExclusion){event.preventDefault();const newsExclusions=String(new FormData(politicianExclusion).get('newsExclusions')||'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean),state=politicianExclusion.querySelector('[data-politician-state]'),result=await auth.savePoliticianNewsExclusions(politicianExclusion.dataset.politicianExclusionForm,newsExclusions);if(state)state.textContent=result?.ok?'뉴스 오탐 제외 목록을 저장했습니다.':(result?.error||'저장하지 못했습니다.');return;}
  const politicianPhoto=event.target.closest('[data-politician-photo-form]');
  if(politicianPhoto){event.preventDefault();const data=new FormData(politicianPhoto),file=data.get('photo'),state=politicianPhoto.querySelector('[data-politician-state]');if(!(file instanceof File)||file.size>1048576||!['image/jpeg','image/png','image/webp'].includes(file.type)){if(state)state.textContent='JPG·PNG·WEBP 파일을 1MB 이하로 선택해 주세요.';return;}if(politicianPhoto.dataset.currentPhoto==='true'&&!confirm('현재 프로필 사진을 선택한 사진으로 교체할까요?'))return;const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let start=0;start<bytes.length;start+=32768)binary+=String.fromCharCode(...bytes.subarray(start,start+32768));const result=await auth.uploadPoliticianPhoto({personId:politicianPhoto.dataset.politicianPhotoForm,contentType:file.type,dataBase64:btoa(binary),focus:String(data.get('focus')||'50% 22%')});if(state)state.textContent=photoUploadMessage(result);if(result?.ok){politicianPhoto.dataset.currentPhoto='true';if(politicianPhoto.dataset.photoRerender==='true')await render({preserveScroll:true});}return;}
  const requiredPassword=event.target.closest('[data-required-password-form]');
  if(requiredPassword){event.preventDefault();const password=String(new FormData(requiredPassword).get('password')||''),state=requiredPassword.querySelector('[data-form-state]'),result=await auth.completePasswordChange(password);if(state)state.textContent=result?.ok?'새 비밀번호로 변경했습니다.':(result?.error||'변경하지 못했습니다.');if(result?.ok)await render();return;}
  const intelligenceDraft=event.target.closest('[data-intelligence-draft-form]');
  if(intelligenceDraft){event.preventDefault();const data=new FormData(intelligenceDraft),state=intelligenceDraft.querySelector('[data-intelligence-draft-state]'),result=await auth.intelligenceDraftUpdate({personId:intelligenceDraft.dataset.personId,diagnoses:[{id:'01',headline:String(data.get('diagnosisHeadline')||'')}],prescriptions:[{id:'01',strategicJudgment:String(data.get('prescriptionJudgment')||'')}]});if(state)state.textContent=result?.ok?'수정본을 저장했습니다. 자동 검증 통과 시 바로 게시할 수 있습니다.':(result?.error||'수정본을 저장하지 못했습니다.');if(result?.ok)await render({preserveScroll:true});return;}
  const pastRiskForm=event.target.closest('[data-intelligence-past-risk-form]');
  if(pastRiskForm){event.preventDefault();const data=new FormData(pastRiskForm),state=pastRiskForm.querySelector('[data-intelligence-draft-state]'),pastRisks=String(data.get('pastRisks')||'').split(/\r?\n/).map(line=>line.split('|').map(value=>value.trim())).filter(parts=>parts[0]&&parts[1]&&/^https?:\/\//.test(parts[2])).slice(0,5).map(([tag,title,url,date])=>({tag:tag.startsWith('#')?tag:`#${tag}`,title,url,date:date||''})),result=await auth.intelligenceDraftUpdate({personId:String(data.get('personId')||''),diagnoses:[{id:'01',pastRisks}]});if(state)state.textContent=result?.ok?'PAST RISK SIGNALS를 저장했습니다. 자동 검증 통과 시 바로 게시할 수 있습니다.':(result?.error||'PAST RISK SIGNALS를 저장하지 못했습니다.');if(result?.ok)await render({preserveScroll:true});return;}
  const pointForm=event.target.closest('[data-point-form]');
  if(pointForm){event.preventDefault();const fd=new FormData(pointForm),input=Object.fromEntries(fd);input.operation=pointForm.dataset.pointForm;input.confirmed=pointForm.elements.confirmed?.checked===true;input.decision=event.submitter?.value;const state=pointForm.querySelector('[data-form-state]'),buttons=[...pointForm.querySelectorAll('button')];if((input.operation==='grant'||input.operation==='review'&&input.decision==='approve')&&!input.confirmed){state.textContent='입금 확인 항목을 체크해 주세요.';return;}if(input.operation==='cage'&&!window.confirm('선택한 포인트를 사용해 케이지를 지금 개설할까요?'))return;buttons.forEach(b=>b.disabled=true);try{const result=await content.pointAction(input);if(result.ok){if(result.id)navigation.navigate('/community/'+result.id);else if(pointForm.closest('[data-member-points-panel]'))await loadMemberPoints(pointForm.closest('[data-member-points-panel]'));else await render({preserveScroll:true});}else if(result.error==='INSUFFICIENT_POINTS'){state.textContent='보유 포인트가 부족해 케이지를 열 수 없습니다.';if(await askPointCharge(pointForm)){if(parts(route())[0]==='points')document.querySelector('[data-point-form=order]')?.scrollIntoView({behavior:'smooth'});else navigation.navigate('/points');}}else state.textContent=({INSUFFICIENT_POINTS:'보유 포인트가 부족합니다.',BANK_REQUIRED:'은행·계좌번호·예금주를 등록해 주세요.',LOGIN_REQUIRED:'로그인이 필요합니다.',TRANSFER_CONFIRM_REQUIRED:'실제 입금을 확인해 주세요.',INVALID_CAGE:'제목·내용과 50,000~100,000P 사이의 금액을 확인해 주세요.'})[result.error]||result.error||'처리하지 못했습니다.';}catch{state.textContent='처리 결과를 확인하지 못했습니다. 같은 신청으로 다시 시도해 주세요.';}finally{buttons.forEach(b=>b.disabled=false);}return;}
  const cohortForm=event.target.closest('[data-generation-cohort-editor]');
  if(cohortForm){event.preventDefault();const ids=[...cohortForm.querySelectorAll('[name=cohortIds]')].map(x=>x.value),counts=Object.fromEntries([...cohortForm.querySelectorAll('.generation-manage-row')].map(row=>[row.querySelector('[name=cohortIds]').value,Number(row.querySelector('[data-cohort-count]').value)])),state=cohortForm.querySelector('[data-form-state]'),button=cohortForm.querySelector('[type=submit]');button.disabled=true;try{const result=await content.editParticipation('generation','',{age:cohortForm.dataset.age,itemId:cohortForm.dataset.itemId,candidateIds:ids,counts,enabled:cohortForm.elements.enabled.checked},'cohort');if(result.ok)await render({preserveScroll:true});else state.textContent=result.error==='GENERATION_ROUND_CHANGED'?'현재 회차가 바뀌었습니다. 새로고침 후 다시 저장해 주세요.':result.error||'저장하지 못했습니다.';}catch{state.textContent='저장하지 못했습니다. 다시 시도해 주세요.';}finally{button.disabled=false;}return;}
  const demoForm=event.target.closest('[data-participation-demo]');
  if(demoForm){event.preventDefault();const counts={},state=demoForm.querySelector('[data-form-state]'),button=demoForm.querySelector('button[type="submit"]');for(const field of demoForm.querySelectorAll('[data-demo-key]')){const age=field.dataset.demoAge,key=field.dataset.demoKey;if(age){counts[age]??={};counts[age][key]=Number(field.value);}else counts[key]=Number(field.value);}button.disabled=true;try{const result=await content.editParticipation(demoForm.dataset.domain,demoForm.dataset.postId,{enabled:demoForm.elements.enabled.checked,counts},'demo');if(result.ok)await render({preserveScroll:true});else state.textContent=result.error==='INVALID_DEMO_COUNT'?'0부터 100,000,000까지의 정수를 입력해 주세요.':result.error||'저장하지 못했습니다.';}catch{state.textContent='저장하지 못했습니다. 다시 시도해 주세요.';}finally{button.disabled=false;}return;}
  const cageForm=event.target.closest('[data-home-cage-form]');
  if(cageForm){event.preventDefault();const state=cageForm.querySelector('[data-form-state]');try{const result=await auth.saveHomeCage(String(new FormData(cageForm).get('id')||''));state.textContent=result.ok?'메인 미리보기를 저장했습니다.':result.error||'저장하지 못했습니다.';}catch{state.textContent='저장하지 못했습니다.';}return;}
  const participationEdit=event.target.closest('[data-participation-edit]');
  if(participationEdit){event.preventDefault();if(participationEdit.dataset.saving)return;const operation=event.submitter?.value||'edit';if(operation==='delete'&&!window.confirm('이 게시물을 삭제하시겠습니까?'))return;participationEdit.dataset.saving='true';const state=participationEdit.querySelector('[data-form-state]');try{const fd=new FormData(participationEdit),input=Object.fromEntries(fd);input.optionLabels=fd.getAll('optionLabels');if(operation==='edit'&&participationEdit.dataset.participationEdit==='polls')input.optionImages=await pollOptionImages(participationEdit,input.optionLabels.length);const result=await content.editParticipation(participationEdit.dataset.participationEdit,participationEdit.dataset.postId,input,operation);if(result.ok)await render({preserveScroll:true});else state.textContent=result.error||'저장하지 못했습니다.';}catch(error){state.textContent=error.message||'이미지를 저장하지 못했습니다.';}finally{delete participationEdit.dataset.saving;}return;}
  const participationAdmin=event.target.closest('[data-participation-admin-form]');
  if(participationAdmin){event.preventDefault();if(participationAdmin.dataset.saving)return;participationAdmin.dataset.saving='true';const state=participationAdmin.querySelector('[data-form-state]');try{const formData=new FormData(participationAdmin),data=Object.fromEntries(formData);data.applyToMain=data.applyToMain==='true';if(participationAdmin.dataset.participationAdminForm==='generation')data.candidateIds=formData.getAll('candidateIds').map(String).filter(Boolean);if(participationAdmin.dataset.participationAdminForm==='polls'){const count=String(data.options||'').split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean).slice(0,10).length;if(count<2)throw new Error('선택지를 두 개 이상 입력해 주세요.');data.optionImages=await pollOptionImages(participationAdmin,count);}const result=await content.createParticipation(participationAdmin.dataset.participationAdminForm,data);if(state)state.textContent=result?.ok?'저장하고 적용했습니다.':(result?.error||'저장하지 못했습니다.');if(result?.ok)await render();}catch(error){if(state)state.textContent=error.message||'저장하지 못했습니다.';}finally{delete participationAdmin.dataset.saving;}return;}
  const generationSearch=event.target.closest('[data-generation-search]');
  if(generationSearch){event.preventDefault();const data=new FormData(generationSearch),age=String(data.get('age')||'20대'),query=String(data.get('q')||'').trim();navigation.navigate(`/generation-president?age=${encodeURIComponent(age)}${query?`&q=${encodeURIComponent(query)}`:''}`);return;}
  const form=event.target.closest('[data-stage-form]'); if(!form)return;
  event.preventDefault(); const data=Object.fromEntries(new FormData(form)); const type=form.dataset.stageForm; let result=null;
  if(form.dataset.pending)return;form.dataset.pending='true';const submitButtons=[...form.querySelectorAll('button[type="submit"],button:not([type])')],dialog=form.closest('dialog');submitButtons.forEach(button=>button.disabled=true);
  try{
  if(form.querySelector('[name="pinKind"]'))data.pinKind=data.pinCage?'cage':data.pinNotice?'notice':'';
  delete data.pinNotice;delete data.pinCage;

  if(['board','post-edit'].includes(type)&&data.coverFile?.size){
    const state=form.querySelector('[data-form-state]');if(data.coverFile.size>1048576){if(state)state.textContent='사진은 최대 1MB까지 등록할 수 있습니다.';return;}
    const upload=await content.uploadImage(form.dataset.domain,data.coverFile,form.dataset.postId||'');if(!upload.ok){if(state)state.textContent=upload.error||'사진 업로드 실패';return;}data.coverImage=upload.url;
  }
  delete data.coverFile;
  if(type==='post-edit'){const item=await content.update(form.dataset.domain,form.dataset.postId,data);result=item?.error?{ok:false,error:item.error}:{ok:true};if(result.ok)await render({preserveScroll:true});}
  if(type==='post-delete'){if(form.dataset.confirmed!=='true'&&!window.confirm('이 게시물을 삭제하시겠습니까?'))return;result=await content.remove(form.dataset.domain,form.dataset.postId);if(result.ok)result.route=form.dataset.returnRoute||`/${form.dataset.domain==='columns'?'column':form.dataset.domain}`;}
  if(type==='login') result=await auth.login(data);
  if(type==='join'){result=await auth.register(data);shellInfoCache=null;}
  if(type==='profile-address'){data.regionDistrict=data.regionDistrict||'';result=await auth.updateProfile(data);}
  if(type==='board'&&form.dataset.domain==='community'&&data.writeMode==='cage'){
    const button=form.querySelector('button[type=submit]'),state=form.querySelector('[data-form-state]');if(form.dataset.busy)return;form.dataset.busy='true';button.disabled=true;
    try{const opened=await content.pointAction({operation:'cage',fee:data.fee,title:data.title,body:data.body,requestId:data.requestId});if(opened.ok){try{sessionStorage.removeItem('jcs-cage-draft:'+form.querySelector('[data-cage-writer]').dataset.userId);}catch{}navigation.navigate('/community/'+opened.id);}else if(opened.error==='INSUFFICIENT_POINTS'){state.textContent='포인트가 부족해 케이지를 열 수 없습니다.';if(await askPointCharge(button)){try{sessionStorage.setItem('jcs-cage-draft:'+form.querySelector('[data-cage-writer]').dataset.userId,JSON.stringify({title:data.title,body:data.body,fee:data.fee,requestId:data.requestId}));}catch{}navigation.navigate('/points');}}else state.textContent=formErrors[opened.error]||opened.error||'개설에 실패했습니다.';}catch{state.textContent='개설 결과를 확인하지 못했습니다. 같은 신청으로 다시 시도해 주세요.';}finally{delete form.dataset.busy;button.disabled=false;}return;
  }
  if(type==='board'){const item=await content.create(form.dataset.domain,data),routeName=form.dataset.domain==='columns'?'column':form.dataset.domain==='news'?'news':'community';result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/${routeName}/${item.id}`};if(result.ok&&data.cageParentId){cageFeedback={rootId:data.cageParentId,camp:data.camp};cageRouteState({page:1,mode:'posts'});delete result.route;await render({preserveScroll:true});}}
  if(type==='itsme'){const item=await content.create('itsme',data);result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/itsme/${item.id}`};}
  if(type==='goods-request'){result=await content.createInquiry({...data,kind:'goods-request',visibility:'private'});if(result?.ok)result.route=`/inquiry/${result.item.id}`;}
  if(type==='inquiry'){result=await content.createInquiry(data);if(result?.ok)result.route=`/inquiry/${result.item.id}`;}
  if(type==='inquiry-reply'){result=await content.replyInquiry(form.dataset.inquiryId,data.body);if(result?.ok)await render({preserveScroll:true});}
  if(type==='comment'){result=await content.comment(form.dataset.domain,form.dataset.postId,data.text,{camp:data.camp,parentId:data.parentId});if(result.ok){const root=form.closest('.jc55');if(root&&data.camp){cageFeedback={rootId:root.dataset.cageId,camp:data.camp};cageRouteState({mode:'comments'});}await render({preserveScroll:true});}}
  if(type==='comment-edit'){result=await content.editComment(form.dataset.domain,form.dataset.postId,form.dataset.commentId,data.text);if(result.ok)await render({preserveScroll:true});}
  if(type==='comment-delete'){result=await content.deleteComment(form.dataset.domain,form.dataset.postId,form.dataset.commentId);if(result.ok)await render({preserveScroll:true});}

  if(type==='poll-vote'){result=await content.vote(form.dataset.voteScope,String(data.option||''));}
  if(type==='politician-request')result=await content.createPoliticianRequest(data);
  if(type==='politician-request-status')result=await content.updatePoliticianRequest(form.dataset.requestId,data.status);
  if(type==='partner')result=await content.createPartnerApplication(data);
  if(type==='migration'){result=await auth.migrationRun(String(data.secret||''));}
  if(type==='politician-migration'){result=await auth.politicianMigrationRun(String(data.secret||''));}
  const state=form.querySelector('[data-form-state]'); if(state)state.textContent=result?.ok?(result.message||'처리되었습니다.'):(formErrors[result?.error]||result?.error||'처리하지 못했습니다.');
  if(result?.ok)dialog?.close();
  if(result?.status===401&&type!=='migration'){navigation.navigate('/login');return;}
  if(result?.ok&&['login','join'].includes(type)){navigation.navigate('/mypage');return;}
  if(result?.route){navigation.navigate(result.route);return;}
  if(result?.ok&&['migration','politician-migration'].includes(type)){await render();return;}
  if(result?.ok&&['poll-vote','politician-request','politician-request-status','partner'].includes(type)){await render({preserveScroll:true});return;}
  if(result?.ok&&!['comment','inquiry-reply'].includes(type))form.reset();
  }catch{const state=form.querySelector('[data-form-state]');if(state)state.textContent='요청을 완료하지 못했습니다. 입력 내용은 유지되니 다시 시도해 주세요.';}
  finally{delete form.dataset.pending;submitButtons.forEach(button=>button.disabled=false);}
});

function communityDialog(html,trigger){const dialog=document.createElement('dialog');dialog.className='jc49';dialog.innerHTML=html;document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();},{once:true});dialog.showModal();return dialog;}
document.addEventListener('change',event=>{
 const input=event.target,form=input.closest('form');if(!form)return;
 if(['pinNotice','pinCage'].includes(input.name)&&input.checked){const peer=form.querySelector(`[name="${input.name==='pinNotice'?'pinCage':'pinNotice'}"]`);if(peer)peer.checked=false;}
 if(input.name==='camp'){form.querySelectorAll('[data-camp-body]').forEach(el=>el.disabled=false);const button=form.querySelector('[data-jc-compose]');if(button)button.disabled=false;}
});
document.addEventListener('click',async event=>{
 const featurePair=event.target.closest('[data-home-compare-feature]');
 if(featurePair){event.preventDefault();if(featurePair.dataset.saving)return;const form=featurePair.closest('[data-home-compare]'),ids=[...form.querySelectorAll('[data-home-compare-id]')].map(input=>input.value),state=form.querySelector('[data-home-compare-state]');featurePair.dataset.saving='true';featurePair.disabled=true;state.textContent='이번 비교를 저장하고 있습니다.';try{const result=await content.saveHomeCompare(ids);if(result.ok){await render({preserveScroll:true,refreshHome:true});const status=document.querySelector('[data-home-compare-state]');if(status)status.textContent='이번 비교로 저장했습니다.';}else state.textContent=result.error==='POLITICIAN_NOT_FOUND'?'등록된 정치인을 다시 선택해 주세요.':'저장하지 못했습니다. 다시 시도해 주세요.';}catch{state.textContent='저장하지 못했습니다. 다시 시도해 주세요.';}finally{delete featurePair.dataset.saving;featurePair.disabled=false;}return;}

 const pointPackage=event.target.closest('[data-point-package]');if(pointPackage){const root=pointPackage.closest('.point-shop');root.querySelectorAll('[data-point-package]').forEach(b=>b.setAttribute('aria-pressed',String(b===pointPackage)));const form=root.querySelector('[data-point-form="order"]');if(form){form.elements.amount.value=pointPackage.dataset.pointPackage;form.querySelector('[data-point-quote]').textContent='예상 지급 '+Number(pointPackage.dataset.pointTotal).toLocaleString('ko-KR')+'P';}return;}

 const cohort=event.target.closest('[data-generation-cohort-editor]');
 if(cohort&&event.target.closest('[data-cohort-remove],[data-cohort-add],[data-cohort-copy]')){
  const state=cohort.querySelector('[data-form-state]'),rows=cohort.querySelector('[data-cohort-rows]');
  const add=(id,name)=>{if(rows.querySelectorAll('.generation-manage-row').length>=15){state.textContent='후보는 세대별 최대 15명입니다.';return;}if([...rows.querySelectorAll('[name=cohortIds]')].some(x=>x.value===id))return;
   const row=document.createElement('div');row.className='generation-manage-row';row.innerHTML='<input type="hidden" name="cohortIds"><span></span><label>데모 득표수<input type="number" min="0" max="100000000" step="1" required value="0" data-cohort-count></label><button type="button" data-cohort-remove>제외</button>';row.querySelector('input').value=id;row.querySelector('span').textContent=name;rows.append(row);};
  if(event.target.closest('[data-cohort-remove]'))event.target.closest('.generation-manage-row').remove();
  if(event.target.closest('[data-cohort-add]')){const id=cohort.querySelector('#cohort-add-id'),name=cohort.querySelector('[data-cohort-add-name]');if(!id.value){state.textContent='검색 결과에서 정치인을 선택해 주세요.';return;}add(id.value,name.value);id.value='';name.value='';}
  if(event.target.closest('[data-cohort-copy]')){if(rows.children.length&&!window.confirm('현재 편집 중인 후보 목록을 선택한 세대의 목록으로 바꿀까요? 데모 득표수는 0으로 시작합니다.'))return;const pool=JSON.parse(cohort.dataset.copyPools)[cohort.querySelector('[data-cohort-copy-age]').value]||[];rows.replaceChildren();pool.forEach(p=>add(p.id,p.name));}
  state.textContent='변경 내용을 저장하면 반영됩니다.';return;
 }

 const pageButton=event.target.closest('[data-cage-page]');
 if(pageButton){event.preventDefault();if(pageButton.disabled)return;const root=pageButton.closest('.jc55'),data=content.peekDomain('community');if(!root||!data)return;root.querySelector('.ca-hits').outerHTML=renderCageHits(cagePageData(data.items,root.dataset.cageId));root.querySelector('[data-cage-posts]').outerHTML=renderCagePosts(data.items,root.dataset.cageId,pageButton.dataset.cagePage);const current=root.querySelector('[data-cage-posts]');cageRouteState({page:current.dataset.currentPage});current.querySelector('[data-cage-list-title]')?.focus({preventScroll:true});current.scrollIntoView({block:'start',behavior:'auto'});navigation.cacheCurrent();return;}
 const modeButton=event.target.closest('[data-cage-mode]');
 if(modeButton){event.preventDefault();const root=modeButton.closest('.jc55'),mode=modeButton.dataset.cageMode,data=content.peekDomain('community');if(!root||!data)return;const arena=root.querySelector('[data-cage-arena]');arena.outerHTML=renderCageArena(data.cageStats?.[root.dataset.cageId],mode,false);const next=root.querySelector('[data-cage-arena]');next.querySelector(`[data-cage-mode="${mode}"]`)?.focus({preventScroll:true});cageRouteState({mode});navigation.cacheCurrent();return;}
 const share=event.target.closest('[data-post-share]');
 if(share){event.preventDefault();if(share.disabled)return;share.disabled=true;try{const result=await sharePost({domain:share.dataset.domain,id:share.dataset.postId,title:share.dataset.postTitle});if(result.status==='manual'){const dialog=communityDialog('<h2>게시글 공유</h2><p>아래 링크를 복사해 공유해 주세요.</p><input class="jc-manual-share" aria-label="게시글 공유 링크" readonly><div class="jc-editor-bottom"><button type="button" class="jc-primary" data-jc-close>닫기</button></div>',share),input=dialog.querySelector('input');input.value=result.url;input.focus();input.select();}else if(result.status==='copied'){let state=share.parentElement.querySelector('[data-share-state]');if(!state){state=document.createElement('span');state.dataset.shareState='';state.className='jc-share-state';state.setAttribute('role','status');share.parentElement.append(state);}state.textContent='링크를 복사했습니다.';}}catch{share.title='공유하지 못했습니다. 다시 시도해 주세요.';}finally{share.disabled=false;}return;}
 const close=event.target.closest('[data-jc-close]');if(close){event.preventDefault();close.closest('dialog')?.close();return;}
 const edit=event.target.closest('[data-jc-edit]');if(edit){event.preventDefault();const menu=edit.closest('.jc-menu'),template=menu.querySelector('[data-jc-editor]');menu.open=false;communityDialog(template.innerHTML,edit);return;}
 const del=event.target.closest('[data-jc-delete],[data-jc-comment-delete]');if(del){event.preventDefault();const isComment=del.hasAttribute('data-jc-comment-delete'),dialog=communityDialog(`<form data-stage-form="${isComment?'comment-delete':'post-delete'}" data-confirmed="true"><h2>${isComment?'댓글':'게시글'}을 삭제할까요?</h2><div class="jc-editor-bottom"><button class="jc-subtle" type="button" data-jc-close>취소</button><button class="jc-primary" type="submit">삭제</button></div><span data-form-state role="status"></span></form>`,del),form=dialog.querySelector('form');for(const key of ['domain','postId','commentId','returnRoute'])if(del.dataset[key])form.dataset[key]=del.dataset[key];return;}
 const compose=event.target.closest('[data-jc-compose]');if(compose){event.preventDefault();const fields=compose.closest('form').querySelector('[data-cage-fields]');fields.hidden=false;fields.querySelector('input')?.focus();compose.hidden=true;return;}
 const reply=event.target.closest('[data-jc-reply]');if(reply){event.preventDefault();const slot=reply.closest('.jc-comment').querySelector('[data-jc-reply-body]');slot.hidden=!slot.hidden;if(!slot.hidden)slot.querySelector('input,textarea')?.focus();return;}
 const unpin=event.target.closest('[data-jc-unpin]'),commentLike=event.target.closest('[data-jc-comment-like]');
 if(unpin||commentLike){event.preventDefault();const button=unpin||commentLike;if(button.disabled)return;button.disabled=true;try{const result=unpin?await content.update('community',button.dataset.postId,{pinKind:''}):await content.likeComment(button.dataset.domain,button.dataset.postId,button.dataset.commentId);if(result?.status===401){button.disabled=false;navigation.navigate('/login');return;}if(result?.error){let state=button.closest('.jc49').querySelector('[data-jc-error]');if(!state){state=document.createElement('p');state.dataset.jcError='';state.setAttribute('role','alert');button.closest('.jc49').append(state);}state.textContent=formErrors[result.error]||result.error;return;}await render({preserveScroll:true});}catch{button.title='처리하지 못했습니다. 다시 시도해 주세요.';}finally{button.disabled=false;}return;}
  const bannerEdit=event.target.closest('[data-home-banner-edit]');
  if(bannerEdit){event.preventDefault();const placement=bannerEdit.dataset.homeBannerEdit==='hero'?'hero':'sidebar',dialog=document.createElement('dialog');dialog.className='home-banner-dialog';dialog.innerHTML=`<form data-home-banner-form><h2>${placement==='hero'?'메인 가로 배너':'메인 사이드 배너'} 등록</h2><input type="hidden" name="placement" value="${placement}"><p>PC·모바일·폴드 펼침/태블릿 이미지 모두 필수 · JPG·PNG·WEBP·GIF<br>각각 최대 2MB, 전체 합계 최대 3MB</p><p data-banner-storage-status data-state="checking">배너 저장소 연결 확인 중…</p><label>PC 이미지 · ${placement==='hero'?'832 × 135':'420 × 240'}px<input type="file" name="pc" accept="image/jpeg,image/png,image/webp,image/gif" required></label><label>모바일 이미지 · ${placement==='hero'?'720 × 300':'720 × 540'}px<input type="file" name="mobile" accept="image/jpeg,image/png,image/webp,image/gif" required></label><label>폴드 펼침·태블릿 이미지 · ${placement==='hero'?'1200 × 300':'1200 × 400'}px<input type="file" name="tablet" accept="image/jpeg,image/png,image/webp,image/gif" required></label><label>클릭 이동 URL<input type="url" name="targetUrl" placeholder="https://" required></label><label>대체 텍스트<input name="alt" maxlength="120" placeholder="배너 설명" required></label><span data-form-state role="status"></span><div class="home-banner-actions"><button type="button" class="ghost-btn" data-home-banner-close>취소</button><button type="submit" class="primary-btn">저장</button></div></form>`;document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();const state=dialog.querySelector('[data-banner-storage-status]'),result=await auth.homeBannerStorageStatus?.().catch(()=>null),configured=!!result?.storage?.configured;if(state){state.dataset.state=configured?'ready':'missing';state.textContent=configured?'배너 저장소 연결됨':'배너 저장소 미연결 · Vercel Blob 연결 및 재배포 필요';}return;}
  const bannerClose=event.target.closest('[data-home-banner-close]');if(bannerClose){event.preventDefault();bannerClose.closest('dialog')?.close();return;}
  const referralCopy=event.target.closest('[data-copy-referral]');if(referralCopy){try{await navigator.clipboard.writeText(referralCopy.dataset.copyReferral);referralCopy.textContent='복사됨';}catch{referralCopy.textContent='코드를 선택해 복사해 주세요';}return;}
  const more=event.target.closest('[data-trending-more]');if(more){if(more.disabled)return;more.disabled=true;const container=more.closest('.module'),state=container.querySelector('[data-trending-status]');try{const result=await politicians.trending(Number(more.dataset.offset),more.dataset.snapshot);if(!more.isConnected)return;if(!result.ok){state.textContent=result.error==='RANKING_UPDATED'?'순위가 갱신되었습니다. 새로고침해 주세요.':'불러오지 못했습니다. 다시 시도해 주세요.';more.disabled=false;return;}container.querySelector('[data-trending-grid]').insertAdjacentHTML('beforeend',result.items.map(renderNowRankCard).join(''));more.dataset.offset=result.nextOffset;state.textContent=`${result.nextOffset} / ${result.total}명`;if(result.nextOffset>=result.total)more.remove();else more.disabled=false;}catch{if(more.isConnected){state.textContent='불러오지 못했습니다. 다시 시도해 주세요.';more.disabled=false;}}return;}
  const review=event.target.closest('[data-load-admin-review]');if(review){review.disabled=true;review.textContent='미리보기를 불러오는 중입니다.';try{const result=await auth.intelligencePreview();if(review.isConnected)review.closest('[data-admin-review-mount]').innerHTML=views.renderAdminReview(result);}catch{if(review.isConnected){review.disabled=false;review.textContent='다시 불러오기';}}return;}
  const adminTab=event.target.closest('[data-admin-tab]');
  if(adminTab){event.preventDefault();navigation.navigate(adminRouteWith(route(),{tab:adminTab.dataset.adminTab}));return;}
  const politicianSummary=event.target.closest('.admin-politician-row>summary');
  if(politicianSummary){event.preventDefault();const details=politicianSummary.closest('[data-admin-politician]'),person=details?.open?'':details?.dataset.adminPolitician||'';navigation.navigate(adminRouteWith(route(),{tab:'politicians',person}));return;}
  const personAction=event.target.closest('[data-person-refresh],[data-person-publish]');
  if(personAction){event.preventDefault();const personId=personAction.dataset.personRefresh||personAction.dataset.personPublish,operation=personAction.hasAttribute('data-person-refresh')?'refresh':'publish',state=personAction.closest('.admin-person-refresh')?.querySelector('[data-person-action-state]');if(operation==='publish'&&!confirm('자동 검증을 통과한 이 정치인 수집본을 공개할까요?'))return;personAction.disabled=true;if(state)state.textContent='처리 중입니다…';const result=operation==='refresh'?await auth.refreshPolitician(personId):await auth.publishPoliticianRefresh(personId);if(state)state.textContent=result?.ok?({refresh:'수집과 자동 검증을 완료했습니다. 이 화면에서 바로 게시할 수 있습니다.',publish:'자동 검증 통과본을 공개했습니다.'}[operation]):(formErrors[result?.error]||result?.error||'처리하지 못했습니다.');personAction.disabled=false;return;}
  const youtubeDelete=event.target.closest('[data-youtube-delete]');
  if(youtubeDelete){event.preventDefault();if(!confirm('이 정치인의 유튜브 공식 채널 연결을 삭제할까요?'))return;youtubeDelete.disabled=true;const result=await auth.youtubeChannelDelete(youtubeDelete.dataset.youtubeDelete);if(!result?.ok)alert(result?.error||'공식 채널 연결을 삭제하지 못했습니다.');await render({preserveScroll:true});return;}
  const retryFailures=event.target.closest('[data-intelligence-retry-failures]');
  if(retryFailures){event.preventDefault();retryFailures.disabled=true;const result=await auth.intelligenceRetryFailures();if(!result?.ok){alert(result?.error||'실패 항목 재시도를 시작하지 못했습니다.');retryFailures.disabled=false;return;}void runAdminIntelligence('collect',true);return;}
  const copyErrors=event.target.closest('[data-intelligence-copy-errors]');
  if(copyErrors){event.preventDefault();const report=copyErrors.closest('[data-intelligence-error-report]'),text=[...report.querySelectorAll('[data-error-row]')].map(row=>row.innerText.trim()).join('\n\n');await navigator.clipboard?.writeText(text);copyErrors.textContent='복사 완료';return;}
  const memberRoleSave=event.target.closest('[data-member-role-save]');
  if(memberRoleSave){event.preventDefault();const id=memberRoleSave.dataset.memberRoleSave,manager=document.querySelector(`[data-member-badge-manager="${CSS.escape(id)}"]`),role=manager?.querySelector(`[data-member-role="${CSS.escape(id)}"]`)?.value,state=manager?.querySelector(`[data-member-role-state="${CSS.escape(id)}"]`);memberRoleSave.disabled=true;const result=await auth.updateMemberRole(id,role);if(state)state.textContent=result?.ok?'회원 권한을 저장했습니다.':(result?.error||'권한을 저장하지 못했습니다.');memberRoleSave.disabled=false;if(result?.ok)await render();return;}
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
  const generationVote=event.target.closest('[data-generation-vote-confirm]');
  if(generationVote){event.preventDefault();const message=generationVoteConfirmation(generationVote.dataset.candidateName||'선택한',generationVote.dataset.generationAge||'본인 연령');if(!window.confirm(message))return;const result=await content.vote(generationVote.dataset.generationVoteConfirm,generationVote.dataset.option);if(result?.status===401){navigation.navigate('/login');return;}if(!result?.ok){alert(result?.error==='ALREADY_VOTED'?'이미 이 모의투표에 참여했습니다. 한 번 투표한 선택은 되돌릴 수 없습니다.':result?.error==='AGE_GROUP_MISMATCH'?'가입 정보의 연령대에서만 투표할 수 있습니다.':(result?.error||'투표하지 못했습니다.'));return;}await render({preserveScroll:true});return;}
  const vote=event.target.closest('[data-stage-vote]');
  if(vote){event.preventDefault();const result=await content.vote(vote.dataset.stageVote,vote.dataset.option);if(result?.status===401){navigation.navigate('/login');return;}if(!result?.ok){alert(result?.error||'투표하지 못했습니다.');return;}await render({preserveScroll:true});return;}
  const like=event.target.closest('[data-post-like]');
  if(like){event.preventDefault();if(like.disabled)return;like.disabled=true;try{const result=await content.like(like.dataset.domain,like.dataset.postId);if(result?.status===401){like.disabled=false;navigation.navigate('/login');return;}if(!result?.ok){alert(formErrors[result?.error]||result?.error||'처리하지 못했습니다.');return;}await render({preserveScroll:true});}catch{alert('좋아요를 처리하지 못했습니다. 다시 시도해 주세요.');}finally{like.disabled=false;}return;}
  const favorite=event.target.closest('[data-stage-action="favorite-toggle"]');
  if(favorite){event.preventDefault();const result=await content.toggleFavorite({kind:favorite.dataset.favoriteKind,domain:favorite.dataset.favoriteDomain||'',id:favorite.dataset.favoriteId});if(result?.status===401){navigation.navigate('/login');return;}if(!result?.ok){alert(result?.error||'즐겨찾기를 변경하지 못했습니다.');return;}await render({preserveScroll:true});return;}
  const action=event.target.closest('[data-stage-action]')?.dataset.stageAction;
  if(action==='logout'){await auth.logout();navigation.navigate('/');return;}
  if(action==='academy-apply'){const result=await content.academyApply(event.target.closest('[data-slot-id]')?.dataset.slotId||'');if(result?.status===401){navigation.navigate('/login');return;}alert(result?.ok?'수강 신청을 접수했습니다.':(result?.error||'신청하지 못했습니다.'));}
});

await render();

document.addEventListener('change',event=>{const select=event.target;if(!select.matches('[data-point-form="order"] select[name=amount]'))return;const root=select.closest('.point-shop'),chosen=[...root.querySelectorAll('[data-point-package]')].find(b=>b.dataset.pointPackage===select.value);if(chosen)chosen.click();});

async function refreshCachedMemberSummary(){
 const seq=renderSequence,r=route(),session=await auth.session();if(!session.authenticated)return;
 const [summary,wallet]=await Promise.all([content.memberSummary().catch(()=>({ok:false,error:'LOAD_FAILED'})),content.myWallet().catch(()=>({ok:false,error:'LOAD_FAILED'}))]);
 if(seq!==renderSequence||route()!==r)return;
 for(const mount of document.querySelectorAll('[data-member-summary-mount]'))mount.innerHTML=renderMemberSummary(summary,wallet);
}

async function loadMemberPoints(panel){if(!panel)return;const id=panel.dataset.memberPointsPanel;const result=await content.memberPoints(id).catch(()=>({ok:false}));if(panel.isConnected)panel.innerHTML=views.renderAdminMemberPoints(result,id);}
function askPointCharge(trigger){return new Promise(resolve=>{const dialog=communityDialog('<h2>포인트가 부족합니다</h2><p>보유 포인트가 부족해 케이지를 열 수 없습니다. 포인트 충전 페이지로 이동할까요?</p><div class="jc-editor-bottom"><button type="button" data-charge-no class="jc-subtle">아니오</button><button type="button" data-charge-yes class="jc-primary">예 · 충전하기</button></div>',trigger);dialog.querySelector('[data-charge-no]').onclick=()=>dialog.close('no');dialog.querySelector('[data-charge-yes]').onclick=()=>dialog.close('yes');dialog.addEventListener('close',()=>resolve(dialog.returnValue==='yes'),{once:true});});}
function paintCageWriter(form){const cage=form.elements.writeMode?.value==='cage',settings=form.querySelector('[data-cage-write-settings]'),pin=form.querySelector('[data-normal-post-pin]');if(settings)settings.hidden=!cage;if(pin){pin.hidden=cage;pin.querySelectorAll('input').forEach(x=>x.disabled=cage);}const button=form.querySelector('button[type=submit]');if(button)button.textContent=cage?'포인트 사용 · 케이지 열기':'게시글 등록';}
function restoreCageDraft(){for(const writer of document.querySelectorAll('[data-cage-writer]')){const form=writer.closest('form');try{const saved=JSON.parse(sessionStorage.getItem('jcs-cage-draft:'+writer.dataset.userId)||'null');if(saved){for(const name of ['title','body','fee','requestId'])if(saved[name])form.elements[name].value=saved[name];form.elements.writeMode.value='cage';}}catch{}paintCageWriter(form);}}
document.addEventListener('change',event=>{const field=event.target,form=field.closest('form');if(field.name==='writeMode'&&form?.querySelector('[data-cage-writer]'))paintCageWriter(form);if(field.matches('[data-admin-charge-amount]')){const amount=Number(field.value),first=form.dataset.firstCharge==='true',bonus=first?20:amount>=1000000?20:amount>=500000?15:amount>=100000?10:0;form.querySelector('[data-admin-charge-preview]').textContent='지급 예정 '+(amount*(100+bonus)/100).toLocaleString('ko-KR')+' P · 보너스 '+bonus+'%';}});
document.addEventListener('click',event=>{const retry=event.target.closest('[data-member-points-retry]');if(retry)void loadMemberPoints(retry.closest('[data-member-points-panel]'));if(event.target.closest('[data-member-summary-retry]'))void refreshCachedMemberSummary();});

document.addEventListener('click',event=>{if(event.target.closest('[data-mypage-retry]'))void render({preserveScroll:true});});

// Upload only selected poll images; preserve existing URLs across text edits and retries.
async function pollOptionImages(form,count){
 const urls=[];
 for(let i=0;i<count;i++){
  const hidden=form.elements.namedItem(`optionImageUrl-${i}`),fileInput=form.elements.namedItem(`optionImageFile-${i}`),remove=form.elements.namedItem(`optionImageRemove-${i}`);
  let url=remove?.checked?'':String(hidden?.value||'');const file=fileInput?.files?.[0];
  if(file){if(file.size>1048576)throw new Error(`선택지 ${i+1} 이미지는 1MB 이하로 등록해 주세요.`);if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('JPG, PNG, WEBP 이미지를 등록해 주세요.');const result=await content.uploadImage('polls',file,form.dataset.postId||'');if(!result.ok)throw new Error(result.error||'이미지 업로드에 실패했습니다.');url=result.url;if(hidden)hidden.value=url;fileInput.value='';if(remove)remove.checked=false;}
  urls.push(url);
 }
 return urls;
}
