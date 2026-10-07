export function bindTaxiFullscreen(){
 const game=document.querySelector('.comic-game'),button=document.getElementById('fullscreen-toggle');
 const active=()=>document.fullscreenElement===game||document.webkitFullscreenElement===game||document.body.classList.contains('taxi-fullscreen');
 const refresh=()=>{button.textContent=active()?'전체화면 닫기':'전체화면';button.setAttribute('aria-pressed',String(active()));};
 const leave=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.webkitFullscreenElement)document.webkitExitFullscreen();}catch{}document.body.classList.remove('taxi-fullscreen');refresh();};
 button.addEventListener('click',async()=>{
  if(active()){await leave();return;}
  try{if(game.requestFullscreen)await game.requestFullscreen();else if(game.webkitRequestFullscreen)game.webkitRequestFullscreen();else document.body.classList.add('taxi-fullscreen');}catch{document.body.classList.add('taxi-fullscreen');}refresh();
 });
 document.addEventListener('fullscreenchange',refresh);document.addEventListener('webkitfullscreenchange',refresh);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active())void leave();});refresh();
}
