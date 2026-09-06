export const FONT_SCALE_RATIOS=Object.freeze([1,1.06,1.12,1.18,1.24,1.3]);
export const FONT_SCALE_STORAGE_KEY='jcs-font-scale-level';
const scalableSelector='h1,h2,h3,h4,h5,h6,p,span,b,strong,small,em,a,button,label,input,select,textarea,th,td,dt,dd,li,output,svg text';

const level=value=>Math.max(0,Math.min(5,Number.isFinite(Number(value))?Math.round(Number(value)):0));
export function changeFontScaleLevel(current,delta){return level(level(current)+(Number(delta)||0));}
export function readFontScaleLevel(storage=globalThis.localStorage){try{return level(Number(storage?.getItem?.(FONT_SCALE_STORAGE_KEY)));}catch{return 0;}}

export function applyFontScale(root=document,currentLevel=0,getStyle=globalThis.getComputedStyle){
  const normalized=level(currentLevel),ratio=FONT_SCALE_RATIOS[normalized],nodes=[...root.querySelectorAll(scalableSelector)];
  for(const node of nodes){if(node.dataset?.jcsFontManaged==='true'){node.style.fontSize=node.dataset.jcsInlineFontSize||'';node.style.lineHeight=node.dataset.jcsInlineLineHeight||'';}}
  const documentElement=root.documentElement||globalThis.document?.documentElement;
  if(normalized===0){for(const node of nodes){if(node.dataset){delete node.dataset.jcsFontManaged;delete node.dataset.jcsInlineFontSize;delete node.dataset.jcsInlineLineHeight;}}if(documentElement?.dataset)documentElement.dataset.jcsFontScale='0';return 0;}
  const measurements=nodes.map(node=>{
    const computed=getStyle(node),fontSize=parseFloat(computed.fontSize),lineHeight=parseFloat(computed.lineHeight),baseline={inlineFontSize:node.style.fontSize||'',inlineLineHeight:node.style.lineHeight||'',fontSize:Number.isFinite(fontSize)?fontSize:16,lineHeight:Number.isFinite(lineHeight)?lineHeight:null};
    return [node,baseline];
  });
  for(const [node,baseline] of measurements){if(node.dataset){node.dataset.jcsFontManaged='true';node.dataset.jcsInlineFontSize=baseline.inlineFontSize;node.dataset.jcsInlineLineHeight=baseline.inlineLineHeight;}node.style.fontSize=`${Math.round(baseline.fontSize*ratio*100)/100}px`;if(baseline.lineHeight!==null)node.style.lineHeight=`${Math.round(baseline.lineHeight*ratio*100)/100}px`;}
  if(documentElement?.dataset)documentElement.dataset.jcsFontScale=String(normalized);
  return normalized;
}

function storeLevel(storage,value){try{storage?.setItem?.(FONT_SCALE_STORAGE_KEY,String(value));}catch{/* Storage can be disabled without disabling the control. */}}

export function setupFontScaleControl(root=document,storage=globalThis.localStorage,getStyle=globalThis.getComputedStyle){
  const control=root.querySelector?.('[data-font-scale-control]');if(!control)return false;
  const minus=control.querySelector?.('[data-font-scale-decrease]'),plus=control.querySelector?.('[data-font-scale-increase]'),output=control.querySelector?.('[data-font-scale-level]');
  let current=readFontScaleLevel(storage);
  const paint=()=>{applyFontScale(root,current,getStyle);control.dataset.fontScale=String(current);if(output)output.textContent=current?`${current}단계`:'기본';if(minus)minus.disabled=current===0;if(plus)plus.disabled=current===5;};
  const change=delta=>{current=changeFontScaleLevel(current,delta);storeLevel(storage,current);paint();};
  minus?.addEventListener?.('click',()=>change(-1));plus?.addEventListener?.('click',()=>change(1));paint();return true;
}

export function refreshFontScale(root=document,storage=globalThis.localStorage,getStyle=globalThis.getComputedStyle){return applyFontScale(root,readFontScaleLevel(storage),getStyle);}
