const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errors={PUSH_FORBIDDEN:'최고관리자만 전체 알림을 보낼 수 있습니다.',PUSH_NO_RECIPIENTS:'현재 웹 알림을 켠 회원이 없습니다. 먼저 내 기기의 알림을 켜 주세요.',PUSH_BROADCAST_INTERVAL:'전체 발송은 1분 간격으로 가능합니다.',PUSH_INPUT_INVALID:'제목·내용과 정참시 내부 이동 경로를 확인해 주세요.',PUSH_SERVER_ERROR:'서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'};
export async function broadcastRequest(input){try{const r=await fetch('/api/v3/push/broadcast',{method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',...(input?{headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{})});const data=await r.json();return r.ok?data:{ok:false,error:data.error||'PUSH_SERVER_ERROR'};}catch{return {ok:false,error:'PUSH_SERVER_ERROR'};}}
export function renderWebBroadcast(data){
 if(!data?.ok)return `<div class="web-broadcast"><section class="push-card"><h2>발송 정보를 불러오지 못했습니다</h2><p>${esc(errors[data?.error]||errors.PUSH_SERVER_ERROR)}</p><button type="button" data-broadcast-refresh>다시 불러오기</button></section></div>`;
 const state={queued:'발송 대기·처리 중',complete:'발송 처리 완료',failed:'일부 발송 실패 · 자동 재시도 종료',cancelled:'발송 취소·기한 종료'};
 return `<div class="web-broadcast"><section class="push-card"><span class="push-kicker">WEB PUSH · ALL MEMBERS</span><h2>회원에게 전하는 정참시 소식</h2><div class="broadcast-count">${Number(data.eligible).toLocaleString()}<small>명 수신 설정</small></div><p>웹 알림을 허용한 활성 회원에게 전달됩니다. 앱 설치 여부와 관계없이, 등록한 삼성인터넷·Chrome·홈 화면 웹 앱으로 도착합니다.</p><a href="/notifications" target="_blank" rel="noopener">내 기기 알림 설정 · 테스트 알림 받기</a><p class="push-note">실제 수신은 기기의 알림·네트워크 설정에 따라 달라집니다. 회원 한 명이 여러 브라우저를 등록했다면 각 브라우저로 발송됩니다.</p></section>
 <section class="push-card"><h2>전체 회원 웹 푸시 작성</h2><form data-broadcast-form><label>알림 제목<input name="title" maxlength="60" required placeholder="예: 정참시에 새로운 소식이 도착했습니다"></label><label>알림 내용<textarea name="body" maxlength="300" required placeholder="회원에게 전할 내용을 적어 주세요."></textarea></label><label>누르면 이동할 페이지<input name="path" maxlength="1000" value="/" required placeholder="/community"><small>정참시 주소 또는 내부 경로를 입력하세요. 예: https://www.jeongchamsi.com/community</small></label><div class="broadcast-preview"><small>알림 미리보기</small><b data-broadcast-preview-title>정참시 소식</b><p data-broadcast-preview-body>작성한 내용이 여기에 표시됩니다.</p></div><button type="submit" ${data.eligible?'':'disabled'}>발송 내용 확인</button><p class="push-note">전체 발송은 1분 간격으로 가능합니다. 화면을 닫아도 서버에서 발송을 이어갑니다.</p><div data-broadcast-confirm hidden></div><p class="push-feedback" data-broadcast-feedback role="status" aria-live="polite"></p></form></section>
 <section class="push-card broadcast-history"><div class="push-card-heading"><h2>최근 발송 이력</h2><button type="button" class="push-secondary" data-broadcast-refresh>새로고침</button></div><p class="push-note">최근 90일 중 최대 20건 · 기기 접수는 푸시 서비스 접수이며 실제 수신·열람과 다릅니다.</p>${data.history.map(j=>`<article><time>${esc(new Date(j.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))}</time><h3>${esc(j.title)}</h3><p>${esc(j.body)}</p><p><b>${esc(state[j.status]||j.status)}</b></p><p class="push-note">대상 ${j.eligible}명 · 기기 접수 ${j.accepted}건 · 기기 실패 ${j.failed}건 · 제외 ${j.skipped}건<br>이동 경로: ${esc(j.path)}</p></article>`).join('')||'<p>아직 전체 발송 이력이 없습니다.</p>'}</section></div>`;
}
export function bindWebBroadcast(root){
 const pending=new WeakMap();
 const refresh=async()=>{const mount=root.querySelector('.web-broadcast');if(!mount)return;const data=await broadcastRequest();if(mount.isConnected)mount.outerHTML=renderWebBroadcast(data);};
 root.addEventListener('input',e=>{const form=e.target.closest('[data-broadcast-form]');if(!form)return;pending.delete(form);form.querySelector('[data-broadcast-confirm]').hidden=true;form.querySelector('[data-broadcast-preview-title]').textContent=form.elements.title.value||'정참시 소식';form.querySelector('[data-broadcast-preview-body]').textContent=form.elements.body.value||'작성한 내용이 여기에 표시됩니다.';});
 root.addEventListener('submit',async e=>{
  const form=e.target.closest('[data-broadcast-form]');if(!form)return;e.preventDefault();if(form.dataset.busy)return;
  const feedback=form.querySelector('[data-broadcast-feedback]');feedback.textContent='수신 대상을 확인하고 있습니다.';
  let path;try{const url=new URL(form.elements.path.value,location.origin);if(url.origin!==location.origin&&!['https://jeongchamsi.com','https://www.jeongchamsi.com'].includes(url.origin))throw Error();path=url.pathname+url.search+url.hash;}catch{feedback.textContent='정참시 내부 페이지 주소를 입력해 주세요.';return;}
  form.dataset.busy='true';const snapshot={title:form.elements.title.value.trim(),body:form.elements.body.value.trim(),path,inputPath:form.elements.path.value,requestId:crypto.randomUUID()};const data=await broadcastRequest();delete form.dataset.busy;if(!form.isConnected)return;
  if(!data.ok||!data.eligible){feedback.textContent=errors[data.error]||errors.PUSH_NO_RECIPIENTS;return;}
  if(form.elements.title.value.trim()!==snapshot.title||form.elements.body.value.trim()!==snapshot.body||form.elements.path.value!==snapshot.inputPath){feedback.textContent='내용이 바뀌었습니다. 다시 발송 내용을 확인해 주세요.';return;}
  pending.set(form,snapshot);feedback.textContent='';const box=form.querySelector('[data-broadcast-confirm]');box.className='broadcast-confirm';box.hidden=false;box.innerHTML=`<b>수신 설정 회원 ${data.eligible}명에게 보냅니다.</b><p>${esc(snapshot.title)}</p><p>${esc(snapshot.body)}</p><p class="push-note">이동: ${esc(path)}<br>발송 직전의 알림 설정에 따라 실제 대상은 달라질 수 있습니다.</p><button type="button" data-broadcast-send>전체 회원에게 발송</button> <button type="button" class="push-secondary" data-broadcast-cancel>취소</button>`;
 });
 root.addEventListener('click',async e=>{
  if(e.target.closest('[data-broadcast-refresh]')){await refresh();return;}
  const form=e.target.closest('[data-broadcast-form]');if(!form)return;
  if(e.target.closest('[data-broadcast-cancel]')){form.querySelector('[data-broadcast-confirm]').hidden=true;pending.delete(form);return;}
  const button=e.target.closest('[data-broadcast-send]');if(!button||button.disabled||!pending.has(form))return;
  button.disabled=true;form.dataset.busy='true';const feedback=form.querySelector('[data-broadcast-feedback]');feedback.textContent='전체 발송을 접수하고 있습니다.';
  const result=await broadcastRequest(pending.get(form));delete form.dataset.busy;
  if(result.ok){pending.delete(form);await refresh();const current=root.querySelector('[data-broadcast-feedback]');if(current)current.textContent='전체 발송이 접수되었습니다. 아래 발송 이력에서 진행 상태를 확인해 주세요.';}
  else{button.disabled=false;feedback.textContent=errors[result.error]||errors.PUSH_SERVER_ERROR;}
 });
}
