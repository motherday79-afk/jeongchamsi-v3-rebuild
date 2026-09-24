export function initFullscreen({button,notify,doc=document}){
 const active=()=>!!(doc.fullscreenElement||doc.webkitFullscreenElement);
 const sync=()=>{const on=active(),label=on?'전체보기 해제':'전체보기';button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',label);button.title=label;button.querySelector('[data-fullscreen-label]').textContent=on?'화면복귀':'전체보기';};
 button.addEventListener('click',async()=>{
  try{
   if(active()){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;if(exit)await exit.call(doc);}
   else{const el=doc.documentElement,enter=el.requestFullscreen||el.webkitRequestFullscreen;if(!enter){notify('이 브라우저는 전체보기를 지원하지 않습니다. 모바일에서는 홈 화면에 추가한 뒤 실행해 주세요.');return;}await enter.call(el);}
   sync();
  }catch{notify('전체보기로 전환하지 못했습니다. 브라우저의 전체화면 설정을 확인해 주세요.');}
 });
 doc.addEventListener('fullscreenchange',sync);doc.addEventListener('webkitfullscreenchange',sync);sync();
}
