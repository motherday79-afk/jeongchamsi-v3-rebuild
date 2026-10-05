const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=v=>Array.isArray(v)?v:[];
const numeric=v=>v===null||v===undefined||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
const count=v=>{const n=numeric(v);return n!==null&&n>=0?n:null;};
const display=(entry,kind)=>list(entry.intelligence?.diagnoses).find(t=>t.display?.kind===kind)?.display;
const fmt=v=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(v);
const value=(v,unit='')=>v===null?'자료 없음':fmt(v)+unit;
const colors=['#67b5ff','#52dfc6','#ffc76b','#c3a0ff'];
const color=i=>colors[i%colors.length];
const badge=i=>`<span class="cx-number" style="--ink:${color(i)}">${i+1}</span>`;
const label=(entry,i)=>`<span class="cx-person-label">${badge(i)}<b>${esc(entry.item.name)}</b></span>`;
const scroller=(label,content)=>`<div class="cx-scroll" data-board-scroll tabindex="0" role="region" aria-label="${esc(label)} · 좌우로 이동 가능">${content}</div>`;
const scale=v=>{if(!(v>0))return 1;const magnitude=10**Math.floor(Math.log10(v));return Math.ceil(v/magnitude)*magnitude;};
const date=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''))?String(v).slice(0,10):'';

function portrait(item){
 const raw=String(item.photo?.url||item.photo?.localPath||''),src=/^(https?:\/\/|\/)/i.test(raw)?raw:'';
 return `<span class="cx-portrait ${src?'has-photo':'is-empty'}" data-politician-avatar style="--photo-position:${esc(item.photo?.focus||'50% 28%')}"><span class="politician-photo-initial">${esc(String(item.name||'?').slice(0,1))}</span>${src?`<img data-politician-photo src="${esc(src)}" alt="" width="96" height="112" decoding="async">`:''}</span>`;
}

export function comparisonPeople(entries){
 return `<div class="cx-people">${entries.map((e,i)=>`<a class="cx-person" data-board-person="${esc(e.item.id)}" style="--ink:${color(i)}" href="/person/${encodeURIComponent(e.item.id)}" data-layout-route="/person/${esc(e.item.id)}">${portrait(e.item)}<span>${label(e,i)}<small>${esc(e.item.party||'소속 미등록')}</small></span></a>`).join('')}</div>`;
}

export function searchData(entries){
 const rows=entries.map(entry=>{const search=display(entry,'brand')?.search,pc=count(search?.pc),mobile=count(search?.mobile);return {pc,mobile,total:pc===null||mobile===null?null:pc+mobile};});
 return {rows,max:scale(Math.max(0,...rows.map(r=>r.total??0)))};
}

export function mediaData(entries){
 const rows=entries.map(entry=>({articles:count(display(entry,'media')?.articleCount),sources:count(display(entry,'media')?.sourceCount)})),points=[];
 rows.forEach((row,i)=>{
  if(row.articles===null||row.sources===null)return;
  const same=points.find(p=>p.articles===row.articles&&p.sources===row.sources);
  if(same)same.indices.push(i);else points.push({...row,indices:[i]});
 });
 return {rows,points,maxX:scale(Math.max(0,...rows.map(r=>r.articles??0))),maxY:scale(Math.max(0,...rows.map(r=>r.sources??0)))};
}

export function activityData(entries){
 return entries.map(entry=>{
  const action=display(entry,'action'),total=count(action?.activityCount),first=count(action?.initiative?.firstMover);
  const valid=total!==null&&first!==null&&first<=total;
  return {total,first,remaining:valid?total-first:null,share:valid&&total>0?first/total:null};
 });
}

function rankChart(entries){
 const ranks=entries.map(e=>{const n=count(e.intelligence?.rank?.overall);return n>0?n:null;});
 const best=Math.min(...ranks.filter(n=>n!==null));
 return scroller('나우랭크 순위판',`<div class="cx-rank-grid" data-compare-chart="rank">${entries.map((e,i)=>{
  const rank=ranks[i],leading=rank!==null&&rank===best;
  return `<article class="cx-rank-person ${leading?'is-leading':''}" style="--ink:${color(i)}">
   <div class="cx-rank-head">${badge(i)}<span>${leading?'선택 인물 중 최상위':'전체 나우랭크'}</span></div>
   ${portrait(e.item)}<div class="cx-rank-identity"><span>${esc(e.item.party||'소속 미등록')}</span><h3>${esc(e.item.name)}</h3><p>${esc(e.item.office||e.item.roleLabel||e.item.jurisdiction||'')}</p></div>
   <div class="cx-rank-value"><strong>${rank===null?'—':fmt(rank)}</strong><span>${rank===null?'미집계':'위'}</span></div>
   <p class="cx-rank-gap">${rank===null?'자료 없음':leading?(ranks.filter(n=>n===best).length>1?'선택 인물 공동 선두':'선택 인물 선두'):`선두와 <b>${fmt(rank-best)}</b>계단 차이`}</p>
   <a href="/person/${encodeURIComponent(e.item.id)}" data-layout-route="/person/${esc(e.item.id)}">인물 상세보기</a>
  </article>`;
 }).join('')}</div>`);
}

function searchChart(entries){
 const {rows,max}=searchData(entries);
 const bars=`<div class="cx-search" data-compare-chart="search"><div class="cx-search-axis" aria-hidden="true"><span>${fmt(max)}</span><span>${fmt(max/2)}</span><span>0</span></div><div class="cx-search-columns">${rows.map((r,i)=>{
  const height=r.total===null?0:r.total/max*100;
  return `<article style="--ink:${color(i)}" class="cx-search-person"><div class="cx-search-plot">
   <div class="cx-stack" style="height:${height}%" aria-hidden="true">${r.total>0?`<i class="cx-stack-mobile" style="height:${r.mobile/r.total*100}%"></i><i class="cx-stack-pc" style="height:${r.pc/r.total*100}%"></i>`:''}</div>
   <div class="cx-stack-total" style="bottom:${height}%">${r.total===null?'<span>자료 없음</span>':`<strong>${fmt(r.total)}</strong><span>회</span>`}</div></div>
   <div class="cx-search-values">${label(entries[i],i)}<dl><div><dt>PC</dt><dd>${value(r.pc,'회')}</dd></div><div><dt>모바일</dt><dd>${value(r.mobile,'회')}</dd></div></dl></div>
  </article>`;
 }).join('')}</div></div>`;
 return `<div class="cx-key"><span><i class="cx-key-solid"></i>PC</span><span><i class="cx-key-pattern"></i>모바일</span><span>두 검색량의 합계 · 회</span></div>${scroller('PC·모바일 검색량',bars)}`;
}

function mediaChart(entries){
 const {rows,points,maxX,maxY}=mediaData(entries),left=82,top=52,width=596,height=266;
 const x=v=>left+v/maxX*width,y=v=>top+height-v/maxY*height;
 const ticks=max=>{const step=Math.max(1,Math.ceil(max/4));return [...new Set([0,step,step*2,step*3,max].filter(n=>n<=max))].sort((a,b)=>a-b);};
 const svg=`<svg class="cx-scatter" viewBox="0 0 760 400" role="img" aria-label="가로축 기사 수, 세로축 보도 매체 수. 인물별 정확한 수치는 아래 표에 표시됩니다.">
  <text x="18" y="24" class="cx-axis-title">보도 매체 · 개</text>
  ${ticks(maxY).map(t=>`<path class="cx-grid-line" d="M${left} ${y(t)}H${left+width}"/><text class="cx-axis-number" x="${left-15}" y="${y(t)+5}" text-anchor="end">${fmt(t)}</text>`).join('')}
  ${ticks(maxX).map(t=>`<path class="cx-grid-line" d="M${x(t)} ${top}V${top+height}"/><text class="cx-axis-number" x="${x(t)}" y="${top+height+32}" text-anchor="middle">${fmt(t)}</text>`).join('')}
  <path class="cx-axis-line" d="M${left} ${top}V${top+height}H${left+width}"/>
  <text class="cx-axis-title" x="${left+width}" y="389" text-anchor="end">집계 기사 · 건</text>
  ${points.map(p=>{const text=p.indices.map(i=>i+1).join('·'),paint=p.indices.length===1?color(p.indices[0]):'#ecf4ff';return `<g transform="translate(${x(p.articles)} ${y(p.sources)})"><title>${esc(p.indices.map(i=>entries[i].item.name).join(', '))}: 기사 ${fmt(p.articles)}건 · 매체 ${fmt(p.sources)}개</title><circle r="${p.indices.length>2?32:p.indices.length>1?26:22}" fill="${paint}" stroke="#071523" stroke-width="3"/><text class="cx-dot-number" text-anchor="middle" dominant-baseline="central">${text}</text></g>`;}).join('')}
 </svg>`;
 return `<div data-compare-chart="media" class="cx-media">${scroller('기사 수와 매체 수 분포',svg)}<div class="cx-media-values">${rows.map((r,i)=>`<article style="--ink:${color(i)}">${label(entries[i],i)}<dl><div><dt>집계 기사</dt><dd>${r.articles===null?'자료 없음':`<b>${fmt(r.articles)}</b>건`}</dd></div><div><dt>보도 매체</dt><dd>${r.sources===null?'자료 없음':`<b>${fmt(r.sources)}</b>개`}</dd></div></dl></article>`).join('')}</div>${points.some(p=>p.indices.length>1)?'<p class="cx-chart-note">두 수치가 같은 인물은 한 점에 번호를 함께 표시합니다.</p>':''}</div>`;
}

function activityChart(entries){
 const rows=activityData(entries);
 return scroller('정치활동 구성',`<div class="cx-activity-grid" data-compare-chart="activity">${rows.map((r,i)=>`<article class="cx-activity-person" style="--ink:${color(i)}">${label(entries[i],i)}<div class="cx-donut">
  <svg viewBox="0 0 200 200" aria-hidden="true"><circle class="cx-donut-track" cx="100" cy="100" r="78" pathLength="100"/>${r.share===null?'':`<circle class="cx-donut-fill" cx="100" cy="100" r="78" pathLength="100" stroke-dasharray="${r.share*100} 100" transform="rotate(-90 100 100)"/>`}</svg>
  <div><span>관측 활동</span><strong>${r.total===null?'—':fmt(r.total)}</strong><span>${r.total===null?'자료 없음':'건'}</span></div>
 </div><dl class="cx-activity-breakdown"><div><dt><i></i>직접 선점</dt><dd>${value(r.first,'건')}</dd></div><div><dt><i></i>그 외 활동</dt><dd>${value(r.remaining,'건')}</dd></div></dl><p class="cx-chart-note">${r.share===null?(r.total===0?'집계된 활동 없음':'구성 비율 자료 없음'):`직접 선점 비중 <b>${fmt(r.share*100)}%</b>`}</p></article>`).join('')}</div>`);
}

function diagnosisChart(entries,rows){
 if(!rows.length)return '<div class="cx-empty" data-compare-chart="diagnosis">비교 가능한 분석 수치가 없습니다.</div>';
 return `<div class="cx-key"><span><i class="cx-heat-key"></i>분석지수 0–100점</span><span><i class="cx-risk-key"></i>이슈·위기는 높을수록 위험</span></div>${scroller('JCS 분석 항목별 점수',`<table class="cx-heatmap" data-compare-chart="diagnosis"><caption class="cb-sr-only">정치인별 JCS 분석지수</caption><thead><tr><th scope="col">분석 항목</th>${entries.map((e,i)=>`<th scope="col" style="--ink:${color(i)}">${label(e,i)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>{
  const risk=row.id==='score-06';
  return `<tr data-risk="${risk}"><th scope="row">${esc(row.label)}${risk?'<small>높을수록 위험</small>':''}</th>${entries.map(e=>{const score=row.value(e);return `<td${score===null?' class="cx-heat-missing"':` style="--heat:${.08+Math.max(0,Math.min(100,score))/100*.53}"`}><span>${score===null?'—':fmt(score)}</span><small>${score===null?'자료 없음':'점'}</small></td>`;}).join('')}</tr>`;
 }).join('')}</tbody></table>`)}`;
}

export function comparisonChart(id,entries,rows){
 if(id==='rank')return rankChart(entries);
 if(id==='search')return searchChart(entries);
 if(id==='media')return mediaChart(entries);
 if(id==='activity')return activityChart(entries);
 return diagnosisChart(entries,rows.diagnosis);
}

export function comparisonDates(entries,id){
 const kinds={search:'brand',media:'media',activity:'action'};
 if(!kinds[id])return '';
 const dates=entries.map(e=>date(list(e.intelligence?.diagnoses).find(t=>t.display?.kind===kinds[id])?.updatedAt));
 if(dates.every(d=>d)&&new Set(dates).size===1)return `<p class="cx-chart-note">기준일 ${esc(dates[0])}</p>`;
 return `<p class="cx-chart-note">${entries.map((e,i)=>`${esc(e.item.name)} ${esc(dates[i]||'기준일 미제공')}`).join(' · ')}</p>`;
}
