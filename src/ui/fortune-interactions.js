export function bindFortuneInteractions(root,{auth,onSaved=()=>{}}={}){
 if(!root||root.__jcsFortuneBound)return;root.__jcsFortuneBound=true;
 root.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-fortune-toggle]');
  if(toggle){event.preventDefault();const card=toggle.closest('.side-fortune'),form=card?.querySelector('[data-fortune-profile-form]'),intro=card?.querySelector('[data-fortune-intro]');if(!form)return;const next=form.hidden;form.hidden=!next;if(intro)intro.hidden=next;toggle.setAttribute('aria-expanded',String(next));return;}
  const cancel=event.target.closest('[data-fortune-cancel]');
  if(cancel){event.preventDefault();const card=cancel.closest('.side-fortune'),form=card?.querySelector('[data-fortune-profile-form]'),intro=card?.querySelector('[data-fortune-intro]'),toggle=card?.querySelector('[data-fortune-toggle]');if(form)form.hidden=true;if(intro)intro.hidden=false;if(toggle)toggle.setAttribute('aria-expanded','false');}
 });
 root.addEventListener('change',event=>{
  const form=event.target.closest('[data-fortune-profile-form]');if(!form)return;
  if(event.target.name==='calendarType'){const leap=form.querySelector('[data-fortune-leap]');if(leap)leap.hidden=event.target.value!=='lunar';}
  if(event.target.matches('[data-fortune-time-unknown]')){const time=form.querySelector('[data-fortune-birth-time]');if(time){time.disabled=event.target.checked;if(event.target.checked)time.value='';}}
 });
 root.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-fortune-profile-form]');if(!form)return;event.preventDefault();
  const state=form.querySelector('[data-fortune-state]'),submit=form.querySelector('[type="submit"]');if(submit?.disabled)return;
  const data=new FormData(form),input={birthDate:String(data.get('birthDate')||''),calendarType:String(data.get('calendarType')||'solar'),birthTime:String(data.get('birthTime')||''),birthTimeUnknown:data.get('birthTimeUnknown')==='true',isLeapMonth:data.get('isLeapMonth')==='true'};
  if(submit)submit.disabled=true;if(state)state.textContent='오늘의 운세를 계산하고 있습니다…';
  try{const result=await auth.saveFortuneProfile(input);if(!result?.ok){const messages={FORTUNE_BIRTH_DATE_INVALID:'생년월일을 확인해 주세요.',FORTUNE_BIRTH_TIME_INVALID:'출생시간을 확인해 주세요.',FORTUNE_CALENDAR_INVALID:'양력·음력 선택을 확인해 주세요.',FORTUNE_ENGINE_UNAVAILABLE:'운세 엔진을 불러오지 못했습니다. 배포 상태를 확인해 주세요.'};if(state)state.textContent=messages[result?.error]||'운세 프로필을 저장하지 못했습니다.';return;}if(state)state.textContent='저장했습니다.';await onSaved(result);}catch{if(state)state.textContent='운세 프로필을 저장하지 못했습니다. 다시 시도해 주세요.';}finally{if(submit)submit.disabled=false;}
 });
}
