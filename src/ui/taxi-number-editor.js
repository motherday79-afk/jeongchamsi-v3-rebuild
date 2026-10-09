import {brandMarkSvg} from './service-icons.js?v=0.0.31.394';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const renderTaxiNumberEditor=id=>`<button type="button" class="taxi-number-edit-icon" data-taxi-number-editor="${esc(id)}" aria-label="리얼택시 숫자 수정" title="리얼택시 숫자 수정">${brandMarkSvg('person-edit-brand-icon')}</button>`;
const names={rides:'운행 횟수',distanceMeters:'동승 거리 (m)',completed:'완주 횟수',likedRides:'공감한 운행 수',heard:'청취',likes:'공감',dropoffs:'하차',continued:'계속 듣기'};
async function request(id,body){const r=await fetch('/api/v3/admin/taxi-numbers'+(body?'':'?personId='+encodeURIComponent(id)),{credentials:'same-origin',signal:AbortSignal.timeout(20000),...(body?{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({personId:id,...body})}:{})});const data=await r.json();if(!r.ok)throw Error(r.status===409?'다른 수정이 먼저 저장되었습니다. 창을 닫고 다시 열어 주세요.':r.status===403?'이 정치인의 택시 수정 권한이 없습니다.':data.error==='INVALID_TOTALS'?'완주·공감·첫 만남·이야기별 횟수는 해당 전체 횟수를 넘을 수 없습니다.':'저장하지 못했습니다. 숫자와 연결 상태를 확인해 주세요.');return data;}
const bound=new WeakSet();
export function bindTaxiNumberEditor(root=document){
 if(bound.has(root))return;bound.add(root);
 root.addEventListener('click',async event=>{
  const button=event.target.closest?.('[data-taxi-number-editor]');if(!button||button.disabled)return;
  const id=button.dataset.taxiNumberEditor,dialog=document.createElement('dialog');dialog.className='taxi-number-dialog';dialog.innerHTML='<p role="status">수정할 숫자를 불러오는 중입니다.</p><button type="button" data-close>닫기</button>';document.body.append(dialog);dialog.showModal();
  const close=()=>{if(dialog.dataset.busy)return;dialog.close();dialog.remove();button.focus({preventScroll:true});};dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.onclick=e=>{if(e.target.closest('[data-close]'))close();};
  try{
   const data=await request(id);if(!dialog.isConnected)return;
   const input=(field,label)=>`<label><span>${esc(label)}</span><input type="number" min="0" max="1000000000000" step="1" required data-taxi-field="${esc(field)}" value="${data.values[field]||0}"></label>`;
   const group=(title,prefix,fields)=>`<fieldset><legend>${title}</legend><div class="taxi-number-fields">${fields.map(f=>input(prefix+f,names[f])).join('')}</div></fieldset>`;
   dialog.innerHTML=`<form><header><div><small>JCS REAL TAXI</small><h2>택시 숫자 수정</h2></div><button type="button" data-close aria-label="닫기">닫기</button></header><p class="taxi-number-guide">거리와 횟수만 수정합니다. 평균 거리·완주율은 자동 계산하며, 이후 실제 운행은 계속 누적됩니다. 나의 동승 기록은 변경하지 않습니다.</p>${group('전체 운행','',['rides','distanceMeters','completed','likedRides'])}${group('첫 만남','first:',['rides','distanceMeters','completed','likedRides'])}${Array.from({length:5},(_,i)=>group('이야기 '+(i+1),'beat:'+i+':',['heard','likes','dropoffs','continued'])).join('')}<p role="status" aria-live="polite"></p><footer><button type="button" data-reset>실제 집계값으로 복원</button><button type="submit">저장</button></footer></form>`;
   const save=async reset=>{
    if(dialog.dataset.busy)return;const changes={};for(const field of dialog.querySelectorAll('[data-taxi-field]')){const value=Number(field.value);if(!Number.isSafeInteger(value)||value<0||value>1e12){field.reportValidity();return;}if(value!==data.values[field.dataset.taxiField])changes[field.dataset.taxiField]=value;}
    const status=dialog.querySelector('[role=status]');if(!reset&&!Object.keys(changes).length){status.textContent='변경된 숫자가 없습니다.';return;}
    dialog.dataset.busy='true';dialog.querySelectorAll('button,input').forEach(el=>el.disabled=true);status.textContent='저장 중…';
    try{await request(id,{revision:data.revision,changes:reset?{}:changes,...(reset?{reset:true}:{})});delete dialog.dataset.busy;close();document.dispatchEvent(new CustomEvent('jcs:person-page-changed'));}
    catch(error){status.textContent=error.message;}finally{delete dialog.dataset.busy;dialog.querySelectorAll('button,input').forEach(el=>el.disabled=false);}
   };
   dialog.querySelector('form').onsubmit=e=>{e.preventDefault();void save(false);};dialog.querySelector('[data-reset]').onclick=()=>{if(confirm('수동 보정을 지우고 실제 운행 집계값으로 복원할까요?'))void save(true);};
  }catch(error){dialog.querySelector('[role=status]').textContent=error.message;}
 });
}
