import {makeDailyReport} from '../core/daily-report.js?v=0.0.31.444';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const fmt=v=>num(v)===null?'—':v.toLocaleString('ko-KR',{maximumFractionDigits:1});
const list=v=>Array.isArray(v)?v:[];
const width=v=>Math.max(0,Math.min(100,Number(v)||0));
const safe=v=>/^https?:\/\//i.test(v||'')||/^\/(?!\/)/.test(v||'');
const text=v=>typeof v==='string'?v:typeof v?.statement==='string'?v.statement:'';
const paragraphs=values=>[...new Set(values.flatMap(v=>Array.isArray(v)?v:[v]).map(text).filter(Boolean))].map(v=>'<p>'+esc(v)+'</p>').join('');
const bars=(rows,key='value',label='label',unit='P')=>{const max=Math.max(1,...rows.map(r=>Number(r[key])||0));return '<div class="dr-bars">'+rows.map(r=>`<div><span>${esc(r[label]||r.name||r.age||'항목')}</span><i><em style="width:${width(Number(r[key])/max*100)}%"></em></i><b>${fmt(r[key])}<small>${unit}</small></b></div>`).join('')+'</div>';};
const stat=(label,value,unit='')=>`<div class="dr-stat"><span>${esc(label)}</span><b>${fmt(value)}<small>${unit}</small></b></div>`;

const TITLES={'01':'이미지와 인지도','02':'세대·성별 지지도','03':'지역 관심사','04':'지지층 구성','05':'다른 정치인과 비교','06':'주요 이슈','07':'언론 보도','08':'선거 준비','09':'정치 활동'};
const title=t=>TITLES[t.id]||t.title||'진단';
const top=(rows,key='value')=>list(rows).filter(r=>num(r[key])!==null).sort((a,b)=>b[key]-a[key])[0];
function conclusion(t){const d=t.display||{};
 if(t.id==='01'){const r=top(d.expansion?.axes);return r&&r.value>0?r.label+' 항목이 '+fmt(r.value)+'점으로 가장 높습니다.':'이미지와 인지도 점수를 비교해 보세요.';}
 if(t.id==='02'){const r=top(d.cohorts,'total');return r&&r.total>0?r.age+' 지지도가 가장 높습니다.':'세대별 남녀 지지도를 비교해 보세요.';}
 if(t.id==='03'){const r=top(d.issues,'count');return r&&r.count>0?r.label+' 관련 보도가 '+fmt(r.count)+'건입니다.':'지역 관련 보도를 모으고 있습니다.';}
 if(t.id==='04'){const r=top(d.composition);return r&&r.value>0?r.label+' 지수가 가장 높습니다.':'지지층별 점수를 비교해 보세요.';}
 if(t.id==='05'){const r=list(d.people)[0];return num(r?.overallRank)!==null?'본인의 전체 관심도 순위는 '+fmt(r.overallRank)+'위입니다.':'정치인별 관심도 순위를 비교해 보세요.';}
 if(t.id==='06')return list(d.lifecycle).length?'주요 이슈의 최근 7일 보도량입니다.':'집계된 주요 이슈가 없습니다.';
 if(t.id==='07')return num(d.articleCount)!==null?fmt(d.sourceCount)+'개 매체에서 '+fmt(d.articleCount)+'건 보도했습니다.':'보도 자료를 모으고 있습니다.';
 if(t.id==='08'){const r=top(d.foundations);return r&&r.value>0?r.label+' 점수가 가장 높습니다.':'선거 준비 항목별 점수를 비교해 보세요.';}
 return num(d.activityCount)!==null?'기사에서 확인한 활동은 '+fmt(d.activityCount)+'건입니다.':'확인된 활동을 모으고 있습니다.';
}
function headline(record){const media=record.topics?.find(t=>t.id==='07')?.display||{};
 if(num(media.articleCount)!==null&&media.articleCount>0)return fmt(media.sourceCount)+'개 매체가 '+fmt(media.articleCount)+'건의 기사를 보도했습니다.';
 if(num(record.rank?.overall)!==null)return '현재 전체 관심도 순위는 '+fmt(record.rank.overall)+'위입니다.';
 return '현재 활동을 판단할 자료를 모으고 있습니다.';
}

function visual(t){const d=t.display||{};
 if(t.id==='01')return `<div class="dr-brand">${stat('이미지 선명도',d.brandClarity?.average,'P')}${stat('이미지 일관성',d.imageConsistency?.average,'P')}${stat('확장 가능성',d.expansion?.percent,'%')}</div><div class="dr-skyline" aria-label="실제 이미지 일관성 기록">${list(d.imageConsistency?.bars).map(r=>`<div><b>${fmt(r.value)}</b><i style="height:${width(r.value)}%"></i><span>${esc(r.label||r.date||'')}</span></div>`).join('')}</div>${bars(list(d.expansion?.axes))}`;
 if(t.id==='02')return `<div class="dr-legend"><span>● 남성</span><span>● 여성</span></div><div class="dr-cohorts">${list(d.cohorts).map(r=>`<div><b>${esc(r.age)}</b><div><span style="--dr-value:${width(r.male)}%">남성 ${fmt(r.male)}%</span><span style="--dr-value:${width(r.female)}%">여성 ${fmt(r.female)}%</span></div></div>`).join('')}</div>`;
 if(t.id==='03')return `<div class="dr-route">${list(d.messagePath).map(r=>`<div><b>${esc(r.label||r.stage||'지역 의제')}</b>${num(r.value)!==null?'<strong class="dr-path-number">'+fmt(r.value)+'<small>P</small></strong>':''}</div>`).join('')}</div>${bars(list(d.issues),'share','label','%')}`;
 if(t.id==='04')return `<div class="dr-support">${list(d.composition).map((r,i)=>`<div style="--dr-tone:${['#41cfbf','#8dacff','#d3aa60'][i%3]}"><div class="dr-ring" style="--dr-value:${width(r.value)}%"><b>${fmt(r.value)}</b></div><strong>${esc(r.label)}</strong></div>`).join('')}</div><p class="dr-unit">항목별 점수 · 합계 100% 아님</p>`;
 if(t.id==='05')return `<div class="dr-podium">${list(d.people).map((r,i)=>`<div class="${i===0?'is-subject':''}"><span>${i===0?'본인':'비교 정치인'}</span><strong>${esc(r.name)}</strong><b>${fmt(r.overallRank)}<small>위</small></b><p>NOW 순위</p>${stat('경쟁 지수',r.competition?.index,'P')}</div>`).join('')}</div>`;
 if(t.id==='06')return `<div class="dr-route dr-risk">${list(d.lifecycle).slice(0,2).map(r=>`<div><small>${esc(r.date||r.stage||'이슈 흐름')}</small><b>${esc(r.title||r.label||r.issue||'관측 이슈')}</b><div class="dr-issue-days">${list(r.daily).slice(-7).map(day=>`<span><b>${fmt(day.count)}</b><small>${esc(day.date?.slice(5))}</small></span>`).join('')}</div><p class="dr-unit">최근 7일 보도 건수 · —는 기록 없음</p></div>`).join('')}</div>`;
 if(t.id==='07')return `<div class="dr-brand">${stat('집계 기사',d.articleCount,'건')}${stat('보도 매체',d.sourceCount,'곳')}${stat('주요 매체 비중',d.majorShare,'%')}</div>${bars(list(d.topSources||d.allSources).slice(0,5),'count','name','건')}`;
 if(t.id==='08')return `<div class="dr-foundations">${list(d.foundations).map((r,i)=>`<div><span>0${i+1}</span><strong>${esc(r.label)}</strong><b>${fmt(r.value)}<small>P</small></b><i style="--dr-value:${width(r.value)}%"></i></div>`).join('')}</div>`;
 return `<div class="dr-brand">${stat('확인된 활동',d.activityCount,'건')}${stat('먼저 다룬 이슈',d.initiative?.firstMover??d.firstMover,'건')}${stat('뒤이어 다룬 이슈',d.initiative?.joined??d.joined,'건')}</div>${bars(list(d.composition),'value','label','')}<div class="dr-route">${list(d.activities).slice(0,2).map(r=>`<div><small>${esc(r.date||r.category||'활동')}</small><b>${esc(r.title||r.label)}</b></div>`).join('')}</div>`;
}
export function renderReportComparison(result){
 if(!result?.ready)return `<div class="dr-empty"><b>${esc(result?.reason||'기록 축적 중')}</b><p>해당 날짜의 저장 기록이 확보되면 실제 변화가 표시됩니다.</p></div>`;
 return `<p class="dr-period-date">${esc(result.from)} → ${esc(result.to)}${result.rankDelta===null?'':' · NOW 순위 '+(result.rankDelta>0?result.rankDelta+'계단 상승':result.rankDelta<0?Math.abs(result.rankDelta)+'계단 하락':'변동 없음')}</p><div class="dr-change-grid">${result.rows.map(r=>`<article><span>${esc(r.id)} · ${esc(title(r))}</span><div><b>${fmt(r.before)}</b><i>→</i><b>${fmt(r.after)}</b><strong>${r.delta===null?'비교 자료 없음':(r.delta>0?'+':'')+fmt(r.delta)+'P'}</strong></div></article>`).join('')}</div><p class="dr-unit">위험도 점수는 높아질수록 주의가 필요합니다.</p>`;
}
export function renderDailyReportBody(record,{inline=(o,k,v)=>v}={}){
 const summary=record.summary||{},d=summary.display||{};
 const field=(o,k)=>inline(o,k,esc(o?.[k]||''));
 const evidence=new Map();for(const n of record.news||[])if(n.url&&safe(n.url))evidence.set(n.url,n);
 for(const t of record.topics||[]){for(const n of list(t.evidence))if(n.url&&safe(n.url)&&!evidence.has(n.url))evidence.set(n.url,{title:n.title||n.label||n.detail||n.url,source:n.source||n.type,url:n.url});}
 return `<div class="dr-hero"><div class="dr-profile">${safe(record.photo)?`<img src="${esc(record.photo)}" alt="${esc(record.name)}" loading="lazy">`:''}<div><small>JCS DAILY REPORT</small><h3>${esc(record.name)}</h3><p>${esc([record.party,record.office].filter(Boolean).join(' · '))}</p></div></div><div class="dr-score">${stat('종합점수',d.totalScore??summary.score,'P')}${stat('전체 NOW',record.rank?.overall,'위')}</div><div class="dr-headline"><span>한 줄 진단</span><h3>${esc(headline(record))}</h3></div><p class="dr-asof">${record.date?'자료 기준 '+esc(record.date):'자료 기준일 확인 중'}</p></div>
 <section class="dr-change"><header><div><small>CHANGE TRACKER</small><h3>무엇이 달라졌나</h3></div><nav aria-label="변화 비교 기간">${['24H','7D','30D'].map(p=>`<button type="button" data-dr-period="${p}" aria-pressed="${p==='24H'}">${p}</button>`).join('')}</nav></header><div data-dr-comparison><div class="dr-empty"><b>24H · 7D · 30D 변화 비교</b><p>기간을 누르면 저장된 기록과 비교합니다.</p></div></div></section>
 <div class="dr-section-heading"><small>THE BIG PICTURE</small><h3>9개 진단으로 보는 현재 위치</h3></div><div class="dr-scenes">${(record.topics||[]).map(t=>`<section class="dr-scene dr-scene-${esc(t.id)}"><header><span>${esc(t.id)}</span><h3>${esc(title(t))}</h3><b>${fmt(t.score)}<small>P</small></b></header><div class="dr-visual">${visual(t)}</div><div class="dr-context"><strong>${esc(conclusion(t))}</strong></div></section>`).join('')}</div>
 <div class="dr-assessment">${['강점','보완할 점'].map((label,i)=>{const ids=i?record.assessment?.managementIds:record.assessment?.strongIds;const rows=(record.topics||[]).filter(t=>ids?.includes(t.id)).slice(0,2);return '<section><h3>'+label+'</h3>'+rows.map(t=>'<p><b>'+esc(title(t))+'</b> · '+fmt(t.score)+'점</p>').join('')+(rows.length?'':'<p>자료를 모으고 있습니다.</p>')+'</section>';}).join('')}</div>
 <details class="dr-evidence"><summary>판단 근거 보기</summary><ol>${[...evidence.values()].map(n=>`<li><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a><span>${esc(n.source||'관련 기사')} ${esc(n.date||'')}</span></li>`).join('')}</ol>${(record.topics||[]).map(t=>`<details><summary>${esc(t.id)} · ${esc(title(t))} 근거</summary><p>${field(t,'headline')}</p>${paragraphs([t.currentPosition,t.politicalMeaning,t.changeCause,t.changeReason,t.interpretation,t.display?.detail,...list(t.supportingData).map(n=>[n.label,n.value,n.basis].filter(v=>v!==undefined&&v!==null).join(' · ')),...list(t.evidence).map(n=>n.detail||n.statement||n.title||[n.label,n.value].filter(v=>v!==undefined&&v!==null).join(' · '))])}</details>`).join('')}</details>`;
}
export function renderDailyReport(report,person,inline){const record=makeDailyReport(person,report);return `<div class="dr-report" data-daily-report="${esc(person.id)}"><div class="dr-toolbar"><b>날짜별 종합 보고서</b><label>기록일 <input type="date" data-dr-date aria-label="저장된 보고서 날짜"></label><button type="button" data-dr-current>최신 보기</button><span data-dr-status role="status"></span></div><div data-dr-body>${renderDailyReportBody(record,{inline})}</div></div>`;}
