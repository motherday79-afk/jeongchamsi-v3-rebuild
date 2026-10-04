import {compareParty,compareFlag} from '../ui/compare-party.js?v=0.0.31.423';
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
function stage(entries,row){
 const values=entries.map(e=>row.value(e)),max=Math.max(1,...values.filter(v=>v!==null)),min=Math.min(...values.filter(v=>v!==null));
 return '<div class="election-stage" style="--board-count:'+entries.length+'">'+entries.map((entry,i)=>{const p=entry.item,v=values[i],paint=compareParty(p.party).color,width=v===null?0:row.rank?Math.max(8,100-(v-min)/Math.max(1,max)*85):Math.max(0,Math.min(100,v/(row.scale||max)*100));return '<article class="election-person" style="--candidate:'+paint+'"><div class="election-backdrop"></div>'+compareFlag(p.party)+'<div class="election-face">'+portrait(p)+'</div><div class="election-identity"><span>'+esc(p.party||'소속 미등록')+'</span><h2>'+esc(p.name)+'</h2><p>'+esc(p.office||p.roleLabel||p.jurisdiction||'')+'</p></div><div class="election-number"><strong>'+ (v===null?'—':number(v))+'</strong><span>'+ (v===null?'미집계':row.unit)+'</span></div>'+(!row.rank?'<div class="election-bar"><i style="width:'+width+'%"></i></div>':'')+'<a class="election-detail" href="/person/'+encodeURIComponent(p.id)+'" data-layout-route="/person/'+esc(p.id)+'">인물 상세보기</a></article>';}).join('')+'</div>';
}
export function renderComparisonBoard(entries,{role='public',accessMarkup=''}={}){
 const rows=boardRows(entries),pc=rows.attention.find(r=>r.id==='pc'),mobile=rows.attention.find(r=>r.id==='mobile');
 const search={id:'search',label:'검색 관심도',unit:'회',note:'PC + 모바일 검색량',value:e=>{const a=pc?.value(e),b=mobile?.value(e);return a==null||b==null?null:a+b;}};
 const empty=(id,label,unit)=>({id,label,unit,value:()=>null});
 const panels=[['rank','나우랭크',[rows.overview[0]]],['search','검색 관심도',[search,...rows.attention.filter(r=>['pc','mobile'].includes(r.id))]],['media','언론 노출',rows.attention.filter(r=>['articles','sources'].includes(r.id))],['activity','정치활동',rows.activity.filter(r=>['activities','initiative'].includes(r.id))],['diagnosis','JCS 분석',rows.diagnosis]];
 return '<section class="compare-board election-broadcast" data-compare-board '+(role==='paid'?'data-paid-analysis="compare"':'')+'><header class="cb-heading"><div><span class="cb-kicker">JCS COMPARE</span><h1>같은 무대, 다른 정치.</h1></div><span class="cb-access">'+entries.length+'명 비교</span></header>'+accessMarkup+'<nav class="cb-tabs election-tabs" role="tablist" aria-label="비교 항목">'+panels.map(([id,label],i)=>'<button role="tab" id="cb-tab-'+id+'" data-board-tab="'+id+'" aria-selected="'+!i+'" aria-controls="cb-panel-'+id+'" tabindex="'+(i?-1:0)+'">'+label+'</button>').join('')+'</nav>'+panels.map(([id,label,metrics],i)=>{if(!metrics.length)metrics=[empty(id,label,'')];return '<section id="cb-panel-'+id+'" data-board-panel="'+id+'" role="tabpanel" aria-labelledby="cb-tab-'+id+'"'+(i?' hidden':'')+'><div class="election-panel-tools"><h2>'+label+'</h2>'+(metrics.length>1?'<label>세부 항목 <select data-election-metric>'+metrics.map((r,n)=>'<option value="'+n+'">'+esc(r.label)+'</option>').join('')+'</select></label>':'')+'<span class="election-swipe">좌우로 넘겨 비교</span></div>'+metrics.map((r,n)=>'<div data-election-view="'+n+'"'+(n?' hidden':'')+'>'+stage(entries,r)+'<p class="election-caption">'+esc(r.note||r.label)+(r.rank?'':' · 동일 항목·공통 눈금 비교')+'</p></div>').join('')+'</section>';}).join('')+'<footer class="cb-method"><p>JCS 분석지수는 정참시 분석값입니다. 검색량·보도량·활동 수치는 집계 범위와 기준일에 따라 해석해 주세요.</p></footer></section>';
}
