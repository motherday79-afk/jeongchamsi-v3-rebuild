import {renderRefreshSummary,renderMemberRefreshQuote} from '../views/person-refresh.js?v=0.0.31.175';
const errors={PERSON_REFRESH_MEMBER_OWNED:'회원의 유료 갱신이 처리 중입니다. 완료 후 확인해 주세요.',COLLECTION_PROFILE_INVALID:'검색어는 이름과 구분어를 함께 적고, 뉴스 지역 조건도 입력해 주세요.',REFRESH_POLICY_INVALID:'이용료와 재갱신 간격을 확인해 주세요.',PERSON_SOURCE_INCOMPLETE:'검색 또는 뉴스 수집이 완료되지 않았습니다. 기존 공개 자료와 포인트는 유지됩니다.',PERSON_REFRESH_BUSY:'이미 갱신 중입니다. 잠시 후 처리 상태를 확인해 주세요.',PUBLICATION_BUSY:'전체 게시가 진행 중입니다. 완료 후 다시 시도해 주세요.',PUBLIC_SNAPSHOT_REQUIRED:'먼저 최초 전체 게시를 완료해 주세요.',PERSON_REFRESH_NOT_READY:'이 인물을 먼저 수집해 주세요.',PERSON_REFRESH_CHANGED:'수집본이 변경되었습니다. 최근 결과를 확인한 뒤 게시해 주세요.',PERSON_PROFILE_CHANGED:'수집 조건이 바뀌었습니다. 새 조건으로 다시 수집해 주세요.',PERSON_REFRESH_BASE_CHANGED:'전체 게시본이 바뀌었습니다. 이 인물을 다시 수집해 주세요.',INSUFFICIENT_POINTS:'포인트가 부족합니다. 충전 후 다시 이용해 주세요.',REFRESH_DISABLED:'현재 회원용 개별 갱신은 운영하지 않습니다.',REFRESH_RECENT:'최근 갱신한 인물입니다. 설정된 간격이 지난 뒤 다시 이용해 주세요.',REFRESH_PRICE_CHANGED:'이용료가 변경되었습니다. 페이지를 새로 불러와 확인해 주세요.',REFRESH_REQUEST_EXPIRED:'처리 시간이 초과되었습니다. 포인트 차감 없이 종료되었습니다.',NAVER_CREDENTIALS_MISSING:'네이버 검색광고 연결 설정을 확인해 주세요.',LOGIN_REQUIRED:'로그인 후 이용해 주세요.'};
const message=result=>errors[result?.error]||result?.error||'처리하지 못했습니다.';
const pendingKey=panel=>'jcs-refresh:'+panel.dataset.refreshUser+':'+panel.dataset.memberRefresh;
const readPending=panel=>{try{return JSON.parse(sessionStorage.getItem(pendingKey(panel))||'null');}catch{return null;}};
const savePending=(panel,value)=>{try{if(value)sessionStorage.setItem(pendingKey(panel),JSON.stringify(value));else sessionStorage.removeItem(pendingKey(panel));}catch{}};
export async function loadMemberRefresh(root,auth){
 for(const panel of root.querySelectorAll('[data-member-refresh]')){
  const pending=readPending(panel);
  try{const quote=await auth.personRefreshQuote(panel.dataset.memberRefresh);if(!panel.isConnected)continue;
   if(!quote.ok||!quote.enabled){if(!pending)continue;}
   panel.hidden=false;panel.dataset.fee=String(quote.fee||0);panel.innerHTML=renderMemberRefreshQuote(quote,panel.dataset.personName);
   if(pending){panel.querySelector('[data-member-refresh-check]').hidden=false;panel.querySelector('[data-member-refresh-start]').disabled=true;panel.querySelector('[data-refresh-state]').textContent='이전 갱신 요청의 처리 상태를 확인해 주세요.';}
  }catch{if(pending&&panel.isConnected){panel.hidden=false;panel.dataset.fee=String(pending.quotedFee);panel.innerHTML=renderMemberRefreshQuote({fee:pending.quotedFee},panel.dataset.personName);panel.querySelector('[data-member-refresh-start]').disabled=true;panel.querySelector('[data-member-refresh-check]').hidden=false;panel.querySelector('[data-refresh-state]').textContent='이전 요청의 처리 상태를 확인해 주세요.';}}
 }
}
export function bindPersonRefresh(root,{auth,onPublished=()=>{}}){
 root.addEventListener('input',event=>{const form=event.target.closest('[data-collection-profile-form]');if(form)form.dataset.dirty='true';});
 root.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-collection-profile-form],[data-refresh-policy-form]');if(!form)return;event.preventDefault();
  const button=form.querySelector('button[type="submit"]'),state=form.querySelector('[data-refresh-state]');if(button.disabled)return;button.disabled=true;const fields=[...form.querySelectorAll('input,select,textarea')];fields.forEach(x=>x.disabled=true);state.textContent='저장 중입니다…';
  try{const lines=name=>form.elements[name].value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   const result=form.hasAttribute('data-refresh-policy-form')?await auth.saveRefreshPolicy({enabled:form.elements.enabled.checked,fee:Number(form.elements.fee.value),cooldownMinutes:Number(form.elements.cooldownMinutes.value)}):await auth.saveCollectionProfile({personId:form.dataset.collectionProfileForm,collectionProfile:{mode:form.elements.mode.value,searchKeywords:lines('searchKeywords'),newsRegions:lines('newsRegions')}});
   state.textContent=result.ok?'저장했습니다.':message(result);if(result.ok)delete form.dataset.dirty;
  }catch{state.textContent='저장 결과를 확인하지 못했습니다. 다시 확인해 주세요.';}finally{button.disabled=false;fields.forEach(x=>x.disabled=false);}
 });
 root.addEventListener('click',async event=>{
  const adminButton=event.target.closest('[data-person-refresh],[data-person-publish],[data-person-refresh-status]');
  if(adminButton){event.preventDefault();const panel=adminButton.closest('.admin-person-refresh');if(panel.dataset.busy)return;
   const form=panel.closest('.admin-politician-editor')?.querySelector('[data-collection-profile-form]'),state=panel.querySelector('[data-person-action-state]');
   if(form?.dataset.dirty){state.textContent='수정한 검색어를 먼저 저장해 주세요.';return;}
   const id=adminButton.dataset.personRefresh||adminButton.dataset.personPublish||adminButton.dataset.personRefreshStatus,operation=adminButton.hasAttribute('data-person-refresh')?'refresh':adminButton.hasAttribute('data-person-publish')?'publish':'status';
   if(operation==='publish'&&!panel.dataset.refreshId){state.textContent='최근 수집 결과를 확인한 뒤 게시해 주세요.';return;}
   if(operation==='publish'&&!confirm('이 인물의 수집 결과를 게시하고 NOW 순위를 갱신할까요?'))return;
   panel.dataset.busy='true';panel.querySelectorAll('button').forEach(x=>x.disabled=true);state.textContent=operation==='refresh'?'이 인물의 자료를 수집하고 있습니다…':'처리 중입니다…';
   try{const result=operation==='refresh'?await auth.refreshPolitician(id):operation==='publish'?await auth.publishPoliticianRefresh(id,panel.dataset.refreshId):await auth.personRefreshStatus(id);
    if(result.ok){if(result.refresh?.refreshId)panel.dataset.refreshId=result.refresh.refreshId;state.textContent=operation==='refresh'?'수집을 완료했습니다. 결과를 확인한 뒤 게시해 주세요.':operation==='publish'?'상세 정보와 NOW 순위를 갱신했습니다.':({DRAFT:'게시 대기 중인 수집본입니다.',PUBLISHED:'이미 게시된 수집본입니다.',COLLECTING:'수집 중입니다.',FAILED:'직전 수집에 실패했습니다.'}[result.refresh?.status]||'아직 개별 수집 기록이 없습니다.');
     if(result.summary)panel.querySelector('[data-person-refresh-result]').innerHTML=renderRefreshSummary(result);
     if(operation==='publish'){const summary=await auth.personRefreshStatus(id);panel.querySelector('[data-person-refresh-result]').innerHTML=renderRefreshSummary({...summary,rank:result.rank,previousRank:result.previousRank});}
    }else state.textContent=message(result);
   }catch{state.textContent='응답을 확인하지 못했습니다. 최근 수집 결과 확인 버튼으로 처리 상태를 확인해 주세요.';}finally{delete panel.dataset.busy;panel.querySelectorAll('button').forEach(x=>x.disabled=false);}return;
  }
  const button=event.target.closest('[data-member-refresh-start],[data-member-refresh-check],[data-refresh-view-updated]');if(!button)return;event.preventDefault();
  if(button.hasAttribute('data-refresh-view-updated')){onPublished();return;}
  const panel=button.closest('[data-member-refresh]');if(panel.dataset.busy)return;
  const state=panel.querySelector('[data-refresh-state]'),check=panel.querySelector('[data-member-refresh-check]'),start=panel.querySelector('[data-member-refresh-start]');
  let pending=readPending(panel);
  if(button===start){if(pending){state.textContent='먼저 이전 요청의 처리 상태를 확인해 주세요.';check.hidden=false;return;}
   const fee=Number(panel.dataset.fee);if(!confirm(`${panel.dataset.personName} 데이터를 갱신할까요?\n수집과 게시 성공 시 ${fee.toLocaleString('ko-KR')}P가 차감됩니다.`))return;
   pending={personId:panel.dataset.memberRefresh,requestId:crypto.randomUUID(),quotedFee:fee};savePending(panel,pending);
  }
  if(!pending)return;panel.dataset.busy='true';start.disabled=true;check.disabled=true;state.textContent='갱신 요청을 확인하고 있습니다…';
  try{const result=button===start?await auth.requestMemberRefresh(pending):await auth.memberRefreshStatus(pending.requestId);
   if(result.ok&&result.publishedAt){savePending(panel,null);state.textContent=`갱신을 완료했습니다. ${Number(result.points).toLocaleString('ko-KR')}P를 사용했습니다.`;check.hidden=true;start.hidden=true;const view=document.createElement('button');view.type='button';view.className='ghost-btn';view.dataset.refreshViewUpdated='';view.textContent='갱신된 상세 정보 보기';panel.append(view);}
   else if(result.status==='RUNNING'){state.textContent='갱신 중입니다. 잠시 후 처리 상태를 확인해 주세요.';check.hidden=false;}
   else if(['FAILED','EXPIRED'].includes(result.status)){savePending(panel,null);state.textContent=message({error:result.error||'REFRESH_REQUEST_EXPIRED'});check.hidden=true;start.disabled=false;}
   else if(result.status>=500||/INVALID_RESPONSE|STORAGE|NETWORK|TIMEOUT/.test(result.error||'')){state.textContent='요청 결과를 확인하지 못했습니다. 처리 상태 확인을 눌러 주세요.';check.hidden=false;}
   else{savePending(panel,null);state.textContent=message({error:result.error||'REFRESH_REQUEST_EXPIRED'});check.hidden=true;start.disabled=false;}
  }catch{state.textContent='응답을 확인하지 못했습니다. 처리 상태 확인을 눌러 주세요.';check.hidden=false;}
  finally{delete panel.dataset.busy;check.disabled=false;}
 });
}
