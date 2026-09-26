const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function formatRankUpdatedAt(value){
  const date=new Date(value||NaN);
  return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}
export function renderRankUpdateNote(value){
  const stamp=formatRankUpdatedAt(value);
  return `<p class="module-desc">매일 낮 12시 갱신 시작 · 한국 시간 · 수집 완료 후 반영${stamp?`<br>마지막 업데이트: ${esc(stamp)}`:''}</p>`;
}
export function renderNowRankSchedule(schedule){
  if(!schedule)return '';
  const last=schedule.latest,labels={RUNNING:'자동 갱신 중',COMPLETED:'자동 갱신 완료',FAILED:'갱신 실패 · 기존 순위 유지',SKIPPED:'수동 작업 진행으로 자동 갱신 건너뜀'};
  const status=last?.stalled?'갱신 지연 · 서버 로그 확인 필요':labels[last?.status]||'첫 예약 실행 대기';
  return `<section class="content-card" data-now-rank-schedule><h3>NOW Rank 자동 갱신</h3>${renderRankUpdateNote(null)}<p><strong>${esc(status)}</strong>${last?.updatedAt?` · ${esc(formatRankUpdatedAt(last.updatedAt))}`:''}</p>${last?.status==='RUNNING'?`<p>수집 ${Number(last.completed)||0} / ${Number(last.total)||0}명</p>`:''}${last?.error?`<p>기록: ${esc(last.error)}</p>`:''}</section>`;
}
