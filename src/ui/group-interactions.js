const clean=v=>String(v??'').trim();
const bool=v=>v===true||v==='true'||v==='on'||v==='1';
export const groupErrorMessage=result=>({LOGIN_REQUIRED:'로그인 후 이용해 주세요.',GROUP_FORBIDDEN:'이 작업을 수행할 권한이 없습니다.',GROUP_NOT_FOUND:'모임을 찾을 수 없습니다.',GROUP_CONFLICT:'다른 변경이 먼저 저장되었습니다. 입력 내용을 유지한 채 새로고침 후 다시 시도해 주세요.',GROUP_INPUT_INVALID:'입력 내용을 확인해 주세요.',GROUP_REVIEW_REQUIRED:'관리자 승인이 필요합니다.',GROUP_EXAMPLE_READ_ONLY:'예시 모임은 읽기 전용입니다.',GROUP_OWNER_TRANSFER_REQUIRED:'모임을 닫거나 나가기 전에 모임장을 위임해 주세요.',GROUP_MEMBERS_ONLY:'승인된 모임원만 볼 수 있습니다.',GROUP_INVITE_INVALID:'초대 링크가 유효하지 않습니다.',GROUP_IMAGE_INVALID:'JPG, PNG 또는 WEBP 이미지를 선택해 주세요.',GROUP_IMAGE_TOO_LARGE:'이미지는 2MB 이하여야 합니다.',GROUP_MEDIA_NOT_CONFIGURED:'이미지 저장소가 준비되지 않았습니다.',GROUP_LIMIT_REACHED:'허용된 개수를 초과했습니다.',GROUP_STORAGE_FAILED:'이미지를 저장하지 못했습니다.'}[result?.error]||'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');

export function groupInputFromFormData(d,operation){
 if(operation==='create'||operation==='settings'){
  const input={name:clean(d.get('name')),category:clean(d.get('category')),description:clean(d.get('description')),region:clean(d.get('region')),rules:clean(d.get('rules')),visibility:clean(d.get('visibility'))};
  if(operation==='create')input.privacyAccepted=bool(d.get('privacyAccepted'));
  else if(bool(d.get('removeCover')))input.coverImageId='';
  else if(clean(d.get('coverImageId')))input.coverImageId=clean(d.get('coverImageId'));
  return input;
 }
 return {};

}
export function groupMutationFromForm(d){
 const operation=clean(d.get('operation')); let input={};
 if(operation==='comment')input={postId:clean(d.get('postId')),body:clean(d.get('body')),...(clean(d.get('requestId'))?{requestId:clean(d.get('requestId'))}:{})};
 else if(operation==='rsvp')input={eventId:clean(d.get('eventId')),response:clean(d.get('response'))};
 else if(operation==='member')input={userId:clean(d.get('userId')),decision:clean(d.get('decision')),reason:clean(d.get('reason'))};
 else if(operation==='review')input={decision:clean(d.get('decision')),reason:clean(d.get('reason'))};
 else if(operation==='join')input={privacyAccepted:bool(d.get('privacyAccepted'))};
 else if(operation==='notify')input={enabled:bool(d.get('enabled'))};
 else if(operation==='post')input={postId:clean(d.get('postId')),title:clean(d.get('title')),body:clean(d.get('body')),kind:clean(d.get('kind'))||'post',imageIds:clean(d.get('imageIds')).split(',').filter(Boolean),...(clean(d.get('requestId'))?{requestId:clean(d.get('requestId'))}:{})};
 else if(operation==='post-delete'||operation==='post-hide'||operation==='report')input={postId:clean(d.get('postId')), ...(operation==='post-hide'?{hidden:bool(d.get('hidden')),reason:clean(d.get('reason'))}:operation==='report'?{body:clean(d.get('body'))}:{reason:clean(d.get('reason'))})};
 else if(operation==='comment-delete')input={postId:clean(d.get('postId')),commentId:clean(d.get('commentId')),reason:clean(d.get('reason'))};
 else if(operation==='event'){const iso=v=>{if(!v)return undefined;const date=new Date(!/[zZ]|[+-]\d\d:\d\d$/.test(v)?`${v}:00+09:00`:v);return Number.isFinite(date.getTime())?date.toISOString():undefined;},hasEnd=typeof d.has==='function'?d.has('endsAt'):d.get('endsAt')!==null;const end=clean(d.get('endsAt'));input={eventId:clean(d.get('eventId')),title:clean(d.get('title')),body:clean(d.get('body')),startsAt:iso(clean(d.get('startsAt'))),...(hasEnd?{endsAt:end?iso(end):''}:{}),place:clean(d.get('place'))};}
 else if(operation==='event-delete')input={eventId:clean(d.get('eventId')),reason:clean(d.get('reason'))};
 else if(operation==='transfer')input={userId:clean(d.get('userId'))};
 else if(operation==='close')input={reason:clean(d.get('reason'))};
 else if(operation==='settings')input=groupInputFromFormData(d,'settings');
 return {operation,input};
}
function browserLocation(){return globalThis.location||{pathname:'',search:''};}
function currentId(root,form){const raw=clean(form.querySelector('[name=id]')?.value||root.querySelector('[data-group-id]')?.dataset.groupId||browserLocation().pathname.split('/')[2]||'');try{return decodeURIComponent(raw);}catch{return raw;}}
function setBusy(form,busy){if(busy)form.dataset.groupSubmitting='true';else delete form.dataset.groupSubmitting;for(const el of form.querySelectorAll('button,input,select,textarea'))el.disabled=busy;}
function updateVersion(root,result,expected=null){const detail=root.querySelector('[data-group-version]');if(detail&&(!expected||detail===expected)&&detail.isConnected!==false&&Number.isFinite(Number(result?.version??result?.item?.version)))detail.dataset.groupVersion=String(result.version??result.item.version);}
export function bindGroupInteractions(root,{client,onSaved=async()=>{}}={}){
 root.addEventListener('submit',async event=>{
  const form=event.target.closest?.('[data-group-create-form],[data-group-post-form],[data-group-event-form],[data-group-member-form],[data-group-settings-form],[data-group-review-form],[data-group-action-form]');if(!form)return;
  event.preventDefault();if(form.dataset.groupUploading==='true'||form.dataset.groupSubmitting==='true')return;if(form.dataset.groupUploadError){const state=form.querySelector('[data-group-state]');if(state)state.textContent=form.dataset.groupUploadError;return;}if(form.dataset.groupConflictBlocked==='true'){const state=form.querySelector('[data-group-state]');if(state)state.textContent='최신 저장 내용을 확인한 뒤 확인 버튼을 눌러 주세요.';return;}const state=form.querySelector('[data-group-state]');let data=new FormData(form);const activityEligible=!!form.dataset.activityRequestKey;if(activityEligible){activityRequestId(form,Object.fromEntries(data));data=new FormData(form);}const creating=form.matches('[data-group-create-form]');const mutation=creating?{operation:'create',input:groupInputFromFormData(data,'create')}:groupMutationFromForm(data),startLocation=`${browserLocation().pathname}${browserLocation().search}`;if(mutation.operation==='post'&&mutation.input.kind==='gallery'&&!mutation.input.imageIds.length){if(state)state.textContent='갤러리에는 사진을 한 장 이상 올려 주세요.';return;}if(mutation.operation==='review'&&mutation.input.decision==='reject'&&!mutation.input.reason){if(state)state.textContent='반려 사유를 입력해 주세요.';return;}setBusy(form,true);if(state)state.textContent='저장하고 있습니다.';
  try{const detail=root.querySelector('[data-group-version]'),submittedId=creating?'':currentId(root,form),submittedInvite=new URLSearchParams(browserLocation().search).get('invite')||'',isCurrent=()=>`${browserLocation().pathname}${browserLocation().search}`===startLocation&&root.querySelector('[data-group-version]')===detail&&form.isConnected!==false;const result=await client.save({id:submittedId,version:Number(form.querySelector('[name=version]')?.value||detail?.dataset.groupVersion)||0,...mutation,invite:submittedInvite});if(!isCurrent()){if(result.ok)await onSaved(result,null);return;}if(!result.ok){if(activityEligible)settleActivityRequest(form,{outcome:'rejected'});if(result.error==='GROUP_CONFLICT'&&!creating&&typeof client.get==='function'){const latest=await client.get(submittedId,{invite:submittedInvite});if(!isCurrent())return;if(latest.ok){form.dataset.groupConflictBlocked='true';form.dataset.groupConflictVersion=String(latest.item?.version||0);const saved=mutation.operation==='post'?(latest.item?.posts||[]).find(p=>p.id===mutation.input.postId):latest.item;const summary=mutation.operation==='post'?`최신 저장 글: ${saved?.title||'삭제됨'} / ${saved?.body||''}`:`최신 저장 모임: ${saved?.name||''} / ${saved?.description||''}`;if(state)state.textContent=`입력 내용은 유지되었습니다. ${summary}`;const accept=form.querySelector('[data-group-conflict-accept]');if(accept){accept.hidden=false;accept.disabled=false;}}}else if(state)state.textContent=result.error==='ACTIVITY_RATE_LIMIT'?`작성 간격을 지켜 주세요. ${Number(result.retryAfterSeconds||1)}초 후 다시 시도할 수 있습니다.`:groupErrorMessage(result);return;}const actor=form.dataset.activityUser||detail?.dataset.activityUser||'';if(activityEligible){rememberActivityFeedback(result,{identity:actor});settleActivityRequest(form,{outcome:'success'});}else rememberActivityFeedback(result,{identity:actor});updateVersion(root,result,detail);if(state)state.textContent='저장했습니다.';if(`${browserLocation().pathname}${browserLocation().search}`!==startLocation){await onSaved(result,null);return;}const preservedSearch=browserLocation().search.includes('tab=')?browserLocation().search:'';const route=mutation.operation==='leave'?'/groups?view=mine':creating&&result.item?.id?`/groups/${encodeURIComponent(result.item.id)}`:result.item?.id?`/groups/${encodeURIComponent(result.item.id)}${preservedSearch}`:'/groups';await onSaved(result,route);}catch{if(activityEligible)settleActivityRequest(form,{outcome:'unknown'});if(state)state.textContent=groupErrorMessage({});}finally{setBusy(form,false);}
 });
 root.addEventListener('change',async event=>{const kind=event.target.closest?.('[name=kind]');if(kind){const form=kind.closest('form'),images=form?.querySelector('[name=imageIds]'),body=form?.querySelector('[name=body]'),hint=form?.querySelector('[data-activity-hint]');if(images)images.dataset.galleryRequired=kind.value==='gallery'?'true':'false';if(body)body.required=kind.value!=='gallery';if(hint)hint.hidden=kind.value==='notice';return;}const memberDecision=event.target.closest?.('[data-group-member-decision]');if(memberDecision){const reason=memberDecision.closest('form')?.querySelector('[name=reason]');if(reason)reason.required=memberDecision.value==='remove';return;}const decision=event.target.closest?.('[data-group-review-decision]');if(decision){const reason=decision.closest('form')?.querySelector('[name=reason]');if(reason)reason.required=decision.value==='reject';return;}const input=event.target.closest?.('[data-group-upload]');if(!input||!input.files?.length)return;
  const form=input.closest('form');if(!form||form.dataset.groupUploading==='true'||form.dataset.groupSubmitting==='true')return;
  const state=form.querySelector('[data-group-state]'),id=currentId(root,form),detail=root.querySelector('[data-group-version]'),startLocation=`${browserLocation().pathname}${browserLocation().search}`,target=form.querySelector('[name=imageIds],[name=coverImageId]');
  const rejectUpload=message=>{form.dataset.groupUploadError=`${message} 이미지는 반영되지 않았고 설정·게시글 저장도 중단되었습니다. 파일을 다시 선택해 업로드하거나, 새로고침하여 이번 입력을 취소해 주세요.`;if(state)state.textContent=form.dataset.groupUploadError;};
  if(!id){rejectUpload('모임을 먼저 만든 뒤 이미지를 올릴 수 있습니다.');input.value='';return;}
  const existing=target?.name==='imageIds'?clean(target.value).split(',').filter(Boolean):[];
  if(existing.length+input.files.length>6){rejectUpload('사진은 게시물마다 최대 6장까지 올릴 수 있습니다.');input.value='';return;}
  form.dataset.groupUploading='true';setBusy(form,true);if(state)state.textContent='이미지를 올리고 있습니다. 완료될 때까지 기다려 주세요.';
  try{
   for(const file of [...input.files]){
    const result=await client.upload(id,file,{purpose:input.dataset.purpose||'gallery'});
    if(!result.ok){rejectUpload(groupErrorMessage(result));return;}
    if(target)target.value=target.name==='imageIds'?[...clean(target.value).split(',').filter(Boolean),result.image.id].join(','):result.image.id;
    if(`${browserLocation().pathname}${browserLocation().search}`===startLocation)updateVersion(root,result,detail);
   }
   delete form.dataset.groupUploadError;
   const removeCover=form.querySelector('[name=removeCover]');if(target?.name==='coverImageId'&&removeCover)removeCover.checked=false;
   if(state)state.textContent=target?.name==='coverImageId'?'이미지 업로드가 끝났습니다. 설정 저장을 눌러 대표 이미지 적용을 완료해 주세요.':'이미지 업로드가 끝났습니다. 글 저장을 눌러 적용을 완료해 주세요.';
  }catch{rejectUpload(groupErrorMessage({error:'GROUP_STORAGE_FAILED'}));}
  finally{input.value='';delete form.dataset.groupUploading;setBusy(form,false);}
 });
 root.addEventListener('click',event=>{const button=event.target.closest?.('[data-group-conflict-accept]');if(button){const form=button.closest('form'),detail=root.querySelector('[data-group-version]');if(!form)return;const versionInput=form.querySelector('[name=version]');if(versionInput)versionInput.value=form.dataset.groupConflictVersion;else if(detail)detail.dataset.groupVersion=form.dataset.groupConflictVersion;else return;delete form.dataset.groupConflictBlocked;delete form.dataset.groupConflictVersion;button.hidden=true;const state=form.querySelector('[data-group-state]');if(state)state.textContent='최신 저장 내용을 확인했습니다. 입력 내용을 다시 저장할 수 있습니다.';return;}const cancel=event.target.closest?.('[data-group-composer-cancel]');if(!cancel)return;const form=cancel.closest('form');if(form?.dataset?.groupUploading==='true'||form?.dataset?.groupSubmitting==='true')return;const panel=cancel.closest('details');if(panel)panel.open=false;});
}
import {activityRequestId,settleActivityRequest,rememberActivityFeedback} from './activity-points.js?v=0.0.31.178';
