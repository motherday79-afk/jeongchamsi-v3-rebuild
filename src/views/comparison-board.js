import {comparisonPeople,comparisonChart,comparisonDates} from './comparison-charts.js?v=0.0.31.449';
const list=v=>Array.isArray(v)?v:[];
const dateOf=v=>/^\d{4}-\d{2}-\d{2}/.test(String(v||''))?String(v).slice(0,10):'';
export const metricNumber=v=>v===null||v===undefined||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
const topic=(entry,id)=>list(entry.intelligence?.diagnoses).find(t=>t.id===id);
const display=(entry,kind)=>list(entry.intelligence?.diagnoses).find(t=>t.display?.kind===kind)?.display;
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
export function renderComparisonBoard(entries,{role='public',accessMarkup=''}={}){
 const rows=boardRows(entries);
 const panels=[['rank','나우랭크','전체 순위와 선택 인물 간 차이'],['search','검색 관심','PC와 모바일 검색량'],['media','언론 노출','기사 수와 보도 매체 수'],['activity','정치활동','활동 규모와 직접 선점 비중'],['diagnosis','JCS 분석','항목별 점수를 한눈에 비교']];
 return `<section class="compare-board election-broadcast compare-data449" data-compare-board style="--board-count:${entries.length}" ${role==='paid'?'data-paid-analysis="compare"':''}>
 <header class="cb-heading"><div><span class="cb-kicker">JCS COMPARE</span><h1>정치인 비교분석</h1></div><span class="cb-access">${entries.length}명 비교</span></header>${accessMarkup}
 ${comparisonPeople(entries)}
 <nav class="cb-tabs election-tabs" role="tablist" aria-label="비교 항목">${panels.map(([id,label],i)=>`<button role="tab" id="cb-tab-${id}" data-board-tab="${id}" aria-selected="${!i}" aria-controls="cb-panel-${id}" tabindex="${i?-1:0}">${label}</button>`).join('')}</nav>
 ${panels.map(([id,label,note],i)=>`<section id="cb-panel-${id}" data-board-panel="${id}" role="tabpanel" aria-labelledby="cb-tab-${id}"${i?' hidden':''}><div class="cx-panel-heading"><div><h2>${label}</h2><p>${note}</p></div><span class="cx-swipe">좌우로 넘겨 비교</span></div>${comparisonChart(id,entries,rows)}${comparisonDates(entries,id)}</section>`).join('')}
 <footer class="cb-method"><p>JCS 분석지수는 정참시 분석값입니다. 검색량·보도량·활동 수치는 집계 범위와 기준일에 따라 해석해 주세요.</p></footer></section>`;
}
