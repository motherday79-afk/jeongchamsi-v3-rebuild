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

const clamp=v=>number(v)?Math.max(0,Math.min(100,v)):0;
const empty=()=>'<span class="dr-mini-empty">집계 자료 없음</span>';
function miniBars(rows,unit='점',max=100){return rows.length?'<div class="dr-mini-bars">'+rows.map(r=>'<div><span>'+esc(r.label)+'</span><strong>'+fmt(r.value)+'<small>'+unit+'</small></strong><i><b style="width:'+clamp(r.value/Math.max(1,max)*100)+'%"></b></i></div>').join('')+'</div>':empty();}
function extremes(rows,key='value'){const sorted=list(rows).filter(r=>number(r[key])).sort((a,b)=>b[key]-a[key]);return sorted.length>1?[sorted[0],sorted.at(-1)]:sorted;}
function sparkline(days){const rows=list(days).slice(-7),known=rows.filter(r=>number(r.count));if(!known.length)return empty();
 const max=Math.max(1,...known.map(r=>r.count)),point=(r,i)=>[12+i*216/Math.max(1,rows.length-1),64-r.count/max*50];let paths=[],segment=[];
 rows.forEach((r,i)=>{if(number(r.count))segment.push(point(r,i).join(','));else if(segment.length){paths.push(segment);segment=[];}});if(segment.length)paths.push(segment);
 return '<svg class="dr-spark" viewBox="0 0 240 78" role="img" aria-label="최근 7일 이슈 보도 건수"><title>'+esc(rows.map(r=>(r.date||'')+': '+(number(r.count)?r.count+'건':'기록 없음')).join(', '))+'</title><path d="M12 65H228" stroke="#d6dfeb" fill="none"/>'+paths.map(points=>'<polyline points="'+points.join(' ')+'" fill="none" stroke="#4767d9" stroke-width="3"/>').join('')+rows.map((r,i)=>{if(!number(r.count))return '';const [x,y]=point(r,i);return '<circle cx="'+x+'" cy="'+y+'" r="3" fill="#4767d9"/>';}).join('')+'</svg><div class="dr-mini-range"><span>'+esc(rows[0]?.date?.slice(5)||'')+'</span><span>'+esc(rows.at(-1)?.date?.slice(5)||'')+'</span></div>';
}
export function renderSummaryTile(id,record){const d=list(record.topics).find(t=>t.id===id)?.display||{};let label='',graphic='',note='';
 if(id==='01'){label='이미지 일관성';const value=d.imageConsistency?.average;graphic=number(value)?'<div class="dr-mini-gauge" style="--dr-gauge:'+clamp(value)+'%"><div><b>'+fmt(value)+'</b><small>/ 100점</small></div></div>':empty();}
 if(id==='02'){label='세대별 지지 비중';const rows=extremes(d.cohorts,'total');graphic=miniBars(rows.map((r,i)=>({label:r.age+' · '+(i?'최저':'최고'),value:r.total})),'%');}
 if(id==='03'){label='가장 많이 다룬 지역 현안';const r=list(d.issues).filter(r=>number(r.count)&&r.count>0).sort((a,b)=>b.count-a.count)[0];graphic=r?'<b class="dr-mini-subject">'+esc(r.label)+'</b><div class="dr-mini-pair">'+stat('관련 보도',r.count,'건')+stat('지역 보도 비중',r.share,'%')+'</div>':empty();}
 if(id==='04'){label='지지층별 차이';const labels={core:'핵심 지지층 결집',floating:'유동층 이동',exit:'이탈 위험'};graphic=miniBars(list(d.composition).slice(0,3).map(r=>({label:labels[r.key]||r.label,value:r.value})));note='항목별 점수 · 합계 100% 아님';}
 if(id==='05'){label='주요 경쟁자와의 격차';const me=list(d.people).find(r=>r.id===record.id)||list(d.people)[0],rivals=list(d.people).filter(r=>r!==me&&number(r.competition?.index)),other=rivals.sort((a,b)=>Math.abs(a.competition.index-(me?.competition?.index??0))-Math.abs(b.competition.index-(me?.competition?.index??0)))[0];graphic=me&&other?miniBars([me,other].map(r=>({label:r.name,value:r.competition?.index}))):empty();if(number(me?.competition?.index)&&other)note='경쟁 지수 차이 '+fmt(Math.abs(me.competition.index-other.competition.index))+'점';}
 if(id==='06'){label='핵심 이슈의 흐름';const r=list(d.lifecycle)[0];graphic=r?'<b class="dr-mini-subject dr-mini-issue" title="'+esc(r.title)+'">'+esc(r.title)+'</b>'+sparkline(r.daily):empty();note=r?'최근 7일 보도 건수':'';}
 if(id==='07'){label='얼마나 보도됐나';graphic='<div class="dr-mini-pair dr-mini-media">'+stat('기사',d.articleCount,'건')+stat('매체',d.sourceCount,'곳')+'</div>';}
 if(id==='08'){label='선거 준비의 강점과 약점';const rows=extremes(d.foundations);graphic=miniBars(rows.map((r,i)=>({label:r.label+' · '+(i?'최저':'최고'),value:r.value})));}
 if(id==='09'){label='이슈를 먼저 다뤘나';const first=d.initiative?.firstMover,joined=d.initiative?.joined;graphic=number(first)||number(joined)?miniBars([{label:'먼저 다룬 이슈',value:first},{label:'뒤이어 참여',value:joined}],'건',Math.max(first||0,joined||0,1)):empty();}
 return '<section class="dr-mini-tile" data-summary-topic="'+id+'"><header><a href="#jcs-d'+id+'" aria-label="'+id+'번 '+esc(name({id}))+' 상세로 이동"><span>'+id+'</span>'+esc(name({id}))+'</a></header><h4>'+esc(label)+'</h4><div class="dr-mini-graphic">'+graphic+'</div>'+(note?'<small class="dr-mini-note">'+esc(note)+'</small>':'')+'</section>';
}
export function renderDailyReportBody(record){
 const news=new Map();for(const n of list(record.news))if(safe(n.url))news.set(n.url,n);
 return `<div class="dr-nine-heading"><b>1–9 핵심 요약</b><span>${esc(record.date||'최신 자료')}</span></div><div class="dr-nine-grid">${Array.from({length:9},(_,i)=>renderSummaryTile('0'+(i+1),record)).join('')}</div>
 <section class="dr-change"><header><h3>주요 변화</h3><nav aria-label="변화 비교 기간">${['24H','7D','30D'].map(p=>`<button type="button" data-dr-period="${p}" aria-pressed="${p==='24H'}">${p}</button>`).join('')}</nav></header><div data-dr-comparison><p class="dr-compact-empty">기간을 누르면 주요 변화만 보여드립니다.</p></div></section>
 <details class="dr-evidence"><summary>판단 근거 보기</summary><ol>${[...news.values()].slice(0,5).map(n=>`<li><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a></li>`).join('')}</ol></details>`;
}

export function renderDailyReport(report,person,inline){const record=makeDailyReport(person,report);return `<div class="dr-report dr-compact" data-daily-report="${esc(person.id)}"><div class="dr-toolbar"><label>기록일 <input type="date" data-dr-date aria-label="저장된 보고서 날짜"></label><button type="button" data-dr-current>최신 보기</button><span data-dr-status role="status"></span></div><div data-dr-body>${renderDailyReportBody(record,{inline})}</div></div>`;}
