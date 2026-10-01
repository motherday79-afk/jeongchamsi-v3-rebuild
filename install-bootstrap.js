// Runs before the main module graph so an early install offer is not lost.
(()=>{
 if(window.jcsInstall)return;
 const state=window.jcsInstall={event:null,installed:false};
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();state.event=event;window.dispatchEvent(new CustomEvent('jcs:install-ready'));
 });
 window.addEventListener('appinstalled',()=>{
  state.event=null;state.installed=true;window.dispatchEvent(new CustomEvent('jcs:install-ready'));
 });
})();
