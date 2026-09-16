import {renderActivityHint,renderActivityReceipt} from '../views/activity-points.js?v=0.0.31.178';

const integer=(value,fallback=0)=>{const parsed=Number(value);return Number.isSafeInteger(parsed)?parsed:fallback;};
const storageDefault=()=>globalThis.sessionStorage;
const generateDefault=()=>globalThis.crypto?.randomUUID?.()||`activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const storageKey=form=>`jcs-activity-request:${String(form?.dataset?.activityUser||'guest')}:${String(form?.dataset?.activityRequestKey||'authoring')}`;
const stableSignature=data=>JSON.stringify(Object.fromEntries(Object.entries(data||{}).filter(([key])=>!['requestId','coverFile'].includes(key)).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,String(value??'')])));
const parse=value=>{try{return JSON.parse(value)||null;}catch{return null;}};

export function authoringResult(item,route){
 if(item?.error){const result={ok:false,error:item.error};if(item.status!=null)result.status=item.status;if(item.retryAfterSeconds!=null)result.retryAfterSeconds=item.retryAfterSeconds;return result;}
 return {ok:true,route,...(item?.activityReward?{activityReward:item.activityReward}:{})};
}

export function activityFormPayload(data,operation){
 const get=key=>data?.get?.(key),reason=String(get('reason')||'').trim();
 if(operation==='activity-policy')return {operation,policy:{enabled:['on','true','1',true].includes(get('enabled')),postPoints:integer(get('postPoints')),commentPoints:integer(get('commentPoints')),dailyLimit:integer(get('dailyLimit')),postMinLength:integer(get('postMinLength')),commentMinLength:integer(get('commentMinLength')),cooldownSeconds:integer(get('cooldownSeconds'))},reason};
 if(operation==='activity-restrict')return {operation,userId:String(get('userId')||''),hours:integer(get('hours')),reason,requestId:String(get('requestId')||'')};
 if(operation==='activity-revoke')return {operation,userId:String(get('userId')||''),eventId:String(get('eventId')||''),reason,requestId:String(get('requestId')||'')};
 return {operation};
}

export function activityRequestId(form,data,{storage=storageDefault(),generate=generateDefault}={}){
 const key=storageKey(form),signature=stableSignature(data),previous=parse(storage?.getItem?.(key));
 let requestId=previous?.requestId;
 if(!requestId||previous.outcome==='rejected'&&previous.signature!==signature)requestId=String(generate());
 const record={requestId,signature,outcome:previous?.signature===signature?previous?.outcome||'pending':'pending'};
 try{storage?.setItem?.(key,JSON.stringify(record));}catch{}
 const field=form?.querySelector?.('[name="requestId"]');if(field)field.value=requestId;
 if(form?.dataset)form.dataset.activityRequestId=requestId;
 return requestId;
}

export function settleActivityRequest(form,{outcome='success'}={}, {storage=storageDefault()}={}){
 const key=storageKey(form),previous=parse(storage?.getItem?.(key));
 if(outcome==='success'){try{storage?.removeItem?.(key);}catch{};if(form?.dataset)delete form.dataset.activityRequestId;return;}
 if(previous){previous.outcome=outcome;try{storage?.setItem?.(key,JSON.stringify(previous));}catch{}}
}

const feedbackKey='jcs-activity-feedback-178';
const rewardFrom=result=>result?.activityReward||result?.item?.activityReward||result?.comment?.activityReward;
export function rememberActivityFeedback(result,{storage=storageDefault(),identity=''}={}){
 const reward=rewardFrom(result),reversal=result?.activityReversal;
 if(!reward&&!reversal)return false;
 try{storage?.setItem?.(feedbackKey,JSON.stringify(reward?{kind:'reward',value:reward,identity}:{kind:'reversal',value:reversal,identity}));return true;}catch{return false;}
}
export function rememberSubmissionFeedback(result,{submittingIdentity='',currentIdentity='',storage=storageDefault()}={}){
 const current=typeof currentIdentity==='function'?currentIdentity():currentIdentity;
 if(!submittingIdentity||String(submittingIdentity).split(':')[0]!==String(current||'').split(':')[0])return false;
 return rememberActivityFeedback(result,{storage,identity:submittingIdentity});
}
export function consumeActivityFeedback({storage=storageDefault(),identity=''}={}){
 const record=parse(storage?.getItem?.(feedbackKey));if(!record)return '';
 try{storage?.removeItem?.(feedbackKey);}catch{}
 if(identity&&record.identity&&String(record.identity).split(':')[0]!==String(identity).split(':')[0])return '';
 if(record.kind==='reward')return renderActivityReceipt(record.value);
 const value=record.value||{};return `<div class="activity-receipt is-reversed" role="status"><b>삭제된 활동의 적립을 정산했습니다.</b><span>${Number(value.recovered||0).toLocaleString('ko-KR')}P 회수${Number(value.debtAdded)?` · 향후 활동 적립에서 ${Number(value.debtAdded).toLocaleString('ko-KR')}P 상계`:''}</span></div>`;
}

export function showActivityFeedback(root,{storage=storageDefault(),identity=''}={}){
 const html=consumeActivityFeedback({storage,identity});if(!html)return false;
 const old=root?.querySelector?.('[data-activity-feedback]');old?.remove?.();
 const mount=root?.createElement?root.createElement('div'):globalThis.document?.createElement?.('div');if(!mount)return false;
 mount.dataset.activityFeedback='true';mount.className='activity-feedback-toast';mount.setAttribute('aria-live','polite');mount.innerHTML=html;
 const target=root?.querySelector?.('.page-wrap')||root?.body||root;target?.prepend?.(mount);return true;
}

const hydrationSequence=new WeakMap(),hydrationOwner=new WeakMap();
export async function hydrateActivityHints(root,{loadStatus,getIdentity=()=>''}={}){
 const hints=[...(root?.querySelectorAll?.('[data-activity-hint]')||[])].filter(node=>node.isConnected!==false);if(!hints.length||typeof loadStatus!=='function')return false;
 const sequence=(hydrationSequence.get(root)||0)+1,owner={sequence};hydrationSequence.set(root,sequence);const identity=getIdentity();
 for(const node of hints){hydrationOwner.set(node,owner);node.innerHTML='<p class="activity-hint is-loading" role="status">현재 활동 포인트 기준을 확인하고 있습니다…</p>';}
 let result;try{result=await loadStatus();}catch{result=null;}
 if(hydrationSequence.get(root)!==sequence)return false;
 if(getIdentity()!==identity){for(const node of hints)if(hydrationOwner.get(node)===owner&&node.isConnected!==false&&root?.contains?.(node)!==false)node.innerHTML='';return false;}
 const activity=result?.activityRewards,authenticated=result?.status!==401&&identity!=='guest';
 for(const node of hints){if(hydrationOwner.get(node)!==owner||node.isConnected===false||root?.contains?.(node)===false)continue;node.innerHTML=activity?renderActivityHint(activity,node.dataset.activityHint||'post',{authenticated}):'<p class="activity-hint is-error">활동 포인트 기준을 불러오지 못했습니다. 작성은 계속할 수 있습니다.</p>';}
 return !!activity;
}

export function bindActivityPoints(root,{loadMemberPage}={}){
 root?.addEventListener?.('click',event=>{const button=event.target?.closest?.('[data-activity-member-page]');if(!button||typeof loadMemberPage!=='function')return;event.preventDefault?.();void loadMemberPage(button.closest?.('[data-member-points-panel]'),Number(button.dataset.activityMemberPage)||1);});
}
