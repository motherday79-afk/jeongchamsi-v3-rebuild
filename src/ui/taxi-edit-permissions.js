import {isSuperAdmin} from '../core/membership.js?v=0.0.31.354';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chip=p=>`<button type="button" data-taxi-grant-remove="${esc(p.id)}" data-person-name="${esc(p.name)}" aria-label="${esc(p.name)} 선택 해제">${esc(p.name)} <span aria-hidden="true">×</span></button>`;
export function renderTaxiEditPermission(user){
 if(isSuperAdmin(user))return '<section class="person-permission-panel"><h3>리얼택시 숫자 편집</h3><p>최고관리자는 모든 정치인의 택시 수치를 편집할 수 있습니다.</p></section>';
 const grant=user.taxiPageEditing||{scope:'off'},people=grant.people||[],last=grant.updatedAt?new Date(grant.updatedAt).toLocaleString('ko-KR'):'';
 return `<form class="person-permission-panel" data-taxi-permission="${esc(user.id)}"><h3>리얼택시 숫자 편집 권한</h3><p>택시 수치만 수정할 수 있는 권한입니다. 정치인 상세페이지 편집 권한과 별도로 적용됩니다.</p><label>편집 범위<select name="scope"><option value="off" ${grant.scope==='off'?'selected':''}>권한 없음</option><option value="all" ${grant.scope==='all'?'selected':''}>모든 정치인</option><option value="selected" ${grant.scope==='selected'?'selected':''}>지정한 정치인만</option></select></label><div data-taxi-grant-picker ${grant.scope==='selected'?'':'hidden'}><label>정치인 검색<input type="search" data-taxi-grant-search placeholder="이름이나 지역으로 검색" autocomplete="off"></label><div class="person-permission-results" data-taxi-grant-results aria-live="polite"></div><div class="person-permission-selected" data-taxi-grant-selected>${people.map(chip).join('')}</div></div><footer><button class="primary-btn" type="submit">편집 권한 저장</button><span data-taxi-grant-state role="status" aria-live="polite">${last?'마지막 변경 '+esc(last):''}</span></footer></form>`;
}
const bound=new WeakSet();
export function bindTaxiEditPermissions(root=document){
 if(bound.has(root))return;bound.add(root);
 const searches=new WeakMap();
 root.addEventListener('change',e=>{const form=e.target.closest('[data-taxi-permission]');if(form&&e.target.name==='scope')form.querySelector('[data-taxi-grant-picker]').hidden=e.target.value!=='selected';});
 root.addEventListener('input',e=>{
  if(!e.target.matches('[data-taxi-grant-search]'))return;
  const input=e.target,form=input.closest('form'),results=form.querySelector('[data-taxi-grant-results]'),previous=searches.get(input);clearTimeout(previous?.timer);previous?.controller?.abort();
  const q=input.value.trim();results.replaceChildren();if(!q)return;
  const state={controller:new AbortController()};searches.set(input,state);
  state.timer=setTimeout(async()=>{results.textContent='검색 중…';try{const response=await fetch('/api/v3/politicians?q='+encodeURIComponent(q)+'&limit=12',{credentials:'same-origin',signal:state.controller.signal}),data=await response.json();if(searches.get(input)!==state||!input.isConnected)return;if(!response.ok)throw Error();results.innerHTML=(data.items||[]).map(p=>`<button type="button" data-taxi-grant-add="${esc(p.id)}" data-person-name="${esc(p.name)}"><b>${esc(p.name)}</b><span>${esc([p.party,p.jurisdiction].filter(Boolean).join(' · '))}</span><em>추가</em></button>`).join('')||'검색 결과가 없습니다.';}catch(err){if(err.name!=='AbortError')results.textContent='검색하지 못했습니다. 다시 입력해 주세요.';}},250);
 });
 root.addEventListener('click',e=>{
  const remove=e.target.closest('[data-taxi-grant-remove]');if(remove){remove.remove();return;}
  const add=e.target.closest('[data-taxi-grant-add]');if(!add)return;
  const form=add.closest('form'),selected=form.querySelector('[data-taxi-grant-selected]');
  if(![...selected.children].some(x=>x.dataset.taxiGrantRemove===add.dataset.taxiGrantAdd))selected.insertAdjacentHTML('beforeend',chip({id:add.dataset.taxiGrantAdd,name:add.dataset.personName}));
  form.querySelector('[data-taxi-grant-state]').textContent='선택했습니다. 편집 권한 저장을 눌러 적용하세요.';
 });
 root.addEventListener('submit',async e=>{
  const form=e.target.closest('[data-taxi-permission]');if(!form)return;e.preventDefault();if(form.dataset.busy)return;
  const state=form.querySelector('[data-taxi-grant-state]'),scope=form.elements.scope.value,personIds=[...form.querySelectorAll('[data-taxi-grant-remove]')].map(x=>x.dataset.taxiGrantRemove);
  if(scope==='selected'&&!personIds.length){state.textContent='편집할 정치인을 한 명 이상 선택하세요.';return;}
  form.dataset.busy='true';const controls=[...form.querySelectorAll('button,input,select')];controls.forEach(x=>x.disabled=true);state.textContent='저장 중…';
  try{const response=await fetch('/api/v3/admin/taxi-edit-permissions',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:form.dataset.taxiPermission,scope,personIds})}),data=await response.json();if(!response.ok||!data.ok)throw Error(response.status===409?'다른 변경이 반영되었습니다. 새로고침 후 다시 저장하세요.':response.status===403?'최고관리자만 권한을 변경할 수 있습니다.':'권한을 저장하지 못했습니다. 다시 시도해 주세요.');
   const row=form.closest('[data-member-badge-row]');if(row){const user=JSON.parse(row.dataset.memberBadgePayload);user.taxiPageEditing=data.permission;row.dataset.memberBadgePayload=JSON.stringify(user);}
   state.textContent=scope==='off'?'편집 권한을 해제했습니다.':'편집 권한을 저장했습니다.';
  }catch(err){state.textContent=err.message;}finally{delete form.dataset.busy;controls.forEach(x=>x.disabled=false);}
 });
}
