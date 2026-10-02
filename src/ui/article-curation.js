const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const canCurateArticles=user=>!!user?.id&&user.role==='admin'&&user.status!=='suspended';
export const articleSlots=Object.freeze([
 ...Array.from({length:10},(_,i)=>({value:`headlines:${i}`,label:`하단 주요 뉴스 · ${i+1}번째`})),
 {value:'brand:0',label:'① 브랜드 · 대표 기사'},
 ...['24H','7D','30D'].flatMap(period=>Array.from({length:3},(_,i)=>({value:`competitor:${period}:${i}`,label:`⑤ 경쟁 비교 · ${period} · ${i+1}번째`}))),
 ...Array.from({length:5},(_,i)=>({value:`lifecycle:${i}`,label:`⑥ 이슈 생애주기 · ${i+1}번째`})),
 ...Array.from({length:5},(_,i)=>({value:`activity:${i}`,label:`⑨ 정치 활동 · ${i+1}번째`}))
]);
export function renderArticleEditor(personId,slot='headlines:0',name='',enabled=false){return `<button type="button" class="jcs-article-edit" data-article-editor="${esc(personId)}" data-article-slot="${esc(slot)}" data-article-person-name="${esc(name)}" aria-label="${esc(name)} 기사 편집">${enabled?'기사 정리 계속':'기사 정리 시작'}</button>`;}
export function renderArticleRecovery(personId,name=''){return `<button type="button" class="jcs-article-edit" data-article-recovery="${esc(personId)}" data-article-person-name="${esc(name)}">제외 기사 복구</button>`;}
export function filterArticleCandidates(items,query){const words=String(query||'').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);return items.filter(row=>words.every(word=>`${row.title||''} ${row.source||''} ${row.date||''}`.toLocaleLowerCase().includes(word)));}
export function availableArticleCandidates(data){const excluded=new Set((data.excluded||[]).map(row=>row.key));return (data.candidates||[]).filter(row=>!excluded.has(row.key));}
export function articleDate(value){if(!value)return '날짜 미상';const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).format(date):String(value);}
const safeUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const bindings=new WeakSet();
let current=null;
export function bindArticleCuration(root=document){
 if(bindings.has(root))return;bindings.add(root);
 root.addEventListener('click',event=>{const button=event.target.closest?.('[data-article-editor],[data-article-recovery]');if(!button)return;event.preventDefault();openEditor(button);});
}
async function openEditor(trigger){
 if(current){current.dialog.focus();return;}
 const personId=trigger.dataset.articleEditor||trigger.dataset.articleRecovery,recovery=trigger.hasAttribute('data-article-recovery'),dialog=document.createElement('dialog');
 dialog.className='jcs-article-dialog';dialog.setAttribute('aria-labelledby','jcs-article-dialog-title');
 dialog.innerHTML=`<header><div><small>ARTICLE EDITOR</small><h2 id="jcs-article-dialog-title">${esc(trigger.dataset.articlePersonName)} ${recovery?'제외 기사 복구':'기사 편집'}</h2></div><button type="button" data-curation-close aria-label="닫기">✕</button></header><p class="jcs-article-guide">${recovery?'제외했던 기사를 복구하면 자동 기사 선택에 다시 포함됩니다.':'기사를 고르고 원하는 위치에 바로 배치하세요. 제외하면 이 정치인의 모든 기사 영역에서 숨겨집니다.'}</p><div class="jcs-article-toolbar">${recovery?'':`<label>배치 위치<select data-curation-slot>${articleSlots.map(row=>`<option value="${row.value}">${row.label}</option>`).join('')}</select></label><button type="button" data-curation-operation="automatic">이 위치 자동 선택</button>`}<label class="jcs-article-search">기사 찾기<input type="search" data-curation-search placeholder="제목 · 매체 · 날짜 검색" autocomplete="off"></label></div><p class="jcs-article-selection" data-curation-selection></p><p class="jcs-article-status" role="status" aria-live="polite">기사를 불러오는 중입니다…</p><div class="jcs-article-list" data-curation-list></div><footer>변경 사항은 즉시 반영됩니다.</footer>`;
 document.body.append(dialog);current={dialog};
 const list=dialog.querySelector('[data-curation-list]'),status=dialog.querySelector('[role="status"]'),search=dialog.querySelector('[data-curation-search]'),select=dialog.querySelector('[data-curation-slot]');
 let data=null,busy=false;
 if(select)select.value=articleSlots.some(row=>row.value===trigger.dataset.articleSlot)?trigger.dataset.articleSlot:'headlines:0';
 const close=()=>{if(busy)return;dialog.close();dialog.remove();current=null;const target=trigger.isConnected?trigger:Array.from(document.querySelectorAll('[data-article-editor],[data-article-recovery]')).find(el=>(el.dataset.articleEditor||el.dataset.articleRecovery)===personId);target?.focus();};
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.querySelector('[data-curation-close]').addEventListener('click',close);
 const setBusy=value=>{busy=value;dialog.setAttribute('aria-busy',String(value));dialog.querySelectorAll('button,input,select').forEach(el=>el.disabled=value);};
 const draw=()=>{
  const rows=filterArticleCandidates(recovery?data.excluded||[]:availableArticleCandidates(data),search.value),placements=data.placements||{};
  dialog.querySelector('[data-curation-selection]').textContent=select?(placements[select.value]?'선택한 위치: 직접 배치한 기사':'선택한 위치: 자동 선택 중 · 기사를 배치하면 직접 선택으로 전환됩니다.'):'';
  list.innerHTML=rows.length?rows.map(row=>{const placed=articleSlots.filter(slot=>placements[slot.value]===row.key),here=select&&placements[select.value]===row.key,url=safeUrl(row.url);return `<article class="jcs-article-candidate${here?' is-current':''}"><div class="jcs-article-meta">${esc(row.source||'매체 미상')} · ${esc(articleDate(row.date))}</div><h3>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(row.title||'제목 없음')} ↗</a>`:esc(row.title||'제목 없음')}</h3>${placed.length?`<p class="jcs-article-placements">현재 배치: ${placed.map(slot=>esc(slot.label)).join(' · ')}</p>`:''}<div class="jcs-article-actions">${recovery?`<button type="button" data-curation-operation="restore" data-article-key="${esc(row.key)}">기사 복구</button>`:`<button type="button" data-curation-operation="place" data-article-key="${esc(row.key)}"${here?' disabled':''}>${here?'현재 이 위치에 배치됨':'여기에 배치'}</button><button type="button" class="is-exclude" data-curation-operation="exclude" data-article-key="${esc(row.key)}">이 정치인 기사에서 제외</button>`}</div></article>`;}).join(''):'<div class="jcs-article-empty">'+(search.value?'검색 결과가 없습니다. 다른 검색어를 입력해 주세요.':recovery?'제외된 기사가 없습니다.':'배치할 수 있는 수집 기사가 없습니다.')+'</div>';
  return rows.length;
 };
 const request=async body=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(`/api/v3/article-curation${body?'':`?personId=${encodeURIComponent(personId)}`}`,{signal:controller.signal,credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({personId,...body})}:{})});const result=await response.json();if(!response.ok||!result.ok)throw new Error(response.status===403?'기사 편집 권한이 없습니다.':response.status===401?'로그인 상태를 확인해 주세요.':'처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');return result;}catch(error){if(error.name==='AbortError')throw new Error('응답이 지연되고 있습니다. 창을 다시 열어 반영 여부를 확인해 주세요.');throw error;}finally{clearTimeout(timeout);}};
 search.addEventListener('input',()=>{if(data)status.textContent=`${draw()}개 기사`;});select?.addEventListener('change',()=>{if(data)draw();});
 dialog.addEventListener('click',async event=>{const button=event.target.closest('[data-curation-operation]');if(!button||busy||!data)return;const operation=button.dataset.curationOperation,previous=data,scrollTop=dialog.scrollTop;if(operation==='exclude'){data={...data,candidates:data.candidates.filter(row=>row.key!==button.dataset.articleKey)};draw();dialog.scrollTop=scrollTop;}setBusy(true);status.textContent='변경 사항을 반영하는 중입니다…';try{data=await request({operation,...(button.dataset.articleKey?{articleKey:button.dataset.articleKey}:{}),...(select?{slot:select.value}:{})});draw();status.textContent=operation==='exclude'?'이 정치인의 기사에서 제외했습니다.':operation==='restore'?'기사를 복구했습니다.':operation==='automatic'?'이 위치를 자동 선택으로 전환했습니다.':'선택한 위치에 배치했습니다.';document.dispatchEvent(new CustomEvent('jcs:article-curation-changed',{detail:{personId,operation}}));}catch(error){data=previous;status.textContent=error.message||'연결에 실패했습니다. 다시 시도해 주세요.';}finally{setBusy(false);draw();dialog.scrollTop=scrollTop;list.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}});
 dialog.showModal();setBusy(true);
 try{data=await request(recovery?undefined:{operation:'start'});if(!recovery){document.querySelectorAll('[data-article-editor]').forEach(el=>{if(el.dataset.articleEditor===personId)el.textContent='기사 정리 계속';});}status.textContent=`${draw()}개 기사 · ${recovery?'복구할':'배치할'} 기사를 선택하세요.`;}catch(error){status.textContent=error.message||'기사를 불러오지 못했습니다.';list.innerHTML='<p class="jcs-article-empty">창을 닫고 다시 열어 주세요.</p>';}finally{setBusy(false);if(data)draw();search.focus();}
}
