import {makeDailyReport} from '../core/daily-report.js?v=0.0.31.444';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>typeof v==='number'&&Number.isFinite(v);
const fmt=v=>number(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:1}):'—';
const list=v=>Array.isArray(v)?v:[];
const safe=v=>/^https?:\/\//i.test(v||'')||/^\/(?!\/)/.test(v||'');
const TITLES={'01':'이미지와 인지도','02':'세대·성별 지지도','03':'지역 기반','04':'지지층','05':'경쟁력','06':'위험도','07':'언론 보도','08':'선거 준비','09':'정치 활동'};
const name=t=>TITLES[t?.id]||'진단';
const stat=(label,value,unit)=>`<div class="dr-stat"><span>${esc(label)}</span><b>${fmt(value)}<small>${unit}</small></b></div>`;
export function summarizeReport(record){
 const topics=list(record.topics),scored=topics.filter(t=>t.id!=='06'&&number(t.score)).sort((a,b)=>b.score-a.score);
 const high=scored[0],low=scored.length>1?scored.at(-1):null,risk=topics.find(t=>t.id==='06');
 const focus=number(risk?.score)&&risk.score>=70?risk:low;
 let sentence='종합 판단을 위한 자료를 모으고 있습니다.';
 if(high&&focus){sentence=focus.id==='06'?`${name(high)} 점수는 높지만, 위험도도 높아 주의가 필요합니다.`:high.score===focus.score?'항목별 점수가 같아 두드러진 강점은 아직 없습니다.':`${name(high)} 점수는 상대적으로 높고, ${name(focus)} 점수는 낮습니다.`;}
 return {sentence,strong:high?`${name(high)} · ${fmt(high.score)}점`:'판단할 자료가 부족합니다.',weak:focus?`${name(focus)} · ${fmt(focus.score)}점`:'판단할 자료가 부족합니다.'};
}
export function renderReportComparison(result){
 if(!result?.ready)return `<p class="dr-compact-empty">${esc(result?.reason||'기록 축적 중')}</p>`;
 const changed=list(result.rows).filter(r=>number(r.delta)&&r.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,2);
 const rank=number(result.rankDelta)?`순위 ${result.rankDelta>0?result.rankDelta+'계단 상승':result.rankDelta<0?Math.abs(result.rankDelta)+'계단 하락':'변동 없음'}`:'';
 return `<p class="dr-period-date">${esc(result.from)} → ${esc(result.to)}</p><div class="dr-key-changes">${rank?'<strong>'+esc(rank)+'</strong>':''}${changed.map(r=>`<span>${esc(name(r))} <b>${r.delta>0?'+':''}${fmt(r.delta)}점</b></span>`).join('')}${!changed.length?'<span>항목별 점수 변동 없음</span>':''}</div>`;
}
export function renderDailyReportBody(record,{inline=(o,k,v)=>v}={}){
 const summary=summarizeReport(record),media=list(record.topics).find(t=>t.id==='07')?.display||{};
 const total=record.summary?.display?.totalScore??record.summary?.score;
 const news=new Map();for(const n of list(record.news))if(safe(n.url))news.set(n.url,n);
 return `<section class="dr-brief"><header><small>JCS SUMMARY</small><span>${esc(record.date||'최신 자료')}</span></header><h3>${esc(summary.sentence)}</h3><div class="dr-three-stats">${stat('종합점수',total,'점')}${stat('전체 관심도 순위',record.rank?.overall,'위')}${stat('집계 기사',media.articleCount,'건')}</div></section>
 <section class="dr-change"><header><h3>주요 변화</h3><nav aria-label="변화 비교 기간">${['24H','7D','30D'].map(p=>`<button type="button" data-dr-period="${p}" aria-pressed="${p==='24H'}">${p}</button>`).join('')}</nav></header><div data-dr-comparison><p class="dr-compact-empty">기간을 누르면 주요 변화만 보여드립니다.</p></div></section>
 <div class="dr-assessment dr-brief-assessment"><section><h3>강점</h3><p>${esc(summary.strong)}</p></section><section><h3>보완점</h3><p>${esc(summary.weak)}</p></section></div>
 <details class="dr-evidence"><summary>판단 근거 보기</summary><p>1~9번의 저장 점수를 비교한 요약입니다.</p><ol>${[...news.values()].slice(0,5).map(n=>`<li><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a></li>`).join('')}</ol><p>항목별 그래프와 설명은 위의 1~9번에서 확인할 수 있습니다.</p></details>`;
}
export function renderDailyReport(report,person,inline){const record=makeDailyReport(person,report);return `<div class="dr-report dr-compact" data-daily-report="${esc(person.id)}"><div class="dr-toolbar"><label>기록일 <input type="date" data-dr-date aria-label="저장된 보고서 날짜"></label><button type="button" data-dr-current>최신 보기</button><span data-dr-status role="status"></span></div><div data-dr-body>${renderDailyReportBody(record,{inline})}</div></div>`;}
