const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=v=>Array.isArray(v)?v:[];
const dateOf=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''))?String(v).slice(0,10):'';
export const metricNumber=v=>v===null||v===undefined||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
const topic=(entry,id)=>list(entry.intelligence?.diagnoses).find(t=>t.id===id);
const display=(entry,kind)=>list(entry.intelligence?.diagnoses).find(t=>t.display?.kind===kind)?.display;
const number=v=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(v);
const topicIds=entries=>[...new Set(entries.flatMap(e=>list(e.intelligence?.diagnoses).map(t=>t.id)))];
const scoreRow=(entries,id)=>({id:'score-'+id,label:entries.map(e=>topic(e,id)?.title).find(Boolean)||'분석 항목',unit:'점',scale:100,note:'JCS 분석지수 · 100점 척도',value:e=>metricNumber(topic(e,id)?.score),evidence:e=>topic(e,id)});
export function boardRows(entries){
 const ids=topicIds(entries);
 const rank={id:'rank',label:'나우랭크',unit:'위',note:'전체 순위 · 작은 숫자가 상위',value:e=>{const n=metricNumber(e.intelligence?.rank?.overall);return n>0?n:null},rank:true};
 const rows=[
 {id:'pc',label:'PC 검색량',kind:'brand',field:'pc',unit:'회',note:'수집된 검색량 · 동일 기간 확인',value:e=>display(e,'brand')?.search?.pc},
 {id:'mobile',label:'모바일 검색량',kind:'brand',unit:'회',note:'수집된 검색량 · 동일 기간 확인',value:e=>display(e,'brand')?.search?.mobile},
 {id:'articles',label:'집계 기사',kind:'media',unit:'건',note:'수집 범위 내 보도량',value:e=>display(e,'media')?.articleCount},
 {id:'sources',label:'보도 매체',kind:'media',unit:'개',note:'집계된 매체 수',value:e=>display(e,'media')?.sourceCount},
 {id:'activities',label:'관측 활동',kind:'action',unit:'건',note:'수집된 활동 · 전체 실적과 다름',value:e=>display(e,'action')?.activityCount},
 {id:'initiative',label:'직접 선점',kind:'action',unit:'건',note:'분석상 직접 선점으로 분류된 활동',value:e=>display(e,'action')?.initiative?.firstMover},
 {id:'conversion',label:'미디어 전환',kind:'action',unit:'건',note:'분석상 미디어 전환으로 분류된 활동',value:e=>display(e,'action')?.conversion?.total}
 ].map(row=>({...row,value:e=>metricNumber(row.value(e)),evidence:e=>list(e.intelligence?.diagnoses).find(t=>t.display?.kind===row.kind)}));
 const available=rows.filter(row=>entries.some(e=>row.value(e)!==null));
 const scores=ids.map(id=>scoreRow(entries,id));
 return {overview:[rank,...['01','10'].filter(id=>ids.includes(id)).map(id=>scoreRow(entries,id)),...available.filter(r=>['articles','activities'].includes(r.id))],attention:available.filter(r=>['pc','mobile','articles','sources'].includes(r.id)),activity:available.filter(r=>['activities','initiative','conversion'].includes(r.id)),diagnosis:scores};
}
export function comparisonInsights(entries){
 const items=topicIds(entries).map(id=>{
  const topics=entries.map(e=>topic(e,id)),values=topics.map(t=>metricNumber(t?.score));
  const dates=topics.map(t=>dateOf(t?.updatedAt)),versions=entries.map(e=>e.intelligence?.algorithmVersion||'');
  if(values.some(v=>v===null)||dates.some(d=>!d)||new Set(dates).size!==1||versions.some(v=>!v)||new Set(versions).size!==1)return null;
  const high=Math.max(...values),low=Math.min(...values);
  return {id,title:topics[0].title,gap:Math.round((high-low)*10)/10,names:entries.filter((e,i)=>values[i]===high).map(e=>e.item.name),date:dates[0]};
 }).filter(Boolean).sort((a,b)=>b.gap-a.gap);
 return items.slice(0,3);
}
function portrait(item){
 const raw=String(item.photo?.url||item.photo?.localPath||''),src=/^(https?:\/\/|\/)/i.test(raw)?raw:'';
 return `<span class="cb-portrait ${src?'has-photo':'is-empty'}" data-politician-avatar style="--photo-position:${esc(item.photo?.focus||'50% 28%')}"><span class="politician-photo-initial">${esc(String(item.name||'?').slice(0,1))}</span>${src?`<img data-politician-photo src="${esc(src)}" alt="" width="96" height="112" decoding="async">`:''}</span>`;
}
function personHeader(entry,index){
 const p=entry.item,url='/person/'+encodeURIComponent(p.id);
 return `<th scope="col" data-board-person="${esc(p.id)}" style="--person-accent:var(--person-${index})"><div class="cb-person">${portrait(p)}<div><span class="cb-person-number">${String(index+1).padStart(2,'0')}</span><h2>${esc(p.name)}</h2><p>${esc(p.party||'정당 정보 없음')}</p><span class="cb-office">${esc(p.office||p.roleLabel||'직책 정보 없음')}</span><a href="${url}" data-layout-route="${url}">상세보기 ↗</a></div></div></th>`;
}
function metricCell(entry,row,index,max){
 const value=row.value(entry),evidence=row.evidence?.(entry),date=dateOf(evidence?.updatedAt);
 if(value===null)return '<td class="cb-missing"><span>자료 없음</span><small>미집계 또는 미제공</small></td>';
 const width=Math.max(0,Math.min(100,value/(row.scale||max||1)*100));
 return `<td style="--person-accent:var(--person-${index})"><div class="cb-value"><strong>${number(value)}</strong><span>${row.unit}</span></div>${row.rank?'':`<div class="cb-meter" aria-hidden="true"><i style="--meter-width:${width}%"></i></div>`}${evidence?`<details class="cb-evidence"><summary>해석·기준 확인</summary>${evidence.headline?`<p>${esc(evidence.headline)}</p>`:''}<small>기준일 ${esc(date||'미제공')}</small>${list(evidence.sourceTypes).length?`<small>출처 ${esc(evidence.sourceTypes.join(' · '))}</small>`:''}</details>`:'<small class="cb-rank-note">나우랭크 집계 기준</small>'}</td>`;
}
function table(entries,rows,id){
 if(!rows.length)return '<div class="cb-empty"><b>비교 가능한 수치가 아직 없습니다.</b><p>현재 제공된 분석 데이터에서 확인할 수 있는 항목이 생기면 표시됩니다.</p></div>';
 return `<div class="cb-table-scroll" data-board-scroll tabindex="0" role="region" aria-label="${esc(id)} 비교표 · 좌우로 이동 가능"><table class="cb-table"><caption class="cb-sr-only">정치인별 동일 항목 비교</caption><colgroup><col class="cb-axis-col">${entries.map(()=>'<col class="cb-person-col">').join('')}</colgroup><thead><tr><th scope="col" class="cb-corner"><span>동일 항목</span><b>나란히 비교</b><small>${entries.length}명 선택</small></th>${entries.map(personHeader).join('')}</tr></thead><tbody>${rows.map(row=>{const max=Math.max(0,...entries.map(e=>row.value(e)??0));return `<tr data-board-metric="${esc(row.id)}"><th scope="row"><b>${esc(row.label)}</b><span>${esc(row.note)}</span>${!row.rank?`<small>${row.scale?'공통 눈금 0–100':'선택 대상 최대값 기준 막대'}</small>`:''}</th>${entries.map((e,i)=>metricCell(e,row,i,max)).join('')}</tr>`;}).join('')}</tbody></table></div>`;
}
export function renderComparisonBoard(entries,{role='public',accessMarkup=''}={}){
 const groups=boardRows(entries),insights=comparisonInsights(entries);
 const tabs=[['overview','핵심 비교','가장 중요한 차이부터'],['attention','관심과 보도','검색량과 보도 규모'],['activity','활동','관측된 활동 수치'],['diagnosis','항목별 분석','같은 항목의 분석지수']];
 return `<section class="compare-board" data-compare-board ${role==='paid'?'data-paid-analysis="compare"':''} style="--board-count:${entries.length}"><header class="cb-heading"><div><span class="cb-kicker">JCS COMPARE</span><h1>차이를 보는 시간.</h1><p>같은 항목, 같은 눈금. ${entries.length}명의 정치인을 나란히 비교합니다.</p></div><span class="cb-access">${({admin:'심층 분석',paid:'24시간 심층 분석',member:'회원 분석',public:'공개 분석'})[role]||'공개 분석'}</span></header>${accessMarkup}<div class="cb-insights" aria-label="눈여겨볼 차이">${insights.length?insights.map((item,index)=>`<article><span>${index===0?'가장 큰 지수 차이':'함께 볼 지수 차이'}</span><strong>${number(item.gap)}<small>p</small></strong><h3>${esc(item.title)}</h3><p>${item.gap?esc(item.names.join(' · '))+'의 수치가 높습니다.':'선택한 인물의 수치가 같습니다.'}</p><small>${esc(item.date)} · 동일 분석 버전</small></article>`).join(''):'<article class="cb-insight-empty"><h3>같은 기준에서 확인하세요.</h3><p>기준일과 분석 버전이 같은 항목만 격차를 요약합니다. 아래 표에서 제공된 수치와 기준을 확인할 수 있습니다.</p></article>'}</div><div class="cb-tools"><nav class="cb-tabs" role="tablist" aria-label="비교 항목">${tabs.map(([id,label],i)=>`<button type="button" id="cb-tab-${id}" role="tab" data-board-tab="${id}" aria-selected="${i===0}" aria-controls="cb-panel-${id}" tabindex="${i===0?'0':'-1'}">${label}</button>`).join('')}</nav><div class="cb-scroll-tools"><span>좌우로 비교</span><button type="button" data-board-shift="-1" aria-label="이전 인물 보기">←</button><button type="button" data-board-shift="1" aria-label="다음 인물 보기">→</button></div></div>${tabs.map(([id,label,sub],i)=>`<section id="cb-panel-${id}" role="tabpanel" aria-labelledby="cb-tab-${id}" data-board-panel="${id}"${i?' hidden':''}><div class="cb-panel-heading"><h2>${label}</h2><span>${sub}</span></div>${table(entries,groups[id],label)}</section>`).join('')}<footer class="cb-method"><p>JCS 분석지수는 정참시의 분석값이며, 실제 지지율이나 시민 투표 점수가 아닙니다. 높은 수치가 모든 항목에서 좋은 평가를 의미하지는 않습니다.</p><p>집계 기간·출처·직책이 다른 경우 수치 해석에 차이가 있습니다. 해석과 기준을 확인하고, 자세한 내용은 각 인물의 상세페이지에서 확인하세요.</p></footer></section>`;
}
