import { HOME_FIXTURE } from './fixtures/home.js?v=0.0.31.47';
import { siteHeader, drawer, footer, renderInitialLoading } from './layout/site-shell.js?v=0.0.31.47';
import { renderTrendingPage, renderKeywordsPage, renderNowRankCard, renderHomeLayout, renderBadgeShowcase } from './layout/home-layout.js?v=0.0.31.47';
import { setupLayoutInteractions } from './ui/interactions.js?v=0.0.31.47';
import { createAuthService, photoUploadMessage } from './core/auth.js?v=0.0.31.47';
import { createContentService } from './core/content.js?v=0.0.31.47';
import { createPoliticianService } from './core/politicians.js?v=0.0.31.47';
import { createNavigation, adminRouteState, adminRouteWith } from './core/navigation.js?v=0.0.31.47';
import { createIntelligenceAutoResumeGuard, runIntelligenceAction } from './core/intelligence-runner.js?v=0.0.31.47';
import { buildRoleNarratives } from './ui/intelligence-narratives.js?v=0.0.31.47';
import * as views from './views/stage1.js?v=0.0.31.47';
import { renderPoliticianDirectory, renderPoliticianDetail } from './views/politicians.js?v=0.0.31.47';
import { renderPoliticianCompare } from './views/politician-compare.js?v=0.0.31.47';
import { generationVoteConfirmation, renderPollBoard, renderGenerationPresident, renderNationalEvaluationPage } from './views/participation-pages.js?v=0.0.31.47';
import { renderPresidentPage } from './views/president.js?v=0.0.31.47';
import { renderSearchPage } from './views/search-page.js?v=0.0.31.47';
import { loadRecentPoliticians, recordRecentPolitician } from './ui/recent-politicians.js?v=0.0.31.47';
import { regionDistrictOptions, regionSubdistrictOptions } from './data/korean-regions.js?v=0.0.31.47';

const formErrors={INVALID_REFERRER:'추천인코드를 확인해 주세요. 사용 가능한 회원의 코드를 입력해야 합니다.',INVALID_REFERRER_CODE:'추천인코드는 숫자로 입력해 주세요.',INVALID_REGION:'시·군·구와 해당 구를 올바르게 선택해 주세요.',REGISTRATION_BUSY:'가입 요청이 많습니다. 잠시 후 다시 시도해 주세요.',MEMBERS_CHANGED_RETRY:'회원 정보가 갱신됐습니다. 새로고침 후 다시 저장해 주세요.'};
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

let shellInfoCache=null;
async function shell(body,session,renderId){
  if(!shellInfoCache||shellInfoCache.until<Date.now())shellInfoCache={until:Date.now()+30000,promise:Promise.all([auth.memberCount().catch(()=>0),content.footerInfo().catch(()=>({}))])};
  const [memberCount,footerInfo]=await shellInfoCache.promise;
  if(renderId!==renderSequence)return false;
  app.innerHTML=`<div class="site-shell">${siteHeader(memberCount,session)}<div class="page-wrap">${body}</div>${footer(footerInfo)}${drawer(session)}</div>`;
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
  for(const row of document.querySelectorAll('[data-member-badge-row]'))row.addEventListener('toggle',()=>{if(!row.open)return;const mount=row.querySelector('[data-member-badge-mount]');if(!mount||mount.dataset.loaded)return;try{mount.innerHTML=views.renderMemberBadgeManager(JSON.parse(row.dataset.memberBadgePayload||'{}'));mount.dataset.loaded='true';}catch{mount.innerHTML='<p class="module-desc">배지 목록을 불러오지 못했습니다.</p>';}});
}

async function render({preserveScroll=false}={}){
  const renderId=++renderSequence,r=route(),p=parts(r);
  if(p[0]==='admin'){const target=document.querySelector('.page-wrap');if(target)target.innerHTML=views.renderAdminLoading(adminRouteState(r).tab);}
  const session=await auth.session();
  const badgeStatusPromise=session.authenticated&&p[0]!=='admin'
    ? auth.recordBadgeVisit().then(result=>result?.status||auth.badgeStatus()).catch(()=>null)
    : Promise.resolve(null);
  const badgeStatus=p[0]==='mypage'?await badgeStatusPromise:null;
  const dashboard=session.authenticated&&['mypage','person','column','community','news','itsme'].includes(p[0])?await content.memberDashboard().catch(()=>({favoriteKeys:[],authoredPosts:[],favoritePosts:[],favoritePeople:[]})):{favoriteKeys:[],authoredPosts:[],favoritePosts:[],favoritePeople:[]};
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
    const generationIds=(Array.isArray(generation?.candidates)?generation.candidates:[]).slice(0,15),evaluationIds=Object.values(nationalEvaluation?.slots||{}).map(slot=>slot?.subjectId).filter(Boolean),resolvedPeople=await Promise.all([...new Set([...generationIds,...evaluationIds])].map(id=>politicians.get(id).catch(()=>({ok:false}))));
    const peopleById=Object.fromEntries(resolvedPeople.filter(result=>result?.ok&&result.item).map(result=>[result.item.id,result.item])),generationView={...generation,candidateLabels:Object.fromEntries(generationIds.map(id=>[id,peopleById[id]?.name||id]))},nationalEvaluationView={...nationalEvaluation,slots:Object.fromEntries(Object.entries(nationalEvaluation?.slots||{}).map(([key,slot])=>[key,{...slot,subjectName:peopleById[slot?.subjectId]?.name||slot?.subjectName,party:peopleById[slot?.subjectId]?.party||slot?.party,jurisdiction:peopleById[slot?.subjectId]?.jurisdiction||slot?.jurisdiction,photo:peopleById[slot?.subjectId]?.photo||slot?.photo}]))};
    const home={...HOME_FIXTURE,trending:trendingResult.items||[],keywords:keywordResult.items||[],memberCount,columns,community,itsmePosts,newsPosts,polls,generation:generationView,nationalEvaluation:nationalEvaluationView,academy,rank,homeBanner,recentPoliticians:loadRecentPoliticians(),session,badgeStatus};
    body=`<div class="product-home-wrap">${renderHomeLayout(home)}</div>`;
  } else if(p[0]==='about') body=views.renderAbout();
  else if(p[0]==='support') body=views.renderSupport();
  else if(['privacy','policy'].includes(p[0])) body=views.renderLegal(p[0]);
  else if(p[0]==='column') body=p[1]==='write'?views.renderBoardWrite('columns'):p[1]?await views.renderBoardDetail('columns',p[1],content,session,dashboard):await views.renderBoard('columns',content,session);
  else if(p[0]==='community') body=p[1]==='write'?views.renderBoardWrite('community'):p[1]?await views.renderBoardDetail('community',p[1],content,session,dashboard):await views.renderBoard('community',content,session);
  else if(p[0]==='news') body=p[1]==='write'?views.renderBoardWrite('news'):p[1]?await views.renderBoardDetail('news',p[1],content,session,dashboard):await views.renderBoard('news',content,session);
  else if(p[0]==='itsme') body=p[1]==='write'?views.renderItsmeWrite():p[1]?await views.renderItsmeDetail(p[1],content,session,dashboard):await views.renderItsme(content,r);
  else if(p[0]==='poll') body=await renderPollBoard({content,session,route:r});
  else if(p[0]==='generation-president') body=await renderGenerationPresident({content,politicians,session,route:r});
  else if(p[0]==='national-evaluation') body=await renderNationalEvaluationPage({content,politicians,session,route:r});
  else if(p[0]==='president') body=renderPresidentPage();
  else if(p[0]==='search') body=await renderSearchPage({query:new URLSearchParams(r.split('?')[1]||'').get('q')||'',politicians,content});
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
  else if(p[0]==='mypage'&&p[1]==='posts') body=views.renderMyPage(session,badgeStatus||{},dashboard,{section:'authored',search:r.includes('?')?`?${r.split('?')[1]}`:''});
  else if(p[0]==='mypage'&&p[1]==='favorites'&&p[2]==='posts') body=views.renderMyPage(session,badgeStatus||{},dashboard,{section:'favorite-posts',search:r.includes('?')?`?${r.split('?')[1]}`:''});
  else if(p[0]==='mypage'&&p[1]==='favorites'&&p[2]==='politicians') body=views.renderMyPage(session,badgeStatus||{},dashboard,{section:'favorite-people'});
  else if(p[0]==='mypage') body=views.renderMyPage(session,badgeStatus||{},dashboard);
  else if(p[0]==='admin') body=await views.renderAdminStable(session,auth,adminRouteState(r));
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
  if(p[0]==='person'){recordRecentPolitician(document);tunePoliticianNarratives();if(session.user?.role==='admin')void updatePoliticianPhotoStorageStatus();}
  if(!preserveScroll)window.scrollTo(0,0);
  navigation?.cacheCurrent();
  if(p[0]==='admin')queueMicrotask(resumeAdminIntelligence);
}

navigation=createNavigation({window,readSnapshot:()=>app.innerHTML,restoreSnapshot:markup=>{app.innerHTML=markup;},rebind:()=>{setupLayoutInteractions(document,{politicianSearch:(query,limit)=>politicians.search(query,limit)});setupMemberBadgeManagers();if(pipelineActive())queueMicrotask(resumeAdminIntelligence);},onRoute:(_route,options)=>void render(options)});
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
  if(bannerForm){event.preventDefault();const data=new FormData(bannerForm),file=data.get('image'),state=bannerForm.querySelector('[data-form-state]');if(!(file instanceof File)||file.size>2097152||!['image/jpeg','image/png','image/webp'].includes(file.type)){if(state)state.textContent='JPG·PNG·WEBP 파일을 2MB 이하로 선택해 주세요.';return;}const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let start=0;start<bytes.length;start+=32768)binary+=String.fromCharCode(...bytes.subarray(start,start+32768));const result=await content.saveHomeBanner({contentType:file.type,dataBase64:btoa(binary),targetUrl:String(data.get('targetUrl')||''),alt:String(data.get('alt')||'정참시 배너')});const messages={BANNER_STORAGE_NOT_CONFIGURED:'배너 저장소가 연결되지 않았습니다. Vercel Blob을 연결하고 재배포한 뒤 다시 시도해 주세요.',BANNER_TOO_LARGE:'배너 이미지는 2MB 이하만 업로드할 수 있습니다.',BANNER_TYPE_INVALID:'JPG·PNG·WEBP 이미지만 업로드할 수 있습니다.',BANNER_SIGNATURE_INVALID:'손상되었거나 지원하지 않는 이미지 파일입니다.',BANNER_TARGET_URL_INVALID:'클릭 이동 주소는 https://로 시작해야 합니다.'};if(state)state.textContent=result?.ok?'메인 배너를 저장했습니다.':(messages[result?.error]||'배너를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');if(result?.ok){bannerForm.closest('dialog')?.close();await render({preserveScroll:true});}return;}
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
  const participationEdit=event.target.closest('[data-participation-edit]');
  if(participationEdit){event.preventDefault();const operation=event.submitter?.value||'edit';if(operation==='delete'&&!window.confirm('이 게시물을 삭제하시겠습니까?'))return;const fd=new FormData(participationEdit),input=Object.fromEntries(fd);input.optionLabels=fd.getAll('optionLabels');const result=await content.editParticipation(participationEdit.dataset.participationEdit,participationEdit.dataset.postId,input,operation);if(result.ok)await render({preserveScroll:true});else participationEdit.querySelector('[data-form-state]').textContent=result.error||'저장하지 못했습니다.';return;}
  const participationAdmin=event.target.closest('[data-participation-admin-form]');
  if(participationAdmin){event.preventDefault();const formData=new FormData(participationAdmin),data=Object.fromEntries(formData);data.applyToMain=data.applyToMain==='true';if(participationAdmin.dataset.participationAdminForm==='generation')data.candidateIds=formData.getAll('candidateIds').map(String).filter(Boolean);const result=await content.createParticipation(participationAdmin.dataset.participationAdminForm,data),state=participationAdmin.querySelector('[data-form-state]');if(state)state.textContent=result?.ok?'저장하고 적용했습니다.':(result?.error||'저장하지 못했습니다.');if(result?.ok)await render();return;}
  const generationSearch=event.target.closest('[data-generation-search]');
  if(generationSearch){event.preventDefault();const data=new FormData(generationSearch),age=String(data.get('age')||'20대'),query=String(data.get('q')||'').trim();navigation.navigate(`/generation-president?age=${encodeURIComponent(age)}${query?`&q=${encodeURIComponent(query)}`:''}`);return;}
  const form=event.target.closest('[data-stage-form]'); if(!form)return;
  event.preventDefault(); const data=Object.fromEntries(new FormData(form)); const type=form.dataset.stageForm; let result=null;
  if(['board','post-edit'].includes(type)&&data.coverFile?.size){
    const state=form.querySelector('[data-form-state]');if(data.coverFile.size>1048576){if(state)state.textContent='사진은 최대 1MB까지 등록할 수 있습니다.';return;}
    const upload=await content.uploadImage(form.dataset.domain,data.coverFile,form.dataset.postId||'');if(!upload.ok){if(state)state.textContent=upload.error||'사진 업로드 실패';return;}data.coverImage=upload.url;
  }
  delete data.coverFile;
  if(type==='post-edit'){const item=await content.update(form.dataset.domain,form.dataset.postId,data);result=item?.error?{ok:false,error:item.error}:{ok:true};if(result.ok)await render({preserveScroll:true});}
  if(type==='post-delete'){if(!window.confirm('이 게시물을 삭제하시겠습니까?'))return;result=await content.remove(form.dataset.domain,form.dataset.postId);if(result.ok)result.route=`/${form.dataset.domain==='columns'?'column':form.dataset.domain}`;}
  if(type==='login') result=await auth.login(data);
  if(type==='join'){result=await auth.register(data);shellInfoCache=null;}
  if(type==='profile-address'){data.regionDistrict=data.regionDistrict||'';result=await auth.updateProfile(data);}
  if(type==='board'){const item=await content.create(form.dataset.domain,data),routeName=form.dataset.domain==='columns'?'column':form.dataset.domain==='news'?'news':'community';result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/${routeName}/${item.id}`};}
  if(type==='itsme'){const item=await content.create('itsme',data);result=item?.error?{ok:false,error:item.error}:{ok:true,route:`/itsme/${item.id}`};}
  if(type==='inquiry'){result=await content.createInquiry(data);if(result?.ok)result.route=`/inquiry/${result.item.id}`;}
  if(type==='inquiry-reply'){result=await content.replyInquiry(form.dataset.inquiryId,data.body);if(result?.ok)await render({preserveScroll:true});}
  if(type==='comment'){result=await content.comment(form.dataset.domain,form.dataset.postId,data.text);if(result.ok)await render();}
  if(type==='poll-vote'){result=await content.vote(form.dataset.voteScope,String(data.option||''));}
  if(type==='politician-request')result=await content.createPoliticianRequest(data);
  if(type==='politician-request-status')result=await content.updatePoliticianRequest(form.dataset.requestId,data.status);
  if(type==='partner')result=await content.createPartnerApplication(data);
  if(type==='migration'){result=await auth.migrationRun(String(data.secret||''));}
  if(type==='politician-migration'){result=await auth.politicianMigrationRun(String(data.secret||''));}
  const state=form.querySelector('[data-form-state]'); if(state)state.textContent=result?.ok?(result.message||'처리되었습니다.'):(formErrors[result?.error]||result?.error||'처리하지 못했습니다.');
  if(result?.status===401&&type!=='migration'){navigation.navigate('/login');return;}
  if(result?.ok&&['login','join'].includes(type)){navigation.navigate('/mypage');return;}
  if(result?.route){navigation.navigate(result.route);return;}
  if(result?.ok&&['migration','politician-migration'].includes(type)){await render();return;}
  if(result?.ok&&['poll-vote','politician-request','politician-request-status','partner'].includes(type)){await render({preserveScroll:true});return;}
  if(result?.ok&&!['comment','inquiry-reply'].includes(type))form.reset();
});

document.addEventListener('click',async event=>{
  const bannerEdit=event.target.closest('[data-home-banner-edit]');
  if(bannerEdit){event.preventDefault();const dialog=document.createElement('dialog');dialog.className='home-banner-dialog';dialog.innerHTML='<form data-home-banner-form><h2>메인 배너 등록</h2><p>권장 크기 640 × 450px · JPG·PNG·WEBP · 최대 2MB</p><p data-banner-storage-status data-state="checking">배너 저장소 연결 확인 중…</p><label>배너 이미지<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></label><label>클릭 이동 URL<input type="url" name="targetUrl" placeholder="https://" required></label><label>대체 텍스트<input name="alt" maxlength="120" placeholder="배너 설명" required></label><span data-form-state></span><div class="home-banner-actions"><button type="button" class="ghost-btn" data-home-banner-close>취소</button><button type="submit" class="primary-btn">저장</button></div></form>';document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();const state=dialog.querySelector('[data-banner-storage-status]'),result=await auth.homeBannerStorageStatus?.().catch(()=>null),configured=!!result?.storage?.configured;if(state){state.dataset.state=configured?'ready':'missing';state.textContent=configured?'배너 저장소 연결됨 · 최대 2MB':'배너 저장소 미연결 · Vercel Blob 연결 및 재배포 필요';}return;}
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
  if(like){event.preventDefault();const result=await content.like(like.dataset.domain,like.dataset.postId);if(result?.status===401){navigation.navigate('/login');return;}if(!result?.ok){alert(formErrors[result?.error]||result?.error||'처리하지 못했습니다.');return;}await render({preserveScroll:true});return;}
  const favorite=event.target.closest('[data-stage-action="favorite-toggle"]');
  if(favorite){event.preventDefault();const result=await content.toggleFavorite({kind:favorite.dataset.favoriteKind,domain:favorite.dataset.favoriteDomain||'',id:favorite.dataset.favoriteId});if(result?.status===401){navigation.navigate('/login');return;}if(!result?.ok){alert(result?.error||'즐겨찾기를 변경하지 못했습니다.');return;}await render({preserveScroll:true});return;}
  const action=event.target.closest('[data-stage-action]')?.dataset.stageAction;
  if(action==='logout'){await auth.logout();navigation.navigate('/');return;}
  if(action==='academy-apply'){const result=await content.academyApply(event.target.closest('[data-slot-id]')?.dataset.slotId||'');if(result?.status===401){navigation.navigate('/login');return;}alert(result?.ok?'수강 신청을 접수했습니다.':(result?.error||'신청하지 못했습니다.'));}
});

await render();
