const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=value=>Number(value||0).toLocaleString('ko-KR');
const when=value=>{const date=new Date(Number(value)||value);return Number.isNaN(date.getTime())?'':date.toLocaleString('ko-KR');};
const policyOf=value=>value?.policy||{};
const reasonLabel={awarded:'적립 기준 충족', 'minimum-length':'포인트 적립 분량 미달',repetitive:'명백한 반복 내용',duplicate:'이미 적립을 판단한 동일 내용','daily-limit':'하루 활동 적립 한도 도달',restricted:'관리자 활동 적립 제한 중',disabled:'활동 포인트 적립 중지',ineligible:'이 작성은 적립 대상이 아님'};
const kindLabel=kind=>kind==='comment'?'댓글':'게시글';

export function renderActivityHint(activity={},kind='post',{authenticated=true}={}){
 const policy=policyOf(activity),points=Number(kind==='comment'?policy.commentPoints:policy.postPoints),minimum=Number(kind==='comment'?policy.commentMinLength:policy.postMinLength),remaining=Number(activity.remainingToday??policy.dailyLimit??0),earned=Number(activity.earnedToday||0),cooldown=Number(policy.cooldownSeconds||0);
 if(policy.enabled===false)return '<p class="activity-hint is-disabled">현재 활동 포인트 적립은 중지되어 있습니다. 작성은 그대로 할 수 있습니다.</p>';
 const member=authenticated?`오늘 적립 인정 ${number(earned)}P · 남은 한도 ${number(remaining)}P`:'로그인 회원에게 적립됩니다.';
 return `<p class="activity-hint" data-activity-policy-ready="true"><b>활동 포인트 ${number(points)}P</b><span>${minimum}자 이상의 의미 있는 ${kindLabel(kind)} · ${member}</span><small>한국시간 하루 합산 ${number(policy.dailyLimit)}P · 작성 간격 ${cooldown}초. 주소·기호·이모지·단독 자모와 명백한 반복은 분량에서 제외됩니다. 짧은 글도 등록할 수 있으며 포인트만 적립되지 않습니다.</small></p>`;
}

export function renderActivitySummary(activity={}){
 const restricted=Number(activity.restrictedUntil||0)>Date.now()?`<p class="activity-restriction"><b>활동 적립 제한</b> ${when(activity.restrictedUntil)}까지 · ${esc(activity.restrictionReason||'운영 검토')}</p>`:'';
 return `<section class="activity-summary" aria-label="활동 포인트 현황"><div><span>오늘 적립 인정</span><strong>${number(activity.earnedToday)}P</strong><small>한국시간 ${esc(activity.day||'오늘')}</small></div><div><span>오늘 남은 한도</span><strong>${number(activity.remainingToday)}P</strong><small>게시글·댓글 합산</small></div><div><span>활동 상계 대기</span><strong>${number(activity.debt)}P</strong><small>향후 활동 적립에서 먼저 상계</small></div>${restricted}</section>`;
}

export function renderActivityReceipt(receipt={}){
 if(!receipt||!receipt.status)return '';
 if(receipt.status==='credited'){
  const earned=Number(receipt.earned||0),credited=Number(receipt.credited||0),offset=Number(receipt.offset||0);
  return `<div class="activity-receipt is-credited" role="status"><b>활동 ${number(earned)}P 적립 인정</b><span>${credited?`${number(credited)}P 지급`:''}${credited&&offset?' · ':''}${offset?`${number(offset)}P 상계`:''}</span>${Number.isFinite(Number(receipt.remainingToday))?`<small>오늘 남은 활동 한도 ${number(receipt.remainingToday)}P</small>`:''}</div>`;
 }
 return `<div class="activity-receipt is-excluded" role="status"><b>작성은 저장됐지만 포인트는 적립되지 않았습니다.</b><span>${esc(reasonLabel[receipt.reason]||'적립 기준을 충족하지 않았습니다.')}</span></div>`;
}

export function ledgerPresentation(row={}){
 if(row.type==='charge')return {label:'포인트 충전',detail:`${number(row.amount)}원 · 보너스 ${number(Number(row.points||0)-Number(row.amount||0))}P`};
 if(row.type==='person-refresh')return {label:`정치인 갱신${row.personName?' · '+String(row.personName):''}`,detail:''};
 if(row.type==='cage')return {label:'케이지 개설',detail:''};
 if(row.type==='activity')return {label:`${kindLabel(row.kind)} 활동 적립`,detail:`${number(row.earned)}P 인정 · ${number(row.credited)}P 지급${Number(row.offset)?` · ${number(row.offset)}P 상계`:''}`};
 if(row.type==='activity-revoke')return {label:'활동 적립 회수',detail:`${number(row.earned)}P 인정분 · ${number(row.recovered)}P 회수${Number(row.debtAdded)?` · 추가 상계 ${number(row.debtAdded)}P`:''}${row.reason?` · ${String(row.reason)}`:''}`};
 return {label:'포인트 변동',detail:String(row.type||'')};
}

export const totalSpent=ledger=>(ledger||[]).filter(row=>Number(row.points)<0&&!['activity-revoke'].includes(row.type)).reduce((sum,row)=>sum-Number(row.points||0),0);

const requestToken=()=>globalThis.crypto?.randomUUID?.()||`activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const policyField=(name,label,value,min,max)=>`<label>${esc(label)}<input type="number" name="${name}" value="${Number(value||0)}" min="${min}" max="${max}" step="1" required></label>`;

export function renderActivityAdmin(result={},session={}){
 if(!result?.ok||!session.authenticated||session.user?.role!=='admin')return '';
 const admin=result.activityAdmin;if(!admin)return '<section class="point-panel activity-admin"><h2>활동 포인트 관리</h2><p>활동 포인트 운영 정보를 불러오지 못했습니다.</p></section>';
 const p=admin.policy||{},suspects=Array.isArray(admin.suspects)?admin.suspects:[],audit=Array.isArray(admin.audit)?admin.audit:[];
 return `<section class="module point-panel activity-admin"><header><div><span>ACTIVITY POINTS</span><h2>관리자 · 활동 포인트 운영</h2></div><button type="button" data-layout-route="/admin?tab=members">회원별 활동 관리</button></header><form data-point-form="activity-policy" class="activity-policy-form"><label class="activity-check"><input type="checkbox" name="enabled" ${p.enabled!==false?'checked':''}> 활동 포인트 적립 사용</label><div>${policyField('postPoints','게시글 포인트',p.postPoints,0,1000000)}${policyField('commentPoints','댓글 포인트',p.commentPoints,0,1000000)}${policyField('dailyLimit','하루 합산 한도',p.dailyLimit,0,1000000)}${policyField('postMinLength','게시글 의미 문자',p.postMinLength,1,10000)}${policyField('commentMinLength','댓글 의미 문자',p.commentMinLength,1,10000)}${policyField('cooldownSeconds','공통 작성 간격(초)',p.cooldownSeconds,0,3600)}</div><label>변경 사유<input name="reason" maxlength="200" required placeholder="변경 근거를 남겨 주세요"></label><button class="point-primary">정책 저장</button><p data-form-state role="status"></p></form><details open><summary>의심 신호 ${suspects.length}건</summary><p class="activity-caution">자동 기준이 찾은 검토 신호이며 확정된 부정 활동이 아닙니다. 내용을 확인한 뒤 조치하세요.</p><div class="activity-suspects">${suspects.map(row=>`<article><div><b>${esc(row.nickname||row.userId)}</b><small>${esc(row.userId)} · ${when(row.at)}</small></div><p>${esc(kindLabel(row.kind))} · ${esc(reasonLabel[row.reason]||row.reason||'검토 필요')} · ${number(row.earned)}P</p><button type="button" data-layout-route="/admin?tab=members&q=${encodeURIComponent(String(row.userId||''))}">회원 활동 내역 열기</button></article>`).join('')||'<p>현재 검토할 의심 신호가 없습니다.</p>'}</div></details><details><summary>활동 운영 기록 ${audit.length}건</summary><div class="activity-audit">${audit.slice(0,100).map(row=>`<p><b>${esc(row.action||row.type||'활동 포인트')}</b> ${esc(row.userId||row.actor||'')} · ${when(row.at)}${row.reason?` · ${esc(row.reason)}`:''}</p>`).join('')||'<p>운영 기록이 없습니다.</p>'}</div></details></section>`;
}

export function renderMemberActivityAdmin(result={},userId='',page=1){
 if(!result?.ok)return '';
 const activity=result.activityRewards||{},events=Array.isArray(result.activityEvents)?result.activityEvents:[],size=25,pages=Math.max(1,Math.ceil(events.length/size)),current=Math.max(1,Math.min(pages,Number(page)||1)),rows=events.slice((current-1)*size,current*size),uid=esc(userId);
 return `<section class="activity-member-admin"><h4>활동 포인트 현황</h4>${renderActivitySummary(activity)}<form data-point-form="activity-restrict"><input type="hidden" name="userId" value="${uid}"><input type="hidden" name="requestId" value="${requestToken()}"><label>적립 제한 시간 <small>0은 제한 해제, 최대 720시간</small><input type="number" name="hours" value="24" min="0" max="720" step="1" required></label><label>조치 사유<input name="reason" required maxlength="200" value=""></label><button type="submit">제한 저장</button><span data-form-state role="status"></span></form><div class="activity-member-events"><h4>성공한 활동 내역 ${events.length}건</h4>${rows.map(event=>`<article><div><b>${esc(kindLabel(event.kind))} · ${number(event.earned)}P 인정</b><small>${when(event.at)} · ${esc(event.scope)} · ${esc(event.contentId)}</small></div><p>${number(event.credited)}P 지급 · ${number(event.offset)}P 상계${event.revoked?' · 회수 완료':''}</p>${event.revoked?'':`<form data-point-form="activity-revoke"><input type="hidden" name="userId" value="${uid}"><input type="hidden" name="eventId" value="${esc(event.eventId)}"><input type="hidden" name="requestId" value="${requestToken()}"><label>회수 사유<input name="reason" required maxlength="200"></label><button type="submit">이 적립 회수</button><span data-form-state role="status"></span></form>`}</article>`).join('')||'<p>성공한 활동 적립 내역이 없습니다.</p>'}</div>${pages>1?`<nav class="activity-pagination" aria-label="활동 내역 페이지">${Array.from({length:pages},(_,i)=>`<button type="button" data-activity-member-page="${i+1}" data-user-id="${uid}" ${i+1===current?'aria-current="page"':''}>${i+1}<span class="sr-only"> page=${i+1}</span></button>`).join('')}</nav>`:''}</section>`;
}
