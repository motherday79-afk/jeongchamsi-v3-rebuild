import { DEFAULT_RANKING_WEIGHTS, rankingWeightLabel } from '../core/ranking-weights.js?v=0.0.31.174';

const pendingSaves=new WeakSet();

export function updateRunningRankingWeights(root,job){
  const mount=root.querySelector('[data-ranking-weights-running]');if(!mount)return;
  mount.hidden=job?.status!=='RUNNING';
  if(!mount.hidden)mount.querySelector('b').textContent=rankingWeightLabel(job.rankingWeights??DEFAULT_RANKING_WEIGHTS);
}

export function rankingWeightsReady(root){
  const form=root.querySelector('[data-ranking-weights-form]');
  if(!form)return !pendingSaves.has(root);
  const state=form.querySelector('[data-ranking-weights-state]');
  if(pendingSaves.has(root)){state.textContent='비율을 저장 중입니다. 완료 후 게시해 주세요.';return false;}
  if(String(form.elements.news.value)!==form.dataset.savedNews){state.textContent='변경한 비율을 먼저 저장한 뒤 게시해 주세요.';form.elements.news.focus();return false;}
  return true;
}

export function bindRankingWeights(root,{auth,onSaved}={}){
  root.addEventListener('change',event=>{
    const form=event.target.closest('[data-ranking-weights-form]');if(!form||pendingSaves.has(root))return;
    form.querySelector('[data-ranking-weights-state]').textContent=String(form.elements.news.value)===form.dataset.savedNews?'':'선택한 비율을 저장해 주세요.';
  });
  root.addEventListener('submit',async event=>{
    const form=event.target.closest('[data-ranking-weights-form]');if(!form)return;
    event.preventDefault();if(pendingSaves.has(root)){form.querySelector('[data-ranking-weights-state]').textContent='비율을 저장 중입니다. 완료 후 다시 선택해 주세요.';return;}
    const news=Number(form.elements.news.value),weights={news,search:100-news},state=form.querySelector('[data-ranking-weights-state]'),controls=[...form.querySelectorAll('select,button')];
    const showState=message=>{const current=root.querySelector('[data-ranking-weights-state]');if(current)current.textContent=message;};
    pendingSaves.add(root);form.dataset.busy='true';controls.forEach(control=>control.disabled=true);state.textContent='비율을 저장하고 있습니다.';
    try{
      const result=await auth.intelligenceSaveRankingWeights(weights);
      if(!result?.ok){showState(({RANKING_WEIGHTS_INVALID:'뉴스·검색 비율을 다시 선택해 주세요.',ADMIN_REQUIRED:'관리자만 비율을 변경할 수 있습니다.',LOGIN_REQUIRED:'다시 로그인해 주세요.'})[result?.error]||'비율을 저장하지 못했습니다. 다시 시도해 주세요.');return;}
      form.dataset.savedNews=String(result.rankingWeights.news);
      if(!root.querySelector('[data-ranking-weights-form]'))return;
      await onSaved?.();
      showState(rankingWeightLabel(result.rankingWeights)+'로 저장했습니다. 전체 게시를 누르면 반영됩니다.');
    }catch{
      showState('저장 결과를 확인하지 못했습니다. 새로고침하여 저장된 비율을 확인해 주세요.');
    }finally{pendingSaves.delete(root);delete form.dataset.busy;controls.forEach(control=>control.disabled=false);}
  });
}
